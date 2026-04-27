import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { searchThreads } from '../../api/codexGateway'

export function useAppShellRouting(options: {
  routeName: Ref<string | symbol | undefined>
  routeThreadId: ComputedRef<string>
  selectedThreadId: Ref<string>
  isLoadingThreads: Ref<boolean>
  hasInitialized: Ref<boolean>
  routerReady: () => Promise<void>
  shouldPrimeThread: () => boolean
  primeSelectedThread: (threadId: string) => void
  refreshAll: (options: { includeSelectedThreadMessages: boolean }) => Promise<void>
  loadAccountsState: (options?: { silent?: boolean }) => Promise<void> | void
  applyLaunchProjectPathFromUrl: () => Promise<boolean>
  startPolling: () => void
  selectThread: (threadId: string) => Promise<void>
  ensureThreadMessagesLoaded: (threadId: string, options?: { silent?: boolean }) => Promise<void> | void
  replaceHome: () => Promise<void>
  replaceThread: (threadId: string) => Promise<void>
}) {
  const isRouteSyncInProgress = ref(false)
  const serverMatchedThreadIds = ref<string[] | null>(null)
  let hasPendingRouteSync = false
  let threadSearchTimer: ReturnType<typeof setTimeout> | null = null

  const isHomeRoute = computed(() => options.routeName.value === 'home')
  const isSkillsRoute = computed(() => options.routeName.value === 'skills')

  async function initialize(): Promise<void> {
    await options.routerReady()
    if (options.routeName.value === 'thread' && options.routeThreadId.value && options.shouldPrimeThread()) {
      options.primeSelectedThread(options.routeThreadId.value)
    }
    await options.refreshAll({
      includeSelectedThreadMessages: options.routeName.value === 'thread',
    })
    void options.loadAccountsState({ silent: true })
    await options.applyLaunchProjectPathFromUrl()
    options.hasInitialized.value = true
    await syncThreadSelectionWithRoute()
    options.startPolling()
  }

  async function syncThreadSelectionWithRoute(): Promise<void> {
    if (isRouteSyncInProgress.value) {
      hasPendingRouteSync = true
      return
    }
    isRouteSyncInProgress.value = true
    try {
      do {
        hasPendingRouteSync = false
        if (options.routeName.value === 'home' || options.routeName.value === 'skills') {
          if (options.selectedThreadId.value !== '') {
            await options.selectThread('')
          }
          continue
        }
        if (options.routeName.value === 'thread') {
          const threadId = options.routeThreadId.value
          if (!threadId) continue
          if (options.selectedThreadId.value !== threadId) {
            await options.selectThread(threadId)
          } else {
            void options.ensureThreadMessagesLoaded(threadId, { silent: true })
          }
        }
      } while (hasPendingRouteSync)
    } finally {
      isRouteSyncInProgress.value = false
    }
  }

  function bindSidebarSearch(sidebarSearchQuery: Ref<string>) {
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
  }

  watch(
    () => [options.routeName.value, options.routeThreadId.value, options.isLoadingThreads.value, options.selectedThreadId.value] as const,
    async () => {
      if (!options.hasInitialized.value) return
      await syncThreadSelectionWithRoute()
    },
  )

  watch(
    () => options.selectedThreadId.value,
    async (threadId) => {
      if (!options.hasInitialized.value || isRouteSyncInProgress.value) return
      if (isHomeRoute.value || isSkillsRoute.value) return
      if (!threadId) {
        if (options.routeName.value !== 'home') await options.replaceHome()
        return
      }
      if (options.routeName.value === 'thread' && options.routeThreadId.value === threadId) return
      await options.replaceThread(threadId)
    },
  )

  function cleanupRouting(): void {
    if (threadSearchTimer) {
      clearTimeout(threadSearchTimer)
      threadSearchTimer = null
    }
  }

  return {
    isRouteSyncInProgress,
    serverMatchedThreadIds,
    isHomeRoute,
    isSkillsRoute,
    initialize,
    syncThreadSelectionWithRoute,
    bindSidebarSearch,
    cleanupRouting,
  }
}
