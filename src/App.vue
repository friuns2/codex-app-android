<template>
  <DesktopLayout :is-sidebar-collapsed="isSidebarCollapsed" @close-sidebar="setSidebarCollapsed(true)">
    <template #sidebar>
      <section class="sidebar-root">
        <div class="sidebar-scrollable">
          <SidebarThreadControls
            v-if="!isSidebarCollapsed"
            class="sidebar-thread-controls-host"
            :is-sidebar-collapsed="isSidebarCollapsed"
            :show-new-thread-button="true"
            @toggle-sidebar="setSidebarCollapsed(!isSidebarCollapsed)"
            @start-new-thread="onStartNewThreadFromToolbar"
          >
            <button
              class="sidebar-search-toggle"
              type="button"
              :aria-pressed="isSidebarSearchVisible"
              aria-label="Search threads"
              title="Search threads"
              @click="toggleSidebarSearch"
            >
              <IconTablerSearch class="sidebar-search-toggle-icon" />
            </button>
          </SidebarThreadControls>

          <div v-if="!isSidebarCollapsed && isSidebarSearchVisible" class="sidebar-search-bar">
            <IconTablerSearch class="sidebar-search-bar-icon" />
            <input
              ref="sidebarSearchInputRef"
              v-model="sidebarSearchQuery"
              class="sidebar-search-input"
              type="text"
              placeholder="Filter threads..."
              @keydown="onSidebarSearchKeydown"
            />
            <button
              v-if="sidebarSearchQuery.length > 0"
              class="sidebar-search-clear"
              type="button"
              aria-label="Clear search"
              @click="clearSidebarSearch"
            >
              <IconTablerX class="sidebar-search-clear-icon" />
            </button>
          </div>

          <button
            v-if="!isSidebarCollapsed"
            class="sidebar-skills-link"
            :class="{ 'is-active': isSkillsRoute }"
            type="button"
            @click="router.push({ name: 'skills' }); isMobile && setSidebarCollapsed(true)"
          >
            Skills Hub
          </button>

          <SidebarThreadTree :groups="projectGroups" :project-display-name-by-id="projectDisplayNameById"
            v-if="!isSidebarCollapsed"
            :selected-thread-id="selectedThreadId" :is-loading="isLoadingThreads"
            :search-query="sidebarSearchQuery"
            :search-matched-thread-ids="serverMatchedThreadIds"
            @select="onSelectThread"
            @archive="onArchiveThread" @start-new-thread="onStartNewThread" @rename-project="onRenameProject"
            @browse-project-files="onBrowseProjectFiles"
            @rename-thread="onRenameThread"
            @remove-project="onRemoveProject" @reorder-project="onReorderProject"
            @export-thread="onExportThread" />
        </div>

        <div v-if="!isSidebarCollapsed" class="sidebar-settings-area">
          <Transition name="settings-panel">
            <div v-if="isSettingsOpen" class="sidebar-settings-panel">
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.sendWithEnter" @click="toggleSendWithEnter">
                <span class="sidebar-settings-label">Require ⌘ + enter to send</span>
                <span class="sidebar-settings-toggle" :class="{ 'is-on': !sendWithEnter }" />
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.inProgressSendMode" @click="cycleInProgressSendMode">
                <span class="sidebar-settings-label">When busy, send as</span>
                <span class="sidebar-settings-value">{{ inProgressSendMode === 'steer' ? 'Steer' : 'Queue' }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.appearance" @click="cycleDarkMode">
                <span class="sidebar-settings-label">Appearance</span>
                <span class="sidebar-settings-value">{{ darkMode === 'system' ? 'System' : darkMode === 'dark' ? 'Dark' : 'Light' }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.dictationClickToToggle" @click="toggleDictationClickToToggle">
                <span class="sidebar-settings-label">Click to toggle dictation</span>
                <span class="sidebar-settings-toggle" :class="{ 'is-on': dictationClickToToggle }" />
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.dictationAutoSend" @click="toggleDictationAutoSend">
                <span class="sidebar-settings-label">Auto send dictation</span>
                <span class="sidebar-settings-toggle" :class="{ 'is-on': dictationAutoSend }" />
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.worktreeRollback" @click="toggleWorktreeGitAutomation">
                <span class="sidebar-settings-label">Worktree rollback</span>
                <span class="sidebar-settings-toggle" :class="{ 'is-on': worktreeGitAutomationEnabled }" />
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.githubTrendingProjects" @click="toggleGithubTrendingProjects">
                <span class="sidebar-settings-label">GitHub trending projects</span>
                <span class="sidebar-settings-toggle" :class="{ 'is-on': showGithubTrendingProjects }" />
              </button>
              <div class="sidebar-settings-row sidebar-settings-row--select" :title="SETTINGS_HELP.dictationLanguage">
                <span class="sidebar-settings-label">Dictation language</span>
                <ComposerDropdown
                  class="sidebar-settings-language-dropdown"
                  :model-value="dictationLanguage"
                  :options="dictationLanguageOptions"
                  placeholder="Auto-detect"
                  open-direction="up"
                  :enable-search="true"
                  search-placeholder="Search language..."
                  @update:model-value="onDictationLanguageChange"
                />
              </div>
              <button class="sidebar-settings-row" type="button" aria-live="polite" @click="onConnectTelegramBot">
                <span class="sidebar-settings-label">Telegram</span>
                <span class="sidebar-settings-value">{{ telegramStatusText }}</span>
              </button>
              <div class="sidebar-settings-rate-limits">
                <RateLimitStatus :snapshots="accountRateLimitSnapshots" />
              </div>
            </div>
          </Transition>
          <button class="sidebar-settings-button" type="button" @click="isSettingsOpen = !isSettingsOpen">
            <IconTablerSettings class="sidebar-settings-icon" />
            <span>Settings</span>
          </button>
        </div>
      </section>
    </template>

    <template #content>
      <section class="content-root">
        <ContentHeader :title="contentTitle">
          <template #leading>
            <SidebarThreadControls
              v-if="isSidebarCollapsed || isMobile"
              class="sidebar-thread-controls-header-host"
              :is-sidebar-collapsed="isSidebarCollapsed"
              :show-new-thread-button="true"
              @toggle-sidebar="setSidebarCollapsed(!isSidebarCollapsed)"
              @start-new-thread="onStartNewThreadFromToolbar"
            />
          </template>
        </ContentHeader>

        <section class="content-body">
          <template v-if="isSkillsRoute">
            <SkillsHub @skills-changed="onSkillsChanged" />
          </template>
          <template v-else-if="isHomeRoute">
            <div class="content-grid">
              <div class="new-thread-empty">
                <p class="new-thread-hero">Let's build</p>
                <ComposerDropdown class="new-thread-folder-dropdown" :model-value="newThreadCwd"
                  :options="newThreadFolderOptions" placeholder="Choose folder"
                  :enable-search="true"
                  search-placeholder="Quick search project"
                  :show-add-action="true"
                  add-action-label="+ Add new project"
                  :default-add-value="defaultNewProjectName"
                  add-placeholder="Project name or absolute path"
                  :disabled="false" @update:model-value="onSelectNewThreadFolder"
                  @add="onAddNewProject" />
                <ComposerRuntimeDropdown
                  class="new-thread-runtime-dropdown"
                  v-model="newThreadRuntime"
                />
                <div
                  v-if="worktreeInitStatus.phase !== 'idle'"
                  class="worktree-init-status"
                  :class="{
                    'is-running': worktreeInitStatus.phase === 'running',
                    'is-error': worktreeInitStatus.phase === 'error',
                  }"
                >
                  <strong class="worktree-init-status-title">{{ worktreeInitStatus.title }}</strong>
                  <span class="worktree-init-status-message">{{ worktreeInitStatus.message }}</span>
                </div>
                <div v-if="showGithubTrendingProjects" class="new-thread-trending">
                  <div class="new-thread-trending-header">
                    <p class="new-thread-trending-title">Trending GitHub projects</p>
                    <ComposerDropdown
                      class="new-thread-trending-scope-dropdown"
                      :model-value="githubTipsScope"
                      :options="githubTipsScopeOptions"
                      @update:model-value="onGithubTipsScopeChange"
                    />
                  </div>
                  <p v-if="isTrendingProjectsLoading" class="new-thread-trending-empty">Loading trending projects...</p>
                  <p v-else-if="trendingProjects.length === 0" class="new-thread-trending-empty">
                    Trending repos are unavailable right now.
                  </p>
                  <div v-else class="new-thread-trending-list">
                    <button
                      v-for="project in trendingProjects"
                      :key="project.id"
                      type="button"
                      class="new-thread-trending-tip"
                      @click="onSelectTrendingProjectTip(project)"
                    >
                      <span class="new-thread-trending-tip-name" :title="project.fullName">
                        <template v-if="project.owner && project.repo">
                          <span class="new-thread-trending-tip-name-owner">{{ project.owner }}</span>
                          <span class="new-thread-trending-tip-name-slash">/</span>
                          <span class="new-thread-trending-tip-name-repo">{{ project.repo }}</span>
                        </template>
                        <template v-else>
                          <span class="new-thread-trending-tip-name-repo">{{ project.fullName }}</span>
                        </template>
                      </span>
                      <span class="new-thread-trending-tip-meta">{{ formatTrendingTipMeta(project) }}</span>
                      <span class="new-thread-trending-tip-description">
                        {{ project.description || 'No description available.' }}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

                <ThreadComposer ref="homeThreadComposerRef" :active-thread-id="composerThreadContextId"
                :cwd="composerCwd"
                :models="availableModelIds" :selected-model="selectedModelId"
                :selected-reasoning-effort="selectedReasoningEffort"
                :selected-speed-mode="selectedSpeedMode"
                :is-updating-speed-mode="isUpdatingSpeedMode"
                :skills="installedSkills"
                :is-turn-in-progress="false"
                :is-interrupting-turn="false" :send-with-enter="sendWithEnter" :in-progress-submit-mode="inProgressSendMode"
                :dictation-click-to-toggle="dictationClickToToggle" :dictation-auto-send="dictationAutoSend"
                :prepend-draft-request="rollbackDraftPrependRequest"
                :dictation-language="dictationLanguage"
                @submit="onSubmitThreadMessage"
                @update:selected-model="onSelectModel"
                @update:selected-reasoning-effort="onSelectReasoningEffort"
                @update:selected-speed-mode="onSelectSpeedMode" />
            </div>
          </template>
          <template v-else>
            <div class="content-grid">
              <div class="content-thread">
                <ThreadConversation :messages="filteredMessages" :is-loading="isLoadingMessages"
                  :active-thread-id="composerThreadContextId" :cwd="composerCwd" :scroll-state="selectedThreadScrollState"
                  :live-overlay="liveOverlay"
                  :pending-requests="selectedThreadServerRequests"
                  :is-turn-in-progress="isSelectedThreadInProgress"
                  :is-rolling-back="isRollingBack"
                  @update-scroll-state="onUpdateThreadScrollState"
                  @respond-server-request="onRespondServerRequest"
                  @rollback="onRollback" />
              </div>

              <div class="composer-with-queue">
                <QueuedMessages
                  :messages="selectedThreadQueuedMessages"
                  @edit="onEditQueuedMessage"
                  @steer="steerQueuedMessage"
                  @delete="removeQueuedMessage"
                />
                <ThreadComposer ref="threadComposerRef" :active-thread-id="composerThreadContextId"
                  :cwd="composerCwd"
                  :models="availableModelIds"
                  :selected-model="selectedModelId"
                  :selected-reasoning-effort="selectedReasoningEffort"
                  :selected-speed-mode="selectedSpeedMode"
                  :is-updating-speed-mode="isUpdatingSpeedMode"
                  :skills="installedSkills"
                  :is-turn-in-progress="isSelectedThreadInProgress" :is-interrupting-turn="isInterruptingTurn"
                  :has-queue-above="selectedThreadQueuedMessages.length > 0"
                  :send-with-enter="sendWithEnter" :in-progress-submit-mode="inProgressSendMode"
                  :dictation-click-to-toggle="dictationClickToToggle" :dictation-auto-send="dictationAutoSend"
                  :prepend-draft-request="rollbackDraftPrependRequest"
                  :dictation-language="dictationLanguage"
                  @submit="onSubmitThreadMessage" @update:selected-model="onSelectModel"
                  @update:selected-reasoning-effort="onSelectReasoningEffort"
                  @update:selected-speed-mode="onSelectSpeedMode"
                  @interrupt="onInterruptTurn" />
              </div>
            </div>
          </template>
        </section>
      </section>
    </template>
  </DesktopLayout>
  <div class="build-badge" aria-label="Worktree name and version">
    WT {{ worktreeName }} · v{{ appVersion }}
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DesktopLayout from './components/layout/DesktopLayout.vue'
import SidebarThreadTree from './components/sidebar/SidebarThreadTree.vue'
import ContentHeader from './components/content/ContentHeader.vue'
import ThreadConversation from './components/content/ThreadConversation.vue'
import ThreadComposer from './components/content/ThreadComposer.vue'
import QueuedMessages from './components/content/QueuedMessages.vue'
import RateLimitStatus from './components/content/RateLimitStatus.vue'
import ComposerDropdown from './components/content/ComposerDropdown.vue'
import ComposerRuntimeDropdown from './components/content/ComposerRuntimeDropdown.vue'
import SkillsHub from './components/content/SkillsHub.vue'
import SidebarThreadControls from './components/sidebar/SidebarThreadControls.vue'
import IconTablerSearch from './components/icons/IconTablerSearch.vue'
import IconTablerSettings from './components/icons/IconTablerSettings.vue'
import IconTablerX from './components/icons/IconTablerX.vue'
import { useDesktopState } from './composables/useDesktopState'
import { useMobile } from './composables/useMobile'
import {
  configureTelegramBot,
  createWorktree,
  getGithubProjectsForScope,
  getHomeDirectory,
  getProjectRootSuggestion,
  getTelegramStatus,
  getWorkspaceRootsState,
  openProjectRoot,
  searchThreads,
} from './api/codexGateway'
import type { ReasoningEffort, SpeedMode, ThreadScrollState } from './types/codex'
import type { ComposerDraftPayload, ThreadComposerExposed } from './components/content/ThreadComposer.vue'
import type { GithubTipsScope, GithubTrendingProject, TelegramStatus } from './api/codexGateway'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'codex-web-local.sidebar-collapsed.v1'
const worktreeName = import.meta.env.VITE_WORKTREE_NAME ?? 'unknown'
const appVersion = import.meta.env.VITE_APP_VERSION ?? 'unknown'
const SETTINGS_HELP = {
  sendWithEnter: 'When enabled, press Enter to send. When disabled, use Command+Enter to send.',
  inProgressSendMode: 'If a turn is still running, choose whether a new prompt should steer the current turn or be queued.',
  appearance: 'Switch between system theme, light mode, and dark mode.',
  dictationClickToToggle: 'Use click-to-start and click-to-stop dictation instead of hold-to-talk.',
  dictationAutoSend: 'Automatically send transcribed dictation when recording stops.',
  worktreeRollback: 'When enabled, each message creates a Git commit. On rollback, it runs Git reset to the commit for that message.',
  githubTrendingProjects: 'Show or hide GitHub trending project cards on the new thread screen.',
  dictationLanguage: 'Choose transcription language or keep auto-detect.',
} as const
const WHISPER_LANGUAGES: Record<string, string> = {
  en: 'english',
  zh: 'chinese',
  de: 'german',
  es: 'spanish',
  ru: 'russian',
  ko: 'korean',
  fr: 'french',
  ja: 'japanese',
  pt: 'portuguese',
  tr: 'turkish',
  pl: 'polish',
  ca: 'catalan',
  nl: 'dutch',
  ar: 'arabic',
  sv: 'swedish',
  it: 'italian',
  id: 'indonesian',
  hi: 'hindi',
  fi: 'finnish',
  vi: 'vietnamese',
  he: 'hebrew',
  uk: 'ukrainian',
  el: 'greek',
  ms: 'malay',
  cs: 'czech',
  ro: 'romanian',
  da: 'danish',
  hu: 'hungarian',
  ta: 'tamil',
  no: 'norwegian',
  th: 'thai',
  ur: 'urdu',
  hr: 'croatian',
  bg: 'bulgarian',
  lt: 'lithuanian',
  la: 'latin',
  mi: 'maori',
  ml: 'malayalam',
  cy: 'welsh',
  sk: 'slovak',
  te: 'telugu',
  fa: 'persian',
  lv: 'latvian',
  bn: 'bengali',
  sr: 'serbian',
  az: 'azerbaijani',
  sl: 'slovenian',
  kn: 'kannada',
  et: 'estonian',
  mk: 'macedonian',
  br: 'breton',
  eu: 'basque',
  is: 'icelandic',
  hy: 'armenian',
  ne: 'nepali',
  mn: 'mongolian',
  bs: 'bosnian',
  kk: 'kazakh',
  sq: 'albanian',
  sw: 'swahili',
  gl: 'galician',
  mr: 'marathi',
  pa: 'punjabi',
  si: 'sinhala',
  km: 'khmer',
  sn: 'shona',
  yo: 'yoruba',
  so: 'somali',
  af: 'afrikaans',
  oc: 'occitan',
  ka: 'georgian',
  be: 'belarusian',
  tg: 'tajik',
  sd: 'sindhi',
  gu: 'gujarati',
  am: 'amharic',
  yi: 'yiddish',
  lo: 'lao',
  uz: 'uzbek',
  fo: 'faroese',
  ht: 'haitian creole',
  ps: 'pashto',
  tk: 'turkmen',
  nn: 'nynorsk',
  mt: 'maltese',
  sa: 'sanskrit',
  lb: 'luxembourgish',
  my: 'myanmar',
  bo: 'tibetan',
  tl: 'tagalog',
  mg: 'malagasy',
  as: 'assamese',
  tt: 'tatar',
  haw: 'hawaiian',
  ln: 'lingala',
  ha: 'hausa',
  ba: 'bashkir',
  jw: 'javanese',
  su: 'sundanese',
  yue: 'cantonese',
}

const {
  projectGroups,
  projectDisplayNameById,
  selectedThread,
  selectedThreadScrollState,
  selectedThreadServerRequests,
  selectedLiveOverlay,
  selectedThreadId,
  availableModelIds,
  selectedModelId,
  selectedReasoningEffort,
  selectedSpeedMode,
  installedSkills,
  accountRateLimitSnapshots,
  messages,
  isLoadingThreads,
  isLoadingMessages,
  isSendingMessage,
  isInterruptingTurn,
  isUpdatingSpeedMode,
  refreshAll,
  refreshSkills,
  selectThread,
  setThreadScrollState,
  archiveThreadById,
  renameThreadById,
  sendMessageToSelectedThread,
  sendMessageToNewThread,
  interruptSelectedThreadTurn,
  rollbackSelectedThread,
  isRollingBack,
  selectedThreadQueuedMessages,
  removeQueuedMessage,
  steerQueuedMessage,
  setSelectedModelId,
  setWorktreeGitAutomationEnabled,
  setSelectedReasoningEffort,
  updateSelectedSpeedMode,
  respondToPendingServerRequest,
  renameProject,
  removeProject,
  reorderProject,
  pinProjectToTop,
  startPolling,
  stopPolling,
} = useDesktopState()

const route = useRoute()
const router = useRouter()
const { isMobile } = useMobile()
const homeThreadComposerRef = ref<ThreadComposerExposed | null>(null)
const threadComposerRef = ref<ThreadComposerExposed | null>(null)
const trendingProjects = ref<GithubTrendingProject[]>([])
const isTrendingProjectsLoading = ref(false)
const githubTipsScope = ref<GithubTipsScope>('trending-daily')
const editingQueuedMessageState = ref<{ threadId: string; queueIndex: number } | null>(null)
const isRouteSyncInProgress = ref(false)
const hasInitialized = ref(false)
const newThreadCwd = ref('')
const newThreadRuntime = ref<'local' | 'worktree'>('local')
const workspaceRootOptionsState = ref<{ order: string[]; labels: Record<string, string> }>({ order: [], labels: {} })
const worktreeInitStatus = ref<{ phase: 'idle' | 'running' | 'error'; title: string; message: string }>({
  phase: 'idle',
  title: '',
  message: '',
})
const isSidebarCollapsed = ref(loadSidebarCollapsed())
const sidebarSearchQuery = ref('')
const isSidebarSearchVisible = ref(false)
const sidebarSearchInputRef = ref<HTMLInputElement | null>(null)
const serverMatchedThreadIds = ref<string[] | null>(null)
let threadSearchTimer: ReturnType<typeof setTimeout> | null = null
const defaultNewProjectName = ref('New Project (1)')
const homeDirectory = ref('')
const isSettingsOpen = ref(false)
const SEND_WITH_ENTER_KEY = 'codex-web-local.send-with-enter.v1'
const IN_PROGRESS_SEND_MODE_KEY = 'codex-web-local.in-progress-send-mode.v1'
const DARK_MODE_KEY = 'codex-web-local.dark-mode.v1'
const DICTATION_CLICK_TO_TOGGLE_KEY = 'codex-web-local.dictation-click-to-toggle.v1'
const DICTATION_AUTO_SEND_KEY = 'codex-web-local.dictation-auto-send.v1'
const DICTATION_LANGUAGE_KEY = 'codex-web-local.dictation-language.v1'
const WORKTREE_GIT_AUTOMATION_KEY = 'codex-web-local.worktree-git-automation.v1'
const GITHUB_TRENDING_PROJECTS_KEY = 'codex-web-local.github-trending-projects.v1'
const sendWithEnter = ref(loadBoolPref(SEND_WITH_ENTER_KEY, true))
const inProgressSendMode = ref<'steer' | 'queue'>(loadInProgressSendModePref())
const darkMode = ref<'system' | 'light' | 'dark'>(loadDarkModePref())
const dictationClickToToggle = ref(loadBoolPref(DICTATION_CLICK_TO_TOGGLE_KEY, false))
const rollbackDraftPrependRequest = ref<{ id: number; text: string } | null>(null)
let rollbackDraftPrependRequestId = 0
const dictationAutoSend = ref(loadBoolPref(DICTATION_AUTO_SEND_KEY, true))
const dictationLanguage = ref(loadDictationLanguagePref())
const dictationLanguageOptions = computed(() => buildDictationLanguageOptions())
const worktreeGitAutomationEnabled = ref(loadBoolPref(WORKTREE_GIT_AUTOMATION_KEY, true))
const showGithubTrendingProjects = ref(loadBoolPref(GITHUB_TRENDING_PROJECTS_KEY, true))
const telegramStatus = ref<TelegramStatus>({
  configured: false,
  active: false,
  mappedChats: 0,
  mappedThreads: 0,
  lastError: '',
})

const routeThreadId = computed(() => {
  const rawThreadId = route.params.threadId
  return typeof rawThreadId === 'string' ? rawThreadId : ''
})

const knownThreadIdSet = computed(() => {
  const ids = new Set<string>()
  for (const group of projectGroups.value) {
    for (const thread of group.threads) {
      ids.add(thread.id)
    }
  }
  return ids
})

const isHomeRoute = computed(() => route.name === 'home')
const isSkillsRoute = computed(() => route.name === 'skills')
const contentTitle = computed(() => {
  if (isSkillsRoute.value) return 'Skills'
  if (isHomeRoute.value) return 'New thread'
  return selectedThread.value?.title ?? 'Choose a thread'
})
const filteredMessages = computed(() =>
  messages.value.filter((message) => {
    const type = normalizeMessageType(message.messageType, message.role)
    if (type === 'worked') return true
    if (type === 'turnActivity.live' || type === 'turnError.live' || type === 'agentReasoning.live') return false
    return true
  }),
)
const latestUserTurnIndex = computed(() => {
  let latest = -1
  for (const message of messages.value) {
    if (message.role !== 'user') continue
    if (typeof message.turnIndex !== 'number') continue
    if (message.turnIndex > latest) latest = message.turnIndex
  }
  return latest
})
const liveOverlay = computed(() => selectedLiveOverlay.value)
const composerThreadContextId = computed(() => (isHomeRoute.value ? '__new-thread__' : selectedThreadId.value))
const composerCwd = computed(() => {
  if (isHomeRoute.value) return newThreadCwd.value.trim()
  return selectedThread.value?.cwd?.trim() ?? ''
})
const isSelectedThreadInProgress = computed(() => !isHomeRoute.value && selectedThread.value?.inProgress === true)
const newThreadFolderOptions = computed(() => {
  const options: Array<{ value: string; label: string }> = []
  const seenCwds = new Set<string>()

  for (const cwdRaw of workspaceRootOptionsState.value.order) {
    const cwd = cwdRaw.trim()
    if (!cwd || seenCwds.has(cwd)) continue
    seenCwds.add(cwd)
    options.push({
      value: cwd,
      label: workspaceRootOptionsState.value.labels[cwd] || getPathLeafName(cwd),
    })
  }

  for (const group of projectGroups.value) {
    const cwd = group.threads[0]?.cwd?.trim() ?? ''
    if (!cwd || seenCwds.has(cwd)) continue
    seenCwds.add(cwd)
    options.push({
      value: cwd,
      label: projectDisplayNameById.value[group.projectName] ?? group.projectName,
    })
  }

  const selectedCwd = newThreadCwd.value.trim()
  if (selectedCwd && !seenCwds.has(selectedCwd)) {
    options.unshift({
      value: selectedCwd,
      label: getPathLeafName(selectedCwd),
    })
  }

  return options
})
const darkModeMediaQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null
const githubTipsScopeOptions = computed<Array<{ value: GithubTipsScope; label: string }>>(() => [
  { value: 'search-daily', label: 'Search daily' },
  { value: 'search-weekly', label: 'Search weekly' },
  { value: 'search-monthly', label: 'Search monthly' },
  { value: 'trending-daily', label: 'Trending daily' },
  { value: 'trending-weekly', label: 'Trending weekly' },
  { value: 'trending-monthly', label: 'Trending monthly' },
])
const telegramStatusText = computed(() => {
  if (!telegramStatus.value.configured) return 'Not configured'
  const base = telegramStatus.value.active ? 'Online' : 'Configured (offline)'
  const mapped = `${telegramStatus.value.mappedChats} chat(s), ${telegramStatus.value.mappedThreads} thread(s)`
  const error = telegramStatus.value.lastError ? `, error: ${telegramStatus.value.lastError}` : ''
  return `${base}, ${mapped}${error}`
})

onMounted(() => {
  window.addEventListener('keydown', onWindowKeyDown)
  applyDarkMode()
  darkModeMediaQuery?.addEventListener('change', applyDarkMode)
  void initialize()
  void applyLaunchProjectPathFromUrl()
  void loadHomeDirectory()
  void loadWorkspaceRootOptionsState()
  void refreshDefaultProjectName()
  void refreshTelegramStatus()
  if (showGithubTrendingProjects.value) {
    void loadTrendingProjects()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onWindowKeyDown)
  darkModeMediaQuery?.removeEventListener('change', applyDarkMode)
  if (threadSearchTimer) {
    clearTimeout(threadSearchTimer)
    threadSearchTimer = null
  }
  stopPolling()
})

watch(sidebarSearchQuery, (value) => {
  const query = value.trim()
  if (threadSearchTimer) {
    clearTimeout(threadSearchTimer)
    threadSearchTimer = null
  }
  if (!query) {
    serverMatchedThreadIds.value = null
    return
  }

  threadSearchTimer = setTimeout(() => {
    void searchThreads(query, 1000)
      .then((result) => {
        if (sidebarSearchQuery.value.trim() !== query) return
        serverMatchedThreadIds.value = result.threadIds
      })
      .catch(() => {
        if (sidebarSearchQuery.value.trim() !== query) return
        serverMatchedThreadIds.value = null
      })
  }, 220)
})

function onSkillsChanged(): void {
  void refreshSkills()
}

async function refreshTelegramStatus(): Promise<void> {
  try {
    telegramStatus.value = await getTelegramStatus()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load Telegram status'
    telegramStatus.value = {
      configured: false,
      active: false,
      mappedChats: 0,
      mappedThreads: 0,
      lastError: message,
    }
  }
}

function toggleSidebarSearch(): void {
  isSidebarSearchVisible.value = !isSidebarSearchVisible.value
  if (isSidebarSearchVisible.value) {
    nextTick(() => sidebarSearchInputRef.value?.focus())
  } else {
    sidebarSearchQuery.value = ''
  }
}

function clearSidebarSearch(): void {
  sidebarSearchQuery.value = ''
  sidebarSearchInputRef.value?.focus()
}

function onSidebarSearchKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    isSidebarSearchVisible.value = false
    sidebarSearchQuery.value = ''
  }
}

