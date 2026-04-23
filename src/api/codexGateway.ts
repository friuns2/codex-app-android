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
  GetAccountRateLimitsResponse,
  ModelListResponse,
  ReasoningEffort,
  ThreadForkResponse,
  ThreadListResponse,
  ThreadReadResponse,
  ThreadResumeResponse,
  ThreadStartResponse,
  Turn,
} from './appServerDtos'
import { extractErrorMessage, normalizeCodexApiError } from './codexErrors'
import {
  readActiveTurnIdFromResponse,
  normalizeThreadGroupsV2,
  normalizeThreadMessagesV2,
  readThreadInProgressFromResponse,
} from './normalizers/v2'
import type {
  SpeedMode,
  UiAccountEntry,
  UiAccountQuotaStatus,
  UiAccountUnavailableReason,
  CollaborationModeKind,
  CollaborationModeOption,
  UiCreditsSnapshot,
  UiFileChange,
  UiMessage,
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
  UiThreadAutomation,
  UiThreadAutomationStatus,
} from '../types/codex'
import { normalizePathForUi } from '../pathUtils.js'

type CurrentModelConfig = {
  model: string
  providerId: string
  reasoningEffort: ReasoningEffort | ''
  speedMode: SpeedMode
}

export type DirectoryPluginSummary = {
  id: string
  name: string
  displayName: string
  description: string
  longDescription: string
  developerName: string
  category: string
  marketplaceName: string
  marketplaceDisplayName: string
  marketplacePath: string | null
  remoteMarketplaceName: string | null
  sourceType: string
  sourceUrl: string
  installed: boolean
  enabled: boolean
  installPolicy: string
  authPolicy: string
  logoUrl: string
  logoPath: string
  composerIconUrl: string
  composerIconPath: string
  brandColor: string
  capabilities: string[]
  defaultPrompt: string[]
  screenshotUrls: string[]
  screenshots: string[]
  websiteUrl: string
  privacyPolicyUrl: string
  termsOfServiceUrl: string
}

export type DirectoryPluginDetail = {
  summary: DirectoryPluginSummary
  description: string
  apps: DirectoryPluginAppSummary[]
  skills: DirectoryPluginSkillSummary[]
  mcpServers: string[]
}

export type DirectoryPluginAppSummary = {
  id: string
  name: string
  description: string
  installUrl: string
  needsAuth: boolean
}

export type DirectoryPluginSkillSummary = {
  name: string
  description: string
  path: string
  enabled: boolean
  displayName: string
  shortDescription: string
}

export type DirectoryPluginInstallResult = {
  authPolicy: string
  appsNeedingAuth: DirectoryPluginAppSummary[]
}

export type DirectoryAppInfo = {
  id: string
  name: string
  description: string
  logoUrl: string
  logoUrlDark: string
  distributionChannel: string
  installUrl: string
  isAccessible: boolean
  isEnabled: boolean
  pluginDisplayNames: string[]
  category: string
  developer: string
  website: string
  privacyPolicy: string
  termsOfService: string
  catalogRank: number
}

export type DirectoryMcpServerStatus = {
  name: string
  authStatus: string
  tools: Array<{ name: string; title: string; description: string }>
  resources: Array<{ name: string; title: string; uri: string; description: string }>
  resourceTemplates: Array<{ name: string; title: string; uriTemplate: string; description: string }>
}

export type DirectoryMcpLoginResult = {
  authorizationUrl: string
}

type ProviderModelsResponse = {
  data?: unknown
}

const PROVIDER_MODELS_FETCH_TIMEOUT_MS = 5_000

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

export type ComposerFileSuggestion = {
  path: string
}

const DEFAULT_COLLABORATION_MODE_OPTIONS: CollaborationModeOption[] = [
  { value: 'default', label: 'Default' },
  { value: 'plan', label: 'Plan' },
]

export type WorktreeCreateResult = {
  cwd: string
  branch: string | null
  gitRoot: string
}

export type WorktreeBranchOption = {
  value: string
  label: string
}

export type GitBranchState = {
  currentBranch: string | null
  options: WorktreeBranchOption[]
}



export type ThreadSearchResult = {
  threadIds: string[]
  indexedThreadCount: number
}

export type TelegramStatus = {
  configured: boolean
  active: boolean
  mappedChats: number
  mappedThreads: number
  allowedUsers: number
  allowAllUsers: boolean
  lastError: string
}

export type TelegramConfig = {
  botToken: string
  allowedUserIds: Array<number | '*'>
}

export type GithubTrendingProject = {
  id: number
  fullName: string
  owner: string
  repo: string
  url: string
  description: string
  language: string
  stars: number
}

export type GithubTipsScope =
  | 'search-daily'
  | 'search-weekly'
  | 'search-monthly'
  | 'trending-daily'
  | 'trending-weekly'
  | 'trending-monthly'

export type LocalDirectoryEntry = {
  name: string
  path: string
}

export type LocalDirectoryListing = {
  path: string
  parentPath: string
  entries: LocalDirectoryEntry[]
}

export type ThreadTerminalSession = {
  id: string
  threadId: string
  cwd: string
  shell: string
  buffer: string
  truncated: boolean
}

export type ThreadTerminalAttachInput = {
  threadId: string
  cwd: string
  sessionId?: string
  cols?: number
  rows?: number
  newSession?: boolean
}

