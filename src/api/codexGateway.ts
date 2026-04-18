import {
  fetchRpcMethodCatalog,
  fetchRpcNotificationCatalog,
  fetchPendingServerRequests,
  rpcCall,
  respondServerRequest,
  subscribeRpcNotifications,
  type RpcNotification,
} from './codexRpcClient'
import type {
  CollaborationModeListResponse,
  ConfigReadResponse,
  ModelListResponse,
  ReasoningEffort,
  ThreadListResponse,
  ThreadReadResponse,
  TurnStartResponse,
} from './appServerDtos'
import { normalizeCodexApiError } from './codexErrors'
import {
  normalizeThreadGroupsV2,
  normalizeThreadMessagesV2,
  readThreadInProgressFromResponse,
} from './normalizers/v2'
import type {
  UiAccountEntry,
  UiAccountQuotaStatus,
  UiAccountUnavailableReason,
  CollaborationModeKind,
  CollaborationModeOption,
  UiCreditsSnapshot,
  UiFileChange,
  UiMessage,
  UiPulseFeedbackEntry,
  UiPulseFeedbackKind,
  UiPulseItem,
  UiPulseSettings,
  UiPulseState,
  UiProjectGroup,
  UiReviewAction,
  UiReviewActionLevel,
  UiReviewFile,
  UiReviewFinding,
  UiReviewHunk,
  UiReviewLine,
  UiReviewResult,
  UiReviewScope,
  UiReviewSnapshot,
  UiReviewWorkspaceView,
  UiRateLimitSnapshot,
  UiRateLimitWindow,
} from '../types/codex'

type CurrentModelConfig = {
  model: string
  reasoningEffort: ReasoningEffort | ''
}

type ResolvedCollaborationModeSettings = {
  model: string
  reasoningEffort: ReasoningEffort | null
}

function normalizePlanModeReasoningEffort(value: ReasoningEffort | '' | null | undefined): ReasoningEffort | null {
  return value && value.length > 0 ? value : null
}

function normalizeCollaborationModeReasoningEffort(value: ReasoningEffort | '' | null | undefined): ReasoningEffort | null {
  return value && value.length > 0 ? value : null
}

export type WorkspaceRootsState = {
  order: string[]
  labels: Record<string, string>
  active: string[]
}

export type RuntimeInfo = {
  codexCliVersion: string
}

export type ComposerFileSuggestion = {
  path: string
}

const DEFAULT_COLLABORATION_MODE_OPTIONS: CollaborationModeOption[] = [
  { value: 'default', label: 'Default' },
  { value: 'plan', label: 'Plan' },
]

export type WorktreeCreateResult = {
  cwd: string
  branch: string
  gitRoot: string
}

export type ThreadSearchResult = {
  threadIds: string[]
  indexedThreadCount: number
}

export type AccountsListResult = {
  activeAccountId: string | null
  accounts: UiAccountEntry[]
  importedAccountId?: string
}

type ThreadFileChangeFallbackEntry = {
  turnId: string
  turnIndex: number
  fileChanges: UiFileChange[]
}

type ThreadTurnIndexById = Record<string, number>

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const next: string[] = []
  for (const item of value) {
    const normalized = readString(item)
    if (normalized) next.push(normalized)
  }
  return next
}

function normalizeAccountUnavailableReason(value: unknown): UiAccountUnavailableReason | null {
  return value === 'payment_required' ? value : null
}

function isPaymentRequiredErrorMessage(value: string | null): boolean {
  if (!value) return false
  const normalized = value.toLowerCase()
  return normalized.includes('payment required') || /\b402\b/.test(normalized)
}

