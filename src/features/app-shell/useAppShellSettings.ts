import { computed, ref, type Ref } from 'vue'
import { useUiLanguage } from '../../composables/useUiLanguage'
import { getFreeModeStatus, setCustomProvider, setFreeMode, setFreeModeCustomKey } from '../../api/codexGateway'
import {
  ACCOUNTS_SECTION_COLLAPSED_STORAGE_KEY,
  CHAT_WIDTH_KEY,
  CHAT_WIDTH_PRESETS,
  DARK_MODE_KEY,
  DICTATION_AUTO_SEND_KEY,
  DICTATION_CLICK_TO_TOGGLE_KEY,
  DICTATION_LANGUAGE_KEY,
  IN_PROGRESS_SEND_MODE_KEY,
  SEND_WITH_ENTER_KEY,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  WHISPER_LANGUAGES,
} from './constants'
import type { ChatWidthMode } from './types'

type RouteNameRef = Ref<string | symbol | undefined>

export function useAppShellSettings(options: {
  routeName: RouteNameRef
  refreshAll: (options: { includeSelectedThreadMessages: boolean; providerChanged?: boolean; awaitAncillaryRefreshes?: boolean }) => Promise<void>
  goHome: () => void
}) {
  const { t, uiLanguage, uiLanguageOptions, setUiLanguage } = useUiLanguage()
  const SETTINGS_HELP = {
    sendWithEnter: t('When enabled, press Enter to send. When disabled, use Command+Enter to send.'),
    inProgressSendMode: t('If a turn is still running, choose whether a new prompt should steer the current turn or be queued.'),
    appearance: t('Switch between system theme, light mode, and dark mode.'),
    chatWidth: t('Choose how wide the conversation column and composer can grow on desktop screens.'),
    dictationClickToToggle: t('Use click-to-start and click-to-stop dictation instead of hold-to-talk.'),
    dictationAutoSend: t('Automatically send transcribed dictation when recording stops.'),
    dictationLanguage: t('Choose transcription language or keep auto-detect.'),
  } as const

  const isSidebarCollapsed = ref(loadSidebarCollapsed())
  const sidebarSearchQuery = ref('')
  const isSidebarSearchVisible = ref(false)
  const sidebarSearchInputRef = ref<HTMLInputElement | null>(null)
  const settingsAreaRef = ref<HTMLElement | null>(null)
  const settingsPanelRef = ref<HTMLElement | null>(null)
  const settingsButtonRef = ref<HTMLElement | null>(null)
  const isSettingsOpen = ref(false)
  const isAccountsSectionCollapsed = ref(loadAccountsSectionCollapsed())
  const sendWithEnter = ref(loadBoolPref(SEND_WITH_ENTER_KEY, true))
  const inProgressSendMode = ref<'steer' | 'queue'>(loadInProgressSendModePref())
  const darkMode = ref<'system' | 'light' | 'dark'>(loadDarkModePref())
  const chatWidth = ref<ChatWidthMode>(loadChatWidthPref())
  const dictationClickToToggle = ref(loadBoolPref(DICTATION_CLICK_TO_TOGGLE_KEY, false))
  const dictationAutoSend = ref(loadBoolPref(DICTATION_AUTO_SEND_KEY, true))
  const dictationLanguage = ref(loadDictationLanguagePref())
  const freeModeEnabled = ref(false)
  const freeModeLoading = ref(false)
  const freeModeCustomKey = ref('')
  const freeModeHasCustomKey = ref(false)
  const freeModeCustomKeyMasked = ref<string | null>(null)
  const freeModeCustomKeySaving = ref(false)
  const providerError = ref('')
  const selectedProvider = ref<'codex' | 'openrouter' | 'opencode-zen' | 'custom'>('codex')
  const customEndpointUrl = ref('')
  const customEndpointKey = ref('')
  const customEndpointWireApi = ref<'responses' | 'chat'>('responses')
  const openRouterWireApi = ref<'responses' | 'chat'>('responses')
  const opencodeZenKey = ref('')

  const dictationLanguageOptions = computed(() => buildDictationLanguageOptions(dictationLanguage.value, t))
  const chatWidthLabel = computed(() => t(CHAT_WIDTH_PRESETS[chatWidth.value].label))

  function setSidebarCollapsed(nextValue: boolean): void {
    if (isSidebarCollapsed.value === nextValue) return
    isSidebarCollapsed.value = nextValue
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, nextValue ? '1' : '0')
    }
  }

  function toggleSidebarSearch(): void {
    isSidebarSearchVisible.value = !isSidebarSearchVisible.value
    if (isSidebarSearchVisible.value) {
      queueMicrotask(() => sidebarSearchInputRef.value?.focus())
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
    applyDarkMode(darkMode.value)
  }

  function cycleChatWidth(): void {
    const order: ChatWidthMode[] = ['standard', 'wide', 'extra-wide']
    const idx = order.indexOf(chatWidth.value)
    chatWidth.value = order[(idx + 1) % order.length]
    window.localStorage.setItem(CHAT_WIDTH_KEY, chatWidth.value)
  }

  function toggleDictationClickToToggle(): void {
    dictationClickToToggle.value = !dictationClickToToggle.value
    window.localStorage.setItem(DICTATION_CLICK_TO_TOGGLE_KEY, dictationClickToToggle.value ? '1' : '0')
  }

  function toggleDictationAutoSend(): void {
    dictationAutoSend.value = !dictationAutoSend.value
    window.localStorage.setItem(DICTATION_AUTO_SEND_KEY, dictationAutoSend.value ? '1' : '0')
  }

  async function onProviderChange(provider: string): Promise<void> {
    if (freeModeLoading.value) return
    freeModeLoading.value = true
    try {
      if (provider === 'codex') {
        selectedProvider.value = 'codex'
        const result = await setFreeMode(false)
        freeModeEnabled.value = result.enabled
      } else if (provider === 'openrouter') {
        selectedProvider.value = 'openrouter'
        const result = await setFreeMode(true)
        freeModeEnabled.value = result.enabled
        await setCustomProvider('', '', {
          wireApi: openRouterWireApi.value,
          provider: 'openrouter',
        })
      } else if (provider === 'opencode-zen') {
        selectedProvider.value = 'opencode-zen'
        await setCustomProvider('', opencodeZenKey.value.trim(), {
          wireApi: 'chat',
          provider: 'opencode-zen',
        })
        freeModeEnabled.value = true
      } else if (provider === 'custom') {
        selectedProvider.value = 'custom'
        if (customEndpointUrl.value.trim() && customEndpointKey.value.trim()) {
          await setCustomProvider(customEndpointUrl.value.trim(), customEndpointKey.value.trim(), {
            wireApi: customEndpointWireApi.value,
          })
          freeModeEnabled.value = true
        }
      }
      providerError.value = ''
      await options.refreshAll({ includeSelectedThreadMessages: false, providerChanged: true, awaitAncillaryRefreshes: true })
      if (options.routeName.value === 'thread') {
        options.goHome()
      }
    } catch (err) {
      providerError.value = err instanceof Error ? err.message : 'Failed to switch provider'
    } finally {
      freeModeLoading.value = false
    }
  }

  async function saveCustomEndpoint(): Promise<void> {
    if (freeModeCustomKeySaving.value) return
    const url = customEndpointUrl.value.trim()
    if (!url) return
    freeModeCustomKeySaving.value = true
    try {
      providerError.value = ''
      await setCustomProvider(url, customEndpointKey.value.trim(), {
        wireApi: customEndpointWireApi.value,
      })
      freeModeEnabled.value = true
      await options.refreshAll({ includeSelectedThreadMessages: false, providerChanged: true, awaitAncillaryRefreshes: true })
    } catch (err) {
      providerError.value = err instanceof Error ? err.message : 'Failed to save custom endpoint'
    } finally {
      freeModeCustomKeySaving.value = false
    }
  }

  async function setOpenRouterWireApi(nextWireApi: 'responses' | 'chat'): Promise<void> {
    if (freeModeCustomKeySaving.value || freeModeLoading.value) return
    if (openRouterWireApi.value === nextWireApi) return
    const previousWireApi = openRouterWireApi.value
    openRouterWireApi.value = nextWireApi
    freeModeCustomKeySaving.value = true
    try {
      providerError.value = ''
      await setCustomProvider('', '', {
        wireApi: nextWireApi,
        provider: 'openrouter',
      })
      freeModeEnabled.value = true
      await options.refreshAll({ includeSelectedThreadMessages: false, providerChanged: true, awaitAncillaryRefreshes: true })
    } catch (err) {
      openRouterWireApi.value = previousWireApi
      providerError.value = err instanceof Error ? err.message : 'Failed to save OpenRouter API format'
    } finally {
      freeModeCustomKeySaving.value = false
    }
  }

  async function saveOpencodeZen(): Promise<void> {
    if (freeModeCustomKeySaving.value) return
    const key = opencodeZenKey.value.trim()
    if (!key) return
    freeModeCustomKeySaving.value = true
    try {
      providerError.value = ''
      await setCustomProvider('', key, {
        wireApi: 'chat',
        provider: 'opencode-zen',
      })
      freeModeEnabled.value = true
      await options.refreshAll({ includeSelectedThreadMessages: false, providerChanged: true, awaitAncillaryRefreshes: true })
    } catch (err) {
      providerError.value = err instanceof Error ? err.message : 'Failed to save OpenCode Zen config'
    } finally {
      freeModeCustomKeySaving.value = false
    }
  }

  async function saveFreeModeCustomKey(): Promise<void> {
    if (freeModeCustomKeySaving.value) return
    freeModeCustomKeySaving.value = true
    try {
      await setFreeModeCustomKey(freeModeCustomKey.value.trim())
      freeModeCustomKey.value = ''
      await loadFreeModeStatus()
      await options.refreshAll({ includeSelectedThreadMessages: false })
    } finally {
      freeModeCustomKeySaving.value = false
    }
  }

  async function clearFreeModeCustomKey(): Promise<void> {
    if (freeModeCustomKeySaving.value) return
    freeModeCustomKeySaving.value = true
    try {
      await setFreeModeCustomKey('')
      freeModeCustomKey.value = ''
      await loadFreeModeStatus()
      await options.refreshAll({ includeSelectedThreadMessages: false })
    } finally {
      freeModeCustomKeySaving.value = false
    }
  }

  async function loadFreeModeStatus(): Promise<void> {
    try {
      const status = await getFreeModeStatus()
      freeModeEnabled.value = status.enabled
      freeModeHasCustomKey.value = status.customKey ?? false
      freeModeCustomKeyMasked.value = status.maskedKey ?? null
      if (status.enabled) {
        if (status.provider === 'opencode-zen') {
          selectedProvider.value = 'opencode-zen'
        } else if (status.provider === 'custom') {
          selectedProvider.value = 'custom'
          customEndpointUrl.value = status.customBaseUrl ?? ''
          customEndpointWireApi.value = status.wireApi === 'chat' ? 'chat' : 'responses'
        } else {
          selectedProvider.value = 'openrouter'
          openRouterWireApi.value = status.wireApi === 'chat' ? 'chat' : 'responses'
        }
      } else {
        selectedProvider.value = 'codex'
      }
    } catch {
      // Ignore.
    }
  }

  function onDictationLanguageChange(nextValue: string): void {
    const normalized = normalizeToWhisperLanguage(nextValue.trim())
    const value = normalized || 'auto'
    dictationLanguage.value = value
    window.localStorage.setItem(DICTATION_LANGUAGE_KEY, value)
  }

  function toggleAccountsSectionCollapsed(): void {
    isAccountsSectionCollapsed.value = !isAccountsSectionCollapsed.value
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      ACCOUNTS_SECTION_COLLAPSED_STORAGE_KEY,
      isAccountsSectionCollapsed.value ? '1' : '0',
    )
  }

  return {
    t,
    uiLanguage,
    uiLanguageOptions,
    setUiLanguage,
    SETTINGS_HELP,
    isSidebarCollapsed,
    sidebarSearchQuery,
    isSidebarSearchVisible,
    sidebarSearchInputRef,
    settingsAreaRef,
    settingsPanelRef,
    settingsButtonRef,
    isSettingsOpen,
    isAccountsSectionCollapsed,
    sendWithEnter,
    inProgressSendMode,
    darkMode,
    chatWidth,
    dictationClickToToggle,
    dictationAutoSend,
    dictationLanguage,
    dictationLanguageOptions,
    freeModeEnabled,
    freeModeLoading,
    freeModeCustomKey,
    freeModeHasCustomKey,
    freeModeCustomKeyMasked,
    freeModeCustomKeySaving,
    providerError,
    selectedProvider,
    customEndpointUrl,
    customEndpointKey,
    customEndpointWireApi,
    openRouterWireApi,
    opencodeZenKey,
    chatWidthLabel,
    setSidebarCollapsed,
    toggleSidebarSearch,
    clearSidebarSearch,
    onSidebarSearchKeydown,
    toggleSendWithEnter,
    cycleInProgressSendMode,
    cycleDarkMode,
    cycleChatWidth,
    toggleDictationClickToToggle,
    toggleDictationAutoSend,
    onProviderChange,
    saveCustomEndpoint,
    setOpenRouterWireApi,
    saveOpencodeZen,
    saveFreeModeCustomKey,
    clearFreeModeCustomKey,
    loadFreeModeStatus,
    onDictationLanguageChange,
    toggleAccountsSectionCollapsed,
  }
}