function normalizeGithubProjectDescription(fullName: string, rawDescription: string): string {
  const description = rawDescription.trim()
  if (!description) return ''
  const escapedName = fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const [owner = '', repo = ''] = fullName.split('/', 2)
  const escapedOwner = owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedRepo = repo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const ownerRepoSpaced = owner && repo
    ? `${escapedOwner}\\s*/\\s*${escapedRepo}`
    : escapedName
  return description
    .replace(/^[★☆*\s:|\-]+/u, '')
    .replace(/^(sponsor|star)\s+/i, '')
    .replace(new RegExp(`^${escapedName}\\s*[-:|]*\\s*`, 'i'), '')
    .replace(new RegExp(`^${ownerRepoSpaced}\\s*[-:|]*\\s*`, 'i'), '')
    .replace(/^(sponsor|star)\s+/i, '')
    .trim()
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
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : []
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

  const windowValue = readNumber(record.windowDurationMins ?? record.window_minutes)
  return {
    usedPercent,
    windowDurationMins: windowValue,
    windowMinutes: windowValue,
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

  const localTurnIndexByTurnId = new Map<string, number>()
  const coveredTurnIds = new Set<string>()

  for (const message of messages) {
    const tid = typeof message.turnId === 'string' && message.turnId.length > 0 ? message.turnId : undefined
    const tIdx = typeof message.turnIndex === 'number' ? message.turnIndex : undefined
    if (tid && tIdx !== undefined) localTurnIndexByTurnId.set(tid, tIdx)

    const hasFileData =
      message.messageType === 'fileChange' ||
      (Array.isArray(message.fileChanges) && message.fileChanges.length > 0)
    if (hasFileData && tid) coveredTurnIds.add(tid)
  }

  const extraMessages = fallbackEntries
    .filter((entry) => localTurnIndexByTurnId.has(entry.turnId) && !coveredTurnIds.has(entry.turnId))
    .map<UiMessage>((entry) => ({
      id: `session-file-change:${entry.turnId}`,
      role: 'system',
      text: '',
      messageType: 'fileChange',
      fileChangeStatus: 'completed',
      fileChanges: entry.fileChanges,
      turnId: entry.turnId,
      turnIndex: localTurnIndexByTurnId.get(entry.turnId) ?? entry.turnIndex,
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

function normalizeSpeedMode(value: unknown): SpeedMode {
  return typeof value === 'string' && value.trim().toLowerCase() === 'fast'
    ? 'fast'
    : 'standard'
}

const INITIAL_THREAD_LIST_LIMIT = 50
const BACKGROUND_THREAD_LIST_LIMIT = 100

export type ThreadGroupsPage = {
  groups: UiProjectGroup[]
  nextCursor: string | null
}

async function getThreadGroupsPageV2(cursor: string | null, limit: number): Promise<ThreadGroupsPage> {
  const payload = await callRpc<ThreadListResponse>('thread/list', {
    archived: false,
    limit,
    sortKey: 'updated_at',
    modelProviders: [],
    cursor,
  })
  return {
    groups: normalizeThreadGroupsV2(payload),
    nextCursor: typeof payload.nextCursor === 'string' && payload.nextCursor.length > 0
      ? payload.nextCursor
      : null,
  }
}

async function getThreadMessagesV2(threadId: string): Promise<UiMessage[]> {
  const payload = await callRpc<ThreadReadResponse>('thread/read', {
    threadId,
    includeTurns: true,
  })
  return normalizeThreadMessagesV2(payload)
}

async function getThreadDetailV2(threadId: string): Promise<{
  messages: UiMessage[]
  inProgress: boolean
  activeTurnId: string
  turnIndexByTurnId: ThreadTurnIndexById
}> {
  const payload = await callRpc<ThreadReadResponse>('thread/read', {
    threadId,
    includeTurns: true,
  })
  const normalized = normalizeThreadMessagesV2(payload)
  return {
    messages: normalized,
    inProgress: readThreadInProgressFromResponse(payload),
    activeTurnId: readActiveTurnIdFromResponse(payload),
    turnIndexByTurnId: buildTurnIndexByTurnId(payload),
  }
}

export async function getThreadGroups(): Promise<UiProjectGroup[]> {
  try {
    return (await getThreadGroupsPageV2(null, INITIAL_THREAD_LIST_LIMIT)).groups
  } catch (error) {
    throw normalizeCodexApiError(error, 'Failed to load thread groups', 'thread/list')
  }
}

export async function getThreadGroupsPage(
  cursor: string | null = null,
  limit = INITIAL_THREAD_LIST_LIMIT,
): Promise<ThreadGroupsPage> {
  try {
    return await getThreadGroupsPageV2(cursor, limit)
  } catch (error) {
    throw normalizeCodexApiError(error, 'Failed to load thread groups', 'thread/list')
  }
}

export function getBackgroundThreadListLimit(): number {
  return BACKGROUND_THREAD_LIST_LIMIT
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
  activeTurnId: string
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

function asAutomation(record: unknown): UiThreadAutomation | null {
  const row = asRecord(record)
  if (!row) return null
  const id = readString(row.id)
  const kind = readString(row.kind)
  const name = readString(row.name)
  const prompt = readString(row.prompt)
  const rrule = readString(row.rrule)
  const status = readString(row.status)
  if (!id || !name || !prompt || !rrule) return null
  if (kind !== 'heartbeat' && kind !== 'cron') return null
  if (status !== 'ACTIVE' && status !== 'PAUSED') return null
  return {
    id,
    kind,
    name,
    prompt,
    rrule,
    status,
    targetThreadId: readString(row.targetThreadId),
    createdAtMs: readNumber(row.createdAtMs),
    updatedAtMs: readNumber(row.updatedAtMs),
    nextRunAtMs: readNumber(row.nextRunAtMs),
  }
}

export async function getThreadAutomationMap(): Promise<Record<string, UiThreadAutomation>> {
  const response = await fetch('/codex-api/thread-automations')
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, 'Failed to load thread automations'))
  }
  const data = asRecord(asRecord(payload)?.data)
  const next: Record<string, UiThreadAutomation> = {}
  if (!data) return next
  for (const [threadId, value] of Object.entries(data)) {
    const automation = asAutomation(value)
    if (automation) next[threadId] = automation
  }
  return next
}

export async function getThreadAutomation(threadId: string): Promise<UiThreadAutomation | null> {
  const response = await fetch(`/codex-api/thread-automation?threadId=${encodeURIComponent(threadId)}`)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, 'Failed to load thread automation'))
  }
  return asAutomation(asRecord(payload)?.data)
}

export async function upsertThreadAutomation(input: {
  threadId: string
  name: string
  prompt: string
  rrule: string
  status: UiThreadAutomationStatus
}): Promise<UiThreadAutomation> {
  const response = await fetch('/codex-api/thread-automation', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, 'Failed to save thread automation'))
  }
  const automation = asAutomation(asRecord(payload)?.data)
  if (!automation) throw new Error('Thread automation response was malformed')
  return automation
}

export async function deleteThreadAutomation(threadId: string): Promise<void> {
  const response = await fetch(`/codex-api/thread-automation?threadId=${encodeURIComponent(threadId)}`, {
    method: 'DELETE',
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, 'Failed to delete thread automation'))
  }
}

export function subscribeCodexNotifications(onNotification: (value: RpcNotification) => void): () => void {
  return subscribeRpcNotifications(onNotification)
}

export type { RpcNotification }

function normalizeThreadTerminalSession(value: unknown): ThreadTerminalSession | null {
  const record = asRecord(value)
  if (!record) return null
  const id = readString(record.id)
  const threadId = readString(record.threadId)
  const cwd = readString(record.cwd)
  const shell = readString(record.shell)
  if (!id || !threadId || !cwd || !shell) return null
  return {
    id,
    threadId,
    cwd,
    shell,
    buffer: typeof record.buffer === 'string' ? record.buffer : '',
    truncated: readBoolean(record.truncated) ?? false,
  }
}

async function fetchTerminalJson(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(path, init)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, `Terminal request failed with HTTP ${response.status}`))
  }
  return payload
}

