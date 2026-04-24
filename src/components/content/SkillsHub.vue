<template>
  <div class="skills-hub">
    <div class="skills-hub-header">
      <h2 class="skills-hub-title">{{ t('Skills Hub') }}</h2>
      <p class="skills-hub-subtitle">{{ t('Browse and discover skills from the OpenClaw community') }}</p>
    </div>

    <div class="skills-sync-panel">
      <div class="skills-sync-header">
        <strong>{{ t('Skills Sync (GitHub)') }}</strong>
        <a
          v-if="syncStatus.configured && githubRepoUrl"
          class="skills-sync-badge skills-sync-badge-link"
          :href="githubRepoUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('Connected') }}: {{ syncStatus.repoOwner }}/{{ syncStatus.repoName }}
        </a>
        <span v-else-if="syncStatus.loggedIn" class="skills-sync-badge">{{ t('Logged in as') }} {{ syncStatus.githubUsername }}</span>
        <span v-else class="skills-sync-badge">{{ t('Not connected') }}</span>
      </div>
      <div class="skills-sync-meta">
        <span>{{ t('Startup') }}: {{ syncStatus.startup.mode }}</span>
        <span>{{ t('Branch') }}: {{ syncStatus.startup.branch }}</span>
        <span>{{ t('Action') }}: {{ syncStatus.startup.lastAction }}</span>
      </div>
      <div v-if="syncStatus.startup.lastError" class="skills-sync-error">
        {{ syncStatus.startup.lastError }}
      </div>
      <div v-if="syncActionStatus" class="skills-sync-meta">
        <span>{{ t('Manual sync') }}: {{ syncActionStatus }}</span>
      </div>
      <div v-if="syncActionError" class="skills-sync-error">
        {{ syncActionError }}
      </div>
      <div v-if="deviceLogin" class="skills-sync-device">
        <span>{{ t('Open') }} <a :href="deviceLogin.verification_uri" target="_blank" rel="noreferrer">{{ t('GitHub device login') }}</a> {{ t('and enter code:') }}</span>
        <code>{{ deviceLogin.user_code }}</code>
      </div>
      <div class="skills-sync-actions">
        <button v-if="!syncStatus.loggedIn" class="skills-hub-sort" type="button" @click="startGithubFirebaseLogin">{{ t('Login with GitHub') }}</button>
        <button v-if="!syncStatus.loggedIn" class="skills-hub-sort" type="button" @click="startGithubLogin">{{ t('Device Login') }}</button>
        <button v-if="syncStatus.loggedIn" class="skills-hub-sort" type="button" @click="logoutGithub" :disabled="isSyncActionInFlight">{{ t('Logout GitHub') }}</button>
        <button class="skills-hub-sort" type="button" @click="startupSkillsSync" :disabled="isSyncActionInFlight">{{ isStartupSyncInFlight ? t('Syncing...') : t('Startup Sync') }}</button>
        <button class="skills-hub-sort" type="button" @click="pullSkillsSync" :disabled="isSyncActionInFlight">{{ isPullInFlight ? t('Pulling...') : t('Pull') }}</button>
        <button v-if="syncStatus.loggedIn" class="skills-hub-sort" type="button" @click="pushSkillsSync" :disabled="!syncStatus.configured || isSyncActionInFlight">{{ isPushInFlight ? t('Pushing...') : t('Push') }}</button>
      </div>
    </div>

    <div v-if="toast" class="skills-hub-toast" :class="toastClass">{{ toast.text }}</div>

    <div v-if="filteredInstalled.length > 0" class="skills-hub-section">
      <button class="skills-hub-section-toggle" type="button" @click="isInstalledOpen = !isInstalledOpen">
        <span class="skills-hub-section-title">{{ t('Installed ({count})', { count: filteredInstalled.length }) }}</span>
        <IconTablerChevronRight class="skills-hub-section-chevron" :class="{ 'is-open': isInstalledOpen }" />
      </button>
      <div v-if="isInstalledOpen" class="skills-hub-grid">
        <SkillCard
          v-for="skill in filteredInstalled"
          :key="skill.name"
          :skill="skill"
          @select="(skill) => openDetail(skill as HubSkill)"
        />
      </div>
    </div>

    <div class="skills-hub-toolbar">
      <div class="skills-hub-search-wrap">
        <IconTablerSearch class="skills-hub-search-icon" />
        <input
          ref="searchRef"
          v-model="query"
          class="skills-hub-search"
          type="text"
          :placeholder="t('Search skills... (e.g. flight, docker, react)')"
          @keyup.enter.prevent="onSearchSubmit"
        />
        <button class="skills-hub-search-btn" type="button" @click="onSearchSubmit">{{ t('Search') }}</button>
        <span v-if="totalCount > 0" class="skills-hub-count">{{ t('{count} skills', { count: totalCount }) }}</span>
      </div>
      <button class="skills-hub-sort" type="button" @click="toggleSort">
        {{ sortLabel }}
      </button>
    </div>

    <div class="skills-hub-section">
      <div v-if="isLoading" class="skills-hub-loading">{{ t('Loading skills...') }}</div>
      <div v-else-if="error" class="skills-hub-error">{{ error }}</div>
      <template v-else>
        <div v-if="browseSkills.length > 0" class="skills-hub-grid">
          <SkillCard
            v-for="skill in browseSkills"
            :key="skill.url"
            :skill="skill"
            @select="(skill) => openDetail(skill as HubSkill)"
          />
        </div>
        <div v-else-if="activeQuery.trim()" class="skills-hub-empty">{{ t('No skills found for "{query}"', { query: activeQuery }) }}</div>
      </template>
    </div>

    <SkillDetailModal
      :skill="detailSkill"
      :visible="isDetailOpen"
      :is-installing="isDetailInstalling"
      :is-uninstalling="isDetailUninstalling"
      :is-trying="props.tryInFlightKey === skillTryKey(detailSkill)"
      @close="isDetailOpen = false"
      @install="handleInstall"
      @uninstall="handleUninstall"
      @toggle-enabled="handleToggleEnabled"
      @try="handleTrySkill"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import IconTablerSearch from '../icons/IconTablerSearch.vue'
