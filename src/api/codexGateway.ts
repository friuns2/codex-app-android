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
  ConfigReadResponse,
  GetAccountRateLimitsResponse,
  ModelListResponse,
  ReasoningEffort,
  ThreadListResponse,
  ThreadReadResponse,
} from './appServerDtos'
import { normalizeCodexApiError } from './codexErrors'
import {
  normalizeThreadGroupsV2,
  normalizeThreadMessagesV2,
  readThreadInProgressFromResponse,
} from './normalizers/v2'
import type { SpeedMode, UiMessage, UiProjectGroup } from '../types/codex'

type CurrentModelConfig = {
  model: string
  reasoningEffort: ReasoningEffort | ''
  speedMode: SpeedMode
}

export type WorkspaceRootsState = {
  order: string[]
  labels: Record<string, string>
  active: string[]
}

export type ComposerFileSuggestion = {
  path: string
}

export type WorktreeCreateResult = {
  cwd: string
  branch: string
  gitRoot: string
}

export type WorktreeAutoCommitResult = {
  committed: boolean
}

export type WorktreeRollbackResult = {
  reset: boolean
  commitSha: string
  stashed: boolean
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
  lastError: string
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

async function callRpc<T>(method: string, params?: unknown): Promise<T> {
  try {
    return await rpcCall<T>(method, params)
  } catch (error) {
    throw normalizeCodexApiError(error, `RPC ${method} failed`, method)
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
  return normalizeThreadMessagesV2(payload)
}

async function getThreadDetailV2(threadId: string): Promise<{ messages: UiMessage[]; inProgress: boolean }> {
  const payload = await callRpc<ThreadReadResponse>('thread/read', {
    threadId,
    includeTurns: true,
  })
  return {
    messages: normalizeThreadMessagesV2(payload),
    inProgress: readThreadInProgressFromResponse(payload),
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

export async function getThreadDetail(threadId: string): Promise<{ messages: UiMessage[]; inProgress: boolean }> {
  try {
    return await getThreadDetailV2(threadId)
  } catch (error) {
    throw normalizeCodexApiError(error, `Failed to load thread ${threadId}`, 'thread/read')
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

export type FileAttachmentParam = { label: string; path: string; fsPath: string }

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

export async function startThreadTurn(
  threadId: string,
  text: string,
  imageUrls: string[] = [],
  model?: string,
  effort?: ReasoningEffort,
  skills?: Array<{ name: string; path: string }>,
  fileAttachments: FileAttachmentParam[] = [],
): Promise<void> {
  try {
    const finalText = buildTextWithAttachments(text, fileAttachments)
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
    const attachments = fileAttachments.map((f) => ({ label: f.label, path: f.path, fsPath: f.fsPath }))
    const params: Record<string, unknown> = {
      threadId,
      input,
    }
    if (attachments.length > 0) params.attachments = attachments
    if (typeof model === 'string' && model.length > 0) {
      params.model = model
    }
    if (typeof effort === 'string' && effort.length > 0) {
      params.effort = effort
    }
    await callRpc('turn/start', params)
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
  const speedMode = normalizeSpeedMode(payload.config.service_tier)
  return { model, reasoningEffort, speedMode }
}

export async function getAccountRateLimits(): Promise<GetAccountRateLimitsResponse> {
  return await callRpc<GetAccountRateLimitsResponse>('account/rateLimits/read')
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

export async function autoCommitWorktreeChanges(cwd: string, message: string): Promise<WorktreeAutoCommitResult> {
  const response = await fetch('/codex-api/worktree/auto-commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cwd, message }),
  })
  const payload = (await response.json()) as { data?: WorktreeAutoCommitResult; error?: string }
  if (!response.ok || !payload.data) {
    throw new Error(payload.error || 'Failed to auto-commit worktree changes')
  }
  return payload.data
}

export async function rollbackWorktreeToMessage(cwd: string, message: string): Promise<WorktreeRollbackResult> {
  const response = await fetch('/codex-api/worktree/rollback-to-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cwd, message }),
  })
  const payload = (await response.json()) as { data?: WorktreeRollbackResult; error?: string }
  if (!response.ok || !payload.data) {
    throw new Error(payload.error || 'Failed to rollback worktree to message commit')
  }
  return payload.data
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

export async function configureTelegramBot(
  botToken: string,
): Promise<void> {
  const response = await fetch('/codex-api/telegram/configure-bot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      botToken,
    }),
  })
  const payload = await response.json()
  if (!response.ok) {
    const message = getErrorMessageFromPayload(payload, 'Failed to connect Telegram bot')
    throw new Error(message)
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
  const error = record.error
  return typeof error === 'string' && error.trim().length > 0 ? error : fallback
}

export type ThreadTitleCache = { titles: Record<string, string>; order: string[] }

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
