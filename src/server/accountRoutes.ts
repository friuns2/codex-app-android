import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

type AppServerLike = {
  rpc(method: string, params: unknown): Promise<unknown>
  listPendingServerRequests(): unknown[]
  dispose(): void
}

type AccountRouteContext = {
  appServer: AppServerLike
}

type StoredRateLimitWindow = {
  usedPercent: number
  windowMinutes: number | null
  resetsAt: number | null
}

type StoredCreditsSnapshot = {
  hasCredits: boolean
  unlimited: boolean
  balance: string | null
}

type StoredRateLimitSnapshot = {
  limitId: string | null
  limitName: string | null
  primary: StoredRateLimitWindow | null
  secondary: StoredRateLimitWindow | null
  credits: StoredCreditsSnapshot | null
  planType: string | null
}

type AccountQuotaStatus = 'idle' | 'loading' | 'ready' | 'error'
type AccountUnavailableReason = 'payment_required'

type StoredAccountEntry = {
  accountId: string
  storageId: string
  authMode: string | null
  email: string | null
  planType: string | null
  lastRefreshedAtIso: string
  lastActivatedAtIso: string | null
  quotaSnapshot: StoredRateLimitSnapshot | null
  quotaUpdatedAtIso: string | null
  quotaStatus: AccountQuotaStatus
  quotaError: string | null
  unavailableReason: AccountUnavailableReason | null
}

type StoredAccountsState = {
  activeAccountId: string | null
  accounts: StoredAccountEntry[]
}

type AuthFile = {
  auth_mode?: string
  tokens?: {
    access_token?: string
    account_id?: string
  }
}

type TokenMetadata = {
  email: string | null
  planType: string | null
}

type AccountInspection = {
  metadata: TokenMetadata
  quotaSnapshot: StoredRateLimitSnapshot | null
}

const APP_SERVER_ARGS = [
  'app-server',
  '-c',
  'approval_policy="never"',
  '-c',
  'sandbox_mode="danger-full-access"',
] as const

const ACCOUNT_QUOTA_REFRESH_TTL_MS = 5 * 60 * 1000

let backgroundRefreshPromise: Promise<void> | null = null

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function normalizeAccountUnavailableReason(value: unknown): AccountUnavailableReason | null {
  return value === 'payment_required' ? value : null
}

function setJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload instanceof Error && payload.message.trim().length > 0) {
    return payload.message
  }
  const record = asRecord(payload)
  const error = record?.error
  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim()
  }
  if (typeof record?.message === 'string' && record.message.trim().length > 0) {
    return record.message.trim()
  }
  return fallback
}

function isPaymentRequiredErrorMessage(value: string | null): boolean {
  if (!value) return false
  const normalized = value.toLowerCase()
  return normalized.includes('payment required') || /\b402\b/.test(normalized)
}

function detectAccountUnavailableReason(error: unknown): AccountUnavailableReason | null {
  return isPaymentRequiredErrorMessage(getErrorMessage(error, '')) ? 'payment_required' : null
}

function getCodexHomeDir(): string {
  const codexHome = process.env.CODEX_HOME?.trim()
  return codexHome && codexHome.length > 0 ? codexHome : join(homedir(), '.codex')
}

function getActiveAuthPath(): string {
  return join(getCodexHomeDir(), 'auth.json')
}

function getAccountsStatePath(): string {
  return join(getCodexHomeDir(), 'accounts.json')
}

function getAccountsSnapshotRoot(): string {
  return join(getCodexHomeDir(), 'accounts')
}

function toStorageId(accountId: string): string {
  return createHash('sha256').update(accountId).digest('hex')
}

function normalizeRateLimitWindow(value: unknown): StoredRateLimitWindow | null {
  const record = asRecord(value)
  if (!record) return null

  const usedPercent = readNumber(record.usedPercent ?? record.used_percent)
  if (usedPercent === null) return null

  return {
    usedPercent,
    windowMinutes: readNumber(record.windowDurationMins ?? record.window_minutes),
    resetsAt: readNumber(record.resetsAt ?? record.resets_at),
  }
}

function normalizeCreditsSnapshot(value: unknown): StoredCreditsSnapshot | null {
  const record = asRecord(value)
  if (!record) return null

  const hasCredits = readBoolean(record.hasCredits ?? record.has_credits)
  const unlimited = readBoolean(record.unlimited)
  if (hasCredits === null || unlimited === null) return null

  return {
    hasCredits,
    unlimited,
    balance: readString(record.balance),
  }
}

