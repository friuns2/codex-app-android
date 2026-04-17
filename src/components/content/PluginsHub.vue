<template>
  <div ref="hubScrollContainer" class="plugins-hub">
    <div class="plugins-hub-header">
      <div>
        <h2 class="plugins-hub-title">Plugins</h2>
        <p class="plugins-hub-subtitle">Manage plugins, apps, and MCP integrations exposed by the official Codex app-server.</p>
      </div>
      <div class="plugins-hub-capability-row">
        <span class="plugins-hub-capability" :class="{ 'is-enabled': pluginMethodsAvailable }">Plugins</span>
        <span class="plugins-hub-capability" :class="{ 'is-enabled': appMethodsAvailable }">Apps</span>
        <span class="plugins-hub-capability" :class="{ 'is-enabled': mcpMethodsAvailable }">MCP</span>
      </div>
    </div>

    <div v-if="toast" class="plugins-hub-toast" :class="toast.type === 'error' ? 'plugins-hub-toast-error' : 'plugins-hub-toast-success'">
      {{ toast.text }}
    </div>

    <div class="plugins-hub-toolbar">
      <div class="plugins-hub-search-wrap">
        <IconTablerSearch class="plugins-hub-search-icon" />
        <input
          v-model="query"
          class="plugins-hub-search"
          type="text"
          placeholder="Search plugins, apps, or MCP servers"
        />
      </div>
      <button class="plugins-hub-button" type="button" :disabled="isRefreshing" @click="refreshActiveTab(true)">
        {{ isRefreshing ? 'Refreshing…' : 'Refresh' }}
      </button>
      <button
        v-if="activeTab === 'mcp'"
        class="plugins-hub-button"
        type="button"
        :disabled="mcpReloading"
        @click="handleReloadMcp"
      >
        {{ mcpReloading ? 'Reloading…' : 'Reload MCP' }}
      </button>
    </div>

    <div class="plugins-hub-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="plugins-hub-tab"
        :class="{ 'is-active': activeTab === tab.value }"
        type="button"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab === 'plugins'" class="plugins-hub-pane">
      <div v-if="!pluginMethodsAvailable" class="plugins-hub-empty">The connected Codex runtime does not expose plugin RPC methods.</div>
      <template v-else>
        <section v-if="filteredInstalledPlugins.length > 0" class="plugins-hub-section">
          <div class="plugins-hub-section-title">Installed ({{ filteredInstalledPlugins.length }})</div>
          <div class="plugins-hub-grid">
            <button
              v-for="plugin in filteredInstalledPlugins"
              :key="plugin.id"
              class="plugins-hub-card"
              type="button"
              @click="openPluginDetail(plugin)"
            >
              <div class="plugins-hub-card-top">
                <div class="plugins-hub-card-avatar" :style="cardAvatarStyle(plugin)">{{ plugin.displayName.slice(0, 1).toUpperCase() }}</div>
                <div class="plugins-hub-card-copy">
                  <div class="plugins-hub-card-title-row">
                    <span class="plugins-hub-card-title">{{ plugin.displayName }}</span>
                    <span class="plugins-hub-card-badge">Installed</span>
                  </div>
                  <span class="plugins-hub-card-meta">{{ plugin.marketplaceName }}<span v-if="plugin.category"> · {{ plugin.category }}</span></span>
                </div>
              </div>
              <p v-if="plugin.shortDescription || plugin.longDescription" class="plugins-hub-card-description">
                {{ plugin.shortDescription || plugin.longDescription }}
              </p>
            </button>
          </div>
        </section>

        <section class="plugins-hub-section">
          <div class="plugins-hub-section-title">Browse Plugins ({{ filteredAvailablePlugins.length }})</div>
          <div v-if="pluginsLoading" class="plugins-hub-loading">Loading plugins…</div>
          <div v-else-if="filteredAvailablePlugins.length === 0" class="plugins-hub-empty">No plugins match the current search.</div>
          <div v-else class="plugins-hub-grid">
            <button
              v-for="plugin in filteredAvailablePlugins"
              :key="plugin.id"
              class="plugins-hub-card"
              type="button"
              @click="openPluginDetail(plugin)"
            >
              <div class="plugins-hub-card-top">
                <div class="plugins-hub-card-avatar" :style="cardAvatarStyle(plugin)">{{ plugin.displayName.slice(0, 1).toUpperCase() }}</div>
                <div class="plugins-hub-card-copy">
                  <div class="plugins-hub-card-title-row">
                    <span class="plugins-hub-card-title">{{ plugin.displayName }}</span>
                    <span class="plugins-hub-card-badge-muted">{{ plugin.installPolicy === 'NOT_AVAILABLE' ? 'Unavailable' : 'Available' }}</span>
                  </div>
                  <span class="plugins-hub-card-meta">{{ plugin.marketplaceName }}<span v-if="plugin.category"> · {{ plugin.category }}</span></span>
                </div>
              </div>
              <p v-if="plugin.shortDescription || plugin.longDescription" class="plugins-hub-card-description">
                {{ plugin.shortDescription || plugin.longDescription }}
              </p>
            </button>
          </div>
        </section>
      </template>
    </div>

    <div v-else-if="activeTab === 'apps'" class="plugins-hub-pane">
      <div v-if="!appMethodsAvailable" class="plugins-hub-empty">The connected Codex runtime does not expose app/list.</div>
      <template v-else>
        <section v-if="filteredConnectedApps.length > 0" class="plugins-hub-section">
          <div class="plugins-hub-section-title">Connected Apps ({{ filteredConnectedApps.length }})</div>
          <div class="plugins-hub-grid">
            <article v-for="app in filteredConnectedApps" :key="app.id" class="plugins-hub-card is-static">
              <div class="plugins-hub-card-top">
                <div class="plugins-hub-card-avatar">{{ app.name.slice(0, 1).toUpperCase() }}</div>
                <div class="plugins-hub-card-copy">
                  <div class="plugins-hub-card-title-row">
                    <span class="plugins-hub-card-title">{{ app.name }}</span>
                    <span class="plugins-hub-card-badge">Connected</span>
                  </div>
                  <span class="plugins-hub-card-meta">{{ app.categories.join(' · ') || 'App' }}</span>
                </div>
              </div>
              <p v-if="app.description" class="plugins-hub-card-description">{{ app.description }}</p>
              <div v-if="app.pluginDisplayNames.length > 0" class="plugins-hub-chip-row">
                <span v-for="name in app.pluginDisplayNames" :key="name" class="plugins-hub-chip">{{ name }}</span>
              </div>
              <button v-if="app.installUrl" class="plugins-hub-inline-link" type="button" @click="openExternal(app.installUrl)">Open</button>
            </article>
          </div>
        </section>

        <section class="plugins-hub-section">
          <div class="plugins-hub-section-title">Available Apps ({{ filteredAvailableApps.length }})</div>
          <div v-if="appsLoading" class="plugins-hub-loading">Loading apps…</div>
          <div v-else-if="filteredAvailableApps.length === 0" class="plugins-hub-empty">No apps match the current search.</div>
          <div v-else class="plugins-hub-grid">
            <article v-for="app in filteredAvailableApps" :key="app.id" class="plugins-hub-card is-static">
              <div class="plugins-hub-card-top">
                <div class="plugins-hub-card-avatar">{{ app.name.slice(0, 1).toUpperCase() }}</div>
                <div class="plugins-hub-card-copy">
                  <div class="plugins-hub-card-title-row">
                    <span class="plugins-hub-card-title">{{ app.name }}</span>
                    <span class="plugins-hub-card-badge-muted">Install in ChatGPT</span>
                  </div>
                  <span class="plugins-hub-card-meta">{{ app.categories.join(' · ') || 'App' }}</span>
                </div>
              </div>
              <p v-if="app.description" class="plugins-hub-card-description">{{ app.description }}</p>
              <div v-if="app.pluginDisplayNames.length > 0" class="plugins-hub-chip-row">
                <span v-for="name in app.pluginDisplayNames" :key="name" class="plugins-hub-chip">{{ name }}</span>
              </div>
              <button v-if="app.installUrl" class="plugins-hub-inline-link" type="button" @click="openExternal(app.installUrl)">Connect</button>
            </article>
          </div>
        </section>
      </template>
    </div>

    <div v-else class="plugins-hub-pane">
      <div v-if="!mcpMethodsAvailable" class="plugins-hub-empty">The connected Codex runtime does not expose MCP status methods.</div>
      <section v-else class="plugins-hub-section">
        <div class="plugins-hub-section-title">Configured MCP Servers ({{ filteredMcpServers.length }})</div>
        <div v-if="mcpLoading" class="plugins-hub-loading">Loading MCP servers…</div>
        <div v-else-if="filteredMcpServers.length === 0" class="plugins-hub-empty">No MCP servers match the current search.</div>
        <div v-else class="plugins-hub-list">
          <article v-for="server in filteredMcpServers" :key="server.name" class="plugins-hub-list-card">
            <div class="plugins-hub-list-main">
              <div class="plugins-hub-card-title-row">
                <span class="plugins-hub-card-title">{{ server.name }}</span>
                <span class="plugins-hub-card-badge-muted">{{ formatAuthStatus(server.authStatus) }}</span>
              </div>
              <p class="plugins-hub-list-meta">
                {{ server.tools.length }} tools · {{ server.resourceCount }} resources · {{ server.resourceTemplateCount }} templates
              </p>
              <div v-if="server.tools.length > 0" class="plugins-hub-chip-row">
                <span v-for="tool in server.tools.slice(0, 6)" :key="tool.name" class="plugins-hub-chip">{{ tool.name }}</span>
              </div>
            </div>
            <button
              v-if="server.authStatus === 'notLoggedIn'"
              class="plugins-hub-inline-link"
              type="button"
              @click="handleConnectMcp(server.name)"
            >
              Connect OAuth
            </button>
          </article>
        </div>
      </section>
    </div>

    <PluginDetailModal
      :visible="detailVisible"
      :plugin="detailPlugin"
      :detail="detailData"
      :detail-loading="detailLoading"
      :is-installing="installingPluginId === detailPlugin.id"
      :is-uninstalling="uninstallingPluginId === detailPlugin.id"
      :post-install-apps="postInstallApps"
      @close="closeDetail"
      @install="handleInstallDetail"
      @uninstall="handleUninstallDetail"
      @open-app="openExternal"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import IconTablerSearch from '../icons/IconTablerSearch.vue'