function buildDictationLanguageOptions(dictationLanguage: string, t: (key: string) => string): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [{ value: 'auto', label: t('Auto-detect') }]
  const seen = new Set<string>(['auto'])
  const formatLanguageLabel = (value: string) => {
    const languageName = WHISPER_LANGUAGES[value] || value
    const title = languageName.charAt(0).toUpperCase() + languageName.slice(1)
    return `${title} (${value})`
  }
  for (const raw of typeof navigator !== 'undefined' ? (navigator.languages ?? []) : []) {
    const value = normalizeToWhisperLanguage(raw)
    if (!value || seen.has(value)) continue
    seen.add(value)
    options.push({ value, label: `Preferred: ${formatLanguageLabel(value)}` })
  }
  for (const value of Object.keys(WHISPER_LANGUAGES)) {
    if (seen.has(value)) continue
    seen.add(value)
    options.push({ value, label: formatLanguageLabel(value) })
  }
  const current = dictationLanguage.trim()
  if (current && !seen.has(current)) {
    options.push({ value: current, label: formatLanguageLabel(current) })
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

function applyDarkMode(darkMode: 'system' | 'light' | 'dark'): void {
  const root = document.documentElement
  if (darkMode === 'dark') {
    root.classList.add('dark')
  } else if (darkMode === 'light') {
    root.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
}

function loadBoolPref(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  const value = window.localStorage.getItem(key)
  if (value === null) return fallback
  return value === '1'
}

function loadDarkModePref(): 'system' | 'light' | 'dark' {
  if (typeof window === 'undefined') return 'system'
  const value = window.localStorage.getItem(DARK_MODE_KEY)
  if (value === 'light' || value === 'dark') return value
  return 'system'
}

function loadInProgressSendModePref(): 'steer' | 'queue' {
  if (typeof window === 'undefined') return 'steer'
  return window.localStorage.getItem(IN_PROGRESS_SEND_MODE_KEY) === 'queue' ? 'queue' : 'steer'
}

function loadChatWidthPref(): ChatWidthMode {
  if (typeof window === 'undefined') return 'standard'
  const value = window.localStorage.getItem(CHAT_WIDTH_KEY)
  return value === 'standard' || value === 'wide' || value === 'extra-wide' ? value : 'standard'
}

function loadSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1'
}

function loadAccountsSectionCollapsed(): boolean {
  if (typeof window === 'undefined') return true
  const value = window.localStorage.getItem(ACCOUNTS_SECTION_COLLAPSED_STORAGE_KEY)
  if (value === null) return true
  return value === '1'
}

function loadDictationLanguagePref(): string {
  if (typeof window === 'undefined') return 'auto'
  const value = window.localStorage.getItem(DICTATION_LANGUAGE_KEY)?.trim() || 'auto'
  const normalized = normalizeToWhisperLanguage(value)
  return normalized || 'auto'
}
