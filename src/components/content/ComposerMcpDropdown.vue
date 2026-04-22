<template>
  <div ref="rootRef" class="mcp-dropdown">
    <button
      class="mcp-dropdown-trigger"
      type="button"
      :disabled="disabled"
      @click="onToggle"
    >
      <span class="mcp-dropdown-value">MCP</span>
      <span v-if="enabledCount > 0" class="mcp-dropdown-badge">{{ enabledCount }}</span>
      <IconTablerChevronDown class="mcp-dropdown-chevron" />
    </button>

    <div
      v-if="isOpen"
      class="mcp-dropdown-menu"
      :class="{ 'mcp-dropdown-menu-up': openDirection === 'up' }"
    >
      <div v-if="isLoading" class="mcp-dropdown-loading">{{ $t('common.loading') }}...</div>
      <div v-else-if="servers.length === 0" class="mcp-dropdown-empty">{{ $t('composer.noMcpServers') }}</div>
      <template v-else>
        <label
          v-for="server in servers"
          :key="server.name"
          class="mcp-dropdown-option"
        >
          <input
            class="mcp-dropdown-checkbox"
            type="checkbox"
            :checked="server.enabled"
            :disabled="togglingName === server.name"
            @change="onToggleServer(server)"
          />
          <span class="mcp-dropdown-name">{{ server.name }}</span>
          <span v-if="togglingName === server.name" class="mcp-dropdown-spinner" />
        </label>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Dropdown for toggling MCP servers on/off.
 * Reads server list from config, toggles enabled state via config/batchWrite + mcpServer/reload.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { listMcpServers, setMcpServerEnabled, type McpServerEntry } from '../../api/codexGateway'
import IconTablerChevronDown from '../icons/IconTablerChevronDown.vue'

defineProps<{
  disabled?: boolean
  openDirection?: 'up' | 'down'
}>()

const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const isLoading = ref(false)
const servers = ref<McpServerEntry[]>([])
const togglingName = ref('')

const enabledCount = computed(() => servers.value.filter((s) => s.enabled).length)

async function fetchServers(): Promise<void> {
  isLoading.value = true
  try {
    servers.value = await listMcpServers()
  } catch {
    servers.value = []
  } finally {
    isLoading.value = false
  }
}

function onToggle(): void {
  isOpen.value = !isOpen.value
  if (isOpen.value) void fetchServers()
}

async function onToggleServer(server: McpServerEntry): Promise<void> {
  togglingName.value = server.name
  try {
    const next = !server.enabled
    await setMcpServerEnabled(server.name, next)
    server.enabled = next
  } catch {
    // revert visually on failure by re-fetching
    await fetchServers()
  } finally {
    togglingName.value = ''
  }
}

function onDocumentPointerDown(event: PointerEvent): void {
  if (!isOpen.value) return
  const root = rootRef.value
  if (!root) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (root.contains(target)) return
  isOpen.value = false
}

onMounted(() => {
  window.addEventListener('pointerdown', onDocumentPointerDown)
  void fetchServers()
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onDocumentPointerDown)
})
</script>

<style scoped>
@reference "tailwindcss";

.mcp-dropdown {
  @apply relative inline-flex min-w-0;
}

.mcp-dropdown-trigger {
  @apply inline-flex min-h-7 min-w-0 items-center gap-1 border-0 bg-transparent px-0 py-0.5 text-sm leading-tight text-zinc-500 outline-none transition hover:text-zinc-800 cursor-pointer;
}

.mcp-dropdown-trigger:disabled {
  @apply cursor-not-allowed text-zinc-500;
}

.mcp-dropdown-value {
  @apply whitespace-nowrap text-left pb-px;
}

.mcp-dropdown-badge {
  @apply inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-medium text-white leading-none;
}

.mcp-dropdown-chevron {
  @apply mt-px h-3.5 w-3.5 shrink-0 text-zinc-500;
}

.mcp-dropdown-menu {
  @apply absolute left-0 z-50 min-w-56 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg;
  top: calc(100% + 8px);
}

.mcp-dropdown-menu-up {
  top: auto;
  bottom: calc(100% + 8px);
}

.mcp-dropdown-loading,
.mcp-dropdown-empty {
  @apply px-2 py-2 text-xs text-zinc-400 text-center;
}

.mcp-dropdown-option {
  @apply flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 cursor-pointer;
}

.mcp-dropdown-checkbox {
  @apply h-3.5 w-3.5 shrink-0 accent-emerald-600;
}

.mcp-dropdown-name {
  @apply flex-1 min-w-0 truncate;
}

.mcp-dropdown-spinner {
  @apply h-3 w-3 shrink-0 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin;
}
</style>