import PluginDetailModal from './PluginDetailModal.vue'
import {
  getMethodCatalog,
  installPlugin,
  listApps,
  listMcpServers,
  listPlugins,
  normalizeAppListNotification,
  readPluginDetail,
  reloadMcpServers,
  startMcpOauthLogin,
  subscribeCodexNotifications,
  uninstallPlugin,
  type RpcNotification,
  type UiAppInfo,
  type UiMcpServerStatus,
  type UiPluginApp,
  type UiPluginDetail,
  type UiPluginMarketplace,
  type UiPluginSummary,
} from '../../api/codexGateway'

const EMPTY_PLUGIN: UiPluginSummary = {
  id: '',
  name: '',
  marketplaceName: '',
  marketplacePath: '',
  installed: false,
  enabled: false,
  installPolicy: '',
  authPolicy: '',
  displayName: '',
  shortDescription: '',
  longDescription: '',
  developerName: '',
  category: '',
  capabilities: [],
  websiteUrl: '',
  privacyPolicyUrl: '',
  termsOfServiceUrl: '',
  brandColor: '',
  defaultPrompt: [],
}

const emit = defineEmits<{
  'skills-changed': []
}>()

const tabs = [
  { value: 'plugins', label: 'Plugins' },
  { value: 'apps', label: 'Apps' },
  { value: 'mcp', label: 'MCP' },
] as const

