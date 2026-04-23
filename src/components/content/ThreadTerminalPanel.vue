<template>
  <section class="thread-terminal-panel" :class="{ 'is-error': Boolean(errorMessage) }">
    <header class="thread-terminal-header">
      <div class="thread-terminal-tabs">
        <button
          v-for="(tab, index) in tabs"
          :key="tab.id"
          class="thread-terminal-tab"
          :class="{ 'is-active': tab.id === activeSessionId }"
          type="button"
          :title="terminalTabTitle(tab, index)"
          @click="onSelectTab(tab.id)"
        >
          <span class="thread-terminal-dot" :data-status="tab.status" />
          <span class="thread-terminal-title">{{ terminalTabTitle(tab, index) }}</span>
        </button>
      </div>
      <div class="thread-terminal-actions">
        <select
          class="thread-terminal-quick-command"
          aria-label="Run quick command"
          title="Run quick command"
          @change="onQuickCommandSelect"
        >
          <option value="">Run...</option>
          <option v-for="command in quickCommands" :key="command.value" :value="command.value">
            {{ command.label }}
          </option>
          <option :value="ADD_QUICK_COMMAND_VALUE">Add command...</option>
        </select>
        <button class="thread-terminal-action" type="button" title="New" @click="onNewTerminal">
          New
        </button>
        <button class="thread-terminal-action" type="button" :title="t('Hide terminal')" @click="$emit('hide')">
          {{ t('Hide') }}
        </button>
        <button class="thread-terminal-action" type="button" :title="t('Close')" @click="onCloseTerminal">
          {{ t('Close') }}
        </button>
      </div>
    </header>
    <p v-if="errorMessage" class="thread-terminal-error">{{ errorMessage }}</p>
    <div ref="terminalHostRef" class="thread-terminal-host" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useUiLanguage } from '../../composables/useUiLanguage'
import {
  attachThreadTerminal,
  closeThreadTerminal,
  resizeThreadTerminal,
  sendThreadTerminalInput,
  subscribeCodexNotifications,
  type RpcNotification,
} from '../../api/codexGateway'

const props = defineProps<{
  threadId: string
  cwd: string
}>()

const emit = defineEmits<{
  hide: []
}>()

const { t } = useI18n()

const terminalHostRef = ref<HTMLElement | null>(null)
const activeSessionId = ref('')
const errorMessage = ref('')
const tabs = ref<TerminalTab[]>([])

let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null
let unsubscribeNotifications: (() => void) | null = null
let resizeFrame = 0
const { t } = useUiLanguage()

type TerminalTab = {
  id: string
  shell: string
  status: 'connecting' | 'attached' | 'exited' | 'error'
}

const terminalTitle = computed(() => {
  if (shellLabel.value && shellLabel.value !== 'terminal') return shellLabel.value
  return t('terminal.title')
})

type QuickCommand = {
  label: string
  value: string
  custom?: boolean
  usageCount: number
  lastUsedAt: number
  builtInIndex?: number
}

const QUICK_COMMAND_STORAGE_KEY = 'codex-web-local.terminal-quick-commands.v1'
const TERMINAL_TABS_STORAGE_KEY = 'codex-web-local.terminal-tabs.v1'
const ADD_QUICK_COMMAND_VALUE = '__add_quick_command__'
const MAX_VISIBLE_QUICK_COMMANDS = 5
const BUILT_IN_QUICK_COMMANDS: QuickCommand[] = [
  { label: 'npm run dev', value: 'npm run dev', usageCount: 0, lastUsedAt: 0, builtInIndex: 0 },
  { label: 'pnpm run dev', value: 'pnpm run dev', usageCount: 0, lastUsedAt: 0, builtInIndex: 1 },
  { label: 'pnpm run test:unit', value: 'pnpm run test:unit', usageCount: 0, lastUsedAt: 0, builtInIndex: 2 },
  { label: 'pnpm run build', value: 'pnpm run build', usageCount: 0, lastUsedAt: 0, builtInIndex: 3 },
]

