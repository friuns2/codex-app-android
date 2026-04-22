import { basename } from 'node:path'

type TelegramUpdate = {
  update_id?: number
  message?: {
    message_id?: number
    text?: string
    from?: {
      id?: number
    }
    chat?: {
      id?: number
    }
  }
  callback_query?: {
    id?: string
    data?: string
    from?: {
      id?: number
    }
    message?: {
      chat?: {
        id?: number
      }
    }
  }
}

type AppServerLike = {
  rpc: (method: string, params: unknown) => Promise<unknown>
  onNotification: (listener: (value: { method: string; params: unknown }) => void) => () => void
}

type TelegramThreadBridgeOptions = {
  onChatSeen?: (chatId: number) => void
}

export type TelegramBridgeStatus = {
  configured: boolean
  active: boolean
  mappedChats: number
  mappedThreads: number
  allowedUsers: number
  allowAllUsers: boolean
  lastError: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload instanceof Error && payload.message.trim().length > 0) {
    return payload.message
  }

  const record = asRecord(payload)
  if (!record) return fallback

  const error = record.error
  if (typeof error === 'string' && error.length > 0) return error

  const nestedError = asRecord(error)
  if (nestedError && typeof nestedError.message === 'string' && nestedError.message.length > 0) {
    return nestedError.message
  }

  return fallback
}

type NormalizedTelegramAllowlist = {
  allowAllUsers: boolean
  allowedUserIds: number[]
}

function normalizeTelegramAllowlist(values: unknown): NormalizedTelegramAllowlist {
  const rawValues = Array.isArray(values) ? values : []
  const allowAllUsers = rawValues.some((value) => typeof value === 'string' && value.trim() === '*')
  const allowedUserIds = Array.from(new Set(rawValues
    .map((value) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value)
      }
      if (typeof value === 'string' && value.trim().length > 0) {
        const normalized = value.trim().replace(/^(telegram|tg):/i, '').trim()
        if (/^-?\d+$/.test(normalized)) {
          return Number.parseInt(normalized, 10)
        }
      }
      return Number.NaN
    })
    .filter((value) => Number.isFinite(value)))).slice(0, 100)
  return { allowAllUsers, allowedUserIds }
}

export class TelegramThreadBridge {
  private token: string
  private readonly appServer: AppServerLike
  private readonly defaultCwd: string
  private allowAllUsers = false
  private allowedUserIds = new Set<number>()
  private readonly threadIdByChatId = new Map<number, string>()
  private readonly chatIdsByThreadId = new Map<string, Set<number>>()
  private readonly lastForwardedTurnByThreadId = new Map<string, string>()
  private active = false
  private nextUpdateOffset = 0
  private lastError = ''
  private readonly onChatSeen?: (chatId: number) => void

  constructor(appServer: AppServerLike, options: TelegramThreadBridgeOptions = {}) {
    this.appServer = appServer
    this.token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? ''
    this.defaultCwd = process.env.TELEGRAM_DEFAULT_CWD?.trim() ?? process.cwd()
    this.configureAllowedUserIds(
      (process.env.TELEGRAM_ALLOWED_USER_IDS ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    )
    this.onChatSeen = options.onChatSeen
  }

  start(): void {
    if (!this.token || this.active) return
    this.active = true
    void this.notifyOnlineForKnownChats().catch(() => {})
    void this.pollLoop()
    this.appServer.onNotification((notification) => {
      void this.handleNotification(notification).catch(() => {})
    })
  }

  stop(): void {
    this.active = false
  }

  private async pollLoop(): Promise<void> {
    while (this.active) {
      try {
        const updates = await this.getUpdates()
        this.lastError = ''
        for (const update of updates) {
          const updateId = typeof update.update_id === 'number' ? update.update_id : -1
          if (updateId >= 0) {
            this.nextUpdateOffset = Math.max(this.nextUpdateOffset, updateId + 1)
          }
          await this.handleIncomingUpdate(update)
        }
      } catch (error) {
        this.lastError = getErrorMessage(error, 'Telegram polling failed')
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
    }
  }

  private async getUpdates(): Promise<TelegramUpdate[]> {
    if (!this.token) {
      throw new Error('Telegram bot token is not configured')
    }
    const response = await fetch(this.apiUrl('getUpdates'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeout: 45,
        offset: this.nextUpdateOffset,
        allowed_updates: ['message', 'callback_query'],
      }),
    })
    const payload = asRecord(await response.json())
    const result = Array.isArray(payload?.result) ? payload.result : []
    return result as TelegramUpdate[]
  }