const activeTab = ref<(typeof tabs)[number]['value']>('plugins')
const query = ref('')
const hubScrollContainer = ref<HTMLElement | null>(null)
const methods = ref<string[]>([])
const pluginsLoading = ref(false)
const appsLoading = ref(false)
const mcpLoading = ref(false)
const isRefreshing = ref(false)
const mcpReloading = ref(false)
const marketplaces = ref<UiPluginMarketplace[]>([])
const apps = ref<UiAppInfo[]>([])
const mcpServers = ref<UiMcpServerStatus[]>([])
const toast = ref<{ text: string; type: 'success' | 'error' } | null>(null)
const detailVisible = ref(false)
const detailPlugin = ref<UiPluginSummary>(EMPTY_PLUGIN)
const detailData = ref<UiPluginDetail | null>(null)
const detailLoading = ref(false)
const installingPluginId = ref('')
const uninstallingPluginId = ref('')
const postInstallApps = ref<UiPluginApp[]>([])
let toastTimer: ReturnType<typeof setTimeout> | null = null
let stopNotifications: (() => void) | null = null

const pluginMethodsAvailable = computed(() => methods.value.includes('plugin/list') && methods.value.includes('plugin/read'))
const appMethodsAvailable = computed(() => methods.value.includes('app/list'))
const mcpMethodsAvailable = computed(() => methods.value.includes('mcpServerStatus/list'))
const plugins = computed(() => marketplaces.value.flatMap((marketplace) => marketplace.plugins))