function normalizeRateLimitSnapshot(value: unknown): StoredRateLimitSnapshot | null {
  const record = asRecord(value)
  if (!record) return null

  const primary = normalizeRateLimitWindow(record.primary)
  const secondary = normalizeRateLimitWindow(record.secondary)
  const credits = normalizeCreditsSnapshot(record.credits)

  if (!primary && !secondary && !credits) return null

  return {
    limitId: readString(record.limitId ?? record.limit_id),
    limitName: readString(record.limitName ?? record.limit_name),
    primary,
    secondary,
    credits,
    planType: readString(record.planType ?? record.plan_type),
  }
}

function pickCodexRateLimitSnapshot(payload: unknown): StoredRateLimitSnapshot | null {
  const record = asRecord(payload)
  if (!record) return null

  const rateLimitsByLimitId = asRecord(record.rateLimitsByLimitId ?? record.rate_limits_by_limit_id)
  const codexBucket = normalizeRateLimitSnapshot(rateLimitsByLimitId?.codex)
  if (codexBucket) return codexBucket

  return normalizeRateLimitSnapshot(record.rateLimits ?? record.rate_limits)
}

function normalizeStoredAccountEntry(value: unknown): StoredAccountEntry | null {
  const record = asRecord(value)
  const accountId = readString(record?.accountId)
  const storageId = readString(record?.storageId)
  const lastRefreshedAtIso = readString(record?.lastRefreshedAtIso)
  const quotaStatusRaw = readString(record?.quotaStatus)
  const quotaStatus: AccountQuotaStatus =
    quotaStatusRaw === 'loading' || quotaStatusRaw === 'ready' || quotaStatusRaw === 'error' ? quotaStatusRaw : 'idle'
  if (!accountId || !storageId || !lastRefreshedAtIso) return null

  return {
    accountId,
    storageId,
    authMode: readString(record?.authMode),
    email: readString(record?.email),
    planType: readString(record?.planType),
    lastRefreshedAtIso,
    lastActivatedAtIso: readString(record?.lastActivatedAtIso),
    quotaSnapshot: normalizeRateLimitSnapshot(record?.quotaSnapshot),
    quotaUpdatedAtIso: readString(record?.quotaUpdatedAtIso),
    quotaStatus,
    quotaError: readString(record?.quotaError),
    unavailableReason: normalizeAccountUnavailableReason(record?.unavailableReason)
      ?? (isPaymentRequiredErrorMessage(readString(record?.quotaError)) ? 'payment_required' : null),
  }
}

async function readStoredAccountsState(): Promise<StoredAccountsState> {
  try {
    const raw = await readFile(getAccountsStatePath(), 'utf8')
    const parsed = asRecord(JSON.parse(raw))
    const activeAccountId = readString(parsed?.activeAccountId)
    const rawAccounts = Array.isArray(parsed?.accounts) ? parsed.accounts : []
    const accounts = rawAccounts
      .map((entry) => normalizeStoredAccountEntry(entry))
      .filter((entry): entry is StoredAccountEntry => entry !== null)
    return { activeAccountId, accounts }
  } catch {
    return { activeAccountId: null, accounts: [] }
  }
}

async function writeStoredAccountsState(state: StoredAccountsState): Promise<void> {
  await writeFile(getAccountsStatePath(), JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 })
}

function withUpsertedAccount(state: StoredAccountsState, nextEntry: StoredAccountEntry): StoredAccountsState {
  const rest = state.accounts.filter((entry) => entry.accountId !== nextEntry.accountId)
  return {
    activeAccountId: state.activeAccountId,
    accounts: [nextEntry, ...rest],
  }
}

function sortAccounts(accounts: StoredAccountEntry[], activeAccountId: string | null): StoredAccountEntry[] {
  return [...accounts].sort((left, right) => {
    const leftActive = left.accountId === activeAccountId ? 1 : 0
    const rightActive = right.accountId === activeAccountId ? 1 : 0
    if (leftActive !== rightActive) return rightActive - leftActive
    return right.lastRefreshedAtIso.localeCompare(left.lastRefreshedAtIso)
  })
}

function toPublicAccountEntry(entry: StoredAccountEntry, activeAccountId: string | null): StoredAccountEntry & { isActive: boolean } {
  return {
    ...entry,
    isActive: entry.accountId === activeAccountId,
  }
}

function decodeBase64UrlJson(input: string): Record<string, unknown> | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
    const raw = Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8')
    const parsed = JSON.parse(raw) as unknown
    return asRecord(parsed)
  } catch {
    return null
  }
}