const storedQuickCommands = ref<QuickCommand[]>(loadStoredQuickCommands())

const activeTab = computed(() => tabs.value.find((tab) => tab.id === activeSessionId.value) ?? null)
const quickCommands = computed<QuickCommand[]>(() => {
  const storedByValue = new Map(storedQuickCommands.value.map((command) => [command.value, command]))
  const combined = [
    ...BUILT_IN_QUICK_COMMANDS.map((command) => ({
      ...command,
      ...(storedByValue.get(command.value) ?? {}),
      custom: false,
      builtInIndex: command.builtInIndex,
    })),
    ...storedQuickCommands.value.filter((command) => command.custom === true),
  ]
  return combined
    .sort(compareQuickCommands)
    .slice(0, MAX_VISIBLE_QUICK_COMMANDS)
})

onMounted(() => {
  restoreSavedTabs()
  createTerminal()
  unsubscribeNotifications = subscribeCodexNotifications(handleNotification)
  void attachToThread(false)
})

onBeforeUnmount(() => {
  if (resizeFrame) {
    window.cancelAnimationFrame(resizeFrame)
    resizeFrame = 0
  }
  resizeObserver?.disconnect()
  resizeObserver = null
  unsubscribeNotifications?.()
  unsubscribeNotifications = null
  terminal?.dispose()
  terminal = null
  fitAddon = null
})

watch(
  () => [props.threadId, props.cwd] as const,
  () => {
    restoreSavedTabs()
    void attachToThread(false)
  },
)

function createTerminal(): void {
  if (!terminalHostRef.value) return
  terminal = new Terminal({
    cursorBlink: true,
    fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
    fontSize: 12,
    lineHeight: 1.25,
    scrollback: 10000,
    theme: {
      background: '#050505',
      foreground: '#e5e7eb',
      cursor: '#f4f4f5',
      selectionBackground: '#475569',
      black: '#18181b',
      red: '#f87171',
      green: '#86efac',
      yellow: '#fde68a',
      blue: '#93c5fd',
      magenta: '#d8b4fe',
      cyan: '#67e8f9',
      white: '#f4f4f5',
    },
  })
  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.open(terminalHostRef.value)
  terminal.onData((data) => {
    if (!activeSessionId.value) return
    void sendThreadTerminalInput(activeSessionId.value, data).catch((error: unknown) => {
      errorMessage.value = error instanceof Error ? error.message : t('Terminal input failed')
    })
  })

  resizeObserver = new ResizeObserver(() => {
    scheduleFitAndResize()
  })
  resizeObserver.observe(terminalHostRef.value)
  scheduleFitAndResize()
}

async function attachToThread(newSession: boolean, targetSessionId = ''): Promise<void> {
  if (!props.threadId || !props.cwd || !terminal) return
  errorMessage.value = ''
  await nextTick()
  fitTerminal()
  try {
    const session = await attachThreadTerminal({
      threadId: props.threadId,
      cwd: props.cwd,
      sessionId: newSession ? undefined : targetSessionId || activeSessionId.value || undefined,
      cols: terminal.cols,
      rows: terminal.rows,
      newSession,
    })
    upsertTab({
      id: session.id,
      shell: session.shell || 'terminal',
      status: 'attached',
    })
    activeSessionId.value = session.id
    saveTabsState()
    renderSessionBuffer(session.buffer)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('Terminal attach failed')
  }
}

function handleNotification(notification: RpcNotification): void {
  const params = asRecord(notification.params)
  const notificationSessionId = readString(params?.sessionId)
  if (!notificationSessionId || !terminal) return

  if (notification.method === 'terminal-attached') {
    patchTab(notificationSessionId, {
      shell: readString(params?.shell) || undefined,
      status: 'attached',
    })
    saveTabsState()
    return
  }
  if (notification.method === 'terminal-init-log') {
    if (notificationSessionId !== activeSessionId.value) return
    terminal.clear()
    terminal.write(readString(params?.log) || '')
    return
  }
  if (notification.method === 'terminal-data') {
    if (notificationSessionId !== activeSessionId.value) return
    terminal.write(readString(params?.data) || '')
    return
  }
  if (notification.method === 'terminal-exit') {
    patchTab(notificationSessionId, { status: 'exited' })
    saveTabsState()
    if (notificationSessionId !== activeSessionId.value) return
    terminal.writeln('')
    terminal.writeln(t('terminal.exited'))
    return
  }
  if (notification.method === 'terminal-error') {
    patchTab(notificationSessionId, { status: 'error' })
    saveTabsState()
    if (notificationSessionId !== activeSessionId.value) return
    errorMessage.value = readString(params?.message) || 'Terminal error'
  }
}