const pluginQuery = computed(() => query.value.trim().toLowerCase())
const filteredInstalledPlugins = computed(() =>
  plugins.value.filter((plugin) => plugin.installed && matchesPlugin(plugin, pluginQuery.value)),
)
const filteredAvailablePlugins = computed(() =>
  plugins.value.filter((plugin) => !plugin.installed && matchesPlugin(plugin, pluginQuery.value)),
)
const filteredConnectedApps = computed(() =>
  apps.value.filter((app) => app.isAccessible && matchesApp(app, pluginQuery.value)),
)
const filteredAvailableApps = computed(() =>
  apps.value.filter((app) => !app.isAccessible && matchesApp(app, pluginQuery.value)),
)
const filteredMcpServers = computed(() =>
  mcpServers.value.filter((server) => matchesMcp(server, pluginQuery.value)),
)

function showToast(text: string, type: 'success' | 'error' = 'success'): void {
  toast.value = { text, type }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 3200)
}

function matchesPlugin(plugin: UiPluginSummary, q: string): boolean {
  if (!q) return true
  return [
    plugin.displayName,
    plugin.name,
    plugin.marketplaceName,
    plugin.category,
    plugin.shortDescription,
    plugin.longDescription,
    ...plugin.capabilities,
  ].some((value) => value.toLowerCase().includes(q))
}

function matchesApp(app: UiAppInfo, q: string): boolean {
  if (!q) return true
  return [
    app.name,
    app.description,
    app.distributionChannel,
    ...app.categories,
    ...app.pluginDisplayNames,
  ].some((value) => value.toLowerCase().includes(q))
}

function matchesMcp(server: UiMcpServerStatus, q: string): boolean {
  if (!q) return true
  if (server.name.toLowerCase().includes(q)) return true
  return server.tools.some((tool) =>
    tool.name.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q),
  )
}

function cardAvatarStyle(plugin: UiPluginSummary): Record<string, string> | undefined {
  if (!plugin.brandColor) return undefined
  return { backgroundColor: plugin.brandColor }
}

async function loadCapabilities(): Promise<void> {
  methods.value = await getMethodCatalog()
}

async function fetchPlugins(forceRemoteSync = false): Promise<void> {
  if (!pluginMethodsAvailable.value) return
  pluginsLoading.value = true
  try {
    marketplaces.value = await listPlugins([], forceRemoteSync)
  } finally {
    pluginsLoading.value = false
  }
}

async function fetchApps(forceRefetch = false): Promise<void> {
  if (!appMethodsAvailable.value) return
  appsLoading.value = true
  try {
    apps.value = await listApps({ limit: 120, forceRefetch })
  } finally {
    appsLoading.value = false
  }
}

function sameApps(left: UiAppInfo[], right: UiAppInfo[]): boolean {
  if (left.length !== right.length) return false
  return left.every((app, index) => {
    const next = right[index]
    return next
      && app.id === next.id
      && app.name === next.name
      && app.description === next.description
      && app.installUrl === next.installUrl
      && app.logoUrl === next.logoUrl
      && app.logoUrlDark === next.logoUrlDark
      && app.distributionChannel === next.distributionChannel
      && app.isAccessible === next.isAccessible
      && app.isEnabled === next.isEnabled
      && app.categories.join('\u0000') === next.categories.join('\u0000')
      && app.pluginDisplayNames.join('\u0000') === next.pluginDisplayNames.join('\u0000')
  })
}

async function applyAppsUpdate(nextApps: UiAppInfo[], preserveScroll = false): Promise<void> {
  if (sameApps(apps.value, nextApps)) return
  const container = preserveScroll ? hubScrollContainer.value : null
  const scrollTop = container?.scrollTop ?? 0
  apps.value = nextApps
  if (!container) return
  await nextTick()
  container.scrollTop = scrollTop
}