function extractTokenMetadata(accessToken: string | undefined): TokenMetadata {
  if (!accessToken || typeof accessToken !== 'string') {
    return { email: null, planType: null }
  }
  const parts = accessToken.split('.')
  if (parts.length < 2) {
    return { email: null, planType: null }
  }
  const payload = decodeBase64UrlJson(parts[1] ?? '')
  const profile = asRecord(payload?.['https://api.openai.com/profile'])
  const auth = asRecord(payload?.['https://api.openai.com/auth'])
  return {
    email: typeof profile?.email === 'string' && profile.email.trim().length > 0 ? profile.email.trim() : null,
    planType:
      typeof auth?.chatgpt_plan_type === 'string' && auth.chatgpt_plan_type.trim().length > 0
        ? auth.chatgpt_plan_type.trim()
        : null,
  }
}

async function readAuthFileFromPath(path: string): Promise<{ raw: string; parsed: AuthFile; accountId: string; authMode: string | null; metadata: TokenMetadata }> {
  const raw = await readFile(path, 'utf8')
  const parsed = JSON.parse(raw) as AuthFile
  const accountId = parsed.tokens?.account_id?.trim() ?? ''
  if (!accountId) {
    throw new Error('missing_account_id')
  }
  return {
    raw,
    parsed,
    accountId,
    authMode: typeof parsed.auth_mode === 'string' && parsed.auth_mode.trim().length > 0 ? parsed.auth_mode.trim() : null,
    metadata: extractTokenMetadata(parsed.tokens?.access_token),
  }
}

function getSnapshotPath(storageId: string): string {
  return join(getAccountsSnapshotRoot(), storageId, 'auth.json')
}

async function writeSnapshot(storageId: string, raw: string): Promise<void> {
  const dir = join(getAccountsSnapshotRoot(), storageId)
  await mkdir(dir, { recursive: true, mode: 0o700 })
  await writeFile(getSnapshotPath(storageId), raw, { encoding: 'utf8', mode: 0o600 })
}

async function removeSnapshot(storageId: string): Promise<void> {
  await rm(join(getAccountsSnapshotRoot(), storageId), { recursive: true, force: true })
}

async function readRuntimeAccountMetadata(appServer: AppServerLike): Promise<TokenMetadata> {
  const payload = asRecord(await appServer.rpc('account/read', { refreshToken: false }))
  const account = asRecord(payload?.account)
  return {
    email: typeof account?.email === 'string' && account.email.trim().length > 0 ? account.email.trim() : null,
    planType: typeof account?.planType === 'string' && account.planType.trim().length > 0 ? account.planType.trim() : null,
  }
}

async function validateSwitchedAccount(appServer: AppServerLike): Promise<AccountInspection> {
  const metadata = await readRuntimeAccountMetadata(appServer)
  const quotaPayload = await appServer.rpc('account/rateLimits/read', null)
  return {
    metadata,
    quotaSnapshot: pickCodexRateLimitSnapshot(quotaPayload),
  }
}