function onNewTerminal(): void {
  void attachToThread(true)
}

function onSelectTab(tabId: string): void {
  if (!tabId || tabId === activeSessionId.value) return
  void attachToThread(false, tabId)
}

function onQuickCommandSelect(event: Event): void {
  const select = event.target instanceof HTMLSelectElement ? event.target : null
  const command = select?.value.trim() ?? ''
  if (select) {
    select.value = ''
  }
  if (command === ADD_QUICK_COMMAND_VALUE) {
    onAddQuickCommandFromPrompt()
    return
  }
  if (!command) return
  runQuickCommand(command, false)
}

function onAddQuickCommandFromPrompt(): void {
  if (typeof window === 'undefined') return
  const value = normalizeQuickCommandValue(window.prompt('Add quick command') ?? '')
  if (!value) return
  runQuickCommand(value, true)
}

function onCloseTerminal(): void {
  const currentSessionId = activeSessionId.value
  if (!currentSessionId) {
    emit('hide')
    return
  }
  const currentIndex = tabs.value.findIndex((tab) => tab.id === currentSessionId)
  const nextTabs = tabs.value.filter((tab) => tab.id !== currentSessionId)
  tabs.value = nextTabs
  const nextTab = nextTabs[Math.max(0, Math.min(currentIndex, nextTabs.length - 1))]
  if (currentSessionId) {
    void closeThreadTerminal(currentSessionId).catch((error: unknown) => {
      errorMessage.value = error instanceof Error ? error.message : 'Terminal close failed'
    })
  }
  if (nextTab) {
    activeSessionId.value = nextTab.id
    saveTabsState()
    void attachToThread(false, nextTab.id)
    return
  }
  activeSessionId.value = ''
  terminal?.clear()
  saveTabsState()
  emit('hide')
}

function scheduleFitAndResize(): void {
  if (resizeFrame) return
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = 0
    fitTerminal()
    if (terminal && activeSessionId.value) {
      void resizeThreadTerminal(activeSessionId.value, terminal.cols, terminal.rows).catch(() => {})
    }
  })
}

function fitTerminal(): void {
  try {
    fitAddon?.fit()
  } catch {
    // xterm-fit can throw before fonts/layout settle; the next resize observer tick retries.
  }
}

function upsertTab(tab: TerminalTab): void {
  const existingIndex = tabs.value.findIndex((row) => row.id === tab.id)
  if (existingIndex < 0) {
    tabs.value = [...tabs.value, tab]
    saveTabsState()
    return
  }
  const next = [...tabs.value]
  next.splice(existingIndex, 1, {
    ...next[existingIndex],
    ...tab,
  })
  tabs.value = next
  saveTabsState()
}

function patchTab(tabId: string, patch: Partial<TerminalTab>): void {
  const existingIndex = tabs.value.findIndex((row) => row.id === tabId)
  if (existingIndex < 0) return
  const next = [...tabs.value]
  next.splice(existingIndex, 1, {
    ...next[existingIndex],
    ...patch,
  })
  tabs.value = next
  saveTabsState()
}

function renderSessionBuffer(buffer: string): void {
  if (!terminal) return
  terminal.clear()
  if (buffer) {
    terminal.write(buffer)
  }
}

function terminalTabTitle(tab: TerminalTab, index: number): string {
  const shell = tab.shell && tab.shell !== 'terminal' ? tab.shell : 'Terminal'
  return tabs.value.length > 1 ? `${shell} ${index + 1}` : shell
}