function normalizeRateLimitWindow(value: unknown): UiRateLimitWindow | null {
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

function normalizeCreditsSnapshot(value: unknown): UiCreditsSnapshot | null {
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

function normalizeRateLimitSnapshot(value: unknown): UiRateLimitSnapshot | null {
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

function normalizeAccountEntry(value: unknown, activeAccountId: string | null = null): UiAccountEntry | null {
  const record = asRecord(value)
  if (!record) return null
  const accountId = readString(record.accountId)
  const quotaStatusRaw = readString(record.quotaStatus)
  const quotaStatus: UiAccountQuotaStatus =
    quotaStatusRaw === 'loading' || quotaStatusRaw === 'ready' || quotaStatusRaw === 'error' ? quotaStatusRaw : 'idle'
  if (!accountId) return null
  return {
    accountId,
    authMode: readString(record.authMode),
    email: readString(record.email),
    planType: readString(record.planType),
    lastRefreshedAtIso: readString(record.lastRefreshedAtIso) ?? '',
    lastActivatedAtIso: readString(record.lastActivatedAtIso),
    quotaSnapshot: normalizeRateLimitSnapshot(record.quotaSnapshot),
    quotaUpdatedAtIso: readString(record.quotaUpdatedAtIso),
    quotaStatus,
    quotaError: readString(record.quotaError),
    unavailableReason: normalizeAccountUnavailableReason(record.unavailableReason)
      ?? (isPaymentRequiredErrorMessage(readString(record.quotaError)) ? 'payment_required' : null),
    isActive: readBoolean(record.isActive) ?? accountId === activeAccountId,
  }
}

export function pickCodexRateLimitSnapshot(payload: unknown): UiRateLimitSnapshot | null {
  const record = asRecord(payload)
  if (!record) return null

  const rateLimitsByLimitId = asRecord(record.rateLimitsByLimitId ?? record.rate_limits_by_limit_id)
  const codexBucket = normalizeRateLimitSnapshot(rateLimitsByLimitId?.codex)
  if (codexBucket) return codexBucket

  return normalizeRateLimitSnapshot(record.rateLimits ?? record.rate_limits)
}

async function callRpc<T>(method: string, params?: unknown): Promise<T> {
  try {
    return await rpcCall<T>(method, params)
  } catch (error) {
    throw normalizeCodexApiError(error, `RPC ${method} failed`, method)
  }
}

function normalizeFallbackFileChange(value: unknown): UiFileChange | null {
  const record = asRecord(value)
  if (!record) return null

  const path = readString(record.path)
  const operation = readString(record.operation)
  if (!path || (operation !== 'add' && operation !== 'delete' && operation !== 'update')) {
    return null
  }

  return {
    path,
    operation,
    movedToPath: readString(record.movedToPath) ?? null,
    diff: readString(record.diff) ?? '',
    addedLineCount: readNumber(record.addedLineCount) ?? 0,
    removedLineCount: readNumber(record.removedLineCount) ?? 0,
  }
}

function normalizeThreadFileChangeFallback(value: unknown): ThreadFileChangeFallbackEntry[] {
  const payload = asRecord(value)
  const rows = Array.isArray(payload?.data) ? payload.data : []
  const normalized: ThreadFileChangeFallbackEntry[] = []

  for (const row of rows) {
    const record = asRecord(row)
    if (!record) continue

    const turnId = readString(record.turnId)
    const turnIndex = readNumber(record.turnIndex)
    const fileChanges = Array.isArray(record.fileChanges)
      ? record.fileChanges
        .map((entry) => normalizeFallbackFileChange(entry))
        .filter((entry): entry is UiFileChange => entry !== null)
      : []

    if (!turnId || turnIndex === null || fileChanges.length === 0) continue
    normalized.push({ turnId, turnIndex, fileChanges })
  }

  return normalized
}

function buildTurnIndexByTurnId(payload: ThreadReadResponse): ThreadTurnIndexById {
  const turns = Array.isArray(payload.thread.turns) ? payload.thread.turns : []
  const lookup: ThreadTurnIndexById = {}

  for (let turnIndex = 0; turnIndex < turns.length; turnIndex += 1) {
    const turn = turns[turnIndex]
    if (typeof turn?.id !== 'string' || turn.id.length === 0) continue
    lookup[turn.id] = turnIndex
  }

  return lookup
}

async function fetchThreadFileChangeFallback(threadId: string): Promise<ThreadFileChangeFallbackEntry[]> {
  const response = await fetch(`/codex-api/thread-file-change-fallback?threadId=${encodeURIComponent(threadId)}`)
  if (!response.ok) {
    throw new Error(`Fallback request failed with ${response.status}`)
  }
  return normalizeThreadFileChangeFallback(await response.json())
}

function mergeRecoveredFileChangeMessages(messages: UiMessage[], fallbackEntries: ThreadFileChangeFallbackEntry[]): UiMessage[] {
  if (fallbackEntries.length === 0) return messages

  const existingTurnIndices = new Set(
    messages
      .filter((message) => message.messageType === 'fileChange' && typeof message.turnIndex === 'number')
      .map((message) => message.turnIndex as number),
  )

  const extraMessages = fallbackEntries
    .filter((entry) => !existingTurnIndices.has(entry.turnIndex))
    .map<UiMessage>((entry) => ({
      id: `session-file-change:${entry.turnId}`,
      role: 'system',
      text: '',
      messageType: 'fileChange',
      fileChangeStatus: 'completed',
      fileChanges: entry.fileChanges,
      turnId: entry.turnId,
      turnIndex: entry.turnIndex,
    }))

  if (extraMessages.length === 0) return messages

  const extrasByTurnIndex = new Map<number, UiMessage[]>()
  for (const message of extraMessages) {
    const turnIndex = message.turnIndex
    if (typeof turnIndex !== 'number') continue
    const current = extrasByTurnIndex.get(turnIndex)
    if (current) current.push(message)
    else extrasByTurnIndex.set(turnIndex, [message])
  }

  const insertedTurnIndices = new Set<number>()
  const merged: UiMessage[] = []

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]
    merged.push(message)

    const turnIndex = message.turnIndex
    if (typeof turnIndex !== 'number' || insertedTurnIndices.has(turnIndex)) continue
    const nextTurnIndex = messages[index + 1]?.turnIndex
    if (nextTurnIndex === turnIndex) continue

    const extras = extrasByTurnIndex.get(turnIndex)
    if (!extras || extras.length === 0) continue

    merged.push(...extras)
    insertedTurnIndices.add(turnIndex)
  }

  const remainingExtras = extraMessages
    .filter((message) => typeof message.turnIndex === 'number' && !insertedTurnIndices.has(message.turnIndex))
    .sort((first, second) => (first.turnIndex ?? 0) - (second.turnIndex ?? 0))

  if (remainingExtras.length > 0) {
    merged.push(...remainingExtras)
  }

  return merged
}

async function enrichThreadMessagesWithFallback(threadId: string, messages: UiMessage[]): Promise<UiMessage[]> {
  try {
    const fallbackEntries = await fetchThreadFileChangeFallback(threadId)
    return mergeRecoveredFileChangeMessages(messages, fallbackEntries)
  } catch {
    return messages
  }
}

function normalizeReasoningEffort(value: unknown): ReasoningEffort | '' {
  const allowed: ReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh']
  return typeof value === 'string' && allowed.includes(value as ReasoningEffort)
    ? (value as ReasoningEffort)
    : ''
}

async function getThreadGroupsV2(): Promise<UiProjectGroup[]> {
  const payload = await callRpc<ThreadListResponse>('thread/list', {
    archived: false,
    limit: 100,
    sortKey: 'updated_at',
  })
  return normalizeThreadGroupsV2(payload)
}

async function getThreadMessagesV2(threadId: string): Promise<UiMessage[]> {
  const payload = await callRpc<ThreadReadResponse>('thread/read', {
    threadId,
    includeTurns: true,
  })
  return await enrichThreadMessagesWithFallback(threadId, normalizeThreadMessagesV2(payload))
}

async function getThreadDetailV2(threadId: string): Promise<{
  messages: UiMessage[]
  inProgress: boolean
  turnIndexByTurnId: ThreadTurnIndexById
}> {
  const payload = await callRpc<ThreadReadResponse>('thread/read', {
    threadId,
    includeTurns: true,
  })
  const messages = await enrichThreadMessagesWithFallback(threadId, normalizeThreadMessagesV2(payload))
  return {
    messages,
    inProgress: readThreadInProgressFromResponse(payload),
    turnIndexByTurnId: buildTurnIndexByTurnId(payload),
  }
}

export async function getThreadGroups(): Promise<UiProjectGroup[]> {
  try {
    return await getThreadGroupsV2()
  } catch (error) {
    throw normalizeCodexApiError(error, 'Failed to load thread groups', 'thread/list')
  }
}

export async function getThreadMessages(threadId: string): Promise<UiMessage[]> {
  try {
    return await getThreadMessagesV2(threadId)
  } catch (error) {
    throw normalizeCodexApiError(error, `Failed to load thread ${threadId}`, 'thread/read')
  }
}

export async function getThreadDetail(threadId: string): Promise<{
  messages: UiMessage[]
  inProgress: boolean
  turnIndexByTurnId: ThreadTurnIndexById
}> {
  try {
    return await getThreadDetailV2(threadId)
  } catch (error) {
    throw normalizeCodexApiError(error, `Failed to load thread ${threadId}`, 'thread/read')
  }
}

function normalizeReviewLine(value: unknown): UiReviewLine | null {
  const record = asRecord(value)
  if (!record) return null

  const key = readString(record.key)
  const text = typeof record.text === 'string' ? record.text : ''
  const kind = readString(record.kind)
  if (!key || !kind) return null
  if (kind !== 'meta' && kind !== 'hunk' && kind !== 'add' && kind !== 'remove' && kind !== 'context') {
    return null
  }

  return {
    key,
    kind,
    text,
    oldLine: readNumber(record.oldLine),
    newLine: readNumber(record.newLine),
  }
}

function normalizeReviewHunk(value: unknown): UiReviewHunk | null {
  const record = asRecord(value)
  if (!record) return null

  const id = readString(record.id)
  const header = typeof record.header === 'string' ? record.header : ''
  const patch = typeof record.patch === 'string' ? record.patch : ''
  if (!id) return null

  return {
    id,
    header,
    patch,
    addedLineCount: readNumber(record.addedLineCount) ?? 0,
    removedLineCount: readNumber(record.removedLineCount) ?? 0,
    oldStart: readNumber(record.oldStart),
    oldLineCount: readNumber(record.oldLineCount) ?? 0,
    newStart: readNumber(record.newStart),
    newLineCount: readNumber(record.newLineCount) ?? 0,
    lines: Array.isArray(record.lines)
      ? record.lines
        .map((entry) => normalizeReviewLine(entry))
        .filter((entry): entry is UiReviewLine => entry !== null)
      : [],
  }
}

function normalizeReviewFile(value: unknown): UiReviewFile | null {
  const record = asRecord(value)
  if (!record) return null

  const id = readString(record.id)
  const path = readString(record.path)
  const absolutePath = readString(record.absolutePath)
  const operation = readString(record.operation)
  if (!id || !path || !absolutePath || !operation) return null
  if (operation !== 'add' && operation !== 'delete' && operation !== 'update' && operation !== 'rename') {
    return null
  }

  return {
    id,
    path,
    absolutePath,
    previousPath: readString(record.previousPath),
    previousAbsolutePath: readString(record.previousAbsolutePath),
    operation,
    addedLineCount: readNumber(record.addedLineCount) ?? 0,
    removedLineCount: readNumber(record.removedLineCount) ?? 0,
    diff: typeof record.diff === 'string' ? record.diff : '',
    hunks: Array.isArray(record.hunks)
      ? record.hunks
        .map((entry) => normalizeReviewHunk(entry))
        .filter((entry): entry is UiReviewHunk => entry !== null)
      : [],
  }
}

function normalizeReviewSnapshot(payload: unknown): UiReviewSnapshot {
  const envelope = asRecord(payload)
  const data = asRecord(envelope?.data)
  const summaryRecord = asRecord(data?.summary)
  const scope = readString(data?.scope) === 'baseBranch' ? 'baseBranch' : 'workspace'
  const workspaceView = readString(data?.workspaceView) === 'staged' ? 'staged' : 'unstaged'

  return {
    cwd: readString(data?.cwd) ?? '',
    gitRoot: readString(data?.gitRoot),
    isGitRepo: readBoolean(data?.isGitRepo) ?? false,
    scope,
    workspaceView,
    baseBranch: readString(data?.baseBranch),
    baseBranchOptions: Array.isArray(data?.baseBranchOptions)
      ? data.baseBranchOptions
        .map((entry) => readString(entry))
        .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
      : [],
    headBranch: readString(data?.headBranch),
    mergeBaseSha: readString(data?.mergeBaseSha),
    generatedAtIso: readString(data?.generatedAtIso) ?? '',
    summary: {
      fileCount: readNumber(summaryRecord?.fileCount) ?? 0,
      addedLineCount: readNumber(summaryRecord?.addedLineCount) ?? 0,
      removedLineCount: readNumber(summaryRecord?.removedLineCount) ?? 0,
    },
    files: Array.isArray(data?.files)
      ? data.files
        .map((entry) => normalizeReviewFile(entry))
        .filter((entry): entry is UiReviewFile => entry !== null)
      : [],
  }
}

function parseReviewLocation(value: string): {
  absolutePath: string | null
  startLine: number | null
  endLine: number | null
} {
  const trimmed = value.trim()
  if (!trimmed) {
    return { absolutePath: null, startLine: null, endLine: null }
  }

  const match = trimmed.match(/^(.*?):(\d+)-(\d+)$/u)
  if (!match) {
    return { absolutePath: trimmed || null, startLine: null, endLine: null }
  }

  return {
    absolutePath: match[1]?.trim() || null,
    startLine: Number(match[2]),
    endLine: Number(match[3]),
  }
}

function parseReviewText(reviewText: string): UiReviewResult {
  const normalized = reviewText.replace(/\r\n/g, '\n').trim()
  if (!normalized) {
    return { reviewText: '', summary: '', findings: [] }
  }

  const markerIndex = normalized.search(/\n(?:Full review comments|Review comment):\n/iu)
  const summary = markerIndex >= 0 ? normalized.slice(0, markerIndex).trim() : normalized
  const findingsSection = markerIndex >= 0 ? normalized.slice(markerIndex).trim() : ''
  const findings: UiReviewFinding[] = []

  if (findingsSection) {
    const body = findingsSection
      .replace(/^(?:Full review comments|Review comment):\n*/iu, '')
      .trim()
    const matches = body.matchAll(/^- (.+?) — (.+)\n?((?:  .*(?:\n|$))*)/gmu)
    let index = 0
    for (const match of matches) {
      const title = match[1]?.trim() ?? ''
      const location = parseReviewLocation(match[2] ?? '')
      const block = (match[0] ?? '').trim()
      const findingBody = (match[3] ?? '')
        .split('\n')
        .map((line) => line.replace(/^  /u, ''))
        .join('\n')
        .trim()

      findings.push({
        id: `finding:${index}`,
        title: title || `Finding ${index + 1}`,
        body: findingBody,
        path: location.absolutePath ? location.absolutePath.split('/').filter(Boolean).slice(-1)[0] ?? location.absolutePath : null,
        absolutePath: location.absolutePath,
        startLine: location.startLine,
        endLine: location.endLine,
        rawText: block,
      })
      index += 1
    }
  }

  return {
    reviewText: normalized,
    summary,
    findings,
  }
}

function readLatestReviewItem(payload: ThreadReadResponse, type: 'enteredReviewMode' | 'exitedReviewMode'): string | null {
  const turns = Array.isArray(payload.thread.turns) ? payload.thread.turns : []
  for (let turnIndex = turns.length - 1; turnIndex >= 0; turnIndex -= 1) {
    const turn = turns[turnIndex]
    const items = Array.isArray(turn?.items) ? turn.items : []
    for (let itemIndex = items.length - 1; itemIndex >= 0; itemIndex -= 1) {
      const item = items[itemIndex]
      if (item?.type !== type) continue
      const review = typeof item.review === 'string' ? item.review.trim() : ''
      if (review) return review
    }
  }
  return null
}

export async function getThreadReviewResult(threadId: string): Promise<{
  enteredReviewLabel: string | null
  result: UiReviewResult | null
}> {
  const payload = await callRpc<ThreadReadResponse>('thread/read', {
    threadId,
    includeTurns: true,
  })

  const exitedReview = readLatestReviewItem(payload, 'exitedReviewMode')
  return {
    enteredReviewLabel: readLatestReviewItem(payload, 'enteredReviewMode'),
    result: exitedReview ? parseReviewText(exitedReview) : null,
  }
}

export async function getMethodCatalog(): Promise<string[]> {
  return fetchRpcMethodCatalog()
}

export async function getNotificationCatalog(): Promise<string[]> {
  return fetchRpcNotificationCatalog()
}

export function subscribeCodexNotifications(onNotification: (value: RpcNotification) => void): () => void {
  return subscribeRpcNotifications(onNotification)
}

export type { RpcNotification }

export async function replyToServerRequest(
  id: number,
  payload: { result?: unknown; error?: { code?: number; message: string } },
): Promise<void> {
  await respondServerRequest({
    id,
    ...payload,
  })
}

export async function getPendingServerRequests(): Promise<unknown[]> {
  return fetchPendingServerRequests()
}

export async function getAccountRateLimits(): Promise<UiRateLimitSnapshot | null> {
  try {
    const payload = await callRpc<unknown>('account/rateLimits/read')
    return pickCodexRateLimitSnapshot(payload)
  } catch (error) {
    throw normalizeCodexApiError(error, 'Failed to load account rate limits', 'account/rateLimits/read')
  }
}

function normalizeAccountsListResult(payload: unknown): AccountsListResult {
  const record = asRecord(payload)
  const activeAccountId = readString(record?.activeAccountId)
  const data = Array.isArray(record?.accounts) ? record?.accounts : []
  return {
    activeAccountId,
    importedAccountId: readString(record?.importedAccountId) ?? undefined,
    accounts: data
      .map((entry) => normalizeAccountEntry(entry, activeAccountId))
      .filter((entry): entry is UiAccountEntry => entry !== null),
  }
}

export async function getAccounts(): Promise<AccountsListResult> {
  const response = await fetch('/codex-api/accounts')
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(payload, 'Failed to load accounts'))
  }
  const envelope = asRecord(payload)
  return normalizeAccountsListResult(envelope?.data)
}