function onSelectThread(threadId: string): void {
  if (!threadId) return
  if (route.name === 'thread' && routeThreadId.value === threadId) return
  void router.push({ name: 'thread', params: { threadId } })
  if (isMobile.value) setSidebarCollapsed(true)
}

async function onExportThread(threadId: string): Promise<void> {
  if (!threadId) return
  if (selectedThreadId.value !== threadId) {
    await selectThread(threadId)
    await router.push({ name: 'thread', params: { threadId } })
  }
  await nextTick()
  onExportChat()
}

function onArchiveThread(threadId: string): void {
  void archiveThreadById(threadId)
}

function onStartNewThread(projectName: string): void {
  const projectGroup = projectGroups.value.find((group) => group.projectName === projectName)
  const projectCwd = projectGroup?.threads[0]?.cwd?.trim() ?? ''
  if (projectCwd) {
    newThreadCwd.value = projectCwd
  }
  if (isMobile.value) setSidebarCollapsed(true)
  if (isHomeRoute.value) return
  void router.push({ name: 'home' })
}

function onBrowseProjectFiles(projectName: string): void {
  const projectGroup = projectGroups.value.find((group) => group.projectName === projectName)
  const projectCwd = projectGroup?.threads[0]?.cwd?.trim() ?? ''
  if (!projectCwd || typeof window === 'undefined') return
  window.open(`/codex-local-browse${encodeURI(projectCwd)}`, '_blank', 'noopener,noreferrer')
}