function restoreSavedTabs(): void {
  const stored = readStoredTabs()[tabStorageKey()]
  if (!stored || stored.tabs.length === 0) {
    tabs.value = []
    activeSessionId.value = ''
    return
  }
  tabs.value = stored.tabs
  activeSessionId.value = stored.activeSessionId && stored.tabs.some((tab) => tab.id === stored.activeSessionId)
    ? stored.activeSessionId
    : stored.tabs[0]?.id ?? ''
}

function saveTabsState(): void {
  if (typeof window === 'undefined') return
  const allTabs = readStoredTabs()
  const key = tabStorageKey()
  if (tabs.value.length === 0 || !activeSessionId.value) {
    delete allTabs[key]
  } else {
    allTabs[key] = {
      activeSessionId: activeSessionId.value,
      tabs: tabs.value.map((tab) => ({ ...tab })),
    }
  }
  window.localStorage.setItem(TERMINAL_TABS_STORAGE_KEY, JSON.stringify(allTabs))
}

function tabStorageKey(): string {
  return `${props.threadId}::${props.cwd}`
}

function readStoredTabs(): Record<string, { activeSessionId: string, tabs: TerminalTab[] }> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(TERMINAL_TABS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const output: Record<string, { activeSessionId: string, tabs: TerminalTab[] }> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const record = asRecord(value)
      const activeSessionId = readString(record?.activeSessionId)
      const rawTabs = Array.isArray(record?.tabs) ? record.tabs : []
      const nextTabs: TerminalTab[] = []
      for (const rawTab of rawTabs) {
        const tab = asRecord(rawTab)
        const id = readString(tab?.id)
        if (!id) continue
        const rawStatus = readString(tab?.status)
        const status: TerminalTab['status'] =
          rawStatus === 'attached' || rawStatus === 'exited' || rawStatus === 'error'
            ? rawStatus
            : 'connecting'
        nextTabs.push({
          id,
          shell: readString(tab?.shell) || 'terminal',
          status,
        })
      }
      if (nextTabs.length > 0) {
        output[key] = { activeSessionId, tabs: nextTabs }
      }
    }
    return output
  } catch {
    return {}
  }
}

function normalizeQuickCommandValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function runQuickCommand(command: string, custom: boolean): void {
  const value = normalizeQuickCommandValue(command)
  if (!value) return
  recordQuickCommandUse(value, custom)
  if (!activeSessionId.value) {
    errorMessage.value = 'Terminal is not connected'
    return
  }
  terminal?.focus()
  void sendThreadTerminalInput(activeSessionId.value, `${value}\r`).catch((error: unknown) => {
    errorMessage.value = error instanceof Error ? error.message : 'Quick command failed'
  })
}

function recordQuickCommandUse(value: string, custom: boolean): void {
  const normalized = normalizeQuickCommandValue(value)
  if (!normalized) return
  const existing = storedQuickCommands.value.find((command) => command.value === normalized)
  const builtIn = BUILT_IN_QUICK_COMMANDS.find((command) => command.value === normalized)
  const nextCommand: QuickCommand = {
    label: existing?.label || builtIn?.label || normalized,
    value: normalized,
    custom: existing?.custom === true || (!builtIn && custom),
    usageCount: (existing?.usageCount ?? 0) + 1,
    lastUsedAt: Date.now(),
    builtInIndex: builtIn?.builtInIndex,
  }
  const next = [
    ...storedQuickCommands.value.filter((command) => command.value !== normalized),
    nextCommand,
  ]
  storedQuickCommands.value = next
  saveStoredQuickCommands(next)
}

function compareQuickCommands(first: QuickCommand, second: QuickCommand): number {
  if (second.usageCount !== first.usageCount) return second.usageCount - first.usageCount
  if (second.lastUsedAt !== first.lastUsedAt) return second.lastUsedAt - first.lastUsedAt
  const firstBuiltIn = typeof first.builtInIndex === 'number' ? first.builtInIndex : Number.MAX_SAFE_INTEGER
  const secondBuiltIn = typeof second.builtInIndex === 'number' ? second.builtInIndex : Number.MAX_SAFE_INTEGER
  return firstBuiltIn - secondBuiltIn
}