export async function refreshAccountsFromAuth(): Promise<AccountsListResult> {
  const response = await fetch('/codex-api/accounts/refresh', {
    method: 'POST',
  })
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(payload, 'Failed to refresh accounts'))
  }
  const envelope = asRecord(payload)
  return normalizeAccountsListResult(envelope?.data)
}

export async function switchAccount(accountId: string): Promise<UiAccountEntry> {
  const response = await fetch('/codex-api/accounts/switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId }),
  })
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(payload, 'Failed to switch account'))
  }
  const envelope = asRecord(payload)
  const data = asRecord(envelope?.data)
  const account = normalizeAccountEntry(data?.account, readString(data?.activeAccountId))
  if (!account) {
    throw new Error('Failed to switch account')
  }
  return account
}

export async function removeAccount(accountId: string): Promise<AccountsListResult> {
  const response = await fetch('/codex-api/accounts/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId }),
  })
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(payload, 'Failed to remove account'))
  }
  const envelope = asRecord(payload)
  return normalizeAccountsListResult(envelope?.data)
}

export async function resumeThread(threadId: string): Promise<void> {
  await callRpc('thread/resume', { threadId })
}

export async function archiveThread(threadId: string): Promise<void> {
  await callRpc('thread/archive', { threadId })
}

export async function renameThread(threadId: string, threadName: string): Promise<void> {
  await callRpc('thread/name/set', { threadId, name: threadName })
}

export async function rollbackThread(threadId: string, numTurns: number): Promise<UiMessage[]> {
  const payload = await callRpc<ThreadReadResponse>('thread/rollback', { threadId, numTurns })
  return normalizeThreadMessagesV2(payload)
}

function normalizeThreadIdFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const record = payload as Record<string, unknown>

  const thread = record.thread
  if (thread && typeof thread === 'object') {
    const threadId = (thread as Record<string, unknown>).id
    if (typeof threadId === 'string' && threadId.length > 0) {
      return threadId
    }
  }
  return ''
}

function normalizeThreadCwdFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const record = payload as Record<string, unknown>

  const thread = record.thread
  if (thread && typeof thread === 'object') {
    const cwd = (thread as Record<string, unknown>).cwd
    if (typeof cwd === 'string' && cwd.length > 0) {
      return cwd
    }
  }
  return ''
}

export async function startThread(cwd?: string, model?: string): Promise<string> {
  try {
    const params: Record<string, unknown> = {}
    if (typeof cwd === 'string' && cwd.trim().length > 0) {
      params.cwd = cwd.trim()
    }
    if (typeof model === 'string' && model.trim().length > 0) {
      params.model = model.trim()
    }
    const payload = await callRpc<{ thread?: { id?: string } }>('thread/start', params)
    const threadId = normalizeThreadIdFromPayload(payload)
    if (!threadId) {
      throw new Error('thread/start did not return a thread id')
    }
    return threadId
  } catch (error) {
    throw normalizeCodexApiError(error, 'Failed to start a new thread', 'thread/start')
  }
}

export async function forkThread(threadId: string): Promise<{ threadId: string; cwd: string; messages: UiMessage[] }> {
  try {
    const payload = await callRpc<ThreadReadResponse & { thread?: { id?: string; cwd?: string } }>('thread/fork', {
      threadId,
      persistExtendedHistory: true,
    })
    const forkedThreadId = normalizeThreadIdFromPayload(payload)
    if (!forkedThreadId) {
      throw new Error('thread/fork did not return a thread id')
    }
    return {
      threadId: forkedThreadId,
      cwd: normalizeThreadCwdFromPayload(payload),
      messages: normalizeThreadMessagesV2(payload),
    }
  } catch (error) {
    throw normalizeCodexApiError(error, `Failed to fork thread ${threadId}`, 'thread/fork')
  }
}

export type FileAttachmentParam = { label: string; path: string; fsPath: string }
export type MentionParam = { name: string; path: string; token?: string }

function buildTextWithAttachments(
  prompt: string,
  files: FileAttachmentParam[],
): string {
  if (files.length === 0) return prompt
  let prefix = '# Files mentioned by the user:\n'
  for (const f of files) {
    prefix += `\n## ${f.label}: ${f.path}\n`
  }
  return `${prefix}\n## My request for Codex:\n\n${prompt}\n`
}