async function fetchMcp(): Promise<void> {
  if (!mcpMethodsAvailable.value) return
  mcpLoading.value = true
  try {
    mcpServers.value = await listMcpServers()
  } finally {
    mcpLoading.value = false
  }
}

async function refreshActiveTab(force = false): Promise<void> {
  isRefreshing.value = true
  try {
    if (activeTab.value === 'plugins') {
      await fetchPlugins(force)
    } else if (activeTab.value === 'apps') {
      await fetchApps(force)
    } else {
      await fetchMcp()
    }
  } finally {
    isRefreshing.value = false
  }
}

async function openPluginDetail(plugin: UiPluginSummary): Promise<void> {
  detailPlugin.value = plugin
  detailVisible.value = true
  detailLoading.value = true
  postInstallApps.value = []
  detailData.value = await readPluginDetail(plugin.marketplacePath, plugin.name)
  detailLoading.value = false
}

function closeDetail(): void {
  detailVisible.value = false
  detailData.value = null
  postInstallApps.value = []
}

async function handleInstallDetail(): Promise<void> {
  const plugin = detailPlugin.value
  if (!plugin.id) return
  installingPluginId.value = plugin.id
  try {
    const result = await installPlugin(plugin.marketplacePath, plugin.name)
    if (!result) {
      showToast('Failed to install plugin', 'error')
      return
    }
    postInstallApps.value = result.appsNeedingAuth
    showToast(
      result.appsNeedingAuth.length > 0
        ? `${plugin.displayName} installed. Finish connector auth to use it.`
        : `${plugin.displayName} installed.`,
    )
    await Promise.all([fetchPlugins(), fetchApps(true)])
    detailData.value = await readPluginDetail(plugin.marketplacePath, plugin.name)
    const nextPlugin = plugins.value.find((entry) => entry.id === plugin.id)
    if (nextPlugin) detailPlugin.value = nextPlugin
    emit('skills-changed')
  } finally {
    installingPluginId.value = ''
  }
}

async function handleUninstallDetail(): Promise<void> {
  const plugin = detailPlugin.value
  if (!plugin.id) return
  uninstallingPluginId.value = plugin.id
  try {
    const ok = await uninstallPlugin(plugin.id)
    if (!ok) {
      showToast('Failed to uninstall plugin', 'error')
      return
    }
    showToast(`${plugin.displayName} uninstalled.`)
    await Promise.all([fetchPlugins(), fetchApps(true)])
    closeDetail()
    emit('skills-changed')
  } finally {
    uninstallingPluginId.value = ''
  }
}

async function handleReloadMcp(): Promise<void> {
  mcpReloading.value = true
  try {
    const ok = await reloadMcpServers()
    if (!ok) {
      showToast('Failed to reload MCP config', 'error')
      return
    }
    showToast('Reloaded MCP config.')
    await fetchMcp()
  } finally {
    mcpReloading.value = false
  }
}

async function handleConnectMcp(serverName: string): Promise<void> {
  const popup = window.open('', '_blank', 'noopener,noreferrer')
  const authorizationUrl = await startMcpOauthLogin(serverName)
  if (!authorizationUrl) {
    popup?.close()
    showToast(`Failed to start OAuth for ${serverName}`, 'error')
    return
  }
  if (popup) {
    popup.location.href = authorizationUrl
  } else {
    window.open(authorizationUrl, '_blank', 'noopener,noreferrer')
  }
  showToast(`Opened OAuth flow for ${serverName}.`)
}

function openExternal(url: string): void {
  const normalized = url.trim()
  if (!normalized) return
  window.open(normalized, '_blank', 'noopener,noreferrer')
}

function formatAuthStatus(value: string): string {
  if (value === 'notLoggedIn') return 'Not logged in'
  if (value === 'bearerToken') return 'Bearer token'
  if (value === 'oAuth') return 'OAuth connected'
  return 'Unsupported'
}