function onStartNewThreadFromToolbar(): void {
  const cwd = selectedThread.value?.cwd?.trim() ?? ''
  if (cwd) {
    newThreadCwd.value = cwd
  }
  if (isMobile.value) setSidebarCollapsed(true)
  if (isHomeRoute.value) return
  void router.push({ name: 'home' })
}

function onRenameProject(payload: { projectName: string; displayName: string }): void {
  renameProject(payload.projectName, payload.displayName)
}

function onRenameThread(payload: { threadId: string; title: string }): void {
  void renameThreadById(payload.threadId, payload.title)
}

function onRemoveProject(projectName: string): void {
  removeProject(projectName)
}

function onReorderProject(payload: { projectName: string; toIndex: number }): void {
  reorderProject(payload.projectName, payload.toIndex)
}

function onUpdateThreadScrollState(payload: { threadId: string; state: ThreadScrollState }): void {
  setThreadScrollState(payload.threadId, payload.state)
}

function onRespondServerRequest(payload: { id: number; result?: unknown; error?: { code?: number; message: string } }): void {
  void respondToPendingServerRequest(payload)
}

function setSidebarCollapsed(nextValue: boolean): void {
  if (isSidebarCollapsed.value === nextValue) return
  isSidebarCollapsed.value = nextValue
  saveSidebarCollapsed(nextValue)
}

function onWindowKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented) return
  if (!event.ctrlKey && !event.metaKey) return
  if (event.shiftKey || event.altKey) return
  if (event.key.toLowerCase() !== 'b') return
  event.preventDefault()
  setSidebarCollapsed(!isSidebarCollapsed.value)
}

function onSubmitThreadMessage(payload: { text: string; imageUrls: string[]; fileAttachments: Array<{ label: string; path: string; fsPath: string }>; skills: Array<{ name: string; path: string }>; mode: 'steer' | 'queue'; rollbackLatestUserTurn?: boolean }): void {
  const text = payload.text
  const editingState = editingQueuedMessageState.value
  const queueInsertIndex =
    payload.mode === 'queue'
    && editingState
    && editingState.threadId === selectedThreadId.value
      ? editingState.queueIndex
      : undefined
  editingQueuedMessageState.value = null
  if (isHomeRoute.value) {
    void submitFirstMessageForNewThread(text, payload.imageUrls, payload.skills, payload.fileAttachments)
    return
  }
  if (payload.rollbackLatestUserTurn === true) {
    void rollbackAndResendDictation(payload)
    return
  }
  void sendMessageToSelectedThread(text, payload.imageUrls, payload.skills, payload.mode, payload.fileAttachments, queueInsertIndex)
}

