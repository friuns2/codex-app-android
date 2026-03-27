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
              <div class="sidebar-settings-account-section">
                <div class="sidebar-settings-account-header">
                  <div class="sidebar-settings-account-header-main">
                    <span class="sidebar-settings-account-title">Accounts</span>
                    <span class="sidebar-settings-account-count">{{ accounts.length }}</span>
                  </div>
                  <button
                    class="sidebar-settings-account-refresh"
                    type="button"
                    :disabled="isRefreshingAccounts || isSwitchingAccounts"
                    @click="onRefreshAccounts"
                  >
                    {{ isRefreshingAccounts ? 'Reloading…' : 'Reload' }}
                  </button>
                </div>
                <p v-if="accountActionError" class="sidebar-settings-account-error">{{ accountActionError }}</p>
                <p v-if="accounts.length === 0" class="sidebar-settings-account-empty">
                  Run `codex login`, then click reload.
                </p>
                <div v-else class="sidebar-settings-account-list">
                  <article
                    v-for="account in accounts"
                    :key="account.accountId"
                    class="sidebar-settings-account-item"
                    :class="{
                      'is-active': account.isActive,
                      'is-unavailable': isAccountUnavailable(account),
                      'is-confirming-remove': isRemoveConfirmationActive(account),
                    }"
                    :title="buildAccountTitle(account)"
                    @mouseleave="onAccountCardPointerLeave(account.accountId)"
                  >
                    <div class="sidebar-settings-account-main">
                      <p class="sidebar-settings-account-email">{{ account.email || 'Account' }}</p>
                      <p class="sidebar-settings-account-meta">
                        {{ formatAccountMeta(account) }}
                      </p>
                      <p class="sidebar-settings-account-quota">
                        {{ formatAccountQuota(account) }}
                      </p>
                      <p class="sidebar-settings-account-id">
                        Workspace {{ shortAccountId(account.accountId) }}
                      </p>
                    </div>
                    <div class="sidebar-settings-account-actions">
                      <button
                        class="sidebar-settings-account-switch"
                        type="button"
                        :disabled="isAccountActionDisabled(account) || account.isActive || isAccountUnavailable(account)"
                        @click="onSwitchAccount(account.accountId)"
                      >
                        {{ getAccountSwitchLabel(account) }}
                      </button>
                      <button
                        class="sidebar-settings-account-remove"
                        :class="{ 'is-confirming': isRemoveConfirmationActive(account) }"
                        type="button"
                        :disabled="isAccountActionDisabled(account)"
                        @click="onRemoveAccount(account.accountId)"
                      >
                        {{ getAccountRemoveLabel(account) }}
                      </button>
                    </div>
                  </article>
                </div>
              </div>
              <button class="sidebar-settings-row" type="button" @click="toggleSendWithEnter">
                <span class="sidebar-settings-label">Require ⌘ + enter to send</span>
                <span class="sidebar-settings-toggle" :class="{ 'is-on': !sendWithEnter }" />
              </button>
              <button class="sidebar-settings-row" type="button" @click="cycleInProgressSendMode">
                <span class="sidebar-settings-label">When busy, send as</span>
                <span class="sidebar-settings-value">{{ inProgressSendMode === 'steer' ? 'Steer' : 'Queue' }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" @click="cycleDarkMode">
                <span class="sidebar-settings-label">Appearance</span>
                <span class="sidebar-settings-value">{{ darkMode === 'system' ? 'System' : darkMode === 'dark' ? 'Dark' : 'Light' }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" @click="toggleDictationClickToToggle">
                <span class="sidebar-settings-label">Click to toggle dictation</span>
                <span class="sidebar-settings-toggle" :class="{ 'is-on': dictationClickToToggle }" />
              </button>
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
              </div>

                <ThreadComposer :active-thread-id="composerThreadContextId"
                  :cwd="composerCwd"
                  :collaboration-modes="availableCollaborationModes"
                  :selected-collaboration-mode="selectedCollaborationMode"
                  :models="availableModelIds" :selected-model="selectedModelId"
                  :selected-reasoning-effort="selectedReasoningEffort" :skills="installedSkills"
                  :codex-quota="codexQuota"
                  :is-turn-in-progress="false"
                  :is-interrupting-turn="false" :send-with-enter="sendWithEnter" :in-progress-submit-mode="inProgressSendMode"
                  :dictation-click-to-toggle="dictationClickToToggle" @submit="onSubmitThreadMessage"
                  @update:selected-collaboration-mode="onSelectCollaborationMode"
                  @update:selected-model="onSelectModel" @update:selected-reasoning-effort="onSelectReasoningEffort" />
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
                  @steer="steerQueuedMessage"
                  @delete="removeQueuedMessage"
                />
                <ThreadComposer :active-thread-id="composerThreadContextId"
                  :cwd="composerCwd"
                  :collaboration-modes="availableCollaborationModes"
                  :selected-collaboration-mode="selectedCollaborationMode"
                  :models="availableModelIds"
                  :selected-model="selectedModelId" :selected-reasoning-effort="selectedReasoningEffort"
                  :skills="installedSkills"
                  :codex-quota="codexQuota"
                  :is-turn-in-progress="isSelectedThreadInProgress" :is-interrupting-turn="isInterruptingTurn"
                  :has-queue-above="selectedThreadQueuedMessages.length > 0"
                  :send-with-enter="sendWithEnter" :in-progress-submit-mode="inProgressSendMode"
                  :dictation-click-to-toggle="dictationClickToToggle"
                  @update:selected-collaboration-mode="onSelectCollaborationMode"
                  @submit="onSubmitThreadMessage" @update:selected-model="onSelectModel"
                  @update:selected-reasoning-effort="onSelectReasoningEffort" @interrupt="onInterruptTurn" />
              </div>
            </div>
          </template>
        </section>
      </section>
    </template>
  </DesktopLayout>
  <div class="build-badge" aria-label="Author name, worktree name, and version">
    nervmor {{ worktreeName }} · v{{ appVersion }}
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
  createWorktree,
  getAccounts,
  getHomeDirectory,
  getProjectRootSuggestion,
  getWorkspaceRootsState,
  openProjectRoot,
  removeAccount,
  refreshAccountsFromAuth,
  searchThreads,
  switchAccount,
} from './api/codexGateway'
import type { ReasoningEffort, ThreadScrollState, UiAccountEntry, UiRateLimitWindow } from './types/codex'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'codex-web-local.sidebar-collapsed.v1'
const LAST_ACTIVE_THREAD_ROUTE_STORAGE_KEY = 'codex-web-local.last-active-thread-route.v1'
const worktreeName = import.meta.env.VITE_WORKTREE_NAME ?? 'unknown'
const appVersion = import.meta.env.VITE_APP_VERSION ?? 'unknown'

const {
  projectGroups,
  projectDisplayNameById,
  selectedThread,
  selectedThreadScrollState,
  selectedThreadServerRequests,
  selectedLiveOverlay,
  codexQuota,
  selectedThreadId,
  availableCollaborationModes,
  availableModelIds,
  selectedCollaborationMode,
  selectedModelId,
  selectedReasoningEffort,
  installedSkills,
  messages,
  isLoadingThreads,
  isLoadingMessages,
  isSendingMessage,
  isInterruptingTurn,
  refreshAll,
  refreshSkills,
  selectThread,
  ensureThreadMessagesLoaded,
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
  setSelectedCollaborationMode,
  setSelectedModelId,
  setSelectedReasoningEffort,
  respondToPendingServerRequest,
  renameProject,
  removeProject,
  reorderProject,
  pinProjectToTop,
  startPolling,
  stopPolling,
  primeSelectedThread,
} = useDesktopState()

const route = useRoute()
const router = useRouter()
const { isMobile } = useMobile()
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
const accounts = ref<UiAccountEntry[]>([])
const isRefreshingAccounts = ref(false)
const isSwitchingAccounts = ref(false)
const removingAccountId = ref('')
const confirmingRemoveAccountId = ref('')
const accountActionError = ref('')
const SEND_WITH_ENTER_KEY = 'codex-web-local.send-with-enter.v1'
const IN_PROGRESS_SEND_MODE_KEY = 'codex-web-local.in-progress-send-mode.v1'
const DARK_MODE_KEY = 'codex-web-local.dark-mode.v1'
const DICTATION_CLICK_TO_TOGGLE_KEY = 'codex-web-local.dictation-click-to-toggle.v1'
const MOBILE_RESUME_RELOAD_MIN_HIDDEN_MS = 400
const sendWithEnter = ref(loadBoolPref(SEND_WITH_ENTER_KEY, true))
const inProgressSendMode = ref<'steer' | 'queue'>(loadInProgressSendModePref())
const darkMode = ref<'system' | 'light' | 'dark'>(loadDarkModePref())
const dictationClickToToggle = ref(loadBoolPref(DICTATION_CLICK_TO_TOGGLE_KEY, false))
const mobileHiddenAtMs = ref<number | null>(null)
const mobileResumeReloadTriggered = ref(false)
const mobileResumeSyncInProgress = ref(false)
let accountStatePollTimer: number | null = null
let isAccountStatePollInFlight = false

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
const liveOverlay = computed(() => selectedLiveOverlay.value)
const composerThreadContextId = computed(() => (isHomeRoute.value ? '__new-thread__' : selectedThreadId.value))
const composerCwd = computed(() => {
  if (isHomeRoute.value) return newThreadCwd.value.trim()
  return selectedThread.value?.cwd?.trim() ?? ''
})
const isSelectedThreadInProgress = computed(() => !isHomeRoute.value && selectedThread.value?.inProgress === true)
const isAccountSwitchBlocked = computed(() =>
  isSendingMessage.value ||
  isInterruptingTurn.value ||
  isRollingBack.value ||
  isSelectedThreadInProgress.value ||
  selectedThreadServerRequests.value.length > 0,
)
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

onMounted(() => {
  window.addEventListener('keydown', onWindowKeyDown)
  document.addEventListener('visibilitychange', onDocumentVisibilityChange)
  window.addEventListener('pageshow', onWindowPageShow)
  window.addEventListener('focus', onWindowFocus)
  applyDarkMode()
  darkModeMediaQuery?.addEventListener('change', applyDarkMode)
  void initialize()
  void applyLaunchProjectPathFromUrl()
  void loadHomeDirectory()
  void loadWorkspaceRootOptionsState()
  void refreshDefaultProjectName()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onWindowKeyDown)
  document.removeEventListener('visibilitychange', onDocumentVisibilityChange)
  window.removeEventListener('pageshow', onWindowPageShow)
  window.removeEventListener('focus', onWindowFocus)
  darkModeMediaQuery?.removeEventListener('change', applyDarkMode)
  if (accountStatePollTimer !== null) {
    window.clearInterval(accountStatePollTimer)
    accountStatePollTimer = null
  }
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

watch(accounts, () => {
  if (typeof window === 'undefined') return
  const shouldPoll = accounts.value.some((account) => account.quotaStatus === 'loading')
  if (!shouldPoll) {
    if (accountStatePollTimer !== null) {
      window.clearInterval(accountStatePollTimer)
      accountStatePollTimer = null
    }
    return
  }
  if (accountStatePollTimer !== null) return
  accountStatePollTimer = window.setInterval(() => {
    if (isAccountStatePollInFlight) return
    isAccountStatePollInFlight = true
    void loadAccountsState({ silent: true }).finally(() => {
      isAccountStatePollInFlight = false
    })
  }, 1500)
}, { deep: true })

function onSkillsChanged(): void {
  void refreshSkills()
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

function shortAccountId(accountId: string): string {
  return accountId.length > 8 ? accountId.slice(-8) : accountId
}

function formatAccountMeta(account: UiAccountEntry): string {
  const segments = [account.planType || 'unknown']
  if (account.authMode) {
    segments.unshift(account.authMode)
  }
  return segments.join(' · ')
}

function isPaymentRequiredErrorMessage(value: string | null): boolean {
  if (!value) return false
  const normalized = value.toLowerCase()
  return normalized.includes('payment required') || /\b402\b/.test(normalized)
}

function isAccountUnavailable(account: UiAccountEntry): boolean {
  return account.unavailableReason === 'payment_required' || isPaymentRequiredErrorMessage(account.quotaError)
}

function isAccountActionDisabled(account: UiAccountEntry): boolean {
  return isRefreshingAccounts.value || isSwitchingAccounts.value || removingAccountId.value.length > 0
    || (account.isActive && removingAccountId.value !== account.accountId && isAccountSwitchBlocked.value)
}

function isRemoveConfirmationActive(account: UiAccountEntry): boolean {
  return confirmingRemoveAccountId.value === account.accountId
}

function getAccountSwitchLabel(account: UiAccountEntry): string {
  if (isAccountUnavailable(account)) return 'Unavailable'
  if (account.isActive) return 'Active'
  if (isSwitchingAccounts.value) return 'Switching…'
  return 'Switch'
}

function getAccountRemoveLabel(account: UiAccountEntry): string {
  if (removingAccountId.value === account.accountId) return 'Removing…'
  if (isRemoveConfirmationActive(account)) return 'Click again to remove'
  return 'Remove'
}

function onAccountCardPointerLeave(accountId: string): void {
  if (removingAccountId.value === accountId) return
  if (confirmingRemoveAccountId.value === accountId) {
    confirmingRemoveAccountId.value = ''
  }
}

function pickWeeklyQuotaWindow(account: UiAccountEntry) {
  const quota = account.quotaSnapshot
  if (!quota) return null
  const windows = [quota?.primary, quota?.secondary].filter((quotaWindow): quotaWindow is UiRateLimitWindow => quotaWindow !== null)
  const exactWeekly = windows.find((quotaWindow) => quotaWindow.windowMinutes === 7 * 24 * 60)
  if (exactWeekly) {
    return exactWeekly
  }
  const longerWindow = windows
    .filter((quotaWindow) => typeof quotaWindow.windowMinutes === 'number' && quotaWindow.windowMinutes >= 7 * 24 * 60)
    .sort((first, second) => (first.windowMinutes ?? 0) - (second.windowMinutes ?? 0))[0] ?? null
  if (longerWindow) {
    return longerWindow
  }
  return quota.secondary ?? null
}

function formatAccountQuota(account: UiAccountEntry): string {
  if (isAccountUnavailable(account)) {
    return account.quotaError || '402 Payment Required'
  }
  const quota = account.quotaSnapshot
  const window = pickWeeklyQuotaWindow(account)
  if (window) {
    const remainingPercent = Math.max(0, Math.min(100, 100 - Math.round(window.usedPercent)))
    return `${remainingPercent}% weekly remaining`
  }
  if (quota?.credits?.unlimited) {
    return 'Unlimited credits'
  }
  if (quota?.credits?.hasCredits && quota.credits.balance) {
    return `${quota.credits.balance} credits`
  }
  if (account.quotaStatus === 'loading') {
    return 'Loading quota…'
  }
  if (account.quotaStatus === 'error') {
    return account.quotaError || 'Quota unavailable'
  }
  return 'Fetching account details…'
}

function buildAccountTitle(account: UiAccountEntry): string {
  return [
    account.email || 'Account',
    formatAccountMeta(account),
    isAccountUnavailable(account) ? 'Unavailable account' : null,
    formatAccountQuota(account),
    `Workspace ${account.accountId}`,
  ].filter(Boolean).join('\n')
}

async function loadAccountsState(options: { silent?: boolean } = {}): Promise<void> {
  try {
    const result = await getAccounts()
    accounts.value = result.accounts
    if (!result.accounts.some((account) => account.accountId === confirmingRemoveAccountId.value)) {
      confirmingRemoveAccountId.value = ''
    }
  } catch (error) {
    if (options.silent === true) return
    accountActionError.value = error instanceof Error ? error.message : 'Failed to load accounts'
  }
}

async function onRefreshAccounts(): Promise<void> {
  if (isRefreshingAccounts.value || isSwitchingAccounts.value) return
  accountActionError.value = ''
  confirmingRemoveAccountId.value = ''
  isRefreshingAccounts.value = true
  try {
    const result = await refreshAccountsFromAuth()
    accounts.value = result.accounts
    stopPolling()
    startPolling()
    void refreshAll({
      includeSelectedThreadMessages: true,
    })
  } catch (error) {
    accountActionError.value = error instanceof Error ? error.message : 'Failed to refresh accounts'
  } finally {
    isRefreshingAccounts.value = false
  }
}

async function onSwitchAccount(accountId: string): Promise<void> {
  if (isSwitchingAccounts.value || isRefreshingAccounts.value) return
  if (isAccountSwitchBlocked.value) {
    accountActionError.value = 'Finish the current turn and pending requests before switching accounts.'
    return
  }
  accountActionError.value = ''
  confirmingRemoveAccountId.value = ''
  isSwitchingAccounts.value = true
  try {
    const nextActiveAccount = await switchAccount(accountId)
    accounts.value = accounts.value.map((account) => (
      account.accountId === accountId
        ? nextActiveAccount
        : { ...account, isActive: false }
    ))
    stopPolling()
    startPolling()
    void refreshAll({
      includeSelectedThreadMessages: true,
    })
    void loadAccountsState({ silent: true })
  } catch (error) {
    accountActionError.value = error instanceof Error ? error.message : 'Failed to switch account'
  } finally {
    isSwitchingAccounts.value = false
  }
}

async function onRemoveAccount(accountId: string): Promise<void> {
  if (isRefreshingAccounts.value || isSwitchingAccounts.value || removingAccountId.value.length > 0) return
  const targetAccount = accounts.value.find((account) => account.accountId === accountId) ?? null
  if (!targetAccount) return
  if (confirmingRemoveAccountId.value !== accountId) {
    confirmingRemoveAccountId.value = accountId
    return
  }
  if (targetAccount.isActive && isAccountSwitchBlocked.value) {
    accountActionError.value = 'Finish the current turn and pending requests before removing the active account.'
    return
  }

  const removedWasActive = targetAccount.isActive
  accountActionError.value = ''
  confirmingRemoveAccountId.value = ''
  removingAccountId.value = accountId
  try {
    const result = await removeAccount(accountId)
    accounts.value = result.accounts
    stopPolling()
    startPolling()
    if (removedWasActive) {
      void refreshAll({
        includeSelectedThreadMessages: true,
      })
    }
    void loadAccountsState({ silent: true })
  } catch (error) {
    accountActionError.value = error instanceof Error ? error.message : 'Failed to remove account'
  } finally {
    removingAccountId.value = ''
  }
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

async function onRemoveProject(projectName: string): Promise<void> {
  await removeProject(projectName)
  await loadWorkspaceRootOptionsState()
  void refreshDefaultProjectName()
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

function onDocumentVisibilityChange(): void {
  if (typeof document === 'undefined') return
  if (!isMobile.value) return

  if (document.visibilityState === 'hidden') {
    mobileHiddenAtMs.value = Date.now()
    mobileResumeReloadTriggered.value = false
    return
  }

  maybeSyncAfterMobileResume()
}

function onWindowPageShow(event: PageTransitionEvent): void {
  if (!event.persisted) return
  maybeSyncAfterMobileResume()
}

function onWindowFocus(): void {
  maybeSyncAfterMobileResume()
}

function maybeSyncAfterMobileResume(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (!isMobile.value) return
  if (document.visibilityState !== 'visible') return
  if (mobileResumeReloadTriggered.value) return
  if (mobileHiddenAtMs.value === null) return

  const hiddenForMs = Date.now() - mobileHiddenAtMs.value
  if (hiddenForMs < MOBILE_RESUME_RELOAD_MIN_HIDDEN_MS) return

  mobileResumeReloadTriggered.value = true
  mobileHiddenAtMs.value = null
  void syncAfterMobileResume()
}

async function syncAfterMobileResume(): Promise<void> {
  if (mobileResumeSyncInProgress.value) return
  mobileResumeSyncInProgress.value = true

  try {
    await refreshAll({
      includeSelectedThreadMessages: true,
      awaitAncillaryRefreshes: true,
    })
    await restoreLastActiveThreadRoute()
    await syncThreadSelectionWithRoute()
  } finally {
    mobileResumeSyncInProgress.value = false
  }
}

function onSubmitThreadMessage(payload: { text: string; imageUrls: string[]; fileAttachments: Array<{ label: string; path: string; fsPath: string }>; skills: Array<{ name: string; path: string }>; mode: 'steer' | 'queue' }): void {
  const text = payload.text
  if (isHomeRoute.value) {
    void submitFirstMessageForNewThread(text, payload.imageUrls, payload.skills, payload.fileAttachments)
    return
  }
  void sendMessageToSelectedThread(text, payload.imageUrls, payload.skills, payload.mode, payload.fileAttachments)
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

function onInterruptTurn(): void {
  void interruptSelectedThreadTurn()
}

function onRollback(payload: { turnIndex: number }): void {
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
  if (typeof window === 'undefined') return 'queue'
  const v = window.localStorage.getItem(IN_PROGRESS_SEND_MODE_KEY)
  return v === 'steer' ? 'steer' : 'queue'
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

function onSelectCollaborationMode(mode: 'default' | 'plan'): void {
  setSelectedCollaborationMode(mode)
}

async function initialize(): Promise<void> {
  await router.isReady()

  if (route.name === 'thread' && routeThreadId.value) {
    primeSelectedThread(routeThreadId.value)
  }

  startPolling()
  await refreshAll({
    includeSelectedThreadMessages: true,
  })
  void loadAccountsState({ silent: true })
  await restoreLastActiveThreadRoute()
  hasInitialized.value = true
  await syncThreadSelectionWithRoute()
}

type LastActiveThreadRoute = {
  routeName: 'thread'
  threadId: string
  updatedAtIso: string
}

function loadLastActiveThreadRoute(): LastActiveThreadRoute | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(LAST_ACTIVE_THREAD_ROUTE_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<LastActiveThreadRoute> | null
    if (!parsed || parsed.routeName !== 'thread') return null
    if (typeof parsed.threadId !== 'string' || parsed.threadId.trim().length === 0) return null
    if (typeof parsed.updatedAtIso !== 'string' || parsed.updatedAtIso.trim().length === 0) return null

    return {
      routeName: 'thread',
      threadId: parsed.threadId.trim(),
      updatedAtIso: parsed.updatedAtIso,
    }
  } catch {
    return null
  }
}

function saveLastActiveThreadRoute(threadId: string): void {
  if (typeof window === 'undefined') return
  const normalizedThreadId = threadId.trim()
  if (!normalizedThreadId) return

  const payload: LastActiveThreadRoute = {
    routeName: 'thread',
    threadId: normalizedThreadId,
    updatedAtIso: new Date().toISOString(),
  }
  window.localStorage.setItem(LAST_ACTIVE_THREAD_ROUTE_STORAGE_KEY, JSON.stringify(payload))
}

function clearLastActiveThreadRoute(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LAST_ACTIVE_THREAD_ROUTE_STORAGE_KEY)
}

async function restoreLastActiveThreadRoute(): Promise<boolean> {
  if (route.name !== 'home') return false

  const persistedRoute = loadLastActiveThreadRoute()
  const fallbackThreadId = selectedThreadId.value.trim()
  const candidateThreadId = persistedRoute?.threadId ?? fallbackThreadId
  if (!candidateThreadId) return false

  if (!knownThreadIdSet.value.has(candidateThreadId)) {
    if (persistedRoute?.threadId === candidateThreadId) {
      clearLastActiveThreadRoute()
    }
    return false
  }

  await router.replace({ name: 'thread', params: { threadId: candidateThreadId } })
  return true
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
      } else {
        void ensureThreadMessagesLoaded(threadId, { silent: true })
      }
      return
    }

  } finally {
    isRouteSyncInProgress.value = false
  }
}

watch(
  () => [route.name, routeThreadId.value, selectedThreadId.value, hasInitialized.value] as const,
  ([routeName, threadIdFromRoute, threadIdFromSelection, ready]) => {
    if (!ready) return
    if (routeName !== 'thread') return

    const threadId = (threadIdFromRoute || threadIdFromSelection).trim()
    if (!threadId) return
    if (!knownThreadIdSet.value.has(threadId)) return

    saveLastActiveThreadRoute(threadId)
  },
)

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
  () => [hasInitialized.value, route.name, selectedThreadId.value] as const,
  ([ready, routeName, threadId]) => {
    if (!ready) return
    if (routeName !== 'thread') return
    if (!threadId) return
    void ensureThreadMessagesLoaded(threadId, { silent: true })
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
  @apply h-full min-h-0 min-w-0 w-full flex flex-col overflow-y-hidden overflow-x-hidden bg-white;
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
  @apply flex-1 min-h-0 min-w-0 w-full flex flex-col gap-2 sm:gap-3 pt-1 pb-2 sm:pb-4 overflow-y-hidden overflow-x-hidden;
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

.sidebar-settings-row + .sidebar-settings-row {
  @apply border-t border-zinc-100;
}

.sidebar-settings-account-section {
  @apply border-t border-zinc-100 bg-zinc-50/60 px-3 py-3;
}

.sidebar-settings-account-header {
  @apply mb-2 flex items-center justify-between gap-2;
}

.sidebar-settings-account-header-main {
  @apply flex items-center gap-2;
}

.sidebar-settings-account-title {
  @apply text-sm font-medium text-zinc-800;
}

.sidebar-settings-account-count {
  @apply rounded bg-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-600;
}

.sidebar-settings-account-error {
  @apply mb-2 rounded-md bg-rose-50 px-2 py-1.5 text-xs text-rose-700;
}

.sidebar-settings-account-refresh {
  @apply shrink-0 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-default disabled:opacity-60;
}

.sidebar-settings-account-empty {
  @apply text-xs text-zinc-500;
}

.sidebar-settings-account-list {
  @apply flex max-h-56 flex-col gap-2 overflow-y-auto;
}

.sidebar-settings-account-item {
  @apply flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2;
}

.sidebar-settings-account-item.is-active {
  @apply border-emerald-200 bg-emerald-50;
}

.sidebar-settings-account-item.is-unavailable {
  @apply border-rose-200 bg-rose-50;
}

.sidebar-settings-account-main {
  @apply min-w-0 flex-1;
}

.sidebar-settings-account-actions {
  @apply flex w-24 shrink-0 flex-col items-end gap-1.5;
}

.sidebar-settings-account-email {
  @apply truncate text-sm text-zinc-800;
}

.sidebar-settings-account-meta {
  @apply truncate text-[11px] text-zinc-500;
}

.sidebar-settings-account-quota {
  @apply truncate text-[11px] text-zinc-600;
}

.sidebar-settings-account-id {
  @apply mt-1 inline-flex max-w-full rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-700;
}

.sidebar-settings-account-item.is-active .sidebar-settings-account-id {
  @apply bg-emerald-100 text-emerald-800;
}

.sidebar-settings-account-item.is-unavailable .sidebar-settings-account-id {
  @apply bg-rose-100 text-rose-800;
}

.sidebar-settings-account-switch {
  @apply min-w-[4.75rem] shrink-0 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-center text-xs text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-default disabled:opacity-60;
}

.sidebar-settings-account-remove {
  @apply shrink-0 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] leading-4 text-zinc-500 opacity-0 pointer-events-none transition hover:bg-amber-50 disabled:cursor-default disabled:opacity-60;
}

.sidebar-settings-account-item:hover .sidebar-settings-account-remove,
.sidebar-settings-account-item.is-confirming-remove .sidebar-settings-account-remove {
  @apply opacity-100 pointer-events-auto;
}

.sidebar-settings-account-remove.is-confirming {
  @apply border-amber-300 bg-amber-50 text-amber-700 font-medium;
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

.build-badge {
  @apply fixed top-3 right-3 z-50 rounded-md border border-zinc-200 bg-white/95 px-2 py-1 text-xs font-medium text-zinc-600 shadow-sm backdrop-blur;
}

</style>