  private apiUrl(method: string): string {
    return `https://api.telegram.org/bot${this.token}/${method}`
  }

  configureToken(token: string): void {
    const normalizedToken = token.trim()
    if (!normalizedToken) {
      throw new Error('Telegram bot token is required')
    }
    this.token = normalizedToken
  }

  getStatus(): TelegramBridgeStatus {
    return {
      configured: this.token.length > 0,
      active: this.active,
      mappedChats: this.threadIdByChatId.size,
      mappedThreads: this.chatIdsByThreadId.size,
      allowedUsers: this.allowedUserIds.size,
      allowAllUsers: this.allowAllUsers,
      lastError: this.lastError,
    }
  }

  configureAllowedUserIds(allowedUserIds: unknown): void {
    const normalized = normalizeTelegramAllowlist(allowedUserIds)
    this.allowAllUsers = normalized.allowAllUsers
    this.allowedUserIds = new Set(normalized.allowedUserIds)
  }

  connectThread(threadId: string, chatId: number, token?: string): void {
    const normalizedThreadId = threadId.trim()
    if (!normalizedThreadId) {
      throw new Error('threadId is required')
    }
    if (!Number.isFinite(chatId)) {
      throw new Error('chatId must be a number')
    }
    if (typeof token === 'string' && token.trim().length > 0) {
      this.configureToken(token)
    }
    if (!this.token) {
      throw new Error('Telegram bot token is not configured')
    }
    this.bindChatToThread(chatId, normalizedThreadId)
    this.markChatSeen(chatId)
    this.start()
    void this.sendOnlineMessage(chatId).catch(() => {})
  }

  private markChatSeen(chatId: number): void {
    if (!Number.isFinite(chatId)) return
    this.onChatSeen?.(Math.trunc(chatId))
  }

  private async sendTelegramMessage(
    chatId: number,
    text: string,
    options: { replyMarkup?: unknown } = {},
  ): Promise<void> {
    const message = text.trim()
    if (!message) return
    const payload: Record<string, unknown> = { chat_id: chatId, text: message }
    if (options.replyMarkup) {
      payload.reply_markup = options.replyMarkup
    }
    await fetch(this.apiUrl('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  private async sendOnlineMessage(chatId: number): Promise<void> {
    await this.sendTelegramMessage(chatId, 'Codex thread bridge went online.')
  }

  private async notifyOnlineForKnownChats(): Promise<void> {
    const knownChatIds = Array.from(this.threadIdByChatId.keys())
    for (const chatId of knownChatIds) {
      await this.sendOnlineMessage(chatId)
    }
  }

  private async handleIncomingUpdate(update: TelegramUpdate): Promise<void> {
    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query)
      return
    }

    const message = update.message
    const chatId = message?.chat?.id
    const senderId = message?.from?.id
    const text = message?.text?.trim()
    if (typeof chatId !== 'number' || !text) return
    if (!this.isAllowedSender(senderId)) {
      await this.sendTelegramMessage(chatId, this.unauthorizedMessage(senderId))
      return
    }
    this.markChatSeen(chatId)

    if (text === '/start') {
      await this.sendThreadPicker(chatId)
      return
    }

    if (text === '/newthread') {
      const threadId = await this.createThreadForChat(chatId)
      await this.sendTelegramMessage(chatId, `Mapped to new thread: ${threadId}`)
      return
    }

    const threadCommand = text.match(/^\/thread\s+(\S+)$/)
    if (threadCommand) {
      const threadId = threadCommand[1]
      this.bindChatToThread(chatId, threadId)
      await this.sendTelegramMessage(chatId, `Mapped to thread: ${threadId}`)
      return
    }

    const threadId = await this.ensureThreadForChat(chatId)
    try {
      await this.appServer.rpc('turn/start', {
        threadId,
        input: [{ type: 'text', text }],
      })
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to forward message to thread')
      await this.sendTelegramMessage(chatId, `Forward failed: ${message}`)
    }
  }