export async function attachThreadTerminal(input: ThreadTerminalAttachInput): Promise<ThreadTerminalSession> {
  const payload = await fetchTerminalJson('/codex-api/thread-terminal/attach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const session = normalizeThreadTerminalSession(asRecord(payload)?.session)
  if (!session) throw new Error('Terminal attach response was malformed')
  return session
}

export async function sendThreadTerminalInput(sessionId: string, data: string): Promise<void> {
  await fetchTerminalJson('/codex-api/thread-terminal/input', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, data }),
  })
}

export async function resizeThreadTerminal(sessionId: string, cols: number, rows: number): Promise<void> {
  await fetchTerminalJson('/codex-api/thread-terminal/resize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, cols, rows }),
  })
}

export async function closeThreadTerminal(sessionId: string): Promise<void> {
  await fetchTerminalJson('/codex-api/thread-terminal/close', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  })
}

export async function getThreadTerminalSnapshot(threadId: string): Promise<ThreadTerminalSession | null> {
  const payload = await fetchTerminalJson(`/codex-api/thread-terminal-snapshot?threadId=${encodeURIComponent(threadId)}`)
  return normalizeThreadTerminalSession(asRecord(payload)?.session)
}

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

export type ResumedThread = {
  model: string
  messages: UiMessage[]
  inProgress: boolean
  activeTurnId: string
  turnIndexByTurnId: ThreadTurnIndexById
}

export async function resumeThread(threadId: string): Promise<ResumedThread> {
  const payload = await callRpc<ThreadResumeResponse>('thread/resume', { threadId })
  return {
    model: normalizeThreadModelFromPayload(payload),
    messages: normalizeThreadMessagesV2(payload),
    inProgress: readThreadInProgressFromResponse(payload),
    activeTurnId: readActiveTurnIdFromResponse(payload),
    turnIndexByTurnId: buildTurnIndexByTurnId(payload),
  }
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

export async function revertThreadFileChanges(threadId: string, turnId: string, cwd: string): Promise<{ reverted: number; errors: string[] }> {
  try {
    const response = await fetch('/codex-api/thread/rollback-files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, turnId, cwd }),
    })
    if (!response.ok) return { reverted: 0, errors: ['Server error'] }
    return (await response.json()) as { reverted: number; errors: string[] }
  } catch {
    return { reverted: 0, errors: ['Network error'] }
  }
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

function normalizeThreadModelFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const model = (payload as Record<string, unknown>).model
  return typeof model === 'string' ? model.trim() : ''
}

export type StartedThread = {
  threadId: string
  model: string
}

export type ForkedThread = {
  threadId: string
  cwd: string
  model: string
  messages: UiMessage[]
}

export async function startThread(cwd?: string, model?: string): Promise<StartedThread> {
  try {
    const params: Record<string, unknown> = {}
    if (typeof cwd === 'string' && cwd.trim().length > 0) {
      params.cwd = cwd.trim()
    }
    if (typeof model === 'string' && model.trim().length > 0) {
      params.model = model.trim()
    }
    const payload = await callRpc<ThreadStartResponse>('thread/start', params)
    const threadId = normalizeThreadIdFromPayload(payload)
    if (!threadId) {
      throw new Error('thread/start did not return a thread id')
    }
    return {
      threadId,
      model: normalizeThreadModelFromPayload(payload),
    }
  } catch (error) {
    throw normalizeCodexApiError(error, 'Failed to start a new thread', 'thread/start')
  }
}