function handleNotification(notification: RpcNotification): void {
  if (notification.method === 'app/list/updated') {
    const nextApps = normalizeAppListNotification(notification.params)
    void applyAppsUpdate(nextApps, activeTab.value === 'apps')
    return
  }
  if (notification.method === 'mcpServer/oauthLogin/completed') {
    const params = notification.params as { name?: string; success?: boolean; error?: string } | null
    if (params?.success) {
      showToast(`${params.name || 'MCP server'} connected.`)
    } else if (params?.error) {
      showToast(params.error, 'error')
    }
    void fetchMcp()
  }
}

onMounted(async () => {
  await loadCapabilities()
  await Promise.all([fetchPlugins(), fetchApps(), fetchMcp()])
  stopNotifications = subscribeCodexNotifications(handleNotification)
})

onBeforeUnmount(() => {
  stopNotifications?.()
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<style scoped>
@reference "tailwindcss";

.plugins-hub {
  @apply mx-auto flex h-full w-full max-w-6xl flex-col gap-4 overflow-y-auto p-3 sm:p-6;
  overscroll-behavior-y: contain;
}

.plugins-hub-header {
  @apply flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between;
}

.plugins-hub-title {
  @apply m-0 text-2xl font-semibold text-zinc-900;
}

.plugins-hub-subtitle {
  @apply m-0 text-sm text-zinc-500;
}

.plugins-hub-capability-row {
  @apply flex flex-wrap gap-2;
}

.plugins-hub-capability {
  @apply rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500;
}

.plugins-hub-capability.is-enabled {
  @apply border-emerald-200 bg-emerald-50 text-emerald-700;
}

.plugins-hub-toast {
  @apply rounded-2xl border px-3 py-2 text-sm font-medium;
}

.plugins-hub-toast-success {
  @apply border-emerald-200 bg-emerald-50 text-emerald-700;
}

.plugins-hub-toast-error {
  @apply border-rose-200 bg-rose-50 text-rose-700;
}

.plugins-hub-toolbar {
  @apply flex flex-col gap-2 md:flex-row;
}

.plugins-hub-search-wrap {
  @apply flex flex-1 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2;
}

.plugins-hub-search-icon {
  @apply h-4 w-4 text-zinc-400;
}

.plugins-hub-search {
  @apply w-full border-none bg-transparent p-0 text-sm text-zinc-800 outline-none;
}

.plugins-hub-button {
  @apply inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60;
}

.plugins-hub-tabs {
  @apply flex flex-wrap gap-2;
}

.plugins-hub-tab {
  @apply rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50;
}

.plugins-hub-tab.is-active {
  @apply border-zinc-900 bg-zinc-900 text-white;
}

.plugins-hub-pane {
  @apply flex flex-col gap-5 pb-2;
}

.plugins-hub-section {
  @apply flex flex-col gap-3;
}

.plugins-hub-section-title {
  @apply text-sm font-semibold text-zinc-900;
}

.plugins-hub-grid {
  @apply grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3;
}

.plugins-hub-card {
  @apply flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300 hover:shadow-sm;
}

.plugins-hub-card.is-static {
  @apply cursor-default;
}

.plugins-hub-card-top {
  @apply flex items-start gap-3;
}

.plugins-hub-card-avatar {
  @apply flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-sm font-semibold text-white;
}

.plugins-hub-card-copy {
  @apply min-w-0 flex-1;
}

.plugins-hub-card-title-row {
  @apply flex flex-wrap items-center gap-2;
}

.plugins-hub-card-title {
  @apply text-sm font-semibold text-zinc-900;
}

.plugins-hub-card-meta {
  @apply text-xs text-zinc-500;
}

.plugins-hub-card-badge {
  @apply rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700;
}

.plugins-hub-card-badge-muted {
  @apply rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500;
}

.plugins-hub-card-description {
  @apply m-0 text-sm leading-6 text-zinc-600;
}

.plugins-hub-chip-row {
  @apply flex flex-wrap gap-2;
}

.plugins-hub-chip {
  @apply rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-600;
}

.plugins-hub-inline-link {
  @apply inline-flex w-fit items-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50;
}

.plugins-hub-list {
  @apply flex flex-col gap-3;
}

.plugins-hub-list-card {
  @apply flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between;
}

.plugins-hub-list-main {
  @apply min-w-0;
}

.plugins-hub-list-meta {
  @apply m-1.5 mb-0 text-sm text-zinc-500;
}

.plugins-hub-loading,
.plugins-hub-empty {
  @apply rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500;
}
</style>