function formatTrendingTipMeta(project: GithubTrendingProject): string {
  const stars = new Intl.NumberFormat().format(project.stars)
  if (project.language) return `${project.language} · ★ ${stars}`
  return `★ ${stars}`
}

function onGithubTipsScopeChange(nextValue: string): void {
  const allowed = new Set<GithubTipsScope>([
    'search-daily',
    'search-weekly',
    'search-monthly',
    'trending-daily',
    'trending-weekly',
    'trending-monthly',
  ])
  const scope = allowed.has(nextValue as GithubTipsScope) ? (nextValue as GithubTipsScope) : 'trending-daily'
  if (githubTipsScope.value === scope) return
  githubTipsScope.value = scope
}

function onConnectTelegramBot(): void {
  if (typeof window === 'undefined') return
  const botToken = window.prompt('Telegram bot token')
  if (!botToken || !botToken.trim()) return

  void configureTelegramBot(botToken.trim())
    .then(() => {
      window.alert('Telegram bot configured. Open the bot DM and send /start.')
      void refreshTelegramStatus()
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to connect Telegram bot'
      window.alert(message)
      void refreshTelegramStatus()
    })
}

function onSelectTrendingProjectTip(project: GithubTrendingProject): void {
  const composer = homeThreadComposerRef.value
  if (!composer) return
  composer.hydrateDraft({
    text: `Clone this GitHub project and run it: ${project.url}\nThen explain what this project does in very simple words a 5th grader can understand.`,
    imageUrls: [],
    fileAttachments: [],
    skills: [],
  })
}

function onEditQueuedMessage(messageId: string): void {
  const queueIndex = selectedThreadQueuedMessages.value.findIndex((item) => item.id === messageId)
  const message = queueIndex >= 0 ? selectedThreadQueuedMessages.value[queueIndex] : undefined
  const composer = threadComposerRef.value
  if (!message || !composer) return

  if (composer.hasUnsavedDraft()) {
    const shouldReplace = window.confirm('Replace the current draft with this queued message for editing?')
    if (!shouldReplace) return
  }

  editingQueuedMessageState.value = selectedThreadId.value
    ? { threadId: selectedThreadId.value, queueIndex }
    : null
  const payload: ComposerDraftPayload = {
    text: message.text,
    imageUrls: [...message.imageUrls],
    fileAttachments: message.fileAttachments.map((attachment) => ({ ...attachment })),
    skills: message.skills.map((skill) => ({ ...skill })),
  }
  composer.hydrateDraft(payload)
  removeQueuedMessage(messageId)
}

async function rollbackAndResendDictation(payload: {
  text: string
  imageUrls: string[]
  fileAttachments: Array<{ label: string; path: string; fsPath: string }>
  skills: Array<{ name: string; path: string }>
}): Promise<void> {
  if (isSelectedThreadInProgress.value) {
    await interruptSelectedThreadTurn()
  }
  const rollbackTargetTurnIndex = latestUserTurnIndex.value
  if (rollbackTargetTurnIndex >= 0) {
    await rollbackSelectedThread(rollbackTargetTurnIndex)
  }
  await sendMessageToSelectedThread(payload.text, payload.imageUrls, payload.skills, 'steer', payload.fileAttachments)
}

function onSelectNewThreadFolder(cwd: string): void {
  newThreadCwd.value = cwd.trim()
}

async function onAddNewProject(rawInput: string): Promise<void> {
  const normalizedInput = rawInput.trim()
  if (!normalizedInput) return

  const isPath = looksLikePath(normalizedInput)
  const baseDir = await resolveProjectBaseDirectory()
  const targetPath = isPath
    ? normalizedInput
    : joinPath(baseDir, normalizedInput)
  if (!targetPath) return

  try {
    const normalizedPath = await openProjectRoot(targetPath, {
      createIfMissing: !isPath,
      label: isPath ? '' : normalizedInput,
    })
    if (normalizedPath) {
      newThreadCwd.value = normalizedPath
      pinProjectToTop(getPathLeafName(normalizedPath))
      void loadWorkspaceRootOptionsState()
      void refreshDefaultProjectName()
    }
  } catch {
    // Error is surfaced on next request if path is invalid.
  }
}

async function applyLaunchProjectPathFromUrl(): Promise<void> {
  if (typeof window === 'undefined') return
  const launchProjectPath = new URLSearchParams(window.location.search).get('openProjectPath')?.trim() ?? ''
  if (!launchProjectPath) return
  try {
    const normalizedPath = await openProjectRoot(launchProjectPath, {
      createIfMissing: false,
      label: '',
    })
    if (!normalizedPath) return
    newThreadCwd.value = normalizedPath
    pinProjectToTop(getPathLeafName(normalizedPath))
    await router.replace({ name: 'home' })
    await loadWorkspaceRootOptionsState()
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.delete('openProjectPath')
    window.history.replaceState({}, '', nextUrl.toString())
  } catch {
    // If launch path is invalid, keep normal startup behavior.
  }
}

async function resolveProjectBaseDirectory(): Promise<string> {
  const baseDir = getProjectBaseDirectory()
  if (baseDir) return baseDir
  try {
    const loadedHomeDirectory = await getHomeDirectory()
    if (loadedHomeDirectory) {
      homeDirectory.value = loadedHomeDirectory
      return loadedHomeDirectory
    }
  } catch {
    // Fallback handled by empty return.
  }
  return ''
}