export async function forkThread(threadId: string): Promise<ForkedThread>
export async function forkThread(threadId: string, cwd: string | undefined, model: string | undefined): Promise<StartedThread>
export async function forkThread(
  threadId: string,
  cwd?: string,
  model?: string,
): Promise<StartedThread | ForkedThread> {
  if (arguments.length <= 1) {
    try {
      const payload = await callRpc<ThreadForkResponse & ThreadReadResponse & { thread?: { id?: string; cwd?: string } }>('thread/fork', {
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
        model: normalizeThreadModelFromPayload(payload),
        messages: normalizeThreadMessagesV2(payload),
      }
    } catch (error) {
      throw normalizeCodexApiError(error, `Failed to fork thread ${threadId}`, 'thread/fork')
    }
  }

  try {
    const normalizedThreadId = threadId.trim()
    if (!normalizedThreadId) {
      throw new Error('thread/fork requires threadId')
    }
    const params: Record<string, unknown> = {
      threadId: normalizedThreadId,
    }
    if (typeof cwd === 'string' && cwd.trim().length > 0) {
      params.cwd = cwd.trim()
    }
    if (typeof model === 'string' && model.trim().length > 0) {
      params.model = model.trim()
    }
    const payload = await callRpc<ThreadForkResponse>('thread/fork', params)
    const nextThreadId = normalizeThreadIdFromPayload(payload)
    if (!nextThreadId) {
      throw new Error('thread/fork did not return a thread id')
    }
    return {
      threadId: nextThreadId,
      model: normalizeThreadModelFromPayload(payload),
    }
  } catch (error) {
    throw normalizeCodexApiError(error, `Failed to fork thread ${threadId}`, 'thread/fork')
  }
}

export type FileAttachmentParam = { label: string; path: string; fsPath: string }

function extractLocalImagePathFromUrl(value: string): string | null {
  if (!value) return null
  try {
    const parsed = new URL(value, 'http://localhost')
    if (parsed.pathname !== '/codex-local-image') return null
    const path = parsed.searchParams.get('path')?.trim() ?? ''
    return path.length > 0 ? path : null
  } catch {
    return null
  }
}

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

function fileNameFromPath(pathValue: string): string {
  const normalized = pathValue.replace(/\\/g, '/')
  const segments = normalized.split('/').filter(Boolean)
  return segments.at(-1) ?? normalized
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
  fileAttachments: FileAttachmentParam[] = [],
  collaborationMode?: CollaborationModeKind,
): Promise<string> {
  try {
    const normalizedModel = model?.trim() ?? ''
    const localImageAttachments: FileAttachmentParam[] = []
    for (const imageUrl of imageUrls) {
      const localImagePath = extractLocalImagePathFromUrl(imageUrl.trim())
      if (!localImagePath) continue
      localImageAttachments.push({
        label: fileNameFromPath(localImagePath),
        path: localImagePath,
        fsPath: localImagePath,
      })
    }
    const allFileAttachments = [...fileAttachments, ...localImageAttachments]
    const dedupedFileAttachments = allFileAttachments.filter((entry, index) =>
      allFileAttachments.findIndex((candidate) => candidate.fsPath === entry.fsPath) === index)
    const finalText = buildTextWithAttachments(text, dedupedFileAttachments)
    const input: Array<Record<string, unknown>> = [{ type: 'text', text: finalText }]
    for (const imageUrl of imageUrls) {
      const normalizedUrl = imageUrl.trim()
      if (!normalizedUrl) continue
      const localImagePath = extractLocalImagePathFromUrl(normalizedUrl)
      if (localImagePath) {
        input.push({
          type: 'localImage',
          path: localImagePath,
        })
        continue
      }
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
    const attachments = dedupedFileAttachments.map((f) => ({ label: f.label, path: f.path, fsPath: f.fsPath }))
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
    if (collaborationMode && collaborationMode !== 'default') {
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
    const payload = await callRpc<{ turn?: Turn }>('turn/start', params)
    return typeof payload?.turn?.id === 'string' ? payload.turn.id.trim() : ''
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

export async function setCodexSpeedMode(mode: SpeedMode): Promise<void> {
  const normalizedMode: SpeedMode = mode === 'fast' ? 'fast' : 'standard'
  await callRpc('config/batchWrite', {
    edits: [
      {
        keyPath: 'features.fast_mode',
        value: true,
        mergeStrategy: 'upsert',
      },
      {
        keyPath: 'service_tier',
        value: normalizedMode === 'fast' ? 'fast' : null,
        mergeStrategy: normalizedMode === 'fast' ? 'upsert' : 'replace',
      },
    ],
    filePath: null,
    expectedVersion: null,
  })
}

export interface FreeModeStatus {
  enabled: boolean
  keyCount: number
  models: string[]
  currentModel: string | null
  customKey: boolean
  maskedKey: string | null
  provider?: 'openrouter' | 'custom' | 'opencode-zen'
  customBaseUrl?: string
  wireApi?: 'responses' | 'chat' | null
}

export async function getFreeModeStatus(): Promise<FreeModeStatus> {
  const response = await fetch('/codex-api/free-mode/status')
  return await response.json() as FreeModeStatus
}

export async function setFreeMode(enable: boolean): Promise<{ ok: boolean; enabled: boolean; model?: string; models?: string[] }> {
  const response = await fetch('/codex-api/free-mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enable }),
  })
  return await response.json() as { ok: boolean; enabled: boolean; model?: string; models?: string[] }
}

export async function setFreeModeCustomKey(key: string): Promise<{ ok: boolean; customKey: boolean }> {
  const response = await fetch('/codex-api/free-mode/custom-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  })
  return await response.json() as { ok: boolean; customKey: boolean }
}

export async function setCustomProvider(
  baseUrl: string,
  apiKey: string,
  options?: { wireApi?: 'responses' | 'chat'; provider?: 'custom' | 'opencode-zen' | 'openrouter' },
): Promise<{ ok: boolean }> {
  const response = await fetch('/codex-api/free-mode/custom-provider', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      baseUrl,
      apiKey,
      wireApi: options?.wireApi,
      provider: options?.provider,
    }),
  })
  return await response.json() as { ok: boolean }
}

export async function getAvailableModelIds(options: { includeProviderModels?: boolean } = {}): Promise<string[]> {
  const payload = await callRpc<ModelListResponse>('model/list', {})
  const ids: string[] = []
  for (const row of payload.data) {
    const candidate = row.id || row.model
    if (!candidate || ids.includes(candidate)) continue
    ids.push(candidate)
  }

  if (options.includeProviderModels === false) {
    return ids
  }

  try {
    const response = await fetch('/codex-api/provider-models', {
      signal: AbortSignal.timeout(PROVIDER_MODELS_FETCH_TIMEOUT_MS),
    })
    let providerPayload: (ProviderModelsResponse & { exclusive?: boolean }) | null = null
    try {
      providerPayload = await response.json() as ProviderModelsResponse & { exclusive?: boolean }
    } catch {
      providerPayload = null
    }

    if (response.ok && Array.isArray(providerPayload?.data)) {
      if (providerPayload.exclusive) {
        return providerPayload.data.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      }
      for (const candidate of providerPayload.data) {
        if (typeof candidate !== 'string') continue
        const normalized = candidate.trim()
        if (!normalized || ids.includes(normalized)) continue
        ids.push(normalized)
      }
    }
  } catch {
    // Keep Codex usable when the provider-models endpoint is unavailable.
  }

  return ids
}

export async function getCurrentModelConfig(): Promise<CurrentModelConfig> {
  const payload = await callRpc<ConfigReadResponse>('config/read', {})
  const model = payload.config.model ?? ''
  const providerId = typeof payload.config.model_provider === 'string' ? payload.config.model_provider : ''
  const reasoningEffort = normalizeReasoningEffort(payload.config.model_reasoning_effort)
  const speedMode = normalizeSpeedMode(payload.config.service_tier)
  return { model, providerId, reasoningEffort, speedMode }
}

function normalizeDirectoryPluginApp(value: unknown): DirectoryPluginAppSummary | null {
  const record = asRecord(value)
  if (!record) return null
  const id = readString(record.id)
  const name = readString(record.name)
  if (!id || !name) return null
  return {
    id,
    name,
    description: readString(record.description) ?? '',
    installUrl: readString(record.installUrl ?? record.install_url) ?? '',
    needsAuth: readBoolean(record.needsAuth ?? record.needs_auth) ?? false,
  }
}

function normalizeDirectoryPluginSkill(value: unknown): DirectoryPluginSkillSummary | null {
  const record = asRecord(value)
  if (!record) return null
  const name = readString(record.name)
  const path = readString(record.path)
  if (!name || !path) return null
  const iface = asRecord(record.interface)
  return {
    name,
    path,
    description: readString(record.description) ?? '',
    enabled: readBoolean(record.enabled) ?? true,
    displayName: readString(iface?.displayName ?? iface?.display_name) ?? name,
    shortDescription: readString(record.shortDescription ?? record.short_description) ?? '',
  }
}

function normalizeDirectoryPluginSummary(
  value: unknown,
  marketplace: { name?: string; displayName?: string; path?: string | null } = {},
): DirectoryPluginSummary | null {
  const record = asRecord(value)
  if (!record) return null
  const id = readString(record.id)
  const name = readString(record.name)
  if (!id || !name) return null
  const iface = asRecord(record.interface)
  const source = asRecord(record.source)
  const sourceType = readString(source?.type) ?? ''
  const sourcePath = readString(source?.path)
  const sourceUrl = readString(source?.url) ?? ''
  const remoteMarketplaceName = sourceType === 'remote' ? marketplace.name ?? null : null
  const marketplacePath = marketplace.path ?? (sourceType === 'local' ? sourcePath : null)
  const displayName = readString(iface?.displayName ?? iface?.display_name) ?? name
  const shortDescription = readString(iface?.shortDescription ?? iface?.short_description)
  const longDescription = readString(iface?.longDescription ?? iface?.long_description) ?? ''

  return {
    id,
    name,
    displayName,
    description: shortDescription ?? longDescription,
    longDescription,
    developerName: readString(iface?.developerName ?? iface?.developer_name) ?? '',
    category: readString(iface?.category) ?? '',
    marketplaceName: marketplace.name ?? '',
    marketplaceDisplayName: marketplace.displayName ?? marketplace.name ?? '',
    marketplacePath,
    remoteMarketplaceName,
    sourceType,
    sourceUrl,
    installed: readBoolean(record.installed) ?? false,
    enabled: readBoolean(record.enabled) ?? true,
    installPolicy: readString(record.installPolicy ?? record.install_policy) ?? '',
    authPolicy: readString(record.authPolicy ?? record.auth_policy) ?? '',
    logoUrl: readString(iface?.logoUrl ?? iface?.logo_url) ?? '',
    logoPath: readString(iface?.logo) ?? '',
    composerIconUrl: readString(iface?.composerIconUrl ?? iface?.composer_icon_url) ?? '',
    composerIconPath: readString(iface?.composerIcon ?? iface?.composer_icon) ?? '',
    brandColor: readString(iface?.brandColor ?? iface?.brand_color) ?? '',
    capabilities: readStringArray(iface?.capabilities),
    defaultPrompt: readStringArray(iface?.defaultPrompt ?? iface?.default_prompt),
    screenshotUrls: readStringArray(iface?.screenshotUrls ?? iface?.screenshot_urls),
    screenshots: readStringArray(iface?.screenshots),
    websiteUrl: readString(iface?.websiteUrl ?? iface?.website_url) ?? '',
    privacyPolicyUrl: readString(iface?.privacyPolicyUrl ?? iface?.privacy_policy_url) ?? '',
    termsOfServiceUrl: readString(iface?.termsOfServiceUrl ?? iface?.terms_of_service_url) ?? '',
  }
}

function normalizeDirectoryApp(value: unknown, catalogRank = 0): DirectoryAppInfo | null {
  const record = asRecord(value)
  if (!record) return null
  const id = readString(record.id)
  const name = readString(record.name)
  if (!id || !name) return null
  const branding = asRecord(record.branding)
  const metadata = asRecord(record.appMetadata ?? record.app_metadata)
  return {
    id,
    name,
    description: readString(record.description) ?? readString(metadata?.seoDescription ?? metadata?.seo_description) ?? '',
    logoUrl: readString(record.logoUrl ?? record.logo_url) ?? '',
    logoUrlDark: readString(record.logoUrlDark ?? record.logo_url_dark) ?? '',
    distributionChannel: readString(record.distributionChannel ?? record.distribution_channel) ?? '',
    installUrl: readString(record.installUrl ?? record.install_url) ?? '',
    isAccessible: readBoolean(record.isAccessible ?? record.is_accessible) ?? false,
    isEnabled: readBoolean(record.isEnabled ?? record.is_enabled) ?? true,
    pluginDisplayNames: readStringArray(record.pluginDisplayNames ?? record.plugin_display_names),
    category: readString(branding?.category) ?? '',
    developer: readString(branding?.developer) ?? readString(metadata?.developer) ?? '',
    website: readString(branding?.website) ?? '',
    privacyPolicy: readString(branding?.privacyPolicy ?? branding?.privacy_policy) ?? '',
    termsOfService: readString(branding?.termsOfService ?? branding?.terms_of_service) ?? '',
    catalogRank,
  }
}

function normalizeDirectoryMcpServer(value: unknown): DirectoryMcpServerStatus | null {
  const record = asRecord(value)
  if (!record) return null
  const name = readString(record.name)
  if (!name) return null
  const toolsRecord = asRecord(record.tools) ?? {}
  const tools = Object.entries(toolsRecord).map(([fallbackName, raw]) => {
    const tool = asRecord(raw)
    return {
      name: readString(tool?.name) ?? fallbackName,
      title: readString(tool?.title) ?? '',
      description: readString(tool?.description) ?? '',
    }
  })
  const resources = Array.isArray(record.resources)
    ? record.resources.map((raw) => {
      const resource = asRecord(raw)
      return {
        name: readString(resource?.name) ?? '',
        title: readString(resource?.title) ?? '',
        uri: readString(resource?.uri) ?? '',
        description: readString(resource?.description) ?? '',
      }
    }).filter((resource) => resource.name || resource.uri)
    : []
  const rawResourceTemplates = record.resourceTemplates ?? record.resource_templates
  const resourceTemplates = Array.isArray(rawResourceTemplates)
    ? rawResourceTemplates.map((raw: unknown) => {
      const template = asRecord(raw)
      return {
        name: readString(template?.name) ?? '',
        title: readString(template?.title) ?? '',
        uriTemplate: readString(template?.uriTemplate ?? template?.uri_template) ?? '',
        description: readString(template?.description) ?? '',
      }
    }).filter((template) => template.name || template.uriTemplate)
    : []

  return {
    name,
    authStatus: readString(record.authStatus ?? record.auth_status) ?? 'unsupported',
    tools,
    resources,
    resourceTemplates,
  }
}

export async function listDirectoryPlugins(cwds?: string[]): Promise<DirectoryPluginSummary[]> {
  const params: Record<string, unknown> = {}
  if (cwds && cwds.length > 0) params.cwds = cwds
  const payload = await callRpc<{ marketplaces?: unknown[] }>('plugin/list', params)
  const plugins: DirectoryPluginSummary[] = []
  for (const marketplaceValue of payload.marketplaces ?? []) {
    const marketplace = asRecord(marketplaceValue)
    if (!marketplace) continue
    const iface = asRecord(marketplace.interface)
    const meta = {
      name: readString(marketplace.name) ?? '',
      displayName: readString(iface?.displayName ?? iface?.display_name) ?? '',
      path: readString(marketplace.path),
    }
    const rows = Array.isArray(marketplace.plugins) ? marketplace.plugins : []
    for (const row of rows) {
      const plugin = normalizeDirectoryPluginSummary(row, meta)
      if (plugin) plugins.push(plugin)
    }
  }
  return plugins
}

export async function readDirectoryPlugin(plugin: DirectoryPluginSummary): Promise<DirectoryPluginDetail> {
  const params: Record<string, unknown> = { pluginName: plugin.name }
  if (plugin.marketplacePath) params.marketplacePath = plugin.marketplacePath
  if (plugin.remoteMarketplaceName) params.remoteMarketplaceName = plugin.remoteMarketplaceName
  const payload = await callRpc<{ plugin?: unknown }>('plugin/read', params)
  const detailRecord = asRecord(payload.plugin)
  if (!detailRecord) throw new Error('Plugin detail response is empty')
  const summary = normalizeDirectoryPluginSummary(detailRecord.summary, {
    name: readString(detailRecord.marketplaceName) ?? plugin.marketplaceName,
    displayName: plugin.marketplaceDisplayName,
    path: readString(detailRecord.marketplacePath) ?? plugin.marketplacePath,
  }) ?? plugin
  return {
    summary,
    description: readString(detailRecord.description) ?? summary.longDescription,
    apps: Array.isArray(detailRecord.apps)
      ? detailRecord.apps.map(normalizeDirectoryPluginApp).filter((row): row is DirectoryPluginAppSummary => row !== null)
      : [],
    skills: Array.isArray(detailRecord.skills)
      ? detailRecord.skills.map(normalizeDirectoryPluginSkill).filter((row): row is DirectoryPluginSkillSummary => row !== null)
      : [],
    mcpServers: readStringArray(detailRecord.mcpServers ?? detailRecord.mcp_servers),
  }
}

export async function installDirectoryPlugin(plugin: DirectoryPluginSummary): Promise<DirectoryPluginInstallResult> {
  const params: Record<string, unknown> = { pluginName: plugin.name }
  if (plugin.marketplacePath) params.marketplacePath = plugin.marketplacePath
  if (plugin.remoteMarketplaceName) params.remoteMarketplaceName = plugin.remoteMarketplaceName
  const payload = await callRpc<{ authPolicy?: string; auth_policy?: string; appsNeedingAuth?: unknown[]; apps_needing_auth?: unknown[] }>('plugin/install', params)
  const apps = payload.appsNeedingAuth ?? payload.apps_needing_auth ?? []
  return {
    authPolicy: readString(payload.authPolicy ?? payload.auth_policy) ?? '',
    appsNeedingAuth: apps.map(normalizeDirectoryPluginApp).filter((row): row is DirectoryPluginAppSummary => row !== null),
  }
}

export async function uninstallDirectoryPlugin(pluginId: string): Promise<void> {
  await callRpc('plugin/uninstall', { pluginId })
}

export async function setDirectoryPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
  await callRpc('config/batchWrite', {
    edits: [{ keyPath: `plugins.${pluginId}.enabled`, value: enabled, mergeStrategy: 'upsert' }],
    filePath: null,
    expectedVersion: null,
    reloadUserConfig: true,
  })
}

export async function listDirectoryApps(threadId?: string): Promise<DirectoryAppInfo[]> {
  const apps: DirectoryAppInfo[] = []
  let cursor: string | null = null
  let catalogRank = 0
  do {
    const params: Record<string, unknown> = { limit: 100 }
    if (cursor) params.cursor = cursor
    if (threadId) params.threadId = threadId
    const payload = await callRpc<{ data?: unknown[]; nextCursor?: string | null; next_cursor?: string | null }>('app/list', params)
    for (const item of payload.data ?? []) {
      const app = normalizeDirectoryApp(item, catalogRank)
      if (app) apps.push(app)
      catalogRank += 1
    }
    cursor = readString(payload.nextCursor ?? payload.next_cursor)
  } while (cursor)
  return apps
}

export async function setDirectoryAppEnabled(appId: string, enabled: boolean): Promise<void> {
  await callRpc('config/batchWrite', {
    edits: [{ keyPath: `apps.${appId}.enabled`, value: enabled, mergeStrategy: 'upsert' }],
    filePath: null,
    expectedVersion: null,
    reloadUserConfig: true,
  })
}

export async function listDirectoryMcpServers(): Promise<DirectoryMcpServerStatus[]> {
  const servers: DirectoryMcpServerStatus[] = []
  let cursor: string | null = null
  do {
    const params: Record<string, unknown> = {}
    if (cursor) params.cursor = cursor
    const payload = await callRpc<{ data?: unknown[]; nextCursor?: string | null; next_cursor?: string | null }>('mcpServerStatus/list', params)
    for (const item of payload.data ?? []) {
      const server = normalizeDirectoryMcpServer(item)
      if (server) servers.push(server)
    }
    cursor = readString(payload.nextCursor ?? payload.next_cursor)
  } while (cursor)
  return servers
}

export async function reloadDirectoryMcpServers(): Promise<void> {
  await callRpc('config/mcpServer/reload', {})
}

export async function startDirectoryMcpLogin(name: string): Promise<DirectoryMcpLoginResult> {
  const payload = await callRpc<{ authorizationUrl?: string; authorization_url?: string }>('mcpServer/oauth/login', { name })
  return {
    authorizationUrl: readString(payload.authorizationUrl ?? payload.authorization_url) ?? '',
  }
}

export async function getAccountRateLimitsResponse(): Promise<GetAccountRateLimitsResponse> {
  return await callRpc<GetAccountRateLimitsResponse>('account/rateLimits/read')
}

/** MCP server entry with name and enabled state. */
export type McpServerEntry = { name: string; enabled: boolean }

/** List all configured MCP servers with their enabled state from config. */
export async function listMcpServers(): Promise<McpServerEntry[]> {
  const payload = await callRpc<ConfigReadResponse>('config/read', {})
  const config = payload.config as Record<string, unknown>
  const mcpServers = config.mcp_servers as Record<string, Record<string, unknown>> | undefined
  if (!mcpServers || typeof mcpServers !== 'object') return []
  return Object.entries(mcpServers).map(([name, cfg]) => ({
    name,
    enabled: cfg?.enabled !== false,
  }))
}

/** Toggle an MCP server's enabled state and reload. */
export async function setMcpServerEnabled(name: string, enabled: boolean): Promise<void> {
  await callRpc('config/batchWrite', {
    edits: [
      { keyPath: `mcp_servers.${name}.enabled`, value: enabled, mergeStrategy: 'upsert' },
    ],
    filePath: null,
    expectedVersion: null,
  })
  await callRpc('mcpServer/reload', {})
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
      const normalizedKey = typeof key === 'string' ? normalizePathForUi(key) : ''
      if (normalizedKey.length > 0 && typeof value === 'string') {
        labels[normalizedKey] = value
      }
    }
  }

  return {
    order: normalizeArray(record.order).map((value) => normalizePathForUi(value)),
    labels,
    active: normalizeArray(record.active).map((value) => normalizePathForUi(value)),
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

export async function createWorktree(sourceCwd: string, baseBranch?: string): Promise<WorktreeCreateResult> {
  const normalizedBaseBranch = (baseBranch ?? '').trim()
  const response = await fetch('/codex-api/worktree/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceCwd,
      baseBranch: normalizedBaseBranch || undefined,
    }),
  })
  const payload = (await response.json()) as { data?: WorktreeCreateResult; error?: string }
  if (!response.ok || !payload.data) {
    throw new Error(payload.error || 'Failed to create worktree')
  }
  return {
    ...payload.data,
    cwd: normalizePathForUi(payload.data.cwd),
    gitRoot: normalizePathForUi(payload.data.gitRoot),
  }
}