import IconTablerChevronRight from '../icons/IconTablerChevronRight.vue'
import SkillCard from './SkillCard.vue'
import SkillDetailModal, { type HubSkill } from './SkillDetailModal.vue'
import { useGithubSkillsSync } from '../../composables/useGithubSkillsSync'
import { useUiLanguage } from '../../composables/useUiLanguage'

const EMPTY_SKILL: HubSkill = { name: '', owner: '', description: '', url: '', installed: false }
const SKILLS_HUB_CACHE_KEY = 'codex-web-local.skills-hub.cache.v1'
type SkillsHubPayload = { data: HubSkill[]; installed?: HubSkill[]; total: number }

const searchRef = ref<HTMLInputElement | null>(null)
const query = ref('')
const activeQuery = ref('')
const sortMode = ref<'date' | 'name'>('date')
const browseSkills = ref<HubSkill[]>([])
const installedSkills = ref<HubSkill[]>([])
const totalCount = ref(0)
const isLoading = ref(false)
const error = ref('')
const isInstalledOpen = ref(true)
const isDetailOpen = ref(false)
const detailSkill = ref<HubSkill>(EMPTY_SKILL)
const toast = ref<{ text: string; type: 'success' | 'error' } | null>(null)
const actionSkillKey = ref('')
const isInstallActionInFlight = ref(false)
const isUninstallActionInFlight = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null
const { t } = useUiLanguage()

const props = defineProps<{
  tryInFlightKey?: string
}>()

const emit = defineEmits<{
  'skills-changed': []
  'try-item': [payload: { kind: 'skill'; name: string; displayName: string; skillPath?: string }]
}>()

const sortLabel = computed(() => sortMode.value === 'date' ? t('Newest') : t('A-Z'))
const toastClass = computed(() => toast.value?.type === 'error' ? 'skills-hub-toast-error' : 'skills-hub-toast-success')
const currentDetailSkillKey = computed(() => `${detailSkill.value.owner}/${detailSkill.value.name}`)
const isDetailInstalling = computed(() =>
  isInstallActionInFlight.value && actionSkillKey.value === currentDetailSkillKey.value,
)
const isDetailUninstalling = computed(() =>
  isUninstallActionInFlight.value && actionSkillKey.value === currentDetailSkillKey.value,
)
const githubRepoUrl = computed(() => {
  if (!syncStatus.value.configured) return ''
  const owner = syncStatus.value.repoOwner.trim()
  const repo = syncStatus.value.repoName.trim()
  if (!owner || !repo) return ''
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
})
const filteredInstalled = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return installedSkills.value
  return installedSkills.value.filter((s) =>
    s.name.toLowerCase().includes(q) ||
    s.owner.toLowerCase().includes(q) ||
    (s.displayName ?? '').toLowerCase().includes(q),
  )
})

function showToast(text: string, type: 'success' | 'error' = 'success'): void {
  toast.value = { text, type }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 3000)
}

function toggleSort(): void {
  sortMode.value = sortMode.value === 'date' ? 'name' : 'date'
  void fetchSkills(activeQuery.value)
}

function cacheKey(q: string): string {
  return `${sortMode.value}::${q.trim().toLowerCase()}`
}

