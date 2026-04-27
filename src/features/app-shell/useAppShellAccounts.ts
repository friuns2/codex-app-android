import { ref, watch, type ComputedRef, type Ref } from 'vue'
import { getAccounts, refreshAccountsFromAuth, removeAccount, switchAccount } from '../../api/codexGateway'
import type { UiAccountEntry, UiRateLimitWindow } from '../../types/codex'

type Translate = (key: string) => string

type UseAppShellAccountsOptions = {
  t: Translate
  isAccountSwitchBlocked: ComputedRef<boolean>
  startPolling: () => void
  stopPolling: () => void
  refreshAll: (options: { includeSelectedThreadMessages: boolean }) => Promise<void> | void
}

export function useAppShellAccounts({
  t,
  isAccountSwitchBlocked,
  startPolling,
  stopPolling,
  refreshAll,
}: UseAppShellAccountsOptions) {
  const accounts = ref<UiAccountEntry[]>([])
  const isRefreshingAccounts = ref(false)
  const isSwitchingAccounts = ref(false)
  const removingAccountId = ref('')
  const confirmingRemoveAccountId = ref('')
  const hoveredAccountId = ref('')
  const accountActionError = ref('')
  let accountStatePollTimer: number | null = null
  let isAccountStatePollInFlight = false

  function isPaymentRequiredErrorMessage(value: string | null): boolean {
    if (!value) return false
    const normalized = value.toLowerCase()
    return normalized.includes('payment required') || /\b402\b/.test(normalized)
  }

  function shortAccountId(accountId: string): string {
    return accountId.length > 8 ? accountId.slice(-8) : accountId
  }

  function formatAccountMeta(account: UiAccountEntry): string {
    const segments = [account.planType || t('unknown')]
    if (account.authMode) {
      segments.unshift(account.authMode)
    }
    return segments.join(' · ')
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

  function isRemoveVisible(account: UiAccountEntry): boolean {
    return hoveredAccountId.value === account.accountId || isRemoveConfirmationActive(account)
  }

  function getAccountSwitchLabel(account: UiAccountEntry): string {
    if (isAccountUnavailable(account)) return t('Unavailable')
    if (account.isActive) return t('Active')
    if (isSwitchingAccounts.value) return t('Switching…')
    return t('Switch')
  }

  function getAccountRemoveLabel(account: UiAccountEntry): string {
    if (removingAccountId.value === account.accountId) return t('Removing…')
    if (isRemoveConfirmationActive(account)) return t('Click again to remove')
    return t('Remove')
  }

  function onAccountCardPointerEnter(accountId: string): void {
    hoveredAccountId.value = accountId
  }

  function onAccountCardPointerLeave(accountId: string): void {
    if (hoveredAccountId.value === accountId) {
      hoveredAccountId.value = ''
    }
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
    if (exactWeekly) return exactWeekly
    const longerWindow = windows
      .filter((quotaWindow) => typeof quotaWindow.windowMinutes === 'number' && quotaWindow.windowMinutes >= 7 * 24 * 60)
      .sort((first, second) => (first.windowMinutes ?? 0) - (second.windowMinutes ?? 0))[0] ?? null
    if (longerWindow) return longerWindow
    return quota.secondary ?? null
  }

  function formatResetDateCompact(resetsAt: number | null): string {
    if (typeof resetsAt !== 'number' || !Number.isFinite(resetsAt)) return ''
    const date = new Date(resetsAt * 1000)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  function formatAccountQuota(account: UiAccountEntry): string {
    if (isAccountUnavailable(account)) {
      return account.quotaError || t('402 Payment Required')
    }
    const quota = account.quotaSnapshot
    const window = pickWeeklyQuotaWindow(account)
    const fallbackWindow = quota?.primary ?? quota?.secondary ?? null
    const displayWindow = window ?? fallbackWindow
    if (displayWindow) {
      const remainingPercent = Math.max(0, Math.min(100, 100 - Math.round(displayWindow.usedPercent)))
      const refreshDate = formatResetDateCompact(displayWindow.resetsAt)
      return refreshDate
        ? `${remainingPercent}% ${t('weekly remaining')} · ${refreshDate}`
        : `${remainingPercent}% ${t('weekly remaining')}`
    }
    if (quota?.credits?.unlimited) return t('Unlimited credits')
    if (quota?.credits?.hasCredits && quota.credits.balance) return `${quota.credits.balance} ${t('credits')}`
    if (account.quotaStatus === 'loading') return t('Loading quota…')
    if (account.quotaStatus === 'error') return account.quotaError || t('Quota unavailable')
    if (account.quotaStatus === 'ready' || account.quotaStatus === 'idle') return t('Quota unavailable')
    return t('Fetching account details…')
  }

  function buildAccountTitle(account: UiAccountEntry): string {
    return [
      account.email || t('Account'),
      formatAccountMeta(account),
      isAccountUnavailable(account) ? t('Unavailable account') : null,
      formatAccountQuota(account),
      `${t('Workspace')} ${account.accountId}`,
    ].filter(Boolean).join('\n')
  }

  async function loadAccountsState(options: { silent?: boolean } = {}): Promise<void> {
    try {
      const result = await getAccounts()
      accounts.value = result.accounts
      if (!result.accounts.some((account) => account.accountId === hoveredAccountId.value)) {
        hoveredAccountId.value = ''
      }
      if (!result.accounts.some((account) => account.accountId === confirmingRemoveAccountId.value)) {
        confirmingRemoveAccountId.value = ''
      }
    } catch (error) {
      if (options.silent === true) return
      accountActionError.value = error instanceof Error ? error.message : t('Failed to load accounts')
    }
  }

  async function onRefreshAccounts(): Promise<void> {
    if (isRefreshingAccounts.value || isSwitchingAccounts.value) return
    accountActionError.value = ''
    hoveredAccountId.value = ''
    confirmingRemoveAccountId.value = ''
    isRefreshingAccounts.value = true
    try {
      const result = await refreshAccountsFromAuth()
      accounts.value = result.accounts
      stopPolling()
      startPolling()
      void refreshAll({ includeSelectedThreadMessages: true })
    } catch (error) {
      accountActionError.value = error instanceof Error ? error.message : t('Failed to refresh accounts')
    } finally {
      isRefreshingAccounts.value = false
    }
  }

  async function onSwitchAccount(accountId: string): Promise<void> {
    if (isSwitchingAccounts.value || isRefreshingAccounts.value) return
    if (isAccountSwitchBlocked.value) {
      accountActionError.value = t('Finish the current turn and pending requests before switching accounts.')
      return
    }
    accountActionError.value = ''
    hoveredAccountId.value = ''
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
      void refreshAll({ includeSelectedThreadMessages: true })
      void loadAccountsState({ silent: true })
    } catch (error) {
      accountActionError.value = error instanceof Error ? error.message : t('Failed to switch account')
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
      accountActionError.value = t('Finish the current turn and pending requests before removing the active account.')
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
        void refreshAll({ includeSelectedThreadMessages: true })
      }
      void loadAccountsState({ silent: true })
    } catch (error) {
      accountActionError.value = error instanceof Error ? error.message : t('Failed to remove account')
    } finally {
      removingAccountId.value = ''
    }
  }

  function cleanupAccountPolling(): void {
    if (accountStatePollTimer !== null) {
      window.clearInterval(accountStatePollTimer)
      accountStatePollTimer = null
    }
  }

  watch(accounts, () => {
    if (typeof window === 'undefined') return
    const shouldPoll = accounts.value.some((account) => account.quotaStatus === 'loading')
    if (!shouldPoll) {
      cleanupAccountPolling()
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

  return {
    accounts,
    isRefreshingAccounts,
    isSwitchingAccounts,
    removingAccountId,
    confirmingRemoveAccountId,
    hoveredAccountId,
    accountActionError,
    shortAccountId,
    formatAccountMeta,
    isAccountUnavailable,
    isAccountActionDisabled,
    isRemoveConfirmationActive,
    isRemoveVisible,
    getAccountSwitchLabel,
    getAccountRemoveLabel,
    onAccountCardPointerEnter,
    onAccountCardPointerLeave,
    formatAccountQuota,
    buildAccountTitle,
    loadAccountsState,
    onRefreshAccounts,
    onSwitchAccount,
    onRemoveAccount,
    cleanupAccountPolling,
  }
}