export async function getWorktreeBranchOptions(sourceCwd: string): Promise<WorktreeBranchOption[]> {
  const normalizedSourceCwd = sourceCwd.trim()
  if (!normalizedSourceCwd) return []
  const query = new URLSearchParams({ sourceCwd: normalizedSourceCwd })
  const response = await fetch(`/codex-api/worktree/branches?${query.toString()}`)
  const payload = (await response.json()) as { data?: unknown; error?: string }
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load branches')
  }
  const rawList = Array.isArray(payload.data) ? payload.data : []
  const options: WorktreeBranchOption[] = []
  const seen = new Set<string>()
  for (const item of rawList) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const record = item as Record<string, unknown>
    const value = typeof record.value === 'string' ? record.value.trim() : ''
    const label = typeof record.label === 'string' ? record.label.trim() : ''
    if (!value || seen.has(value)) continue
    seen.add(value)
    options.push({
      value,
      label: label || value,
    })
  }
  return options
}

export async function getGitBranchState(cwd: string): Promise<GitBranchState> {
  const normalizedCwd = cwd.trim()
  if (!normalizedCwd) {
    return { currentBranch: null, options: [] }
  }
  const query = new URLSearchParams({ cwd: normalizedCwd })
  const response = await fetch(`/codex-api/git/branches?${query.toString()}`)
  const payload = (await response.json()) as { data?: unknown; error?: string }
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load Git branch state')
  }
  const record = payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? (payload.data as Record<string, unknown>)
    : {}
  const currentBranchRaw = record.currentBranch
  const currentBranch = typeof currentBranchRaw === 'string' && currentBranchRaw.trim()
    ? currentBranchRaw.trim()
    : null
  const rawList = Array.isArray(record.options) ? record.options : []
  const options: WorktreeBranchOption[] = []
  const seen = new Set<string>()
  for (const item of rawList) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const option = item as Record<string, unknown>
    const value = typeof option.value === 'string' ? option.value.trim() : ''
    const label = typeof option.label === 'string' ? option.label.trim() : ''
    if (!value || seen.has(value)) continue
    seen.add(value)
    options.push({
      value,
      label: label || value,
    })
  }
  if (currentBranch && !seen.has(currentBranch)) {
    options.unshift({ value: currentBranch, label: currentBranch })
  }
  return { currentBranch, options }
}