function buildTextWithMentions(
  prompt: string,
  mentions: MentionParam[],
): string {
  const normalizedPrompt = prompt.trim()
  if (mentions.length === 0) return normalizedPrompt
  const tokens = mentions
    .map((mention) => mention.token?.trim() ?? '')
    .filter((token) => token.length > 0 && !normalizedPrompt.includes(token))

  if (tokens.length === 0) return normalizedPrompt
  return `${tokens.join(' ')}${normalizedPrompt ? ` ${normalizedPrompt}` : ''}`
}

async function resolveCollaborationModeSettings(
  mode: CollaborationModeKind,
  model?: string,
  effort?: ReasoningEffort,
): Promise<ResolvedCollaborationModeSettings> {
  const explicitModel = model?.trim() ?? ''
  if (explicitModel) {
    return {
      model: explicitModel,
      reasoningEffort: mode === 'plan'
        ? normalizePlanModeReasoningEffort(effort)
        : normalizeCollaborationModeReasoningEffort(effort),
    }
  }

  let currentConfig: CurrentModelConfig | null = null
  try {
    currentConfig = await getCurrentModelConfig()
  } catch {
    currentConfig = null
  }

  const configuredModel = currentConfig?.model.trim() ?? ''
  if (configuredModel) {
    return {
      model: configuredModel,
      reasoningEffort: mode === 'plan'
        ? normalizePlanModeReasoningEffort(effort ?? currentConfig?.reasoningEffort)
        : normalizeCollaborationModeReasoningEffort(effort ?? currentConfig?.reasoningEffort),
    }
  }

  let availableModelIds: string[] = []
  try {
    availableModelIds = await getAvailableModelIds()
  } catch {
    availableModelIds = []
  }

  const fallbackModel = availableModelIds.find((candidate) => candidate.trim().length > 0)?.trim() ?? ''
  if (fallbackModel) {
    return {
      model: fallbackModel,
      reasoningEffort: mode === 'plan'
        ? normalizePlanModeReasoningEffort(effort ?? currentConfig?.reasoningEffort)
        : normalizeCollaborationModeReasoningEffort(effort ?? currentConfig?.reasoningEffort),
    }
  }

  throw new Error(`${mode === 'plan' ? 'Plan' : 'Default'} mode requires an available model. Wait for models to load and try again.`)
}

export async function startThreadTurn(
  threadId: string,
  text: string,
  imageUrls: string[] = [],
  model?: string,
  effort?: ReasoningEffort,
  skills?: Array<{ name: string; path: string }>,
  mentions?: MentionParam[],
  fileAttachments: FileAttachmentParam[] = [],
  collaborationMode?: CollaborationModeKind,
): Promise<string> {
  try {
    const normalizedModel = model?.trim() ?? ''
    const textWithMentions = buildTextWithMentions(text, mentions ?? [])
    const finalText = buildTextWithAttachments(textWithMentions, fileAttachments)
    const input: Array<Record<string, unknown>> = [{ type: 'text', text: finalText }]
    for (const imageUrl of imageUrls) {
      const normalizedUrl = imageUrl.trim()
      if (!normalizedUrl) continue
      input.push({
        type: 'image',
        url: normalizedUrl,
        image_url: normalizedUrl,
      })
    }
    if (skills) {
      for (const skill of skills) {
        input.push({ type: 'skill', name: skill.name, path: skill.path })
      }
    }
    if (mentions) {
      for (const mention of mentions) {
        if (!mention.name.trim() || !mention.path.trim()) continue
        input.push({ type: 'mention', name: mention.name, path: mention.path })
      }
    }
    const attachments = fileAttachments.map((f) => ({ label: f.label, path: f.path, fsPath: f.fsPath }))
    const params: Record<string, unknown> = {
      threadId,
      input,
    }
    if (attachments.length > 0) params.attachments = attachments
    if (normalizedModel) {
      params.model = normalizedModel
    }
    if (typeof effort === 'string' && effort.length > 0) {
      params.effort = effort
    }
    if (collaborationMode) {
      const collaborationModeSettings = await resolveCollaborationModeSettings(collaborationMode, normalizedModel, effort)
      params.collaborationMode = {
        mode: collaborationMode,
        settings: {
          model: collaborationModeSettings.model,
          reasoning_effort: collaborationModeSettings.reasoningEffort,
          developer_instructions: null,
        },
      }
    }
    const response = await callRpc<TurnStartResponse>('turn/start', params)
    return readString(response?.turn?.id)?.trim() ?? ''
  } catch (error) {
    throw normalizeCodexApiError(error, `Failed to start turn for thread ${threadId}`, 'turn/start')
  }
}

export async function interruptThreadTurn(threadId: string, turnId?: string): Promise<void> {
  const normalizedThreadId = threadId.trim()
  const normalizedTurnId = turnId?.trim() || ''
  if (!normalizedThreadId) return

  try {
    if (!normalizedTurnId) {
      throw new Error('turn/interrupt requires turnId')
    }
    await callRpc('turn/interrupt', { threadId: normalizedThreadId, turnId: normalizedTurnId })
  } catch (error) {
    throw normalizeCodexApiError(error, `Failed to interrupt turn for thread ${normalizedThreadId}`, 'turn/interrupt')
  }
}

export async function setDefaultModel(model: string): Promise<void> {
  await callRpc('setDefaultModel', { model })
}

export async function getAvailableModelIds(): Promise<string[]> {
  const payload = await callRpc<ModelListResponse>('model/list', {})
  const ids: string[] = []
  for (const row of payload.data) {
    const candidate = row.id || row.model
    if (!candidate || ids.includes(candidate)) continue
    ids.push(candidate)
  }
  return ids
}

export async function getCurrentModelConfig(): Promise<CurrentModelConfig> {
  const payload = await callRpc<ConfigReadResponse>('config/read', {})
  const model = payload.config.model ?? ''
  const reasoningEffort = normalizeReasoningEffort(payload.config.model_reasoning_effort)
  return { model, reasoningEffort }
}

function normalizeCollaborationModeLabel(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (segment) => segment.toUpperCase())
}

export async function getAvailableCollaborationModes(): Promise<CollaborationModeOption[]> {
  try {
    const payload = await callRpc<CollaborationModeListResponse>('collaborationMode/list', {})
    const seen = new Set<CollaborationModeKind>()
    const normalized: CollaborationModeOption[] = []

    for (const row of payload.data) {
      const mode = row.mode
      if (mode !== 'default' && mode !== 'plan') continue
      if (seen.has(mode)) continue
      seen.add(mode)
      normalized.push({
        value: mode,
        label: normalizeCollaborationModeLabel(row.name || mode) || (mode === 'plan' ? 'Plan' : 'Default'),
      })
    }

    if (normalized.length > 0) {
      for (const fallback of DEFAULT_COLLABORATION_MODE_OPTIONS) {
        if (!seen.has(fallback.value)) {
          normalized.push(fallback)
        }
      }
      return normalized.sort((first, second) => (
        first.value === second.value ? 0 : first.value === 'default' ? -1 : 1
      ))
    }
  } catch {
    // Fall back to static options when the app-server does not expose presets.
  }

  return DEFAULT_COLLABORATION_MODE_OPTIONS
}

function normalizeWorkspaceRootsState(payload: unknown): WorkspaceRootsState {
  const record = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {}

  const normalizeArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return []
    const next: string[] = []
    for (const item of value) {
      if (typeof item === 'string' && item.length > 0 && !next.includes(item)) {
        next.push(item)
      }
    }
    return next
  }

  const labelsRaw = record.labels
  const labels: Record<string, string> = {}
  if (labelsRaw && typeof labelsRaw === 'object' && !Array.isArray(labelsRaw)) {
    for (const [key, value] of Object.entries(labelsRaw as Record<string, unknown>)) {
      if (typeof key === 'string' && key.length > 0 && typeof value === 'string') {
        labels[key] = value
      }
    }
  }

  return {
    order: normalizeArray(record.order),
    labels,
    active: normalizeArray(record.active),
  }
}

export async function getWorkspaceRootsState(): Promise<WorkspaceRootsState> {
  const response = await fetch('/codex-api/workspace-roots-state')
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error('Failed to load workspace roots state')
  }
  const envelope =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {}
  return normalizeWorkspaceRootsState(envelope.data)
}

export async function createWorktree(sourceCwd: string): Promise<WorktreeCreateResult> {
  const response = await fetch('/codex-api/worktree/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceCwd }),
  })
  const payload = (await response.json()) as { data?: WorktreeCreateResult; error?: string }
  if (!response.ok || !payload.data) {
    throw new Error(payload.error || 'Failed to create worktree')
  }
  return payload.data
}