  private async handleCallbackQuery(callbackQuery: NonNullable<TelegramUpdate['callback_query']>): Promise<void> {
    const callbackId = typeof callbackQuery.id === 'string' ? callbackQuery.id : ''
    const data = typeof callbackQuery.data === 'string' ? callbackQuery.data : ''
    const chatId = callbackQuery.message?.chat?.id
    const senderId = callbackQuery.from?.id
    if (!this.isAllowedSender(senderId)) {
      if (callbackId) {
        await this.answerCallbackQuery(callbackId, this.unauthorizedCallbackMessage(senderId))
      }
      if (typeof chatId === 'number') {
        await this.sendTelegramMessage(chatId, this.unauthorizedMessage(senderId))
      }
      return
    }
    if (typeof chatId === 'number') {
      this.markChatSeen(chatId)
    }
    if (!callbackId) return

    if (!data.startsWith('thread:') || typeof chatId !== 'number') {
      await this.answerCallbackQuery(callbackId, 'Invalid selection')
      return
    }

    const threadId = data.slice('thread:'.length).trim()
    if (!threadId) {
      await this.answerCallbackQuery(callbackId, 'Invalid thread id')
      return
    }

    this.bindChatToThread(chatId, threadId)
    await this.answerCallbackQuery(callbackId, 'Thread connected')
    await this.sendTelegramMessage(chatId, `Connected to thread: ${threadId}`)
    const history = await this.readThreadHistorySummary(threadId)
    if (history) {
      await this.sendTelegramMessage(chatId, history)
    }
  }

  private isAllowedSender(senderId: unknown): senderId is number {
    if (this.allowAllUsers) {
      return typeof senderId === 'number' && Number.isFinite(senderId)
    }
    return typeof senderId === 'number'
      && Number.isFinite(senderId)
      && this.allowedUserIds.has(Math.trunc(senderId))
  }

  private unauthorizedMessage(senderId: unknown): string {
    const normalizedSenderId = typeof senderId === 'number' && Number.isFinite(senderId)
      ? String(Math.trunc(senderId))
      : 'unknown'
    return `Unauthorized sender.\n\nYour Telegram user ID: ${normalizedSenderId}\nAdd this ID to the bot allowlist before using the bridge.`
  }

  private unauthorizedCallbackMessage(senderId: unknown): string {
    if (typeof senderId === 'number' && Number.isFinite(senderId)) {
      return `Unauthorized: ${String(Math.trunc(senderId))}`
    }
    return 'Unauthorized sender'
  }