function loadStoredQuickCommands(): QuickCommand[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(QUICK_COMMAND_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const seen = new Set(BUILT_IN_QUICK_COMMANDS.map((command) => command.value))
    const commands: QuickCommand[] = []
    for (const row of parsed) {
      const record = asRecord(row)
      const value = normalizeQuickCommandValue(readString(record?.value))
      if (!value) continue
      const builtIn = BUILT_IN_QUICK_COMMANDS.find((command) => command.value === value)
      if (seen.has(value) && !builtIn) continue
      seen.add(value)
      commands.push({
        label: readString(record?.label) || builtIn?.label || value,
        value,
        custom: !builtIn,
        usageCount: readPositiveInteger(record?.usageCount),
        lastUsedAt: readPositiveInteger(record?.lastUsedAt),
        builtInIndex: builtIn?.builtInIndex,
      })
    }
    return commands
  } catch {
    return []
  }
}

function saveStoredQuickCommands(commands: QuickCommand[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    QUICK_COMMAND_STORAGE_KEY,
    JSON.stringify(commands.map((command) => ({
      label: command.label,
      value: command.value,
      custom: command.custom === true,
      usageCount: command.usageCount,
      lastUsedAt: command.lastUsedAt,
    }))),
  )
}

function readPositiveInteger(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value))
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.trunc(parsed))
    }
  }
  return 0
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
</script>

<style scoped>
@reference "tailwindcss";

.thread-terminal-panel {
  @apply overflow-hidden rounded-lg border border-zinc-800 bg-black shadow-lg;
  height: min(34vh, 20rem);
  min-height: 13rem;
}

.thread-terminal-header {
  @apply flex h-9 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-2;
}

.thread-terminal-tabs {
  @apply flex min-w-0 flex-1 items-center gap-1 overflow-x-auto;
}

.thread-terminal-tab {
  @apply flex h-7 min-w-20 max-w-36 shrink-0 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-white;
}

.thread-terminal-tab.is-active {
  @apply border-zinc-700 bg-zinc-800 text-zinc-100;
}

.thread-terminal-dot {
  @apply h-2 w-2 shrink-0 rounded-full bg-zinc-500;
}

.thread-terminal-dot[data-status='attached'] {
  @apply bg-emerald-400;
}

.thread-terminal-dot[data-status='error'] {
  @apply bg-rose-400;
}

.thread-terminal-title {
  @apply truncate;
}

.thread-terminal-actions {
  @apply flex shrink-0 items-center gap-1;
}

.thread-terminal-quick-command {
  @apply h-7 max-w-32 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-300 outline-none transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white focus:border-zinc-600;
}

.thread-terminal-action {
  @apply rounded-md border border-transparent px-2 py-1 text-xs text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white;
}

.thread-terminal-error {
  @apply m-0 border-b border-rose-900 bg-rose-950 px-3 py-1.5 text-xs text-rose-200;
}

.thread-terminal-host {
  @apply h-[calc(100%-2.25rem)] min-h-0 w-full overflow-hidden px-2 py-2;
}

.thread-terminal-panel.is-error .thread-terminal-host {
  @apply h-[calc(100%-4.625rem)];
}

.thread-terminal-host :deep(.xterm) {
  @apply h-full;
}

.thread-terminal-host :deep(.xterm-viewport) {
  @apply bg-black;
}

@media (max-width: 767px) {
  .thread-terminal-panel {
    height: min(28vh, 14rem);
    min-height: 9rem;
  }

  .thread-terminal-header {
    @apply px-1.5;
  }

  .thread-terminal-action {
    @apply px-1.5 text-[11px];
  }

  .thread-terminal-quick-command {
    @apply max-w-24 px-1 text-[11px];
  }

  .thread-terminal-host {
    @apply px-1.5 py-1.5;
  }
}
</style>