function looksLikePath(value: string): boolean {
  if (!value) return false
  if (value.startsWith('~/')) return true
  if (value.startsWith('/')) return true
  return /^[a-zA-Z]:[\\/]/.test(value)
}

async function refreshDefaultProjectName(): Promise<void> {
  const baseDir = getProjectBaseDirectory()
  if (!baseDir) {
    defaultNewProjectName.value = 'New Project (1)'
    return
  }

  try {
    const suggestion = await getProjectRootSuggestion(baseDir)
    defaultNewProjectName.value = suggestion.name || 'New Project (1)'
  } catch {
    defaultNewProjectName.value = 'New Project (1)'
  }
}

function getProjectBaseDirectory(): string {
  const selected = newThreadCwd.value.trim()
  if (selected) return getPathParent(selected)
  const first = newThreadFolderOptions.value[0]?.value?.trim() ?? ''
  if (first) return getPathParent(first)
  return homeDirectory.value.trim()
}

async function loadHomeDirectory(): Promise<void> {
  try {
    homeDirectory.value = await getHomeDirectory()
  } catch {
    homeDirectory.value = ''
  }
}

async function loadWorkspaceRootOptionsState(): Promise<void> {
  try {
    const state = await getWorkspaceRootsState()
    workspaceRootOptionsState.value = {
      order: [...state.order],
      labels: { ...state.labels },
    }
  } catch {
    workspaceRootOptionsState.value = { order: [], labels: {} }
  }
}

async function loadTrendingProjects(): Promise<void> {
  isTrendingProjectsLoading.value = true
  try {
    trendingProjects.value = await getGithubProjectsForScope(githubTipsScope.value, 6)
  } catch {
    trendingProjects.value = []
  } finally {
    isTrendingProjectsLoading.value = false
  }
}

function getPathParent(path: string): string {
  const trimmed = path.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  const slashIndex = trimmed.lastIndexOf('/')
  if (slashIndex <= 0) return ''
  return trimmed.slice(0, slashIndex)
}

function getPathLeafName(path: string): string {
  const trimmed = path.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  const slashIndex = trimmed.lastIndexOf('/')
  if (slashIndex < 0) return trimmed
  return trimmed.slice(slashIndex + 1)
}

function joinPath(parent: string, child: string): string {
  const normalizedParent = parent.trim().replace(/\/+$/, '')
  const normalizedChild = child.trim().replace(/^\/+/, '')
  if (!normalizedParent || !normalizedChild) return ''
  return `${normalizedParent}/${normalizedChild}`
}

function onSelectModel(modelId: string): void {
  setSelectedModelId(modelId)
}

function onSelectReasoningEffort(effort: ReasoningEffort | ''): void {
  setSelectedReasoningEffort(effort)
}

function onSelectSpeedMode(mode: SpeedMode): void {
  void updateSelectedSpeedMode(mode)
}

function onInterruptTurn(): void {
  void interruptSelectedThreadTurn()
}

function onRollback(payload: { turnIndex: number; prependText?: string }): void {
  const prependText = payload.prependText?.trim() ?? ''
  if (prependText.length > 0) {
    rollbackDraftPrependRequestId += 1
    rollbackDraftPrependRequest.value = { id: rollbackDraftPrependRequestId, text: prependText }
  }
  void rollbackSelectedThread(payload.turnIndex)
}

function onExportChat(): void {
  if (isHomeRoute.value || isSkillsRoute.value || typeof document === 'undefined') return
  if (!selectedThread.value || filteredMessages.value.length === 0) return
  const markdown = buildThreadMarkdown()
  const fileName = buildExportFileName()
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

function buildThreadMarkdown(): string {
  const lines: string[] = []
  const threadTitle = selectedThread.value?.title?.trim() || 'Untitled thread'
  lines.push(`# ${escapeMarkdownText(threadTitle)}`)
  lines.push('')
  lines.push(`- Exported: ${new Date().toISOString()}`)
  lines.push(`- Thread ID: ${selectedThread.value?.id ?? ''}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const message of filteredMessages.value) {
    const roleLabel = message.role ? message.role.toUpperCase() : 'MESSAGE'
    lines.push(`## ${roleLabel}`)
    lines.push('')

    const normalizedText = message.text.trim()
    if (normalizedText) {
      lines.push(normalizedText)
      lines.push('')
    }

    if (message.commandExecution) {
      lines.push('```text')
      lines.push(`command: ${message.commandExecution.command}`)
      lines.push(`status: ${message.commandExecution.status}`)
      if (message.commandExecution.cwd) {
        lines.push(`cwd: ${message.commandExecution.cwd}`)
      }
      if (message.commandExecution.exitCode !== null) {
        lines.push(`exitCode: ${message.commandExecution.exitCode}`)
      }
      lines.push(message.commandExecution.aggregatedOutput || '(no output)')
      lines.push('```')
      lines.push('')
    }

    if (message.fileAttachments && message.fileAttachments.length > 0) {
      lines.push('Attachments:')
      for (const attachment of message.fileAttachments) {
        lines.push(`- ${attachment.path}`)
      }
      lines.push('')
    }

    if (message.images && message.images.length > 0) {
      lines.push('Images:')
      for (const imageUrl of message.images) {
        lines.push(`- ${imageUrl}`)
      }
      lines.push('')
    }
  }

  return `${lines.join('\n').trimEnd()}\n`
}

function buildExportFileName(): string {
  const threadTitle = selectedThread.value?.title?.trim() || 'chat'
  const sanitized = threadTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const base = sanitized || 'chat'
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${base}-${stamp}.md`
}

function escapeMarkdownText(value: string): string {
  return value.replace(/([\\`*_{}\[\]()#+\-.!])/g, '\\$1')
}

function loadBoolPref(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  const v = window.localStorage.getItem(key)
  if (v === null) return fallback
  return v === '1'
}

function loadDarkModePref(): 'system' | 'light' | 'dark' {
  if (typeof window === 'undefined') return 'system'
  const v = window.localStorage.getItem(DARK_MODE_KEY)
  if (v === 'light' || v === 'dark') return v
  return 'system'
}

function loadInProgressSendModePref(): 'steer' | 'queue' {
  if (typeof window === 'undefined') return 'steer'
  const v = window.localStorage.getItem(IN_PROGRESS_SEND_MODE_KEY)
  return v === 'queue' ? 'queue' : 'steer'
}

function toggleSendWithEnter(): void {
  sendWithEnter.value = !sendWithEnter.value
  window.localStorage.setItem(SEND_WITH_ENTER_KEY, sendWithEnter.value ? '1' : '0')
}

function cycleInProgressSendMode(): void {
  inProgressSendMode.value = inProgressSendMode.value === 'steer' ? 'queue' : 'steer'
  window.localStorage.setItem(IN_PROGRESS_SEND_MODE_KEY, inProgressSendMode.value)
}

function cycleDarkMode(): void {
  const order: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark']
  const idx = order.indexOf(darkMode.value)
  darkMode.value = order[(idx + 1) % order.length]
  window.localStorage.setItem(DARK_MODE_KEY, darkMode.value)
  applyDarkMode()
}

function toggleDictationClickToToggle(): void {
  dictationClickToToggle.value = !dictationClickToToggle.value
  window.localStorage.setItem(DICTATION_CLICK_TO_TOGGLE_KEY, dictationClickToToggle.value ? '1' : '0')
}

function toggleDictationAutoSend(): void {
  dictationAutoSend.value = !dictationAutoSend.value
  window.localStorage.setItem(DICTATION_AUTO_SEND_KEY, dictationAutoSend.value ? '1' : '0')
}

function toggleWorktreeGitAutomation(): void {
  worktreeGitAutomationEnabled.value = !worktreeGitAutomationEnabled.value
  window.localStorage.setItem(WORKTREE_GIT_AUTOMATION_KEY, worktreeGitAutomationEnabled.value ? '1' : '0')
}

function toggleGithubTrendingProjects(): void {
  showGithubTrendingProjects.value = !showGithubTrendingProjects.value
  window.localStorage.setItem(GITHUB_TRENDING_PROJECTS_KEY, showGithubTrendingProjects.value ? '1' : '0')
}

function onDictationLanguageChange(nextValue: string): void {
  const normalized = normalizeToWhisperLanguage(nextValue.trim())
  const value = normalized || 'auto'
  dictationLanguage.value = value
  window.localStorage.setItem(DICTATION_LANGUAGE_KEY, value)
}

function loadDictationLanguagePref(): string {
  if (typeof window === 'undefined') return 'auto'
  const value = window.localStorage.getItem(DICTATION_LANGUAGE_KEY)?.trim() || 'auto'
  const normalized = normalizeToWhisperLanguage(value)
  return normalized || 'auto'
}

function buildDictationLanguageOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [{ value: 'auto', label: 'Auto-detect' }]
  const seen = new Set<string>(['auto'])
  function formatLanguageLabel(value: string): string {
    const languageName = WHISPER_LANGUAGES[value] || value
    const title = languageName.charAt(0).toUpperCase() + languageName.slice(1)
    return `${title} (${value})`
  }

  for (const raw of typeof navigator !== 'undefined' ? (navigator.languages ?? []) : []) {
    const value = normalizeToWhisperLanguage(raw)
    if (!value || seen.has(value)) continue
    seen.add(value)
    options.push({
      value,
      label: `Preferred: ${formatLanguageLabel(value)}`,
    })
  }

  for (const value of Object.keys(WHISPER_LANGUAGES)) {
    if (seen.has(value)) continue
    seen.add(value)
    options.push({
      value,
      label: formatLanguageLabel(value),
    })
  }

  const current = dictationLanguage.value.trim()
  if (current && !seen.has(current)) {
    options.push({
      value: current,
      label: formatLanguageLabel(current),
    })
  }

  return options
}