export async function checkoutGitBranch(cwd: string, branch: string): Promise<string | null> {
  const response = await fetch('/codex-api/git/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cwd: cwd.trim(),
      branch: branch.trim(),
    }),
  })
  const payload = (await response.json()) as { data?: { currentBranch?: string | null }; error?: string }
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to switch branch')
  }
  const branchName = payload.data?.currentBranch
  return typeof branchName === 'string' && branchName.trim() ? branchName.trim() : null
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

export async function listLocalDirectories(path: string, options?: { showHidden?: boolean }): Promise<LocalDirectoryListing> {
  const query = new URLSearchParams({ path })
  if (options?.showHidden === true) {
    query.set('showHidden', '1')
  }
  const response = await fetch(`/codex-local-directories?${query.toString()}`)
  const payload = await readJsonResponse(response)
  if (!response.ok) {
    const message = getErrorMessageFromPayload(payload, 'Failed to load local directories')
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
  const entriesRaw = Array.isArray(data.entries) ? data.entries : []

  return {
    path: typeof data.path === 'string' ? normalizePathForUi(data.path) : '',
    parentPath: typeof data.parentPath === 'string' ? normalizePathForUi(data.parentPath) : '',
    entries: entriesRaw.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const record = item as Record<string, unknown>
      const name = typeof record.name === 'string' ? record.name.trim() : ''
      const entryPath = typeof record.path === 'string' ? normalizePathForUi(record.path) : ''
      return name && entryPath ? [{ name, path: entryPath }] : []
    }),
  }
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const raw = await response.text()
  if (!raw) return {}
  try {
    return JSON.parse(raw) as unknown
  } catch {
    throw new Error(`Expected JSON response from ${response.url || 'request'}`)
  }
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
  const normalizedPath = typeof data.path === 'string' ? normalizePathForUi(data.path) : ''
  return normalizedPath
}