async function restoreActiveAuth(raw: string | null): Promise<void> {
  const path = getActiveAuthPath()
  if (raw === null) {
    await rm(path, { force: true })
    return
  }
  await writeFile(path, raw, { encoding: 'utf8', mode: 0o600 })
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function withTemporaryCodexAppServer<T>(
  authRaw: string,
  run: (rpc: (method: string, params: unknown) => Promise<unknown>) => Promise<T>,
): Promise<T> {
  const tempCodexHome = await mkdtemp(join(tmpdir(), 'codexui-account-'))
  const authPath = join(tempCodexHome, 'auth.json')
  await writeFile(authPath, authRaw, { encoding: 'utf8', mode: 0o600 })

  const proc = spawn('codex', [...APP_SERVER_ARGS], {
    env: { ...process.env, CODEX_HOME: tempCodexHome },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  let disposed = false
  let initialized = false
  let initializePromise: Promise<void> | null = null
  let readBuffer = ''
  let nextId = 1
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>()

  const rejectAllPending = (error: Error) => {
    for (const request of pending.values()) {
      request.reject(error)
    }
    pending.clear()
  }

  proc.stdout.setEncoding('utf8')
  proc.stdout.on('data', (chunk: string) => {
    readBuffer += chunk
    let lineEnd = readBuffer.indexOf('\n')
    while (lineEnd !== -1) {
      const line = readBuffer.slice(0, lineEnd).trim()
      readBuffer = readBuffer.slice(lineEnd + 1)
      if (line.length > 0) {
        try {
          const message = JSON.parse(line) as { id?: number; result?: unknown; error?: { message?: string } }
          if (typeof message.id === 'number' && pending.has(message.id)) {
            const current = pending.get(message.id)
            pending.delete(message.id)
            if (!current) {
              lineEnd = readBuffer.indexOf('\n')
              continue
            }
            if (message.error?.message) {
              current.reject(new Error(message.error.message))
            } else {
              current.resolve(message.result)
            }
          }
        } catch {
          // Ignore malformed lines and unrelated notifications.
        }
      }
      lineEnd = readBuffer.indexOf('\n')
    }
  })

  proc.stderr.setEncoding('utf8')
  proc.stderr.on('data', () => {
    // JSON-RPC errors are surfaced through stdout responses.
  })

  proc.on('error', (error) => {
    rejectAllPending(error instanceof Error ? error : new Error('codex app-server failed to start'))
  })

  proc.on('exit', () => {
    if (disposed) return
    rejectAllPending(new Error('codex app-server exited unexpectedly'))
  })

  const sendLine = (payload: Record<string, unknown>) => {
    proc.stdin.write(`${JSON.stringify(payload)}\n`)
  }

  const call = async (method: string, params: unknown): Promise<unknown> => {
    const id = nextId++
    return await new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      sendLine({
        jsonrpc: '2.0',
        id,
        method,
        params,
      })
    })
  }

  const ensureInitialized = async (): Promise<void> => {
    if (initialized) return
    if (initializePromise) {
      await initializePromise
      return
    }

    initializePromise = call('initialize', {
      clientInfo: {
        name: 'codexui-account-refresh',
        version: '0.1.0',
      },
      capabilities: {
        experimentalApi: true,
      },
    }).then(() => {
      sendLine({
        jsonrpc: '2.0',
        method: 'initialized',
      })
      initialized = true
    }).finally(() => {
      initializePromise = null
    })

    await initializePromise
  }

  const dispose = async () => {
    if (disposed) return
    disposed = true
    rejectAllPending(new Error('codex app-server stopped'))
    try {
      proc.stdin.end()
    } catch {
      // ignore
    }
    try {
      proc.kill('SIGTERM')
    } catch {
      // ignore
    }
    await rm(tempCodexHome, { recursive: true, force: true })
  }

  try {
    await ensureInitialized()
    return await run(call)
  } finally {
    await dispose()
  }
}

async function inspectStoredAccount(entry: StoredAccountEntry): Promise<AccountInspection> {
  const snapshotPath = getSnapshotPath(entry.storageId)
  const authRaw = await readFile(snapshotPath, 'utf8')
  return await withTemporaryCodexAppServer(authRaw, async (rpc) => {
    const accountPayload = asRecord(await rpc('account/read', { refreshToken: false }))
    const account = asRecord(accountPayload?.account)
    const quotaPayload = await rpc('account/rateLimits/read', null)
    return {
      metadata: {
        email: typeof account?.email === 'string' && account.email.trim().length > 0 ? account.email.trim() : entry.email,
        planType: typeof account?.planType === 'string' && account.planType.trim().length > 0 ? account.planType.trim() : entry.planType,
      },
      quotaSnapshot: pickCodexRateLimitSnapshot(quotaPayload),
    }
  })
}

function shouldRefreshAccountQuota(entry: StoredAccountEntry): boolean {
  if (entry.quotaStatus === 'loading') return false
  if (!entry.quotaUpdatedAtIso) return true
  const updatedAtMs = Date.parse(entry.quotaUpdatedAtIso)
  if (!Number.isFinite(updatedAtMs)) return true
  return Date.now() - updatedAtMs >= ACCOUNT_QUOTA_REFRESH_TTL_MS
}

async function replaceStoredAccount(nextEntry: StoredAccountEntry, activeAccountId: string | null): Promise<void> {
  const state = await readStoredAccountsState()
  const nextState = withUpsertedAccount({
    activeAccountId,
    accounts: state.accounts,
  }, nextEntry)
  await writeStoredAccountsState({
    activeAccountId,
    accounts: nextState.accounts,
  })
}

async function pickReplacementActiveAccount(accounts: StoredAccountEntry[]): Promise<StoredAccountEntry | null> {
  const sorted = sortAccounts(accounts, null)
  for (const entry of sorted) {
    if (entry.unavailableReason === 'payment_required') continue
    if (await fileExists(getSnapshotPath(entry.storageId))) {
      return entry
    }
  }
  return null
}

async function refreshAccountsInBackground(accountIds: string[], activeAccountId: string | null): Promise<void> {
  for (const accountId of accountIds) {
    const state = await readStoredAccountsState()
    const entry = state.accounts.find((item) => item.accountId === accountId)
    if (!entry) continue

    try {
      const inspected = await inspectStoredAccount(entry)
      await replaceStoredAccount({
        ...entry,
        email: inspected.metadata.email ?? entry.email,
        planType: inspected.metadata.planType ?? entry.planType,
        quotaSnapshot: inspected.quotaSnapshot ?? entry.quotaSnapshot,
        quotaUpdatedAtIso: new Date().toISOString(),
        quotaStatus: 'ready',
        quotaError: null,
        unavailableReason: null,
      }, activeAccountId)
    } catch (error) {
      await replaceStoredAccount({
        ...entry,
        quotaUpdatedAtIso: new Date().toISOString(),
        quotaStatus: 'error',
        quotaError: getErrorMessage(error, 'Failed to refresh account quota'),
        unavailableReason: detectAccountUnavailableReason(error),
      }, activeAccountId)
    }
  }
}

async function scheduleAccountsBackgroundRefresh(
  options: { force?: boolean; prioritizeAccountId?: string; accountIds?: string[] } = {},
): Promise<StoredAccountsState> {
  const state = await readStoredAccountsState()
  if (state.accounts.length === 0) return state
  if (backgroundRefreshPromise) return state

  const allowedIds = options.accountIds ? new Set(options.accountIds) : null
  const candidates = state.accounts
    .filter((entry) => !allowedIds || allowedIds.has(entry.accountId))
    .filter((entry) => options.force === true || shouldRefreshAccountQuota(entry))
    .sort((left, right) => {
      const prioritize = options.prioritizeAccountId ?? ''
      const leftPriority = left.accountId === prioritize ? 1 : 0
      const rightPriority = right.accountId === prioritize ? 1 : 0
      if (leftPriority !== rightPriority) return rightPriority - leftPriority
      return 0
    })

  if (candidates.length === 0) return state

  const candidateIds = new Set(candidates.map((entry) => entry.accountId))
  const markedState: StoredAccountsState = {
    activeAccountId: state.activeAccountId,
    accounts: state.accounts.map((entry) => (
      candidateIds.has(entry.accountId)
        ? {
          ...entry,
          quotaStatus: 'loading',
          quotaError: null,
        }
        : entry
    )),
  }

  await writeStoredAccountsState(markedState)

  backgroundRefreshPromise = refreshAccountsInBackground(
    candidates.map((entry) => entry.accountId),
    markedState.activeAccountId,
  ).finally(() => {
    backgroundRefreshPromise = null
  })

  return markedState
}

async function importAccountFromAuthPath(path: string): Promise<{
  activeAccountId: string | null
  importedAccountId: string
  accounts: Array<StoredAccountEntry & { isActive: boolean }>
}> {
  const imported = await readAuthFileFromPath(path)
  const storageId = toStorageId(imported.accountId)
  await writeSnapshot(storageId, imported.raw)

  const state = await readStoredAccountsState()
  const existing = state.accounts.find((entry) => entry.accountId === imported.accountId) ?? null
  const nextEntry: StoredAccountEntry = {
    accountId: imported.accountId,
    storageId,
    authMode: imported.authMode,
    email: imported.metadata.email ?? existing?.email ?? null,
    planType: imported.metadata.planType ?? existing?.planType ?? null,
    lastRefreshedAtIso: new Date().toISOString(),
    lastActivatedAtIso: existing?.lastActivatedAtIso ?? null,
    quotaSnapshot: existing?.quotaSnapshot ?? null,
    quotaUpdatedAtIso: existing?.quotaUpdatedAtIso ?? null,
    quotaStatus: existing?.quotaStatus ?? 'idle',
    quotaError: existing?.quotaError ?? null,
    unavailableReason: existing?.unavailableReason ?? null,
  }
  const nextState = withUpsertedAccount(state, nextEntry)
  await writeStoredAccountsState(nextState)

  return {
    activeAccountId: nextState.activeAccountId,
    importedAccountId: imported.accountId,
    accounts: sortAccounts(nextState.accounts, nextState.activeAccountId).map((entry) => toPublicAccountEntry(entry, nextState.activeAccountId)),
  }
}

async function syncStoredActiveAccountWithAuth(): Promise<StoredAccountsState> {
  const state = await readStoredAccountsState()

  let imported: Awaited<ReturnType<typeof readAuthFileFromPath>> | null = null
  try {
    imported = await readAuthFileFromPath(getActiveAuthPath())
  } catch {
    return state
  }

  const snapshotPath = getSnapshotPath(toStorageId(imported.accountId))
  const existing = state.accounts.find((entry) => entry.accountId === imported.accountId) ?? null
  const nextEntry: StoredAccountEntry = existing
    ? {
        ...existing,
        storageId: toStorageId(imported.accountId),
        authMode: imported.authMode,
        email: imported.metadata.email ?? existing.email,
        planType: imported.metadata.planType ?? existing.planType,
      }
    : {
        accountId: imported.accountId,
        storageId: toStorageId(imported.accountId),
        authMode: imported.authMode,
        email: imported.metadata.email,
        planType: imported.metadata.planType,
        lastRefreshedAtIso: new Date().toISOString(),
        lastActivatedAtIso: null,
        quotaSnapshot: null,
        quotaUpdatedAtIso: null,
        quotaStatus: 'idle',
        quotaError: null,
        unavailableReason: null,
      }

  const shouldPersistState = (
    state.activeAccountId !== imported.accountId
    || !existing
    || existing.storageId !== nextEntry.storageId
    || existing.authMode !== nextEntry.authMode
    || existing.email !== nextEntry.email
    || existing.planType !== nextEntry.planType
  )

  const hasSnapshot = await fileExists(snapshotPath)
  if (!shouldPersistState && hasSnapshot) {
    return state
  }

  await writeSnapshot(nextEntry.storageId, imported.raw)

  const nextState = withUpsertedAccount({
    activeAccountId: imported.accountId,
    accounts: state.accounts,
  }, nextEntry)
  await writeStoredAccountsState({
    activeAccountId: imported.accountId,
    accounts: nextState.accounts,
  })
  return {
    activeAccountId: imported.accountId,
    accounts: nextState.accounts,
  }
}

export async function handleAccountRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  context: AccountRouteContext,
): Promise<boolean> {
  const { appServer } = context

  if (req.method === 'GET' && url.pathname === '/codex-api/accounts') {
    await syncStoredActiveAccountWithAuth()
    const state = await scheduleAccountsBackgroundRefresh()
    setJson(res, 200, {
      data: {
        activeAccountId: state.activeAccountId,
        accounts: sortAccounts(state.accounts, state.activeAccountId).map((entry) => toPublicAccountEntry(entry, state.activeAccountId)),
      },
    })
    return true
  }

  if (req.method === 'GET' && url.pathname === '/codex-api/accounts/active') {
    const state = await syncStoredActiveAccountWithAuth()
    const active = state.activeAccountId
      ? state.accounts.find((entry) => entry.accountId === state.activeAccountId) ?? null
      : null
    setJson(res, 200, {
      data: active ? toPublicAccountEntry(active, state.activeAccountId) : null,
    })
    return true
  }

  if (req.method === 'POST' && url.pathname === '/codex-api/accounts/refresh') {
    try {
      const imported = await importAccountFromAuthPath(getActiveAuthPath())

      try {
        appServer.dispose()
        const inspection = await validateSwitchedAccount(appServer)
        const state = await readStoredAccountsState()
        const importedAccountId = imported.importedAccountId
        const target = state.accounts.find((entry) => entry.accountId === importedAccountId) ?? null
        if (!target) {
          throw new Error('account_not_found')
        }

        const nextEntry: StoredAccountEntry = {
          ...target,
          email: inspection.metadata.email ?? target.email,
          planType: inspection.metadata.planType ?? target.planType,
          lastActivatedAtIso: new Date().toISOString(),
          quotaSnapshot: inspection.quotaSnapshot ?? target.quotaSnapshot,
          quotaUpdatedAtIso: new Date().toISOString(),
          quotaStatus: 'ready',
          quotaError: null,
          unavailableReason: null,
        }
        const nextState = withUpsertedAccount({
          activeAccountId: importedAccountId,
          accounts: state.accounts,
        }, nextEntry)
        await writeStoredAccountsState({
          activeAccountId: importedAccountId,
          accounts: nextState.accounts,
        })

        const backgroundState = await scheduleAccountsBackgroundRefresh({
          force: true,
          prioritizeAccountId: importedAccountId,
          accountIds: nextState.accounts.filter((entry) => entry.accountId !== importedAccountId).map((entry) => entry.accountId),
        })

        setJson(res, 200, {
          data: {
            activeAccountId: importedAccountId,
            importedAccountId,
            accounts: sortAccounts(backgroundState.accounts, importedAccountId).map((entry) => toPublicAccountEntry(entry, importedAccountId)),
          },
        })
      } catch (error) {
        setJson(res, 502, {
          error: 'account_refresh_failed',
          message: getErrorMessage(error, 'Failed to refresh account'),
        })
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to refresh account')
      if (message === 'missing_account_id') {
        setJson(res, 400, { error: 'missing_account_id', message: 'Current auth.json is missing tokens.account_id.' })
        return true
      }
      setJson(res, 400, { error: 'invalid_auth_json', message: 'Failed to parse the current auth.json file.' })
    }
    return true
  }

  if (req.method === 'POST' && url.pathname === '/codex-api/accounts/switch') {
    try {
      if (appServer.listPendingServerRequests().length > 0) {
        setJson(res, 409, {
          error: 'account_switch_blocked',
          message: 'Finish pending approval requests before switching accounts.',
        })
        return true
      }

      const rawBody = await new Promise<string>((resolve, reject) => {
        let body = ''
        req.setEncoding('utf8')
        req.on('data', (chunk: string) => { body += chunk })
        req.on('end', () => resolve(body))
        req.on('error', reject)
      })
      const payload = asRecord(rawBody.length > 0 ? JSON.parse(rawBody) : {})
      const accountId = typeof payload?.accountId === 'string' ? payload.accountId.trim() : ''
      if (!accountId) {
        setJson(res, 400, { error: 'account_not_found', message: 'Missing accountId.' })
        return true
      }

      const state = await readStoredAccountsState()
      const target = state.accounts.find((entry) => entry.accountId === accountId) ?? null
      if (!target) {
        setJson(res, 404, { error: 'account_not_found', message: 'The requested account was not found.' })
        return true
      }

      const snapshotPath = getSnapshotPath(target.storageId)
      if (!(await fileExists(snapshotPath))) {
        setJson(res, 404, { error: 'account_not_found', message: 'The requested account snapshot is missing.' })
        return true
      }

      let previousRaw: string | null = null
      try {
        previousRaw = await readFile(getActiveAuthPath(), 'utf8')
      } catch {
        previousRaw = null
      }

      const targetRaw = await readFile(snapshotPath, 'utf8')
      await writeFile(getActiveAuthPath(), targetRaw, { encoding: 'utf8', mode: 0o600 })

      try {
        appServer.dispose()
        const inspection = await validateSwitchedAccount(appServer)
        const nextEntry: StoredAccountEntry = {
          ...target,
          email: inspection.metadata.email ?? target.email,
          planType: inspection.metadata.planType ?? target.planType,
          lastActivatedAtIso: new Date().toISOString(),
          quotaSnapshot: inspection.quotaSnapshot ?? target.quotaSnapshot,
          quotaUpdatedAtIso: new Date().toISOString(),
          quotaStatus: 'ready',
          quotaError: null,
          unavailableReason: null,
        }
        const nextState = withUpsertedAccount({
          activeAccountId: accountId,
          accounts: state.accounts,
        }, nextEntry)
        await writeStoredAccountsState({
          activeAccountId: accountId,
          accounts: nextState.accounts,
        })
        void scheduleAccountsBackgroundRefresh({
          force: true,
          prioritizeAccountId: accountId,
          accountIds: nextState.accounts.filter((entry) => entry.accountId !== accountId).map((entry) => entry.accountId),
        })
        setJson(res, 200, {
          ok: true,
          data: {
            activeAccountId: accountId,
            account: toPublicAccountEntry(nextEntry, accountId),
          },
        })
      } catch (error) {
        await restoreActiveAuth(previousRaw)
        appServer.dispose()
        await replaceStoredAccount({
          ...target,
          quotaUpdatedAtIso: new Date().toISOString(),
          quotaStatus: 'error',
          quotaError: getErrorMessage(error, 'Failed to switch account'),
          unavailableReason: detectAccountUnavailableReason(error),
        }, state.activeAccountId)
        setJson(res, 502, {
          error: 'account_switch_failed',
          message: getErrorMessage(error, 'Failed to switch account'),
        })
      }
    } catch (error) {
      setJson(res, 400, {
        error: 'invalid_auth_json',
        message: getErrorMessage(error, 'Failed to switch account'),
      })
    }
    return true
  }

  if (req.method === 'POST' && url.pathname === '/codex-api/accounts/remove') {
    try {
      const rawBody = await new Promise<string>((resolve, reject) => {
        let body = ''
        req.setEncoding('utf8')
        req.on('data', (chunk: string) => { body += chunk })
        req.on('end', () => resolve(body))
        req.on('error', reject)
      })
      const payload = asRecord(rawBody.length > 0 ? JSON.parse(rawBody) : {})
      const accountId = typeof payload?.accountId === 'string' ? payload.accountId.trim() : ''
      if (!accountId) {
        setJson(res, 400, { error: 'account_not_found', message: 'Missing accountId.' })
        return true
      }

      const state = await readStoredAccountsState()
      const target = state.accounts.find((entry) => entry.accountId === accountId) ?? null
      if (!target) {
        setJson(res, 404, { error: 'account_not_found', message: 'The requested account was not found.' })
        return true
      }

      const remainingAccounts = state.accounts.filter((entry) => entry.accountId !== accountId)
      if (state.activeAccountId !== accountId) {
        await removeSnapshot(target.storageId)
        await writeStoredAccountsState({
          activeAccountId: state.activeAccountId,
          accounts: remainingAccounts,
        })
        setJson(res, 200, {
          ok: true,
          data: {
            activeAccountId: state.activeAccountId,
            accounts: sortAccounts(remainingAccounts, state.activeAccountId).map((entry) => toPublicAccountEntry(entry, state.activeAccountId)),
          },
        })
        return true
      }

      if (appServer.listPendingServerRequests().length > 0) {
        setJson(res, 409, {
          error: 'account_remove_blocked',
          message: 'Finish pending approval requests before removing the active account.',
        })
        return true
      }

      let previousRaw: string | null = null
      try {
        previousRaw = await readFile(getActiveAuthPath(), 'utf8')
      } catch {
        previousRaw = null
      }

      const replacement = await pickReplacementActiveAccount(remainingAccounts)
      if (!replacement) {
        await restoreActiveAuth(null)
        appServer.dispose()
        await removeSnapshot(target.storageId)
        await writeStoredAccountsState({
          activeAccountId: null,
          accounts: remainingAccounts,
        })
        void scheduleAccountsBackgroundRefresh({
          force: true,
          accountIds: remainingAccounts.map((entry) => entry.accountId),
        })
        setJson(res, 200, {
          ok: true,
          data: {
            activeAccountId: null,
            accounts: sortAccounts(remainingAccounts, null).map((entry) => toPublicAccountEntry(entry, null)),
          },
        })
        return true
      }

      const replacementSnapshotPath = getSnapshotPath(replacement.storageId)
      if (!(await fileExists(replacementSnapshotPath))) {
        setJson(res, 404, {
          error: 'account_not_found',
          message: 'The replacement account snapshot is missing.',
        })
        return true
      }

      const replacementRaw = await readFile(replacementSnapshotPath, 'utf8')
      await writeFile(getActiveAuthPath(), replacementRaw, { encoding: 'utf8', mode: 0o600 })

      try {
        appServer.dispose()
        const inspection = await validateSwitchedAccount(appServer)
        const activatedReplacement: StoredAccountEntry = {
          ...replacement,
          email: inspection.metadata.email ?? replacement.email,
          planType: inspection.metadata.planType ?? replacement.planType,
          lastActivatedAtIso: new Date().toISOString(),
          quotaSnapshot: inspection.quotaSnapshot ?? replacement.quotaSnapshot,
          quotaUpdatedAtIso: new Date().toISOString(),
          quotaStatus: 'ready',
          quotaError: null,
          unavailableReason: null,
        }
        const nextAccounts = remainingAccounts.map((entry) => (
          entry.accountId === activatedReplacement.accountId ? activatedReplacement : entry
        ))
        await removeSnapshot(target.storageId)
        await writeStoredAccountsState({
          activeAccountId: activatedReplacement.accountId,
          accounts: nextAccounts,
        })
        void scheduleAccountsBackgroundRefresh({
          force: true,
          prioritizeAccountId: activatedReplacement.accountId,
          accountIds: nextAccounts
            .filter((entry) => entry.accountId !== activatedReplacement.accountId)
            .map((entry) => entry.accountId),
        })
        setJson(res, 200, {
          ok: true,
          data: {
            activeAccountId: activatedReplacement.accountId,
            accounts: sortAccounts(nextAccounts, activatedReplacement.accountId)
              .map((entry) => toPublicAccountEntry(entry, activatedReplacement.accountId)),
          },
        })
      } catch (error) {
        await restoreActiveAuth(previousRaw)
        appServer.dispose()
        await replaceStoredAccount({
          ...replacement,
          quotaUpdatedAtIso: new Date().toISOString(),
          quotaStatus: 'error',
          quotaError: getErrorMessage(error, 'Failed to switch account'),
          unavailableReason: detectAccountUnavailableReason(error),
        }, state.activeAccountId)
        setJson(res, 502, {
          error: 'account_remove_failed',
          message: getErrorMessage(error, 'Failed to remove account'),
        })
      }
    } catch (error) {
      setJson(res, 400, {
        error: 'invalid_auth_json',
        message: getErrorMessage(error, 'Failed to remove account'),
      })
    }
    return true
  }

  return false
}