function readCache(key: string): SkillsHubPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SKILLS_HUB_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { byKey?: Record<string, SkillsHubPayload> }
    return parsed.byKey?.[key] ?? null
  } catch {
    return null
  }
}

function writeCache(key: string, payload: SkillsHubPayload): void {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(SKILLS_HUB_CACHE_KEY)
    const parsed = raw ? (JSON.parse(raw) as { byKey?: Record<string, SkillsHubPayload> }) : {}
    const byKey = parsed.byKey ?? {}
    byKey[key] = payload
    window.localStorage.setItem(SKILLS_HUB_CACHE_KEY, JSON.stringify({ byKey }))
  } catch {
    // best-effort cache
  }
}

function clearCache(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SKILLS_HUB_CACHE_KEY)
  } catch {
    // best-effort cache cleanup
  }
}

function applySkillsPayload(payload: SkillsHubPayload): void {
  const inst = payload.installed ?? []
  installedSkills.value = inst
  const installedNames = new Set(inst.map((s) => s.name))
  browseSkills.value = payload.data
    .map((s) => {
      if (s.installed || installedNames.has(s.name)) {
        const local = inst.find((i) => i.name === s.name)
        return { ...s, installed: true, path: local?.path ?? s.path, enabled: local?.enabled ?? s.enabled }
      }
      return s
    })
    .filter((s) => !s.installed)
  totalCount.value = payload.total
}

async function fetchSkills(q: string): Promise<void> {
  const normalizedQuery = q.trim()
  activeQuery.value = normalizedQuery
  const key = cacheKey(normalizedQuery)
  const cached = readCache(key)
  if (cached) {
    applySkillsPayload(cached)
  }
  isLoading.value = !cached
  error.value = ''
  try {
    const params = new URLSearchParams()
    if (normalizedQuery) params.set('q', normalizedQuery)
    params.set('limit', '100')
    params.set('sort', sortMode.value)
    const resp = await fetch(`/codex-api/skills-hub?${params}`)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = (await resp.json()) as SkillsHubPayload
    applySkillsPayload(data)
    writeCache(key, data)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load skills'
  } finally {
    isLoading.value = false
  }
}

function onSearchSubmit(): void {
  void fetchSkills(query.value)
}

function openDetail(skill: HubSkill): void {
  detailSkill.value = skill
  isDetailOpen.value = true
}

async function handleInstall(skill: HubSkill): Promise<void> {
  actionSkillKey.value = `${skill.owner}/${skill.name}`
  isInstallActionInFlight.value = true
  try {
    const resp = await fetch('/codex-api/skills-hub/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: skill.owner, name: skill.name }),
    })
    const data = (await resp.json()) as { ok?: boolean; error?: string; path?: string }
    if (!data.ok) throw new Error(data.error || 'Install failed')
    const installed = { ...skill, installed: true, path: data.path, enabled: true }
    installedSkills.value = [...installedSkills.value, installed]
    browseSkills.value = browseSkills.value.filter((s) => s.name !== skill.name)
    detailSkill.value = installed
    showToast(`${skill.displayName || skill.name} skill installed`)
    isDetailOpen.value = false
    clearCache()
    emit('skills-changed')
  } catch (e) {
    showToast(e instanceof Error ? e.message : 'Failed to install skill', 'error')
  } finally {
    isInstallActionInFlight.value = false
  }
}

async function handleUninstall(skill: HubSkill): Promise<void> {
  actionSkillKey.value = `${skill.owner}/${skill.name}`
  isUninstallActionInFlight.value = true
  try {
    const resp = await fetch('/codex-api/skills-hub/uninstall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: skill.name, path: skill.path }),
    })
    const data = (await resp.json()) as { ok?: boolean; error?: string }
    if (!data.ok) throw new Error(data.error || 'Uninstall failed')
    installedSkills.value = installedSkills.value.filter((s) => s.name !== skill.name)
    if (skill.owner !== 'local') {
      browseSkills.value = [...browseSkills.value, { ...skill, installed: false, path: undefined, enabled: undefined }]
    }
    showToast(`${skill.displayName || skill.name} skill uninstalled`)
    isDetailOpen.value = false
    clearCache()
    emit('skills-changed')
  } catch (e) {
    showToast(e instanceof Error ? e.message : 'Failed to uninstall skill', 'error')
  } finally {
    isUninstallActionInFlight.value = false
  }
}

async function handleToggleEnabled(skill: HubSkill, enabled: boolean): Promise<void> {
  try {
    const resp = await fetch('/codex-api/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'skills/config/write', params: { path: skill.path, enabled } }),
    })
    if (!resp.ok) throw new Error('Failed to update skill')
    await fetch('/codex-api/skills-sync/push', { method: 'POST' })
    showToast(`${skill.displayName || skill.name} skill ${enabled ? 'enabled' : 'disabled'}`)
    await fetchSkills(activeQuery.value)
  } catch (e) {
    showToast(e instanceof Error ? e.message : 'Failed to update skill', 'error')
  }
}