function normalizeToWhisperLanguage(raw: string): string {
  const value = raw.trim().toLowerCase()
  if (!value || value === 'auto') return ''
  if (value in WHISPER_LANGUAGES) return value
  const base = value.split('-')[0] ?? value
  if (base in WHISPER_LANGUAGES) return base
  return ''
}

function applyDarkMode(): void {
  const root = document.documentElement
  if (darkMode.value === 'dark') {
    root.classList.add('dark')
  } else if (darkMode.value === 'light') {
    root.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
}

function loadSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1'
}

function saveSidebarCollapsed(value: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, value ? '1' : '0')
}

function normalizeMessageType(rawType: string | undefined, role: string): string {
  const normalized = (rawType ?? '').trim()
  if (normalized.length > 0) {
    return normalized
  }
  return role.trim() || 'message'
}

async function initialize(): Promise<void> {
  await refreshAll()
  hasInitialized.value = true
  await syncThreadSelectionWithRoute()
  startPolling()
}

async function syncThreadSelectionWithRoute(): Promise<void> {
  if (isRouteSyncInProgress.value) return
  isRouteSyncInProgress.value = true

  try {
    if (route.name === 'home' || route.name === 'skills') {
      if (selectedThreadId.value !== '') {
        await selectThread('')
      }
      return
    }

    if (route.name === 'thread') {
      const threadId = routeThreadId.value
      if (!threadId) return

      if (!knownThreadIdSet.value.has(threadId)) {
        await router.replace({ name: 'home' })
        return
      }

      if (selectedThreadId.value !== threadId) {
        await selectThread(threadId)
      }
      return
    }

  } finally {
    isRouteSyncInProgress.value = false
  }
}

watch(
  () =>
    [
      route.name,
      routeThreadId.value,
      isLoadingThreads.value,
      knownThreadIdSet.value.has(routeThreadId.value),
      selectedThreadId.value,
    ] as const,
  async () => {
    if (!hasInitialized.value) return
    await syncThreadSelectionWithRoute()
  },
)

watch(
  () => selectedThreadId.value,
  async (threadId) => {
    if (!hasInitialized.value) return
    if (isRouteSyncInProgress.value) return
    if (isHomeRoute.value || isSkillsRoute.value) return

    if (!threadId) {
      if (route.name !== 'home') {
        await router.replace({ name: 'home' })
      }
      return
    }

    if (route.name === 'thread' && routeThreadId.value === threadId) return
    await router.replace({ name: 'thread', params: { threadId } })
  },
)

watch(
  () => githubTipsScope.value,
  () => {
    if (!showGithubTrendingProjects.value) return
    void loadTrendingProjects()
  },
)

watch(
  () => showGithubTrendingProjects.value,
  (enabled) => {
    if (!enabled) {
      trendingProjects.value = []
      return
    }
    void loadTrendingProjects()
  },
)

watch(
  () => newThreadFolderOptions.value,
  (options) => {
    if (options.length === 0) {
      newThreadCwd.value = ''
      return
    }
    const hasSelected = options.some((option) => option.value === newThreadCwd.value)
    if (!hasSelected) {
      newThreadCwd.value = options[0].value
    }
    void refreshDefaultProjectName()
  },
  { immediate: true },
)

watch(
  () => newThreadCwd.value,
  () => {
    worktreeInitStatus.value = { phase: 'idle', title: '', message: '' }
    void refreshDefaultProjectName()
  },
)

watch(
  () => newThreadRuntime.value,
  (runtime) => {
    if (runtime === 'local') {
      worktreeInitStatus.value = { phase: 'idle', title: '', message: '' }
    }
  },
)

watch(
  () => route.name,
  (name) => {
    if (name !== 'home') {
      worktreeInitStatus.value = { phase: 'idle', title: '', message: '' }
    }
  },
)

watch(
  () => selectedThreadId.value,
  () => {
    worktreeInitStatus.value = { phase: 'idle', title: '', message: '' }
  },
)

watch(
  () => worktreeGitAutomationEnabled.value,
  (enabled) => {
    setWorktreeGitAutomationEnabled(enabled)
  },
  { immediate: true },
)

watch(isMobile, (mobile) => {
  if (mobile && !isSidebarCollapsed.value) {
    setSidebarCollapsed(true)
  }
})

async function submitFirstMessageForNewThread(
  text: string,
  imageUrls: string[] = [],
  skills: Array<{ name: string; path: string }> = [],
  fileAttachments: Array<{ label: string; path: string; fsPath: string }> = [],
): Promise<void> {
  try {
    worktreeInitStatus.value = { phase: 'idle', title: '', message: '' }
    let targetCwd = newThreadCwd.value
    if (newThreadRuntime.value === 'worktree') {
      worktreeInitStatus.value = {
        phase: 'running',
        title: 'Creating worktree',
        message: 'Creating a worktree and running setup.',
      }
      try {
        const created = await createWorktree(newThreadCwd.value)
        targetCwd = created.cwd
        newThreadCwd.value = created.cwd
        worktreeInitStatus.value = { phase: 'idle', title: '', message: '' }
      } catch {
        worktreeInitStatus.value = {
          phase: 'error',
          title: 'Worktree setup failed',
          message: 'Unable to create worktree. Try again or switch to Local project.',
        }
        return
      }
    }
    const threadId = await sendMessageToNewThread(text, targetCwd, imageUrls, skills, fileAttachments)
    if (!threadId) return
    await router.replace({ name: 'thread', params: { threadId } })
  } catch {
    // Error is already reflected in state.
  }
}
</script>

<style scoped>
@reference "tailwindcss";

.sidebar-root {
  @apply h-full flex flex-col select-none;
}