export async function createLocalDirectory(path: string): Promise<string> {
  const response = await fetch('/codex-api/local-directory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
  const payload = await readJsonResponse(response)
  if (!response.ok) {
    const message = getErrorMessageFromPayload(payload, 'Failed to create local directory')
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
  return typeof data.path === 'string' ? normalizePathForUi(data.path) : ''
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
    path: typeof data.path === 'string' ? normalizePathForUi(data.path) : '',
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

export async function configureTelegramBot(
  botToken: string,
  allowedUserIds: Array<number | '*'>,
): Promise<void> {
  const response = await fetch('/codex-api/telegram/configure-bot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      botToken,
      allowedUserIds,
    }),
  })
  const payload = await response.json()
  if (!response.ok) {
    const message = getErrorMessageFromPayload(payload, 'Failed to connect Telegram bot')
    throw new Error(message)
  }
}

export async function getTelegramConfig(): Promise<TelegramConfig> {
  const response = await fetch('/codex-api/telegram/config')
  const payload = await response.json()
  if (!response.ok) {
    const message = getErrorMessageFromPayload(payload, 'Failed to load Telegram configuration')
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
  const rawAllowedUserIds = Array.isArray(data.allowedUserIds) ? data.allowedUserIds : []
  const allowedUserIds: Array<number | '*'> = []
  for (const value of rawAllowedUserIds) {
    if (value === '*') {
      allowedUserIds.push('*')
      continue
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      allowedUserIds.push(Math.trunc(value))
    }
  }
  return {
    botToken: typeof data.botToken === 'string' ? data.botToken : '',
    allowedUserIds,
  }
}

export async function getTelegramStatus(): Promise<TelegramStatus> {
  const response = await fetch('/codex-api/telegram/status')
  const payload = await response.json()
  if (!response.ok) {
    const message = getErrorMessageFromPayload(payload, 'Failed to load Telegram status')
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
    configured: data.configured === true,
    active: data.active === true,
    mappedChats: typeof data.mappedChats === 'number' ? data.mappedChats : 0,
    mappedThreads: typeof data.mappedThreads === 'number' ? data.mappedThreads : 0,
    allowedUsers: typeof data.allowedUsers === 'number' ? data.allowedUsers : 0,
    allowAllUsers: data.allowAllUsers === true,
    lastError: typeof data.lastError === 'string' ? data.lastError : '',
  }
}

function formatGithubDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function getGithubTrendingProjects(limit = 5): Promise<GithubTrendingProject[]> {
  const safeLimit = Math.min(10, Math.max(1, Math.floor(limit)))
  const sinceDate = new Date()
  sinceDate.setUTCDate(sinceDate.getUTCDate() - 7)
  const query = new URLSearchParams({
    q: `created:>=${formatGithubDate(sinceDate)}`,
    sort: 'stars',
    order: 'desc',
    per_page: String(safeLimit),
  })
  const response = await fetch(`https://api.github.com/search/repositories?${query.toString()}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub trending projects (${response.status})`)
  }
  const payload = (await response.json()) as unknown
  const record =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {}
  const items = Array.isArray(record.items) ? record.items : []
  const projects: GithubTrendingProject[] = []
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const row = item as Record<string, unknown>
    const id = typeof row.id === 'number' ? row.id : 0
    const fullName = typeof row.full_name === 'string' ? row.full_name.trim() : ''
    const htmlUrl = typeof row.html_url === 'string' ? row.html_url.trim() : ''
    if (!id || !fullName || !htmlUrl) continue
    const [owner = '', repo = ''] = fullName.split('/', 2)
    projects.push({
      id,
      fullName,
      owner,
      repo,
      url: htmlUrl,
      description: normalizeGithubProjectDescription(
        fullName,
        typeof row.description === 'string' ? row.description : '',
      ),
      language: typeof row.language === 'string' ? row.language.trim() : '',
      stars: typeof row.stargazers_count === 'number' ? row.stargazers_count : 0,
    })
  }
  return projects
}