function handleTrySkill(skill: HubSkill): void {
  if (!skill.installed || skill.enabled === false) return
  if (props.tryInFlightKey) return
  emit('try-item', {
    kind: 'skill',
    name: skill.name,
    displayName: skill.displayName || skill.name,
    skillPath: skill.path,
  })
  isDetailOpen.value = false
}

function skillTryKey(skill: HubSkill): string {
  return `skill:${skill.name}:${skill.path ?? ''}`
}

const {
  deviceLogin,
  isPullInFlight,
  isPushInFlight,
  isStartupSyncInFlight,
  isSyncActionInFlight,
  loadSyncStatus,
  logoutGithub,
  pullSkillsSync,
  pushSkillsSync,
  startupSkillsSync,
  startGithubFirebaseLogin,
  startGithubLogin,
  syncActionError,
  syncActionStatus,
  syncStatus,
} = useGithubSkillsSync({
  showToast,
  onPulled: async () => {
    await fetchSkills(activeQuery.value)
    emit('skills-changed')
  },
})

onMounted(() => {
  void fetchSkills('')
  void loadSyncStatus()
})
</script>

<style scoped>
@reference "tailwindcss";

.skills-hub {
  @apply flex flex-col gap-3 sm:gap-4 p-3 sm:p-6 max-w-4xl mx-auto w-full overflow-y-auto h-full;
}

.skills-hub-header {
  @apply flex flex-col gap-1;
}

.skills-hub-title {
  @apply text-xl sm:text-2xl font-semibold text-zinc-900 m-0;
}

.skills-hub-subtitle {
  @apply text-sm text-zinc-500 m-0;
}

.skills-hub-toolbar {
  @apply flex flex-col sm:flex-row items-stretch sm:items-center gap-2;
}

.skills-hub-search-wrap {
  @apply flex-1 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 transition focus-within:border-zinc-400 focus-within:shadow-sm;
}

.skills-hub-search-icon {
  @apply w-4 h-4 text-zinc-400 shrink-0;
}

.skills-hub-search {
  @apply flex-1 min-w-0 bg-transparent text-sm text-zinc-800 placeholder-zinc-400 outline-none border-none p-0;
}

.skills-hub-search-btn {
  @apply shrink-0 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer;
}

.skills-hub-count {
  @apply text-xs text-zinc-400 whitespace-nowrap;
}

.skills-hub-sort {
  @apply shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer;
}

.skills-sync-panel {
  @apply rounded-xl border border-zinc-200 bg-zinc-50 p-3 flex flex-col gap-2;
}

.skills-sync-header {
  @apply flex flex-wrap items-center gap-2 text-sm text-zinc-700;
}

.skills-sync-badge {
  @apply text-xs rounded-md border border-zinc-300 bg-white px-2 py-0.5;
}

.skills-sync-badge-link {
  @apply text-zinc-700 hover:text-zinc-900 hover:border-zinc-400;
}

.skills-sync-device {
  @apply text-xs text-zinc-600 flex items-center gap-2 flex-wrap;
}

.skills-sync-meta {
  @apply text-xs text-zinc-600 flex items-center gap-3 flex-wrap;
}

.skills-sync-error {
  @apply text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-1;
}

.skills-sync-actions {
  @apply flex flex-wrap gap-2;
}

.skills-hub-toast {
  @apply rounded-lg px-3 py-2 text-sm font-medium;
}

.skills-hub-toast-success {
  @apply border border-emerald-200 bg-emerald-50 text-emerald-700;
}

.skills-hub-toast-error {
  @apply border border-rose-200 bg-rose-50 text-rose-700;
}

.skills-hub-section {
  @apply flex flex-col gap-2;
}

.skills-hub-section-toggle {
  @apply flex items-center gap-1.5 border-0 bg-transparent p-0 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 cursor-pointer;
}

.skills-hub-section-title {
  @apply text-sm font-medium;
}

.skills-hub-section-chevron {
  @apply w-3.5 h-3.5 transition-transform;
}

.skills-hub-section-chevron.is-open {
  @apply rotate-90;
}

.skills-hub-grid {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3;
}

.skills-hub-loading {
  @apply text-sm text-zinc-400 py-8 text-center;
}

.skills-hub-error {
  @apply text-sm text-rose-600 py-4 text-center rounded-lg border border-rose-200 bg-rose-50;
}

.skills-hub-empty {
  @apply text-sm text-zinc-400 py-8 text-center;
}
</style>
