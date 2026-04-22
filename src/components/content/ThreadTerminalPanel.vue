<template>
  <section class="thread-terminal-panel" :class="{ 'is-error': Boolean(errorMessage) }">
    <header class="thread-terminal-header">
      <div class="thread-terminal-tabs">
        <button class="thread-terminal-tab" type="button" :title="terminalTitle">
          <span class="thread-terminal-dot" :data-status="terminalStatus" />
          <span class="thread-terminal-title">{{ terminalTitle }}</span>
        </button>
      </div>
      <div class="thread-terminal-actions">
        <button class="thread-terminal-action" type="button" title="New terminal" @click="onNewTerminal">
          New terminal
        </button>
        <button class="thread-terminal-action" type="button" title="Hide terminal" @click="$emit('hide')">
          Hide
        </button>
        <button class="thread-terminal-action" type="button" title="Close" @click="onCloseTerminal">
          Close
        </button>
      </div>
    </header>
    <p v-if="errorMessage" class="thread-terminal-error">{{ errorMessage }}</p>
    <div ref="terminalHostRef" class="thread-terminal-host" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
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

const terminalHostRef = ref<HTMLElement | null>(null)
const sessionId = ref('')
const shellLabel = ref('terminal')
const errorMessage = ref('')
const isAttached = ref(false)

let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null
let unsubscribeNotifications: (() => void) | null = null
let resizeFrame = 0

const terminalStatus = computed(() => {
  if (errorMessage.value) return 'error'
  return isAttached.value ? 'attached' : 'connecting'
})

const terminalTitle = computed(() => {
  if (shellLabel.value && shellLabel.value !== 'terminal') return shellLabel.value
  return 'Terminal'
})

onMounted(() => {
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
    if (!sessionId.value) return
    void sendThreadTerminalInput(sessionId.value, data).catch((error: unknown) => {
      errorMessage.value = error instanceof Error ? error.message : 'Terminal input failed'
    })
  })

  resizeObserver = new ResizeObserver(() => {
    scheduleFitAndResize()
  })
  resizeObserver.observe(terminalHostRef.value)
  scheduleFitAndResize()
}

async function attachToThread(newSession: boolean): Promise<void> {
  if (!props.threadId || !props.cwd || !terminal) return
  errorMessage.value = ''
  isAttached.value = false
  await nextTick()
  fitTerminal()
  try {
    const session = await attachThreadTerminal({
      threadId: props.threadId,
      cwd: props.cwd,
      sessionId: newSession ? undefined : sessionId.value || undefined,
      cols: terminal.cols,
      rows: terminal.rows,
      newSession,
    })
    sessionId.value = session.id
    shellLabel.value = session.shell || 'terminal'
    if (newSession) {
      terminal.clear()
    }
    isAttached.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Terminal attach failed'
  }
}

function handleNotification(notification: RpcNotification): void {
  const params = asRecord(notification.params)
  const notificationSessionId = readString(params?.sessionId)
  if (!notificationSessionId || notificationSessionId !== sessionId.value || !terminal) return

  if (notification.method === 'terminal-attached') {
    shellLabel.value = readString(params?.shell) || shellLabel.value
    isAttached.value = true
    return
  }
  if (notification.method === 'terminal-init-log') {
    terminal.clear()
    terminal.write(readString(params?.log) || '')
    return
  }
  if (notification.method === 'terminal-data') {
    terminal.write(readString(params?.data) || '')
    return
  }
  if (notification.method === 'terminal-exit') {
    isAttached.value = false
    terminal.writeln('')
    terminal.writeln('[terminal exited]')
    return
  }
  if (notification.method === 'terminal-error') {
    errorMessage.value = readString(params?.message) || 'Terminal error'
  }
}

function onNewTerminal(): void {
  void attachToThread(true)
}

function onCloseTerminal(): void {
  const currentSessionId = sessionId.value
  sessionId.value = ''
  isAttached.value = false
  terminal?.clear()
  if (currentSessionId) {
    void closeThreadTerminal(currentSessionId).catch((error: unknown) => {
      errorMessage.value = error instanceof Error ? error.message : 'Terminal close failed'
    })
  }
  emit('hide')
}

function scheduleFitAndResize(): void {
  if (resizeFrame) return
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = 0
    fitTerminal()
    if (terminal && sessionId.value) {
      void resizeThreadTerminal(sessionId.value, terminal.cols, terminal.rows).catch(() => {})
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
  @apply min-w-0 flex-1;
}

.thread-terminal-tab {
  @apply flex h-7 min-w-0 max-w-full items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-200;
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

  .thread-terminal-host {
    @apply px-1.5 py-1.5;
  }
}
</style>