export async function getGithubProjectsForScope(
  scope: GithubTipsScope,
  limit = 6,
): Promise<GithubTrendingProject[]> {
  const safeLimit = Math.min(10, Math.max(1, Math.floor(limit)))
  if (scope.startsWith('search-')) {
    const sinceDate = new Date()
    if (scope === 'search-daily') sinceDate.setUTCDate(sinceDate.getUTCDate() - 1)
    else if (scope === 'search-weekly') sinceDate.setUTCDate(sinceDate.getUTCDate() - 7)
    else sinceDate.setUTCDate(sinceDate.getUTCDate() - 30)

    const query = new URLSearchParams({
      q: `created:>=${formatGithubDate(sinceDate)}`,
      sort: 'stars',
      order: 'desc',
      per_page: String(safeLimit),
    })
    const response = await fetch(`https://api.github.com/search/repositories?${query.toString()}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub search projects (${response.status})`)
    }
    const payload = (await response.json()) as unknown
    const record =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : {}
    const items = Array.isArray(record.items) ? record.items : []
    const projects: GithubTrendingProject[] = []
    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const row = item as Record<string, unknown>
      const id = typeof row.id === 'number' ? row.id : 0
      const fullName = typeof row.full_name === 'string' ? row.full_name.trim() : ''
      const htmlUrl = typeof row.html_url === 'string' ? row.html_url.trim() : ''
      if (!id || !fullName || !htmlUrl) continue
      const [owner = '', repo = ''] = fullName.split('/', 2)
      projects.push({
        id,
        fullName,
        owner,
        repo,
        url: htmlUrl,
        description: normalizeGithubProjectDescription(
          fullName,
          typeof row.description === 'string' ? row.description : '',
        ),
        language: typeof row.language === 'string' ? row.language.trim() : '',
        stars: typeof row.stargazers_count === 'number' ? row.stargazers_count : 0,
      })
    }
    return projects
  }

  const since =
    scope === 'trending-daily'
      ? 'daily'
      : scope === 'trending-weekly'
        ? 'weekly'
        : 'monthly'
  const query = new URLSearchParams({ since, limit: String(safeLimit) })
  const response = await fetch(`/codex-api/github-trending?${query.toString()}`)
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    const message = getErrorMessageFromPayload(payload, 'Failed to fetch GitHub trending projects')
    throw new Error(message)
  }
  const record =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {}
  const data = Array.isArray(record.data) ? record.data : []
  const projects: GithubTrendingProject[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const row = item as Record<string, unknown>
    const id = typeof row.id === 'number' ? row.id : 0
    const fullName = typeof row.fullName === 'string' ? row.fullName.trim() : ''
    const url = typeof row.url === 'string' ? row.url.trim() : ''
    if (!id || !fullName || !url) continue
    const [owner = '', repo = ''] = fullName.split('/', 2)
    projects.push({
      id,
      fullName,
      owner,
      repo,
      url,
      description: normalizeGithubProjectDescription(
        fullName,
        typeof row.description === 'string' ? row.description : '',
      ),
      language: typeof row.language === 'string' ? row.language.trim() : '',
      stars: typeof row.stars === 'number' ? row.stars : 0,
    })
  }
  return projects
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
export type ThreadPinnedState = { threadIds: string[] }

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

export async function getPinnedThreadState(): Promise<ThreadPinnedState> {
  try {
    const response = await fetch('/codex-api/thread-pins')
    if (!response.ok) return { threadIds: [] }
    const envelope = (await response.json()) as { data?: ThreadPinnedState }
    return envelope.data ?? { threadIds: [] }
  } catch {
    return { threadIds: [] }
  }
}

export async function persistPinnedThreadIds(threadIds: string[]): Promise<void> {
  try {
    await fetch('/codex-api/thread-pins', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadIds }),
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
  enabled: boolean
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

export async function getSkillsList(cwds?: string[]): Promise<SkillInfo[]> {
  try {
    const params: Record<string, unknown> = {}
    if (cwds && cwds.length > 0) params.cwds = cwds
    const payload = await callRpc<{ data: SkillsListResponseEntry[] }>('skills/list', params)
    const skills: SkillInfo[] = []
    const seen = new Set<string>()
    for (const entry of payload.data) {
      for (const skill of entry.skills) {
        if (!skill.name || seen.has(skill.path)) continue
        seen.add(skill.path)
        skills.push({
          name: skill.name,
          description: skill.shortDescription || skill.description || '',
          path: skill.path,
          scope: skill.scope,
          enabled: skill.enabled,
        })
      }
    }
    return skills
  } catch {
    return []
  }
}

const FILE_UPLOAD_TIMEOUT_MS = 60_000

export async function uploadFile(file: File): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FILE_UPLOAD_TIMEOUT_MS)
  try {
    const form = new FormData()
    form.append('file', file)
    const resp = await fetch('/codex-api/upload-file', {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })
    if (!resp.ok) return null
    const data = (await resp.json()) as { path?: string }
    return data.path ?? null
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}