export async function getReviewSnapshot(
  cwd: string,
  scope: UiReviewScope,
  workspaceView: UiReviewWorkspaceView,
  baseBranch?: string | null,
): Promise<UiReviewSnapshot> {
  const query = new URLSearchParams({ cwd, scope, workspaceView })
  if (baseBranch && baseBranch.trim()) {
    query.set('baseBranch', baseBranch.trim())
  }
  const response = await fetch(`/codex-api/review/snapshot?${query.toString()}`)
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(payload, 'Failed to load review snapshot'))
  }
  return normalizeReviewSnapshot(payload)
}

export async function applyReviewAction(payload: {
  cwd: string
  scope: UiReviewScope
  workspaceView: UiReviewWorkspaceView
  action: UiReviewAction
  level: UiReviewActionLevel
  path?: string
  previousPath?: string | null
  patch?: string
}): Promise<UiReviewSnapshot> {
  const response = await fetch('/codex-api/review/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(data, 'Failed to apply review action'))
  }
  return normalizeReviewSnapshot(data)
}

export async function initializeReviewGit(cwd: string): Promise<void> {
  const response = await fetch('/codex-api/review/git/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cwd }),
  })
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(payload, 'Failed to initialize Git'))
  }
}

export async function startThreadReview(
  threadId: string,
  scope: UiReviewScope,
  workspaceView: UiReviewWorkspaceView,
  baseBranch?: string | null,
): Promise<void> {
  const target = scope === 'baseBranch'
    ? { type: 'baseBranch' as const, branch: (baseBranch ?? '').trim() }
    : { type: 'uncommittedChanges' as const }
  if (target.type === 'baseBranch' && !target.branch) {
    throw new Error('Base branch is unavailable')
  }
  await callRpc('review/start', {
    threadId,
    target,
    delivery: 'inline',
  })
}

export async function getHomeDirectory(): Promise<string> {
  const response = await fetch('/codex-api/home-directory')
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error('Failed to load home directory')
  }
  const record =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {}
  const data =
    record.data && typeof record.data === 'object' && !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>)
      : {}
  return typeof data.path === 'string' ? data.path.trim() : ''
}

export async function getRuntimeInfo(): Promise<RuntimeInfo> {
  const response = await fetch('/codex-api/runtime-info')
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error('Failed to load runtime info')
  }
  const record =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {}
  const data =
    record.data && typeof record.data === 'object' && !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>)
      : {}

  return {
    codexCliVersion: typeof data.codexCliVersion === 'string' ? data.codexCliVersion.trim() || 'unknown' : 'unknown',
  }
}

function normalizePulseItem(value: unknown): UiPulseItem | null {
  const record = asRecord(value)
  const id = readString(record?.id)
  const title = readString(record?.title)
  const summary = readString(record?.summary)
  const details = readString(record?.details)
  const createdAtIso = readString(record?.createdAtIso)
  if (!id || !title || !summary || !details || !createdAtIso) return null
  return {
    id,
    title,
    summary,
    details,
    createdAtIso,
    tags: readStringArray(record?.tags),
    reaction: record?.reaction === 'up' || record?.reaction === 'down' ? record.reaction : null,
    savedAtIso: readString(record?.savedAtIso),
    savedThreadId: readString(record?.savedThreadId),
    followUpAtIso: readString(record?.followUpAtIso),
    followUpThreadId: readString(record?.followUpThreadId),
  }
}

function normalizePulseFeedbackKind(value: unknown): UiPulseFeedbackKind {
  return value === 'feedback' ? 'feedback' : 'curate'
}

function normalizePulseFeedbackEntry(value: unknown): UiPulseFeedbackEntry | null {
  const record = asRecord(value)
  const id = readString(record?.id)
  const text = readString(record?.text)
  const createdAtIso = readString(record?.createdAtIso)
  if (!id || !text || !createdAtIso) return null
  return {
    id,
    kind: normalizePulseFeedbackKind(record?.kind),
    text,
    createdAtIso,
  }
}

function normalizePulseSettings(value: unknown): UiPulseSettings {
  const record = asRecord(value)
  return {
    showInNewChats: readBoolean(record?.showInNewChats) ?? true,
    referenceMemoryInSuggestions: readBoolean(record?.referenceMemoryInSuggestions) ?? true,
  }
}

function normalizePulseState(payload: unknown): UiPulseState {
  const record = asRecord(payload)
  const officialSupportRecord = asRecord(record?.officialSupport)
  const items = Array.isArray(record?.items)
    ? record.items.map((entry) => normalizePulseItem(entry)).filter((entry): entry is UiPulseItem => entry !== null)
    : []
  const feedbackHistory = Array.isArray(record?.feedbackHistory)
    ? record.feedbackHistory
      .map((entry) => normalizePulseFeedbackEntry(entry))
      .filter((entry): entry is UiPulseFeedbackEntry => entry !== null)
    : []
  return {
    status: record?.status === 'ready' ? 'ready' : 'empty',
    items,
    feedbackHistory,
    settings: normalizePulseSettings(record?.settings),
    lastDeliveredAtIso: readString(record?.lastDeliveredAtIso),
    planType: readString(record?.planType),
    availabilityNote: readString(record?.availabilityNote) ?? 'Pulse is unavailable right now.',
    officialSupport: {
      web: readBoolean(officialSupportRecord?.web) ?? true,
      ios: readBoolean(officialSupportRecord?.ios) ?? true,
      android: readBoolean(officialSupportRecord?.android) ?? true,
      desktop: readBoolean(officialSupportRecord?.desktop) ?? false,
    },
  }
}

export async function getPulseState(): Promise<UiPulseState> {
  const response = await fetch('/codex-api/pulse')
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(payload, 'Failed to load pulse'))
  }
  const envelope = asRecord(payload)
  return normalizePulseState(envelope?.data)
}

export async function updatePulseSettings(settings: Partial<UiPulseSettings>): Promise<UiPulseState> {
  const response = await fetch('/codex-api/pulse/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(payload, 'Failed to update pulse settings'))
  }
  const envelope = asRecord(payload)
  return normalizePulseState(envelope?.data)
}

export async function createPulseFeedback(text: string, kind: UiPulseFeedbackKind = 'curate'): Promise<UiPulseState> {
  const response = await fetch('/codex-api/pulse/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, kind }),
  })
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(payload, 'Failed to save pulse feedback'))
  }
  const envelope = asRecord(payload)
  return normalizePulseState(envelope?.data)
}

export async function setPulseItemReaction(itemId: string, reaction: 'up' | 'down' | null): Promise<UiPulseState> {
  const response = await fetch('/codex-api/pulse/items/reaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, reaction }),
  })
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(payload, 'Failed to update Pulse reaction'))
  }
  const envelope = asRecord(payload)
  return normalizePulseState(envelope?.data)
}

export async function markPulseItemSaved(itemId: string, threadId: string): Promise<UiPulseState> {
  const response = await fetch('/codex-api/pulse/items/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, threadId }),
  })
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(payload, 'Failed to mark Pulse item as saved'))
  }
  const envelope = asRecord(payload)
  return normalizePulseState(envelope?.data)
}

export async function markPulseItemFollowUp(itemId: string, threadId: string): Promise<UiPulseState> {
  const response = await fetch('/codex-api/pulse/items/follow-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, threadId }),
  })
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(payload, 'Failed to mark Pulse item follow-up'))
  }
  const envelope = asRecord(payload)
  return normalizePulseState(envelope?.data)
}

export async function clearPulseFeedbackHistory(): Promise<UiPulseState> {
  const response = await fetch('/codex-api/pulse/feedback-history', {
    method: 'DELETE',
  })
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(payload, 'Failed to clear pulse feedback history'))
  }
  const envelope = asRecord(payload)
  return normalizePulseState(envelope?.data)
}

export async function setWorkspaceRootsState(nextState: WorkspaceRootsState): Promise<void> {
  const response = await fetch('/codex-api/workspace-roots-state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nextState),
  })
  if (!response.ok) {
    throw new Error('Failed to save workspace roots state')
  }
}

export async function openProjectRoot(path: string, options?: { createIfMissing?: boolean; label?: string }): Promise<string> {
  const response = await fetch('/codex-api/project-root', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path,
      createIfMissing: options?.createIfMissing === true,
      label: options?.label ?? '',
    }),
  })
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    const message = getErrorMessageFromPayload(payload, 'Failed to open project root')
    throw new Error(message)
  }
  const record =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {}
  const data =
    record.data && typeof record.data === 'object' && !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>)
      : {}
  const normalizedPath = typeof data.path === 'string' ? data.path.trim() : ''
  return normalizedPath
}

export async function getProjectRootSuggestion(basePath: string): Promise<{ name: string; path: string }> {
  const query = new URLSearchParams({ basePath })
  const response = await fetch(`/codex-api/project-root-suggestion?${query.toString()}`)
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    const message = getErrorMessageFromPayload(payload, 'Failed to suggest project name')
    throw new Error(message)
  }
  const record =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {}
  const data =
    record.data && typeof record.data === 'object' && !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>)
      : {}
  return {
    name: typeof data.name === 'string' ? data.name.trim() : '',
    path: typeof data.path === 'string' ? data.path.trim() : '',
  }
}