.sidebar-root input,
.sidebar-root textarea {
  @apply select-text;
}

.sidebar-scrollable {
  @apply flex-1 min-h-0 overflow-y-auto py-4 px-2 flex flex-col gap-2;
}

.content-root {
  @apply h-full min-h-0 w-full flex flex-col overflow-y-hidden overflow-x-visible bg-white;
}

.sidebar-thread-controls-host {
  @apply mt-1 -translate-y-px px-2 pb-1;
}

.sidebar-search-toggle {
  @apply h-6.75 w-6.75 rounded-md border border-transparent bg-transparent text-zinc-600 flex items-center justify-center transition hover:border-zinc-200 hover:bg-zinc-50;
}

.sidebar-search-toggle[aria-pressed='true'] {
  @apply border-zinc-300 bg-zinc-100 text-zinc-700;
}

.sidebar-search-toggle-icon {
  @apply w-4 h-4;
}

.sidebar-search-bar {
  @apply flex items-center gap-1.5 mx-2 px-2 py-1 rounded-md border border-zinc-200 bg-white transition-colors focus-within:border-zinc-400;
}

.sidebar-search-bar-icon {
  @apply w-3.5 h-3.5 text-zinc-400 shrink-0;
}

.sidebar-search-input {
  @apply flex-1 min-w-0 bg-transparent text-sm text-zinc-800 placeholder-zinc-400 outline-none border-none p-0;
}

.sidebar-search-clear {
  @apply w-4 h-4 rounded text-zinc-400 flex items-center justify-center transition hover:text-zinc-600;
}

.sidebar-search-clear-icon {
  @apply w-3.5 h-3.5;
}

.sidebar-skills-link {
  @apply mx-2 flex items-center rounded-lg border-0 bg-transparent px-2 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 cursor-pointer;
}

.sidebar-skills-link.is-active {
  @apply bg-zinc-200 text-zinc-900 font-medium;
}

.sidebar-thread-controls-header-host {
  @apply ml-1;
}

.content-body {
  @apply flex-1 min-h-0 w-full flex flex-col gap-2 sm:gap-3 pt-1 pb-2 sm:pb-4 overflow-y-hidden overflow-x-visible;
}


.content-error {
  @apply m-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700;
}

.content-grid {
  @apply flex-1 min-h-0 flex flex-col gap-3;
}

.content-thread {
  @apply flex-1 min-h-0;
}

.composer-with-queue {
  @apply w-full;
}

.new-thread-empty {
  @apply flex-1 min-h-0 flex flex-col items-center justify-center gap-0.5 px-3 sm:px-6;
}

.new-thread-hero {
  @apply m-0 text-2xl sm:text-[2.5rem] font-normal leading-[1.05] text-zinc-900;
}

.new-thread-folder-dropdown {
  @apply text-2xl sm:text-[2.5rem] text-zinc-500;
}

.new-thread-folder-dropdown :deep(.composer-dropdown-trigger) {
  @apply h-auto text-2xl sm:text-[2.5rem] leading-[1.05];
}

.new-thread-folder-dropdown :deep(.composer-dropdown-value) {
  @apply leading-[1.05];
}

.new-thread-folder-dropdown :deep(.composer-dropdown-chevron) {
  @apply h-4 w-4 sm:h-5 sm:w-5 mt-0;
}

.new-thread-runtime-dropdown {
  @apply mt-3;
}

.new-thread-trending {
  @apply mt-4 w-full max-w-3xl;
}

.new-thread-trending-header {
  @apply mb-2 flex items-center justify-between gap-2;
}

.new-thread-trending-title {
  @apply m-0 text-xs font-medium uppercase tracking-wide text-zinc-500;
}

.new-thread-trending-scope-dropdown {
  @apply min-w-40;
}

.new-thread-trending-scope-dropdown :deep(.composer-dropdown-trigger) {
  @apply h-8 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700;
}

.new-thread-trending-empty {
  @apply m-0 text-sm text-zinc-500;
}

.new-thread-trending-list {
  @apply grid grid-cols-2 sm:grid-cols-3 gap-2;
  grid-template-rows: repeat(2, minmax(0, 1fr));
}

.new-thread-trending-tip {
  @apply flex cursor-pointer flex-col items-start gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left transition hover:border-zinc-300 hover:bg-zinc-50;
  container-type: inline-size;
}

.new-thread-trending-tip-name {
  @apply w-full truncate text-sm font-medium text-zinc-900;
}

.new-thread-trending-tip-name-owner {
  @apply inline;
}

.new-thread-trending-tip-name-slash {
  @apply inline;
}

.new-thread-trending-tip-name-repo {
  @apply inline;
}

@container (max-width: 220px) {
  .new-thread-trending-tip-name-owner,
  .new-thread-trending-tip-name-slash {
    display: none;
  }
}

.new-thread-trending-tip-meta {
  @apply text-xs text-zinc-500;
}

.new-thread-trending-tip-description {
  @apply line-clamp-2 text-xs text-zinc-600;
}

.worktree-init-status {
  @apply mt-3 flex w-full max-w-xl flex-col gap-1 rounded-xl border px-3 py-2 text-sm;
}

.worktree-init-status.is-running {
  @apply border-zinc-300 bg-zinc-50 text-zinc-700;
}

.worktree-init-status.is-error {
  @apply border-rose-300 bg-rose-50 text-rose-800;
}

.worktree-init-status-title {
  @apply font-medium;
}

.worktree-init-status-message {
  @apply break-all;
}

.sidebar-settings-area {
  @apply shrink-0 bg-slate-100 pt-2 px-2 pb-2 border-t border-zinc-200;
}

.sidebar-settings-button {
  @apply flex items-center gap-2 w-full rounded-lg border-0 bg-transparent px-2 py-2 text-sm text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 cursor-pointer;
}

.sidebar-settings-icon {
  @apply w-4.5 h-4.5;
}

.sidebar-settings-panel {
  @apply mb-1 rounded-lg border border-zinc-200 bg-white overflow-hidden;
}

.sidebar-settings-row {
  @apply flex items-center justify-between w-full px-3 py-2.5 text-sm text-zinc-700 border-0 bg-transparent transition hover:bg-zinc-50 cursor-pointer;
}

.sidebar-settings-row--select {
  @apply cursor-default items-center gap-2;
}

.sidebar-settings-language-dropdown {
  @apply min-w-0 max-w-52;
}

.sidebar-settings-language-dropdown :deep(.composer-dropdown-trigger) {
  @apply h-auto rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700;
}

.sidebar-settings-language-dropdown :deep(.composer-dropdown-value) {
  @apply max-w-32;
}

.sidebar-settings-row + .sidebar-settings-row {
  @apply border-t border-zinc-100;
}

.sidebar-settings-label {
  @apply text-left;
}

.sidebar-settings-value {
  @apply text-xs text-zinc-500 bg-zinc-100 rounded px-1.5 py-0.5;
}

.sidebar-settings-toggle {
  @apply relative w-9 h-5 rounded-full bg-zinc-300 transition-colors shrink-0;
}

.sidebar-settings-toggle::after {
  content: '';
  @apply absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm;
}

.sidebar-settings-toggle.is-on {
  @apply bg-zinc-800;
}

.sidebar-settings-toggle.is-on::after {
  transform: translateX(16px);
}

.settings-panel-enter-active,
.settings-panel-leave-active {
  transition: all 150ms ease;
}

.settings-panel-enter-from,
.settings-panel-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.sidebar-settings-rate-limits {
  @apply border-t border-zinc-200 px-2 pt-2;
}

.build-badge {
  @apply fixed top-3 right-3 z-50 rounded-md border border-zinc-200 bg-white/95 px-2 py-1 text-xs font-medium text-zinc-600 shadow-sm backdrop-blur;
}

</style>