  private async answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
    await fetch(this.apiUrl('answerCallbackQuery'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    })
  }

  private async sendThreadPicker(chatId: number): Promise<void> {
    const threads = await this.listRecentThreads()
    if (threads.length === 0) {
      await this.sendTelegramMessage(chatId, 'No threads found. Send /newthread to create one.')
      return
    }

    const inlineKeyboard = threads.map((thread) => [
      {
        text: thread.title,
        callback_data: `thread:${thread.id}`,
      },
    ])

    await this.sendTelegramMessage(chatId, 'Select a thread to connect:', {
      replyMarkup: { inline_keyboard: inlineKeyboard },
    })
  }

  private async listRecentThreads(): Promise<Array<{ id: string; title: string }>> {
    const payload = asRecord(await this.appServer.rpc('thread/list', {
      archived: false,
      limit: 20,
      sortKey: 'updated_at',
      modelProviders: [],
    }))
    const rows = Array.isArray(payload?.data) ? payload.data : []
    const threads: Array<{ id: string; title: string }> = []
    for (const row of rows) {
      const record = asRecord(row)
      const id = typeof record?.id === 'string' ? record.id.trim() : ''
      if (!id) continue
      const name = typeof record?.name === 'string' ? record.name.trim() : ''
      const preview = typeof record?.preview === 'string' ? record.preview.trim() : ''
      const cwd = typeof record?.cwd === 'string' ? record.cwd.trim() : ''
      const projectName = cwd ? basename(cwd) : 'project'
      const threadTitle = (name || preview || id).replace(/\s+/g, ' ').trim()
      const title = `${projectName}/${threadTitle}`.slice(0, 64)
      threads.push({ id, title })
    }
    return threads
  }

  private async createThreadForChat(chatId: number): Promise<string> {
    const response = asRecord(await this.appServer.rpc('thread/start', { cwd: this.defaultCwd }))
    const thread = asRecord(response?.thread)
    const threadId = typeof thread?.id === 'string' ? thread.id : ''
    if (!threadId) {
      throw new Error('thread/start did not return thread id')
    }
    this.bindChatToThread(chatId, threadId)
    return threadId
  }

  private async ensureThreadForChat(chatId: number): Promise<string> {
    const existing = this.threadIdByChatId.get(chatId)
    if (existing) return existing
    return this.createThreadForChat(chatId)
  }

  private bindChatToThread(chatId: number, threadId: string): void {
    const previousThreadId = this.threadIdByChatId.get(chatId)
    if (previousThreadId && previousThreadId !== threadId) {
      const previousSet = this.chatIdsByThreadId.get(previousThreadId)
      previousSet?.delete(chatId)
      if (previousSet && previousSet.size === 0) {
        this.chatIdsByThreadId.delete(previousThreadId)
      }
    }
    this.threadIdByChatId.set(chatId, threadId)
    const chatIds = this.chatIdsByThreadId.get(threadId) ?? new Set<number>()
    chatIds.add(chatId)
    this.chatIdsByThreadId.set(threadId, chatIds)
  }

  private extractThreadId(notification: { method: string; params: unknown }): string {
    const params = asRecord(notification.params)
    if (!params) return ''
    const directThreadId = typeof params.threadId === 'string' ? params.threadId : ''
    if (directThreadId) return directThreadId
    const turn = asRecord(params.turn)
    const turnThreadId = typeof turn?.threadId === 'string' ? turn.threadId : ''
    return turnThreadId
  }

  private extractTurnId(notification: { method: string; params: unknown }): string {
    const params = asRecord(notification.params)
    if (!params) return ''
    const directTurnId = typeof params.turnId === 'string' ? params.turnId : ''
    if (directTurnId) return directTurnId
    const turn = asRecord(params.turn)
    const turnId = typeof turn?.id === 'string' ? turn.id : ''
    return turnId
  }

  private async handleNotification(notification: { method: string; params: unknown }): Promise<void> {
    if (notification.method !== 'turn/completed') return
    const threadId = this.extractThreadId(notification)
    if (!threadId) return
    const chatIds = this.chatIdsByThreadId.get(threadId)
    if (!chatIds || chatIds.size === 0) return

    const turnId = this.extractTurnId(notification)
    const lastForwardedTurnId = this.lastForwardedTurnByThreadId.get(threadId)
    if (turnId && lastForwardedTurnId === turnId) return

    const assistantReply = await this.readLatestAssistantMessage(threadId)
    if (!assistantReply) return
    for (const chatId of chatIds) {
      await this.sendTelegramMessage(chatId, assistantReply)
    }
    if (turnId) {
      this.lastForwardedTurnByThreadId.set(threadId, turnId)
    }
  }

  private async readLatestAssistantMessage(threadId: string): Promise<string> {
    const response = asRecord(await this.appServer.rpc('thread/read', { threadId, includeTurns: true }))
    const thread = asRecord(response?.thread)
    const turns = Array.isArray(thread?.turns) ? thread.turns : []

    for (let turnIndex = turns.length - 1; turnIndex >= 0; turnIndex -= 1) {
      const turn = asRecord(turns[turnIndex])
      const items = Array.isArray(turn?.items) ? turn.items : []
      for (let itemIndex = items.length - 1; itemIndex >= 0; itemIndex -= 1) {
        const item = asRecord(items[itemIndex])
        if (item?.type === 'agentMessage') {
          const text = typeof item.text === 'string' ? item.text.trim() : ''
          if (text) return text
        }
      }
    }
    return ''
  }

  private async readThreadHistorySummary(threadId: string): Promise<string> {
    const response = asRecord(await this.appServer.rpc('thread/read', { threadId, includeTurns: true }))
    const thread = asRecord(response?.thread)
    const turns = Array.isArray(thread?.turns) ? thread.turns : []
    const historyRows: string[] = []

    for (const turn of turns) {
      const turnRecord = asRecord(turn)
      const items = Array.isArray(turnRecord?.items) ? turnRecord.items : []
      for (const item of items) {
        const itemRecord = asRecord(item)
        const type = typeof itemRecord?.type === 'string' ? itemRecord.type : ''
        if (type === 'userMessage') {
          const content = Array.isArray(itemRecord?.content) ? itemRecord.content : []
          for (const block of content) {
            const blockRecord = asRecord(block)
            if (blockRecord?.type === 'text' && typeof blockRecord.text === 'string' && blockRecord.text.trim()) {
              historyRows.push(`User: ${blockRecord.text.trim()}`)
            }
          }
        }
        if (type === 'agentMessage' && typeof itemRecord?.text === 'string' && itemRecord.text.trim()) {
          historyRows.push(`Assistant: ${itemRecord.text.trim()}`)
        }
      }
    }

    if (historyRows.length === 0) {
      return 'Thread has no message history yet.'
    }

    const tail = historyRows.slice(-12).join('\n\n')
    const maxLen = 3800
    const summary = tail.length > maxLen ? tail.slice(tail.length - maxLen) : tail
    return `Recent history:\n\n${summary}`
  }
}