export async function searchComposerFiles(cwd: string, query: string, limit = 20): Promise<ComposerFileSuggestion[]> {
  const trimmedCwd = cwd.trim()
  if (!trimmedCwd) return []
  const response = await fetch('/codex-api/composer-file-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cwd: trimmedCwd,
      query: query.trim(),
      limit,
    }),
  })
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    const message = getErrorMessageFromPayload(payload, 'Failed to search files')
    throw new Error(message)
  }
  const record =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {}
  const data = Array.isArray(record.data) ? record.data : []
  const suggestions: ComposerFileSuggestion[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const row = item as Record<string, unknown>
    const rawPath = row.path
    const value = typeof rawPath === 'string' ? rawPath.trim() : ''
    if (!value) continue
    suggestions.push({ path: value })
  }
  return suggestions
}

export async function searchThreads(
  query: string,
  limit = 200,
): Promise<ThreadSearchResult> {
  const response = await fetch('/codex-api/thread-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  })
  const payload = (await response.json()) as { data?: ThreadSearchResult; error?: string }
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to search threads')
  }
  return payload.data ?? { threadIds: [], indexedThreadCount: 0 }
}

export type FileExplorerEntry = {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
}

export type FilePathMetadata = {
  path: string
  isDirectory: boolean
  isFile: boolean
  createdAtMs: number
  modifiedAtMs: number
}

export async function getFilePathMetadata(path: string): Promise<FilePathMetadata> {
  const normalizedPath = path.trim()
  if (!normalizedPath) {
    throw new Error('Missing file path')
  }

  const payload = await callRpc<{
    isDirectory?: boolean
    isFile?: boolean
    createdAtMs?: number
    modifiedAtMs?: number
  }>('fs/getMetadata', { path: normalizedPath })

  return {
    path: normalizedPath,
    isDirectory: payload.isDirectory === true,
    isFile: payload.isFile === true,
    createdAtMs: typeof payload.createdAtMs === 'number' ? payload.createdAtMs : 0,
    modifiedAtMs: typeof payload.modifiedAtMs === 'number' ? payload.modifiedAtMs : 0,
  }
}

export async function readDirectoryEntries(path: string): Promise<FileExplorerEntry[]> {
  const normalizedPath = path.trim()
  if (!normalizedPath) {
    throw new Error('Missing directory path')
  }

  const payload = await callRpc<{
    entries?: Array<{
      fileName?: string
      isDirectory?: boolean
      isFile?: boolean
    }>
  }>('fs/readDirectory', { path: normalizedPath })

  const entries = Array.isArray(payload.entries) ? payload.entries : []
  const normalized = entries
    .map((entry) => {
      const name = typeof entry.fileName === 'string' ? entry.fileName.trim() : ''
      if (!name) return null
      const basePath = normalizedPath.replace(/\/+$/u, '')
      return {
        name,
        path: basePath ? `${basePath}/${name}` : `/${name}`,
        isDirectory: entry.isDirectory === true,
        isFile: entry.isFile === true,
      } satisfies FileExplorerEntry
    })
    .filter((entry): entry is FileExplorerEntry => entry !== null)

  normalized.sort((first, second) => {
    if (first.isDirectory !== second.isDirectory) return first.isDirectory ? -1 : 1
    return first.name.localeCompare(second.name)
  })

  return normalized
}

export async function readFileContentsBase64(path: string): Promise<string> {
  const normalizedPath = path.trim()
  if (!normalizedPath) {
    throw new Error('Missing file path')
  }

  const payload = await callRpc<{ dataBase64?: string }>('fs/readFile', { path: normalizedPath })
  return typeof payload.dataBase64 === 'string' ? payload.dataBase64 : ''
}

function getErrorMessageFromPayload(payload: unknown, fallback: string): string {
  const record = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {}
  const message = record.message
  if (typeof message === 'string' && message.trim().length > 0) {
    return message
  }
  const error = record.error
  return typeof error === 'string' && error.trim().length > 0 ? error : fallback
}

export type ThreadTitleCache = { titles: Record<string, string>; order: string[] }

export type UiAutomation = {
  id: string
  title: string
  prompt: string
  projectPaths: string[]
  skillNames: string[]
  enabled: boolean
  runMode: 'local' | 'worktree'
  schedulePreset: 'hourly' | 'daily' | 'weekly' | 'custom'
  cronExpression: string
  model: string
  reasoningEffort: string
  sandboxMode: 'default' | 'read-only' | 'workspace-write' | 'danger-full-access'
  autoArchiveEmpty: boolean
  createdAtIso: string
  updatedAtIso: string
  nextRunAtIso: string | null
  lastRunAtIso: string | null
  lastSuccessAtIso: string | null
  lastStatus: 'idle' | 'running' | 'succeeded' | 'failed'
  lastError: string
}

export type UiAutomationRun = {
  id: string
  automationId: string
  automationTitle: string
  projectPath: string
  cwd: string
  effectiveRunMode: 'local' | 'worktree'
  worktreeCwd: string
  status: 'running' | 'completed' | 'failed' | 'archived'
  unread: boolean
  archived: boolean
  startedAtIso: string
  completedAtIso: string | null
  summary: string
  finalMessage: string
  error: string
  outputPath: string
  eventLogPath: string
  threadId: string
  model: string
  reasoningEffort: string
  sandboxMode: string
  hasFindings: boolean
}

export type UiAutomationDefaults = {
  model: string
  reasoningEffort: string
  sandboxMode: string
}

function normalizeUiAutomation(value: unknown): UiAutomation | null {
  const record = asRecord(value)
  if (!record) return null
  const id = readString(record.id)
  const title = readString(record.title)
  const prompt = readString(record.prompt)
  if (!id || !title || !prompt) return null
  const sandboxMode = readString(record.sandboxMode)
  const lastStatus = readString(record.lastStatus)
  const runMode = readString(record.runMode)
  const schedulePreset = readString(record.schedulePreset)
  return {
    id,
    title,
    prompt,
    projectPaths: readStringArray(record.projectPaths),
    skillNames: readStringArray(record.skillNames),
    enabled: readBoolean(record.enabled) ?? true,
    runMode: runMode === 'worktree' ? 'worktree' : 'local',
    schedulePreset: schedulePreset === 'hourly' || schedulePreset === 'daily' || schedulePreset === 'weekly' ? schedulePreset : 'custom',
    cronExpression: readString(record.cronExpression) ?? '',
    model: readString(record.model) ?? '',
    reasoningEffort: readString(record.reasoningEffort) ?? '',
    sandboxMode: sandboxMode === 'read-only' || sandboxMode === 'workspace-write' || sandboxMode === 'danger-full-access' ? sandboxMode : 'default',
    autoArchiveEmpty: readBoolean(record.autoArchiveEmpty) ?? true,
    createdAtIso: readString(record.createdAtIso) ?? '',
    updatedAtIso: readString(record.updatedAtIso) ?? '',
    nextRunAtIso: readString(record.nextRunAtIso),
    lastRunAtIso: readString(record.lastRunAtIso),
    lastSuccessAtIso: readString(record.lastSuccessAtIso),
    lastStatus: lastStatus === 'running' || lastStatus === 'succeeded' || lastStatus === 'failed' ? lastStatus : 'idle',
    lastError: readString(record.lastError) ?? '',
  }
}

function normalizeUiAutomationRun(value: unknown): UiAutomationRun | null {
  const record = asRecord(value)
  if (!record) return null
  const id = readString(record.id)
  const automationId = readString(record.automationId)
  const automationTitle = readString(record.automationTitle)
  const projectPath = readString(record.projectPath)
  const cwd = readString(record.cwd)
  if (!id || !automationId || !automationTitle || !projectPath || !cwd) return null
  const status = readString(record.status)
  const effectiveRunMode = readString(record.effectiveRunMode)
  return {
    id,
    automationId,
    automationTitle,
    projectPath,
    cwd,
    effectiveRunMode: effectiveRunMode === 'worktree' ? 'worktree' : 'local',
    worktreeCwd: readString(record.worktreeCwd) ?? '',
    status: status === 'running' || status === 'failed' || status === 'archived' ? status : 'completed',
    unread: readBoolean(record.unread) ?? false,
    archived: readBoolean(record.archived) ?? false,
    startedAtIso: readString(record.startedAtIso) ?? '',
    completedAtIso: readString(record.completedAtIso),
    summary: readString(record.summary) ?? '',
    finalMessage: typeof record.finalMessage === 'string' ? record.finalMessage : '',
    error: readString(record.error) ?? '',
    outputPath: readString(record.outputPath) ?? '',
    eventLogPath: readString(record.eventLogPath) ?? '',
    threadId: readString(record.threadId) ?? '',
    model: readString(record.model) ?? '',
    reasoningEffort: readString(record.reasoningEffort) ?? '',
    sandboxMode: readString(record.sandboxMode) ?? '',
    hasFindings: readBoolean(record.hasFindings) ?? false,
  }
}

