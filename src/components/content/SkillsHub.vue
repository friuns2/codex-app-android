<template>
  <div class="skills-hub">
    <div class="skills-hub-header">
      <h2 class="skills-hub-title">{{ t('Skills Hub') }}</h2>
      <p class="skills-hub-subtitle">{{ t('Manage installed skills on this machine') }}</p>
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

    <slot name="before-installed" />

    <div v-if="filteredInstalled.length > 0" class="skills-hub-section">
      <button class="skills-hub-section-toggle" type="button" @click="isInstalledOpen = !isInstalledOpen">
        <span class="skills-hub-section-title">{{ t('Installed skills ({count})', { count: filteredInstalled.length }) }}</span>
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

    <div class="skills-hub-section">
      <div v-if="isLoading" class="skills-hub-loading">{{ t('Loading skills...') }}</div>
      <div v-else-if="error" class="skills-hub-error">{{ error }}</div>
      <div v-else-if="installedSkills.length === 0" class="skills-hub-empty">{{ t('No installed skills found.') }}</div>
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
import IconTablerChevronRight from '../icons/IconTablerChevronRight.vue'
import SkillCard from './SkillCard.vue'
import SkillDetailModal, { type HubSkill } from './SkillDetailModal.vue'
import { useGithubSkillsSync } from '../../composables/useGithubSkillsSync'
import { useUiLanguage } from '../../composables/useUiLanguage'

const EMPTY_SKILL: HubSkill = { name: '', owner: '', description: '', url: '', installed: false }
type SkillsHubPayload = { installed?: HubSkill[] }

const installedSkills = ref<HubSkill[]>([])
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
const filteredInstalled = computed(() => installedSkills.value)

function showToast(text: string, type: 'success' | 'error' = 'success'): void {
  toast.value = { text, type }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 3000)
}

function applySkillsPayload(payload: SkillsHubPayload): void {
  installedSkills.value = payload.installed ?? []
}

async function fetchSkills(): Promise<void> {
  isLoading.value = true
  error.value = ''
  try {
    const resp = await fetch('/codex-api/skills-hub')
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = (await resp.json()) as SkillsHubPayload
    applySkillsPayload(data)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load skills'
  } finally {
    isLoading.value = false
  }
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
    detailSkill.value = installed
    showToast(`${skill.displayName || skill.name} skill installed`)
    isDetailOpen.value = false
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
    showToast(`${skill.displayName || skill.name} skill uninstalled`)
    isDetailOpen.value = false
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
    await fetchSkills()
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
    await fetchSkills()
    emit('skills-changed')
  },
})

onMounted(() => {
  void fetchSkills()
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
  @apply text-xl sm:text-2xl font-semibold m-0;
  color: var(--theme-text-primary);
}

.skills-hub-subtitle {
  @apply text-sm m-0;
  color: var(--theme-text-muted);
}

.skills-hub-sort {
  @apply shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition cursor-pointer;
  border-color: var(--theme-border);
  background: var(--theme-control-bg);
  color: var(--theme-text-secondary);
}

.skills-hub-sort:hover {
  background: var(--theme-control-hover-bg);
  border-color: var(--theme-border-strong);
  color: var(--theme-text-primary);
}

.skills-sync-panel {
  @apply rounded-xl border p-3 flex flex-col gap-2;
  border-color: var(--theme-border);
  background: var(--theme-panel-subtle-bg);
}

.skills-sync-header {
  @apply flex flex-wrap items-center gap-2 text-sm;
  color: var(--theme-text-primary);
}

.skills-sync-badge {
  @apply text-xs rounded-md border px-2 py-0.5;
  border-color: var(--theme-border);
  background: var(--theme-control-bg);
  color: var(--theme-text-secondary);
}

.skills-sync-badge-link {
  color: var(--theme-text-secondary);
}

.skills-sync-badge-link:hover {
  border-color: var(--theme-border-strong);
  color: var(--theme-text-primary);
}

.skills-sync-device {
  @apply text-xs flex items-center gap-2 flex-wrap;
  color: var(--theme-text-secondary);
}

.skills-sync-meta {
  @apply text-xs flex items-center gap-3 flex-wrap;
  color: var(--theme-text-secondary);
}

.skills-sync-error {
  @apply text-xs border rounded-md px-2 py-1;
  border-color: var(--theme-danger-border);
  background: var(--theme-danger-soft-bg);
  color: var(--theme-danger-text);
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
  @apply flex items-center gap-1.5 border-0 bg-transparent p-0 text-sm font-medium transition cursor-pointer;
  color: var(--theme-text-secondary);
}

.skills-hub-section-toggle:hover {
  color: var(--theme-text-primary);
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
  @apply text-sm py-8 text-center;
  color: var(--theme-text-muted);
}

.skills-hub-error {
  @apply text-sm py-4 text-center rounded-lg border;
  border-color: var(--theme-danger-border);
  background: var(--theme-danger-soft-bg);
  color: var(--theme-danger-text);
}

.skills-hub-empty {
  @apply text-sm py-8 text-center;
  color: var(--theme-text-muted);
}
</style>
