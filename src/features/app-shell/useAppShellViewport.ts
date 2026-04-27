import { computed, onMounted, onUnmounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import { MOBILE_RESUME_RELOAD_MIN_HIDDEN_MS } from './constants'

export function useAppShellViewport(options: {
  isMobile: Ref<boolean>
  isHomeRoute: ComputedRef<boolean>
  composerCwd: ComputedRef<string>
  selectedThreadId: Ref<string>
  selectedThreadTerminalOpen: Ref<boolean>
  setThreadTerminalOpen: (threadId: string, open: boolean) => void
  toggleSelectedThreadTerminal: () => void
  refreshAll: (options: { includeSelectedThreadMessages: boolean; awaitAncillaryRefreshes?: boolean }) => Promise<void>
  syncThreadSelectionWithRoute: () => Promise<void>
  loadWorkspaceRootOptionsState: () => Promise<void>
  refreshDefaultProjectName: () => Promise<void>
}) {
  const homeTerminalOpen = ref(false)
  const isTerminalInputFocused = ref(false)
  const isTerminalKeyboardFocusFallbackActive = ref(false)
  const isThreadTerminalAvailable = ref(true)
  const mobileHiddenAtMs = ref<number | null>(null)
  const mobileResumeReloadTriggered = ref(false)
  const mobileResumeSyncInProgress = ref(false)
  const visualViewportHeight = ref(typeof window !== 'undefined' ? window.visualViewport?.height ?? window.innerHeight : 0)
  const visualViewportOffsetTop = ref(typeof window !== 'undefined' ? window.visualViewport?.offsetTop ?? 0 : 0)
  const layoutViewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 0)
  let terminalKeyboardFocusFallbackTimer: ReturnType<typeof setTimeout> | null = null

  const isVirtualKeyboardOpen = computed(() => {
    if (!options.isMobile.value) return false
    if (visualViewportHeight.value <= 0 || layoutViewportHeight.value <= 0) return false
    return layoutViewportHeight.value - visualViewportHeight.value > 120
  })

  const isComposerTerminalOpen = computed(() => (
    options.isHomeRoute.value ? homeTerminalOpen.value : options.selectedThreadTerminalOpen.value
  ))

  const isTerminalKeyboardLayoutActive = computed(() => (
    isVirtualKeyboardOpen.value || (isComposerTerminalOpen.value && isTerminalKeyboardFocusFallbackActive.value)
  ))

  function updateVisualViewportState(): void {
    if (typeof window === 'undefined') return
    layoutViewportHeight.value = Math.max(layoutViewportHeight.value, window.innerHeight)
    visualViewportHeight.value = window.visualViewport?.height ?? window.innerHeight
    visualViewportOffsetTop.value = window.visualViewport?.offsetTop ?? 0
  }

  function toggleComposerTerminal(): void {
    if (!isThreadTerminalAvailable.value) return
    if (options.isHomeRoute.value) {
      if (!options.composerCwd.value) return
      homeTerminalOpen.value = !homeTerminalOpen.value
      if (!homeTerminalOpen.value) resetTerminalKeyboardFocusState()
      return
    }
    options.toggleSelectedThreadTerminal()
    if (!options.selectedThreadTerminalOpen.value) resetTerminalKeyboardFocusState()
  }

  function onTerminalFocusChange(focused: boolean): void {
    isTerminalInputFocused.value = focused
    if (!focused) {
      isTerminalKeyboardFocusFallbackActive.value = false
      clearTerminalKeyboardFocusFallbackTimer()
      return
    }
    isTerminalKeyboardFocusFallbackActive.value = true
    clearTerminalKeyboardFocusFallbackTimer()
    terminalKeyboardFocusFallbackTimer = setTimeout(() => {
      terminalKeyboardFocusFallbackTimer = null
      if (!isVirtualKeyboardOpen.value) {
        isTerminalKeyboardFocusFallbackActive.value = false
      }
    }, 1500)
  }

  function onHideHomeTerminal(): void {
    homeTerminalOpen.value = false
    resetTerminalKeyboardFocusState()
  }

  function onHideSelectedThreadTerminal(): void {
    if (options.selectedThreadId.value) {
      options.setThreadTerminalOpen(options.selectedThreadId.value, false)
    }
    resetTerminalKeyboardFocusState()
  }

  function resetTerminalKeyboardFocusState(): void {
    isTerminalInputFocused.value = false
    isTerminalKeyboardFocusFallbackActive.value = false
    clearTerminalKeyboardFocusFallbackTimer()
  }

  function clearTerminalKeyboardFocusFallbackTimer(): void {
    if (!terminalKeyboardFocusFallbackTimer) return
    clearTimeout(terminalKeyboardFocusFallbackTimer)
    terminalKeyboardFocusFallbackTimer = null
  }

  function onDocumentVisibilityChange(): void {
    if (typeof document === 'undefined' || !options.isMobile.value) return
    if (document.visibilityState === 'hidden') {
      mobileHiddenAtMs.value = Date.now()
      mobileResumeReloadTriggered.value = false
      return
    }
    maybeSyncAfterMobileResume()
  }

  function onWindowPageShow(event: PageTransitionEvent): void {
    if (event.persisted) maybeSyncAfterMobileResume()
  }

  function onWindowFocus(): void {
    if (options.isHomeRoute.value) {
      void options.loadWorkspaceRootOptionsState()
      void options.refreshDefaultProjectName()
    }
    maybeSyncAfterMobileResume()
  }

  function maybeSyncAfterMobileResume(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    if (!options.isMobile.value || document.visibilityState !== 'visible') return
    if (mobileResumeReloadTriggered.value || mobileHiddenAtMs.value === null) return
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
      await options.refreshAll({ includeSelectedThreadMessages: true, awaitAncillaryRefreshes: true })
      await options.syncThreadSelectionWithRoute()
    } finally {
      mobileResumeSyncInProgress.value = false
    }
  }

  onMounted(() => {
    window.addEventListener('resize', updateVisualViewportState)
    window.addEventListener('focus', onWindowFocus)
    document.addEventListener('visibilitychange', onDocumentVisibilityChange)
    window.addEventListener('pageshow', onWindowPageShow)
    window.visualViewport?.addEventListener('resize', updateVisualViewportState)
    window.visualViewport?.addEventListener('scroll', updateVisualViewportState)
    updateVisualViewportState()
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateVisualViewportState)
    window.removeEventListener('focus', onWindowFocus)
    document.removeEventListener('visibilitychange', onDocumentVisibilityChange)
    window.removeEventListener('pageshow', onWindowPageShow)
    window.visualViewport?.removeEventListener('resize', updateVisualViewportState)
    window.visualViewport?.removeEventListener('scroll', updateVisualViewportState)
    clearTerminalKeyboardFocusFallbackTimer()
  })

  watch(isVirtualKeyboardOpen, (open) => {
    if (!open) isTerminalKeyboardFocusFallbackActive.value = false
  })

  return {
    homeTerminalOpen,
    isTerminalInputFocused,
    isTerminalKeyboardFocusFallbackActive,
    isThreadTerminalAvailable,
    visualViewportHeight,
    visualViewportOffsetTop,
    layoutViewportHeight,
    isVirtualKeyboardOpen,
    isComposerTerminalOpen,
    isTerminalKeyboardLayoutActive,
    toggleComposerTerminal,
    onTerminalFocusChange,
    onHideHomeTerminal,
    onHideSelectedThreadTerminal,
    resetTerminalKeyboardFocusState,
  }
}