export async function getAutomationsState(): Promise<{
  automations: UiAutomation[]
  runs: UiAutomationRun[]
  defaults: UiAutomationDefaults
}> {
  const response = await fetch('/codex-api/automations/state')
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(payload, 'Failed to load automations'))
  }

  const envelope = asRecord(payload)
  const data = asRecord(envelope?.data)
  const defaultsRecord = asRecord(data?.defaults)
  return {
    automations: (Array.isArray(data?.automations) ? data.automations : [])
      .map((entry) => normalizeUiAutomation(entry))
      .filter((entry): entry is UiAutomation => entry !== null),
    runs: (Array.isArray(data?.runs) ? data.runs : [])
      .map((entry) => normalizeUiAutomationRun(entry))
      .filter((entry): entry is UiAutomationRun => entry !== null),
    defaults: {
      model: readString(defaultsRecord?.model) ?? '',
      reasoningEffort: readString(defaultsRecord?.reasoningEffort) ?? '',
      sandboxMode: readString(defaultsRecord?.sandboxMode) ?? '',
    },
  }
}

export async function createAutomation(payload: {
  title: string
  prompt: string
  projectPaths: string[]
  skillNames: string[]
  enabled: boolean
  runMode: 'local' | 'worktree'
  schedulePreset: 'hourly' | 'daily' | 'weekly' | 'custom'
  cronExpression: string
  model: string
  reasoningEffort: string
  sandboxMode: 'default' | 'read-only' | 'workspace-write' | 'danger-full-access'
  autoArchiveEmpty: boolean
}): Promise<UiAutomation> {
  const response = await fetch('/codex-api/automations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(body, 'Failed to create automation'))
  }
  const record = asRecord(asRecord(body)?.data)
  const normalized = normalizeUiAutomation(record)
  if (!normalized) throw new Error('Failed to create automation')
  return normalized
}

export async function updateAutomation(
  id: string,
  payload: {
    title: string
    prompt: string
    projectPaths: string[]
    skillNames: string[]
    enabled: boolean
    runMode: 'local' | 'worktree'
    schedulePreset: 'hourly' | 'daily' | 'weekly' | 'custom'
    cronExpression: string
    model: string
    reasoningEffort: string
    sandboxMode: 'default' | 'read-only' | 'workspace-write' | 'danger-full-access'
    autoArchiveEmpty: boolean
  },
): Promise<UiAutomation> {
  const response = await fetch(`/codex-api/automations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(body, 'Failed to update automation'))
  }
  const record = asRecord(asRecord(body)?.data)
  const normalized = normalizeUiAutomation(record)
  if (!normalized) throw new Error('Failed to update automation')
  return normalized
}

export async function deleteAutomation(id: string): Promise<void> {
  const response = await fetch(`/codex-api/automations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  const body = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(body, 'Failed to delete automation'))
  }
}

export async function setAutomationEnabled(id: string, enabled: boolean): Promise<UiAutomation> {
  const response = await fetch(`/codex-api/automations/${encodeURIComponent(id)}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  })
  const body = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(body, 'Failed to toggle automation'))
  }
  const record = asRecord(asRecord(body)?.data)
  const normalized = normalizeUiAutomation(record)
  if (!normalized) throw new Error('Failed to toggle automation')
  return normalized
}

export async function runAutomationNow(id: string): Promise<void> {
  const response = await fetch(`/codex-api/automations/${encodeURIComponent(id)}/run`, {
    method: 'POST',
  })
  const body = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(body, 'Failed to run automation'))
  }
}

export async function markAutomationRunRead(id: string): Promise<UiAutomationRun> {
  const response = await fetch(`/codex-api/automations/runs/${encodeURIComponent(id)}/read`, {
    method: 'POST',
  })
  const body = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(body, 'Failed to update triage item'))
  }
  const record = asRecord(asRecord(body)?.data)
  const normalized = normalizeUiAutomationRun(record)
  if (!normalized) throw new Error('Failed to update triage item')
  return normalized
}

export async function setAutomationRunArchived(id: string, archived: boolean): Promise<UiAutomationRun> {
  const response = await fetch(`/codex-api/automations/runs/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archived }),
  })
  const body = (await response.json()) as unknown
  if (!response.ok) {
    throw new Error(getErrorMessageFromPayload(body, 'Failed to update triage archive state'))
  }
  const record = asRecord(asRecord(body)?.data)
  const normalized = normalizeUiAutomationRun(record)
  if (!normalized) throw new Error('Failed to update triage archive state')
  return normalized
}

export async function getThreadTitleCache(): Promise<ThreadTitleCache> {
  try {
    const response = await fetch('/codex-api/thread-titles')
    if (!response.ok) return { titles: {}, order: [] }
    const envelope = (await response.json()) as { data?: ThreadTitleCache }
    return envelope.data ?? { titles: {}, order: [] }
  } catch {
    return { titles: {}, order: [] }
  }
}

export async function persistThreadTitle(id: string, title: string): Promise<void> {
  try {
    await fetch('/codex-api/thread-titles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title }),
    })
  } catch {
    // Best-effort persist
  }
}

export async function generateThreadTitle(prompt: string, cwd: string | null): Promise<string> {
  try {
    const result = await callRpc<{ title?: string }>('generate-thread-title', { prompt, cwd })
    return result.title?.trim() ?? ''
  } catch {
    return ''
  }
}

export type SkillInfo = {
  name: string
  description: string
  path: string
  scope: string
  projectName?: string
  enabled: boolean
}

export type UiPluginSummary = {
  id: string
  name: string
  marketplaceName: string
  marketplacePath: string
  installed: boolean
  enabled: boolean
  installPolicy: string
  authPolicy: string
  displayName: string
  shortDescription: string
  longDescription: string
  developerName: string
  category: string
  capabilities: string[]
  websiteUrl: string
  privacyPolicyUrl: string
  termsOfServiceUrl: string
  brandColor: string
  defaultPrompt: string[]
}

export type UiPluginMarketplace = {
  name: string
  displayName: string
  path: string
  plugins: UiPluginSummary[]
}

export type UiPluginDetailSkill = {
  name: string
  displayName: string
  description: string
  shortDescription: string
  path: string
  enabled: boolean
}

export type UiPluginApp = {
  id: string
  name: string
  description: string
  installUrl: string
  needsAuth: boolean
}

export type UiPluginDetail = {
  marketplaceName: string
  marketplacePath: string
  summary: UiPluginSummary
  description: string
  skills: UiPluginDetailSkill[]
  apps: UiPluginApp[]
  mcpServers: string[]
}

export type UiPluginInstallResult = {
  authPolicy: string
  appsNeedingAuth: UiPluginApp[]
}

export type UiAppInfo = {
  id: string
  name: string
  description: string
  installUrl: string
  logoUrl: string
  logoUrlDark: string
  distributionChannel: string
  isAccessible: boolean
  isEnabled: boolean
  categories: string[]
  labels: Record<string, string>
  pluginDisplayNames: string[]
}

function normalizeAppList(value: unknown): UiAppInfo[] {
  const record = asRecord(value)
  const rows = Array.isArray(record?.data) ? record.data : []
  return rows.flatMap((row) => {
    const app = asRecord(row)
    if (!app) return []
    const id = readString(app.id)
    const name = readString(app.name)
    if (!id || !name) return []
    const metadata = asRecord(app.appMetadata)
    const labelsRecord = asRecord(app.labels)
    const labels: Record<string, string> = {}
    if (labelsRecord) {
      for (const [key, value] of Object.entries(labelsRecord)) {
        const normalized = readString(value)
        if (normalized) labels[key] = normalized
      }
    }
    return [{
      id,
      name,
      description: readString(app.description) ?? '',
      installUrl: readString(app.installUrl) ?? '',
      logoUrl: readString(app.logoUrl) ?? '',
      logoUrlDark: readString(app.logoUrlDark) ?? '',
      distributionChannel: readString(app.distributionChannel) ?? '',
      isAccessible: readBoolean(app.isAccessible) ?? false,
      isEnabled: readBoolean(app.isEnabled) ?? false,
      categories: readStringArray(metadata?.categories),
      labels,
      pluginDisplayNames: readStringArray(app.pluginDisplayNames),
    }]
  })
}

export type UiMcpToolInfo = {
  name: string
  description: string
}

export type UiMcpServerStatus = {
  name: string
  authStatus: string
  tools: UiMcpToolInfo[]
  resourceCount: number
  resourceTemplateCount: number
}

type SkillsListResponseEntry = {
  cwd: string
  skills: Array<{
    name: string
    description: string
    shortDescription?: string
    path: string
    scope: string
    enabled: boolean
  }>
  errors: unknown[]
}

function getProjectNameFromCwd(cwd: string): string {
  const parts = cwd.split(/[\\/]/).filter(Boolean)
  return parts.at(-1) ?? cwd
}

export async function getSkillsList(cwds?: string[]): Promise<SkillInfo[]> {
  try {
    const params: Record<string, unknown> = {}
    if (cwds && cwds.length > 0) params.cwds = cwds
    const payload = await callRpc<{ data: SkillsListResponseEntry[] }>('skills/list', params)
    const skills: SkillInfo[] = []
    const seen = new Set<string>()
    for (const entry of payload.data) {
      const projectName = entry.cwd ? getProjectNameFromCwd(entry.cwd) : ''
      for (const skill of entry.skills) {
        if (!skill.name || seen.has(skill.path)) continue
        seen.add(skill.path)
        skills.push({
          name: skill.name,
          description: skill.shortDescription || skill.description || '',
          path: skill.path,
          scope: skill.scope,
          projectName: skill.scope === 'repo' && projectName ? projectName : undefined,
          enabled: skill.enabled,
        })
      }
    }
    return skills
  } catch {
    return []
  }
}

function normalizePluginSummary(
  marketplaceName: string,
  marketplacePath: string,
  value: unknown,
): UiPluginSummary | null {
  const record = asRecord(value)
  if (!record) return null

  const id = readString(record.id)
  const name = readString(record.name)
  if (!id || !name) return null

  const pluginInterface = asRecord(record.interface)

  return {
    id,
    name,
    marketplaceName,
    marketplacePath,
    installed: readBoolean(record.installed) ?? false,
    enabled: readBoolean(record.enabled) ?? false,
    installPolicy: readString(record.installPolicy) ?? '',
    authPolicy: readString(record.authPolicy) ?? '',
    displayName: readString(pluginInterface?.displayName) ?? name,
    shortDescription: readString(pluginInterface?.shortDescription) ?? '',
    longDescription: readString(pluginInterface?.longDescription) ?? '',
    developerName: readString(pluginInterface?.developerName) ?? '',
    category: readString(pluginInterface?.category) ?? '',
    capabilities: readStringArray(pluginInterface?.capabilities),
    websiteUrl: readString(pluginInterface?.websiteUrl) ?? '',
    privacyPolicyUrl: readString(pluginInterface?.privacyPolicyUrl) ?? '',
    termsOfServiceUrl: readString(pluginInterface?.termsOfServiceUrl) ?? '',
    brandColor: readString(pluginInterface?.brandColor) ?? '',
    defaultPrompt: readStringArray(pluginInterface?.defaultPrompt),
  }
}

export async function listPlugins(cwds?: string[], forceRemoteSync = false): Promise<UiPluginMarketplace[]> {
  try {
    const params: Record<string, unknown> = {}
    if (cwds && cwds.length > 0) params.cwds = cwds
    if (forceRemoteSync) params.forceRemoteSync = true
    const payload = await callRpc<unknown>('plugin/list', params)
    const record = asRecord(payload)
    const rows = Array.isArray(record?.marketplaces) ? record.marketplaces : []
    const marketplaces: UiPluginMarketplace[] = []

    for (const row of rows) {
      const marketplace = asRecord(row)
      if (!marketplace) continue
      const name = readString(marketplace.name)
      const path = readString(marketplace.path)
      if (!name || !path) continue
      const marketplaceInterface = asRecord(marketplace.interface)
      const plugins = Array.isArray(marketplace.plugins) ? marketplace.plugins : []
      marketplaces.push({
        name,
        displayName: readString(marketplaceInterface?.displayName) ?? name,
        path,
        plugins: plugins
          .map((plugin) => normalizePluginSummary(name, path, plugin))
          .filter((plugin): plugin is UiPluginSummary => plugin !== null),
      })
    }

    return marketplaces
  } catch {
    return []
  }
}

function normalizePluginApp(value: unknown): UiPluginApp | null {
  const record = asRecord(value)
  if (!record) return null
  const id = readString(record.id)
  const name = readString(record.name)
  if (!id || !name) return null
  return {
    id,
    name,
    description: readString(record.description) ?? '',
    installUrl: readString(record.installUrl) ?? '',
    needsAuth: readBoolean(record.needsAuth) ?? false,
  }
}

export async function readPluginDetail(marketplacePath: string, pluginName: string): Promise<UiPluginDetail | null> {
  try {
    const payload = await callRpc<unknown>('plugin/read', { marketplacePath, pluginName })
    const record = asRecord(payload)
    const plugin = asRecord(record?.plugin)
    if (!plugin) return null

    const normalizedMarketplacePath = readString(plugin.marketplacePath)
    const marketplaceName = readString(plugin.marketplaceName)
    const summary = normalizePluginSummary(
      marketplaceName ?? '',
      normalizedMarketplacePath ?? '',
      plugin.summary,
    )
    if (!summary || !marketplaceName || !normalizedMarketplacePath) return null

    const skills = Array.isArray(plugin.skills) ? plugin.skills : []
    const apps = Array.isArray(plugin.apps) ? plugin.apps : []

    return {
      marketplaceName,
      marketplacePath: normalizedMarketplacePath,
      summary,
      description: readString(plugin.description) ?? '',
      skills: skills.flatMap((skill) => {
        const record = asRecord(skill)
        if (!record) return []
        const name = readString(record.name)
        if (!name) return []
        const skillInterface = asRecord(record.interface)
        return [{
          name,
          displayName: readString(skillInterface?.displayName) ?? name,
          description: readString(record.description) ?? '',
          shortDescription: readString(skillInterface?.shortDescription) ?? '',
          path: readString(record.path) ?? '',
          enabled: readBoolean(record.enabled) ?? false,
        }]
      }),
      apps: apps
        .map((app) => normalizePluginApp(app))
        .filter((app): app is UiPluginApp => app !== null),
      mcpServers: readStringArray(plugin.mcpServers),
    }
  } catch {
    return null
  }
}

export async function installPlugin(marketplacePath: string, pluginName: string): Promise<UiPluginInstallResult | null> {
  try {
    const payload = await callRpc<unknown>('plugin/install', { marketplacePath, pluginName })
    const record = asRecord(payload)
    return {
      authPolicy: readString(record?.authPolicy) ?? '',
      appsNeedingAuth: (Array.isArray(record?.appsNeedingAuth) ? record?.appsNeedingAuth : [])
        .map((app) => normalizePluginApp(app))
        .filter((app): app is UiPluginApp => app !== null),
    }
  } catch {
    return null
  }
}

export async function uninstallPlugin(pluginId: string): Promise<boolean> {
  try {
    await callRpc('plugin/uninstall', { pluginId })
    return true
  } catch {
    return false
  }
}

export async function listApps(params: { threadId?: string; forceRefetch?: boolean; limit?: number } = {}): Promise<UiAppInfo[]> {
  try {
    const payload = await callRpc<unknown>('app/list', params)
    return normalizeAppList(payload)
  } catch {
    return []
  }
}

export function normalizeAppListNotification(payload: unknown): UiAppInfo[] {
  return normalizeAppList(payload)
}

export async function listMcpServers(limit = 100): Promise<UiMcpServerStatus[]> {
  try {
    const payload = await callRpc<unknown>('mcpServerStatus/list', { limit, detail: 'full' })
    const record = asRecord(payload)
    const rows = Array.isArray(record?.data) ? record.data : []
    return rows.flatMap((row) => {
      const server = asRecord(row)
      if (!server) return []
      const name = readString(server.name)
      if (!name) return []
      const toolsRecord = asRecord(server.tools)
      const tools: UiMcpToolInfo[] = []
      if (toolsRecord) {
        for (const [toolName, value] of Object.entries(toolsRecord)) {
          const tool = asRecord(value)
          tools.push({
            name: toolName,
            description: readString(tool?.description) ?? '',
          })
        }
      }
      return [{
        name,
        authStatus: readString(server.authStatus) ?? 'unsupported',
        tools,
        resourceCount: Array.isArray(server.resources) ? server.resources.length : 0,
        resourceTemplateCount: Array.isArray(server.resourceTemplates) ? server.resourceTemplates.length : 0,
      }]
    })
  } catch {
    return []
  }
}

export async function startMcpOauthLogin(serverName: string): Promise<string | null> {
  try {
    const payload = await callRpc<unknown>('mcpServer/oauth/login', { name: serverName })
    const record = asRecord(payload)
    return readString(record?.authorizationUrl) ?? null
  } catch {
    return null
  }
}

export async function reloadMcpServers(): Promise<boolean> {
  try {
    await callRpc('config/mcpServer/reload', {})
    return true
  } catch {
    return false
  }
}

export async function uploadFile(file: File): Promise<string | null> {
  try {
    const form = new FormData()
    form.append('file', file)
    const resp = await fetch('/codex-api/upload-file', { method: 'POST', body: form })
    if (!resp.ok) return null
    const data = (await resp.json()) as { path?: string }
    return data.path ?? null
  } catch {
    return null
  }
}
