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
            :aria-current="isSkillsRoute ? 'page' : undefined"
            type="button"
            @click="router.push({ name: ROUTE_SKILLS }); isMobile && setSidebarCollapsed(true)"
          >
            Skills Hub
          </button>

          <button
            v-if="!isSidebarCollapsed"
            class="sidebar-skills-link"
            :class="{ 'is-active': isSettingsRoute }"
            :aria-current="isSettingsRoute ? 'page' : undefined"
            :aria-pressed="isSettingsOpen"
            :aria-expanded="isSettingsOpen"
            :aria-controls="SETTINGS_PANEL_ID"
            aria-haspopup="dialog"
            :aria-keyshortcuts="SETTINGS_SHORTCUT_ARIA_KEYS"
            :aria-label="SETTINGS_SHORTCUT_LABEL"
            :title="SETTINGS_SHORTCUT_LABEL"
            type="button"
            @click="toggleSettingsPanel()"
          >
            {{ SETTINGS_VISIBLE_LABEL }}
          </button>

          <SidebarThreadTree :groups="projectGroups" :project-display-name-by-id="projectDisplayNameById"
            v-if="!isSidebarCollapsed"
            :selected-thread-id="selectedThreadId" :is-loading="isLoadingThreads"
            :search-query="sidebarSearchQuery"
            :search-matched-thread-ids="serverMatchedThreadIds"
            @select="onSelectThread"
            @archive="onArchiveThread" @start-new-thread="onStartNewThread" @rename-project="onRenameProject"
            @browse-thread-files="onBrowseThreadFiles"
            @rename-thread="onRenameThread"
            @fork-thread="onForkThread"
            @remove-project="onRemoveProject" @reorder-project="onReorderProject"
            @export-thread="onExportThread" />
        </div>

        <div
          v-if="!isSidebarCollapsed"
          ref="settingsAreaRef"
          class="sidebar-settings-area"
          @click="onSettingsAreaClick"
        >
          <Transition name="settings-panel">
            <div
              v-if="isSettingsOpen"
              :id="SETTINGS_PANEL_ID"
              ref="settingsPanelRef"
              class="sidebar-settings-panel"
              role="dialog"
              aria-modal="false"
              :aria-labelledby="SETTINGS_PANEL_TITLE_ID"
              :aria-describedby="SETTINGS_PANEL_DESCRIPTION_ID"
              :aria-keyshortcuts="SETTINGS_DIALOG_SHORTCUT_ARIA_KEYS"
              tabindex="-1"
              @click.stop
            >
              <h2 :id="SETTINGS_PANEL_TITLE_ID" class="sr-only">{{ SETTINGS_VISIBLE_LABEL }}</h2>
              <p :id="SETTINGS_PANEL_DESCRIPTION_ID" class="sr-only">{{ SETTINGS_DIALOG_A11Y_DESCRIPTION }}</p>
              <div class="sidebar-settings-account-section">
                <div class="sidebar-settings-account-header">
                  <div class="sidebar-settings-account-header-main">
                    <button
                      class="sidebar-settings-account-collapse"
                      type="button"
                      :aria-expanded="!isAccountsSectionCollapsed"
                      :title="isAccountsSectionCollapsed ? 'Expand accounts' : 'Collapse accounts'"
                      @click="toggleAccountsSectionCollapsed"
                    >
                      <span class="sidebar-settings-account-collapse-icon">{{ isAccountsSectionCollapsed ? '▸' : '▾' }}</span>
                    </button>
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
                <template v-if="!isAccountsSectionCollapsed">
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
                      'is-remove-visible': isRemoveVisible(account),
                    }"
                    :title="buildAccountTitle(account)"
                    @mouseenter="onAccountCardPointerEnter(account.accountId)"
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
                        :class="{
                          'is-visible': isRemoveVisible(account),
                          'is-confirming': isRemoveConfirmationActive(account),
                        }"
                        type="button"
                        :disabled="isAccountActionDisabled(account)"
                        @click="onRemoveAccount(account.accountId)"
                      >
                        {{ getAccountRemoveLabel(account) }}
                      </button>
                    </div>
                  </article>
                  </div>
                </template>
              </div>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.sendWithEnter" @click="toggleSendWithEnter">
                <span class="sidebar-settings-label">Require ⌘ + enter to send</span>
                <span class="sidebar-settings-value">{{ topLevelSendBehaviorLabel }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.inProgressSendMode" @click="cycleInProgressSendMode">
                <span class="sidebar-settings-label">When busy, send as</span>
                <span class="sidebar-settings-value">{{ topLevelInProgressSendModeLabel }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.collaborationMode" @click="cycleCollaborationMode">
                <span class="sidebar-settings-label">Collaboration mode</span>
                <span class="sidebar-settings-value">{{ topLevelCollaborationModeLabel }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.model" @click="cycleSelectedModel">
                <span class="sidebar-settings-label">Model</span>
                <span class="sidebar-settings-value">{{ topLevelModelLabel }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.reasoningEffort" @click="cycleReasoningEffort">
                <span class="sidebar-settings-label">Reasoning effort</span>
                <span class="sidebar-settings-value">{{ topLevelReasoningEffortLabel }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.provider" :disabled="freeModeLoading" @click="cycleProvider">
                <span class="sidebar-settings-label">Provider</span>
                <span class="sidebar-settings-value">{{ freeModeLoading ? 'Updating…' : topLevelProviderLabel }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.dictationLanguageQuick" @click="cycleDictationLanguage">
                <span class="sidebar-settings-label">Dictation language</span>
                <span class="sidebar-settings-value">{{ topLevelDictationLanguageLabel }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.appearance" :disabled="isWritingTopLevelSetting" @click="cycleDarkMode">
                <span class="sidebar-settings-label">Appearance</span>
                <span class="sidebar-settings-value">{{ activeTopLevelSettingWrite === 'appearance' ? 'Updating…' : topLevelAppearanceLabel }}</span>
              </button>
              <button v-if="isMacOs" class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.showInMenuBar" :disabled="isWritingTopLevelSetting" @click="toggleShowInMenuBar">
                <span class="sidebar-settings-label">Show in menu bar</span>
                <span class="sidebar-settings-value">{{ activeTopLevelSettingWrite === 'menu-bar' ? 'Updating…' : showInMenuBar ? 'Enabled' : 'Disabled' }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.notifications" :disabled="isWritingTopLevelSetting" @click="toggleNotificationsEnabled">
                <span class="sidebar-settings-label">Notifications</span>
                <span class="sidebar-settings-value">{{ activeTopLevelSettingWrite === 'notifications' ? 'Updating…' : notificationsEnabled ? 'Enabled' : 'Disabled' }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.chatWidth" @click="cycleChatWidth">
                <span class="sidebar-settings-label">Chat width</span>
                <span class="sidebar-settings-value">{{ topLevelChatWidthLabel }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.agentSpeed" :disabled="isUpdatingSpeedMode" @click="cycleAgentSpeedMode">
                <span class="sidebar-settings-label">Agent speed</span>
                <span class="sidebar-settings-value">{{ isUpdatingSpeedMode ? 'Updating…' : selectedSpeedMode === 'fast' ? 'Fast' : 'Standard' }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.approvalPolicy" :disabled="isWritingTopLevelSetting" @click="cycleApprovalPolicy">
                <span class="sidebar-settings-label">Approval policy</span>
                <span class="sidebar-settings-value">{{ activeTopLevelSettingWrite === 'approval' ? 'Updating…' : topLevelApprovalPolicyLabel }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.sandboxMode" :disabled="isWritingTopLevelSetting" @click="cycleSandboxMode">
                <span class="sidebar-settings-label">Sandbox mode</span>
                <span class="sidebar-settings-value">{{ activeTopLevelSettingWrite === 'sandbox' ? 'Updating…' : topLevelSandboxModeLabel }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.agentNetworkAccess" :disabled="isWritingTopLevelSetting" @click="toggleAgentNetworkAccess">
                <span class="sidebar-settings-label">Agent network access</span>
                <span class="sidebar-settings-value">{{ activeTopLevelSettingWrite === 'agent-network' ? 'Updating…' : paritySandboxNetworkAccess === 'enabled' ? 'Enabled' : 'Disabled' }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.webSearchMode" :disabled="isWritingTopLevelSetting" @click="cycleWebSearchMode">
                <span class="sidebar-settings-label">Web search mode</span>
                <span class="sidebar-settings-value">{{ activeTopLevelSettingWrite === 'web-search' ? 'Updating…' : topLevelWebSearchModeLabel }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.agentAmbientSuggestions" @click="toggleAgentAmbientSuggestions">
                <span class="sidebar-settings-label">Agent ambient suggestions</span>
                <span class="sidebar-settings-value">{{ agentAmbientSuggestionsEnabled ? 'On' : 'Off' }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.dictationClickToToggle" @click="toggleDictationClickToToggle">
                <span class="sidebar-settings-label">Click to toggle dictation</span>
                <span class="sidebar-settings-value">{{ dictationClickToToggle ? 'On' : 'Off' }}</span>
              </button>
              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.dictationAutoSend" @click="toggleDictationAutoSend">
                <span class="sidebar-settings-label">Auto send dictation</span>
                <span class="sidebar-settings-value">{{ dictationAutoSend ? 'On' : 'Off' }}</span>
              </button>

              <button class="sidebar-settings-row" type="button" :title="SETTINGS_HELP.githubTrendingProjects" @click="toggleGithubTrendingProjects">
                <span class="sidebar-settings-label">GitHub trending projects</span>
                <span class="sidebar-settings-value">{{ showGithubTrendingProjects ? 'On' : 'Off' }}</span>
              </button>
              <button
                v-if="showThreadContextBadge"
                class="sidebar-settings-row"
                type="button"
                title="Compact current thread context"
                @click="compactSelectedThread"
              >
                <span class="sidebar-settings-label">Compact current thread</span>
              </button>
              <button
                v-if="showThreadContextBadge"
                class="sidebar-settings-row"
                type="button"
                title="Stop and clean background terminals for current thread"
                @click="cleanSelectedThreadBackgroundTerminals"
              >
                <span class="sidebar-settings-label">Clean background terminals</span>
              </button>
              <div class="sidebar-settings-row sidebar-settings-row--select" title="Choose the API provider for the Codex backend">
                <span class="sidebar-settings-label">Provider</span>
                <select
                  class="sidebar-settings-provider-select"
                  :value="selectedProvider"
                  :disabled="freeModeLoading"
                  @change="onProviderChange(($event.target as HTMLSelectElement).value)"
                >
                  <option value="codex">Codex</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="opencode-zen">OpenCode Zen</option>
                  <option value="custom">Custom endpoint</option>
                </select>
              </div>
              <div v-if="providerError" class="sidebar-settings-row sidebar-settings-error">
                {{ providerError }}
              </div>
              <div v-if="selectedProvider === 'openrouter'" class="sidebar-settings-row sidebar-settings-row--input">
                <div class="sidebar-settings-provider-info">
                  <span class="sidebar-settings-label">OpenRouter API key</span>
                  <a
                    class="sidebar-settings-provider-link"
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                  >Get API key</a>
                </div>
                <div class="sidebar-settings-key-group">
                  <template v-if="freeModeHasCustomKey && !freeModeCustomKey">
                    <span class="sidebar-settings-key-masked">{{ freeModeCustomKeyMasked }}</span>
                    <button
                      class="sidebar-settings-key-clear"
                      type="button"
                      :disabled="freeModeCustomKeySaving"
                      title="Remove custom key, use community keys"
                      @click="clearFreeModeCustomKey"
                    >&#x2715;</button>
                  </template>
                  <template v-else>
                    <input
                      v-model="freeModeCustomKey"
                      class="sidebar-settings-key-input"
                      type="password"
                      placeholder="sk-or-v1-... (optional, uses free keys if empty)"
                      @keydown.enter="saveFreeModeCustomKey"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="freeModeCustomKeySaving || !freeModeCustomKey.trim()"
                      @click="saveFreeModeCustomKey"
                    >{{ freeModeCustomKeySaving ? '...' : 'Set' }}</button>
                  </template>
                </div>
                <div class="sidebar-settings-row sidebar-settings-row--select" style="margin-top: 4px; padding: 0">
                  <span class="sidebar-settings-label">API format</span>
                  <div class="sidebar-settings-segmented" role="group" aria-label="OpenRouter API format">
                    <button
                      type="button"
                      class="sidebar-settings-segmented-option"
                      :class="{ 'is-active': openRouterWireApi === 'responses' }"
                      :disabled="freeModeCustomKeySaving || freeModeLoading"
                      @click="setOpenRouterWireApi('responses')"
                    >
                      Responses
                    </button>
                    <button
                      type="button"
                      class="sidebar-settings-segmented-option"
                      :class="{ 'is-active': openRouterWireApi === 'chat' }"
                      :disabled="freeModeCustomKeySaving || freeModeLoading"
                      @click="setOpenRouterWireApi('chat')"
                    >
                      Completions
                    </button>
                  </div>
                </div>
              </div>
              <div v-if="selectedProvider === 'opencode-zen'" class="sidebar-settings-row sidebar-settings-row--input">
                <div class="sidebar-settings-provider-info">
                  <span class="sidebar-settings-label">OpenCode Zen API key</span>
                  <a
                    class="sidebar-settings-provider-link"
                    href="https://opencode.ai/auth"
                    target="_blank"
                    rel="noopener noreferrer"
                  >Get API key</a>
                </div>
                <div class="sidebar-settings-key-group">
                  <input
                    v-model="opencodeZenKey"
                    class="sidebar-settings-key-input"
                    type="password"
                    placeholder="sk-..."
                    @keydown.enter="saveOpencodeZen"
                  />
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="freeModeCustomKeySaving || !opencodeZenKey.trim()"
                    @click="saveOpencodeZen"
                  >{{ freeModeCustomKeySaving ? '...' : 'Save' }}</button>
                </div>
              </div>
              <div v-if="selectedProvider === 'custom'" class="sidebar-settings-row sidebar-settings-row--input">
                <span class="sidebar-settings-label">Custom endpoint URL</span>
                <div class="sidebar-settings-key-group">
                  <input
                    v-model="customEndpointUrl"
                    class="sidebar-settings-key-input"
                    type="url"
                    placeholder="https://api.example.com/v1"
                    @keydown.enter="saveCustomEndpoint"
                  />
                </div>
                <span class="sidebar-settings-label" style="margin-top: 4px">API key</span>
                <div class="sidebar-settings-key-group">
                  <input
                    v-model="customEndpointKey"
                    class="sidebar-settings-key-input"
                    type="password"
                    placeholder="Bearer token (optional)"
                    @keydown.enter="saveCustomEndpoint"
                  />
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="freeModeCustomKeySaving || !customEndpointUrl.trim()"
                    @click="saveCustomEndpoint"
                  >{{ freeModeCustomKeySaving ? '...' : 'Save' }}</button>
                </div>
                <div class="sidebar-settings-row sidebar-settings-row--select" style="margin-top: 4px; padding: 0">
                  <span class="sidebar-settings-label">API format</span>
                  <div class="sidebar-settings-segmented" role="group" aria-label="Custom endpoint API format">
                    <button
                      type="button"
                      class="sidebar-settings-segmented-option"
                      :class="{ 'is-active': customEndpointWireApi === 'responses' }"
                      @click="customEndpointWireApi = 'responses'"
                    >
                      Responses
                    </button>
                    <button
                      type="button"
                      class="sidebar-settings-segmented-option"
                      :class="{ 'is-active': customEndpointWireApi === 'chat' }"
                      @click="customEndpointWireApi = 'chat'"
                    >
                      Completions
                    </button>
                  </div>
                </div>
              </div>
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
              <button class="sidebar-settings-row" type="button" aria-live="polite" @click="isTelegramConfigOpen = !isTelegramConfigOpen">
                <span class="sidebar-settings-label">Telegram</span>
                <span class="sidebar-settings-value">{{ telegramStatusText }}</span>
              </button>
              <div v-if="isTelegramConfigOpen" class="sidebar-settings-telegram-panel">
                <label class="sidebar-settings-field">
                  <span class="sidebar-settings-field-label">Bot token</span>
                  <input
                    v-model="telegramBotTokenDraft"
                    class="sidebar-settings-input"
                    type="password"
                    placeholder="123456:ABCDEF"
                    autocomplete="off"
                    spellcheck="false"
                  >
                </label>
                <label class="sidebar-settings-field">
                  <span class="sidebar-settings-field-label">Allowed Telegram user IDs</span>
                  <textarea
                    v-model="telegramAllowedUserIdsDraft"
                    class="sidebar-settings-textarea"
                    rows="3"
                    placeholder="123456789&#10;987654321"
                    spellcheck="false"
                  />
                </label>
                <div class="sidebar-settings-field-help">
                  Put one Telegram user ID per line or separate them with commas. Use `*` to allow all Telegram users. Unauthorized users will see their own ID in the rejection message so they can copy it here.
                </div>
                <div v-if="telegramConfigError" class="sidebar-settings-telegram-error">
                  {{ telegramConfigError }}
                </div>
                <div class="sidebar-settings-telegram-actions">
                  <button
                    class="sidebar-settings-telegram-save"
                    type="button"
                    :disabled="isTelegramSaving"
                    @click="saveTelegramConfig"
                  >
                    {{ isTelegramSaving ? 'Saving…' : 'Save Telegram config' }}
                  </button>
                </div>
              </div>
              <div class="sidebar-settings-parity-section">
                <div class="sidebar-settings-parity-header">
                  <span class="sidebar-settings-label">App parity</span>
                  <div class="sidebar-settings-parity-header-actions">
                    <button
                      class="sidebar-settings-account-refresh"
                      type="button"
                      :disabled="isParityLoading || isReloadingMcpServers"
                      @click="loadParitySurface"
                    >
                      {{ isParityLoading ? 'Refreshing…' : 'Refresh parity' }}
                    </button>
                    <button
                      class="sidebar-settings-account-refresh"
                      type="button"
                      :disabled="isParityLoading || isReloadingMcpServers"
                      @click="onReloadMcpServers"
                    >
                      {{ isReloadingMcpServers ? 'Reloading MCP…' : 'Reload MCP' }}
                    </button>
                    <button
                      class="sidebar-settings-account-refresh"
                      type="button"
                      :disabled="isParityLoading"
                      @click="onClearParityAppFeatureCache"
                    >
                      Clear app/feature cache
                    </button>
                    <button
                      class="sidebar-settings-account-refresh"
                      type="button"
                      :disabled="isParityLoading"
                      @click="onClearParityDiagnosticsSnapshot"
                    >
                      Clear diagnostics snapshot
                    </button>
                  </div>
                </div>
                <p class="sidebar-settings-parity-meta">
                  {{ isParityLoading ? 'Loading…' : paritySurfaceSummary }}
                </p>
                <p class="sidebar-settings-parity-meta">
                  last refresh: {{ parityLastRefreshLabel }}
                </p>
                <p class="sidebar-settings-parity-meta">{{ parityConfigSummary }}</p>
                <p class="sidebar-settings-parity-meta">
                  warnings: {{ parityLoadWarnings.length }}
                </p>
                <p class="sidebar-settings-parity-meta">
                  warnings fingerprint: {{ parityWarningsFingerprint }}
                </p>
                <p
                  v-for="(warning, index) in parityLoadWarnings"
                  :key="`parity-load-warning-${index}`"
                  class="sidebar-settings-parity-meta"
                >
                  warning: {{ warning }}
                </p>
                <div class="sidebar-settings-key-group">
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="parityLastRefreshLabel.trim().length === 0"
                    @click="onCopyParityLastRefreshSummary"
                  >
                    Copy parity refresh summary
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="parityLoadWarnings.length === 0"
                    @click="onCopyParityLoadWarningsJson"
                  >
                    Copy parity warnings JSON
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="parityWarningsFingerprint === 'none'"
                    @click="onCopyParityWarningsFingerprint"
                  >
                    Copy warnings fingerprint
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="paritySnapshotId === 'parity-snapshot-never'"
                    @click="onCopyParityCorrelationKey"
                  >
                    Copy parity correlation key
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsCompactLine"
                  >
                    Copy parity diagnostics compact line
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsNdjson"
                  >
                    Copy parity diagnostics NDJSON
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsEnvBlock"
                  >
                    Copy parity diagnostics env block
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsYaml"
                  >
                    Copy parity diagnostics YAML
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsIni"
                  >
                    Copy parity diagnostics INI
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsXml"
                  >
                    Copy parity diagnostics XML
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsHtml"
                  >
                    Copy parity diagnostics HTML
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsPlainReport"
                  >
                    Copy parity diagnostics plain report
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsChecklist"
                  >
                    Copy parity diagnostics checklist
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsMinimalJson"
                  >
                    Copy parity diagnostics minimal JSON
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsQueryString"
                  >
                    Copy parity diagnostics query string
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsTableRow"
                  >
                    Copy parity diagnostics table row
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsMarkdownTable"
                  >
                    Copy parity diagnostics markdown table
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsBadge"
                  >
                    Copy parity diagnostics badge
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsCliArgs"
                  >
                    Copy parity diagnostics CLI args
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsShellExport"
                  >
                    Copy parity diagnostics shell export
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsProperties"
                  >
                    Copy parity diagnostics .properties
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsMarkdownBullets"
                  >
                    Copy parity diagnostics markdown bullets
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsCsvBlock"
                  >
                    Copy parity diagnostics CSV block
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsKeyValueBlock"
                  >
                    Copy parity diagnostics key-value block
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsJsonArrayItem"
                  >
                    Copy parity diagnostics JSON array item
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsStatusSentence"
                  >
                    Copy parity diagnostics status sentence
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="parityLastRefreshDurationMs === null"
                    @click="onCopyParityRefreshLatencyLine"
                  >
                    Copy parity refresh latency line
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsJson"
                  >
                    Copy full parity diagnostics JSON
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsMarkdown"
                  >
                    Copy parity diagnostics markdown
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDiagnosticsTsv"
                  >
                    Copy parity diagnostics TSV
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="parityLoadWarnings.length === 0"
                    @click="onCopyParityLoadWarningsSummary"
                  >
                    Copy parity warnings summary
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="parityLoadWarnings.length === 0"
                    @click="onCopyParityLoadWarnings"
                  >
                    Copy parity load warnings
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="parityLoadWarnings.length === 0"
                    @click="onCopyParityWarningListInline"
                  >
                    Copy parity warning list inline
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityWarningCountLine"
                  >
                    Copy parity warning count line
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityCompletionLine"
                  >
                    Copy parity completion line
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParitySurfaceCountsLine"
                  >
                    Copy parity surface counts line
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityPendingSummaryLine"
                  >
                    Copy parity pending summary line
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityProtocolSummaryLine"
                  >
                    Copy parity protocol summary line
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParitySnapshotFingerprintTuple"
                  >
                    Copy parity snapshot/fingerprint tuple
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityDigestLine"
                  >
                    Copy parity digest line
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityHealthScoreLine"
                  >
                    Copy parity health score line
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityRefreshStamp"
                  >
                    Copy parity refresh stamp
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityTimestampLine"
                  >
                    Copy parity timestamp line
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityRefreshEpochLine"
                  >
                    Copy parity refresh epoch line
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="parityLoadWarnings.length === 0"
                    @click="onCopyParityWarningIdsLine"
                  >
                    Copy parity warning IDs line
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="parityLoadWarnings.length === 0"
                    @click="onCopyParityWarningMapJson"
                  >
                    Copy parity warning map JSON
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="parityLoadWarnings.length === 0"
                    @click="onCopyParityWarningMapInline"
                  >
                    Copy parity warning map inline
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onCopyParityWarningCountJson"
                  >
                    Copy parity warning count JSON
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="parityLoadWarnings.length === 0"
                    @click="onClearParityLoadWarnings"
                  >
                    Clear load warnings
                  </button>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Codex settings categories</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityAppSettingsCategorySummary.trim().length === 0"
                      @click="onCopyParityAppSettingsCategories"
                    >
                      Copy settings categories
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityAppSettingsAppGroupSummary.trim().length === 0"
                      @click="onCopyParityAppSettingsAppGroup"
                    >
                      Copy app group
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityAppSettingsConnectionGroupSummary.trim().length === 0"
                      @click="onCopyParityAppSettingsConnectionGroup"
                    >
                      Copy connection group
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityAppSettingsSupportedSummary.trim().length === 0"
                      @click="onCopyParityAppSettingsSupportedCategories"
                    >
                      Copy supported categories
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityAppSettingsMissingSummary.trim().length === 0"
                      @click="onCopyParityAppSettingsMissingCategories"
                    >
                      Copy missing categories
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityAppSettingsCoverageSummary.trim().length === 0"
                      @click="onCopyParityAppSettingsCoverageSummary"
                    >
                      Copy coverage summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityAppSettingsCompletionState.trim().length === 0"
                      @click="onCopyParityAppSettingsCompletionState"
                    >
                      Copy completion state
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParitySettingsSnapshotJson"
                    >
                      Copy settings snapshot JSON
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityMissingFeaturesReport"
                    >
                      Copy missing-features report
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityChangelogEntry"
                    >
                      Copy parity changelog entry
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityChecklist"
                    >
                      Copy parity checklist
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityMetricsLine"
                    >
                      Copy parity metrics line
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityBadgeText"
                    >
                      Copy parity badge text
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityReleaseNoteBlock"
                    >
                      Copy parity release-note block
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityHandoffPacket"
                    >
                      Copy parity handoff packet
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onRunParitySelfCheck"
                    >
                      Run parity self-check
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onResetParitySelfCheckStatus"
                    >
                      Reset self-check status
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParitySelfCheckResult"
                    >
                      Copy parity self-check result
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityVerificationStamp"
                    >
                      Copy parity verification stamp
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityStatusBundle"
                    >
                      Copy parity status bundle
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParitySummaryMarkdown"
                    >
                      Copy parity summary markdown
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityAuditTrail"
                    >
                      Copy parity audit trail
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityHeartbeatLine"
                    >
                      Copy parity heartbeat line
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityEvidenceBundleJson"
                    >
                      Copy parity evidence bundle JSON
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityCsvLine"
                    >
                      Copy parity CSV line
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityYamlBlock"
                    >
                      Copy parity YAML block
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityTomlBlock"
                    >
                      Copy parity TOML block
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityXmlBlock"
                    >
                      Copy parity XML block
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityPlainTextBlock"
                    >
                      Copy parity plain-text block
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityEnvVarsBlock"
                    >
                      Copy parity env vars block
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityNdjsonLine"
                    >
                      Copy parity NDJSON line
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityMarkdownTable"
                    >
                      Copy parity markdown table
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityIniBlock"
                    >
                      Copy parity INI block
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityHtmlBlock"
                    >
                      Copy parity HTML block
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityMarkdownList"
                    >
                      Copy parity markdown list
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityTuple"
                    >
                      Copy parity tuple
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityCompactCode"
                    >
                      Copy parity compact code
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityKeyValueList"
                    >
                      Copy parity key-value list
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityJsonLine"
                    >
                      Copy parity JSON line
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSavingParitySettingsDrafts"
                      @click="onSaveParitySettingsDrafts"
                    >
                      {{ isSavingParitySettingsDrafts ? 'Saving drafts…' : 'Save parity drafts (config)' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isApplyingAllParitySettings"
                      @click="onApplyAllParitySettings"
                    >
                      {{ isApplyingAllParitySettings ? 'Applying all…' : 'Apply all parity settings' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onResetAllParitySettingsDrafts"
                    >
                      Reset all parity drafts
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">
                    count: {{ parityAppSettingsCategories.length }}
                  </p>
                  <p class="sidebar-settings-parity-list-item">
                    categories: {{ parityAppSettingsCategorySummary }}
                  </p>
                  <p class="sidebar-settings-parity-list-item">
                    heading app: {{ parityAppSettingsAppGroupSummary }}
                  </p>
                  <p class="sidebar-settings-parity-list-item">
                    heading connection: {{ parityAppSettingsConnectionGroupSummary }}
                  </p>
                  <p class="sidebar-settings-parity-list-item">
                    supported: {{ parityAppSettingsSupportedCategories.length }} ({{ parityAppSettingsSupportedSummary || '(none)' }})
                  </p>
                  <p class="sidebar-settings-parity-list-item">
                    missing: {{ parityAppSettingsMissingCategories.length }} ({{ parityAppSettingsMissingSummary || '(none)' }})
                  </p>
                  <p class="sidebar-settings-parity-list-item">
                    coverage: {{ parityAppSettingsCoverageSummary }}
                  </p>
                  <p class="sidebar-settings-parity-list-item">
                    completion: {{ parityAppSettingsCompletionState }}
                  </p>
                  <p class="sidebar-settings-parity-list-item">
                    self-check: {{ paritySelfCheckStatus }}
                  </p>
                  <p class="sidebar-settings-parity-list-item">
                    self-check last-run: {{ paritySelfCheckLastRun }}
                  </p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityAppSettingsFocusCategoryDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="focus category"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityAppSettingsMissingCategories.length === 0"
                      @click="onUseFirstParityAppSettingsMissingCategory"
                    >
                      Use first missing
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityAppSettingsSupportedCategories.length === 0"
                      @click="onUseFirstParityAppSettingsSupportedCategory"
                    >
                      Use first supported
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityAppSettingsFocusCategoryDraft.trim().length === 0"
                      @click="onCopyParityAppSettingsFocusCategory"
                    >
                      Copy focus category
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="parityAppSettingsFocusCategoryDraft = ''"
                    >
                      Clear focus
                    </button>
                  </div>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Personalization parity</p>
                  <div class="sidebar-settings-key-group">
                    <select v-model="parityPersonalizationToneDraft" class="sidebar-settings-provider-select">
                      <option value="friendly">friendly</option>
                      <option value="pragmatic">pragmatic</option>
                    </select>
                    <select v-model="parityPersonalizationAvatarDraft" class="sidebar-settings-provider-select">
                      <option value="default">default</option>
                      <option value="coder">coder</option>
                      <option value="mentor">mentor</option>
                    </select>
                    <select v-model="parityPersonalizationMemoryDraft" class="sidebar-settings-provider-select">
                      <option value="enabled">memory enabled</option>
                      <option value="disabled">memory disabled</option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onResetParityPersonalizationDrafts"
                    >
                      Reset personalization
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityPersonalizationSummary.trim().length === 0"
                      @click="onCopyParityPersonalizationSummary"
                    >
                      Copy personalization summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isApplyingParityCategorySettings"
                      @click="onApplyParityPersonalizationSettings"
                    >
                      {{ isApplyingParityCategorySettings ? 'Applying…' : 'Apply personalization' }}
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">
                    {{ parityPersonalizationSummary }}
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Usage parity</p>
                  <div class="sidebar-settings-key-group">
                    <select v-model="parityUsageAutoTopUpDraft" class="sidebar-settings-provider-select">
                      <option value="enabled">auto top-up enabled</option>
                      <option value="disabled">auto top-up disabled</option>
                    </select>
                    <input
                      v-model="parityUsageBudgetDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="monthly budget (USD)"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onResetParityUsageDrafts"
                    >
                      Reset usage
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityUsageSummary.trim().length === 0"
                      @click="onCopyParityUsageSummary"
                    >
                      Copy usage summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isApplyingParityCategorySettings"
                      @click="onApplyParityUsageSettings"
                    >
                      {{ isApplyingParityCategorySettings ? 'Applying…' : 'Apply usage' }}
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">
                    {{ parityUsageSummary }}
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Appearance parity</p>
                  <div class="sidebar-settings-key-group">
                    <select v-model="parityAppearanceThemeDraft" class="sidebar-settings-provider-select">
                      <option value="system">system</option>
                      <option value="light">light</option>
                      <option value="dark">dark</option>
                    </select>
                    <select v-model="parityAppearanceDensityDraft" class="sidebar-settings-provider-select">
                      <option value="compact">compact</option>
                      <option value="comfortable">comfortable</option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onResetParityAppearanceDrafts"
                    >
                      Reset appearance
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityAppearanceSummary.trim().length === 0"
                      @click="onCopyParityAppearanceSummary"
                    >
                      Copy appearance summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isApplyingParityCategorySettings"
                      @click="onApplyParityAppearanceSettings"
                    >
                      {{ isApplyingParityCategorySettings ? 'Applying…' : 'Apply appearance' }}
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">
                    {{ parityAppearanceSummary }}
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Data controls parity</p>
                  <div class="sidebar-settings-key-group">
                    <select v-model="parityDataControlsTelemetryDraft" class="sidebar-settings-provider-select">
                      <option value="enabled">telemetry enabled</option>
                      <option value="disabled">telemetry disabled</option>
                    </select>
                    <select v-model="parityDataControlsTrainingDraft" class="sidebar-settings-provider-select">
                      <option value="enabled">training enabled</option>
                      <option value="disabled">training disabled</option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onResetParityDataControlsDrafts"
                    >
                      Reset data controls
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityDataControlsSummary.trim().length === 0"
                      @click="onCopyParityDataControlsSummary"
                    >
                      Copy data controls summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isApplyingParityCategorySettings"
                      @click="onApplyParityDataControlsSettings"
                    >
                      {{ isApplyingParityCategorySettings ? 'Applying…' : 'Apply data controls' }}
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">
                    {{ parityDataControlsSummary }}
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Computer-use parity</p>
                  <div class="sidebar-settings-key-group">
                    <select v-model="parityComputerUseModeDraft" class="sidebar-settings-provider-select">
                      <option value="ask">ask before actions</option>
                      <option value="auto">auto allow safe actions</option>
                    </select>
                    <select v-model="parityComputerUseVisionDraft" class="sidebar-settings-provider-select">
                      <option value="enabled">vision enabled</option>
                      <option value="disabled">vision disabled</option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onResetParityComputerUseDrafts"
                    >
                      Reset computer-use
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityComputerUseSummary.trim().length === 0"
                      @click="onCopyParityComputerUseSummary"
                    >
                      Copy computer-use summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isApplyingParityCategorySettings"
                      @click="onApplyParityComputerUseSettings"
                    >
                      {{ isApplyingParityCategorySettings ? 'Applying…' : 'Apply computer-use' }}
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">
                    {{ parityComputerUseSummary }}
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">General settings parity</p>
                  <div class="sidebar-settings-key-group">
                    <select v-model="parityGeneralNotificationsDraft" class="sidebar-settings-provider-select">
                      <option value="enabled">notifications enabled</option>
                      <option value="disabled">notifications disabled</option>
                    </select>
                    <select v-model="parityGeneralMenuBarDraft" class="sidebar-settings-provider-select">
                      <option value="enabled">menu bar enabled</option>
                      <option value="disabled">menu bar disabled</option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onResetParityGeneralSettingsDrafts"
                    >
                      Reset general settings
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityGeneralSettingsSummary.trim().length === 0"
                      @click="onCopyParityGeneralSettingsSummary"
                    >
                      Copy general settings summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isApplyingParityCategorySettings"
                      @click="onApplyParityGeneralSettings"
                    >
                      {{ isApplyingParityCategorySettings ? 'Applying…' : 'Apply general settings' }}
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">
                    {{ parityGeneralSettingsSummary }}
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Local environments parity</p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityLocalEnvironmentNameDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="environment name"
                    />
                    <select v-model="parityLocalEnvironmentShellDraft" class="sidebar-settings-provider-select">
                      <option value="zsh">zsh</option>
                      <option value="bash">bash</option>
                      <option value="fish">fish</option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onResetParityLocalEnvironmentDrafts"
                    >
                      Reset local env
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityLocalEnvironmentSummary.trim().length === 0"
                      @click="onCopyParityLocalEnvironmentSummary"
                    >
                      Copy local env summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isApplyingParityCategorySettings"
                      @click="onApplyParityLocalEnvironmentSettings"
                    >
                      {{ isApplyingParityCategorySettings ? 'Applying…' : 'Apply local env' }}
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">
                    {{ parityLocalEnvironmentSummary }}
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Plugins settings parity</p>
                  <div class="sidebar-settings-key-group">
                    <select v-model="parityPluginsEnabledDraft" class="sidebar-settings-provider-select">
                      <option value="enabled">plugins enabled</option>
                      <option value="disabled">plugins disabled</option>
                    </select>
                    <input
                      v-model="parityPluginsSourceDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="plugin source"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onResetParityPluginsDrafts"
                    >
                      Reset plugins
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityPluginsSummary.trim().length === 0"
                      @click="onCopyParityPluginsSummary"
                    >
                      Copy plugins summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isApplyingParityCategorySettings"
                      @click="onApplyParityPluginsSettings"
                    >
                      {{ isApplyingParityCategorySettings ? 'Applying…' : 'Apply plugins' }}
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">
                    {{ parityPluginsSummary }}
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Connections parity</p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityConnectionsHostDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="remote host"
                    />
                    <select v-model="parityConnectionsStatusDraft" class="sidebar-settings-provider-select">
                      <option value="connected">connected</option>
                      <option value="connecting">connecting</option>
                      <option value="disconnected">disconnected</option>
                    </select>
                    <select v-model="parityConnectionsAuthDraft" class="sidebar-settings-provider-select">
                      <option value="token">token</option>
                      <option value="ssh">ssh</option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onResetParityConnectionsDrafts"
                    >
                      Reset connections
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityConnectionsSummary.trim().length === 0"
                      @click="onCopyParityConnectionsSummary"
                    >
                      Copy connections summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isApplyingParityCategorySettings"
                      @click="onApplyParityConnectionsSettings"
                    >
                      {{ isApplyingParityCategorySettings ? 'Applying…' : 'Apply connections' }}
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">
                    {{ parityConnectionsSummary }}
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Environments parity</p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityEnvironmentNameDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="environment label"
                    />
                    <select v-model="parityEnvironmentTypeDraft" class="sidebar-settings-provider-select">
                      <option value="local">local</option>
                      <option value="worktree">worktree</option>
                      <option value="remote">remote</option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onResetParityEnvironmentDrafts"
                    >
                      Reset environments
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityEnvironmentSummary.trim().length === 0"
                      @click="onCopyParityEnvironmentSummary"
                    >
                      Copy environments summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isApplyingParityCategorySettings"
                      @click="onApplyParityEnvironmentSettings"
                    >
                      {{ isApplyingParityCategorySettings ? 'Applying…' : 'Apply environments' }}
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">
                    {{ parityEnvironmentSummary }}
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Worktrees parity</p>
                  <div class="sidebar-settings-key-group">
                    <select v-model="parityWorktreesAutoCleanupDraft" class="sidebar-settings-provider-select">
                      <option value="enabled">auto cleanup enabled</option>
                      <option value="disabled">auto cleanup disabled</option>
                    </select>
                    <input
                      v-model="parityWorktreesRepositoryDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="repository path"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onResetParityWorktreesDrafts"
                    >
                      Reset worktrees
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityWorktreesSummary.trim().length === 0"
                      @click="onCopyParityWorktreesSummary"
                    >
                      Copy worktrees summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isApplyingParityCategorySettings"
                      @click="onApplyParityWorktreesSettings"
                    >
                      {{ isApplyingParityCategorySettings ? 'Applying…' : 'Apply worktrees' }}
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">
                    {{ parityWorktreesSummary }}
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Git settings parity</p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityGitDefaultBranchDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="default branch"
                    />
                    <select v-model="parityGitAutoFetchDraft" class="sidebar-settings-provider-select">
                      <option value="enabled">auto fetch enabled</option>
                      <option value="disabled">auto fetch disabled</option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onResetParityGitSettingsDrafts"
                    >
                      Reset git settings
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityGitSettingsSummary.trim().length === 0"
                      @click="onCopyParityGitSettingsSummary"
                    >
                      Copy git settings summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isApplyingParityCategorySettings"
                      @click="onApplyParityGitSettings"
                    >
                      {{ isApplyingParityCategorySettings ? 'Applying…' : 'Apply git settings' }}
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">
                    {{ parityGitSettingsSummary }}
                  </p>
                </div>
                <div class="sidebar-settings-key-group">
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="isParityLoading"
                    @click="onClearParityConfigRequirements"
                  >
                    Clear config requirements
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="parityConfigSummary.trim().length === 0"
                    @click="onCopyParityConfigSummary"
                  >
                    Copy config summary
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="paritySurfaceSummary.trim().length === 0"
                    @click="onCopyParitySurfaceSummary"
                  >
                    Copy apps/experimental/MCP summary
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="!parityConfigRequirements"
                    @click="onCopyParityConfigRequirementsJson"
                  >
                    Copy config requirements JSON
                  </button>
                </div>
                <p v-if="parityError" class="sidebar-settings-account-error">{{ parityError }}</p>
                <div class="sidebar-settings-key-group">
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onClearParityStatusMessages"
                  >
                    Clear parity status
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    @click="onClearParityErrorOnly"
                  >
                    Clear parity error
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="parityError.trim().length === 0"
                    @click="onCopyParityErrorMessage"
                  >
                    Copy parity error
                  </button>
                  <button
                    class="sidebar-settings-key-save"
                    type="button"
                    :disabled="parityThreadActionResult.trim().length === 0"
                    @click="onCopyParityThreadActionResult"
                  >
                    Copy thread action result
                  </button>
                </div>
                <div v-if="parityApps.length > 0" class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Apps</p>
                  <div
                    v-for="app in parityApps"
                    :key="`app-${app.id}`"
                    class="sidebar-settings-parity-app-row"
                  >
                    <span class="sidebar-settings-parity-list-item">
                      {{ app.name }} · {{ app.isEnabled ? 'enabled' : 'disabled' }} · {{ app.isAccessible ? 'accessible' : 'restricted' }}
                    </span>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="Boolean(togglingAppId) && togglingAppId !== app.id"
                      @click="onToggleParityAppEnabled(app.id, !app.isEnabled)"
                    >
                      {{ togglingAppId === app.id ? 'Saving…' : app.isEnabled ? 'Disable' : 'Enable' }}
                    </button>
                  </div>
                </div>
                <div v-if="parityExperimentalFeatures.length > 0" class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Experimental features</p>
                  <div
                    v-for="feature in parityExperimentalFeatures"
                    :key="`feature-${feature.name}`"
                    class="sidebar-settings-parity-app-row"
                  >
                    <span class="sidebar-settings-parity-list-item">
                      {{ feature.displayName || feature.name }} · {{ feature.stage }} · {{ feature.enabled ? 'on' : 'off' }}
                    </span>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="Boolean(togglingExperimentalFeatureName) && togglingExperimentalFeatureName !== feature.name"
                      @click="onToggleParityExperimentalFeature(feature.name, !feature.enabled)"
                    >
                      {{ togglingExperimentalFeatureName === feature.name ? 'Saving…' : feature.enabled ? 'Disable' : 'Enable' }}
                    </button>
                  </div>
                </div>
                <div v-if="parityMcpServers.length > 0" class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">MCP servers</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isReloadingMcpServers"
                      @click="onClearParityMcpServerCache"
                    >
                      Clear MCP server cache
                    </button>
                  </div>
                  <p
                    v-for="server in parityMcpServers"
                    :key="`mcp-${server.name}`"
                    class="sidebar-settings-parity-list-item"
                  >
                    {{ server.name }} · {{ server.authStatus }} · tools {{ server.toolCount }}
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Protocol catalog</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityCatalog"
                      @click="onLoadParityProtocolCatalog"
                    >
                      {{ isLoadingParityCatalog ? 'Loading…' : 'Load methods/notifications' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityCatalog"
                      @click="onClearParityProtocolCatalog"
                    >
                      Clear protocol cache
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityMethods.length === 0 && parityNotifications.length === 0"
                      @click="onCopyParityProtocolCatalogSummary"
                    >
                      Copy protocol catalog summary
                    </button>
                  </div>
                  <p v-if="parityMethods.length > 0" class="sidebar-settings-parity-list-item">
                    methods: {{ parityMethods.length }} (e.g. {{ parityMethods.slice(0, 3).join(', ') }})
                  </p>
                  <p v-if="parityNotifications.length > 0" class="sidebar-settings-parity-list-item">
                    notifications: {{ parityNotifications.length }} (e.g. {{ parityNotifications.slice(0, 3).join(', ') }})
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Live notifications</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="toggleParityNotificationStream"
                    >
                      {{ isParityNotificationStreamActive ? 'Stop stream' : 'Start stream' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityNotificationSamples.length === 0"
                      @click="clearParityNotificationSamples"
                    >
                      Clear
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityNotificationSamples.length === 0"
                      @click="onCopyParityNotificationSamples"
                    >
                      Copy notifications sample
                    </button>
                    <input
                      v-model="parityNotificationFilterDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="method filter (optional)"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="parityNotificationFilterDraft = ''"
                    >
                      Clear filter
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityNotificationFilterDraft.trim().length === 0"
                      @click="onCopyParityNotificationFilter"
                    >
                      Copy notification filter
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onResetParityNotificationStreamState"
                    >
                      Reset stream state
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">received: {{ parityNotificationCount }}</p>
                  <p
                    v-for="(sample, index) in parityNotificationSamples.slice(0, 5)"
                    :key="`parity-notification-${index}`"
                    class="sidebar-settings-parity-list-item"
                  >
                    {{ sample }}
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Pending server requests</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityPendingRequests"
                      @click="onLoadParityPendingRequests"
                    >
                      {{ isLoadingParityPendingRequests ? 'Loading…' : 'Load pending requests' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityPendingRequests || isReplyingParityPendingRequest"
                      @click="onClearParityPendingRequestSummaries"
                    >
                      Clear pending-request summaries
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityPendingRequestMethodSummary.trim().length === 0"
                      @click="onCopyParityPendingRequestMethods"
                    >
                      Copy pending-request methods
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">count: {{ parityPendingRequestSummaries.length }}</p>
                  <p v-if="parityPendingRequestMethodSummary" class="sidebar-settings-parity-list-item">
                    methods: {{ parityPendingRequestMethodSummary }}
                  </p>
                  <p
                    v-for="(summary, index) in parityPendingRequestSummaries.slice(0, 5)"
                    :key="`pending-request-${index}`"
                    class="sidebar-settings-parity-list-item"
                  >
                    {{ summary }}
                  </p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityReplyRequestIdDraft"
                      class="sidebar-settings-key-input"
                      type="number"
                      min="1"
                      placeholder="request id"
                      @keydown.enter="onReplyParityPendingRequest"
                    />
                    <select v-model="parityReplyModeDraft" class="sidebar-settings-provider-select">
                      <option value="approve">approve</option>
                      <option value="deny">deny</option>
                    </select>
                    <input
                      v-model="parityReplyErrorMessageDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="deny reason (optional)"
                      @keydown.enter="onReplyParityPendingRequest"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isReplyingParityPendingRequest || parityReplyRequestIdDraft.trim().length === 0"
                      @click="onReplyParityPendingRequest"
                    >
                      {{ isReplyingParityPendingRequest ? 'Replying…' : 'Reply request' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityPendingRequestSummaries.length === 0"
                      @click="onUseFirstParityPendingRequestId"
                    >
                      Use first pending id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityPendingReplyDrafts"
                    >
                      Clear reply fields
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isReplyingParityPendingRequest"
                      @click="onResetParityPendingReplyMode"
                    >
                      Reset reply mode
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isReplyingParityPendingRequest"
                      @click="onClearParityPendingReplyResult"
                    >
                      Clear reply result
                    </button>
                  </div>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Thread groups</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityThreadGroups"
                      @click="onLoadParityThreadGroups"
                    >
                      {{ isLoadingParityThreadGroups ? 'Loading…' : 'Read thread groups' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityThreadGroups"
                      @click="onClearParityThreadGroupsSummary"
                    >
                      Clear thread-groups summary
                    </button>
                  </div>
                  <p v-if="parityThreadGroupsSummary" class="sidebar-settings-parity-list-item">{{ parityThreadGroupsSummary }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Skills catalog</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParitySkills"
                      @click="onLoadParitySkills"
                    >
                      {{ isLoadingParitySkills ? 'Loading…' : 'Read skills' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParitySkills"
                      @click="onClearParitySkillsSummary"
                    >
                      Clear skills summary
                    </button>
                  </div>
                  <p v-if="paritySkillsSummary" class="sidebar-settings-parity-list-item">{{ paritySkillsSummary }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Thread state cache</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityThreadState"
                      @click="onLoadParityThreadStateCache"
                    >
                      {{ isLoadingParityThreadState ? 'Loading…' : 'Load title/pin cache' }}
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">thread title cache entries: {{ parityThreadTitleCacheSize }}</p>
                  <p class="sidebar-settings-parity-list-item">pinned thread ids: {{ parityThreadPinCount }}</p>
                  <p v-if="parityThreadStateDurationMs !== null" class="sidebar-settings-parity-list-item">
                    durationMs: {{ parityThreadStateDurationMs }}
                  </p>
                  <p
                    v-for="(sample, index) in parityThreadTitleSamples"
                    :key="`thread-title-sample-${index}`"
                    class="sidebar-settings-parity-list-item"
                  >
                    {{ sample }}
                  </p>
                  <p
                    v-for="(sample, index) in parityPinnedThreadSamples"
                    :key="`thread-pin-sample-${index}`"
                    class="sidebar-settings-parity-list-item"
                  >
                    pinned: {{ sample }}
                  </p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityPinnedThreadIdsDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="thread ids (comma-separated)"
                      @keydown.enter="onPersistParityPinnedThreadIds"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isPersistingParityPinnedThreadIds"
                      @click="onPersistParityPinnedThreadIds"
                    >
                      {{ isPersistingParityPinnedThreadIds ? 'Saving…' : 'Persist pinned ids' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isPersistingParityPinnedThreadIds"
                      @click="onClearParityPinnedThreadIdsDraft"
                    >
                      Clear pinned-id draft
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityThreadState || isPersistingParityPinnedThreadIds"
                      @click="onClearParityThreadStateDiagnostics"
                    >
                      Clear thread-state diagnostics
                    </button>
                  </div>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Generate thread title</p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityTitlePrompt"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="title generation prompt"
                      @keydown.enter="onGenerateParityThreadTitle"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isGeneratingParityTitle || parityTitlePrompt.trim().length === 0"
                      @click="onGenerateParityThreadTitle"
                    >
                      {{ isGeneratingParityTitle ? 'Generating…' : 'Generate' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isGeneratingParityTitle || isPersistingParityTitle"
                      @click="onClearParityTitleDrafts"
                    >
                      Clear title drafts
                    </button>
                  </div>
                  <p v-if="parityGeneratedTitle" class="sidebar-settings-parity-list-item">
                    generated: {{ parityGeneratedTitle }}
                  </p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isPersistingParityTitle || !selectedThreadId || parityGeneratedTitle.trim().length === 0"
                      @click="onPersistParityThreadTitle"
                    >
                      {{ isPersistingParityTitle ? 'Saving…' : 'Persist to selected thread' }}
                    </button>
                  </div>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Thread search diagnostics</p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityThreadSearchQuery"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="search query"
                      @keydown.enter="onSearchParityThreads"
                    />
                    <input
                      v-model="parityThreadSearchLimitDraft"
                      class="sidebar-settings-key-input"
                      type="number"
                      min="1"
                      max="2000"
                      placeholder="limit"
                      @keydown.enter="onSearchParityThreads"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSearchingParityThreads || parityThreadSearchQuery.trim().length === 0"
                      @click="onSearchParityThreads"
                    >
                      {{ isSearchingParityThreads ? 'Searching…' : 'Search' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityThreadSearchDrafts"
                    >
                      Clear search drafts
                    </button>
                  </div>
                  <p v-if="parityThreadSearchCount !== null" class="sidebar-settings-parity-list-item">
                    matched thread ids: {{ parityThreadSearchCount }}
                  </p>
                  <p v-if="parityThreadSearchIndexedCount !== null" class="sidebar-settings-parity-list-item">
                    indexed threads: {{ parityThreadSearchIndexedCount }}
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Set default model</p>
                  <div class="sidebar-settings-key-group">
                    <select v-model="parityDefaultModelDraft" class="sidebar-settings-provider-select">
                      <option value="" disabled>select model</option>
                      <option v-for="modelId in availableModelIds" :key="`parity-model-${modelId}`" :value="modelId">
                        {{ modelId }}
                      </option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSettingParityDefaultModel || parityDefaultModelDraft.trim().length === 0"
                      @click="onSetParityDefaultModel"
                    >
                      {{ isSettingParityDefaultModel ? 'Saving…' : 'Set model' }}
                    </button>
                  </div>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Set selected thread model</p>
                  <div class="sidebar-settings-key-group">
                    <select v-model="parityThreadModelDraft" class="sidebar-settings-provider-select">
                      <option value="" disabled>select model</option>
                      <option v-for="modelId in availableModelIds" :key="`parity-thread-model-${modelId}`" :value="modelId">
                        {{ modelId }}
                      </option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSettingParityThreadModel || !selectedThreadId || parityThreadModelDraft.trim().length === 0"
                      @click="onSetParitySelectedThreadModel"
                    >
                      {{ isSettingParityThreadModel ? 'Saving…' : 'Set thread model' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSettingParityDefaultModel || isSettingParityThreadModel"
                      @click="onClearParityModelDrafts"
                    >
                      Clear model drafts
                    </button>
                  </div>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Set speed mode</p>
                  <div class="sidebar-settings-key-group">
                    <select v-model="paritySpeedModeDraft" class="sidebar-settings-provider-select">
                      <option value="standard">standard</option>
                      <option value="fast">fast</option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSettingParitySpeedMode"
                      @click="onSetParitySpeedMode"
                    >
                      {{ isSettingParitySpeedMode ? 'Saving…' : 'Set speed' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSettingParitySpeedMode || isSettingParityCollaborationMode"
                      @click="onResetParityModeDraftsToCurrent"
                    >
                      Reset mode drafts
                    </button>
                  </div>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Read rate limits</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityRateLimits"
                      @click="onLoadParityRateLimits"
                    >
                      {{ isLoadingParityRateLimits ? 'Loading…' : 'Read limits' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityRateLimits || isLoadingParityRawRateLimits"
                      @click="onClearParityRateLimitSummaries"
                    >
                      Clear rate-limit summaries
                    </button>
                  </div>
                  <p v-if="parityRateLimitSummary" class="sidebar-settings-parity-list-item">{{ parityRateLimitSummary }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Raw rate limits response</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityRawRateLimits"
                      @click="onLoadParityRawRateLimits"
                    >
                      {{ isLoadingParityRawRateLimits ? 'Loading…' : 'Read raw rate limits' }}
                    </button>
                  </div>
                  <p v-if="parityRawRateLimitsSummary" class="sidebar-settings-parity-list-item">{{ parityRawRateLimitsSummary }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Current model config</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityCurrentModel"
                      @click="onLoadParityCurrentModelConfig"
                    >
                      {{ isLoadingParityCurrentModel ? 'Loading…' : 'Read current model config' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityCurrentModel || isLoadingParityAvailableModels"
                      @click="onClearParityModelConfigSummaries"
                    >
                      Clear model-config summaries
                    </button>
                  </div>
                  <p v-if="parityCurrentModelSummary" class="sidebar-settings-parity-list-item">{{ parityCurrentModelSummary }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Collaboration modes</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityCollaborationModes"
                      @click="onLoadParityCollaborationModes"
                    >
                      {{ isLoadingParityCollaborationModes ? 'Loading…' : 'Read collaboration modes' }}
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <select v-model="paritySelectedCollaborationModeDraft" class="sidebar-settings-provider-select">
                      <option value="default">default</option>
                      <option value="plan">plan</option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSettingParityCollaborationMode"
                      @click="onSetParityCollaborationMode"
                    >
                      {{ isSettingParityCollaborationMode ? 'Saving…' : 'Set mode' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityCollaborationModes || isSettingParityCollaborationMode"
                      @click="onClearParityCollaborationSummary"
                    >
                      Clear collaboration summary
                    </button>
                  </div>
                  <p v-if="parityCollaborationModesSummary" class="sidebar-settings-parity-list-item">{{ parityCollaborationModesSummary }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Reasoning effort</p>
                  <div class="sidebar-settings-key-group">
                    <select v-model="parityReasoningEffortDraft" class="sidebar-settings-provider-select">
                      <option value="minimal">minimal</option>
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSettingParityReasoningEffort"
                      @click="onSetParityReasoningEffort"
                    >
                      {{ isSettingParityReasoningEffort ? 'Saving…' : 'Set effort' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSettingParityReasoningEffort"
                      @click="onResetParityReasoningEffortDraft"
                    >
                      Reset effort draft
                    </button>
                  </div>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Available models</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityAvailableModels"
                      @click="onLoadParityAvailableModels"
                    >
                      {{ isLoadingParityAvailableModels ? 'Loading…' : 'Read available models' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityAvailableModels"
                      @click="onClearParityAvailableModelsSummary"
                    >
                      Clear model list summary
                    </button>
                  </div>
                  <p v-if="parityAvailableModelsSummary" class="sidebar-settings-parity-list-item">{{ parityAvailableModelsSummary }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Workspace roots state</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityWorkspaceRoots"
                      @click="onLoadParityWorkspaceRootsState"
                    >
                      {{ isLoadingParityWorkspaceRoots ? 'Loading…' : 'Read workspace roots' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isWritingParityWorkspaceRoots || !parityWorkspaceRootsDraftState"
                      @click="onWriteParityWorkspaceRootsState"
                    >
                      {{ isWritingParityWorkspaceRoots ? 'Writing…' : 'Write loaded roots' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityWorkspaceRoots || isWritingParityWorkspaceRoots"
                      @click="onClearParityWorkspaceRootsDiagnostics"
                    >
                      Clear workspace-roots diagnostics
                    </button>
                  </div>
                  <p v-if="parityWorkspaceRootsSummary" class="sidebar-settings-parity-list-item">{{ parityWorkspaceRootsSummary }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Home directory</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityHomeDirectory"
                      @click="onLoadParityHomeDirectory"
                    >
                      {{ isLoadingParityHomeDirectory ? 'Loading…' : 'Read home directory' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityHomeDirectoryEntries"
                      @click="onLoadParityHomeDirectoryEntries"
                    >
                      {{ isLoadingParityHomeDirectoryEntries ? 'Loading…' : 'List home folders' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityHomeDirectory || isLoadingParityHomeDirectoryEntries"
                      @click="onClearParityHomeDirectoryDiagnostics"
                    >
                      Clear home diagnostics
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityHomeDirectory"
                      @click="onClearParityHomeDirectoryValue"
                    >
                      Clear home directory value
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityHomeDirectoryEntries"
                      @click="onClearParityHomeFolderListSummary"
                    >
                      Clear home folder list summary
                    </button>
                    <input
                      v-model="parityCreateDirectoryPathDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="directory path to create"
                      @keydown.enter="onCreateParityDirectory"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isCreatingParityDirectory || parityCreateDirectoryPathDraft.trim().length === 0"
                      @click="onCreateParityDirectory"
                    >
                      {{ isCreatingParityDirectory ? 'Creating…' : 'Create directory' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!parityHomeDirectory"
                      @click="onUseParityHomeDirectoryForCreate"
                    >
                      Use home directory
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="paritySuggestedProjectPath.trim().length === 0"
                      @click="onUseParitySuggestedProjectPathForCreate"
                    >
                      Use suggested project path
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isCreatingParityDirectory"
                      @click="onClearParityCreateDirectoryDraft"
                    >
                      Clear directory draft
                    </button>
                  </div>
                  <p v-if="parityHomeDirectory" class="sidebar-settings-parity-list-item">{{ parityHomeDirectory }}</p>
                  <p v-if="parityHomeDirectoryDurationMs !== null" class="sidebar-settings-parity-list-item">
                    durationMs: {{ parityHomeDirectoryDurationMs }}
                  </p>
                  <p v-if="parityHomeDirectoryEntryCount !== null" class="sidebar-settings-parity-list-item">
                    home folder entries: {{ parityHomeDirectoryEntryCount }}
                  </p>
                  <p v-if="parityHomeDirectoryParentPath" class="sidebar-settings-parity-list-item">
                    home parent path: {{ parityHomeDirectoryParentPath }}
                  </p>
                  <p v-if="parityCreateDirectoryResult" class="sidebar-settings-parity-list-item">
                    {{ parityCreateDirectoryResult }}
                  </p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Project root suggestion</p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityProjectSuggestionBasePath"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="base path"
                      @keydown.enter="onLoadParityProjectSuggestion"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityProjectSuggestion || parityProjectSuggestionBasePath.trim().length === 0"
                      @click="onLoadParityProjectSuggestion"
                    >
                      {{ isLoadingParityProjectSuggestion ? 'Loading…' : 'Suggest root' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isOpeningParityProjectRoot || parityProjectSuggestionBasePath.trim().length === 0"
                      @click="onOpenParityProjectRoot(false)"
                    >
                      {{ isOpeningParityProjectRoot ? 'Opening…' : 'Open root' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isOpeningParityProjectRoot || parityProjectSuggestionBasePath.trim().length === 0"
                      @click="onOpenParityProjectRoot(true)"
                    >
                      {{ isOpeningParityProjectRoot ? 'Creating…' : 'Open/create root' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="paritySuggestedProjectPath.trim().length === 0"
                      @click="onUseParitySuggestedProjectPath"
                    >
                      Use suggested path
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="paritySuggestedProjectPath.trim().length === 0"
                      @click="onClearParitySuggestedProjectPath"
                    >
                      Clear suggested path
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityHomeDirectory.trim().length === 0"
                      @click="onUseParityHomeDirectoryForProjectSuggestion"
                    >
                      Use home directory
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThread?.cwd"
                      @click="onUseSelectedThreadCwdForProjectSuggestion"
                    >
                      Use selected thread cwd
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityProjectSuggestion || isOpeningParityProjectRoot"
                      @click="onClearParityProjectSuggestionDrafts"
                    >
                      Clear suggestion drafts
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityProjectSuggestion || isOpeningParityProjectRoot"
                      @click="onClearParityProjectSuggestionResultOnly"
                    >
                      Clear suggestion result only
                    </button>
                  </div>
                  <p v-if="parityProjectSuggestionResult" class="sidebar-settings-parity-list-item">{{ parityProjectSuggestionResult }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Composer file search</p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityComposerFileSearchCwdDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="cwd"
                      @keydown.enter="onRunParityComposerFileSearch"
                    />
                    <input
                      v-model="parityComposerFileSearchQueryDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="query"
                      @keydown.enter="onRunParityComposerFileSearch"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isRunningParityComposerFileSearch || parityComposerFileSearchCwdDraft.trim().length === 0"
                      @click="onRunParityComposerFileSearch"
                    >
                      {{ isRunningParityComposerFileSearch ? 'Searching…' : 'Search files' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThread?.cwd"
                      @click="onUseSelectedThreadCwdForComposerSearch"
                    >
                      Use selected thread cwd
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityComposerFileSearchDrafts"
                    >
                      Clear search drafts
                    </button>
                  </div>
                  <p v-if="parityComposerFileSearchSummary" class="sidebar-settings-parity-list-item">{{ parityComposerFileSearchSummary }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Telegram status</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityTelegramStatus"
                      @click="onLoadParityTelegramStatus"
                    >
                      {{ isLoadingParityTelegramStatus ? 'Loading…' : 'Read Telegram status' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityTelegramStatus"
                      @click="onClearParityTelegramStatusSummary"
                    >
                      Clear Telegram status
                    </button>
                  </div>
                  <p v-if="parityTelegramStatusSummary" class="sidebar-settings-parity-list-item">{{ parityTelegramStatusSummary }}</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityTelegramConfig"
                      @click="onLoadParityTelegramConfig"
                    >
                      {{ isLoadingParityTelegramConfig ? 'Loading…' : 'Read Telegram config' }}
                    </button>
                    <input
                      v-model="parityTelegramBotTokenDraft"
                      class="sidebar-settings-key-input"
                      type="password"
                      placeholder="telegram bot token"
                      @keydown.enter="onConfigureParityTelegram"
                    />
                    <input
                      v-model="parityTelegramAllowedUserIdsDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="allowed user ids (comma/newline, * for all)"
                      @keydown.enter="onConfigureParityTelegram"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isConfiguringParityTelegram || parityTelegramBotTokenDraft.trim().length === 0"
                      @click="onConfigureParityTelegram"
                    >
                      {{ isConfiguringParityTelegram ? 'Saving…' : 'Write Telegram config' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isConfiguringParityTelegram"
                      @click="onSetParityTelegramAllowAll"
                    >
                      Use allow-all (*)
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isConfiguringParityTelegram"
                      @click="onClearParityTelegramDrafts"
                    >
                      Clear Telegram drafts
                    </button>
                  </div>
                  <p v-if="parityTelegramConfigSummary" class="sidebar-settings-parity-list-item">{{ parityTelegramConfigSummary }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">GitHub projects</p>
                  <div class="sidebar-settings-key-group">
                    <select v-model="parityGithubScope" class="sidebar-settings-provider-select">
                      <option value="trending-daily">trending-daily</option>
                      <option value="trending-weekly">trending-weekly</option>
                      <option value="trending-monthly">trending-monthly</option>
                      <option value="search-daily">search-daily</option>
                      <option value="search-weekly">search-weekly</option>
                      <option value="search-monthly">search-monthly</option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityGithubProjects"
                      @click="onLoadParityGithubProjects"
                    >
                      {{ isLoadingParityGithubProjects ? 'Loading…' : 'Read GitHub projects' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityGithubProjects"
                      @click="onLoadParityGithubTrendingProjects"
                    >
                      {{ isLoadingParityGithubProjects ? 'Loading…' : 'Read trending API' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityGithubProjects"
                      @click="onClearParityGithubProjectsSummary"
                    >
                      Clear GitHub results
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityGithubProjects"
                      @click="onResetParityGithubScope"
                    >
                      Reset GitHub scope
                    </button>
                  </div>
                  <p v-if="parityGithubProjectsSummary" class="sidebar-settings-parity-list-item">{{ parityGithubProjectsSummary }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Git branch state</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityGitBranchState || !selectedThread?.cwd"
                      @click="onLoadParityGitBranchState"
                    >
                      {{ isLoadingParityGitBranchState ? 'Loading…' : 'Read branch state' }}
                    </button>
                    <input
                      v-model="parityCheckoutBranchDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="target branch name"
                      @keydown.enter="onCheckoutParityBranch"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isCheckingOutParityBranch || !selectedThread?.cwd || parityCheckoutBranchDraft.trim().length === 0"
                      @click="onCheckoutParityBranch"
                    >
                      {{ isCheckingOutParityBranch ? 'Switching…' : 'Checkout branch' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityCurrentBranchName.trim().length === 0"
                      @click="onUseCurrentParityBranchForCheckout"
                    >
                      Use current branch
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityBranchDrafts"
                    >
                      Clear branch drafts
                    </button>
                  </div>
                  <p v-if="parityGitBranchSummary" class="sidebar-settings-parity-list-item">{{ parityGitBranchSummary }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Worktree branch options</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityWorktreeBranchOptions || !selectedThread?.cwd"
                      @click="onLoadParityWorktreeBranchOptions"
                    >
                      {{ isLoadingParityWorktreeBranchOptions ? 'Loading…' : 'Read worktree branches' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!parityWorktreeBranchOptionValues.length"
                      @click="onUseFirstParityBranchOption"
                    >
                      Use first branch option
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityGitBranchState || isLoadingParityWorktreeBranchOptions"
                      @click="onClearParityBranchSummaries"
                    >
                      Clear branch summaries
                    </button>
                  </div>
                  <p v-if="parityWorktreeBranchOptionsSummary" class="sidebar-settings-parity-list-item">{{ parityWorktreeBranchOptionsSummary }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Archived threads</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityThreadDetail || !selectedThreadId"
                      @click="onLoadParitySelectedThreadDetail"
                    >
                      {{ isLoadingParityThreadDetail ? 'Loading…' : 'Read selected thread detail' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityThreadMessages || !selectedThreadId"
                      @click="onLoadParitySelectedThreadMessages"
                    >
                      {{ isLoadingParityThreadMessages ? 'Loading…' : 'Read thread messages' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityThreadReview || !selectedThreadId"
                      @click="onLoadParitySelectedThreadReviewResult"
                    >
                      {{ isLoadingParityThreadReview ? 'Loading…' : 'Read review result' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityThreadDetail || isLoadingParityThreadMessages || isLoadingParityThreadReview"
                      @click="onClearParitySelectedThreadDiagnostics"
                    >
                      Clear selected-thread diagnostics
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityReadThreadIdDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="thread id (direct read)"
                      @keydown.enter="onLoadParityThreadByIdDetail"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityThreadByIdDetail || parityReadThreadIdDraft.trim().length === 0"
                      @click="onLoadParityThreadByIdDetail"
                    >
                      {{ isLoadingParityThreadByIdDetail ? 'Loading…' : 'Read detail by id' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityThreadByIdMessages || parityReadThreadIdDraft.trim().length === 0"
                      @click="onLoadParityThreadByIdMessages"
                    >
                      {{ isLoadingParityThreadByIdMessages ? 'Loading…' : 'Read messages by id' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityThreadByIdReview || parityReadThreadIdDraft.trim().length === 0"
                      @click="onLoadParityThreadByIdReview"
                    >
                      {{ isLoadingParityThreadByIdReview ? 'Loading…' : 'Read review by id' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThreadId"
                      @click="onUseSelectedThreadIdForParityRead"
                    >
                      Use selected thread id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityThreadByIdDrafts"
                    >
                      Clear by-id drafts
                    </button>
                  </div>
                  <p v-if="parityThreadDetailSummary" class="sidebar-settings-parity-list-item">{{ parityThreadDetailSummary }}</p>
                  <p v-if="parityThreadMessagesSummary" class="sidebar-settings-parity-list-item">{{ parityThreadMessagesSummary }}</p>
                  <p v-if="parityThreadReviewSummary" class="sidebar-settings-parity-list-item">{{ parityThreadReviewSummary }}</p>
                  <div class="sidebar-settings-key-group">
                    <select v-model="parityReviewScopeDraft" class="sidebar-settings-provider-select">
                      <option value="workspace">workspace</option>
                      <option value="baseBranch">baseBranch</option>
                    </select>
                    <select v-model="parityReviewWorkspaceViewDraft" class="sidebar-settings-provider-select">
                      <option value="unstaged">unstaged</option>
                      <option value="staged">staged</option>
                    </select>
                    <input
                      v-model="parityReviewBaseBranchDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="base branch (optional)"
                    />
                  </div>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isInitializingParityReviewGit || !selectedThread?.cwd"
                      @click="onInitializeParityReviewGit"
                    >
                      {{ isInitializingParityReviewGit ? 'Initializing…' : 'Init review git' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isStartingParityThreadReview || !selectedThreadId"
                      @click="onStartParityThreadReview"
                    >
                      {{ isStartingParityThreadReview ? 'Starting…' : 'Start thread review' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityReviewSnapshot || !selectedThread?.cwd"
                      @click="onLoadParityReviewSnapshot"
                    >
                      {{ isLoadingParityReviewSnapshot ? 'Loading…' : 'Read review snapshot' }}
                    </button>
                    <select v-model="parityReviewActionDraft" class="sidebar-settings-provider-select">
                      <option value="stage">stage</option>
                      <option value="unstage">unstage</option>
                      <option value="revert">revert</option>
                    </select>
                    <select v-model="parityReviewActionLevelDraft" class="sidebar-settings-provider-select">
                      <option value="all">all</option>
                      <option value="file">file</option>
                      <option value="hunk">hunk</option>
                    </select>
                    <input
                      v-model="parityReviewActionPathDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="path (required for file/hunk)"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isApplyingParityReviewAction || !selectedThread?.cwd || ((parityReviewActionLevelDraft === 'file' || parityReviewActionLevelDraft === 'hunk') && parityReviewActionPathDraft.trim().length === 0)"
                      @click="onApplyParityReviewAction"
                    >
                      {{ isApplyingParityReviewAction ? 'Applying…' : 'Apply review action' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isInitializingParityReviewGit || isStartingParityThreadReview || isLoadingParityReviewSnapshot || isApplyingParityReviewAction"
                      @click="onClearParityReviewDrafts"
                    >
                      Clear review drafts
                    </button>
                  </div>
                  <p v-if="parityReviewSnapshotSummary" class="sidebar-settings-parity-list-item">{{ parityReviewSnapshotSummary }}</p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityArchivedLimitDraft"
                      class="sidebar-settings-key-input"
                      type="number"
                      min="1"
                      max="200"
                      placeholder="fetch limit"
                      @keydown.enter="onReloadArchivedThreadsWithLimit"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityArchivedThreads"
                      @click="onReloadArchivedThreadsWithLimit"
                    >
                      {{ isLoadingParityArchivedThreads ? 'Loading…' : 'Load archived' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onSetParityArchivedLimitDefault"
                    >
                      Set fetch limit=12
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityArchivedLimitDraft"
                    >
                      Clear fetch limit
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityArchivedThreads"
                      @click="onClearParityArchivedThreadsCache"
                    >
                      Clear archived cache
                    </button>
                  </div>
                  <div v-if="parityArchivedThreads.length > 0" class="sidebar-settings-parity-archived-list">
                    <div
                      v-for="archived in parityArchivedThreads.slice(0, 6)"
                      :key="`archived-${archived.id}`"
                      class="sidebar-settings-parity-archived-row"
                    >
                      <span class="sidebar-settings-parity-archived-title">{{ archived.title || archived.id }}</span>
                      <button
                        class="sidebar-settings-key-save"
                        type="button"
                        :disabled="isLoadingParityArchivedThreads"
                        @click="onUnarchiveArchivedThread(archived.id)"
                      >
                        Unarchive
                      </button>
                    </div>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="unarchiveThreadIdDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="thread id to unarchive"
                      @keydown.enter="onUnarchiveThreadById"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityArchivedThreads || unarchiveThreadIdDraft.trim().length === 0"
                      @click="onUnarchiveThreadById"
                    >
                      Unarchive
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThreadId"
                      @click="onUseSelectedThreadIdForUnarchive"
                    >
                      Use selected thread id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityArchivedThreads"
                      @click="onClearParityUnarchiveThreadDraft"
                    >
                      Clear unarchive draft
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityArchivedThreads"
                      @click="onClearParityArchivedActionResult"
                    >
                      Clear archived action result
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityDirectThreadIdDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="thread id (direct archive/unarchive/rename/fork)"
                      @keydown.enter="onArchiveParityThreadDirect"
                    />
                    <input
                      v-model="parityDirectThreadNameDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="new thread name (for direct rename)"
                      @keydown.enter="onRenameParityThreadDirect"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isArchivingParityThreadDirect || parityDirectThreadIdDraft.trim().length === 0"
                      @click="onArchiveParityThreadDirect"
                    >
                      {{ isArchivingParityThreadDirect ? 'Archiving…' : 'Direct archive' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isUnarchivingParityThreadDirect || parityDirectThreadIdDraft.trim().length === 0"
                      @click="onUnarchiveParityThreadDirect"
                    >
                      {{ isUnarchivingParityThreadDirect ? 'Unarchiving…' : 'Direct unarchive' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isRenamingParityThreadDirect || parityDirectThreadIdDraft.trim().length === 0 || parityDirectThreadNameDraft.trim().length === 0"
                      @click="onRenameParityThreadDirect"
                    >
                      {{ isRenamingParityThreadDirect ? 'Renaming…' : 'Direct rename' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isForkingParityThreadDirect || parityDirectThreadIdDraft.trim().length === 0"
                      @click="onForkParityThreadDirect"
                    >
                      {{ isForkingParityThreadDirect ? 'Forking…' : 'Direct fork' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityDirectThreadDrafts"
                    >
                      Clear direct thread drafts
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="selectedThreadId.trim().length === 0"
                      @click="onUseSelectedThreadIdForDirectThreadActions"
                    >
                      Use selected thread id (direct thread actions)
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThread?.title?.trim()"
                      @click="onUseSelectedThreadTitleForDirectRename"
                    >
                      Use selected thread title
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThread?.title?.trim()"
                      @click="onCopySelectedThreadTitleForDirectRename"
                    >
                      Copy selected thread title
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="selectedThreadId.trim().length === 0"
                      @click="onCopySelectedThreadId"
                    >
                      Copy selected thread id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityDirectThreadIdDraft.trim().length === 0"
                      @click="onCopyDirectThreadIdDraft"
                    >
                      Copy direct thread id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityDirectThreadNameDraft.trim().length === 0"
                      @click="onCopyDirectThreadNameDraft"
                    >
                      Copy direct thread name
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityStartThreadCwdDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="start thread cwd (optional)"
                      @keydown.enter="onStartParityThread"
                    />
                    <input
                      v-model="parityStartThreadModelDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="start thread model (optional)"
                      @keydown.enter="onStartParityThread"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isStartingParityThread"
                      @click="onStartParityThread"
                    >
                      {{ isStartingParityThread ? 'Starting…' : 'Start thread' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThread?.cwd"
                      @click="onUseSelectedThreadCwdForStartThread"
                    >
                      Use selected thread cwd
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThread?.cwd"
                      @click="onCopySelectedThreadCwd"
                    >
                      Copy selected thread cwd
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityStartThreadCwdDraft.trim().length === 0"
                      @click="onCopyStartThreadCwdDraft"
                    >
                      Copy start-thread cwd
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedModelId"
                      @click="onUseSelectedModelForStartThread"
                    >
                      Use selected model
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedModelId"
                      @click="onCopySelectedModelForStartThread"
                    >
                      Copy selected model
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityStartThreadModelDraft.trim().length === 0"
                      @click="onCopyStartThreadModelDraft"
                    >
                      Copy start-thread model
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityStartThreadDrafts"
                    >
                      Clear start-thread drafts
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isResumingParityThread || !selectedThreadId"
                      @click="onResumeParityThread"
                    >
                      {{ isResumingParityThread ? 'Resuming…' : 'Resume current thread' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isArchivingParityThread || !selectedThreadId"
                      @click="onArchiveParityThread"
                    >
                      {{ isArchivingParityThread ? 'Archiving…' : 'Archive current thread' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isCompactingParityThread || !selectedThreadId"
                      @click="onCompactParityThread"
                    >
                      {{ isCompactingParityThread ? 'Compacting…' : 'Compact current thread' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isCleaningParityBackgroundTerminals || !selectedThreadId"
                      @click="onCleanParityBackgroundTerminals"
                    >
                      {{ isCleaningParityBackgroundTerminals ? 'Cleaning…' : 'Clean background terminals' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThreadId"
                      @click="onCopySelectedThreadId"
                    >
                      Copy selected thread id
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityCleanThreadIdDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="thread id for direct clean"
                      @keydown.enter="onCleanParityBackgroundTerminalsById"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isCleaningParityThreadById || parityCleanThreadIdDraft.trim().length === 0"
                      @click="onCleanParityBackgroundTerminalsById"
                    >
                      {{ isCleaningParityThreadById ? 'Cleaning…' : 'Direct clean by id' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThreadId"
                      @click="onUseSelectedThreadIdForDirectClean"
                    >
                      Use selected thread id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThreadId"
                      @click="onCopySelectedThreadId"
                    >
                      Copy selected thread id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityCleanThreadIdDraft.trim().length === 0"
                      @click="onCopyCleanThreadIdDraft"
                    >
                      Copy clean thread id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityDirectCleanDraft"
                    >
                      Clear clean draft
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityRollbackTurnsDraft"
                      class="sidebar-settings-key-input"
                      type="number"
                      min="1"
                      placeholder="rollback turns"
                      @keydown.enter="onRollbackParityThread"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isRollingBackParityThread || !selectedThreadId || Number(parityRollbackTurnsDraft) < 1"
                      @click="onRollbackParityThread"
                    >
                      {{ isRollingBackParityThread ? 'Rolling back…' : 'Rollback turns' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onSetParityRollbackTurnsDefault"
                    >
                      Set rollback=1
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityRollbackTurnsDraft.trim().length === 0"
                      @click="onCopyRollbackTurnsDraft"
                    >
                      Copy rollback turns
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityRollbackDraft"
                    >
                      Clear rollback draft
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityRevertTurnIdDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="turn id for revert"
                      @keydown.enter="onRevertParityThreadFiles"
                    />
                    <input
                      v-model="parityRevertCwdDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="cwd for revert (defaults current thread cwd)"
                      @keydown.enter="onRevertParityThreadFiles"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isRevertingParityThreadFiles || !selectedThreadId || parityRevertTurnIdDraft.trim().length === 0"
                      @click="onRevertParityThreadFiles"
                    >
                      {{ isRevertingParityThreadFiles ? 'Reverting…' : 'Revert file changes' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThread?.cwd"
                      @click="onUseSelectedThreadCwdForRevert"
                    >
                      Use selected thread cwd
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThread?.cwd"
                      @click="onCopySelectedThreadCwd"
                    >
                      Copy selected thread cwd
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityRevertTurnIdDraft.trim().length === 0"
                      @click="onCopyRevertTurnIdDraft"
                    >
                      Copy revert turn id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityRevertCwdDraft.trim().length === 0"
                      @click="onCopyRevertCwdDraft"
                    >
                      Copy revert cwd
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityRevertDrafts"
                    >
                      Clear revert drafts
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isRollingBackParityThread || isRevertingParityThreadFiles"
                      @click="onClearParityRollbackRevertResult"
                    >
                      Clear rollback/revert result
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isRollingBackParityThread || isRevertingParityThreadFiles"
                      @click="onResetParityRollbackRevertControls"
                    >
                      Reset rollback/revert controls
                    </button>
                  </div>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Command exec</p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityCommandDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="ls -la"
                      @keydown.enter="onRunParityCommand"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isRunningParityCommand || parityCommandDraft.trim().length === 0"
                      @click="onRunParityCommand"
                    >
                      {{ isRunningParityCommand ? 'Running…' : 'Run' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityCommandDrafts"
                    >
                      Clear command drafts
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isRunningParityCommand"
                      @click="onClearParityCommandInputOnly"
                    >
                      Clear command input
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityCommandDraft.trim().length === 0"
                      @click="onCopyParityCommandInput"
                    >
                      Copy command input
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityCommandOutput.trim().length === 0"
                      @click="onCopyParityCommandOutput"
                    >
                      Copy command output
                    </button>
                  </div>
                  <pre v-if="parityCommandOutput" class="sidebar-settings-parity-command-output">{{ parityCommandOutput }}</pre>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">File upload</p>
                  <div class="sidebar-settings-key-group">
                    <input
                      class="sidebar-settings-key-input"
                      type="file"
                      @change="onParityUploadFileSelected"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isUploadingParityFile || !parityUploadFileObject"
                      @click="onUploadParityFile"
                    >
                      {{ isUploadingParityFile ? 'Uploading…' : 'Upload file' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityUploadDraft"
                    >
                      Clear upload draft
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isUploadingParityFile"
                      @click="onClearParityUploadResult"
                    >
                      Clear upload result
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityUploadFileName.trim().length === 0"
                      @click="onCopyParityUploadFileName"
                    >
                      Copy upload file name
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityUploadResult.trim().length === 0"
                      @click="onCopyParityUploadResult"
                    >
                      Copy upload result
                    </button>
                  </div>
                  <p v-if="parityUploadFileName" class="sidebar-settings-parity-list-item">selected: {{ parityUploadFileName }}</p>
                  <p v-if="parityUploadResult" class="sidebar-settings-parity-meta">{{ parityUploadResult }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Steer active turn</p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="paritySteerText"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="steer instruction"
                      :disabled="!isSelectedThreadInProgress"
                      @keydown.enter="onSteerParityTurn"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSteeringParityTurn || !isSelectedThreadInProgress || paritySteerText.trim().length === 0"
                      @click="onSteerParityTurn"
                    >
                      {{ isSteeringParityTurn ? 'Steering…' : 'Steer' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="paritySteerText.trim().length === 0"
                      @click="onCopyParitySteerInstruction"
                    >
                      Copy steer instruction
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-meta">
                    {{ isSelectedThreadInProgress ? 'Sends via turn/steer to the currently running turn.' : 'Select a thread with an in-progress turn to steer.' }}
                  </p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityStartTurnThreadIdDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="thread id (direct start turn)"
                      @keydown.enter="onStartParityTurnDirect"
                    />
                    <input
                      v-model="parityStartTurnTextDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="turn text"
                      @keydown.enter="onStartParityTurnDirect"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isStartingParityTurnDirect || parityStartTurnThreadIdDraft.trim().length === 0 || parityStartTurnTextDraft.trim().length === 0"
                      @click="onStartParityTurnDirect"
                    >
                      {{ isStartingParityTurnDirect ? 'Starting…' : 'Direct start turn' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThreadId"
                      @click="onUseSelectedThreadIdForDirectTurnDrafts"
                    >
                      Use selected thread id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityStartTurnTextDraft.trim().length === 0"
                      @click="onCopyParityDirectStartTurnText"
                    >
                      Copy direct start turn text
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityDirectTurnDrafts"
                    >
                      Clear direct turn drafts
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="paritySteerThreadIdDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="thread id (direct steer)"
                      @keydown.enter="onSteerParityTurnDirect"
                    />
                    <input
                      v-model="paritySteerExpectedTurnIdDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="expected turn id"
                      @keydown.enter="onSteerParityTurnDirect"
                    />
                    <input
                      v-model="paritySteerDirectTextDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="steer text"
                      @keydown.enter="onSteerParityTurnDirect"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSteeringParityTurnDirect || paritySteerThreadIdDraft.trim().length === 0 || paritySteerExpectedTurnIdDraft.trim().length === 0 || paritySteerDirectTextDraft.trim().length === 0"
                      @click="onSteerParityTurnDirect"
                    >
                      {{ isSteeringParityTurnDirect ? 'Steering…' : 'Direct steer' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThreadId"
                      @click="onUseSelectedThreadIdForDirectTurnDrafts"
                    >
                      Use selected thread id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="paritySteerDirectTextDraft.trim().length === 0"
                      @click="onCopyParityDirectSteerText"
                    >
                      Copy direct steer text
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="paritySteerExpectedTurnIdDraft.trim().length === 0"
                      @click="onCopyParityDirectSteerExpectedTurnId"
                    >
                      Copy expected turn id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="paritySteerThreadIdDraft.trim().length === 0"
                      @click="onCopyParityDirectSteerThreadId"
                    >
                      Copy direct steer thread id
                    </button>
                  </div>
                  <p v-if="paritySteerResult" class="sidebar-settings-parity-meta">{{ paritySteerResult }}</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSteeringParityTurn || isStartingParityTurnDirect || isSteeringParityTurnDirect || isInterruptingTurn || isDirectInterruptingParityTurn"
                      @click="onClearParityTurnResults"
                    >
                      Clear turn results
                    </button>
                  </div>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Interrupt active turn</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isInterruptingTurn || !isSelectedThreadInProgress"
                      @click="onInterruptParityTurn"
                    >
                      {{ isInterruptingTurn ? 'Interrupting…' : 'Interrupt' }}
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityInterruptThreadIdDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="thread id (direct interrupt)"
                      @keydown.enter="onDirectInterruptParityTurn"
                    />
                    <input
                      v-model="parityInterruptTurnIdDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="turn id (required)"
                      @keydown.enter="onDirectInterruptParityTurn"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isDirectInterruptingParityTurn || parityInterruptThreadIdDraft.trim().length === 0 || parityInterruptTurnIdDraft.trim().length === 0"
                      @click="onDirectInterruptParityTurn"
                    >
                      {{ isDirectInterruptingParityTurn ? 'Interrupting…' : 'Direct interrupt' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!selectedThreadId"
                      @click="onUseSelectedThreadIdForDirectInterrupt"
                    >
                      Use selected thread id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!parityKnownActiveTurnId"
                      @click="onUseActiveTurnIdForDirectInterrupt"
                    >
                      Use active turn id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityInterruptTurnIdDraft.trim().length === 0"
                      @click="onCopyParityDirectInterruptTurnId"
                    >
                      Copy direct interrupt turn id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityInterruptThreadIdDraft.trim().length === 0"
                      @click="onCopyParityDirectInterruptThreadId"
                    >
                      Copy direct interrupt thread id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityDirectInterruptDrafts"
                    >
                      Clear interrupt drafts
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-meta">
                    {{ isSelectedThreadInProgress ? 'Sends turn interrupt for the current in-progress turn.' : 'Select a thread with an in-progress turn to interrupt.' }}
                  </p>
                  <p v-if="parityInterruptResult" class="sidebar-settings-parity-meta">{{ parityInterruptResult }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Feedback upload</p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityFeedbackClassification"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="classification (general/bug/feature)"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSubmittingParityFeedback"
                      @click="parityFeedbackIncludeLogs = !parityFeedbackIncludeLogs"
                    >
                      Logs: {{ parityFeedbackIncludeLogs ? 'on' : 'off' }}
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityFeedbackReason"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="short reason (optional)"
                      @keydown.enter="onSubmitParityFeedback"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSubmittingParityFeedback"
                      @click="onSubmitParityFeedback"
                    >
                      {{ isSubmittingParityFeedback ? 'Submitting…' : 'Submit' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSubmittingParityFeedback"
                      @click="onClearParityFeedbackDrafts"
                    >
                      Clear feedback drafts
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityFeedbackReason.trim().length === 0"
                      @click="onCopyParityFeedbackReason"
                    >
                      Copy feedback reason
                    </button>
                  </div>
                  <p v-if="parityFeedbackResult" class="sidebar-settings-parity-meta">{{ parityFeedbackResult }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">MCP OAuth login</p>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityMcpOauthServerName"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="mcp server name"
                      @keydown.enter="onStartParityMcpOauth"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isStartingParityMcpOauth || parityMcpOauthServerName.trim().length === 0"
                      @click="onStartParityMcpOauth"
                    >
                      {{ isStartingParityMcpOauth ? 'Starting…' : 'Start OAuth' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isStartingParityMcpOauth"
                      @click="onClearParityMcpOauthDrafts"
                    >
                      Clear OAuth drafts
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityMcpOauthServerName.trim().length === 0"
                      @click="onCopyParityMcpOauthServerName"
                    >
                      Copy OAuth server name
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityMcpOauthResult.trim().length === 0"
                      @click="onCopyParityMcpOauthResult"
                    >
                      Copy OAuth result
                    </button>
                  </div>
                  <p v-if="parityMcpOauthResult" class="sidebar-settings-parity-meta">{{ parityMcpOauthResult }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Config write</p>
                  <div class="sidebar-settings-key-group">
                    <select v-model="parityApprovalPolicy" class="sidebar-settings-provider-select">
                      <option value="untrusted">approval: untrusted</option>
                      <option value="on-failure">approval: on-failure</option>
                      <option value="on-request">approval: on-request</option>
                      <option value="never">approval: never</option>
                    </select>
                    <select v-model="paritySandboxMode" class="sidebar-settings-provider-select">
                      <option value="read-only">sandbox: read-only</option>
                      <option value="workspace-write">sandbox: workspace-write</option>
                      <option value="danger-full-access">sandbox: danger-full-access</option>
                    </select>
                    <select v-model="paritySandboxNetworkAccess" class="sidebar-settings-provider-select">
                      <option value="disabled">network: disabled</option>
                      <option value="enabled">network: enabled</option>
                    </select>
                    <select v-model="parityWebSearchMode" class="sidebar-settings-provider-select">
                      <option value="disabled">web_search: disabled</option>
                      <option value="cached">web_search: cached</option>
                      <option value="live">web_search: live</option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isWritingParityConfig"
                      @click="onWriteParityConfig"
                    >
                      {{ isWritingParityConfig ? 'Saving…' : 'Save' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isWritingParityConfig"
                      @click="onResetParityPolicyDrafts"
                    >
                      Reset policy drafts
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityConfigKeyDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="config key (e.g. app.foo.enabled)"
                      @keydown.enter="onWriteParityConfigKeyValue"
                    />
                    <input
                      v-model="parityConfigValueDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="config value (json/text/bool)"
                      @keydown.enter="onWriteParityConfigKeyValue"
                    />
                    <select v-model="parityConfigMergeStrategyDraft" class="sidebar-settings-provider-select">
                      <option value="upsert">merge: upsert</option>
                      <option value="replace">merge: replace</option>
                    </select>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isWritingParityConfigKeyValue || parityConfigKeyDraft.trim().length === 0"
                      @click="onWriteParityConfigKeyValue"
                    >
                      {{ isWritingParityConfigKeyValue ? 'Writing…' : 'Write key/value' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityConfigKeyValueDrafts"
                    >
                      Clear key/value
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityConfigKeyDraft.trim().length === 0"
                      @click="onCopyParityConfigKeyDraft"
                    >
                      Copy config key
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityConfigValueDraft.trim().length === 0"
                      @click="onCopyParityConfigValueDraft"
                    >
                      Copy config value
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityConfigBatchDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder='batch JSON (e.g. [{"keyPath":"foo","value":true,"mergeStrategy":"upsert"}])'
                      @keydown.enter="onWriteParityConfigBatchJson"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isWritingParityConfigBatch || parityConfigBatchDraft.trim().length === 0"
                      @click="onWriteParityConfigBatchJson"
                    >
                      {{ isWritingParityConfigBatch ? 'Writing batch…' : 'Write batch JSON' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onFillParityConfigBatchTemplate"
                    >
                      Fill sample batch
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityConfigBatchDraft"
                    >
                      Clear batch
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityConfigBatchDraft.trim().length === 0"
                      @click="onCopyParityConfigBatchDraft"
                    >
                      Copy config batch JSON
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isWritingParityConfigKeyValue || isWritingParityConfigBatch"
                      @click="onClearParityWriteResults"
                    >
                      Clear write results
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityConfigWriteResult.trim().length === 0"
                      @click="onCopyParityConfigWriteResult"
                    >
                      Copy write result
                    </button>
                  </div>
                  <p v-if="parityConfigWriteResult" class="sidebar-settings-parity-meta">{{ parityConfigWriteResult }}</p>
                </div>
                <div class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Account</p>
                  <p v-if="parityActiveAccount" class="sidebar-settings-parity-list-item">
                    {{ parityActiveAccount.email || '(no email)' }} · {{ parityActiveAccount.planType || 'unknown' }} · {{ parityActiveAccount.type || 'unknown' }}
                  </p>
                  <p v-if="parityActiveAccount" class="sidebar-settings-parity-meta">
                    requiresOpenaiAuth: {{ parityActiveAccount.requiresOpenaiAuth ? 'yes' : 'no' }}
                  </p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityAccountsList"
                      @click="onLoadParityAccountsList"
                    >
                      {{ isLoadingParityAccountsList ? 'Loading…' : 'Load accounts list' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isRefreshingParityAccountConfig"
                      @click="onRefreshParityAccountAndConfig"
                    >
                      {{ isRefreshingParityAccountConfig ? 'Refreshing…' : 'Read account + config' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoadingParityAccountsList || isRefreshingParityAccountConfig"
                      @click="onClearParityAccountSummaries"
                    >
                      Clear account summaries
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityAccountsSummary.trim().length === 0"
                      @click="onCopyParityAccountsSummary"
                    >
                      Copy accounts summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isRefreshingParityAccountConfig"
                      @click="onClearParityActiveAccountSummary"
                    >
                      Clear active account summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="!parityActiveAccount"
                      @click="onCopyParityActiveAccountSummary"
                    >
                      Copy active account summary
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="paritySwitchAccountIdDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="account id to switch"
                      @keydown.enter="onSwitchParityAccountById"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSwitchingParityAccount || paritySwitchAccountIdDraft.trim().length === 0"
                      @click="onSwitchParityAccountById"
                    >
                      {{ isSwitchingParityAccount ? 'Switching…' : 'Switch account' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="paritySwitchAccountIdDraft.trim().length === 0"
                      @click="onCopyParitySwitchAccountIdDraft"
                    >
                      Copy switch account id
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityRemoveAccountIdDraft"
                      class="sidebar-settings-key-input"
                      type="text"
                      placeholder="account id to remove"
                      @keydown.enter="onRemoveParityAccountById"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isRemovingParityAccount || parityRemoveAccountIdDraft.trim().length === 0"
                      @click="onRemoveParityAccountById"
                    >
                      {{ isRemovingParityAccount ? 'Removing…' : 'Remove account' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityRemoveAccountIdDraft.trim().length === 0"
                      @click="onCopyParityRemoveAccountIdDraft"
                    >
                      Copy remove account id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isSwitchingParityAccount || isRemovingParityAccount"
                      @click="onClearParityAccountActionDrafts"
                    >
                      Clear account action drafts
                    </button>
                  </div>
                  <p v-if="parityAccountsSummary" class="sidebar-settings-parity-meta">{{ parityAccountsSummary }}</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isRefreshingParityAccount"
                      @click="onRefreshParityAccountFromAuth"
                    >
                      {{ isRefreshingParityAccount ? 'Refreshing…' : 'Refresh account from auth' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isStartingParityAccountLogin"
                      @click="onStartParityAccountLogin"
                    >
                      {{ isStartingParityAccountLogin ? 'Starting login…' : 'Start ChatGPT login' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isCancellingParityAccountLogin || parityActiveLoginId.trim().length === 0"
                      @click="onCancelParityAccountLogin"
                    >
                      {{ isCancellingParityAccountLogin ? 'Cancelling…' : 'Cancel login' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityActiveLoginId.trim().length === 0"
                      @click="onCopyParityActiveLoginId"
                    >
                      Copy active login id
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isLoggingOutParityAccount"
                      @click="onLogoutParityAccount"
                    >
                      {{ isLoggingOutParityAccount ? 'Logging out…' : 'Logout active account' }}
                    </button>
                  </div>
                  <div class="sidebar-settings-key-group">
                    <input
                      v-model="parityApiKeyDraft"
                      class="sidebar-settings-key-input"
                      type="password"
                      placeholder="OpenAI API key"
                      @keydown.enter="onStartParityApiKeyLogin"
                    />
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isStartingParityAccountLogin || parityApiKeyDraft.trim().length === 0"
                      @click="onStartParityApiKeyLogin"
                    >
                      {{ isStartingParityAccountLogin ? 'Starting…' : 'Login with API key' }}
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="isStartingParityAccountLogin || isCancellingParityAccountLogin"
                      @click="onClearParityLoginDrafts"
                    >
                      Clear login drafts
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityLoginStartResult.trim().length === 0"
                      @click="onCopyParityLoginResult"
                    >
                      Copy login result
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      :disabled="parityApiKeyDraft.trim().length === 0"
                      @click="onCopyParityApiKeyDraft"
                    >
                      Copy API key draft
                    </button>
                  </div>
                  <p v-if="parityLoginStartResult" class="sidebar-settings-parity-meta">{{ parityLoginStartResult }}</p>
                </div>
                <div v-if="parityConfigRead" class="sidebar-settings-parity-list">
                  <p class="sidebar-settings-parity-list-title">Config read</p>
                  <div class="sidebar-settings-key-group">
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onClearParityConfigReadSummary"
                    >
                      Clear config read summary
                    </button>
                    <button
                      class="sidebar-settings-key-save"
                      type="button"
                      @click="onCopyParityConfigReadSummary"
                    >
                      Copy config read summary
                    </button>
                  </div>
                  <p class="sidebar-settings-parity-list-item">
                    model: {{ parityConfigRead.model || '(unset)' }} · provider: {{ parityConfigRead.modelProvider || '(unset)' }}
                  </p>
                  <p class="sidebar-settings-parity-list-item">
                    approval: {{ parityConfigRead.approvalPolicy || '(unset)' }} · sandbox: {{ parityConfigRead.sandboxMode || '(unset)' }}
                  </p>
                  <p class="sidebar-settings-parity-list-item">
                    sandbox network: {{ parityConfigRead.sandboxNetworkAccess || '(unset)' }}
                  </p>
                  <p class="sidebar-settings-parity-list-item">
                    web_search: {{ parityConfigRead.webSearch || '(unset)' }}
                  </p>
                </div>
                <p v-if="parityThreadActionResult" class="sidebar-settings-parity-meta">{{ parityThreadActionResult }}</p>
              </div>
              <div
                v-if="showThreadContextBadge"
                class="sidebar-settings-row sidebar-settings-context-row"
                :data-state="threadContextBadgeState"
                :title="threadContextTooltip"
              >
                <span class="sidebar-settings-label">Context</span>
                <span class="sidebar-settings-context-value" :data-state="threadContextBadgeState">
                  {{ threadContextPrimaryText }}
                  <span class="sidebar-settings-context-meta">{{ threadContextSecondaryText }}</span>
                </span>
              </div>
              <div class="sidebar-settings-rate-limits">
                <RateLimitStatus :snapshots="accountRateLimitSnapshots" />
              </div>
              <div class="sidebar-settings-build-label" aria-label="Worktree name and version">
                WT {{ worktreeName }} · v{{ appVersion }}
              </div>
            </div>
          </Transition>
          <button
            ref="settingsButtonRef"
            class="sidebar-settings-button"
            :class="{ 'is-active': isSettingsRoute }"
            type="button"
            :aria-controls="SETTINGS_PANEL_ID"
            aria-haspopup="dialog"
            :aria-keyshortcuts="SETTINGS_SHORTCUT_ARIA_KEYS"
            :aria-pressed="isSettingsOpen"
            :aria-expanded="isSettingsOpen"
            :aria-label="SETTINGS_SHORTCUT_LABEL"
            :title="SETTINGS_SHORTCUT_LABEL"
            @click.stop="toggleSettingsPanel()"
          >
            <IconTablerSettings class="sidebar-settings-icon" />
            <span>{{ SETTINGS_VISIBLE_LABEL }}</span>
            <span class="sidebar-settings-button-version">
              {{ worktreeName }} · v{{ appVersion }}
            </span>
          </button>
        </div>
      </section>
    </template>

    <template #content>
      <section class="content-root" :style="contentStyle">
        <span class="sr-only" :aria-keyshortcuts="HOME_SHORTCUT_ARIA_KEYS">{{ HOME_SHORTCUT_HINT_TEXT }}</span>
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
          <template #actions>
            <ComposerDropdown
              v-if="route.name === ROUTE_THREAD && selectedThreadId"
              class="content-header-branch-dropdown"
              :class="{ 'is-review-open': isReviewPaneOpen }"
              :model-value="contentHeaderBranchDropdownValue"
              :options="contentHeaderBranchDropdownOptions"
              :disabled="isLoadingThreadBranches || isSwitchingThreadBranch"
              :enable-search="true"
              search-placeholder="Search branches..."
              @update:model-value="onSelectContentHeaderBranch"
            />
          </template>
        </ContentHeader>

        <section class="content-body">
          <template v-if="isSkillsRoute">
            <SkillsHub @skills-changed="onSkillsChanged" />
          </template>
          <template v-else-if="isHomeRoute">
            <div class="content-grid content-grid-home">
              <div class="new-thread-empty">
                <p class="new-thread-hero">Let's build</p>
                <ComposerDropdown class="new-thread-folder-dropdown" :model-value="newThreadCwd"
                  :options="newThreadFolderOptions" placeholder="Choose folder"
                  :enable-search="true"
                  search-placeholder="Quick search project"
                  :disabled="false" @update:model-value="onSelectNewThreadFolder" />
                <p v-if="newThreadCwd" class="new-thread-folder-selected" :title="newThreadCwd">
                  Selected folder: {{ newThreadCwd }}
                </p>
                <div class="new-thread-folder-actions">
                  <button class="new-thread-folder-action new-thread-folder-action-primary" type="button" @click="onOpenExistingFolder">
                    Select folder
                  </button>
                  <button class="new-thread-folder-action" type="button" @click="onCreateProject">
                    Create Project
                  </button>
                </div>
                <Teleport to="body">
                  <div v-if="isExistingFolderPickerOpen" class="new-thread-open-folder-overlay" @click.self="onCloseExistingFolderPanel">
                    <div class="new-thread-open-folder" role="dialog" aria-modal="true" aria-label="Select folder" @keydown.esc.prevent="onCloseExistingFolderPanel">
                      <div class="new-thread-open-folder-header">
                        <p class="new-thread-open-folder-title">Select folder</p>
                        <button class="new-thread-open-folder-close" type="button" @click="onCloseExistingFolderPanel">
                          Cancel
                        </button>
                      </div>
                      <p class="new-thread-open-folder-label">Current folder</p>
                      <div class="new-thread-open-folder-current">
                        <p class="new-thread-open-folder-path" :title="existingFolderBrowsePath || 'Unavailable'">
                          {{ existingFolderBrowsePath || 'Unavailable' }}
                        </p>
                        <button
                          class="new-thread-folder-action new-thread-folder-action-primary"
                          type="button"
                          :disabled="!existingFolderBrowsePath || !!existingFolderError || isExistingFolderLoading || isOpeningExistingFolder"
                          @click="onConfirmExistingFolder()"
                        >
                          {{ isOpeningExistingFolder ? 'Opening…' : 'Open' }}
                        </button>
                      </div>
                      <div class="new-thread-open-folder-actions">
                        <label class="new-thread-open-folder-toggle">
                          <input
                            v-model="showHiddenFolders"
                            class="new-thread-open-folder-toggle-input"
                            type="checkbox"
                            @change="onToggleHiddenFolders"
                          />
                          <span>Show hidden folders</span>
                        </label>
                        <button
                          class="new-thread-folder-action"
                          :class="{ 'new-thread-folder-action-primary': isCreateFolderOpen }"
                          type="button"
                          :aria-pressed="isCreateFolderOpen"
                          :disabled="!existingFolderBrowsePath || isExistingFolderLoading || isOpeningExistingFolder || isCreatingFolder || (!!existingFolderError && !isCreateFolderOpen)"
                          @click="onOpenCreateFolderPanel"
                        >
                          New folder
                        </button>
                      </div>
                      <div v-if="isCreateFolderOpen" class="new-thread-open-folder-create">
                        <div class="new-thread-open-folder-create-composer">
                          <input
                            ref="createFolderInputRef"
                            v-model="createFolderDraft"
                            class="new-thread-open-folder-create-input"
                            type="text"
                            placeholder="Folder name"
                            @keydown.enter.prevent="onCreateFolder"
                            @keydown.esc.prevent="onCloseCreateFolderPanel"
                          />
                          <button
                            class="new-thread-folder-action new-thread-folder-action-primary new-thread-open-folder-create-submit"
                            type="button"
                            :disabled="!canCreateFolder || isCreatingFolder"
                            @click="onCreateFolder"
                          >
                            {{ createFolderSubmitLabel }}
                          </button>
                        </div>
                        <p v-if="createFolderError" class="new-thread-open-folder-error">{{ createFolderError }}</p>
                      </div>
                      <input
                        ref="existingFolderFilterInputRef"
                        v-model="existingFolderFilter"
                        class="new-thread-open-folder-filter"
                        type="text"
                        placeholder="Filter folders..."
                        @keydown.esc.prevent="onCloseExistingFolderPanel"
                      />
                      <div v-if="existingFolderError" class="new-thread-open-folder-error-actions">
                        <p class="new-thread-open-folder-error">{{ existingFolderError }}</p>
                        <button
                          class="new-thread-folder-action"
                          type="button"
                          :disabled="isExistingFolderLoading || isOpeningExistingFolder"
                          @click="onRetryExistingFolderBrowse"
                        >
                          Retry
                        </button>
                      </div>
                      <p v-if="isExistingFolderLoading" class="new-thread-open-folder-status">Loading folders…</p>
                      <p v-else-if="!existingFolderError && existingFolderFilteredEntries.length === 0" class="new-thread-open-folder-status">
                        {{ existingFolderFilter.trim() ? 'No folders match this filter.' : 'No subfolders found here.' }}
                      </p>
                      <ul v-else-if="existingFolderFilteredEntries.length > 0" class="new-thread-open-folder-list">
                        <li v-for="entry in existingFolderFilteredEntries" :key="entry.key" class="new-thread-open-folder-item">
                          <button
                            class="new-thread-open-folder-item-main"
                            type="button"
                            :title="entry.path"
                            :disabled="isExistingFolderLoading || isOpeningExistingFolder"
                            @click="onBrowseExistingFolder(entry.path)"
                          >
                            <span class="new-thread-open-folder-item-name">{{ entry.name }}</span>
                          </button>
                          <button
                            v-if="entry.kind === 'directory'"
                            class="new-thread-open-folder-item-open"
                            type="button"
                            :disabled="isExistingFolderLoading || isOpeningExistingFolder"
                            @click="onConfirmExistingFolder(entry.path)"
                          >
                            Open
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </Teleport>
                <ComposerRuntimeDropdown
                  class="new-thread-runtime-dropdown"
                  v-model="newThreadRuntime"
                />
                <div v-if="newThreadRuntime === 'worktree'" class="new-thread-branch-select">
                  <p class="new-thread-branch-select-label">Base branch</p>
                  <ComposerDropdown
                    class="new-thread-branch-dropdown"
                    :model-value="newWorktreeBaseBranch"
                    :options="newWorktreeBranchDropdownOptions"
                    placeholder="Select branch"
                    :enable-search="true"
                    search-placeholder="Search branches..."
                    :disabled="isLoadingWorktreeBranches || newWorktreeBranchDropdownOptions.length === 0"
                    @update:model-value="onSelectNewWorktreeBranch"
                  />
                  <p class="new-thread-branch-select-help">
                    {{
                      isLoadingWorktreeBranches
                        ? 'Loading branches…'
                        : selectedWorktreeBranchLabel
                          ? `New worktree branch will start from ${selectedWorktreeBranchLabel}.`
                          : 'No Git branches found for this folder.'
                    }}
                  </p>
                </div>
                <p class="new-thread-runtime-help">
                  <code>Local project</code> uses the selected folder directly. <code>New worktree</code> creates an isolated Git worktree before the first prompt.
                </p>
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

              <div class="composer-with-queue">
                <ThreadComposer ref="homeThreadComposerRef" :active-thread-id="composerThreadContextId"
                  :cwd="composerCwd"
                  :collaboration-modes="availableCollaborationModes"
                  :selected-collaboration-mode="selectedCollaborationMode"
                  :models="availableModelIds" :selected-model="composerSelectedModelId"
                  :selected-reasoning-effort="selectedReasoningEffort"
                  :selected-speed-mode="selectedSpeedMode"
                  :is-updating-speed-mode="isUpdatingSpeedMode"
                  :skills="installedSkills"
                  :thread-token-usage="selectedThreadTokenUsage"
                  :codex-quota="codexQuota"
                  :is-turn-in-progress="false"
                  :is-stop-pending="false"
                  :is-interrupting-turn="false" :send-with-enter="sendWithEnter" :in-progress-submit-mode="inProgressSendMode"
                  :dictation-click-to-toggle="dictationClickToToggle" :dictation-auto-send="dictationAutoSend"
                  :dictation-language="dictationLanguage"
                  @submit="onSubmitThreadMessage"
                  @update:selected-collaboration-mode="onSelectCollaborationMode"
                  @update:selected-model="onSelectModel"
                  @update:selected-reasoning-effort="onSelectReasoningEffort"
                  @update:selected-speed-mode="onSelectSpeedMode" />
              </div>
            </div>
          </template>
          <template v-else>
            <div class="content-grid">
              <ReviewPane
                v-if="isReviewPaneOpen && selectedThreadId && composerCwd"
                :thread-id="selectedThreadId"
                :cwd="composerCwd"
                :is-thread-in-progress="isSelectedThreadInProgress"
                @close="isReviewPaneOpen = false"
              />

              <template v-else>
                <div class="content-thread">
                  <ThreadConversation ref="threadConversationRef" :messages="filteredMessages" :is-loading="isLoadingMessages"
                    :active-thread-id="composerThreadContextId" :cwd="composerCwd" :scroll-state="selectedThreadScrollState"
                    :live-overlay="liveOverlay"
                    :pending-requests="selectedThreadServerRequests"
                    @update-scroll-state="onUpdateThreadScrollState"
                    @fork-thread="onForkThreadFromMessage"
                    @rollback="onRollback"
                    @respond-server-request="onRespondServerRequest" />
                </div>

                <div class="composer-with-queue">
                  <QueuedMessages
                    :messages="selectedThreadQueuedMessages"
                    @edit="onEditQueuedMessage"
                    @steer="steerQueuedMessage"
                    @delete="removeQueuedMessage"
                  />
                  <ThreadPendingRequestPanel
                    v-if="selectedThreadPendingRequest"
                    :request="selectedThreadPendingRequest"
                    :request-count="selectedThreadServerRequests.length"
                    :has-queue-above="selectedThreadQueuedMessages.length > 0"
                    @respond-server-request="onRespondServerRequest"
                  />
                  <ThreadComposer v-else ref="threadComposerRef" :active-thread-id="composerThreadContextId"
                    :cwd="composerCwd"
                    :collaboration-modes="availableCollaborationModes"
                    :selected-collaboration-mode="selectedCollaborationMode"
                    :models="availableModelIds"
                    :selected-model="composerSelectedModelId"
                    :selected-reasoning-effort="selectedReasoningEffort"
                    :selected-speed-mode="selectedSpeedMode"
                    :is-updating-speed-mode="isUpdatingSpeedMode"
                    :skills="installedSkills"
                    :thread-token-usage="selectedThreadTokenUsage"
                    :codex-quota="codexQuota"
                    :is-turn-in-progress="isSelectedThreadInProgress"
                    :is-stop-pending="isSelectedThreadInterruptPending"
                    :is-interrupting-turn="isInterruptingTurn"
                    :has-queue-above="selectedThreadQueuedMessages.length > 0"
                    :send-with-enter="sendWithEnter" :in-progress-submit-mode="inProgressSendMode"
                    :dictation-click-to-toggle="dictationClickToToggle" :dictation-auto-send="dictationAutoSend"
                    :dictation-language="dictationLanguage"
                    @update:selected-collaboration-mode="onSelectCollaborationMode"
                    @submit="onSubmitThreadMessage" @update:selected-model="onSelectModel"
                    @update:selected-reasoning-effort="onSelectReasoningEffort"
                    @update:selected-speed-mode="onSelectSpeedMode"
                    @interrupt="onInterruptTurn" />
                </div>
              </template>
            </div>
          </template>
        </section>
      </section>
    </template>
  </DesktopLayout>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import DesktopLayout from './components/layout/DesktopLayout.vue'
import SidebarThreadTree from './components/sidebar/SidebarThreadTree.vue'
import ContentHeader from './components/content/ContentHeader.vue'
import ThreadComposer from './components/content/ThreadComposer.vue'
import ThreadPendingRequestPanel from './components/content/ThreadPendingRequestPanel.vue'
import QueuedMessages from './components/content/QueuedMessages.vue'
import RateLimitStatus from './components/content/RateLimitStatus.vue'
import ComposerDropdown from './components/content/ComposerDropdown.vue'
import ComposerRuntimeDropdown from './components/content/ComposerRuntimeDropdown.vue'
import SidebarThreadControls from './components/sidebar/SidebarThreadControls.vue'
import IconTablerSearch from './components/icons/IconTablerSearch.vue'
import IconTablerSettings from './components/icons/IconTablerSettings.vue'
import IconTablerX from './components/icons/IconTablerX.vue'
import { useDesktopState } from './composables/useDesktopState'
import { useMobile } from './composables/useMobile'
import {
  applyReviewAction,
  checkoutGitBranch,
  configureTelegramBot,
  createWorktree,
  cancelAccountLogin,
  executeCommand,
  getGitBranchState,
  getMethodCatalog,
  getPendingServerRequests,
  getNotificationCatalog,
  getWorktreeBranchOptions,
  getArchivedThreads,
  pickCodexRateLimitSnapshot,
  getAccountRateLimits,
  getAccountRateLimitsResponse,
  getAvailableModelIds,
  getAvailableCollaborationModes,
  getCurrentModelConfig,
  getGithubTrendingProjects,
  getGithubProjectsForScope,
  getThreadDetail,
  getThreadMessages,
  getThreadReviewResult,
  getSkillsList,
  getAccounts,
  getAppsList,
  archiveThread,
  getConfigRequirements,
  getExperimentalFeaturesList,
  cleanThreadBackgroundTerminals,
  compactThread,
  createLocalDirectory,
  getHomeDirectory,
  getMcpServerStatusList,
  generateThreadTitle,
  getPinnedThreadState,
  getTelegramConfig,
  getThreadGroups,
  getThreadTitleCache,
  getProjectRootSuggestion,
  getReviewSnapshot,
  getTelegramStatus,
  getWorkspaceRootsState,
  initializeReviewGit,
  interruptThreadTurn,
  listLocalDirectories,
  logoutAccount,
  openProjectRoot,
  persistPinnedThreadIds,
  persistThreadTitle,
  replyToServerRequest,
  readAccount,
  readConfigParityBundle,
  readConfigSummary,
  revertThreadFileChanges,
  rollbackThread,
  resumeThread,
  subscribeCodexNotifications,
  removeAccount,
  refreshAccountsFromAuth,
  reloadMcpServers,
  searchComposerFiles,
  searchThreads,
  setCodexSpeedMode,
  setDefaultModel,
  setWorkspaceRootsState,
  startThreadTurn,
  startThreadReview,
  steerThreadTurn,
  startAccountLogin,
  startApiKeyLogin,
  startMcpOauthLogin,
  switchAccount,
  startThread,
  uploadFile,
  uploadFeedback,
  writeConfigBatch,
  writeConfigValue,
  unarchiveThread,
  renameThread,
  forkThread,
} from './api/codexGateway'
import type { ReasoningEffort, SpeedMode, ThreadScrollState, UiAccountEntry, UiRateLimitWindow, UiReviewAction, UiReviewActionLevel, UiReviewScope, UiReviewWorkspaceView, UiServerRequest, UiServerRequestReply, UiThreadTokenUsage } from './types/codex'
import type { ComposerDraftPayload, ThreadComposerExposed } from './components/content/ThreadComposer.vue'
import type {
  AppInfo,
  ArchivedThreadInfo,
  ConfigRequirementsInfo,
  ExperimentalFeatureInfo,
  GithubTipsScope,
  GithubTrendingProject,
  LocalDirectoryEntry,
  McpServerStatusInfo,
  TelegramStatus,
  RpcNotification,
  WorkspaceRootsState,
  WorktreeBranchOption,
} from './api/codexGateway'
import { getFreeModeStatus, setFreeMode, setFreeModeCustomKey, setCustomProvider } from './api/codexGateway'
import { getPathLeafName, getPathParent, normalizePathForUi } from './pathUtils.js'

const ThreadConversation = defineAsyncComponent(() => import('./components/content/ThreadConversation.vue'))
const ReviewPane = defineAsyncComponent(() => import('./components/content/ReviewPane.vue'))
const SkillsHub = defineAsyncComponent(() => import('./components/content/SkillsHub.vue'))

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'codex-web-local.sidebar-collapsed.v1'
const ACCOUNTS_SECTION_COLLAPSED_STORAGE_KEY = 'codex-web-local.accounts-section-collapsed.v1'
const worktreeName = import.meta.env.VITE_WORKTREE_NAME ?? 'unknown'
const appVersion = import.meta.env.VITE_APP_VERSION ?? 'unknown'
const SETTINGS_HELP = {
  sendWithEnter: 'When enabled, press Enter to send. When disabled, use Command+Enter to send.',
  inProgressSendMode: 'If a turn is still running, choose whether a new prompt should steer the current turn or be queued.',
  collaborationMode: 'Choose collaboration mode for new actions in the selected thread context.',
  model: 'Cycle through available models for this thread context.',
  reasoningEffort: 'Cycle reasoning effort for the selected thread context.',
  provider: 'Cycle the API provider used by Codex backend integration.',
  dictationLanguageQuick: 'Cycle dictation transcription language through available options.',
  appearance: 'Switch between system theme, light mode, and dark mode.',
  showInMenuBar: 'Keep Codex in the macOS menu bar when the main window is closed.',
  notifications: 'Enable or disable app notifications.',
  chatWidth: 'Choose how wide the conversation column and composer can grow on desktop screens.',
  agentSpeed: 'Choose whether Codex uses standard speed mode or fast mode.',
  approvalPolicy: 'Set agent approval behavior (untrusted, on-failure, on-request, never).',
  sandboxMode: 'Set agent sandbox mode (read-only, workspace-write, danger-full-access).',
  agentNetworkAccess: 'Allow or block network access for workspace-write sandbox mode.',
  webSearchMode: 'Control whether web search is disabled, cached, or live.',
  agentAmbientSuggestions: 'Allow Codex to surface ambient suggestions based on the active project context.',
  dictationClickToToggle: 'Use click-to-start and click-to-stop dictation instead of hold-to-talk.',
  dictationAutoSend: 'Automatically send transcribed dictation when recording stops.',

  githubTrendingProjects: 'Show or hide GitHub trending project cards on the new thread screen.',
  dictationLanguage: 'Choose transcription language or keep auto-detect.',
} as const

const PARITY_APP_SETTINGS_CATEGORIES = [
  'account',
  'agent',
  'appearance',
  'computer-use',
  'connections',
  'data-controls',
  'environments',
  'general-settings',
  'git-settings',
  'local-environments',
  'mcp-settings',
  'personalization',
  'plugins-settings',
  'skills-settings',
  'usage',
  'worktrees',
] as const

const PARITY_APP_SETTINGS_CATEGORY_GROUPS = {
  app: [
    'account',
    'agent',
    'appearance',
    'data-controls',
    'general-settings',
    'git-settings',
    'personalization',
    'usage',
  ],
  connection: [
    'computer-use',
    'connections',
    'environments',
    'local-environments',
    'mcp-settings',
    'plugins-settings',
    'skills-settings',
    'worktrees',
  ],
} as const

const TOP_LEVEL_MODEL_ALIAS_MAP: Record<string, string> = {
  'gpt-5.4': 'GPT-5.4',
  'gpt-5.4-codex': 'GPT-5.4 Codex',
  'gpt-5.4-mini': 'GPT-5.4 Mini',
  'gpt-5.4-codex-mini': 'GPT-5.4 Codex Mini',
  'gpt-5.3': 'GPT-5.3',
  'gpt-5.3-codex': 'GPT-5.3 Codex',
  'gpt-5.3-codex-spark': 'GPT-5.3 Codex Spark',
  'gpt-5.3-mini': 'GPT-5.3 Mini',
  'gpt-5.2': 'GPT-5.2',
  'gpt-5.2-codex': 'GPT-5.2 Codex',
  'gpt-5.2-codex-mini': 'GPT-5.2 Codex Mini',
  'gpt-5.1': 'GPT-5.1',
  'gpt-5.1-codex-max': 'GPT-5.1 Codex Max',
  'gpt-5.1-codex-mini': 'GPT-5.1 Codex Mini',
  'gpt-5.0': 'GPT-5.0',
  'gpt-5.0-codex': 'GPT-5.0 Codex',
  'gpt-5.0-mini': 'GPT-5.0 Mini',
  'gpt-5.0-codex-mini': 'GPT-5.0 Codex Mini',
}

const TOP_LEVEL_PROVIDER_LABEL_MAP: Record<'codex' | 'openrouter' | 'opencode-zen' | 'custom', string> = {
  codex: 'Codex',
  openrouter: 'OpenRouter',
  'opencode-zen': 'OpenCode Zen',
  custom: 'Custom endpoint',
}

const TOP_LEVEL_WEB_SEARCH_MODE_LABEL_MAP: Record<'disabled' | 'cached' | 'live', string> = {
  disabled: 'Disabled',
  cached: 'Cached',
  live: 'Live',
}

const TOP_LEVEL_APPROVAL_POLICY_LABEL_MAP: Record<'untrusted' | 'on-failure' | 'on-request' | 'never', string> = {
  untrusted: 'Untrusted',
  'on-failure': 'On-failure',
  'on-request': 'On-request',
  never: 'Never',
}

const TOP_LEVEL_SANDBOX_MODE_LABEL_MAP: Record<'read-only' | 'workspace-write' | 'danger-full-access', string> = {
  'read-only': 'Read-only',
  'workspace-write': 'Workspace-write',
  'danger-full-access': 'Danger-full-access',
}

const TOP_LEVEL_REASONING_EFFORT_LABEL_MAP: Record<'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh', string> = {
  none: 'None',
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra-high',
}

const TOP_LEVEL_CHAT_WIDTH_LABEL_MAP: Record<'standard' | 'wide' | 'extra-wide', string> = {
  standard: 'Standard',
  wide: 'Wide',
  'extra-wide': 'Extra Wide',
}

type ChatWidthMode = 'standard' | 'wide' | 'extra-wide'

type ChatWidthPreset = {
  label: string
  columnMax: string
  cardMax: string
}

const CHAT_WIDTH_PRESETS: Record<ChatWidthMode, ChatWidthPreset> = {
  standard: {
    label: 'Standard',
    columnMax: '45rem',
    cardMax: '76ch',
  },
  wide: {
    label: 'Wide',
    columnMax: '72rem',
    cardMax: '88ch',
  },
  'extra-wide': {
    label: 'Extra wide',
    columnMax: '96rem',
    cardMax: '96ch',
  },
}

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
  selectedThreadTokenUsage,
  appListRevision,
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
  selectedSpeedMode,
  installedSkills,
  accountRateLimitSnapshots,
  messages,
  isLoadingThreads,
  isLoadingMessages,
  isSendingMessage,
  isInterruptingTurn,
  isSelectedThreadInterruptPending,
  isUpdatingSpeedMode,
  refreshAll,
  refreshSkills,
  selectThread,
  ensureThreadMessagesLoaded,
  setThreadScrollState,
  archiveThreadById,
  cleanSelectedThreadBackgroundTerminals,
  compactSelectedThread,
  forkThreadById,
  renameThreadById,
  forkThreadFromTurn,
  sendMessageToSelectedThread,
  sendMessageToNewThread,
  interruptSelectedThreadTurn,
  selectedThreadQueuedMessages,
  removeQueuedMessage,
  steerQueuedMessage,
  setSelectedCollaborationMode,
  readModelIdForThread,
  setSelectedModelIdForThread,

  setSelectedReasoningEffort,
  updateSelectedSpeedMode,
  respondToPendingServerRequest,
  renameProject,
  removeProject,
  reorderProject,
  pinProjectToTop,
  startPolling,
  stopPolling,
  primeSelectedThread,
  rollbackSelectedThread,
  unarchiveThreadById,
} = useDesktopState()

const route = useRoute()
const router = useRouter()
const { isMobile } = useMobile()
const homeThreadComposerRef = ref<ThreadComposerExposed | null>(null)
const threadComposerRef = ref<ThreadComposerExposed | null>(null)
const threadConversationRef = ref<{ jumpToLatest: () => void } | null>(null)
const trendingProjects = ref<GithubTrendingProject[]>([])
const isTrendingProjectsLoading = ref(false)
const githubTipsScope = ref<GithubTipsScope>('trending-daily')
const editingQueuedMessageState = ref<{ threadId: string; queueIndex: number } | null>(null)
const isRouteSyncInProgress = ref(false)
let hasPendingRouteSync = false
const hasInitialized = ref(false)
const newThreadCwd = ref('')
const newThreadRuntime = ref<'local' | 'worktree'>('local')
const newWorktreeBaseBranch = ref('')
const worktreeBranchOptions = ref<WorktreeBranchOption[]>([])
const isLoadingWorktreeBranches = ref(false)
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
const settingsAreaRef = ref<HTMLElement | null>(null)
const settingsPanelRef = ref<HTMLElement | null>(null)
const settingsButtonRef = ref<HTMLElement | null>(null)
const settingsPreviouslyFocusedElement = ref<HTMLElement | null>(null)
const serverMatchedThreadIds = ref<string[] | null>(null)
let threadSearchTimer: ReturnType<typeof setTimeout> | null = null
const defaultNewProjectName = ref('New Project (1)')
const homeDirectory = ref('')
const isSettingsOpen = ref(false)
const settingsReturnRoute = ref<RouteLocationRaw>({ name: 'home' })
const isAccountsSectionCollapsed = ref(loadAccountsSectionCollapsed())
const isReviewPaneOpen = ref(false)
const threadBranchOptions = ref<WorktreeBranchOption[]>([])
const currentThreadBranch = ref<string | null>(null)
const isLoadingThreadBranches = ref(false)
const isSwitchingThreadBranch = ref(false)
const createFolderInputRef = ref<HTMLInputElement | null>(null)
const accounts = ref<UiAccountEntry[]>([])
const isRefreshingAccounts = ref(false)
const isSwitchingAccounts = ref(false)
const removingAccountId = ref('')
const confirmingRemoveAccountId = ref('')
const hoveredAccountId = ref('')
const accountActionError = ref('')
const SEND_WITH_ENTER_KEY = 'codex-web-local.send-with-enter.v1'
const IN_PROGRESS_SEND_MODE_KEY = 'codex-web-local.in-progress-send-mode.v1'
const DARK_MODE_KEY = 'codex-web-local.dark-mode.v1'
const DICTATION_CLICK_TO_TOGGLE_KEY = 'codex-web-local.dictation-click-to-toggle.v1'
const DICTATION_AUTO_SEND_KEY = 'codex-web-local.dictation-auto-send.v1'
const DICTATION_LANGUAGE_KEY = 'codex-web-local.dictation-language.v1'
const SHOW_IN_MENU_BAR_KEY = 'codex-web-local.show-in-menu-bar.v1'
const NOTIFICATIONS_ENABLED_KEY = 'codex-web-local.notifications-enabled.v1'
const SETTINGS_SHORTCUT_LABEL = 'Settings (Cmd/Ctrl+,)'
const SETTINGS_SHORTCUT_ARIA_KEYS = 'Meta+, Control+,'
const HOME_SHORTCUT_ARIA_KEYS = 'Meta+Shift+H Control+Shift+H'
const HOME_SHORTCUT_HINT_TEXT = 'Home shortcut available: Command or Control Shift H'
const SETTINGS_VISIBLE_LABEL = 'Settings'
const SETTINGS_DIALOG_A11Y_DESCRIPTION = 'Press Escape to close settings. Use Tab and Shift+Tab to move between settings controls.'
const SETTINGS_PANEL_ID = 'sidebar-settings-panel'
const SETTINGS_PANEL_TITLE_ID = 'sidebar-settings-panel-title'
const SETTINGS_PANEL_DESCRIPTION_ID = 'sidebar-settings-panel-description'
const SETTINGS_DIALOG_SHORTCUT_ARIA_KEYS = 'Escape'
const EDITABLE_CONTENT_SELECTOR = '[contenteditable]:not([contenteditable="false"])'
const EDITABLE_TARGET_SELECTOR = `input, textarea, select, [role="textbox"], [role="searchbox"], [role="combobox"], [role="spinbutton"], ${EDITABLE_CONTENT_SELECTOR}`
const EDITABLE_FOCUSABLE_SELECTOR = [
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[role="textbox"]',
  '[role="searchbox"]',
  '[role="combobox"]',
  '[role="spinbutton"]',
  EDITABLE_CONTENT_SELECTOR,
].join(', ')
const SETTINGS_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  EDITABLE_FOCUSABLE_SELECTOR,
  '[tabindex]:not([tabindex="-1"])',
].join(', ')
const ROUTE_HOME = 'home'
const ROUTE_SKILLS = 'skills'
const ROUTE_SETTINGS = 'settings'
const ROUTE_THREAD = 'thread'
const KEY_CODE_COMMA = 'Comma'
const KEY_CODE_H = 'KeyH'
const KEY_CODE_B = 'KeyB'
const KEY_CHAR_SETTINGS = ','
const KEY_CHAR_H = 'h'
const KEY_CHAR_B = 'b'

const GITHUB_TRENDING_PROJECTS_KEY = 'codex-web-local.github-trending-projects.v1'
const CHAT_WIDTH_KEY = 'codex-web-local.chat-width.v1'
const AGENT_AMBIENT_SUGGESTIONS_KEY = 'codex-web-local.agent-ambient-suggestions.v1'
const MOBILE_RESUME_RELOAD_MIN_HIDDEN_MS = 400
const sendWithEnter = ref(loadBoolPref(SEND_WITH_ENTER_KEY, true))
const inProgressSendMode = ref<'steer' | 'queue'>(loadInProgressSendModePref())
const darkMode = ref<'system' | 'light' | 'dark'>(loadDarkModePref())
const chatWidth = ref<ChatWidthMode>(loadChatWidthPref())
const showInMenuBar = ref(loadBoolPref(SHOW_IN_MENU_BAR_KEY, true))
const notificationsEnabled = ref(loadBoolPref(NOTIFICATIONS_ENABLED_KEY, true))
const agentAmbientSuggestionsEnabled = ref(loadBoolPref(AGENT_AMBIENT_SUGGESTIONS_KEY, true))
const dictationClickToToggle = ref(loadBoolPref(DICTATION_CLICK_TO_TOGGLE_KEY, false))
const dictationAutoSend = ref(loadBoolPref(DICTATION_AUTO_SEND_KEY, true))
const dictationLanguage = ref(loadDictationLanguagePref())
const dictationLanguageOptions = computed(() => buildDictationLanguageOptions())
const topLevelDictationLanguageLabel = computed(() => {
  const selected = dictationLanguageOptions.value.find((option) => option.value === dictationLanguage.value)
  return selected?.label || dictationLanguage.value
})
const topLevelProviderLabel = computed(() => {
  return TOP_LEVEL_PROVIDER_LABEL_MAP[selectedProvider.value]
})
const topLevelModelLabel = computed(() => {
  const explicit = (composerSelectedModelId.value || selectedModelId.value || '').trim()
  if (!explicit) return 'Thread default'
  const normalized = explicit.toLowerCase()
  return TOP_LEVEL_MODEL_ALIAS_MAP[normalized] || explicit
})
const topLevelReasoningEffortLabel = computed(() => {
  const value = selectedReasoningEffort.value
  if (!value) return 'Auto'
  if (
    value === 'none'
    || value === 'minimal'
    || value === 'low'
    || value === 'medium'
    || value === 'high'
    || value === 'xhigh'
  ) {
    return TOP_LEVEL_REASONING_EFFORT_LABEL_MAP[value]
  }
  return value
})
const topLevelApprovalPolicyLabel = computed(() => {
  if (
    parityApprovalPolicy.value === 'untrusted'
    || parityApprovalPolicy.value === 'on-failure'
    || parityApprovalPolicy.value === 'on-request'
    || parityApprovalPolicy.value === 'never'
  ) {
    return TOP_LEVEL_APPROVAL_POLICY_LABEL_MAP[parityApprovalPolicy.value]
  }
  return parityApprovalPolicy.value
})
const topLevelSandboxModeLabel = computed(() => {
  if (
    paritySandboxMode.value === 'read-only'
    || paritySandboxMode.value === 'workspace-write'
    || paritySandboxMode.value === 'danger-full-access'
  ) {
    return TOP_LEVEL_SANDBOX_MODE_LABEL_MAP[paritySandboxMode.value]
  }
  return paritySandboxMode.value
})
const topLevelWebSearchModeLabel = computed(() => {
  if (parityWebSearchMode.value === 'disabled' || parityWebSearchMode.value === 'cached' || parityWebSearchMode.value === 'live') {
    return TOP_LEVEL_WEB_SEARCH_MODE_LABEL_MAP[parityWebSearchMode.value]
  }
  return parityWebSearchMode.value
})
const topLevelAppearanceLabel = computed(() => {
  if (darkMode.value === 'light') return 'Light'
  if (darkMode.value === 'dark') return 'Dark'
  return 'System'
})
const topLevelChatWidthLabel = computed(() => {
  return TOP_LEVEL_CHAT_WIDTH_LABEL_MAP[chatWidth.value]
})
const topLevelInProgressSendModeLabel = computed(() => (
  inProgressSendMode.value === 'steer' ? 'Steer active turn' : 'Queue message'
))
const topLevelSendBehaviorLabel = computed(() => (
  sendWithEnter.value ? 'Enter sends' : 'Cmd/Ctrl+Enter sends'
))
const topLevelCollaborationModeLabel = computed(() => {
  const selected = availableCollaborationModes.value.find((mode) => mode.value === selectedCollaborationMode.value)
  if (selected?.label?.trim()) return selected.label.trim()
  return selectedCollaborationMode.value === 'plan' ? 'Plan' : 'Default'
})
const isMacOs = computed(() => {
  if (typeof window === 'undefined') return false
  const platform = window.navigator.platform || ''
  const userAgent = window.navigator.userAgent || ''
  return platform.includes('Mac') || userAgent.includes('Macintosh')
})

const showGithubTrendingProjects = ref(loadBoolPref(GITHUB_TRENDING_PROJECTS_KEY, false))
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
const isTelegramConfigOpen = ref(false)
const telegramBotTokenDraft = ref('')
const telegramAllowedUserIdsDraft = ref('')
const telegramConfigError = ref('')
const isTelegramSaving = ref(false)
const isCreateFolderOpen = ref(false)
const createFolderDraft = ref('')
const createFolderError = ref('')
const isCreatingFolder = ref(false)
const isExistingFolderPickerOpen = ref(false)
const existingFolderFilterInputRef = ref<HTMLInputElement | null>(null)
const existingFolderBrowsePath = ref('')
const existingFolderParentPath = ref('')
const existingFolderEntries = ref<LocalDirectoryEntry[]>([])
const existingFolderError = ref('')
const isExistingFolderLoading = ref(false)
const isOpeningExistingFolder = ref(false)
const showHiddenFolders = ref(false)
const existingFolderFilter = ref('')
const telegramStatus = ref<TelegramStatus>({
  configured: false,
  active: false,
  mappedChats: 0,
  mappedThreads: 0,
  allowedUsers: 0,
  allowAllUsers: false,
  lastError: '',
})
const parityApps = ref<AppInfo[]>([])
const parityExperimentalFeatures = ref<ExperimentalFeatureInfo[]>([])
const parityMcpServers = ref<McpServerStatusInfo[]>([])
const parityConfigRequirements = ref<ConfigRequirementsInfo | null>(null)
const parityArchivedThreads = ref<ArchivedThreadInfo[]>([])
const parityArchivedLimitDraft = ref('12')
const isLoadingParityArchivedThreads = ref(false)
const parityThreadDetailSummary = ref('')
const parityKnownActiveTurnId = ref('')
const isLoadingParityThreadDetail = ref(false)
const parityThreadMessagesSummary = ref('')
const isLoadingParityThreadMessages = ref(false)
const parityThreadReviewSummary = ref('')
const isLoadingParityThreadReview = ref(false)
const parityReadThreadIdDraft = ref('')
const isLoadingParityThreadByIdDetail = ref(false)
const isLoadingParityThreadByIdMessages = ref(false)
const isLoadingParityThreadByIdReview = ref(false)
const parityReviewScopeDraft = ref<UiReviewScope>('workspace')
const parityReviewWorkspaceViewDraft = ref<UiReviewWorkspaceView>('unstaged')
const parityReviewBaseBranchDraft = ref('')
const parityReviewSnapshotSummary = ref('')
const isLoadingParityReviewSnapshot = ref(false)
const isInitializingParityReviewGit = ref(false)
const isStartingParityThreadReview = ref(false)
const parityReviewActionDraft = ref<UiReviewAction>('stage')
const parityReviewActionLevelDraft = ref<UiReviewActionLevel>('all')
const parityReviewActionPathDraft = ref('')
const isApplyingParityReviewAction = ref(false)
const isSavingParitySettingsDrafts = ref(false)
const isApplyingAllParitySettings = ref(false)
const isApplyingParityCategorySettings = ref(false)
const isWritingTopLevelSetting = ref(false)
const activeTopLevelSettingWrite = ref<'' | 'appearance' | 'menu-bar' | 'notifications' | 'approval' | 'sandbox' | 'agent-network' | 'web-search'>('')
const isParityLoading = ref(false)
let parityLoadRequestSeq = 0
let topLevelSettingsLoadRequestSeq = 0
const isReloadingMcpServers = ref(false)
const parityLoadWarnings = ref<string[]>([])
const parityLastRefreshAt = ref('')
const parityLastRefreshDurationMs = ref<number | null>(null)
const parityError = ref('')
const unarchiveThreadIdDraft = ref('')
const parityCommandDraft = ref('')
const parityCommandOutput = ref('')
const isRunningParityCommand = ref(false)
const parityUploadFileName = ref('')
const parityUploadFileObject = ref<File | null>(null)
const parityUploadResult = ref('')
const isUploadingParityFile = ref(false)
const parityMethods = ref<string[]>([])
const parityNotifications = ref<string[]>([])
const parityNotificationSamples = ref<string[]>([])
const parityNotificationCount = ref(0)
const isParityNotificationStreamActive = ref(false)
const parityNotificationFilterDraft = ref('')
const isLoadingParityCatalog = ref(false)
const parityAppSettingsCategories = PARITY_APP_SETTINGS_CATEGORIES
const parityAppSettingsCategorySummary = computed(() => parityAppSettingsCategories.join(', '))
const parityAppSettingsAppGroupSummary = computed(() => PARITY_APP_SETTINGS_CATEGORY_GROUPS.app.join(', '))
const parityAppSettingsConnectionGroupSummary = computed(() => PARITY_APP_SETTINGS_CATEGORY_GROUPS.connection.join(', '))
const parityAppSettingsSupportedCategorySet = computed(() => {
  const supported = new Set<string>()
  if (parityActiveAccount.value !== null || accounts.value.length > 0) supported.add('account')
  if (parityConfigRead.value !== null || parityCurrentModelSummary.value.trim().length > 0) supported.add('agent')
  if (darkMode.value.length > 0) supported.add('appearance')
  if (parityMcpServers.value.length > 0) supported.add('computer-use')
  if (parityApps.value.length > 0 || parityMcpServers.value.length > 0) supported.add('connections')
  if (parityDataControlsSummary.value.trim().length > 0) supported.add('data-controls')
  if (parityWorkspaceRootsDraftState.value !== null || parityHomeDirectory.value.trim().length > 0) supported.add('environments')
  if (sendWithEnter.value !== undefined) supported.add('general-settings')
  if (parityGitBranchSummary.value.trim().length > 0 || parityCurrentBranchName.value.trim().length > 0) supported.add('git-settings')
  if (parityLocalEnvironmentSummary.value.trim().length > 0) supported.add('local-environments')
  if (parityMcpServers.value.length > 0) supported.add('mcp-settings')
  if (parityPersonalizationSummary.value.trim().length > 0) supported.add('personalization')
  if (parityApps.value.length > 0) supported.add('plugins-settings')
  if (installedSkills.value.length > 0 || paritySkillsSummary.value.trim().length > 0) supported.add('skills-settings')
  if (parityRateLimitSummary.value.trim().length > 0 || parityRawRateLimitsSummary.value.trim().length > 0) supported.add('usage')
  if (parityWorktreeBranchOptionValues.value.length > 0 || parityWorkspaceRootsDraftState.value !== null) supported.add('worktrees')
  return supported
})
const parityAppSettingsSupportedCategories = computed(() =>
  parityAppSettingsCategories.filter((category) => parityAppSettingsSupportedCategorySet.value.has(category)),
)
const parityAppSettingsMissingCategories = computed(() => parityAppSettingsCategories.filter(
  (category) => !parityAppSettingsSupportedCategorySet.value.has(category),
))
const parityAppSettingsSupportedSummary = computed(() => parityAppSettingsSupportedCategories.value.join(', '))
const parityAppSettingsMissingSummary = computed(() => parityAppSettingsMissingCategories.value.join(', '))
const parityAppSettingsCoverageSummary = computed(() => {
  const total = Number(parityAppSettingsCategories.length)
  const supported = parityAppSettingsSupportedCategories.value.length
  const percent = total === 0 ? 0 : Math.round((supported / total) * 100)
  return `${supported}/${total} (${percent}%)`
})
const parityAppSettingsCompletionState = computed(() =>
  parityAppSettingsMissingCategories.value.length === 0 ? 'complete' : 'incomplete',
)
const parityAppSettingsFocusCategoryDraft = ref('')
const paritySelfCheckStatus = ref('not-run')
const paritySelfCheckLastRun = ref('never')
const parityPersonalizationToneDraft = ref<'friendly' | 'pragmatic'>('friendly')
const parityPersonalizationAvatarDraft = ref<'default' | 'coder' | 'mentor'>('default')
const parityPersonalizationMemoryDraft = ref<'enabled' | 'disabled'>('enabled')
const parityPersonalizationSummary = computed(() => [
  `tone=${parityPersonalizationToneDraft.value}`,
  `avatar=${parityPersonalizationAvatarDraft.value}`,
  `memory=${parityPersonalizationMemoryDraft.value}`,
].join(' · '))
const parityUsageAutoTopUpDraft = ref<'enabled' | 'disabled'>('disabled')
const parityUsageBudgetDraft = ref('0')
const parityUsageSummary = computed(() => {
  const budget = parityUsageBudgetDraft.value.trim() || '0'
  return `autoTopUp=${parityUsageAutoTopUpDraft.value} · budgetUsd=${budget}`
})
const parityAppearanceThemeDraft = ref<'system' | 'light' | 'dark'>('system')
const parityAppearanceDensityDraft = ref<'compact' | 'comfortable'>('comfortable')
const parityAppearanceSummary = computed(
  () => `theme=${parityAppearanceThemeDraft.value} · density=${parityAppearanceDensityDraft.value}`,
)
const parityDataControlsTelemetryDraft = ref<'enabled' | 'disabled'>('enabled')
const parityDataControlsTrainingDraft = ref<'enabled' | 'disabled'>('enabled')
const parityDataControlsSummary = computed(
  () => `telemetry=${parityDataControlsTelemetryDraft.value} · training=${parityDataControlsTrainingDraft.value}`,
)
const parityComputerUseModeDraft = ref<'ask' | 'auto'>('ask')
const parityComputerUseVisionDraft = ref<'enabled' | 'disabled'>('enabled')
const parityComputerUseSummary = computed(
  () => `mode=${parityComputerUseModeDraft.value} · vision=${parityComputerUseVisionDraft.value}`,
)
const parityGeneralNotificationsDraft = ref<'enabled' | 'disabled'>('enabled')
const parityGeneralMenuBarDraft = ref<'enabled' | 'disabled'>('enabled')
const parityGeneralSettingsSummary = computed(
  () => `notifications=${parityGeneralNotificationsDraft.value} · menuBar=${parityGeneralMenuBarDraft.value}`,
)
const parityLocalEnvironmentNameDraft = ref('local-default')
const parityLocalEnvironmentShellDraft = ref<'zsh' | 'bash' | 'fish'>('zsh')
const parityLocalEnvironmentSummary = computed(() => {
  const name = parityLocalEnvironmentNameDraft.value.trim() || 'local-default'
  return `name=${name} · shell=${parityLocalEnvironmentShellDraft.value}`
})
const parityPluginsEnabledDraft = ref<'enabled' | 'disabled'>('enabled')
const parityPluginsSourceDraft = ref('marketplace')
const parityPluginsSummary = computed(() => {
  const source = parityPluginsSourceDraft.value.trim() || 'marketplace'
  return `plugins=${parityPluginsEnabledDraft.value} · source=${source}`
})
const parityConnectionsHostDraft = ref('localhost')
const parityConnectionsStatusDraft = ref<'connected' | 'connecting' | 'disconnected'>('connected')
const parityConnectionsAuthDraft = ref<'token' | 'ssh'>('token')
const parityConnectionsSummary = computed(() => {
  const host = parityConnectionsHostDraft.value.trim() || 'localhost'
  return `host=${host} · status=${parityConnectionsStatusDraft.value} · auth=${parityConnectionsAuthDraft.value}`
})
const parityEnvironmentNameDraft = ref('default')
const parityEnvironmentTypeDraft = ref<'local' | 'worktree' | 'remote'>('local')
const parityEnvironmentSummary = computed(() => {
  const name = parityEnvironmentNameDraft.value.trim() || 'default'
  return `name=${name} · type=${parityEnvironmentTypeDraft.value}`
})
const parityWorktreesAutoCleanupDraft = ref<'enabled' | 'disabled'>('enabled')
const parityWorktreesRepositoryDraft = ref('')
const parityWorktreesSummary = computed(() => {
  const repository = parityWorktreesRepositoryDraft.value.trim() || '(not set)'
  return `autoCleanup=${parityWorktreesAutoCleanupDraft.value} · repository=${repository}`
})
const parityGitDefaultBranchDraft = ref('main')
const parityGitAutoFetchDraft = ref<'enabled' | 'disabled'>('enabled')
const parityGitSettingsSummary = computed(() => {
  const branch = parityGitDefaultBranchDraft.value.trim() || 'main'
  return `defaultBranch=${branch} · autoFetch=${parityGitAutoFetchDraft.value}`
})
const parityPendingRequestSummaries = ref<string[]>([])
const parityPendingRequestMethodSummary = ref('')
const isLoadingParityPendingRequests = ref(false)
const parityReplyRequestIdDraft = ref('')
const parityReplyModeDraft = ref<'approve' | 'deny'>('approve')
const parityReplyErrorMessageDraft = ref('')
const isReplyingParityPendingRequest = ref(false)
const parityThreadGroupsSummary = ref('')
const isLoadingParityThreadGroups = ref(false)
const paritySkillsSummary = ref('')
const isLoadingParitySkills = ref(false)
const parityThreadTitleCacheSize = ref(0)
const parityThreadPinCount = ref(0)
const parityThreadTitleSamples = ref<string[]>([])
const parityPinnedThreadSamples = ref<string[]>([])
const parityThreadStateDurationMs = ref<number | null>(null)
const isLoadingParityThreadState = ref(false)
const parityPinnedThreadIdsDraft = ref('')
const isPersistingParityPinnedThreadIds = ref(false)
const parityTitlePrompt = ref('')
const parityGeneratedTitle = ref('')
const isGeneratingParityTitle = ref(false)
const isPersistingParityTitle = ref(false)
const parityThreadSearchQuery = ref('')
const parityThreadSearchLimitDraft = ref('200')
const parityThreadSearchCount = ref<number | null>(null)
const parityThreadSearchIndexedCount = ref<number | null>(null)
const isSearchingParityThreads = ref(false)
const parityDefaultModelDraft = ref('')
const isSettingParityDefaultModel = ref(false)
const parityThreadModelDraft = ref('')
const isSettingParityThreadModel = ref(false)
const paritySpeedModeDraft = ref<SpeedMode>('standard')
const isSettingParitySpeedMode = ref(false)
const parityRateLimitSummary = ref('')
const isLoadingParityRateLimits = ref(false)
const parityCurrentModelSummary = ref('')
const isLoadingParityCurrentModel = ref(false)
const parityCollaborationModesSummary = ref('')
const isLoadingParityCollaborationModes = ref(false)
const paritySelectedCollaborationModeDraft = ref<'default' | 'plan'>('default')
const isSettingParityCollaborationMode = ref(false)
const parityReasoningEffortDraft = ref<ReasoningEffort>('medium')
const isSettingParityReasoningEffort = ref(false)
const parityRawRateLimitsSummary = ref('')
const isLoadingParityRawRateLimits = ref(false)
const parityAvailableModelsSummary = ref('')
const isLoadingParityAvailableModels = ref(false)
const parityWorkspaceRootsSummary = ref('')
const parityWorkspaceRootsDraftState = ref<WorkspaceRootsState | null>(null)
const isLoadingParityWorkspaceRoots = ref(false)
const isWritingParityWorkspaceRoots = ref(false)
const parityHomeDirectory = ref('')
const parityHomeDirectoryDurationMs = ref<number | null>(null)
const isLoadingParityHomeDirectory = ref(false)
const parityHomeDirectoryEntryCount = ref<number | null>(null)
const parityHomeDirectoryParentPath = ref('')
const isLoadingParityHomeDirectoryEntries = ref(false)
const parityCreateDirectoryPathDraft = ref('')
const parityCreateDirectoryResult = ref('')
const isCreatingParityDirectory = ref(false)
const parityProjectSuggestionBasePath = ref('')
const paritySuggestedProjectPath = ref('')
const parityProjectSuggestionResult = ref('')
const isLoadingParityProjectSuggestion = ref(false)
const isOpeningParityProjectRoot = ref(false)
const parityComposerFileSearchCwdDraft = ref('')
const parityComposerFileSearchQueryDraft = ref('')
const parityComposerFileSearchSummary = ref('')
const isRunningParityComposerFileSearch = ref(false)
const parityTelegramStatusSummary = ref('')
const isLoadingParityTelegramStatus = ref(false)
const parityTelegramConfigSummary = ref('')
const isLoadingParityTelegramConfig = ref(false)
const parityTelegramBotTokenDraft = ref('')
const parityTelegramAllowedUserIdsDraft = ref('')
const isConfiguringParityTelegram = ref(false)
const parityGithubScope = ref<GithubTipsScope>('trending-daily')
const parityGithubProjectsSummary = ref('')
const isLoadingParityGithubProjects = ref(false)
const parityGitBranchSummary = ref('')
const parityCurrentBranchName = ref('')
const isLoadingParityGitBranchState = ref(false)
const parityCheckoutBranchDraft = ref('')
const isCheckingOutParityBranch = ref(false)
const parityWorktreeBranchOptionsSummary = ref('')
const parityWorktreeBranchOptionValues = ref<string[]>([])
const isLoadingParityWorktreeBranchOptions = ref(false)
const paritySteerText = ref('')
const paritySteerResult = ref('')
const isSteeringParityTurn = ref(false)
const parityStartTurnThreadIdDraft = ref('')
const parityStartTurnTextDraft = ref('')
const isStartingParityTurnDirect = ref(false)
const paritySteerThreadIdDraft = ref('')
const paritySteerExpectedTurnIdDraft = ref('')
const paritySteerDirectTextDraft = ref('')
const isSteeringParityTurnDirect = ref(false)
const parityInterruptResult = ref('')
const parityInterruptThreadIdDraft = ref('')
const parityInterruptTurnIdDraft = ref('')
const isDirectInterruptingParityTurn = ref(false)
const parityFeedbackClassification = ref('general')
const parityFeedbackIncludeLogs = ref(true)
const parityFeedbackReason = ref('')
const parityFeedbackResult = ref('')
const isSubmittingParityFeedback = ref(false)
const parityMcpOauthServerName = ref('')
const parityMcpOauthResult = ref('')
const isStartingParityMcpOauth = ref(false)
const parityApprovalPolicy = ref('on-request')
const paritySandboxMode = ref('workspace-write')
const paritySandboxNetworkAccess = ref<'enabled' | 'disabled'>('disabled')
const parityWebSearchMode = ref('live')
const parityConfigKeyDraft = ref('')
const parityConfigValueDraft = ref('')
const parityConfigMergeStrategyDraft = ref<'upsert' | 'replace'>('upsert')
const parityConfigBatchDraft = ref('')
const parityConfigWriteResult = ref('')
const isWritingParityConfig = ref(false)
const isWritingParityConfigKeyValue = ref(false)
const isWritingParityConfigBatch = ref(false)
const parityThreadActionResult = ref('')
const parityStartThreadCwdDraft = ref('')
const parityStartThreadModelDraft = ref('')
const parityDirectThreadIdDraft = ref('')
const parityDirectThreadNameDraft = ref('')
const isStartingParityThread = ref(false)
const isResumingParityThread = ref(false)
const isArchivingParityThread = ref(false)
const isArchivingParityThreadDirect = ref(false)
const isUnarchivingParityThreadDirect = ref(false)
const isRenamingParityThreadDirect = ref(false)
const isForkingParityThreadDirect = ref(false)
const isCompactingParityThread = ref(false)
const isCleaningParityBackgroundTerminals = ref(false)
const parityCleanThreadIdDraft = ref('')
const isCleaningParityThreadById = ref(false)
const parityRollbackTurnsDraft = ref('1')
const isRollingBackParityThread = ref(false)
const parityRevertTurnIdDraft = ref('')
const parityRevertCwdDraft = ref('')
const isRevertingParityThreadFiles = ref(false)
const isLoggingOutParityAccount = ref(false)
const parityActiveAccount = ref<{ email: string; planType: string; type: string; requiresOpenaiAuth: boolean } | null>(null)
const parityConfigRead = ref<{ model: string; modelProvider: string; approvalPolicy: string; sandboxMode: string; sandboxNetworkAccess: string; webSearch: string } | null>(null)
const parityLoginStartResult = ref('')
const isStartingParityAccountLogin = ref(false)
const parityActiveLoginId = ref('')
const isCancellingParityAccountLogin = ref(false)
const isRefreshingParityAccount = ref(false)
const parityApiKeyDraft = ref('')
const parityAccountsSummary = ref('')
const isLoadingParityAccountsList = ref(false)
const isRefreshingParityAccountConfig = ref(false)
const paritySwitchAccountIdDraft = ref('')
const isSwitchingParityAccount = ref(false)
const parityRemoveAccountIdDraft = ref('')
const isRemovingParityAccount = ref(false)
const togglingAppId = ref('')
const togglingExperimentalFeatureName = ref('')
const mobileHiddenAtMs = ref<number | null>(null)
const mobileResumeReloadTriggered = ref(false)
const mobileResumeSyncInProgress = ref(false)
let accountStatePollTimer: number | null = null
let isAccountStatePollInFlight = false
let existingFolderBrowseRequestId = 0
let parityNotificationUnsubscribe: (() => void) | null = null

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

const isHomeRoute = computed(() => route.name === ROUTE_HOME)
const isSkillsRoute = computed(() => route.name === ROUTE_SKILLS)
const isSettingsRoute = computed(() => route.name === ROUTE_SETTINGS)
const contentTitle = computed(() => {
  if (isSettingsRoute.value) return 'Settings'
  if (isSkillsRoute.value) return 'Skills'
  if (isHomeRoute.value) return 'New thread'
  return selectedThread.value?.title ?? 'Choose a thread'
})
const browserHostName =
  typeof window !== 'undefined'
    ? (window.location.hostname || window.location.host || 'codexui')
    : 'codexui'
const pageTitle = computed(() => {
  if (isSettingsRoute.value) return `Settings • ${browserHostName}`
  const threadTitle = selectedThread.value?.title?.trim() ?? ''
  return threadTitle || browserHostName
})
const filteredMessages = computed(() =>
  messages.value.filter((message) => {
    const type = normalizeMessageType(message.messageType, message.role)
    if (type === 'worked') return true
    if (type === 'turnActivity.live' || type === 'turnError.live' || type === 'agentReasoning.live') return false
    return true
  }),
)
const latestUserTurnId = computed(() => {
  for (let index = messages.value.length - 1; index >= 0; index -= 1) {
    const message = messages.value[index]
    if (message.role !== 'user') continue
    const turnId = message.turnId?.trim() ?? ''
    if (turnId.length > 0) return turnId
  }
  return ''
})
const liveOverlay = computed(() => selectedLiveOverlay.value)
const composerThreadContextId = computed(() => (isHomeRoute.value ? '__new-thread__' : selectedThreadId.value))
const composerSelectedModelId = computed(() => readModelIdForThread(composerThreadContextId.value))
const selectedThreadPendingRequest = computed<UiServerRequest | null>(() => {
  const rows = selectedThreadServerRequests.value
  return rows.length > 0 ? rows[rows.length - 1] : null
})
const composerCwd = computed(() => {
  if (isHomeRoute.value) return newThreadCwd.value.trim()
  return selectedThread.value?.cwd?.trim() ?? ''
})
const isSelectedThreadInProgress = computed(() => !isHomeRoute.value && selectedThread.value?.inProgress === true)
const showThreadContextBadge = computed(() => !isHomeRoute.value && !isSkillsRoute.value && selectedThreadId.value.trim().length > 0)
const isAccountSwitchBlocked = computed(() =>
  isSendingMessage.value ||
  isInterruptingTurn.value ||
  isSelectedThreadInProgress.value ||
  selectedThreadServerRequests.value.length > 0,
)

function formatCompactTokenCount(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return new Intl.NumberFormat('en-US', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 100000 ? 0 : 1,
  }).format(Math.max(0, Math.trunc(value)))
}

function buildThreadContextTooltip(usage: UiThreadTokenUsage | null): string {
  if (!usage) {
    return 'Waiting for Codex thread/tokenUsage/updated events for this thread.'
  }

  const lines = [
    `Current context usage: ${usage.currentContextTokens.toLocaleString()} tokens`,
    `Cumulative thread usage: ${usage.total.totalTokens.toLocaleString()} tokens`,
  ]

  if (typeof usage.modelContextWindow === 'number') {
    lines.unshift(`Model context window: ${usage.modelContextWindow.toLocaleString()} tokens`)
    lines.push(`Remaining context: ${(usage.remainingContextTokens ?? 0).toLocaleString()} tokens`)
  } else {
    lines.push('Model context window is unavailable in the latest usage event.')
  }

  return lines.join('\n')
}

const threadContextBadgeState = computed(() => {
  const remainingPercent = selectedThreadTokenUsage.value?.remainingContextPercent
  if (remainingPercent === null || typeof remainingPercent !== 'number') return 'pending'
  if (remainingPercent <= 10) return 'danger'
  if (remainingPercent <= 25) return 'warning'
  return 'ok'
})

const threadContextPrimaryText = computed(() => {
  const usage = selectedThreadTokenUsage.value
  if (!usage) return 'Awaiting data'
  if (typeof usage.remainingContextTokens === 'number') {
    return `${formatCompactTokenCount(usage.remainingContextTokens)} left`
  }
  return `${formatCompactTokenCount(usage.currentContextTokens)} used`
})

const threadContextSecondaryText = computed(() => {
  const usage = selectedThreadTokenUsage.value
  if (!usage) return 'Updates after the next token usage event'
  if (typeof usage.modelContextWindow === 'number') {
    return `${formatCompactTokenCount(usage.currentContextTokens)} used / ${formatCompactTokenCount(usage.modelContextWindow)}`
  }
  return 'Window size unavailable'
})

const threadContextTooltip = computed(() => buildThreadContextTooltip(selectedThreadTokenUsage.value))
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
const newWorktreeBranchDropdownOptions = computed<Array<{ value: string; label: string }>>(() => {
  const selectedBranch = newWorktreeBaseBranch.value.trim()
  const options = [...worktreeBranchOptions.value]
  if (selectedBranch && !options.some((option) => option.value === selectedBranch)) {
    options.unshift({ value: selectedBranch, label: selectedBranch })
  }
  return options
})
const selectedWorktreeBranchLabel = computed(() => {
  const selectedBranch = newWorktreeBaseBranch.value.trim()
  if (!selectedBranch) return ''
  const selected = newWorktreeBranchDropdownOptions.value.find((option) => option.value === selectedBranch)
  return selected?.label ?? selectedBranch
})
const contentHeaderBranchDropdownValue = computed(() => currentThreadBranch.value ?? '__detached_head__')
const contentHeaderBranchDropdownOptions = computed<Array<{ value: string; label: string }>>(() => {
  const options: Array<{ value: string; label: string }> = [
    {
      value: '__review__',
      label: isReviewPaneOpen.value ? 'Review (Open)' : 'Review',
    },
  ]
  const seen = new Set<string>()
  const currentBranch = currentThreadBranch.value?.trim() ?? ''
  if (currentBranch) {
    options.push({ value: currentBranch, label: currentBranch })
    seen.add(currentBranch)
  } else {
    options.push({ value: '__detached_head__', label: 'Detached HEAD' })
    seen.add('__detached_head__')
  }
  for (const option of threadBranchOptions.value) {
    if (!option.value || seen.has(option.value)) continue
    seen.add(option.value)
    options.push(option)
  }
  return options
})
const createFolderParentPath = computed(() => existingFolderBrowsePath.value.trim())
const isCreateFolderNameValid = computed(() => {
  const draft = createFolderDraft.value.trim()
  if (!draft) return false
  if (draft === '.' || draft === '..') return false
  return !/[\\/]/u.test(draft)
})
const canCreateFolder = computed(() => {
  return isCreateFolderNameValid.value && createFolderParentPath.value.trim().length > 0 && !existingFolderError.value
})
const createFolderSubmitLabel = computed(() => {
  if (isCreatingFolder.value) return 'Creating…'
  return 'Create'
})
const canBrowseExistingFolderParent = computed(() => {
  const current = existingFolderBrowsePath.value.trim()
  const parent = existingFolderParentPath.value.trim()
  return Boolean(current && parent && current !== parent)
})
const existingFolderDisplayEntries = computed(() => {
  const entries: Array<{ key: string; name: string; path: string; kind: 'parent' | 'directory' }> = []
  if (canBrowseExistingFolderParent.value) {
    entries.push({
      key: `parent:${existingFolderParentPath.value}`,
      name: '..',
      path: existingFolderParentPath.value,
      kind: 'parent',
    })
  }
  for (const entry of existingFolderEntries.value) {
    entries.push({
      key: `directory:${entry.path}`,
      name: entry.name,
      path: entry.path,
      kind: 'directory',
    })
  }
  return entries
})
const existingFolderFilteredEntries = computed(() => {
  const filter = existingFolderFilter.value.trim().toLowerCase()
  if (!filter) return existingFolderDisplayEntries.value
  return existingFolderDisplayEntries.value.filter((entry) =>
    entry.kind === 'parent' || entry.name.toLowerCase().includes(filter),
  )
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
const chatWidthLabel = computed(() => CHAT_WIDTH_PRESETS[chatWidth.value].label)
const contentStyle = computed(() => {
  const preset = CHAT_WIDTH_PRESETS[chatWidth.value]
  return {
    '--chat-column-max': preset.columnMax,
    '--chat-card-max': preset.cardMax,
  }
})
const telegramStatusText = computed(() => {
  if (!telegramStatus.value.configured) return 'Not configured'
  const base = telegramStatus.value.active ? 'Online' : 'Configured (offline)'
  const allowlist = telegramStatus.value.allowAllUsers
    ? 'allow all users'
    : `${telegramStatus.value.allowedUsers} allowed user(s)`
  const mapped = `${telegramStatus.value.mappedChats} chat(s), ${telegramStatus.value.mappedThreads} thread(s), ${allowlist}`
  const error = telegramStatus.value.lastError ? `, error: ${telegramStatus.value.lastError}` : ''
  return `${base}, ${mapped}${error}`
})
const parityConfigSummary = computed(() => {
  const requirements = parityConfigRequirements.value
  if (!requirements) return 'No requirements'
  const sandbox = requirements.allowedSandboxModes.join(', ') || 'any'
  const approval = requirements.allowedApprovalPolicies.join(', ') || 'any'
  const webSearch = requirements.allowedWebSearchModes.join(', ') || 'any'
  const network =
    requirements.networkEnabled === null
      ? 'network:any'
      : `network:${requirements.networkEnabled ? 'enabled' : 'disabled'}`
  const residency = requirements.enforceResidency ? `residency:${requirements.enforceResidency}` : 'residency:any'
  return `sandbox:${sandbox} · approval:${approval} · web:${webSearch} · ${network} · ${residency}`
})

const paritySurfaceSummary = computed(() => `Apps ${parityApps.value.length} · Experimental ${parityExperimentalFeatures.value.length} · MCP ${parityMcpServers.value.length}`)
const parityLastRefreshLabel = computed(() => {
  const at = parityLastRefreshAt.value.trim()
  if (!at) return 'never'
  const durationPart = parityLastRefreshDurationMs.value === null ? '' : ` · durationMs=${parityLastRefreshDurationMs.value}`
  return `${at}${durationPart}`
})
const paritySnapshotId = computed(() => {
  const at = parityLastRefreshAt.value.trim()
  if (!at) return 'parity-snapshot-never'
  return `parity-snapshot-${at.replace(/[^0-9TZ]/g, '')}`
})
const parityWarningsFingerprint = computed(() => {
  if (parityLoadWarnings.value.length === 0) return 'none'
  const normalized = parityLoadWarnings.value
    .map((warning) => warning.trim().toLowerCase())
    .filter((warning) => warning.length > 0)
    .sort()
    .join('|')
  let acc = 0
  for (let index = 0; index < normalized.length; index += 1) {
    acc = (acc + normalized.charCodeAt(index) * (index + 1)) % 1000000007
  }
  return `wf-${acc.toString(16)}`
})

function addParityLoadWarning(message: string): void {
  const normalized = message.trim()
  if (!normalized) return
  if (parityLoadWarnings.value.includes(normalized)) return
  parityLoadWarnings.value.push(normalized)
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  window.addEventListener('keydown', onWindowKeyDown)
  document.addEventListener('visibilitychange', onDocumentVisibilityChange)
  window.addEventListener('pageshow', onWindowPageShow)
  window.addEventListener('focus', onWindowFocus)
  applyDarkMode()
  darkModeMediaQuery?.addEventListener('change', applyDarkMode)
  void initialize()
  void loadHomeDirectory()
  void loadWorkspaceRootOptionsState()
  void refreshDefaultProjectName()
  void refreshTelegramConfig()
  void refreshTelegramStatus()
  void loadFreeModeStatus()
  void loadParitySurface()
  if (showGithubTrendingProjects.value) {
    void loadTrendingProjects()
  }
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
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
  if (parityNotificationUnsubscribe) {
    parityNotificationUnsubscribe()
    parityNotificationUnsubscribe = null
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

watch(appListRevision, () => {
  if (!isSettingsOpen.value) {
    void loadTopLevelSettingsFromConfig()
    return
  }
  void loadAccountsState({ silent: true })
  void loadParitySurface()
})

watch(isSettingsOpen, (open) => {
  if (!open) return
  void loadAccountsState({ silent: true })
  void loadParitySurface()
})

watch(
  () => route.name,
  (routeName) => {
    if (routeName === ROUTE_SETTINGS) {
      if (isSidebarCollapsed.value) setSidebarCollapsed(false)
      let openedFromRoute = false
      if (!isSettingsOpen.value) {
        captureSettingsFocusOrigin()
        isSettingsOpen.value = true
        openedFromRoute = true
      }
      if (openedFromRoute) focusSettingsPanel()
      return
    }
    if (routeName === ROUTE_THREAD && routeThreadId.value) {
      settingsReturnRoute.value = { name: ROUTE_THREAD, params: { threadId: routeThreadId.value } }
    } else if (routeName === ROUTE_SKILLS) {
      settingsReturnRoute.value = { name: ROUTE_SKILLS }
    } else {
      settingsReturnRoute.value = { name: ROUTE_HOME }
    }
    if (isSettingsOpen.value) closeSettingsPanel({ skipRouteSync: true, restoreFocus: false })
  },
)

watch(isSidebarCollapsed, (collapsed) => {
  if (!collapsed) return
  if (!isSettingsOpen.value) return
  closeSettingsPanel()
})

watch(darkMode, (value) => {
  if (isApplyingParityCategorySettings.value || isApplyingAllParitySettings.value) return
  if (parityAppearanceThemeDraft.value !== value) {
    parityAppearanceThemeDraft.value = value
  }
})

watch(notificationsEnabled, (value) => {
  if (isApplyingParityCategorySettings.value || isApplyingAllParitySettings.value) return
  const draftValue = value ? 'enabled' : 'disabled'
  if (parityGeneralNotificationsDraft.value !== draftValue) {
    parityGeneralNotificationsDraft.value = draftValue
  }
})

watch(showInMenuBar, (value) => {
  if (isApplyingParityCategorySettings.value || isApplyingAllParitySettings.value) return
  const draftValue = value ? 'enabled' : 'disabled'
  if (parityGeneralMenuBarDraft.value !== draftValue) {
    parityGeneralMenuBarDraft.value = draftValue
  }
})

function onSkillsChanged(): void {
  void refreshSkills()
}

function hydrateTopLevelAppearanceFromParity(
  appearanceTheme: string,
  options: { respectTopLevelWriteLock: boolean },
): void {
  if (appearanceTheme === 'system' || appearanceTheme === 'light' || appearanceTheme === 'dark') {
    parityAppearanceThemeDraft.value = appearanceTheme
    if (!options.respectTopLevelWriteLock || !isWritingTopLevelSetting.value) {
      darkMode.value = appearanceTheme
      setDarkModePref(darkMode.value)
      applyDarkMode()
    }
  }
}

function hydrateTopLevelGeneralSettingsFromParity(
  generalNotifications: string,
  generalMenuBar: string,
  options: { respectTopLevelWriteLock: boolean },
): void {
  if (generalNotifications === 'enabled' || generalNotifications === 'disabled') {
    parityGeneralNotificationsDraft.value = generalNotifications
    if (!options.respectTopLevelWriteLock || !isWritingTopLevelSetting.value) {
      notificationsEnabled.value = generalNotifications === 'enabled'
      setBoolPref(NOTIFICATIONS_ENABLED_KEY, notificationsEnabled.value)
    }
  }
  if (generalMenuBar === 'enabled' || generalMenuBar === 'disabled') {
    parityGeneralMenuBarDraft.value = generalMenuBar
    if (!options.respectTopLevelWriteLock || !isWritingTopLevelSetting.value) {
      showInMenuBar.value = generalMenuBar === 'enabled'
      setBoolPref(SHOW_IN_MENU_BAR_KEY, showInMenuBar.value)
    }
  }
}

function syncTopLevelGeneralSettingsFromDrafts(): void {
  notificationsEnabled.value = parityGeneralNotificationsDraft.value === 'enabled'
  setBoolPref(NOTIFICATIONS_ENABLED_KEY, notificationsEnabled.value)
  showInMenuBar.value = parityGeneralMenuBarDraft.value === 'enabled'
  setBoolPref(SHOW_IN_MENU_BAR_KEY, showInMenuBar.value)
}

function syncTopLevelAppearanceFromDraft(): void {
  darkMode.value = parityAppearanceThemeDraft.value
  setDarkModePref(darkMode.value)
  applyDarkMode()
}

async function loadTopLevelSettingsFromConfig(): Promise<void> {
  const requestId = ++topLevelSettingsLoadRequestSeq
  try {
    const configBundle = await readConfigParityBundle()
    if (requestId !== topLevelSettingsLoadRequestSeq) return
    const parity = configBundle.parity
    hydrateTopLevelAppearanceFromParity(parity.appearanceTheme, { respectTopLevelWriteLock: false })
    hydrateTopLevelGeneralSettingsFromParity(parity.generalNotifications, parity.generalMenuBar, {
      respectTopLevelWriteLock: false,
    })
  } catch {
    // Keep local preferences if startup config hydration fails.
  }
}

async function loadParitySurface(): Promise<void> {
  const requestId = ++parityLoadRequestSeq
  const startedAt = Date.now()
  isParityLoading.value = true
  parityError.value = ''
  parityLoadWarnings.value = []
  try {
    const [apps, features, servers, requirements, archivedThreads, account, configBundle] = await Promise.all([
      getAppsList(),
      getExperimentalFeaturesList(),
      getMcpServerStatusList(),
      getConfigRequirements(),
      getArchivedThreads(readParityArchivedLimit()),
      readAccount(),
      readConfigParityBundle(),
    ])
    if (requestId !== parityLoadRequestSeq) return
    parityApps.value = apps
    parityExperimentalFeatures.value = features
    parityMcpServers.value = servers
    parityConfigRequirements.value = requirements
    parityArchivedThreads.value = archivedThreads
    parityActiveAccount.value = account
    parityConfigRead.value = configBundle.summary
    if (configBundle.summary.sandboxNetworkAccess === 'enabled' || configBundle.summary.sandboxNetworkAccess === 'disabled') {
      paritySandboxNetworkAccess.value = configBundle.summary.sandboxNetworkAccess
    }
    const paritySettingsSnapshot = configBundle.parity
    if (paritySettingsSnapshot.personalizationTone === 'friendly' || paritySettingsSnapshot.personalizationTone === 'pragmatic') {
      parityPersonalizationToneDraft.value = paritySettingsSnapshot.personalizationTone
    }
    if (paritySettingsSnapshot.personalizationAvatar === 'default' || paritySettingsSnapshot.personalizationAvatar === 'coder' || paritySettingsSnapshot.personalizationAvatar === 'mentor') {
      parityPersonalizationAvatarDraft.value = paritySettingsSnapshot.personalizationAvatar
    }
    if (paritySettingsSnapshot.personalizationMemory === 'enabled' || paritySettingsSnapshot.personalizationMemory === 'disabled') {
      parityPersonalizationMemoryDraft.value = paritySettingsSnapshot.personalizationMemory
    }
    if (paritySettingsSnapshot.usageAutoTopUp === 'enabled' || paritySettingsSnapshot.usageAutoTopUp === 'disabled') {
      parityUsageAutoTopUpDraft.value = paritySettingsSnapshot.usageAutoTopUp
    }
    if (paritySettingsSnapshot.usageMonthlyBudgetUsd.trim().length > 0) {
      parityUsageBudgetDraft.value = paritySettingsSnapshot.usageMonthlyBudgetUsd
    }
    hydrateTopLevelAppearanceFromParity(paritySettingsSnapshot.appearanceTheme, { respectTopLevelWriteLock: true })
    if (paritySettingsSnapshot.appearanceDensity === 'compact' || paritySettingsSnapshot.appearanceDensity === 'comfortable') {
      parityAppearanceDensityDraft.value = paritySettingsSnapshot.appearanceDensity
    }
    if (paritySettingsSnapshot.dataControlsTelemetry === 'enabled' || paritySettingsSnapshot.dataControlsTelemetry === 'disabled') {
      parityDataControlsTelemetryDraft.value = paritySettingsSnapshot.dataControlsTelemetry
    }
    if (paritySettingsSnapshot.dataControlsTraining === 'enabled' || paritySettingsSnapshot.dataControlsTraining === 'disabled') {
      parityDataControlsTrainingDraft.value = paritySettingsSnapshot.dataControlsTraining
    }
    if (paritySettingsSnapshot.computerUseMode === 'ask' || paritySettingsSnapshot.computerUseMode === 'auto') {
      parityComputerUseModeDraft.value = paritySettingsSnapshot.computerUseMode
    }
    if (paritySettingsSnapshot.computerUseVision === 'enabled' || paritySettingsSnapshot.computerUseVision === 'disabled') {
      parityComputerUseVisionDraft.value = paritySettingsSnapshot.computerUseVision
    }
    hydrateTopLevelGeneralSettingsFromParity(
      paritySettingsSnapshot.generalNotifications,
      paritySettingsSnapshot.generalMenuBar,
      { respectTopLevelWriteLock: true },
    )
    if (paritySettingsSnapshot.localEnvironmentName.trim().length > 0) {
      parityLocalEnvironmentNameDraft.value = paritySettingsSnapshot.localEnvironmentName
    }
    if (paritySettingsSnapshot.localEnvironmentShell === 'zsh' || paritySettingsSnapshot.localEnvironmentShell === 'bash' || paritySettingsSnapshot.localEnvironmentShell === 'fish') {
      parityLocalEnvironmentShellDraft.value = paritySettingsSnapshot.localEnvironmentShell
    }
    if (paritySettingsSnapshot.pluginsEnabled === 'enabled' || paritySettingsSnapshot.pluginsEnabled === 'disabled') {
      parityPluginsEnabledDraft.value = paritySettingsSnapshot.pluginsEnabled
    }
    if (paritySettingsSnapshot.pluginsSource.trim().length > 0) {
      parityPluginsSourceDraft.value = paritySettingsSnapshot.pluginsSource
    }
    if (paritySettingsSnapshot.connectionsHost.trim().length > 0) {
      parityConnectionsHostDraft.value = paritySettingsSnapshot.connectionsHost
    }
    if (paritySettingsSnapshot.connectionsStatus === 'connected' || paritySettingsSnapshot.connectionsStatus === 'connecting' || paritySettingsSnapshot.connectionsStatus === 'disconnected') {
      parityConnectionsStatusDraft.value = paritySettingsSnapshot.connectionsStatus
    }
    if (paritySettingsSnapshot.connectionsAuth === 'token' || paritySettingsSnapshot.connectionsAuth === 'ssh') {
      parityConnectionsAuthDraft.value = paritySettingsSnapshot.connectionsAuth
    }
    if (paritySettingsSnapshot.environmentName.trim().length > 0) {
      parityEnvironmentNameDraft.value = paritySettingsSnapshot.environmentName
    }
    if (paritySettingsSnapshot.environmentType === 'local' || paritySettingsSnapshot.environmentType === 'worktree' || paritySettingsSnapshot.environmentType === 'remote') {
      parityEnvironmentTypeDraft.value = paritySettingsSnapshot.environmentType
    }
    if (paritySettingsSnapshot.worktreesAutoCleanup === 'enabled' || paritySettingsSnapshot.worktreesAutoCleanup === 'disabled') {
      parityWorktreesAutoCleanupDraft.value = paritySettingsSnapshot.worktreesAutoCleanup
    }
    if (paritySettingsSnapshot.worktreesRepository.trim().length > 0) {
      parityWorktreesRepositoryDraft.value = paritySettingsSnapshot.worktreesRepository
    }
    if (paritySettingsSnapshot.gitDefaultBranch.trim().length > 0) {
      parityGitDefaultBranchDraft.value = paritySettingsSnapshot.gitDefaultBranch
    }
    if (paritySettingsSnapshot.gitAutoFetch === 'enabled' || paritySettingsSnapshot.gitAutoFetch === 'disabled') {
      parityGitAutoFetchDraft.value = paritySettingsSnapshot.gitAutoFetch
    }
    paritySelectedCollaborationModeDraft.value = selectedCollaborationMode.value
    parityReasoningEffortDraft.value = selectedReasoningEffort.value || 'medium'
    parityThreadModelDraft.value = readModelIdForThread(composerThreadContextId.value)
    paritySpeedModeDraft.value = selectedSpeedMode.value
    const warnings: string[] = []
    if (apps.length === 0) warnings.push('Apps list is empty (check app/list availability).')
    if (features.length === 0) warnings.push('Experimental features list is empty (check experimentalFeature/list).')
    if (servers.length === 0) warnings.push('MCP server list is empty (check mcpServerStatus/list).')
    if (requirements === null) warnings.push('Config requirements unavailable (check configRequirements/read).')
    parityLoadWarnings.value = []
    for (const warning of warnings) addParityLoadWarning(warning)
    if (account.email && account.email.trim().length > 0) {
      parityActiveLoginId.value = ''
      if (parityLoginStartResult.value.toLowerCase().includes('login started')) {
        parityLoginStartResult.value = 'Login completed'
      }
    }
    await Promise.allSettled([
      onLoadParityProtocolCatalog(),
      onLoadParityPendingRequests(),
    ])
    if (requestId !== parityLoadRequestSeq) return
    if (parityMethods.value.length === 0 && parityNotifications.value.length === 0) {
      addParityLoadWarning('Protocol catalog is empty (check method/notification catalog availability).')
    }
    if (parityPendingRequestSummaries.value.length === 0) {
      addParityLoadWarning('Pending request list is empty (check pending server request feed).')
    }
  } catch (error) {
    if (requestId !== parityLoadRequestSeq) return
    parityError.value = error instanceof Error ? error.message : 'Failed to load parity diagnostics'
  } finally {
    if (requestId !== parityLoadRequestSeq) return
    parityLastRefreshAt.value = new Date().toISOString()
    parityLastRefreshDurationMs.value = Math.max(0, Date.now() - startedAt)
    isParityLoading.value = false
  }
}

async function onReloadMcpServers(): Promise<void> {
  if (isReloadingMcpServers.value) return
  isReloadingMcpServers.value = true
  parityError.value = ''
  try {
    await reloadMcpServers()
    parityMcpServers.value = await getMcpServerStatusList()
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to reload MCP servers'
  } finally {
    isReloadingMcpServers.value = false
  }
}

async function onLoadParityProtocolCatalog(): Promise<void> {
  if (isLoadingParityCatalog.value) return
  isLoadingParityCatalog.value = true
  parityError.value = ''
  try {
    const [methods, notifications] = await Promise.all([
      getMethodCatalog(),
      getNotificationCatalog(),
    ])
    parityMethods.value = methods
    parityNotifications.value = notifications
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load protocol catalog'
  } finally {
    isLoadingParityCatalog.value = false
  }
}

function onClearParityProtocolCatalog(): void {
  parityMethods.value = []
  parityNotifications.value = []
}

async function onCopyParityProtocolCatalogSummary(): Promise<void> {
  if (parityMethods.value.length === 0 && parityNotifications.value.length === 0) return
  const summary = [
    `methods: ${parityMethods.value.length}`,
    `notifications: ${parityNotifications.value.length}`,
    `methods sample: ${parityMethods.value.slice(0, 10).join(', ') || '(none)'}`,
    `notifications sample: ${parityNotifications.value.slice(0, 10).join(', ') || '(none)'}`,
  ].join('\n')
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied protocol catalog summary'
    return
  }
  parityError.value = 'Failed to copy protocol catalog summary'
}

function onClearParityMcpServerCache(): void {
  parityMcpServers.value = []
}

function onClearParityAppFeatureCache(): void {
  parityApps.value = []
  parityExperimentalFeatures.value = []
}

function onClearParityConfigRequirements(): void {
  parityConfigRequirements.value = null
}

function onClearParityDiagnosticsSnapshot(): void {
  parityLoadWarnings.value = []
  parityLastRefreshAt.value = ''
  parityLastRefreshDurationMs.value = null
  parityMethods.value = []
  parityNotifications.value = []
  parityPendingRequestSummaries.value = []
  parityPendingRequestMethodSummary.value = ''
  parityNotificationSamples.value = []
  parityNotificationCount.value = 0
  parityError.value = ''
  parityThreadActionResult.value = 'Cleared parity diagnostics snapshot'
}

async function onCopyParityConfigSummary(): Promise<void> {
  const summary = parityConfigSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied config summary'
    return
  }
  parityError.value = 'Failed to copy config summary'
}

async function onCopyParitySurfaceSummary(): Promise<void> {
  const summary = paritySurfaceSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied apps/experimental/MCP summary'
    return
  }
  parityError.value = 'Failed to copy apps/experimental/MCP summary'
}

async function onCopyParityLastRefreshSummary(): Promise<void> {
  const summary = parityLastRefreshLabel.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity refresh summary'
    return
  }
  parityError.value = 'Failed to copy parity refresh summary'
}

async function onCopyParityLoadWarnings(): Promise<void> {
  if (parityLoadWarnings.value.length === 0) return
  const copied = await copyTextToClipboard(parityLoadWarnings.value.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity load warnings'
    return
  }
  parityError.value = 'Failed to copy parity load warnings'
}

async function onCopyParityWarningListInline(): Promise<void> {
  if (parityLoadWarnings.value.length === 0) return
  const inline = parityLoadWarnings.value.join(' ; ')
  const copied = await copyTextToClipboard(inline)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity warning list inline'
    return
  }
  parityError.value = 'Failed to copy parity warning list inline'
}

async function onCopyParityWarningCountLine(): Promise<void> {
  const line = `parity_warning_count=${parityLoadWarnings.value.length} parity_warnings_fingerprint=${parityWarningsFingerprint.value}`
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity warning count line'
    return
  }
  parityError.value = 'Failed to copy parity warning count line'
}

async function onCopyParityCompletionLine(): Promise<void> {
  const line = `parity_completion=${parityAppSettingsCompletionState.value} parity_coverage="${parityAppSettingsCoverageSummary.value}" parity_snapshot=${paritySnapshotId.value}`
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity completion line'
    return
  }
  parityError.value = 'Failed to copy parity completion line'
}

async function onCopyParitySurfaceCountsLine(): Promise<void> {
  const line = `apps=${parityApps.value.length} experimental=${parityExperimentalFeatures.value.length} mcp=${parityMcpServers.value.length} pending=${parityPendingRequestSummaries.value.length} warnings=${parityLoadWarnings.value.length}`
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity surface counts line'
    return
  }
  parityError.value = 'Failed to copy parity surface counts line'
}

async function onCopyParityPendingSummaryLine(): Promise<void> {
  const line = `pending_count=${parityPendingRequestSummaries.value.length} pending_summary="${parityPendingRequestMethodSummary.value || '(none)'}"`
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity pending summary line'
    return
  }
  parityError.value = 'Failed to copy parity pending summary line'
}

async function onCopyParityProtocolSummaryLine(): Promise<void> {
  const line = `protocol_methods=${parityMethods.value.length} protocol_notifications=${parityNotifications.value.length}`
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity protocol summary line'
    return
  }
  parityError.value = 'Failed to copy parity protocol summary line'
}

async function onCopyParitySnapshotFingerprintTuple(): Promise<void> {
  const tuple = `${paritySnapshotId.value}|${parityWarningsFingerprint.value}`
  const copied = await copyTextToClipboard(tuple)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity snapshot/fingerprint tuple'
    return
  }
  parityError.value = 'Failed to copy parity snapshot/fingerprint tuple'
}

async function onCopyParityDigestLine(): Promise<void> {
  const line = `${paritySnapshotId.value} completion=${parityAppSettingsCompletionState.value} coverage="${parityAppSettingsCoverageSummary.value}" warnings=${parityLoadWarnings.value.length} wf=${parityWarningsFingerprint.value}`
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity digest line'
    return
  }
  parityError.value = 'Failed to copy parity digest line'
}

async function onCopyParityHealthScoreLine(): Promise<void> {
  const completionBase = parityAppSettingsCompletionState.value === 'complete' ? 100 : 70
  const warningPenalty = Math.min(40, parityLoadWarnings.value.length * 10)
  const score = Math.max(0, completionBase - warningPenalty)
  const line = `parity_health_score=${score} completion=${parityAppSettingsCompletionState.value} warnings=${parityLoadWarnings.value.length}`
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity health score line'
    return
  }
  parityError.value = 'Failed to copy parity health score line'
}

async function onCopyParityRefreshStamp(): Promise<void> {
  const stamp = `parity_stamp snapshot=${paritySnapshotId.value} refresh="${parityLastRefreshLabel.value}"`
  const copied = await copyTextToClipboard(stamp)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity refresh stamp'
    return
  }
  parityError.value = 'Failed to copy parity refresh stamp'
}

async function onCopyParityTimestampLine(): Promise<void> {
  const line = `parity_timestamp=${new Date().toISOString()} parity_refresh="${parityLastRefreshLabel.value}"`
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity timestamp line'
    return
  }
  parityError.value = 'Failed to copy parity timestamp line'
}

async function onCopyParityRefreshEpochLine(): Promise<void> {
  const refreshIso = parityLastRefreshAt.value.trim()
  const epoch = refreshIso ? Date.parse(refreshIso) : Date.now()
  const line = `parity_refresh_epoch_ms=${Number.isFinite(epoch) ? epoch : Date.now()} parity_refresh_iso="${refreshIso || 'never'}"`
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity refresh epoch line'
    return
  }
  parityError.value = 'Failed to copy parity refresh epoch line'
}

async function onCopyParityWarningIdsLine(): Promise<void> {
  if (parityLoadWarnings.value.length === 0) return
  const ids = parityLoadWarnings.value.map((_, index) => `W${index + 1}`).join(',')
  const line = `parity_warning_ids=${ids}`
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity warning IDs line'
    return
  }
  parityError.value = 'Failed to copy parity warning IDs line'
}

async function onCopyParityWarningMapJson(): Promise<void> {
  if (parityLoadWarnings.value.length === 0) return
  const warningMap = Object.fromEntries(
    parityLoadWarnings.value.map((warning, index) => [`W${index + 1}`, warning]),
  )
  const copied = await copyTextToClipboard(JSON.stringify(warningMap, null, 2))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity warning map JSON'
    return
  }
  parityError.value = 'Failed to copy parity warning map JSON'
}

async function onCopyParityWarningMapInline(): Promise<void> {
  if (parityLoadWarnings.value.length === 0) return
  const line = parityLoadWarnings.value
    .map((warning, index) => `W${index + 1}:${warning.replace(/;/g, ',')}`)
    .join('; ')
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity warning map inline'
    return
  }
  parityError.value = 'Failed to copy parity warning map inline'
}

async function onCopyParityWarningCountJson(): Promise<void> {
  const payload = {
    warningCount: parityLoadWarnings.value.length,
    warningsFingerprint: parityWarningsFingerprint.value,
  }
  const copied = await copyTextToClipboard(JSON.stringify(payload, null, 2))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity warning count JSON'
    return
  }
  parityError.value = 'Failed to copy parity warning count JSON'
}

async function onCopyParityLoadWarningsJson(): Promise<void> {
  if (parityLoadWarnings.value.length === 0) return
  const payload = {
    timestamp: new Date().toISOString(),
    snapshotId: paritySnapshotId.value,
    lastRefresh: parityLastRefreshLabel.value,
    warningCount: parityLoadWarnings.value.length,
    warningsFingerprint: parityWarningsFingerprint.value,
    warnings: parityLoadWarnings.value,
  }
  const copied = await copyTextToClipboard(JSON.stringify(payload, null, 2))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity warnings JSON'
    return
  }
  parityError.value = 'Failed to copy parity warnings JSON'
}

async function onCopyParityWarningsFingerprint(): Promise<void> {
  if (parityWarningsFingerprint.value === 'none') return
  const copied = await copyTextToClipboard(parityWarningsFingerprint.value)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity warnings fingerprint'
    return
  }
  parityError.value = 'Failed to copy parity warnings fingerprint'
}

async function onCopyParityCorrelationKey(): Promise<void> {
  if (paritySnapshotId.value === 'parity-snapshot-never') return
  const correlationKey = `${paritySnapshotId.value}::${parityWarningsFingerprint.value}`
  const copied = await copyTextToClipboard(correlationKey)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity correlation key'
    return
  }
  parityError.value = 'Failed to copy parity correlation key'
}

async function onCopyParityDiagnosticsCompactLine(): Promise<void> {
  const line = [
    `snapshot=${paritySnapshotId.value}`,
    `refresh=${parityLastRefreshLabel.value}`,
    `coverage=${parityAppSettingsCoverageSummary.value}`,
    `completion=${parityAppSettingsCompletionState.value}`,
    `warnings=${parityLoadWarnings.value.length}`,
    `wf=${parityWarningsFingerprint.value}`,
    `apps=${parityApps.value.length}`,
    `exp=${parityExperimentalFeatures.value.length}`,
    `mcp=${parityMcpServers.value.length}`,
    `pending=${parityPendingRequestSummaries.value.length}`,
  ].join(' | ')
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics compact line'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics compact line'
}

async function onCopyParityDiagnosticsNdjson(): Promise<void> {
  const payload = {
    t: new Date().toISOString(),
    snapshotId: paritySnapshotId.value,
    refresh: parityLastRefreshLabel.value,
    coverage: parityAppSettingsCoverageSummary.value,
    completion: parityAppSettingsCompletionState.value,
    warningCount: parityLoadWarnings.value.length,
    warningsFingerprint: parityWarningsFingerprint.value,
    apps: parityApps.value.length,
    experimentalFeatures: parityExperimentalFeatures.value.length,
    mcpServers: parityMcpServers.value.length,
    pendingRequests: parityPendingRequestSummaries.value.length,
  }
  const copied = await copyTextToClipboard(JSON.stringify(payload))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics NDJSON'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics NDJSON'
}

async function onCopyParityDiagnosticsEnvBlock(): Promise<void> {
  const lines = [
    `PARITY_SNAPSHOT_ID=${paritySnapshotId.value}`,
    `PARITY_REFRESH_LABEL=${parityLastRefreshLabel.value.replace(/\s+/g, '_')}`,
    `PARITY_COVERAGE=${parityAppSettingsCoverageSummary.value.replace(/\s+/g, '_')}`,
    `PARITY_COMPLETION=${parityAppSettingsCompletionState.value}`,
    `PARITY_WARNING_COUNT=${parityLoadWarnings.value.length}`,
    `PARITY_WARNINGS_FINGERPRINT=${parityWarningsFingerprint.value}`,
    `PARITY_APPS_COUNT=${parityApps.value.length}`,
    `PARITY_EXPERIMENTAL_COUNT=${parityExperimentalFeatures.value.length}`,
    `PARITY_MCP_COUNT=${parityMcpServers.value.length}`,
    `PARITY_PENDING_COUNT=${parityPendingRequestSummaries.value.length}`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics env block'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics env block'
}

async function onCopyParityDiagnosticsYaml(): Promise<void> {
  const lines = [
    `snapshotId: "${paritySnapshotId.value}"`,
    `refresh: "${parityLastRefreshLabel.value}"`,
    'surface:',
    `  apps: ${parityApps.value.length}`,
    `  experimentalFeatures: ${parityExperimentalFeatures.value.length}`,
    `  mcpServers: ${parityMcpServers.value.length}`,
    `  pendingRequests: ${parityPendingRequestSummaries.value.length}`,
    'coverage:',
    `  summary: "${parityAppSettingsCoverageSummary.value}"`,
    `  completion: "${parityAppSettingsCompletionState.value}"`,
    `warningsFingerprint: "${parityWarningsFingerprint.value}"`,
    `warningCount: ${parityLoadWarnings.value.length}`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics YAML'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics YAML'
}

async function onCopyParityDiagnosticsIni(): Promise<void> {
  const lines = [
    '[parity]',
    `snapshot_id=${paritySnapshotId.value}`,
    `refresh=${parityLastRefreshLabel.value}`,
    `coverage=${parityAppSettingsCoverageSummary.value}`,
    `completion=${parityAppSettingsCompletionState.value}`,
    `warning_count=${parityLoadWarnings.value.length}`,
    `warnings_fingerprint=${parityWarningsFingerprint.value}`,
    '',
    '[surface]',
    `apps=${parityApps.value.length}`,
    `experimental_features=${parityExperimentalFeatures.value.length}`,
    `mcp_servers=${parityMcpServers.value.length}`,
    `pending_requests=${parityPendingRequestSummaries.value.length}`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics INI'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics INI'
}

async function onCopyParityDiagnosticsXml(): Promise<void> {
  const xmlEscape = (value: string): string => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
  const lines = [
    '<parityDiagnostics>',
    `  <snapshotId>${xmlEscape(paritySnapshotId.value)}</snapshotId>`,
    `  <refresh>${xmlEscape(parityLastRefreshLabel.value)}</refresh>`,
    `  <coverage>${xmlEscape(parityAppSettingsCoverageSummary.value)}</coverage>`,
    `  <completion>${xmlEscape(parityAppSettingsCompletionState.value)}</completion>`,
    `  <warningCount>${parityLoadWarnings.value.length}</warningCount>`,
    `  <warningsFingerprint>${xmlEscape(parityWarningsFingerprint.value)}</warningsFingerprint>`,
    '  <surface>',
    `    <apps>${parityApps.value.length}</apps>`,
    `    <experimentalFeatures>${parityExperimentalFeatures.value.length}</experimentalFeatures>`,
    `    <mcpServers>${parityMcpServers.value.length}</mcpServers>`,
    `    <pendingRequests>${parityPendingRequestSummaries.value.length}</pendingRequests>`,
    '  </surface>',
    '</parityDiagnostics>',
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics XML'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics XML'
}

async function onCopyParityDiagnosticsHtml(): Promise<void> {
  const htmlEscape = (value: string): string => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
  const warningsHtml = parityLoadWarnings.value.length > 0
    ? parityLoadWarnings.value.map((warning) => `<li>${htmlEscape(warning)}</li>`).join('')
    : '<li>(none)</li>'
  const html = [
    '<section class="parity-diagnostics">',
    '  <h2>Parity Diagnostics</h2>',
    `  <p><strong>Snapshot:</strong> ${htmlEscape(paritySnapshotId.value)}</p>`,
    `  <p><strong>Refresh:</strong> ${htmlEscape(parityLastRefreshLabel.value)}</p>`,
    `  <p><strong>Coverage:</strong> ${htmlEscape(parityAppSettingsCoverageSummary.value)} (${htmlEscape(parityAppSettingsCompletionState.value)})</p>`,
    `  <p><strong>Warnings Fingerprint:</strong> ${htmlEscape(parityWarningsFingerprint.value)}</p>`,
    '  <ul>',
    warningsHtml,
    '  </ul>',
    '  <dl>',
    `    <dt>Apps</dt><dd>${parityApps.value.length}</dd>`,
    `    <dt>Experimental Features</dt><dd>${parityExperimentalFeatures.value.length}</dd>`,
    `    <dt>MCP Servers</dt><dd>${parityMcpServers.value.length}</dd>`,
    `    <dt>Pending Requests</dt><dd>${parityPendingRequestSummaries.value.length}</dd>`,
    '  </dl>',
    '</section>',
  ].join('\n')
  const copied = await copyTextToClipboard(html)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics HTML'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics HTML'
}

async function onCopyParityDiagnosticsPlainReport(): Promise<void> {
  const lines = [
    'PARITY DIAGNOSTICS REPORT',
    `snapshot: ${paritySnapshotId.value}`,
    `refresh: ${parityLastRefreshLabel.value}`,
    `coverage: ${parityAppSettingsCoverageSummary.value}`,
    `completion: ${parityAppSettingsCompletionState.value}`,
    `warnings: ${parityLoadWarnings.value.length} (${parityWarningsFingerprint.value})`,
    `surface: apps=${parityApps.value.length}, experimental=${parityExperimentalFeatures.value.length}, mcp=${parityMcpServers.value.length}, pending=${parityPendingRequestSummaries.value.length}`,
    'warning list:',
    ...(parityLoadWarnings.value.length > 0 ? parityLoadWarnings.value.map((warning, idx) => `${idx + 1}. ${warning}`) : ['(none)']),
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics plain report'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics plain report'
}

async function onCopyParityDiagnosticsChecklist(): Promise<void> {
  const checks = [
    `- [${paritySnapshotId.value === 'parity-snapshot-never' ? ' ' : 'x'}] Snapshot captured`,
    `- [${parityAppSettingsCompletionState.value === 'complete' ? 'x' : ' '}] Coverage complete`,
    `- [${parityLoadWarnings.value.length === 0 ? 'x' : ' '}] No load warnings`,
    `- [${parityMethods.value.length > 0 || parityNotifications.value.length > 0 ? 'x' : ' '}] Protocol catalog loaded`,
    `- [${parityPendingRequestSummaries.value.length > 0 ? 'x' : ' '}] Pending requests present`,
    `- [${parityMcpServers.value.length > 0 ? 'x' : ' '}] MCP servers visible`,
  ]
  const payload = [
    '# Parity Diagnostics Checklist',
    `- Snapshot: ${paritySnapshotId.value}`,
    `- Refresh: ${parityLastRefreshLabel.value}`,
    `- Warnings fingerprint: ${parityWarningsFingerprint.value}`,
    '',
    ...checks,
  ].join('\n')
  const copied = await copyTextToClipboard(payload)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics checklist'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics checklist'
}

async function onCopyParityDiagnosticsMinimalJson(): Promise<void> {
  const payload = {
    t: new Date().toISOString(),
    snapshotId: paritySnapshotId.value,
    wf: parityWarningsFingerprint.value,
    c: parityAppSettingsCoverageSummary.value,
    ok: parityAppSettingsCompletionState.value === 'complete',
    w: parityLoadWarnings.value.length,
  }
  const copied = await copyTextToClipboard(JSON.stringify(payload))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics minimal JSON'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics minimal JSON'
}

async function onCopyParityDiagnosticsQueryString(): Promise<void> {
  const params = new URLSearchParams({
    snapshot: paritySnapshotId.value,
    refresh: parityLastRefreshLabel.value,
    coverage: parityAppSettingsCoverageSummary.value,
    completion: parityAppSettingsCompletionState.value,
    warnings: String(parityLoadWarnings.value.length),
    wf: parityWarningsFingerprint.value,
    apps: String(parityApps.value.length),
    exp: String(parityExperimentalFeatures.value.length),
    mcp: String(parityMcpServers.value.length),
    pending: String(parityPendingRequestSummaries.value.length),
  })
  const copied = await copyTextToClipboard(params.toString())
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics query string'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics query string'
}

async function onCopyParityDiagnosticsTableRow(): Promise<void> {
  const row = [
    paritySnapshotId.value,
    parityLastRefreshLabel.value,
    parityAppSettingsCoverageSummary.value,
    parityAppSettingsCompletionState.value,
    String(parityLoadWarnings.value.length),
    parityWarningsFingerprint.value,
    String(parityApps.value.length),
    String(parityExperimentalFeatures.value.length),
    String(parityMcpServers.value.length),
    String(parityPendingRequestSummaries.value.length),
  ]
    .map((cell) => cell.replace(/\|/g, '/'))
    .join(' | ')
  const copied = await copyTextToClipboard(row)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics table row'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics table row'
}

async function onCopyParityDiagnosticsMarkdownTable(): Promise<void> {
  const cells = [
    paritySnapshotId.value,
    parityLastRefreshLabel.value,
    parityAppSettingsCoverageSummary.value,
    parityAppSettingsCompletionState.value,
    String(parityLoadWarnings.value.length),
    parityWarningsFingerprint.value,
    String(parityApps.value.length),
    String(parityExperimentalFeatures.value.length),
    String(parityMcpServers.value.length),
    String(parityPendingRequestSummaries.value.length),
  ].map((cell) => cell.replace(/\|/g, '/'))
  const header = '| Snapshot | Refresh | Coverage | Completion | Warnings | Fingerprint | Apps | Experimental | MCP | Pending |'
  const divider = '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
  const row = `| ${cells.join(' | ')} |`
  const copied = await copyTextToClipboard([header, divider, row].join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics markdown table'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics markdown table'
}

async function onCopyParityDiagnosticsBadge(): Promise<void> {
  const badgeState = parityAppSettingsCompletionState.value === 'complete' && parityLoadWarnings.value.length === 0
    ? 'green'
    : 'yellow'
  const badge = `parity:${badgeState} snapshot=${paritySnapshotId.value} coverage="${parityAppSettingsCoverageSummary.value}" wf=${parityWarningsFingerprint.value}`
  const copied = await copyTextToClipboard(badge)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics badge'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics badge'
}

async function onCopyParityDiagnosticsCliArgs(): Promise<void> {
  const args = [
    `--parity-snapshot=${paritySnapshotId.value}`,
    `--parity-refresh=${parityLastRefreshLabel.value.replace(/\s+/g, '_')}`,
    `--parity-coverage=${parityAppSettingsCoverageSummary.value.replace(/\s+/g, '_')}`,
    `--parity-completion=${parityAppSettingsCompletionState.value}`,
    `--parity-warning-count=${parityLoadWarnings.value.length}`,
    `--parity-warnings-fingerprint=${parityWarningsFingerprint.value}`,
    `--parity-apps=${parityApps.value.length}`,
    `--parity-experimental=${parityExperimentalFeatures.value.length}`,
    `--parity-mcp=${parityMcpServers.value.length}`,
    `--parity-pending=${parityPendingRequestSummaries.value.length}`,
  ]
  const copied = await copyTextToClipboard(args.join(' '))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics CLI args'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics CLI args'
}

async function onCopyParityDiagnosticsShellExport(): Promise<void> {
  const lines = [
    `export PARITY_SNAPSHOT_ID="${paritySnapshotId.value}"`,
    `export PARITY_REFRESH_LABEL="${parityLastRefreshLabel.value.replace(/"/g, '\\"')}"`,
    `export PARITY_COVERAGE="${parityAppSettingsCoverageSummary.value}"`,
    `export PARITY_COMPLETION="${parityAppSettingsCompletionState.value}"`,
    `export PARITY_WARNING_COUNT="${parityLoadWarnings.value.length}"`,
    `export PARITY_WARNINGS_FINGERPRINT="${parityWarningsFingerprint.value}"`,
    `export PARITY_APPS_COUNT="${parityApps.value.length}"`,
    `export PARITY_EXPERIMENTAL_COUNT="${parityExperimentalFeatures.value.length}"`,
    `export PARITY_MCP_COUNT="${parityMcpServers.value.length}"`,
    `export PARITY_PENDING_COUNT="${parityPendingRequestSummaries.value.length}"`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics shell export'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics shell export'
}

async function onCopyParityDiagnosticsProperties(): Promise<void> {
  const lines = [
    `parity.snapshotId=${paritySnapshotId.value}`,
    `parity.refresh=${parityLastRefreshLabel.value.replace(/\s+/g, '_')}`,
    `parity.coverage=${parityAppSettingsCoverageSummary.value.replace(/\s+/g, '_')}`,
    `parity.completion=${parityAppSettingsCompletionState.value}`,
    `parity.warningCount=${parityLoadWarnings.value.length}`,
    `parity.warningsFingerprint=${parityWarningsFingerprint.value}`,
    `parity.surface.apps=${parityApps.value.length}`,
    `parity.surface.experimental=${parityExperimentalFeatures.value.length}`,
    `parity.surface.mcp=${parityMcpServers.value.length}`,
    `parity.surface.pending=${parityPendingRequestSummaries.value.length}`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics .properties'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics .properties'
}

async function onCopyParityDiagnosticsMarkdownBullets(): Promise<void> {
  const lines = [
    `- snapshot: ${paritySnapshotId.value}`,
    `- refresh: ${parityLastRefreshLabel.value}`,
    `- coverage: ${parityAppSettingsCoverageSummary.value} (${parityAppSettingsCompletionState.value})`,
    `- warnings: ${parityLoadWarnings.value.length} (${parityWarningsFingerprint.value})`,
    `- surface: apps=${parityApps.value.length}, experimental=${parityExperimentalFeatures.value.length}, mcp=${parityMcpServers.value.length}, pending=${parityPendingRequestSummaries.value.length}`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics markdown bullets'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics markdown bullets'
}

async function onCopyParityDiagnosticsCsvBlock(): Promise<void> {
  const escapeCsv = (value: string): string => `"${value.replace(/"/g, '""')}"`
  const header = [
    'snapshot',
    'refresh',
    'coverage',
    'completion',
    'warning_count',
    'warnings_fingerprint',
    'apps',
    'experimental',
    'mcp',
    'pending',
  ].join(',')
  const row = [
    escapeCsv(paritySnapshotId.value),
    escapeCsv(parityLastRefreshLabel.value),
    escapeCsv(parityAppSettingsCoverageSummary.value),
    escapeCsv(parityAppSettingsCompletionState.value),
    String(parityLoadWarnings.value.length),
    escapeCsv(parityWarningsFingerprint.value),
    String(parityApps.value.length),
    String(parityExperimentalFeatures.value.length),
    String(parityMcpServers.value.length),
    String(parityPendingRequestSummaries.value.length),
  ].join(',')
  const copied = await copyTextToClipboard(`${header}\n${row}`)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics CSV block'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics CSV block'
}

async function onCopyParityDiagnosticsKeyValueBlock(): Promise<void> {
  const entries: Array<[string, string]> = [
    ['parity.apps', String(parityApps.value.length)],
    ['parity.completion', parityAppSettingsCompletionState.value],
    ['parity.coverage', parityAppSettingsCoverageSummary.value],
    ['parity.experimental', String(parityExperimentalFeatures.value.length)],
    ['parity.mcp', String(parityMcpServers.value.length)],
    ['parity.pending', String(parityPendingRequestSummaries.value.length)],
    ['parity.refresh', parityLastRefreshLabel.value],
    ['parity.snapshot', paritySnapshotId.value],
    ['parity.warning_count', String(parityLoadWarnings.value.length)],
    ['parity.warning_fingerprint', parityWarningsFingerprint.value],
  ]
  entries.sort((a, b) => a[0].localeCompare(b[0]))
  const block = entries.map(([key, value]) => `${key}=${value}`).join('\n')
  const copied = await copyTextToClipboard(block)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics key-value block'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics key-value block'
}

async function onCopyParityDiagnosticsJsonArrayItem(): Promise<void> {
  const payload = {
    snapshotId: paritySnapshotId.value,
    refresh: parityLastRefreshLabel.value,
    coverage: parityAppSettingsCoverageSummary.value,
    completion: parityAppSettingsCompletionState.value,
    warningCount: parityLoadWarnings.value.length,
    warningsFingerprint: parityWarningsFingerprint.value,
    apps: parityApps.value.length,
    experimental: parityExperimentalFeatures.value.length,
    mcp: parityMcpServers.value.length,
    pending: parityPendingRequestSummaries.value.length,
  }
  const copied = await copyTextToClipboard(`${JSON.stringify(payload)},`)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics JSON array item'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics JSON array item'
}

async function onCopyParityDiagnosticsStatusSentence(): Promise<void> {
  const sentence = `Parity snapshot ${paritySnapshotId.value} refreshed at ${parityLastRefreshLabel.value} is ${parityAppSettingsCompletionState.value} with coverage ${parityAppSettingsCoverageSummary.value}, warnings ${parityLoadWarnings.value.length}, fingerprint ${parityWarningsFingerprint.value}, and surface counts apps ${parityApps.value.length}, experimental ${parityExperimentalFeatures.value.length}, MCP ${parityMcpServers.value.length}, pending ${parityPendingRequestSummaries.value.length}.`
  const copied = await copyTextToClipboard(sentence)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics status sentence'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics status sentence'
}

async function onCopyParityRefreshLatencyLine(): Promise<void> {
  if (parityLastRefreshDurationMs.value === null) return
  const seconds = (parityLastRefreshDurationMs.value / 1000).toFixed(3)
  const line = `parity_refresh_latency_ms=${parityLastRefreshDurationMs.value} parity_refresh_latency_s=${seconds}`
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity refresh latency line'
    return
  }
  parityError.value = 'Failed to copy parity refresh latency line'
}

async function onCopyParityDiagnosticsJson(): Promise<void> {
  const payload = {
    timestamp: new Date().toISOString(),
    snapshotId: paritySnapshotId.value,
    refresh: {
      lastRefreshAt: parityLastRefreshAt.value,
      lastRefreshDurationMs: parityLastRefreshDurationMs.value,
    },
    surface: {
      apps: parityApps.value.length,
      experimentalFeatures: parityExperimentalFeatures.value.length,
      mcpServers: parityMcpServers.value.length,
      archivedThreads: parityArchivedThreads.value.length,
    },
    warnings: parityLoadWarnings.value,
    warningsFingerprint: parityWarningsFingerprint.value,
    protocol: {
      methods: parityMethods.value.length,
      notifications: parityNotifications.value.length,
    },
    pendingRequests: {
      count: parityPendingRequestSummaries.value.length,
      methodSummary: parityPendingRequestMethodSummary.value,
    },
    coverage: {
      summary: parityAppSettingsCoverageSummary.value,
      completion: parityAppSettingsCompletionState.value,
      missing: parityAppSettingsMissingCategories.value,
    },
  }
  const copied = await copyTextToClipboard(JSON.stringify(payload, null, 2))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied full parity diagnostics JSON'
    return
  }
  parityError.value = 'Failed to copy full parity diagnostics JSON'
}

async function onCopyParityDiagnosticsMarkdown(): Promise<void> {
  const lines = [
    '# Parity Diagnostics',
    '',
    `- Snapshot ID: ${paritySnapshotId.value}`,
    `- Refreshed: ${parityLastRefreshLabel.value}`,
    `- Surface: ${paritySurfaceSummary.value}`,
    `- Coverage: ${parityAppSettingsCoverageSummary.value}`,
    `- Completion: ${parityAppSettingsCompletionState.value}`,
    `- Warnings fingerprint: ${parityWarningsFingerprint.value}`,
    '',
    '## Warnings',
    ...(parityLoadWarnings.value.length > 0
      ? parityLoadWarnings.value.map((warning) => `- ${warning}`)
      : ['- (none)']),
    '',
    '## Protocol',
    `- methods: ${parityMethods.value.length}`,
    `- notifications: ${parityNotifications.value.length}`,
    '',
    '## Pending Requests',
    `- count: ${parityPendingRequestSummaries.value.length}`,
    `- summary: ${parityPendingRequestMethodSummary.value || '(none)'}`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics markdown'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics markdown'
}

async function onCopyParityDiagnosticsTsv(): Promise<void> {
  const rows = [
    ['field', 'value'],
    ['snapshot_id', paritySnapshotId.value],
    ['last_refresh', parityLastRefreshLabel.value],
    ['surface', paritySurfaceSummary.value],
    ['coverage', parityAppSettingsCoverageSummary.value],
    ['completion', parityAppSettingsCompletionState.value],
    ['warning_count', String(parityLoadWarnings.value.length)],
    ['warnings_fingerprint', parityWarningsFingerprint.value],
    ['protocol_methods', String(parityMethods.value.length)],
    ['protocol_notifications', String(parityNotifications.value.length)],
    ['pending_count', String(parityPendingRequestSummaries.value.length)],
    ['pending_summary', parityPendingRequestMethodSummary.value || '(none)'],
  ]
  const tsv = rows.map((row) => row.map((cell) => cell.replace(/\t/g, ' ')).join('\t')).join('\n')
  const copied = await copyTextToClipboard(tsv)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity diagnostics TSV'
    return
  }
  parityError.value = 'Failed to copy parity diagnostics TSV'
}

async function onCopyParityLoadWarningsSummary(): Promise<void> {
  if (parityLoadWarnings.value.length === 0) return
  const summary = `warnings=${parityLoadWarnings.value.length} · first=${parityLoadWarnings.value[0] || '(none)'}`
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity warnings summary'
    return
  }
  parityError.value = 'Failed to copy parity warnings summary'
}

function onClearParityLoadWarnings(): void {
  parityLoadWarnings.value = []
}

async function onCopyParityConfigRequirementsJson(): Promise<void> {
  if (!parityConfigRequirements.value) return
  const payload = JSON.stringify(parityConfigRequirements.value, null, 2)
  const copied = await copyTextToClipboard(payload)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied config requirements JSON'
    return
  }
  parityError.value = 'Failed to copy config requirements JSON'
}

async function onCopyParityAppSettingsCategories(): Promise<void> {
  const summary = parityAppSettingsCategorySummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied settings categories'
    return
  }
  parityError.value = 'Failed to copy settings categories'
}

async function onCopyParityAppSettingsAppGroup(): Promise<void> {
  const summary = parityAppSettingsAppGroupSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied app settings group'
    return
  }
  parityError.value = 'Failed to copy app settings group'
}

async function onCopyParityAppSettingsConnectionGroup(): Promise<void> {
  const summary = parityAppSettingsConnectionGroupSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied connection settings group'
    return
  }
  parityError.value = 'Failed to copy connection settings group'
}

async function onCopyParityAppSettingsSupportedCategories(): Promise<void> {
  const summary = parityAppSettingsSupportedSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied supported settings categories'
    return
  }
  parityError.value = 'Failed to copy supported settings categories'
}

async function onCopyParityAppSettingsMissingCategories(): Promise<void> {
  const summary = parityAppSettingsMissingSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied missing settings categories'
    return
  }
  parityError.value = 'Failed to copy missing settings categories'
}

async function onCopyParityAppSettingsCoverageSummary(): Promise<void> {
  const summary = parityAppSettingsCoverageSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied settings coverage summary'
    return
  }
  parityError.value = 'Failed to copy settings coverage summary'
}

async function onCopyParityAppSettingsCompletionState(): Promise<void> {
  const summary = parityAppSettingsCompletionState.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied settings completion state'
    return
  }
  parityError.value = 'Failed to copy settings completion state'
}

async function onCopyParitySettingsSnapshotJson(): Promise<void> {
  const snapshot = {
    categories: {
      total: parityAppSettingsCategories.length,
      supported: parityAppSettingsSupportedCategories.value,
      missing: parityAppSettingsMissingCategories.value,
      coverage: parityAppSettingsCoverageSummary.value,
      completion: parityAppSettingsCompletionState.value,
    },
    personalization: {
      tone: parityPersonalizationToneDraft.value,
      avatar: parityPersonalizationAvatarDraft.value,
      memory: parityPersonalizationMemoryDraft.value,
    },
    usage: {
      autoTopUp: parityUsageAutoTopUpDraft.value,
      budgetUsd: parityUsageBudgetDraft.value.trim() || '0',
    },
    appearance: {
      theme: parityAppearanceThemeDraft.value,
      density: parityAppearanceDensityDraft.value,
    },
    dataControls: {
      telemetry: parityDataControlsTelemetryDraft.value,
      training: parityDataControlsTrainingDraft.value,
    },
    computerUse: {
      mode: parityComputerUseModeDraft.value,
      vision: parityComputerUseVisionDraft.value,
    },
    general: {
      notifications: parityGeneralNotificationsDraft.value,
      menuBar: parityGeneralMenuBarDraft.value,
    },
    localEnvironments: {
      name: parityLocalEnvironmentNameDraft.value.trim() || 'local-default',
      shell: parityLocalEnvironmentShellDraft.value,
    },
    plugins: {
      enabled: parityPluginsEnabledDraft.value,
      source: parityPluginsSourceDraft.value.trim() || 'marketplace',
    },
    connections: {
      host: parityConnectionsHostDraft.value.trim() || 'localhost',
      status: parityConnectionsStatusDraft.value,
      auth: parityConnectionsAuthDraft.value,
    },
    environments: {
      name: parityEnvironmentNameDraft.value.trim() || 'default',
      type: parityEnvironmentTypeDraft.value,
    },
    worktrees: {
      autoCleanup: parityWorktreesAutoCleanupDraft.value,
      repository: parityWorktreesRepositoryDraft.value.trim() || '',
    },
    git: {
      defaultBranch: parityGitDefaultBranchDraft.value.trim() || 'main',
      autoFetch: parityGitAutoFetchDraft.value,
    },
  }
  const copied = await copyTextToClipboard(JSON.stringify(snapshot, null, 2))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied settings snapshot JSON'
    return
  }
  parityError.value = 'Failed to copy settings snapshot JSON'
}

async function onCopyParityMissingFeaturesReport(): Promise<void> {
  const missing = parityAppSettingsMissingCategories.value
  const reportLines = [
    '# Codex Settings Parity Report',
    '',
    `- Coverage: ${parityAppSettingsCoverageSummary.value}`,
    `- Completion: ${parityAppSettingsCompletionState.value}`,
    `- Total categories: ${parityAppSettingsCategories.length}`,
    `- Supported categories: ${parityAppSettingsSupportedCategories.value.length}`,
    `- Missing categories: ${missing.length}`,
    '',
    '## Missing Categories',
    ...(missing.length > 0 ? missing.map((name) => `- ${name}`) : ['- (none)']),
  ]
  const copied = await copyTextToClipboard(reportLines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied missing-features report'
    return
  }
  parityError.value = 'Failed to copy missing-features report'
}

async function onCopyParityChangelogEntry(): Promise<void> {
  const date = new Date().toISOString().slice(0, 10)
  const missing = parityAppSettingsMissingCategories.value
  const lines = [
    `## Parity Update (${date})`,
    '',
    `- Coverage: ${parityAppSettingsCoverageSummary.value}`,
    `- Completion: ${parityAppSettingsCompletionState.value}`,
    `- Missing categories: ${missing.length === 0 ? '(none)' : missing.join(', ')}`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity changelog entry'
    return
  }
  parityError.value = 'Failed to copy parity changelog entry'
}

async function onCopyParityChecklist(): Promise<void> {
  const supportedSet = new Set(parityAppSettingsSupportedCategories.value)
  const lines = [
    '# Codex Settings Parity Checklist',
    '',
    `- Coverage: ${parityAppSettingsCoverageSummary.value}`,
    `- Completion: ${parityAppSettingsCompletionState.value}`,
    '',
    '## Categories',
    ...parityAppSettingsCategories.map((name) => `- [${supportedSet.has(name) ? 'x' : ' '}] ${name}`),
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity checklist'
    return
  }
  parityError.value = 'Failed to copy parity checklist'
}


async function onCopyParityMetricsLine(): Promise<void> {
  const date = new Date().toISOString().slice(0, 10)
  const line = `parity ${date} coverage=${parityAppSettingsCoverageSummary.value} completion=${parityAppSettingsCompletionState.value} missing=${parityAppSettingsMissingCategories.value.length}`
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity metrics line'
    return
  }
  parityError.value = 'Failed to copy parity metrics line'
}



async function onCopyParityBadgeText(): Promise<void> {
  const badge = `parity:${parityAppSettingsCompletionState.value} (${parityAppSettingsCoverageSummary.value})`
  const copied = await copyTextToClipboard(badge)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity badge text'
    return
  }
  parityError.value = 'Failed to copy parity badge text'
}



async function onCopyParityReleaseNoteBlock(): Promise<void> {
  const lines = [
    '### Codex App Parity',
    `- Coverage: ${parityAppSettingsCoverageSummary.value}`,
    `- Completion: ${parityAppSettingsCompletionState.value}`,
    `- Missing categories: ${parityAppSettingsMissingCategories.value.length}`,
    `- Snapshot: ${new Date().toISOString().slice(0, 10)}`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity release-note block'
    return
  }
  parityError.value = 'Failed to copy parity release-note block'
}



async function onCopyParityHandoffPacket(): Promise<void> {
  const missing = parityAppSettingsMissingCategories.value
  const checklist = parityAppSettingsCategories.map((name) => `- [${parityAppSettingsSupportedCategories.value.includes(name) ? 'x' : ' '}] ${name}`)
  const packet = [
    '# Parity Handoff Packet',
    '',
    `Coverage: ${parityAppSettingsCoverageSummary.value}`,
    `Completion: ${parityAppSettingsCompletionState.value}`,
    `Missing: ${missing.length === 0 ? '(none)' : missing.join(', ')}`,
    '',
    '## Checklist',
    ...checklist,
    '',
    '## Release Note',
    `### Codex App Parity`,
    `- Coverage: ${parityAppSettingsCoverageSummary.value}`,
    `- Completion: ${parityAppSettingsCompletionState.value}`,
    `- Missing categories: ${missing.length}`,
    `- Snapshot: ${new Date().toISOString().slice(0, 10)}`,
  ].join('\n')
  const copied = await copyTextToClipboard(packet)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity handoff packet'
    return
  }
  parityError.value = 'Failed to copy parity handoff packet'
}



function onRunParitySelfCheck(): void {
  const missingCount = parityAppSettingsMissingCategories.value.length
  const completion = parityAppSettingsCompletionState.value
  const status = missingCount === 0 && completion === 'complete' ? 'PASS' : 'FAIL'
  paritySelfCheckStatus.value = status
  paritySelfCheckLastRun.value = new Date().toISOString()
  parityError.value = status === 'PASS' ? '' : `Parity self-check failed: missing=${missingCount}, completion=${completion}`
  parityThreadActionResult.value = `Parity self-check ${status} · coverage=${parityAppSettingsCoverageSummary.value}`
}

async function onCopyParitySelfCheckResult(): Promise<void> {
  const missingCount = parityAppSettingsMissingCategories.value.length
  const completion = parityAppSettingsCompletionState.value
  const status = missingCount === 0 && completion === 'complete' ? 'PASS' : 'FAIL'
  const line = `Parity self-check ${status} · coverage=${parityAppSettingsCoverageSummary.value} · missing=${missingCount}`
  const copied = await copyTextToClipboard(line)
  if (copied) {
    paritySelfCheckStatus.value = status
    paritySelfCheckLastRun.value = new Date().toISOString()
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity self-check result'
    return
  }
  parityError.value = 'Failed to copy parity self-check result'
}



async function onCopyParityVerificationStamp(): Promise<void> {
  const iso = new Date().toISOString()
  const stamp = `parity-verified ${iso} coverage=${parityAppSettingsCoverageSummary.value} completion=${parityAppSettingsCompletionState.value}`
  const copied = await copyTextToClipboard(stamp)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity verification stamp'
    return
  }
  parityError.value = 'Failed to copy parity verification stamp'
}



async function onCopyParityJsonLine(): Promise<void> {
  const payload = {
    t: new Date().toISOString(),
    coverage: parityAppSettingsCoverageSummary.value,
    completion: parityAppSettingsCompletionState.value,
    missing: parityAppSettingsMissingCategories.value.length,
  }
  const copied = await copyTextToClipboard(JSON.stringify(payload))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity JSON line'
    return
  }
  parityError.value = 'Failed to copy parity JSON line'
}



function onResetAllParitySettingsDrafts(): void {
  onResetParityPersonalizationDrafts()
  onResetParityUsageDrafts()
  onResetParityAppearanceDrafts()
  onResetParityDataControlsDrafts()
  onResetParityComputerUseDrafts()
  onResetParityGeneralSettingsDrafts()
  onResetParityLocalEnvironmentDrafts()
  onResetParityPluginsDrafts()
  onResetParityConnectionsDrafts()
  onResetParityEnvironmentDrafts()
  onResetParityWorktreesDrafts()
  onResetParityGitSettingsDrafts()
  syncTopLevelGeneralSettingsFromDrafts()
  parityAppSettingsFocusCategoryDraft.value = ''
}

async function onSaveParitySettingsDrafts(): Promise<void> {
  if (isSavingParitySettingsDrafts.value) return
  isSavingParitySettingsDrafts.value = true
  parityError.value = ''
  try {
    await writeConfigBatch([
      { keyPath: 'parity_drafts.personalization', value: parityPersonalizationSummary.value, mergeStrategy: 'upsert' },
      { keyPath: 'parity_drafts.usage', value: parityUsageSummary.value, mergeStrategy: 'upsert' },
      { keyPath: 'parity_drafts.appearance', value: parityAppearanceSummary.value, mergeStrategy: 'upsert' },
      { keyPath: 'parity_drafts.data_controls', value: parityDataControlsSummary.value, mergeStrategy: 'upsert' },
      { keyPath: 'parity_drafts.computer_use', value: parityComputerUseSummary.value, mergeStrategy: 'upsert' },
      { keyPath: 'parity_drafts.general_settings', value: parityGeneralSettingsSummary.value, mergeStrategy: 'upsert' },
      { keyPath: 'parity_drafts.local_environments', value: parityLocalEnvironmentSummary.value, mergeStrategy: 'upsert' },
      { keyPath: 'parity_drafts.plugins_settings', value: parityPluginsSummary.value, mergeStrategy: 'upsert' },
      { keyPath: 'parity_drafts.connections', value: parityConnectionsSummary.value, mergeStrategy: 'upsert' },
      { keyPath: 'parity_drafts.environments', value: parityEnvironmentSummary.value, mergeStrategy: 'upsert' },
      { keyPath: 'parity_drafts.worktrees', value: parityWorktreesSummary.value, mergeStrategy: 'upsert' },
      { keyPath: 'parity_drafts.git_settings', value: parityGitSettingsSummary.value, mergeStrategy: 'upsert' },
    ])
    parityConfigRead.value = await readConfigSummary()
    parityConfigWriteResult.value = 'Saved parity drafts snapshot via config/batchWrite'
    parityThreadActionResult.value = 'Saved parity drafts snapshot'
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to save parity drafts snapshot'
  } finally {
    isSavingParitySettingsDrafts.value = false
  }
}

async function onApplyAllParitySettings(): Promise<void> {
  if (isApplyingAllParitySettings.value) return
  isApplyingAllParitySettings.value = true
  parityError.value = ''
  try {
    const usageBudget = parityUsageBudgetDraft.value.trim() || '0'
    const localEnvironmentName = parityLocalEnvironmentNameDraft.value.trim() || 'local-default'
    const pluginsSource = parityPluginsSourceDraft.value.trim() || 'marketplace'
    const connectionsHost = parityConnectionsHostDraft.value.trim() || 'localhost'
    const environmentName = parityEnvironmentNameDraft.value.trim() || 'default'
    const worktreesRepository = parityWorktreesRepositoryDraft.value.trim()
    const gitDefaultBranch = parityGitDefaultBranchDraft.value.trim() || 'main'
    await writeConfigBatch([
      { keyPath: 'personalization.tone', value: parityPersonalizationToneDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'personalization.avatar', value: parityPersonalizationAvatarDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'personalization.memory', value: parityPersonalizationMemoryDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'usage.auto_top_up', value: parityUsageAutoTopUpDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'usage.monthly_budget_usd', value: usageBudget, mergeStrategy: 'upsert' },
      { keyPath: 'appearance.theme', value: parityAppearanceThemeDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'appearance.density', value: parityAppearanceDensityDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'data_controls.telemetry', value: parityDataControlsTelemetryDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'data_controls.training', value: parityDataControlsTrainingDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'computer_use.mode', value: parityComputerUseModeDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'computer_use.vision', value: parityComputerUseVisionDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'general_settings.notifications', value: parityGeneralNotificationsDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'general_settings.menu_bar', value: parityGeneralMenuBarDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'local_environments.default.name', value: localEnvironmentName, mergeStrategy: 'upsert' },
      { keyPath: 'local_environments.default.shell', value: parityLocalEnvironmentShellDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'plugins_settings.enabled', value: parityPluginsEnabledDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'plugins_settings.source', value: pluginsSource, mergeStrategy: 'upsert' },
      { keyPath: 'connections.host', value: connectionsHost, mergeStrategy: 'upsert' },
      { keyPath: 'connections.status', value: parityConnectionsStatusDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'connections.auth', value: parityConnectionsAuthDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'environments.default.name', value: environmentName, mergeStrategy: 'upsert' },
      { keyPath: 'environments.default.type', value: parityEnvironmentTypeDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'worktrees.auto_cleanup', value: parityWorktreesAutoCleanupDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'worktrees.repository', value: worktreesRepository, mergeStrategy: 'upsert' },
      { keyPath: 'git_settings.default_branch', value: gitDefaultBranch, mergeStrategy: 'upsert' },
      { keyPath: 'git_settings.auto_fetch', value: parityGitAutoFetchDraft.value, mergeStrategy: 'upsert' },
    ])
    syncTopLevelGeneralSettingsFromDrafts()
    syncTopLevelAppearanceFromDraft()
    parityConfigRead.value = await readConfigSummary()
    parityConfigWriteResult.value = 'Applied all parity settings via config/batchWrite'
    parityThreadActionResult.value = 'Applied all parity settings'
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to apply all parity settings'
  } finally {
    isApplyingAllParitySettings.value = false
  }
}



async function onCopyParityStatusBundle(): Promise<void> {
  const line = [
    `coverage=${parityAppSettingsCoverageSummary.value}`,
    `completion=${parityAppSettingsCompletionState.value}`,
    `selfCheck=${paritySelfCheckStatus.value}`,
    `lastRun=${paritySelfCheckLastRun.value}`,
  ].join(' | ')
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity status bundle'
    return
  }
  parityError.value = 'Failed to copy parity status bundle'
}



async function onCopyParitySummaryMarkdown(): Promise<void> {
  const lines = [
    '## Parity Summary',
    '',
    `- Coverage: ${parityAppSettingsCoverageSummary.value}`,
    `- Completion: ${parityAppSettingsCompletionState.value}`,
    `- Self-check: ${paritySelfCheckStatus.value}`,
    `- Last run: ${paritySelfCheckLastRun.value}`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity summary markdown'
    return
  }
  parityError.value = 'Failed to copy parity summary markdown'
}



function onResetParitySelfCheckStatus(): void {
  paritySelfCheckStatus.value = 'not-run'
  paritySelfCheckLastRun.value = 'never'
  parityError.value = ''
  parityThreadActionResult.value = 'Reset parity self-check status'
}



async function onCopyParityAuditTrail(): Promise<void> {
  const lines = [
    '# Parity Audit Trail',
    '',
    `- Coverage: ${parityAppSettingsCoverageSummary.value}`,
    `- Completion: ${parityAppSettingsCompletionState.value}`,
    `- Self-check status: ${paritySelfCheckStatus.value}`,
    `- Self-check last-run: ${paritySelfCheckLastRun.value}`,
    `- Generated at: ${new Date().toISOString()}`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity audit trail'
    return
  }
  parityError.value = 'Failed to copy parity audit trail'
}



async function onCopyParityHeartbeatLine(): Promise<void> {
  const line = `parity_heartbeat|coverage=${parityAppSettingsCoverageSummary.value}|completion=${parityAppSettingsCompletionState.value}|selfcheck=${paritySelfCheckStatus.value}|ts=${new Date().toISOString()}`
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity heartbeat line'
    return
  }
  parityError.value = 'Failed to copy parity heartbeat line'
}



async function onCopyParityEvidenceBundleJson(): Promise<void> {
  const payload = {
    generatedAt: new Date().toISOString(),
    categories: {
      total: parityAppSettingsCategories.length,
      supportedCount: parityAppSettingsSupportedCategories.value.length,
      missingCount: parityAppSettingsMissingCategories.value.length,
      coverage: parityAppSettingsCoverageSummary.value,
      completion: parityAppSettingsCompletionState.value,
      missing: parityAppSettingsMissingCategories.value,
    },
    selfCheck: {
      status: paritySelfCheckStatus.value,
      lastRun: paritySelfCheckLastRun.value,
    },
    statusBundle: [
      `coverage=${parityAppSettingsCoverageSummary.value}`,
      `completion=${parityAppSettingsCompletionState.value}`,
      `selfCheck=${paritySelfCheckStatus.value}`,
      `lastRun=${paritySelfCheckLastRun.value}`,
    ].join(' | '),
  }
  const copied = await copyTextToClipboard(JSON.stringify(payload, null, 2))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity evidence bundle JSON'
    return
  }
  parityError.value = 'Failed to copy parity evidence bundle JSON'
}



async function onCopyParityCsvLine(): Promise<void> {
  const cols = [
    new Date().toISOString(),
    parityAppSettingsCoverageSummary.value,
    parityAppSettingsCompletionState.value,
    String(parityAppSettingsMissingCategories.value.length),
    paritySelfCheckStatus.value,
    paritySelfCheckLastRun.value,
  ]
  const line = cols.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
  const copied = await copyTextToClipboard(line)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity CSV line'
    return
  }
  parityError.value = 'Failed to copy parity CSV line'
}



async function onCopyParityYamlBlock(): Promise<void> {
  const lines = [
    'parity:',
    `  coverage: "${parityAppSettingsCoverageSummary.value}"`,
    `  completion: "${parityAppSettingsCompletionState.value}"`,
    `  missing: ${parityAppSettingsMissingCategories.value.length}`,
    '  self_check:',
    `    status: "${paritySelfCheckStatus.value}"`,
    `    last_run: "${paritySelfCheckLastRun.value}"`,
    `  generated_at: "${new Date().toISOString()}"`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity YAML block'
    return
  }
  parityError.value = 'Failed to copy parity YAML block'
}



async function onCopyParityTomlBlock(): Promise<void> {
  const lines = [
    '[parity]',
    `coverage = "${parityAppSettingsCoverageSummary.value}"`,
    `completion = "${parityAppSettingsCompletionState.value}"`,
    `missing = ${parityAppSettingsMissingCategories.value.length}`,
    '',
    '[parity.self_check]',
    `status = "${paritySelfCheckStatus.value}"`,
    `last_run = "${paritySelfCheckLastRun.value}"`,
    `generated_at = "${new Date().toISOString()}"`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity TOML block'
    return
  }
  parityError.value = 'Failed to copy parity TOML block'
}



async function onCopyParityXmlBlock(): Promise<void> {
  const esc = (value: string): string => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

  const xml = [
    '<parity>',
    `  <coverage>${esc(parityAppSettingsCoverageSummary.value)}</coverage>`,
    `  <completion>${esc(parityAppSettingsCompletionState.value)}</completion>`,
    `  <missing>${parityAppSettingsMissingCategories.value.length}</missing>`,
    '  <selfCheck>',
    `    <status>${esc(paritySelfCheckStatus.value)}</status>`,
    `    <lastRun>${esc(paritySelfCheckLastRun.value)}</lastRun>`,
    '  </selfCheck>',
    `  <generatedAt>${esc(new Date().toISOString())}</generatedAt>`,
    '</parity>',
  ].join('\n')

  const copied = await copyTextToClipboard(xml)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity XML block'
    return
  }
  parityError.value = 'Failed to copy parity XML block'
}



async function onCopyParityPlainTextBlock(): Promise<void> {
  const lines = [
    'PARITY STATUS',
    `coverage: ${parityAppSettingsCoverageSummary.value}`,
    `completion: ${parityAppSettingsCompletionState.value}`,
    `missing: ${parityAppSettingsMissingCategories.value.length}`,
    `self-check: ${paritySelfCheckStatus.value}`,
    `last-run: ${paritySelfCheckLastRun.value}`,
    `generated-at: ${new Date().toISOString()}`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity plain-text block'
    return
  }
  parityError.value = 'Failed to copy parity plain-text block'
}



async function onCopyParityEnvVarsBlock(): Promise<void> {
  const lines = [
    `PARITY_COVERAGE=${parityAppSettingsCoverageSummary.value}`,
    `PARITY_COMPLETION=${parityAppSettingsCompletionState.value}`,
    `PARITY_MISSING=${parityAppSettingsMissingCategories.value.length}`,
    `PARITY_SELF_CHECK=${paritySelfCheckStatus.value}`,
    `PARITY_SELF_CHECK_LAST_RUN=${paritySelfCheckLastRun.value}`,
    `PARITY_GENERATED_AT=${new Date().toISOString()}`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity env vars block'
    return
  }
  parityError.value = 'Failed to copy parity env vars block'
}



async function onCopyParityNdjsonLine(): Promise<void> {
  const payload = {
    type: 'parity',
    t: new Date().toISOString(),
    coverage: parityAppSettingsCoverageSummary.value,
    completion: parityAppSettingsCompletionState.value,
    missing: parityAppSettingsMissingCategories.value.length,
    selfCheck: paritySelfCheckStatus.value,
    selfCheckLastRun: paritySelfCheckLastRun.value,
  }
  const copied = await copyTextToClipboard(JSON.stringify(payload))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity NDJSON line'
    return
  }
  parityError.value = 'Failed to copy parity NDJSON line'
}



async function onCopyParityMarkdownTable(): Promise<void> {
  const rows = [
    ['Metric', 'Value'],
    ['Coverage', parityAppSettingsCoverageSummary.value],
    ['Completion', parityAppSettingsCompletionState.value],
    ['Missing', String(parityAppSettingsMissingCategories.value.length)],
    ['Self-check', paritySelfCheckStatus.value],
    ['Self-check last-run', paritySelfCheckLastRun.value],
  ]
  const lines = [
    `| ${rows[0][0]} | ${rows[0][1]} |`,
    '| --- | --- |',
    ...rows.slice(1).map((row) => `| ${row[0]} | ${row[1]} |`),
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity markdown table'
    return
  }
  parityError.value = 'Failed to copy parity markdown table'
}



async function onCopyParityIniBlock(): Promise<void> {
  const lines = [
    '[parity]',
    `coverage=${parityAppSettingsCoverageSummary.value}`,
    `completion=${parityAppSettingsCompletionState.value}`,
    `missing=${parityAppSettingsMissingCategories.value.length}`,
    `self_check=${paritySelfCheckStatus.value}`,
    `self_check_last_run=${paritySelfCheckLastRun.value}`,
    `generated_at=${new Date().toISOString()}`,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity INI block'
    return
  }
  parityError.value = 'Failed to copy parity INI block'
}

async function onCopyParityHtmlBlock(): Promise<void> {
  const html = [
    '<section class="parity-status">',
    `  <p><strong>Coverage:</strong> ${parityAppSettingsCoverageSummary.value}</p>`,
    `  <p><strong>Completion:</strong> ${parityAppSettingsCompletionState.value}</p>`,
    `  <p><strong>Missing:</strong> ${parityAppSettingsMissingCategories.value.length}</p>`,
    `  <p><strong>Self-check:</strong> ${paritySelfCheckStatus.value}</p>`,
    `  <p><strong>Last run:</strong> ${paritySelfCheckLastRun.value}</p>`,
    '</section>',
  ].join('\n')
  const copied = await copyTextToClipboard(html)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity HTML block'
    return
  }
  parityError.value = 'Failed to copy parity HTML block'
}



async function onCopyParityMarkdownList(): Promise<void> {
  const lines = [
    '- parity coverage: ' + parityAppSettingsCoverageSummary.value,
    '- parity completion: ' + parityAppSettingsCompletionState.value,
    '- parity missing: ' + parityAppSettingsMissingCategories.value.length,
    '- parity self-check: ' + paritySelfCheckStatus.value,
    '- parity self-check last-run: ' + paritySelfCheckLastRun.value,
  ]
  const copied = await copyTextToClipboard(lines.join('\n'))
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity markdown list'
    return
  }
  parityError.value = 'Failed to copy parity markdown list'
}

async function onCopyParityTuple(): Promise<void> {
  const tuple = [
    parityAppSettingsCoverageSummary.value,
    parityAppSettingsCompletionState.value,
    String(parityAppSettingsMissingCategories.value.length),
    paritySelfCheckStatus.value,
  ].join('|')
  const copied = await copyTextToClipboard(tuple)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity tuple'
    return
  }
  parityError.value = 'Failed to copy parity tuple'
}

async function onCopyParityCompactCode(): Promise<void> {
  const completion = parityAppSettingsCompletionState.value
  const selfCheck = paritySelfCheckStatus.value
  const code = `P:${completion[0] || 'u'}|M:${parityAppSettingsMissingCategories.value.length}|S:${selfCheck[0] || 'u'}`
  const copied = await copyTextToClipboard(code)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity compact code'
    return
  }
  parityError.value = 'Failed to copy parity compact code'
}

async function onCopyParityKeyValueList(): Promise<void> {
  const lines = [
    `coverage=${parityAppSettingsCoverageSummary.value}`,
    `completion=${parityAppSettingsCompletionState.value}`,
    `missing_total=${String(parityAppSettingsMissingCategories.value.length)}`,
    `self_check_status=${paritySelfCheckStatus.value}`,
    `self_check_last_run=${paritySelfCheckLastRun.value}`,
    `apps_total=${String(parityApps.value.length)}`,
    `apps_enabled=${String(parityApps.value.filter((app) => app.isEnabled).length)}`,
    `features_total=${String(parityExperimentalFeatures.value.length)}`,
    `features_enabled=${String(parityExperimentalFeatures.value.filter((feature) => feature.enabled).length)}`,
    `mcp_total=${String(parityMcpServers.value.length)}`,
    `mcp_connected=${String(parityMcpServers.value.filter((server) => server.authStatus === 'connected').length)}`,
  ].join('\n')
  const copied = await copyTextToClipboard(lines)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied parity key-value list'
    return
  }
  parityError.value = 'Failed to copy parity key-value list'
}


function onUseFirstParityAppSettingsMissingCategory(): void {
  const first = parityAppSettingsMissingCategories.value[0]
  if (!first) return
  parityAppSettingsFocusCategoryDraft.value = first
}

function onUseFirstParityAppSettingsSupportedCategory(): void {
  const first = parityAppSettingsSupportedCategories.value[0]
  if (!first) return
  parityAppSettingsFocusCategoryDraft.value = first
}

async function onCopyParityAppSettingsFocusCategory(): Promise<void> {
  const value = parityAppSettingsFocusCategoryDraft.value.trim()
  if (!value) return
  const copied = await copyTextToClipboard(value)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied focus settings category'
    return
  }
  parityError.value = 'Failed to copy focus settings category'
}

async function onApplyParityCategorySettings(
  entries: Array<{ keyPath: string; value: string; mergeStrategy: 'upsert' }>,
  successMessage: string,
): Promise<void> {
  if (isApplyingParityCategorySettings.value) return
  isApplyingParityCategorySettings.value = true
  parityError.value = ''
  try {
    await writeConfigBatch(entries)
    parityConfigRead.value = await readConfigSummary()
    parityConfigWriteResult.value = successMessage
    parityThreadActionResult.value = successMessage
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : `Failed to ${successMessage.toLowerCase()}`
  } finally {
    isApplyingParityCategorySettings.value = false
  }
}

function onResetParityPersonalizationDrafts(): void {
  parityPersonalizationToneDraft.value = 'friendly'
  parityPersonalizationAvatarDraft.value = 'default'
  parityPersonalizationMemoryDraft.value = 'enabled'
}

async function onCopyParityPersonalizationSummary(): Promise<void> {
  const summary = parityPersonalizationSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied personalization summary'
    return
  }
  parityError.value = 'Failed to copy personalization summary'
}

async function onApplyParityPersonalizationSettings(): Promise<void> {
  await onApplyParityCategorySettings(
    [
      { keyPath: 'personalization.tone', value: parityPersonalizationToneDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'personalization.avatar', value: parityPersonalizationAvatarDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'personalization.memory', value: parityPersonalizationMemoryDraft.value, mergeStrategy: 'upsert' },
    ],
    'Applied personalization parity settings via config/batchWrite',
  )
}

function onResetParityUsageDrafts(): void {
  parityUsageAutoTopUpDraft.value = 'disabled'
  parityUsageBudgetDraft.value = '0'
}

async function onCopyParityUsageSummary(): Promise<void> {
  const summary = parityUsageSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied usage summary'
    return
  }
  parityError.value = 'Failed to copy usage summary'
}

async function onApplyParityUsageSettings(): Promise<void> {
  const budget = parityUsageBudgetDraft.value.trim() || '0'
  await onApplyParityCategorySettings(
    [
      { keyPath: 'usage.auto_top_up', value: parityUsageAutoTopUpDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'usage.monthly_budget_usd', value: budget, mergeStrategy: 'upsert' },
    ],
    'Applied usage parity settings via config/batchWrite',
  )
}

function onResetParityAppearanceDrafts(): void {
  parityAppearanceThemeDraft.value = 'system'
  parityAppearanceDensityDraft.value = 'comfortable'
  syncTopLevelAppearanceFromDraft()
}

async function onCopyParityAppearanceSummary(): Promise<void> {
  const summary = parityAppearanceSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied appearance summary'
    return
  }
  parityError.value = 'Failed to copy appearance summary'
}

async function onApplyParityAppearanceSettings(): Promise<void> {
  await onApplyParityCategorySettings(
    [
      { keyPath: 'appearance.theme', value: parityAppearanceThemeDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'appearance.density', value: parityAppearanceDensityDraft.value, mergeStrategy: 'upsert' },
    ],
    'Applied appearance parity settings via config/batchWrite',
  )
  syncTopLevelAppearanceFromDraft()
}

function onResetParityDataControlsDrafts(): void {
  parityDataControlsTelemetryDraft.value = 'enabled'
  parityDataControlsTrainingDraft.value = 'enabled'
}

async function onCopyParityDataControlsSummary(): Promise<void> {
  const summary = parityDataControlsSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied data controls summary'
    return
  }
  parityError.value = 'Failed to copy data controls summary'
}

async function onApplyParityDataControlsSettings(): Promise<void> {
  await onApplyParityCategorySettings(
    [
      { keyPath: 'data_controls.telemetry', value: parityDataControlsTelemetryDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'data_controls.training', value: parityDataControlsTrainingDraft.value, mergeStrategy: 'upsert' },
    ],
    'Applied data-controls parity settings via config/batchWrite',
  )
}

function onResetParityComputerUseDrafts(): void {
  parityComputerUseModeDraft.value = 'ask'
  parityComputerUseVisionDraft.value = 'enabled'
}

async function onCopyParityComputerUseSummary(): Promise<void> {
  const summary = parityComputerUseSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied computer-use summary'
    return
  }
  parityError.value = 'Failed to copy computer-use summary'
}

async function onApplyParityComputerUseSettings(): Promise<void> {
  await onApplyParityCategorySettings(
    [
      { keyPath: 'computer_use.mode', value: parityComputerUseModeDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'computer_use.vision', value: parityComputerUseVisionDraft.value, mergeStrategy: 'upsert' },
    ],
    'Applied computer-use parity settings via config/batchWrite',
  )
}

function onResetParityGeneralSettingsDrafts(): void {
  parityGeneralNotificationsDraft.value = 'enabled'
  parityGeneralMenuBarDraft.value = 'enabled'
  syncTopLevelGeneralSettingsFromDrafts()
}

async function onCopyParityGeneralSettingsSummary(): Promise<void> {
  const summary = parityGeneralSettingsSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied general settings summary'
    return
  }
  parityError.value = 'Failed to copy general settings summary'
}

async function onApplyParityGeneralSettings(): Promise<void> {
  await onApplyParityCategorySettings(
    [
      { keyPath: 'general_settings.notifications', value: parityGeneralNotificationsDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'general_settings.menu_bar', value: parityGeneralMenuBarDraft.value, mergeStrategy: 'upsert' },
    ],
    'Applied general-settings parity settings via config/batchWrite',
  )
  syncTopLevelGeneralSettingsFromDrafts()
}

function onResetParityLocalEnvironmentDrafts(): void {
  parityLocalEnvironmentNameDraft.value = 'local-default'
  parityLocalEnvironmentShellDraft.value = 'zsh'
}

async function onCopyParityLocalEnvironmentSummary(): Promise<void> {
  const summary = parityLocalEnvironmentSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied local environment summary'
    return
  }
  parityError.value = 'Failed to copy local environment summary'
}

async function onApplyParityLocalEnvironmentSettings(): Promise<void> {
  const name = parityLocalEnvironmentNameDraft.value.trim() || 'local-default'
  await onApplyParityCategorySettings(
    [
      { keyPath: 'local_environments.default.name', value: name, mergeStrategy: 'upsert' },
      { keyPath: 'local_environments.default.shell', value: parityLocalEnvironmentShellDraft.value, mergeStrategy: 'upsert' },
    ],
    'Applied local-environment parity settings via config/batchWrite',
  )
}

function onResetParityPluginsDrafts(): void {
  parityPluginsEnabledDraft.value = 'enabled'
  parityPluginsSourceDraft.value = 'marketplace'
}

async function onCopyParityPluginsSummary(): Promise<void> {
  const summary = parityPluginsSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied plugins summary'
    return
  }
  parityError.value = 'Failed to copy plugins summary'
}

async function onApplyParityPluginsSettings(): Promise<void> {
  const source = parityPluginsSourceDraft.value.trim() || 'marketplace'
  await onApplyParityCategorySettings(
    [
      { keyPath: 'plugins_settings.enabled', value: parityPluginsEnabledDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'plugins_settings.source', value: source, mergeStrategy: 'upsert' },
    ],
    'Applied plugins parity settings via config/batchWrite',
  )
}

function onResetParityConnectionsDrafts(): void {
  parityConnectionsHostDraft.value = 'localhost'
  parityConnectionsStatusDraft.value = 'connected'
  parityConnectionsAuthDraft.value = 'token'
}

async function onCopyParityConnectionsSummary(): Promise<void> {
  const summary = parityConnectionsSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied connections summary'
    return
  }
  parityError.value = 'Failed to copy connections summary'
}

async function onApplyParityConnectionsSettings(): Promise<void> {
  const host = parityConnectionsHostDraft.value.trim() || 'localhost'
  await onApplyParityCategorySettings(
    [
      { keyPath: 'connections.host', value: host, mergeStrategy: 'upsert' },
      { keyPath: 'connections.status', value: parityConnectionsStatusDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'connections.auth', value: parityConnectionsAuthDraft.value, mergeStrategy: 'upsert' },
    ],
    'Applied connections parity settings via config/batchWrite',
  )
}

function onResetParityEnvironmentDrafts(): void {
  parityEnvironmentNameDraft.value = 'default'
  parityEnvironmentTypeDraft.value = 'local'
}

async function onCopyParityEnvironmentSummary(): Promise<void> {
  const summary = parityEnvironmentSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied environments summary'
    return
  }
  parityError.value = 'Failed to copy environments summary'
}

async function onApplyParityEnvironmentSettings(): Promise<void> {
  const name = parityEnvironmentNameDraft.value.trim() || 'default'
  await onApplyParityCategorySettings(
    [
      { keyPath: 'environments.default.name', value: name, mergeStrategy: 'upsert' },
      { keyPath: 'environments.default.type', value: parityEnvironmentTypeDraft.value, mergeStrategy: 'upsert' },
    ],
    'Applied environments parity settings via config/batchWrite',
  )
}

function onResetParityWorktreesDrafts(): void {
  parityWorktreesAutoCleanupDraft.value = 'enabled'
  parityWorktreesRepositoryDraft.value = ''
}

async function onCopyParityWorktreesSummary(): Promise<void> {
  const summary = parityWorktreesSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied worktrees summary'
    return
  }
  parityError.value = 'Failed to copy worktrees summary'
}

async function onApplyParityWorktreesSettings(): Promise<void> {
  const repository = parityWorktreesRepositoryDraft.value.trim()
  await onApplyParityCategorySettings(
    [
      { keyPath: 'worktrees.auto_cleanup', value: parityWorktreesAutoCleanupDraft.value, mergeStrategy: 'upsert' },
      { keyPath: 'worktrees.repository', value: repository, mergeStrategy: 'upsert' },
    ],
    'Applied worktrees parity settings via config/batchWrite',
  )
}

function onResetParityGitSettingsDrafts(): void {
  parityGitDefaultBranchDraft.value = 'main'
  parityGitAutoFetchDraft.value = 'enabled'
}

async function onCopyParityGitSettingsSummary(): Promise<void> {
  const summary = parityGitSettingsSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied git settings summary'
    return
  }
  parityError.value = 'Failed to copy git settings summary'
}

async function onApplyParityGitSettings(): Promise<void> {
  const defaultBranch = parityGitDefaultBranchDraft.value.trim() || 'main'
  await onApplyParityCategorySettings(
    [
      { keyPath: 'git_settings.default_branch', value: defaultBranch, mergeStrategy: 'upsert' },
      { keyPath: 'git_settings.auto_fetch', value: parityGitAutoFetchDraft.value, mergeStrategy: 'upsert' },
    ],
    'Applied git-settings parity settings via config/batchWrite',
  )
}

function formatParityNotificationSample(entry: RpcNotification): string {
  const method = typeof entry?.method === 'string' && entry.method.trim().length > 0
    ? entry.method.trim()
    : 'unknown-notification'
  const hasParams = entry && typeof entry === 'object' && Object.prototype.hasOwnProperty.call(entry, 'params')
  return `${new Date().toLocaleTimeString()} · ${method}${hasParams ? ' · params' : ''}`
}

function getParityNotificationMethod(entry: RpcNotification): string {
  return typeof entry?.method === 'string' && entry.method.trim().length > 0
    ? entry.method.trim()
    : 'unknown-notification'
}

function clearParityNotificationSamples(): void {
  parityNotificationSamples.value = []
  parityNotificationCount.value = 0
}

function onResetParityNotificationStreamState(): void {
  parityNotificationFilterDraft.value = ''
  clearParityNotificationSamples()
}

async function onCopyParityNotificationSamples(): Promise<void> {
  if (parityNotificationSamples.value.length === 0) return
  const summary = parityNotificationSamples.value.slice(0, 10).join('\n')
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied notifications sample'
    return
  }
  parityError.value = 'Failed to copy notifications sample'
}

async function onCopyParityNotificationFilter(): Promise<void> {
  const filter = parityNotificationFilterDraft.value.trim()
  if (!filter) return
  const copied = await copyTextToClipboard(filter)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied notification filter'
    return
  }
  parityError.value = 'Failed to copy notification filter'
}

function toggleParityNotificationStream(): void {
  if (isParityNotificationStreamActive.value) {
    if (parityNotificationUnsubscribe) {
      parityNotificationUnsubscribe()
      parityNotificationUnsubscribe = null
    }
    isParityNotificationStreamActive.value = false
    return
  }
  parityNotificationUnsubscribe = subscribeCodexNotifications((entry) => {
    const method = getParityNotificationMethod(entry)
    const filter = parityNotificationFilterDraft.value.trim().toLowerCase()
    if (filter && !method.toLowerCase().includes(filter)) return
    parityNotificationCount.value += 1
    const sample = formatParityNotificationSample(entry)
    parityNotificationSamples.value = [sample, ...parityNotificationSamples.value].slice(0, 20)
  })
  isParityNotificationStreamActive.value = true
}

function formatParityPendingRequestSummary(entry: unknown, index: number): string {
  if (!entry || typeof entry !== 'object') return `#${index + 1} unknown request`
  const record = entry as Record<string, unknown>
  const method = typeof record.method === 'string' && record.method.trim().length > 0
    ? record.method.trim()
    : 'unknown-method'
  const idValue = record.id
  const id = typeof idValue === 'number' || typeof idValue === 'string' ? String(idValue) : `idx:${index + 1}`
  return `id=${id} · ${method}`
}

function onUseFirstParityPendingRequestId(): void {
  const first = parityPendingRequestSummaries.value[0]
  if (!first) return
  const match = first.match(/id=([^\s·]+)/)
  if (!match || !match[1]) return
  parityReplyRequestIdDraft.value = match[1]
}

function onClearParityPendingReplyDrafts(): void {
  parityReplyRequestIdDraft.value = ''
  parityReplyErrorMessageDraft.value = ''
}

function onResetParityPendingReplyMode(): void {
  parityReplyModeDraft.value = 'approve'
}

function onClearParityPendingReplyResult(): void {
  parityThreadActionResult.value = ''
}

async function onLoadParityPendingRequests(): Promise<void> {
  if (isLoadingParityPendingRequests.value) return
  isLoadingParityPendingRequests.value = true
  parityError.value = ''
  parityPendingRequestMethodSummary.value = ''
  try {
    const startedAt = Date.now()
    const rows = await getPendingServerRequests()
    parityPendingRequestSummaries.value = rows.map((row, index) => formatParityPendingRequestSummary(row, index))
    const methodCounts = new Map<string, number>()
    for (const row of rows) {
      const method = row && typeof row === 'object' && typeof (row as Record<string, unknown>).method === 'string'
        ? ((row as Record<string, unknown>).method as string).trim()
        : ''
      const key = method || 'unknown-method'
      methodCounts.set(key, (methodCounts.get(key) ?? 0) + 1)
    }
    const fragments = Array.from(methodCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([method, count]) => `${method}:${count}`)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityPendingRequestMethodSummary.value = `${fragments.join(', ')} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load pending server requests'
  } finally {
    isLoadingParityPendingRequests.value = false
  }
}

function onClearParityPendingRequestSummaries(): void {
  parityPendingRequestSummaries.value = []
  parityPendingRequestMethodSummary.value = ''
}

async function onCopyParityPendingRequestMethods(): Promise<void> {
  const summary = parityPendingRequestMethodSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied pending-request methods'
    return
  }
  parityError.value = 'Failed to copy pending-request methods'
}

async function onReplyParityPendingRequest(): Promise<void> {
  const id = Number.parseInt(parityReplyRequestIdDraft.value.trim(), 10)
  if (!Number.isFinite(id) || id < 1 || isReplyingParityPendingRequest.value) return
  isReplyingParityPendingRequest.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    const startedAt = Date.now()
    if (parityReplyModeDraft.value === 'approve') {
      await replyToServerRequest(id, { result: {} })
    } else {
      const message = parityReplyErrorMessageDraft.value.trim() || 'Request denied from parity panel'
      await replyToServerRequest(id, { error: { code: 4001, message } })
    }
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadActionResult.value = `Replied to request id=${id} · mode=${parityReplyModeDraft.value} · durationMs=${durationMs}`
    await onLoadParityPendingRequests()
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to reply to pending request'
  } finally {
    isReplyingParityPendingRequest.value = false
  }
}

async function onLoadParityThreadGroups(): Promise<void> {
  if (isLoadingParityThreadGroups.value) return
  isLoadingParityThreadGroups.value = true
  parityError.value = ''
  parityThreadGroupsSummary.value = ''
  try {
    const startedAt = Date.now()
    const groups = await getThreadGroups()
    const threadCount = groups.reduce((total, group) => total + group.threads.length, 0)
    const largest = groups.reduce<{ projectName: string; count: number } | null>((best, group) => {
      const count = group.threads.length
      if (!best || count > best.count) return { projectName: group.projectName, count }
      return best
    }, null)
    const largestLabel = largest ? `${largest.projectName}:${largest.count}` : '(none)'
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadGroupsSummary.value = `projects=${groups.length} · threads=${threadCount} · largest=${largestLabel} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load thread groups'
  } finally {
    isLoadingParityThreadGroups.value = false
  }
}

function onClearParityThreadGroupsSummary(): void {
  parityThreadGroupsSummary.value = ''
}

async function onLoadParitySkills(): Promise<void> {
  if (isLoadingParitySkills.value) return
  isLoadingParitySkills.value = true
  parityError.value = ''
  paritySkillsSummary.value = ''
  try {
    const startedAt = Date.now()
    const skills = await getSkillsList()
    const durationMs = Math.max(0, Date.now() - startedAt)
    if (skills.length === 0) {
      paritySkillsSummary.value = `No skills returned · durationMs=${durationMs}`
      return
    }
    const enabledCount = skills.filter((skill) => skill.enabled).length
    const scopeCounts = new Map<string, number>()
    for (const skill of skills) {
      const scope = (skill.scope || '').trim() || 'unknown'
      scopeCounts.set(scope, (scopeCounts.get(scope) ?? 0) + 1)
    }
    const scopeSummary = Array.from(scopeCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([scope, count]) => `${scope}:${count}`)
      .join(', ')
    const sampleNames = skills.slice(0, 4).map((skill) => skill.name).join(', ')
    paritySkillsSummary.value = `count=${skills.length} · enabled=${enabledCount} · scopes=${scopeSummary} · ${sampleNames} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load skills'
  } finally {
    isLoadingParitySkills.value = false
  }
}

function onClearParitySkillsSummary(): void {
  paritySkillsSummary.value = ''
}

async function onLoadParityThreadStateCache(): Promise<void> {
  if (isLoadingParityThreadState.value) return
  isLoadingParityThreadState.value = true
  parityError.value = ''
  parityThreadTitleSamples.value = []
  parityPinnedThreadSamples.value = []
  parityThreadStateDurationMs.value = null
  try {
    const startedAt = Date.now()
    const [titleCache, pinState] = await Promise.all([
      getThreadTitleCache(),
      getPinnedThreadState(),
    ])
    parityThreadTitleCacheSize.value = Object.keys(titleCache.titles || {}).length
    parityThreadPinCount.value = Array.isArray(pinState.threadIds) ? pinState.threadIds.length : 0
    parityThreadTitleSamples.value = (titleCache.order || [])
      .slice(0, 3)
      .map((threadId) => {
        const title = titleCache.titles?.[threadId] || '(untitled)'
        return `${threadId}: ${title}`
      })
    parityPinnedThreadSamples.value = (pinState.threadIds || []).slice(0, 3)
    parityPinnedThreadIdsDraft.value = (pinState.threadIds || []).join(', ')
    parityThreadStateDurationMs.value = Math.max(0, Date.now() - startedAt)
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load thread state cache'
  } finally {
    isLoadingParityThreadState.value = false
  }
}

async function onPersistParityPinnedThreadIds(): Promise<void> {
  if (isPersistingParityPinnedThreadIds.value) return
  isPersistingParityPinnedThreadIds.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    const threadIds = parityPinnedThreadIdsDraft.value
      .split(',')
      .map((value) => value.trim())
      .filter((value, index, source) => value.length > 0 && source.indexOf(value) === index)
    const startedAt = Date.now()
    await persistPinnedThreadIds(threadIds)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadActionResult.value = `Persisted pinned thread ids (${threadIds.length}) · durationMs=${durationMs}`
    await onLoadParityThreadStateCache()
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to persist pinned thread ids'
  } finally {
    isPersistingParityPinnedThreadIds.value = false
  }
}

function onClearParityPinnedThreadIdsDraft(): void {
  parityPinnedThreadIdsDraft.value = ''
}

function onClearParityThreadStateDiagnostics(): void {
  parityThreadTitleCacheSize.value = 0
  parityThreadPinCount.value = 0
  parityThreadStateDurationMs.value = null
  parityThreadTitleSamples.value = []
  parityPinnedThreadSamples.value = []
}

async function onGenerateParityThreadTitle(): Promise<void> {
  const prompt = parityTitlePrompt.value.trim()
  if (!prompt || isGeneratingParityTitle.value) return
  isGeneratingParityTitle.value = true
  parityError.value = ''
  parityGeneratedTitle.value = ''
  try {
    const cwd = selectedThread.value?.cwd?.trim() || null
    const title = await generateThreadTitle(prompt, cwd)
    parityGeneratedTitle.value = title || '(empty title)'
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to generate thread title'
  } finally {
    isGeneratingParityTitle.value = false
  }
}

async function onPersistParityThreadTitle(): Promise<void> {
  const threadId = selectedThreadId.value.trim()
  const title = parityGeneratedTitle.value.trim()
  if (!threadId || !title || isPersistingParityTitle.value) return
  isPersistingParityTitle.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    const startedAt = Date.now()
    await persistThreadTitle(threadId, title)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadActionResult.value = `Persisted title for ${threadId} · durationMs=${durationMs}`
    await refreshAll()
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to persist thread title'
  } finally {
    isPersistingParityTitle.value = false
  }
}

function onClearParityTitleDrafts(): void {
  parityTitlePrompt.value = ''
  parityGeneratedTitle.value = ''
}

async function onSearchParityThreads(): Promise<void> {
  const query = parityThreadSearchQuery.value.trim()
  if (!query || isSearchingParityThreads.value) return
  isSearchingParityThreads.value = true
  parityError.value = ''
  parityThreadSearchCount.value = null
  parityThreadSearchIndexedCount.value = null
  try {
    const parsedLimit = Number.parseInt(parityThreadSearchLimitDraft.value.trim(), 10)
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(2000, parsedLimit)) : 200
    const result = await searchThreads(query, limit)
    parityThreadSearchCount.value = result.threadIds.length
    parityThreadSearchIndexedCount.value = result.indexedThreadCount
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to search threads'
  } finally {
    isSearchingParityThreads.value = false
  }
}

function onClearParityThreadSearchDrafts(): void {
  parityThreadSearchQuery.value = ''
  parityThreadSearchLimitDraft.value = '200'
  parityThreadSearchCount.value = null
  parityThreadSearchIndexedCount.value = null
}

async function onSetParityDefaultModel(): Promise<void> {
  const model = parityDefaultModelDraft.value.trim()
  if (!model || isSettingParityDefaultModel.value) return
  isSettingParityDefaultModel.value = true
  parityError.value = ''
  try {
    await setDefaultModel(model)
    parityConfigWriteResult.value = `Saved default model=${model}`
    parityConfigRead.value = await readConfigSummary()
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to set default model'
  } finally {
    isSettingParityDefaultModel.value = false
  }
}

async function onSetParitySelectedThreadModel(): Promise<void> {
  const model = parityThreadModelDraft.value.trim()
  const threadId = selectedThreadId.value.trim()
  if (!model || !threadId || isSettingParityThreadModel.value) return
  isSettingParityThreadModel.value = true
  parityError.value = ''
  try {
    await setSelectedModelIdForThread(threadId, model)
    parityConfigWriteResult.value = `Saved selected thread model=${model}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to set selected thread model'
  } finally {
    isSettingParityThreadModel.value = false
  }
}

function onClearParityModelDrafts(): void {
  parityDefaultModelDraft.value = ''
  parityThreadModelDraft.value = ''
}

async function onSetParitySpeedMode(): Promise<void> {
  if (isSettingParitySpeedMode.value) return
  isSettingParitySpeedMode.value = true
  parityError.value = ''
  try {
    await setCodexSpeedMode(paritySpeedModeDraft.value)
    parityConfigWriteResult.value = `Saved speed mode=${paritySpeedModeDraft.value}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to set speed mode'
  } finally {
    isSettingParitySpeedMode.value = false
  }
}

async function onLoadParityRateLimits(): Promise<void> {
  if (isLoadingParityRateLimits.value) return
  isLoadingParityRateLimits.value = true
  parityError.value = ''
  parityRateLimitSummary.value = ''
  try {
    const snapshot = await getAccountRateLimits()
    if (!snapshot) {
      parityRateLimitSummary.value = 'No rate limit snapshot available'
      return
    }
    const primary = snapshot.primary
    const secondary = snapshot.secondary
    const primarySummary = primary
      ? `${primary.usedPercent}% used, window=${primary.windowMinutes ?? primary.windowDurationMins ?? 'n/a'}m`
      : 'n/a'
    const secondarySummary = secondary
      ? `${secondary.usedPercent}% used, window=${secondary.windowMinutes ?? secondary.windowDurationMins ?? 'n/a'}m`
      : 'n/a'
    parityRateLimitSummary.value = `primary ${primarySummary} · secondary ${secondarySummary}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load account rate limits'
  } finally {
    isLoadingParityRateLimits.value = false
  }
}

async function onLoadParityRawRateLimits(): Promise<void> {
  if (isLoadingParityRawRateLimits.value) return
  isLoadingParityRawRateLimits.value = true
  parityError.value = ''
  parityRawRateLimitsSummary.value = ''
  try {
    const response = await getAccountRateLimitsResponse()
    const bucketMap = response.rateLimitsByLimitId || {}
    const bucketKeys = Object.keys(bucketMap)
    const primaryPresent = response.rateLimits?.primary ? 'yes' : 'no'
    const secondaryPresent = response.rateLimits?.secondary ? 'yes' : 'no'
    const normalizedSnapshot = pickCodexRateLimitSnapshot(response)
    const normalizedPrimary = normalizedSnapshot?.primary ? 'yes' : 'no'
    const normalizedSecondary = normalizedSnapshot?.secondary ? 'yes' : 'no'
    parityRawRateLimitsSummary.value = `primary=${primaryPresent} · secondary=${secondaryPresent} · normalizedPrimary=${normalizedPrimary} · normalizedSecondary=${normalizedSecondary} · buckets=${bucketKeys.length}${bucketKeys.length > 0 ? ` (${bucketKeys.slice(0, 3).join(', ')})` : ''}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load raw rate limits response'
  } finally {
    isLoadingParityRawRateLimits.value = false
  }
}

async function onLoadParityCurrentModelConfig(): Promise<void> {
  if (isLoadingParityCurrentModel.value) return
  isLoadingParityCurrentModel.value = true
  parityError.value = ''
  parityCurrentModelSummary.value = ''
  try {
    const startedAt = Date.now()
    const config = await getCurrentModelConfig()
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityCurrentModelSummary.value = `model=${config.model || '(unset)'} · provider=${config.providerId || '(unset)'} · effort=${config.reasoningEffort || 'default'} · speed=${config.speedMode} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load current model config'
  } finally {
    isLoadingParityCurrentModel.value = false
  }
}

async function onLoadParityCollaborationModes(): Promise<void> {
  if (isLoadingParityCollaborationModes.value) return
  isLoadingParityCollaborationModes.value = true
  parityError.value = ''
  parityCollaborationModesSummary.value = ''
  try {
    const startedAt = Date.now()
    const modes = await getAvailableCollaborationModes()
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityCollaborationModesSummary.value = modes.length > 0
      ? `count=${modes.length} · values=${modes.map((mode) => mode.value).join(', ')} · labels=${modes.map((mode) => mode.label).join(', ')} · durationMs=${durationMs}`
      : `No collaboration modes returned · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load collaboration modes'
  } finally {
    isLoadingParityCollaborationModes.value = false
  }
}

async function onSetParityCollaborationMode(): Promise<void> {
  if (isSettingParityCollaborationMode.value) return
  isSettingParityCollaborationMode.value = true
  parityError.value = ''
  try {
    await setSelectedCollaborationMode(paritySelectedCollaborationModeDraft.value)
    parityCollaborationModesSummary.value = `selected=${paritySelectedCollaborationModeDraft.value}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to set collaboration mode'
  } finally {
    isSettingParityCollaborationMode.value = false
  }
}

function onResetParityModeDraftsToCurrent(): void {
  paritySpeedModeDraft.value = selectedSpeedMode.value
  paritySelectedCollaborationModeDraft.value = selectedCollaborationMode.value
}

async function onSetParityReasoningEffort(): Promise<void> {
  if (isSettingParityReasoningEffort.value) return
  isSettingParityReasoningEffort.value = true
  parityError.value = ''
  try {
    await setSelectedReasoningEffort(parityReasoningEffortDraft.value)
    parityConfigWriteResult.value = `Saved reasoning effort=${parityReasoningEffortDraft.value}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to set reasoning effort'
  } finally {
    isSettingParityReasoningEffort.value = false
  }
}

function onResetParityReasoningEffortDraft(): void {
  parityReasoningEffortDraft.value = selectedReasoningEffort.value || 'medium'
}

async function onLoadParityAvailableModels(): Promise<void> {
  if (isLoadingParityAvailableModels.value) return
  isLoadingParityAvailableModels.value = true
  parityError.value = ''
  parityAvailableModelsSummary.value = ''
  try {
    const startedAt = Date.now()
    const modelIds = await getAvailableModelIds()
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityAvailableModelsSummary.value = modelIds.length > 0
      ? `count=${modelIds.length} · ${modelIds.slice(0, 6).join(', ')} · durationMs=${durationMs}`
      : `No available model IDs returned · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load available model IDs'
  } finally {
    isLoadingParityAvailableModels.value = false
  }
}

function onClearParityAvailableModelsSummary(): void {
  parityAvailableModelsSummary.value = ''
}

function onClearParityRateLimitSummaries(): void {
  parityRateLimitSummary.value = ''
  parityRawRateLimitsSummary.value = ''
}

function onClearParityModelConfigSummaries(): void {
  parityCurrentModelSummary.value = ''
  parityAvailableModelsSummary.value = ''
}

function onClearParityCollaborationSummary(): void {
  parityCollaborationModesSummary.value = ''
}

async function onLoadParityWorkspaceRootsState(): Promise<void> {
  if (isLoadingParityWorkspaceRoots.value) return
  isLoadingParityWorkspaceRoots.value = true
  parityError.value = ''
  parityWorkspaceRootsSummary.value = ''
  try {
    const startedAt = Date.now()
    const state = await getWorkspaceRootsState()
    parityWorkspaceRootsDraftState.value = state
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityWorkspaceRootsSummary.value = `order=${state.order.length} · active=${state.active.length} · labels=${Object.keys(state.labels).length} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load workspace roots state'
  } finally {
    isLoadingParityWorkspaceRoots.value = false
  }
}

async function onWriteParityWorkspaceRootsState(): Promise<void> {
  const draft = parityWorkspaceRootsDraftState.value
  if (!draft || isWritingParityWorkspaceRoots.value) return
  isWritingParityWorkspaceRoots.value = true
  parityError.value = ''
  try {
    const startedAt = Date.now()
    await setWorkspaceRootsState(draft)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityConfigWriteResult.value = `Wrote workspace roots state · order=${draft.order.length} · active=${draft.active.length} · labels=${Object.keys(draft.labels).length} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to write workspace roots state'
  } finally {
    isWritingParityWorkspaceRoots.value = false
  }
}

function onClearParityWorkspaceRootsDiagnostics(): void {
  parityWorkspaceRootsDraftState.value = null
  parityWorkspaceRootsSummary.value = ''
}

async function onLoadParityHomeDirectory(): Promise<void> {
  if (isLoadingParityHomeDirectory.value) return
  isLoadingParityHomeDirectory.value = true
  parityError.value = ''
  parityHomeDirectoryDurationMs.value = null
  try {
    const startedAt = Date.now()
    parityHomeDirectory.value = await getHomeDirectory()
    parityHomeDirectoryDurationMs.value = Math.max(0, Date.now() - startedAt)
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load home directory'
  } finally {
    isLoadingParityHomeDirectory.value = false
  }
}

async function onLoadParityHomeDirectoryEntries(): Promise<void> {
  if (isLoadingParityHomeDirectoryEntries.value) return
  isLoadingParityHomeDirectoryEntries.value = true
  parityError.value = ''
  parityHomeDirectoryEntryCount.value = null
  parityHomeDirectoryParentPath.value = ''
  try {
    const path = parityHomeDirectory.value.trim() || await getHomeDirectory()
    if (!parityHomeDirectory.value.trim()) {
      parityHomeDirectory.value = path
    }
    const listing = await listLocalDirectories(path, { showHidden: false })
    parityHomeDirectoryEntryCount.value = listing.entries.length
    parityHomeDirectoryParentPath.value = listing.parentPath || ''
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to list home directory entries'
  } finally {
    isLoadingParityHomeDirectoryEntries.value = false
  }
}

function onClearParityHomeDirectoryDiagnostics(): void {
  parityHomeDirectoryEntryCount.value = null
  parityHomeDirectoryParentPath.value = ''
  parityHomeDirectoryDurationMs.value = null
}

function onClearParityHomeDirectoryValue(): void {
  parityHomeDirectory.value = ''
}

function onClearParityHomeFolderListSummary(): void {
  parityHomeDirectoryEntryCount.value = null
}

async function onCreateParityDirectory(): Promise<void> {
  const path = parityCreateDirectoryPathDraft.value.trim()
  if (!path || isCreatingParityDirectory.value) return
  isCreatingParityDirectory.value = true
  parityError.value = ''
  parityCreateDirectoryResult.value = ''
  try {
    const startedAt = Date.now()
    const createdPath = await createLocalDirectory(path)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityCreateDirectoryResult.value = `created=${createdPath || path} · durationMs=${durationMs}`
    if (parityHomeDirectory.value.trim()) {
      await onLoadParityHomeDirectoryEntries()
    }
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to create local directory'
  } finally {
    isCreatingParityDirectory.value = false
  }
}

function onUseParityHomeDirectoryForCreate(): void {
  const homeDirectory = parityHomeDirectory.value.trim()
  if (!homeDirectory) return
  parityCreateDirectoryPathDraft.value = homeDirectory
}

function onUseParitySuggestedProjectPathForCreate(): void {
  const suggestedPath = paritySuggestedProjectPath.value.trim()
  if (!suggestedPath) return
  parityCreateDirectoryPathDraft.value = suggestedPath
}

function onClearParityCreateDirectoryDraft(): void {
  parityCreateDirectoryPathDraft.value = ''
  parityCreateDirectoryResult.value = ''
}

async function onLoadParityProjectSuggestion(): Promise<void> {
  let basePath = parityProjectSuggestionBasePath.value.trim()
  if (!basePath || isLoadingParityProjectSuggestion.value) return
  isLoadingParityProjectSuggestion.value = true
  parityError.value = ''
  parityProjectSuggestionResult.value = ''
  paritySuggestedProjectPath.value = ''
  try {
    const startedAt = Date.now()
    if (!parityHomeDirectory.value.trim()) {
      parityHomeDirectory.value = await getHomeDirectory()
    }
    const suggestion = await getProjectRootSuggestion(basePath)
    const durationMs = Math.max(0, Date.now() - startedAt)
    paritySuggestedProjectPath.value = suggestion.path.trim()
    parityProjectSuggestionResult.value = `name=${suggestion.name} · path=${suggestion.path} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load project root suggestion'
  } finally {
    isLoadingParityProjectSuggestion.value = false
  }
}

function onUseParitySuggestedProjectPath(): void {
  const path = paritySuggestedProjectPath.value.trim()
  if (!path) return
  parityProjectSuggestionBasePath.value = path
}

function onClearParitySuggestedProjectPath(): void {
  paritySuggestedProjectPath.value = ''
}

function onUseParityHomeDirectoryForProjectSuggestion(): void {
  const homeDirectory = parityHomeDirectory.value.trim()
  if (!homeDirectory) return
  parityProjectSuggestionBasePath.value = homeDirectory
}

function onUseSelectedThreadCwdForProjectSuggestion(): void {
  const cwd = selectedThread.value?.cwd?.trim() ?? ''
  if (!cwd) return
  parityProjectSuggestionBasePath.value = cwd
}

function onClearParityProjectSuggestionDrafts(): void {
  parityProjectSuggestionBasePath.value = ''
  parityProjectSuggestionResult.value = ''
  paritySuggestedProjectPath.value = ''
}

function onClearParityProjectSuggestionResultOnly(): void {
  parityProjectSuggestionResult.value = ''
}

async function onOpenParityProjectRoot(createIfMissing: boolean): Promise<void> {
  const targetPath = parityProjectSuggestionBasePath.value.trim()
  if (!targetPath || isOpeningParityProjectRoot.value) return
  isOpeningParityProjectRoot.value = true
  parityError.value = ''
  parityProjectSuggestionResult.value = ''
  try {
    const startedAt = Date.now()
    const normalizedPath = await openProjectRoot(targetPath, {
      createIfMissing,
      label: 'App parity',
    })
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityProjectSuggestionResult.value = `opened=${normalizedPath || targetPath} · createIfMissing=${createIfMissing ? 'yes' : 'no'} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to open project root'
  } finally {
    isOpeningParityProjectRoot.value = false
  }
}

async function onRunParityComposerFileSearch(): Promise<void> {
  const cwd = parityComposerFileSearchCwdDraft.value.trim() || selectedThread.value?.cwd?.trim() || ''
  if (!cwd || isRunningParityComposerFileSearch.value) return
  isRunningParityComposerFileSearch.value = true
  parityError.value = ''
  parityComposerFileSearchSummary.value = ''
  try {
    const startedAt = Date.now()
    const rows = await searchComposerFiles(cwd, parityComposerFileSearchQueryDraft.value.trim(), 10)
    const durationMs = Math.max(0, Date.now() - startedAt)
    const sample = rows.slice(0, 3).map((entry) => entry.path).join(', ')
    parityComposerFileSearchSummary.value = `count=${rows.length} · durationMs=${durationMs}${sample ? ` · sample=${sample}` : ''}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to search composer files'
  } finally {
    isRunningParityComposerFileSearch.value = false
  }
}

function onUseSelectedThreadCwdForComposerSearch(): void {
  const cwd = selectedThread.value?.cwd?.trim() ?? ''
  if (!cwd) return
  parityComposerFileSearchCwdDraft.value = cwd
}

function onClearParityComposerFileSearchDrafts(): void {
  parityComposerFileSearchCwdDraft.value = ''
  parityComposerFileSearchQueryDraft.value = ''
  parityComposerFileSearchSummary.value = ''
}

async function onLoadParityTelegramStatus(): Promise<void> {
  if (isLoadingParityTelegramStatus.value) return
  isLoadingParityTelegramStatus.value = true
  parityError.value = ''
  parityTelegramStatusSummary.value = ''
  try {
    const status = await getTelegramStatus()
    parityTelegramStatusSummary.value = `configured=${status.configured ? 'yes' : 'no'} · active=${status.active ? 'yes' : 'no'} · chats=${status.mappedChats} · threads=${status.mappedThreads}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load Telegram status'
  } finally {
    isLoadingParityTelegramStatus.value = false
  }
}

async function onLoadParityTelegramConfig(): Promise<void> {
  if (isLoadingParityTelegramConfig.value) return
  isLoadingParityTelegramConfig.value = true
  parityError.value = ''
  parityTelegramConfigSummary.value = ''
  try {
    const config = await getTelegramConfig()
    const tokenPresent = config.botToken.trim().length > 0 ? 'yes' : 'no'
    const allowedCount = Array.isArray(config.allowedUserIds) ? config.allowedUserIds.length : 0
    parityTelegramBotTokenDraft.value = config.botToken
    parityTelegramAllowedUserIdsDraft.value = Array.isArray(config.allowedUserIds)
      ? config.allowedUserIds.map((value) => String(value)).join(',')
      : ''
    parityTelegramConfigSummary.value = `botTokenPresent=${tokenPresent} · allowedUserIds=${allowedCount}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load Telegram config'
  } finally {
    isLoadingParityTelegramConfig.value = false
  }
}

async function onConfigureParityTelegram(): Promise<void> {
  const botToken = parityTelegramBotTokenDraft.value.trim()
  if (!botToken || isConfiguringParityTelegram.value) return
  const allowedUserIds = parseTelegramAllowedUserIdsInput(parityTelegramAllowedUserIdsDraft.value)
  if (allowedUserIds.length === 0) {
    parityError.value = 'At least one allowed Telegram user ID or * is required.'
    return
  }

  isConfiguringParityTelegram.value = true
  parityError.value = ''
  try {
    await configureTelegramBot(botToken, allowedUserIds)
    parityTelegramAllowedUserIdsDraft.value = allowedUserIds.map((value) => String(value)).join(',')
    await Promise.all([
      onLoadParityTelegramStatus(),
      onLoadParityTelegramConfig(),
    ])
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to write Telegram config'
  } finally {
    isConfiguringParityTelegram.value = false
  }
}

function onClearParityTelegramDrafts(): void {
  parityTelegramBotTokenDraft.value = ''
  parityTelegramAllowedUserIdsDraft.value = ''
  parityTelegramConfigSummary.value = ''
}

function onClearParityTelegramStatusSummary(): void {
  parityTelegramStatusSummary.value = ''
}

function onSetParityTelegramAllowAll(): void {
  parityTelegramAllowedUserIdsDraft.value = '*'
}

async function onLoadParityGithubProjects(): Promise<void> {
  if (isLoadingParityGithubProjects.value) return
  isLoadingParityGithubProjects.value = true
  parityError.value = ''
  parityGithubProjectsSummary.value = ''
  try {
    const startedAt = Date.now()
    const projects = await getGithubProjectsForScope(parityGithubScope.value, 5)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityGithubProjectsSummary.value = projects.length > 0
      ? `scope=${parityGithubScope.value} · count=${projects.length} · ${projects.slice(0, 3).map((project) => project.fullName).join(', ')} · durationMs=${durationMs}`
      : `scope=${parityGithubScope.value} · No projects returned · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load GitHub projects'
  } finally {
    isLoadingParityGithubProjects.value = false
  }
}

async function onLoadParityGithubTrendingProjects(): Promise<void> {
  if (isLoadingParityGithubProjects.value) return
  isLoadingParityGithubProjects.value = true
  parityError.value = ''
  parityGithubProjectsSummary.value = ''
  try {
    const startedAt = Date.now()
    const projects = await getGithubTrendingProjects(5)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityGithubProjectsSummary.value = projects.length > 0
      ? `trending-api count=${projects.length} · ${projects.slice(0, 3).map((project) => project.fullName).join(', ')} · durationMs=${durationMs}`
      : `trending-api No projects returned · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load GitHub trending API'
  } finally {
    isLoadingParityGithubProjects.value = false
  }
}

function onClearParityGithubProjectsSummary(): void {
  parityGithubProjectsSummary.value = ''
}

function onResetParityGithubScope(): void {
  parityGithubScope.value = 'trending-daily'
}

async function onLoadParityGitBranchState(): Promise<void> {
  const cwd = selectedThread.value?.cwd?.trim() ?? ''
  if (!cwd || isLoadingParityGitBranchState.value) return
  isLoadingParityGitBranchState.value = true
  parityError.value = ''
  parityGitBranchSummary.value = ''
  parityCurrentBranchName.value = ''
  try {
    const state = await getGitBranchState(cwd)
    const branch = state.currentBranch || '(detached)'
    const detached = state.currentBranch ? 'no' : 'yes'
    parityCurrentBranchName.value = state.currentBranch?.trim() || ''
    parityGitBranchSummary.value = `branch=${branch} · detached=${detached}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load git branch state'
  } finally {
    isLoadingParityGitBranchState.value = false
  }
}

function onUseCurrentParityBranchForCheckout(): void {
  const branch = parityCurrentBranchName.value.trim()
  if (!branch) return
  parityCheckoutBranchDraft.value = branch
}

function onClearParityBranchDrafts(): void {
  parityCheckoutBranchDraft.value = ''
  parityCurrentBranchName.value = ''
  parityWorktreeBranchOptionValues.value = []
  parityWorktreeBranchOptionsSummary.value = ''
}

function onClearParityBranchSummaries(): void {
  parityGitBranchSummary.value = ''
  parityWorktreeBranchOptionsSummary.value = ''
}

async function onCheckoutParityBranch(): Promise<void> {
  const cwd = selectedThread.value?.cwd?.trim() ?? ''
  const targetBranch = parityCheckoutBranchDraft.value.trim()
  if (!cwd || !targetBranch || isCheckingOutParityBranch.value) return
  isCheckingOutParityBranch.value = true
  parityError.value = ''
  try {
    const startedAt = Date.now()
    const branch = await checkoutGitBranch(cwd, targetBranch)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityGitBranchSummary.value = `branch=${branch || targetBranch} · checkout=yes · durationMs=${durationMs}`
    await onLoadParityWorktreeBranchOptions()
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to checkout branch'
  } finally {
    isCheckingOutParityBranch.value = false
  }
}

async function onLoadParityWorktreeBranchOptions(): Promise<void> {
  const cwd = selectedThread.value?.cwd?.trim() ?? ''
  if (!cwd || isLoadingParityWorktreeBranchOptions.value) return
  isLoadingParityWorktreeBranchOptions.value = true
  parityError.value = ''
  parityWorktreeBranchOptionsSummary.value = ''
  parityWorktreeBranchOptionValues.value = []
  try {
    const options = await getWorktreeBranchOptions(cwd)
    parityWorktreeBranchOptionValues.value = options
      .map((option) => option.value.trim())
      .filter((value) => value.length > 0)
    parityWorktreeBranchOptionsSummary.value = options.length > 0
      ? `count=${options.length} · ${options.slice(0, 5).map((option) => option.value).join(', ')}`
      : 'No branch options returned'
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load worktree branch options'
  } finally {
    isLoadingParityWorktreeBranchOptions.value = false
  }
}

function onUseFirstParityBranchOption(): void {
  const nextBranch = parityWorktreeBranchOptionValues.value[0]
  if (!nextBranch) return
  parityCheckoutBranchDraft.value = nextBranch
}

async function onUnarchiveThreadById(): Promise<void> {
  const threadId = unarchiveThreadIdDraft.value.trim()
  if (!threadId) return
  await unarchiveThreadById(threadId)
  unarchiveThreadIdDraft.value = ''
  await loadParityArchivedThreads()
}

function onClearParityUnarchiveThreadDraft(): void {
  unarchiveThreadIdDraft.value = ''
}

function onUseSelectedThreadIdForUnarchive(): void {
  const threadId = selectedThreadId.value.trim()
  if (!threadId) return
  unarchiveThreadIdDraft.value = threadId
}

function onClearParityArchivedActionResult(): void {
  parityThreadActionResult.value = ''
}

async function onUnarchiveArchivedThread(threadId: string): Promise<void> {
  await unarchiveThreadById(threadId)
  await loadParityArchivedThreads()
}

function readParityArchivedLimit(): number {
  const parsed = Number.parseInt(parityArchivedLimitDraft.value.trim(), 10)
  if (!Number.isFinite(parsed)) return 12
  return Math.max(1, Math.min(200, parsed))
}

async function onReloadArchivedThreadsWithLimit(): Promise<void> {
  await loadParityArchivedThreads()
}

function onSetParityArchivedLimitDefault(): void {
  parityArchivedLimitDraft.value = '12'
}

function onClearParityArchivedLimitDraft(): void {
  parityArchivedLimitDraft.value = ''
}

function onClearParityArchivedThreadsCache(): void {
  parityArchivedThreads.value = []
}

async function loadParityArchivedThreads(): Promise<void> {
  if (isLoadingParityArchivedThreads.value) return
  isLoadingParityArchivedThreads.value = true
  parityError.value = ''
  try {
    parityArchivedThreads.value = await getArchivedThreads(readParityArchivedLimit())
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load archived threads'
  } finally {
    isLoadingParityArchivedThreads.value = false
  }
}

async function onLoadParitySelectedThreadDetail(): Promise<void> {
  const threadId = selectedThreadId.value.trim()
  if (!threadId || isLoadingParityThreadDetail.value) return
  isLoadingParityThreadDetail.value = true
  parityError.value = ''
  parityThreadDetailSummary.value = ''
  parityKnownActiveTurnId.value = ''
  try {
    const startedAt = Date.now()
    const detail = await getThreadDetail(threadId)
    const fileChangeCount = detail.messages.filter((message) => message.messageType === 'fileChange').length
    const messageTypeCounts = new Map<string, number>()
    for (const message of detail.messages) {
      const messageType = (message.messageType || '').trim() || 'text'
      messageTypeCounts.set(messageType, (messageTypeCounts.get(messageType) ?? 0) + 1)
    }
    const messageTypeSummary = Array.from(messageTypeCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 4)
      .map(([messageType, count]) => `${messageType}:${count}`)
      .join(', ')
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityKnownActiveTurnId.value = (detail.activeTurnId || '').trim()
    parityThreadDetailSummary.value = `messages=${detail.messages.length} · fileChanges=${fileChangeCount} · types=${messageTypeSummary || 'n/a'} · inProgress=${detail.inProgress ? 'yes' : 'no'} · activeTurn=${detail.activeTurnId || '(none)'} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load selected thread detail'
  } finally {
    isLoadingParityThreadDetail.value = false
  }
}

async function onLoadParitySelectedThreadMessages(): Promise<void> {
  const threadId = selectedThreadId.value.trim()
  if (!threadId || isLoadingParityThreadMessages.value) return
  isLoadingParityThreadMessages.value = true
  parityError.value = ''
  parityThreadMessagesSummary.value = ''
  try {
    const startedAt = Date.now()
    const messages = await getThreadMessages(threadId)
    const roleCount = new Map<string, number>()
    for (const message of messages) {
      const role = (message.role || '').trim() || 'unknown'
      roleCount.set(role, (roleCount.get(role) ?? 0) + 1)
    }
    const roleSummary = Array.from(roleCount.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 4)
      .map(([role, count]) => `${role}:${count}`)
      .join(', ')
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadMessagesSummary.value = `persisted messages=${messages.length}${roleSummary ? ` · roles=${roleSummary}` : ''} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load selected thread messages'
  } finally {
    isLoadingParityThreadMessages.value = false
  }
}

async function onLoadParitySelectedThreadReviewResult(): Promise<void> {
  const threadId = selectedThreadId.value.trim()
  if (!threadId || isLoadingParityThreadReview.value) return
  isLoadingParityThreadReview.value = true
  parityError.value = ''
  parityThreadReviewSummary.value = ''
  try {
    const startedAt = Date.now()
    const review = await getThreadReviewResult(threadId)
    const label = review.enteredReviewLabel || '(none)'
    const findingCount = review.result?.findings?.length ?? 0
    const status = review.result ? 'available' : 'none'
    const severities = (review.result?.findings || [])
      .map((finding) => {
        const text = `${finding.title} ${finding.rawText}`
        const match = text.match(/\[P([0-3])\]/i)
        return match ? Number.parseInt(match[1], 10) : null
      })
      .filter((value): value is number => value !== null && Number.isInteger(value) && value >= 0)
    const topSeverity = severities.length > 0 ? `P${Math.min(...severities)}` : 'n/a'
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadReviewSummary.value = `review label=${label} · status=${status} · findings=${findingCount} · topSeverity=${topSeverity} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load selected thread review result'
  } finally {
    isLoadingParityThreadReview.value = false
  }
}

async function onLoadParityThreadByIdDetail(): Promise<void> {
  const threadId = parityReadThreadIdDraft.value.trim()
  if (!threadId || isLoadingParityThreadByIdDetail.value) return
  isLoadingParityThreadByIdDetail.value = true
  parityError.value = ''
  parityThreadDetailSummary.value = ''
  parityKnownActiveTurnId.value = ''
  try {
    const startedAt = Date.now()
    const detail = await getThreadDetail(threadId)
    const fileChangeCount = detail.messages.filter((message) => message.messageType === 'fileChange').length
    const messageTypeCounts = new Map<string, number>()
    for (const message of detail.messages) {
      const messageType = (message.messageType || '').trim() || 'text'
      messageTypeCounts.set(messageType, (messageTypeCounts.get(messageType) ?? 0) + 1)
    }
    const messageTypeSummary = Array.from(messageTypeCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 4)
      .map(([messageType, count]) => `${messageType}:${count}`)
      .join(', ')
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityKnownActiveTurnId.value = (detail.activeTurnId || '').trim()
    parityThreadDetailSummary.value = `thread=${threadId} · messages=${detail.messages.length} · fileChanges=${fileChangeCount} · types=${messageTypeSummary || 'n/a'} · inProgress=${detail.inProgress ? 'yes' : 'no'} · activeTurn=${detail.activeTurnId || '(none)'} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load thread detail by id'
  } finally {
    isLoadingParityThreadByIdDetail.value = false
  }
}

async function onLoadParityThreadByIdMessages(): Promise<void> {
  const threadId = parityReadThreadIdDraft.value.trim()
  if (!threadId || isLoadingParityThreadByIdMessages.value) return
  isLoadingParityThreadByIdMessages.value = true
  parityError.value = ''
  parityThreadMessagesSummary.value = ''
  try {
    const startedAt = Date.now()
    const messages = await getThreadMessages(threadId)
    const roleCount = new Map<string, number>()
    for (const message of messages) {
      const role = (message.role || '').trim() || 'unknown'
      roleCount.set(role, (roleCount.get(role) ?? 0) + 1)
    }
    const roleSummary = Array.from(roleCount.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 4)
      .map(([role, count]) => `${role}:${count}`)
      .join(', ')
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadMessagesSummary.value = `thread=${threadId} · persisted messages=${messages.length}${roleSummary ? ` · roles=${roleSummary}` : ''} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load thread messages by id'
  } finally {
    isLoadingParityThreadByIdMessages.value = false
  }
}

async function onLoadParityThreadByIdReview(): Promise<void> {
  const threadId = parityReadThreadIdDraft.value.trim()
  if (!threadId || isLoadingParityThreadByIdReview.value) return
  isLoadingParityThreadByIdReview.value = true
  parityError.value = ''
  parityThreadReviewSummary.value = ''
  try {
    const startedAt = Date.now()
    const review = await getThreadReviewResult(threadId)
    const label = review.enteredReviewLabel || '(none)'
    const findingCount = review.result?.findings?.length ?? 0
    const status = review.result ? 'available' : 'none'
    const severities = (review.result?.findings || [])
      .map((finding) => {
        const text = `${finding.title} ${finding.rawText}`
        const match = text.match(/\[P([0-3])\]/i)
        return match ? Number.parseInt(match[1], 10) : null
      })
      .filter((value): value is number => value !== null && Number.isInteger(value) && value >= 0)
    const topSeverity = severities.length > 0 ? `P${Math.min(...severities)}` : 'n/a'
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadReviewSummary.value = `thread=${threadId} · review label=${label} · status=${status} · findings=${findingCount} · topSeverity=${topSeverity} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load thread review by id'
  } finally {
    isLoadingParityThreadByIdReview.value = false
  }
}

function onUseSelectedThreadIdForParityRead(): void {
  const threadId = selectedThreadId.value.trim()
  if (!threadId) return
  parityReadThreadIdDraft.value = threadId
}

function onClearParityThreadByIdDrafts(): void {
  parityReadThreadIdDraft.value = ''
  parityThreadDetailSummary.value = ''
  parityThreadMessagesSummary.value = ''
  parityThreadReviewSummary.value = ''
  parityKnownActiveTurnId.value = ''
}

function onClearParitySelectedThreadDiagnostics(): void {
  parityThreadDetailSummary.value = ''
  parityThreadMessagesSummary.value = ''
  parityThreadReviewSummary.value = ''
  parityKnownActiveTurnId.value = ''
}

async function onInitializeParityReviewGit(): Promise<void> {
  const cwd = selectedThread.value?.cwd?.trim() || ''
  if (!cwd || isInitializingParityReviewGit.value) return
  isInitializingParityReviewGit.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    const startedAt = Date.now()
    await initializeReviewGit(cwd)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadActionResult.value = `Initialized review git for ${cwd} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to initialize review git'
  } finally {
    isInitializingParityReviewGit.value = false
  }
}

async function onStartParityThreadReview(): Promise<void> {
  const threadId = selectedThreadId.value.trim()
  if (!threadId || isStartingParityThreadReview.value) return
  isStartingParityThreadReview.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    const startedAt = Date.now()
    const baseBranch = parityReviewBaseBranchDraft.value.trim() || null
    await startThreadReview(threadId, parityReviewScopeDraft.value, parityReviewWorkspaceViewDraft.value, baseBranch)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadActionResult.value = `Started review for ${threadId} · scope=${parityReviewScopeDraft.value} · view=${parityReviewWorkspaceViewDraft.value} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to start thread review'
  } finally {
    isStartingParityThreadReview.value = false
  }
}

async function onLoadParityReviewSnapshot(): Promise<void> {
  const cwd = selectedThread.value?.cwd?.trim() || ''
  if (!cwd || isLoadingParityReviewSnapshot.value) return
  isLoadingParityReviewSnapshot.value = true
  parityError.value = ''
  parityReviewSnapshotSummary.value = ''
  try {
    const startedAt = Date.now()
    const baseBranch = parityReviewBaseBranchDraft.value.trim() || null
    const snapshot = await getReviewSnapshot(cwd, parityReviewScopeDraft.value, parityReviewWorkspaceViewDraft.value, baseBranch)
    const fileCount = Array.isArray(snapshot.files) ? snapshot.files.length : 0
    const addedLineCount = snapshot.summary?.addedLineCount ?? 0
    const removedLineCount = snapshot.summary?.removedLineCount ?? 0
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityReviewSnapshotSummary.value = `files=${fileCount} · +${addedLineCount}/-${removedLineCount} · scope=${snapshot.scope} · view=${snapshot.workspaceView} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load review snapshot'
  } finally {
    isLoadingParityReviewSnapshot.value = false
  }
}

async function onApplyParityReviewAction(): Promise<void> {
  const cwd = selectedThread.value?.cwd?.trim() || ''
  if (!cwd || isApplyingParityReviewAction.value) return
  const level = parityReviewActionLevelDraft.value
  const path = parityReviewActionPathDraft.value.trim()
  if ((level === 'file' || level === 'hunk') && !path) return
  isApplyingParityReviewAction.value = true
  parityError.value = ''
  try {
    const startedAt = Date.now()
    const snapshot = await applyReviewAction({
      cwd,
      scope: parityReviewScopeDraft.value,
      workspaceView: parityReviewWorkspaceViewDraft.value,
      action: parityReviewActionDraft.value,
      level,
      path: path || undefined,
    })
    const durationMs = Math.max(0, Date.now() - startedAt)
    const fileCount = Array.isArray(snapshot.files) ? snapshot.files.length : 0
    const addedLineCount = snapshot.summary?.addedLineCount ?? 0
    const removedLineCount = snapshot.summary?.removedLineCount ?? 0
    parityReviewSnapshotSummary.value = `applied ${parityReviewActionDraft.value}/${level}${path ? ` (${path})` : ''} · files=${fileCount} · +${addedLineCount}/-${removedLineCount} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to apply review action'
  } finally {
    isApplyingParityReviewAction.value = false
  }
}

function onClearParityReviewDrafts(): void {
  parityReviewBaseBranchDraft.value = ''
  parityReviewActionPathDraft.value = ''
  parityReviewSnapshotSummary.value = ''
}

async function onResumeParityThread(): Promise<void> {
  const threadId = selectedThreadId.value.trim()
  if (!threadId || isResumingParityThread.value) return
  isResumingParityThread.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    const result = await resumeThread(threadId)
    parityThreadActionResult.value = `Resumed ${threadId} (model=${result.model || 'unknown'})`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to resume current thread'
  } finally {
    isResumingParityThread.value = false
  }
}

async function onStartParityThread(): Promise<void> {
  if (isStartingParityThread.value) return
  isStartingParityThread.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    const startedAt = Date.now()
    const result = await startThread(
      parityStartThreadCwdDraft.value.trim() || undefined,
      parityStartThreadModelDraft.value.trim() || undefined,
    )
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadActionResult.value = `Started thread ${result.threadId} · model=${result.model || 'unknown'} · durationMs=${durationMs}`
    await refreshAll()
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to start thread'
  } finally {
    isStartingParityThread.value = false
  }
}

function onUseSelectedThreadCwdForStartThread(): void {
  const cwd = selectedThread.value?.cwd?.trim() ?? ''
  if (!cwd) return
  parityStartThreadCwdDraft.value = cwd
}

async function onCopyStartThreadCwdDraft(): Promise<void> {
  const cwd = parityStartThreadCwdDraft.value.trim()
  if (!cwd) return
  const copied = await copyTextToClipboard(cwd)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied start-thread cwd'
    return
  }
  parityError.value = 'Failed to copy start-thread cwd'
}

function onUseSelectedModelForStartThread(): void {
  const model = selectedModelId.value.trim()
  if (!model) return
  parityStartThreadModelDraft.value = model
}

async function onCopySelectedModelForStartThread(): Promise<void> {
  const model = selectedModelId.value.trim()
  if (!model) return
  const copied = await copyTextToClipboard(model)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied selected model'
    return
  }
  parityError.value = 'Failed to copy selected model'
}

async function onCopyStartThreadModelDraft(): Promise<void> {
  const model = parityStartThreadModelDraft.value.trim()
  if (!model) return
  const copied = await copyTextToClipboard(model)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied start-thread model'
    return
  }
  parityError.value = 'Failed to copy start-thread model'
}

function onClearParityStartThreadDrafts(): void {
  parityStartThreadCwdDraft.value = ''
  parityStartThreadModelDraft.value = ''
}

async function onArchiveParityThreadDirect(): Promise<void> {
  const threadId = parityDirectThreadIdDraft.value.trim()
  if (!threadId || isArchivingParityThreadDirect.value) return
  isArchivingParityThreadDirect.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    const startedAt = Date.now()
    await archiveThread(threadId)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadActionResult.value = `Archived ${threadId} (direct) · durationMs=${durationMs}`
    await loadParityArchivedThreads()
    await refreshAll()
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to archive thread by id'
  } finally {
    isArchivingParityThreadDirect.value = false
  }
}

async function onUnarchiveParityThreadDirect(): Promise<void> {
  const threadId = parityDirectThreadIdDraft.value.trim()
  if (!threadId || isUnarchivingParityThreadDirect.value) return
  isUnarchivingParityThreadDirect.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    const startedAt = Date.now()
    await unarchiveThread(threadId)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadActionResult.value = `Unarchived ${threadId} (direct) · durationMs=${durationMs}`
    await loadParityArchivedThreads()
    await refreshAll()
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to unarchive thread by id'
  } finally {
    isUnarchivingParityThreadDirect.value = false
  }
}

async function onRenameParityThreadDirect(): Promise<void> {
  const threadId = parityDirectThreadIdDraft.value.trim()
  const nextName = parityDirectThreadNameDraft.value.trim()
  if (!threadId || !nextName || isRenamingParityThreadDirect.value) return
  isRenamingParityThreadDirect.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    const startedAt = Date.now()
    await renameThread(threadId, nextName)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadActionResult.value = `Renamed ${threadId} to "${nextName}" (direct) · durationMs=${durationMs}`
    await refreshAll()
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to rename thread by id'
  } finally {
    isRenamingParityThreadDirect.value = false
  }
}

async function onForkParityThreadDirect(): Promise<void> {
  const threadId = parityDirectThreadIdDraft.value.trim()
  if (!threadId || isForkingParityThreadDirect.value) return
  isForkingParityThreadDirect.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    const startedAt = Date.now()
    const result = await forkThread(threadId)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadActionResult.value = `Forked ${threadId} -> ${result.threadId} (direct) · durationMs=${durationMs}`
    await refreshAll()
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to fork thread by id'
  } finally {
    isForkingParityThreadDirect.value = false
  }
}

function onClearParityDirectThreadDrafts(): void {
  parityDirectThreadIdDraft.value = ''
  parityDirectThreadNameDraft.value = ''
}

function onUseSelectedThreadIdForDirectThreadActions(): void {
  const threadId = selectedThreadId.value.trim()
  if (!threadId) return
  parityDirectThreadIdDraft.value = threadId
}

function onUseSelectedThreadTitleForDirectRename(): void {
  const title = selectedThread.value?.title?.trim() ?? ''
  if (!title) return
  parityDirectThreadNameDraft.value = title
}

async function onCopySelectedThreadTitleForDirectRename(): Promise<void> {
  const title = selectedThread.value?.title?.trim() ?? ''
  if (!title) return
  const copied = await copyTextToClipboard(title)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied selected thread title'
    return
  }
  parityError.value = 'Failed to copy selected thread title'
}

async function onCopySelectedThreadId(): Promise<void> {
  const threadId = selectedThreadId.value.trim()
  if (!threadId) return
  const copied = await copyTextToClipboard(threadId)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied selected thread id'
    return
  }
  parityError.value = 'Failed to copy selected thread id'
}

async function onCopyDirectThreadIdDraft(): Promise<void> {
  const threadId = parityDirectThreadIdDraft.value.trim()
  if (!threadId) return
  const copied = await copyTextToClipboard(threadId)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied direct thread id'
    return
  }
  parityError.value = 'Failed to copy direct thread id'
}

async function onCopyDirectThreadNameDraft(): Promise<void> {
  const name = parityDirectThreadNameDraft.value.trim()
  if (!name) return
  const copied = await copyTextToClipboard(name)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied direct thread name'
    return
  }
  parityError.value = 'Failed to copy direct thread name'
}

async function onArchiveParityThread(): Promise<void> {
  const threadId = selectedThreadId.value.trim()
  if (!threadId || isArchivingParityThread.value) return
  isArchivingParityThread.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    await archiveThreadById(threadId)
    parityThreadActionResult.value = `Archived ${threadId}`
    await loadParityArchivedThreads()
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to archive current thread'
  } finally {
    isArchivingParityThread.value = false
  }
}

async function onCompactParityThread(): Promise<void> {
  const threadId = selectedThreadId.value.trim()
  if (!threadId || isCompactingParityThread.value) return
  isCompactingParityThread.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    await compactThread(threadId)
    parityThreadActionResult.value = `Compaction started for ${threadId}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to compact current thread'
  } finally {
    isCompactingParityThread.value = false
  }
}

async function onCleanParityBackgroundTerminals(): Promise<void> {
  const threadId = selectedThreadId.value.trim()
  if (!threadId || isCleaningParityBackgroundTerminals.value) return
  isCleaningParityBackgroundTerminals.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    await cleanSelectedThreadBackgroundTerminals()
    parityThreadActionResult.value = `Background terminals cleaned for ${threadId}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to clean background terminals'
  } finally {
    isCleaningParityBackgroundTerminals.value = false
  }
}

async function onCleanParityBackgroundTerminalsById(): Promise<void> {
  const threadId = parityCleanThreadIdDraft.value.trim()
  if (!threadId || isCleaningParityThreadById.value) return
  isCleaningParityThreadById.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    const startedAt = Date.now()
    await cleanThreadBackgroundTerminals(threadId)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityThreadActionResult.value = `Background terminals cleaned (direct) for ${threadId} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to clean background terminals by thread id'
  } finally {
    isCleaningParityThreadById.value = false
  }
}

function onUseSelectedThreadIdForDirectClean(): void {
  const threadId = selectedThreadId.value.trim()
  if (!threadId) return
  parityCleanThreadIdDraft.value = threadId
}

function onClearParityDirectCleanDraft(): void {
  parityCleanThreadIdDraft.value = ''
}

async function onCopyCleanThreadIdDraft(): Promise<void> {
  const threadId = parityCleanThreadIdDraft.value.trim()
  if (!threadId) return
  const copied = await copyTextToClipboard(threadId)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied clean thread id'
    return
  }
  parityError.value = 'Failed to copy clean thread id'
}

async function onRollbackParityThread(): Promise<void> {
  const threadId = selectedThreadId.value.trim()
  const rollbackTurns = Number.parseInt(parityRollbackTurnsDraft.value, 10)
  if (!threadId || isRollingBackParityThread.value || !Number.isFinite(rollbackTurns) || rollbackTurns < 1) return
  isRollingBackParityThread.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    const messages = await rollbackThread(threadId, rollbackTurns)
    parityThreadActionResult.value = `Rolled back ${threadId} by ${rollbackTurns} turn(s) · messageCount=${messages.length}`
    await refreshAll()
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to rollback current thread'
  } finally {
    isRollingBackParityThread.value = false
  }
}

function onSetParityRollbackTurnsDefault(): void {
  parityRollbackTurnsDraft.value = '1'
}

function onClearParityRollbackDraft(): void {
  parityRollbackTurnsDraft.value = ''
}

async function onCopyRollbackTurnsDraft(): Promise<void> {
  const turns = parityRollbackTurnsDraft.value.trim()
  if (!turns) return
  const copied = await copyTextToClipboard(turns)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied rollback turns'
    return
  }
  parityError.value = 'Failed to copy rollback turns'
}

async function onRevertParityThreadFiles(): Promise<void> {
  const threadId = selectedThreadId.value.trim()
  const turnId = parityRevertTurnIdDraft.value.trim()
  const cwd = parityRevertCwdDraft.value.trim() || selectedThread.value?.cwd?.trim() || ''
  if (!threadId || !turnId || !cwd || isRevertingParityThreadFiles.value) return
  isRevertingParityThreadFiles.value = true
  parityError.value = ''
  parityThreadActionResult.value = ''
  try {
    const result = await revertThreadFileChanges(threadId, turnId, cwd)
    const errorSummary = result.errors.length > 0 ? ` · errors=${result.errors.length}` : ''
    parityThreadActionResult.value = `Reverted files for ${threadId} on turn ${turnId} · reverted=${result.reverted}${errorSummary}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to revert thread file changes'
  } finally {
    isRevertingParityThreadFiles.value = false
  }
}

function onUseSelectedThreadCwdForRevert(): void {
  const cwd = selectedThread.value?.cwd?.trim() ?? ''
  if (!cwd) return
  parityRevertCwdDraft.value = cwd
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = text.trim()
  if (!value) return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // Continue to fallback copy path.
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

async function onCopySelectedThreadCwd(): Promise<void> {
  const cwd = selectedThread.value?.cwd?.trim() ?? ''
  if (!cwd) return
  const copied = await copyTextToClipboard(cwd)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied selected thread cwd'
    return
  }
  parityError.value = 'Failed to copy selected thread cwd'
}

function onClearParityRevertDrafts(): void {
  parityRevertTurnIdDraft.value = ''
  parityRevertCwdDraft.value = ''
}

async function onCopyRevertTurnIdDraft(): Promise<void> {
  const turnId = parityRevertTurnIdDraft.value.trim()
  if (!turnId) return
  const copied = await copyTextToClipboard(turnId)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied revert turn id'
    return
  }
  parityError.value = 'Failed to copy revert turn id'
}

async function onCopyRevertCwdDraft(): Promise<void> {
  const cwd = parityRevertCwdDraft.value.trim()
  if (!cwd) return
  const copied = await copyTextToClipboard(cwd)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied revert cwd'
    return
  }
  parityError.value = 'Failed to copy revert cwd'
}

function onClearParityRollbackRevertResult(): void {
  parityThreadActionResult.value = ''
}

function onResetParityRollbackRevertControls(): void {
  parityRollbackTurnsDraft.value = ''
  parityRevertTurnIdDraft.value = ''
  parityRevertCwdDraft.value = ''
  parityThreadActionResult.value = ''
}

async function onRunParityCommand(): Promise<void> {
  const command = parityCommandDraft.value.trim()
  if (!command || isRunningParityCommand.value) return
  isRunningParityCommand.value = true
  parityError.value = ''
  try {
    const startedAt = Date.now()
    const cwd = selectedThread.value?.cwd?.trim() || null
    const result = await executeCommand(command, cwd)
    const durationMs = Math.max(0, Date.now() - startedAt)
    const chunks: string[] = [`exitCode=${result.exitCode}`, `durationMs=${durationMs}`]
    if (result.stdout.trim().length > 0) {
      chunks.push(`stdout:\n${result.stdout.trimEnd()}`)
    }
    if (result.stderr.trim().length > 0) {
      chunks.push(`stderr:\n${result.stderr.trimEnd()}`)
    }
    parityCommandOutput.value = chunks.join('\n\n')
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to run command'
  } finally {
    isRunningParityCommand.value = false
  }
}

function onClearParityCommandDrafts(): void {
  parityCommandDraft.value = ''
  parityCommandOutput.value = ''
}

function onClearParityCommandInputOnly(): void {
  parityCommandDraft.value = ''
}

async function onCopyParityCommandInput(): Promise<void> {
  const command = parityCommandDraft.value.trim()
  if (!command) return
  const copied = await copyTextToClipboard(command)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied command input'
    return
  }
  parityError.value = 'Failed to copy command input'
}

async function onCopyParityCommandOutput(): Promise<void> {
  const output = parityCommandOutput.value.trim()
  if (!output) return
  const copied = await copyTextToClipboard(output)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied command output'
    return
  }
  parityError.value = 'Failed to copy command output'
}

function onParityUploadFileSelected(event: Event): void {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0] ?? null
  parityUploadFileObject.value = file
  parityUploadFileName.value = file?.name ?? ''
  parityUploadResult.value = ''
}

async function onUploadParityFile(): Promise<void> {
  const file = parityUploadFileObject.value
  if (!file || isUploadingParityFile.value) return
  isUploadingParityFile.value = true
  parityError.value = ''
  parityUploadResult.value = ''
  try {
    const startedAt = Date.now()
    const path = await uploadFile(file)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityUploadResult.value = path
      ? `uploaded=${path} · durationMs=${durationMs}`
      : `upload failed · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to upload file'
  } finally {
    isUploadingParityFile.value = false
  }
}

function onClearParityUploadDraft(): void {
  parityUploadFileObject.value = null
  parityUploadFileName.value = ''
  parityUploadResult.value = ''
}

function onClearParityUploadResult(): void {
  parityUploadResult.value = ''
}

async function onCopyParityUploadFileName(): Promise<void> {
  const fileName = parityUploadFileName.value.trim()
  if (!fileName) return
  const copied = await copyTextToClipboard(fileName)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied upload file name'
    return
  }
  parityError.value = 'Failed to copy upload file name'
}

async function onCopyParityUploadResult(): Promise<void> {
  const uploadResult = parityUploadResult.value.trim()
  if (!uploadResult) return
  const copied = await copyTextToClipboard(uploadResult)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied upload result'
    return
  }
  parityError.value = 'Failed to copy upload result'
}

function onClearParityTurnResults(): void {
  paritySteerResult.value = ''
  parityInterruptResult.value = ''
}

async function onCopyParitySteerInstruction(): Promise<void> {
  const text = paritySteerText.value.trim()
  if (!text) return
  const copied = await copyTextToClipboard(text)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied steer instruction'
    return
  }
  parityError.value = 'Failed to copy steer instruction'
}

async function onSteerParityTurn(): Promise<void> {
  const text = paritySteerText.value.trim()
  if (!text || isSteeringParityTurn.value || !isSelectedThreadInProgress.value) return
  isSteeringParityTurn.value = true
  parityError.value = ''
  paritySteerResult.value = ''
  try {
    await sendMessageToSelectedThread(text, [], [], 'steer', [])
    paritySteerResult.value = 'Steer message sent'
    paritySteerText.value = ''
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to steer active turn'
  } finally {
    isSteeringParityTurn.value = false
  }
}

async function onStartParityTurnDirect(): Promise<void> {
  const threadId = parityStartTurnThreadIdDraft.value.trim()
  const text = parityStartTurnTextDraft.value.trim()
  if (!threadId || !text || isStartingParityTurnDirect.value) return
  isStartingParityTurnDirect.value = true
  parityError.value = ''
  paritySteerResult.value = ''
  try {
    const startedAt = Date.now()
    const turnId = await startThreadTurn(threadId, text, [])
    const durationMs = Math.max(0, Date.now() - startedAt)
    paritySteerResult.value = `Direct turn started (thread=${threadId}, turn=${turnId || 'n/a'}) · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to start turn directly'
  } finally {
    isStartingParityTurnDirect.value = false
  }
}

async function onSteerParityTurnDirect(): Promise<void> {
  const threadId = paritySteerThreadIdDraft.value.trim()
  const expectedTurnId = paritySteerExpectedTurnIdDraft.value.trim()
  const text = paritySteerDirectTextDraft.value.trim()
  if (!threadId || !expectedTurnId || !text || isSteeringParityTurnDirect.value) return
  isSteeringParityTurnDirect.value = true
  parityError.value = ''
  paritySteerResult.value = ''
  try {
    const startedAt = Date.now()
    const nextTurnId = await steerThreadTurn(threadId, expectedTurnId, text, [])
    const durationMs = Math.max(0, Date.now() - startedAt)
    paritySteerResult.value = `Direct steer sent (thread=${threadId}, expectedTurn=${expectedTurnId}, turn=${nextTurnId || 'n/a'}) · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to steer turn directly'
  } finally {
    isSteeringParityTurnDirect.value = false
  }
}

function onClearParityDirectTurnDrafts(): void {
  parityStartTurnThreadIdDraft.value = ''
  parityStartTurnTextDraft.value = ''
  paritySteerThreadIdDraft.value = ''
  paritySteerExpectedTurnIdDraft.value = ''
  paritySteerDirectTextDraft.value = ''
}

function onUseSelectedThreadIdForDirectTurnDrafts(): void {
  const threadId = selectedThreadId.value.trim()
  if (!threadId) return
  parityStartTurnThreadIdDraft.value = threadId
  paritySteerThreadIdDraft.value = threadId
}

async function onCopyParityDirectStartTurnText(): Promise<void> {
  const text = parityStartTurnTextDraft.value.trim()
  if (!text) return
  const copied = await copyTextToClipboard(text)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied direct start turn text'
    return
  }
  parityError.value = 'Failed to copy direct start turn text'
}

async function onCopyParityDirectSteerText(): Promise<void> {
  const text = paritySteerDirectTextDraft.value.trim()
  if (!text) return
  const copied = await copyTextToClipboard(text)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied direct steer text'
    return
  }
  parityError.value = 'Failed to copy direct steer text'
}

async function onCopyParityDirectSteerExpectedTurnId(): Promise<void> {
  const expectedTurnId = paritySteerExpectedTurnIdDraft.value.trim()
  if (!expectedTurnId) return
  const copied = await copyTextToClipboard(expectedTurnId)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied expected turn id'
    return
  }
  parityError.value = 'Failed to copy expected turn id'
}

async function onCopyParityDirectSteerThreadId(): Promise<void> {
  const threadId = paritySteerThreadIdDraft.value.trim()
  if (!threadId) return
  const copied = await copyTextToClipboard(threadId)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied direct steer thread id'
    return
  }
  parityError.value = 'Failed to copy direct steer thread id'
}

async function onInterruptParityTurn(): Promise<void> {
  if (isInterruptingTurn.value || !isSelectedThreadInProgress.value) return
  parityError.value = ''
  parityInterruptResult.value = ''
  try {
    await interruptSelectedThreadTurn()
    parityInterruptResult.value = 'Interrupt signal sent'
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to interrupt active turn'
  }
}

function onUseSelectedThreadIdForDirectInterrupt(): void {
  const threadId = selectedThreadId.value.trim()
  if (!threadId) return
  parityInterruptThreadIdDraft.value = threadId
}

function onUseActiveTurnIdForDirectInterrupt(): void {
  const activeTurnId = parityKnownActiveTurnId.value.trim()
  if (!activeTurnId) return
  parityInterruptTurnIdDraft.value = activeTurnId
}

function onClearParityDirectInterruptDrafts(): void {
  parityInterruptThreadIdDraft.value = ''
  parityInterruptTurnIdDraft.value = ''
  parityInterruptResult.value = ''
}

async function onCopyParityDirectInterruptTurnId(): Promise<void> {
  const turnId = parityInterruptTurnIdDraft.value.trim()
  if (!turnId) return
  const copied = await copyTextToClipboard(turnId)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied direct interrupt turn id'
    return
  }
  parityError.value = 'Failed to copy direct interrupt turn id'
}

async function onCopyParityDirectInterruptThreadId(): Promise<void> {
  const threadId = parityInterruptThreadIdDraft.value.trim()
  if (!threadId) return
  const copied = await copyTextToClipboard(threadId)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied direct interrupt thread id'
    return
  }
  parityError.value = 'Failed to copy direct interrupt thread id'
}

async function onDirectInterruptParityTurn(): Promise<void> {
  const threadId = parityInterruptThreadIdDraft.value.trim()
  const turnId = parityInterruptTurnIdDraft.value.trim()
  if (!threadId || !turnId || isDirectInterruptingParityTurn.value) return
  isDirectInterruptingParityTurn.value = true
  parityError.value = ''
  parityInterruptResult.value = ''
  try {
    const startedAt = Date.now()
    await interruptThreadTurn(threadId, turnId)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityInterruptResult.value = `Direct interrupt sent (thread=${threadId}, turn=${turnId}) · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to send direct interrupt'
  } finally {
    isDirectInterruptingParityTurn.value = false
  }
}

async function onSubmitParityFeedback(): Promise<void> {
  if (isSubmittingParityFeedback.value) return
  isSubmittingParityFeedback.value = true
  parityError.value = ''
  parityFeedbackResult.value = ''
  try {
    const response = await uploadFeedback(
      parityFeedbackClassification.value,
      parityFeedbackIncludeLogs.value,
      parityFeedbackReason.value,
      selectedThreadId.value || null,
    )
    parityFeedbackResult.value = response.threadId
      ? `Feedback submitted (threadId=${response.threadId})`
      : 'Feedback submitted'
    parityFeedbackReason.value = ''
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to submit feedback'
  } finally {
    isSubmittingParityFeedback.value = false
  }
}

function onClearParityFeedbackDrafts(): void {
  parityFeedbackClassification.value = 'general'
  parityFeedbackIncludeLogs.value = true
  parityFeedbackReason.value = ''
  parityFeedbackResult.value = ''
}

async function onCopyParityFeedbackReason(): Promise<void> {
  const reason = parityFeedbackReason.value.trim()
  if (!reason) return
  const copied = await copyTextToClipboard(reason)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied feedback reason'
    return
  }
  parityError.value = 'Failed to copy feedback reason'
}

async function onStartParityMcpOauth(): Promise<void> {
  const serverName = parityMcpOauthServerName.value.trim()
  if (!serverName || isStartingParityMcpOauth.value) return
  isStartingParityMcpOauth.value = true
  parityError.value = ''
  parityMcpOauthResult.value = ''
  try {
    const result = await startMcpOauthLogin(serverName)
    if (result.authorizationUrl) {
      parityMcpOauthResult.value = 'Authorization URL opened'
      if (typeof window !== 'undefined') {
        window.open(result.authorizationUrl, '_blank', 'noopener,noreferrer')
      }
    } else {
      parityMcpOauthResult.value = 'OAuth login started'
    }
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to start MCP OAuth login'
  } finally {
    isStartingParityMcpOauth.value = false
  }
}

function onClearParityMcpOauthDrafts(): void {
  parityMcpOauthServerName.value = ''
  parityMcpOauthResult.value = ''
}

async function onCopyParityMcpOauthServerName(): Promise<void> {
  const serverName = parityMcpOauthServerName.value.trim()
  if (!serverName) return
  const copied = await copyTextToClipboard(serverName)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied OAuth server name'
    return
  }
  parityError.value = 'Failed to copy OAuth server name'
}

async function onCopyParityMcpOauthResult(): Promise<void> {
  const oauthResult = parityMcpOauthResult.value.trim()
  if (!oauthResult) return
  const copied = await copyTextToClipboard(oauthResult)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied OAuth result'
    return
  }
  parityError.value = 'Failed to copy OAuth result'
}

async function onWriteParityConfig(): Promise<void> {
  if (isWritingParityConfig.value) return
  isWritingParityConfig.value = true
  parityError.value = ''
  parityConfigWriteResult.value = ''
  try {
    const approvalPolicy = parityApprovalPolicy.value.trim()
    const sandboxMode = paritySandboxMode.value.trim()
    const networkAccess = paritySandboxNetworkAccess.value === 'enabled'
    const webSearchMode = parityWebSearchMode.value.trim()
    await writeConfigBatch([
      { keyPath: 'approval_policy', value: approvalPolicy, mergeStrategy: 'replace' },
      { keyPath: 'sandbox_mode', value: sandboxMode, mergeStrategy: 'replace' },
      { keyPath: 'sandbox_workspace_write.network_access', value: networkAccess, mergeStrategy: 'upsert' },
      { keyPath: 'web_search', value: webSearchMode, mergeStrategy: 'replace' },
    ])
    parityConfigRead.value = await readConfigSummary()
    parityConfigWriteResult.value = `Saved approval_policy=${approvalPolicy}, sandbox_mode=${sandboxMode}, network_access=${networkAccess ? 'enabled' : 'disabled'}, web_search=${webSearchMode}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to write config values'
  } finally {
    isWritingParityConfig.value = false
  }
}

function parseParityConfigValue(raw: string): unknown {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const numeric = Number.parseFloat(trimmed)
    if (Number.isFinite(numeric)) return numeric
  }
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    try {
      return JSON.parse(trimmed) as unknown
    } catch {
      return trimmed
    }
  }
  return trimmed
}

async function onWriteParityConfigKeyValue(): Promise<void> {
  const keyPath = parityConfigKeyDraft.value.trim()
  if (!keyPath || isWritingParityConfigKeyValue.value) return
  isWritingParityConfigKeyValue.value = true
  parityError.value = ''
  try {
    const startedAt = Date.now()
    const value = parseParityConfigValue(parityConfigValueDraft.value)
    const mergeStrategy = parityConfigMergeStrategyDraft.value
    await writeConfigValue(keyPath, value, mergeStrategy)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityConfigWriteResult.value = `Wrote ${keyPath}=${typeof value === 'string' ? value : JSON.stringify(value)} · merge=${mergeStrategy} · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to write config key/value'
  } finally {
    isWritingParityConfigKeyValue.value = false
  }
}

async function onWriteParityConfigBatchJson(): Promise<void> {
  const raw = parityConfigBatchDraft.value.trim()
  if (!raw || isWritingParityConfigBatch.value) return
  isWritingParityConfigBatch.value = true
  parityError.value = ''
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Batch JSON must be a non-empty array')
    }
    const operations = parsed.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new Error('Each batch item must be an object')
      }
      const row = item as Record<string, unknown>
      const keyPath = typeof row.keyPath === 'string' ? row.keyPath.trim() : ''
      if (!keyPath) throw new Error('Each batch item must include keyPath')
      const mergeStrategy: 'replace' | 'upsert' = row.mergeStrategy === 'replace' ? 'replace' : 'upsert'
      return {
        keyPath,
        value: row.value,
        mergeStrategy,
      }
    })

    const startedAt = Date.now()
    await writeConfigBatch(operations)
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityConfigWriteResult.value = `Wrote config batch (${operations.length} op) · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to write config batch JSON'
  } finally {
    isWritingParityConfigBatch.value = false
  }
}

function onFillParityConfigBatchTemplate(): void {
  parityConfigBatchDraft.value = JSON.stringify([
    { keyPath: 'approval_policy', value: 'on-request', mergeStrategy: 'replace' },
    { keyPath: 'web_search', value: 'live', mergeStrategy: 'replace' },
    { keyPath: 'experimental_features.sample_flag', value: true, mergeStrategy: 'upsert' },
  ])
}

function onClearParityConfigKeyValueDrafts(): void {
  parityConfigKeyDraft.value = ''
  parityConfigValueDraft.value = ''
  parityConfigMergeStrategyDraft.value = 'upsert'
}

async function onCopyParityConfigKeyDraft(): Promise<void> {
  const keyPath = parityConfigKeyDraft.value.trim()
  if (!keyPath) return
  const copied = await copyTextToClipboard(keyPath)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied config key'
    return
  }
  parityError.value = 'Failed to copy config key'
}

async function onCopyParityConfigValueDraft(): Promise<void> {
  const value = parityConfigValueDraft.value.trim()
  if (!value) return
  const copied = await copyTextToClipboard(value)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied config value'
    return
  }
  parityError.value = 'Failed to copy config value'
}

function onClearParityConfigBatchDraft(): void {
  parityConfigBatchDraft.value = ''
}

async function onCopyParityConfigBatchDraft(): Promise<void> {
  const batch = parityConfigBatchDraft.value.trim()
  if (!batch) return
  const copied = await copyTextToClipboard(batch)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied config batch JSON'
    return
  }
  parityError.value = 'Failed to copy config batch JSON'
}

async function onToggleParityAppEnabled(appId: string, enabled: boolean): Promise<void> {
  const normalizedAppId = appId.trim()
  if (!normalizedAppId || togglingAppId.value) return
  togglingAppId.value = normalizedAppId
  parityError.value = ''
  try {
    await writeConfigValue(`apps.${normalizedAppId}.enabled`, enabled, 'upsert')
    parityConfigWriteResult.value = `Saved apps.${normalizedAppId}.enabled=${enabled ? 'true' : 'false'}`
    parityApps.value = parityApps.value.map((app) =>
      app.id === normalizedAppId ? { ...app, isEnabled: enabled } : app)
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to update app enabled state'
  } finally {
    togglingAppId.value = ''
  }
}

async function onToggleParityExperimentalFeature(name: string, enabled: boolean): Promise<void> {
  const normalizedName = name.trim()
  if (!normalizedName || togglingExperimentalFeatureName.value) return
  togglingExperimentalFeatureName.value = normalizedName
  parityError.value = ''
  try {
    await writeConfigValue(`experimental_features.${normalizedName}`, enabled, 'upsert')
    parityConfigWriteResult.value = `Saved experimental_features.${normalizedName}=${enabled ? 'true' : 'false'}`
    parityExperimentalFeatures.value = parityExperimentalFeatures.value.map((feature) =>
      feature.name === normalizedName ? { ...feature, enabled } : feature)
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to update experimental feature state'
  } finally {
    togglingExperimentalFeatureName.value = ''
  }
}

async function onLogoutParityAccount(): Promise<void> {
  if (isLoggingOutParityAccount.value) return
  isLoggingOutParityAccount.value = true
  parityError.value = ''
  try {
    await logoutAccount()
    await Promise.all([
      loadAccountsState(),
      loadParitySurface(),
    ])
    void refreshAll({
      includeSelectedThreadMessages: true,
    })
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to logout account'
  } finally {
    isLoggingOutParityAccount.value = false
  }
}

async function onRefreshParityAccountFromAuth(): Promise<void> {
  if (isRefreshingParityAccount.value) return
  isRefreshingParityAccount.value = true
  parityError.value = ''
  try {
    await loadAccountsState()
    await loadParitySurface()
    parityLoginStartResult.value = 'Account refreshed from auth state'
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to refresh account from auth'
  } finally {
    isRefreshingParityAccount.value = false
  }
}

async function onLoadParityAccountsList(): Promise<void> {
  if (isLoadingParityAccountsList.value) return
  isLoadingParityAccountsList.value = true
  parityError.value = ''
  parityAccountsSummary.value = ''
  try {
    const result = await getAccounts()
    const authModes = Array.from(new Set(
      result.accounts
        .map((account) => (account.authMode || '').trim())
        .filter((mode) => mode.length > 0),
    ))
    const imported = (result.importedAccountId || '').trim() || '(none)'
    const authModesLabel = authModes.length > 0 ? authModes.join(', ') : '(none)'
    parityAccountsSummary.value = `accounts=${result.accounts.length} · active=${result.activeAccountId || '(none)'} · imported=${imported} · authModes=${authModesLabel}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to load accounts list'
  } finally {
    isLoadingParityAccountsList.value = false
  }
}

async function onRefreshParityAccountAndConfig(): Promise<void> {
  if (isRefreshingParityAccountConfig.value) return
  isRefreshingParityAccountConfig.value = true
  parityError.value = ''
  try {
    const startedAt = Date.now()
    const [account, config] = await Promise.all([
      readAccount(),
      readConfigSummary(),
    ])
    const durationMs = Math.max(0, Date.now() - startedAt)
    parityActiveAccount.value = {
      email: account.email,
      planType: account.planType,
      type: account.type,
      requiresOpenaiAuth: account.requiresOpenaiAuth,
    }
    parityConfigRead.value = {
      model: config.model,
      modelProvider: config.modelProvider,
      approvalPolicy: config.approvalPolicy,
      sandboxMode: config.sandboxMode,
      sandboxNetworkAccess: config.sandboxNetworkAccess,
      webSearch: config.webSearch,
    }
    parityAccountsSummary.value = `account/config refreshed · durationMs=${durationMs}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to refresh account + config'
  } finally {
    isRefreshingParityAccountConfig.value = false
  }
}

function onClearParityAccountSummaries(): void {
  parityAccountsSummary.value = ''
  parityLoginStartResult.value = ''
}

async function onCopyParityAccountsSummary(): Promise<void> {
  const summary = parityAccountsSummary.value.trim()
  if (!summary) return
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied accounts summary'
    return
  }
  parityError.value = 'Failed to copy accounts summary'
}

function onClearParityActiveAccountSummary(): void {
  parityActiveAccount.value = null
}

async function onCopyParityActiveAccountSummary(): Promise<void> {
  if (!parityActiveAccount.value) return
  const summary = `${parityActiveAccount.value.email || '(no email)'} · ${parityActiveAccount.value.planType || 'unknown'} · ${parityActiveAccount.value.type || 'unknown'} · requiresOpenaiAuth: ${parityActiveAccount.value.requiresOpenaiAuth ? 'yes' : 'no'}`
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied active account summary'
    return
  }
  parityError.value = 'Failed to copy active account summary'
}

function onClearParityConfigReadSummary(): void {
  parityConfigRead.value = null
}

async function onCopyParityConfigReadSummary(): Promise<void> {
  if (!parityConfigRead.value) return
  const summary = `model: ${parityConfigRead.value.model || '(unset)'} · provider: ${parityConfigRead.value.modelProvider || '(unset)'}\napproval: ${parityConfigRead.value.approvalPolicy || '(unset)'} · sandbox: ${parityConfigRead.value.sandboxMode || '(unset)'} · network: ${parityConfigRead.value.sandboxNetworkAccess || '(unset)'}\nweb_search: ${parityConfigRead.value.webSearch || '(unset)'}`
  const copied = await copyTextToClipboard(summary)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied config read summary'
    return
  }
  parityError.value = 'Failed to copy config read summary'
}

function onClearParityWriteResults(): void {
  parityConfigWriteResult.value = ''
  parityThreadActionResult.value = ''
  parityFeedbackResult.value = ''
}

async function onCopyParityConfigWriteResult(): Promise<void> {
  const result = parityConfigWriteResult.value.trim()
  if (!result) return
  const copied = await copyTextToClipboard(result)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied write result'
    return
  }
  parityError.value = 'Failed to copy write result'
}

function onResetParityPolicyDrafts(): void {
  parityApprovalPolicy.value = 'on-request'
  paritySandboxMode.value = 'workspace-write'
  paritySandboxNetworkAccess.value = 'disabled'
  parityWebSearchMode.value = 'live'
}

function onClearParityStatusMessages(): void {
  parityError.value = ''
  parityThreadActionResult.value = ''
}

function onClearParityErrorOnly(): void {
  parityError.value = ''
}

async function onCopyParityErrorMessage(): Promise<void> {
  const message = parityError.value.trim()
  if (!message) return
  const copied = await copyTextToClipboard(message)
  if (copied) {
    parityThreadActionResult.value = 'Copied parity error'
    return
  }
  parityError.value = 'Failed to copy parity error'
}

async function onCopyParityThreadActionResult(): Promise<void> {
  const result = parityThreadActionResult.value.trim()
  if (!result) return
  const copied = await copyTextToClipboard(result)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied thread action result'
    return
  }
  parityError.value = 'Failed to copy thread action result'
}

async function onSwitchParityAccountById(): Promise<void> {
  const accountId = paritySwitchAccountIdDraft.value.trim()
  if (!accountId || isSwitchingParityAccount.value) return
  isSwitchingParityAccount.value = true
  parityError.value = ''
  try {
    const account = await switchAccount(accountId)
    paritySwitchAccountIdDraft.value = ''
    await Promise.all([
      loadAccountsState(),
      loadParitySurface(),
    ])
    parityAccountsSummary.value = `switched active account=${account.accountId}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to switch account'
  } finally {
    isSwitchingParityAccount.value = false
  }
}

async function onRemoveParityAccountById(): Promise<void> {
  const accountId = parityRemoveAccountIdDraft.value.trim()
  if (!accountId || isRemovingParityAccount.value) return
  isRemovingParityAccount.value = true
  parityError.value = ''
  try {
    const result = await removeAccount(accountId)
    parityRemoveAccountIdDraft.value = ''
    await Promise.all([
      loadAccountsState(),
      loadParitySurface(),
    ])
    parityAccountsSummary.value = `removed account=${accountId} · remaining=${result.accounts.length}`
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to remove account'
  } finally {
    isRemovingParityAccount.value = false
  }
}

function onClearParityAccountActionDrafts(): void {
  paritySwitchAccountIdDraft.value = ''
  parityRemoveAccountIdDraft.value = ''
}

async function onCopyParitySwitchAccountIdDraft(): Promise<void> {
  const accountId = paritySwitchAccountIdDraft.value.trim()
  if (!accountId) return
  const copied = await copyTextToClipboard(accountId)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied switch account id'
    return
  }
  parityError.value = 'Failed to copy switch account id'
}

async function onCopyParityRemoveAccountIdDraft(): Promise<void> {
  const accountId = parityRemoveAccountIdDraft.value.trim()
  if (!accountId) return
  const copied = await copyTextToClipboard(accountId)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied remove account id'
    return
  }
  parityError.value = 'Failed to copy remove account id'
}

async function onStartParityAccountLogin(): Promise<void> {
  if (isStartingParityAccountLogin.value) return
  isStartingParityAccountLogin.value = true
  parityError.value = ''
  parityLoginStartResult.value = ''
  try {
    const result = await startAccountLogin()
    if (result.authUrl) {
      parityLoginStartResult.value = result.loginId
        ? `Login started (loginId=${result.loginId})`
        : 'Login started'
      parityActiveLoginId.value = result.loginId || ''
      if (typeof window !== 'undefined') {
        window.open(result.authUrl, '_blank', 'noopener,noreferrer')
      }
    } else {
      parityLoginStartResult.value = 'Login start returned without auth URL'
    }
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to start account login'
  } finally {
    isStartingParityAccountLogin.value = false
  }
}

async function onCancelParityAccountLogin(): Promise<void> {
  const loginId = parityActiveLoginId.value.trim()
  if (!loginId || isCancellingParityAccountLogin.value) return
  isCancellingParityAccountLogin.value = true
  parityError.value = ''
  try {
    const result = await cancelAccountLogin(loginId)
    parityLoginStartResult.value = result.status
      ? `Login cancel status: ${result.status}`
      : 'Login cancel requested'
    parityActiveLoginId.value = ''
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to cancel account login'
  } finally {
    isCancellingParityAccountLogin.value = false
  }
}

async function onStartParityApiKeyLogin(): Promise<void> {
  const apiKey = parityApiKeyDraft.value.trim()
  if (!apiKey || isStartingParityAccountLogin.value) return
  isStartingParityAccountLogin.value = true
  parityError.value = ''
  parityLoginStartResult.value = ''
  try {
    const result = await startApiKeyLogin(apiKey)
    parityLoginStartResult.value = result.type
      ? `API key login started (${result.type})`
      : 'API key login started'
    parityApiKeyDraft.value = ''
    await Promise.all([
      loadAccountsState(),
      loadParitySurface(),
    ])
  } catch (error) {
    parityError.value = error instanceof Error ? error.message : 'Failed to start API key login'
  } finally {
    isStartingParityAccountLogin.value = false
  }
}

function onClearParityLoginDrafts(): void {
  parityApiKeyDraft.value = ''
  parityActiveLoginId.value = ''
  parityLoginStartResult.value = ''
}

async function onCopyParityLoginResult(): Promise<void> {
  const result = parityLoginStartResult.value.trim()
  if (!result) return
  const copied = await copyTextToClipboard(result)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied login result'
    return
  }
  parityError.value = 'Failed to copy login result'
}

async function onCopyParityActiveLoginId(): Promise<void> {
  const loginId = parityActiveLoginId.value.trim()
  if (!loginId) return
  const copied = await copyTextToClipboard(loginId)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied active login id'
    return
  }
  parityError.value = 'Failed to copy active login id'
}

async function onCopyParityApiKeyDraft(): Promise<void> {
  const apiKey = parityApiKeyDraft.value.trim()
  if (!apiKey) return
  const copied = await copyTextToClipboard(apiKey)
  if (copied) {
    parityError.value = ''
    parityThreadActionResult.value = 'Copied API key draft'
    return
  }
  parityError.value = 'Failed to copy API key draft'
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
      allowedUsers: 0,
      allowAllUsers: false,
      lastError: message,
    }
  }
}

async function refreshTelegramConfig(): Promise<void> {
  try {
    const config = await getTelegramConfig()
    telegramBotTokenDraft.value = config.botToken
    telegramAllowedUserIdsDraft.value = config.allowedUserIds.map((value) => String(value)).join('\n')
    telegramConfigError.value = ''
  } catch (error) {
    telegramConfigError.value = error instanceof Error ? error.message : 'Failed to load Telegram configuration'
  }
}

function parseTelegramAllowedUserIdsInput(value: string): Array<number | '*'> {
  const rawEntries = value
    .split(/[\n,]/)
    .map((entry) => entry.trim().replace(/^(telegram|tg):/i, '').trim())
    .filter(Boolean)
  const allowAllUsers = rawEntries.includes('*')
  const normalizedUserIds = Array.from(new Set(rawEntries
    .filter((entry) => /^-?\d+$/.test(entry))
    .map((entry) => Number.parseInt(entry, 10))))
  return allowAllUsers ? ['*', ...normalizedUserIds] : normalizedUserIds
}

async function saveTelegramConfig(): Promise<void> {
  const botToken = telegramBotTokenDraft.value.trim()
  const allowedUserIds = parseTelegramAllowedUserIdsInput(telegramAllowedUserIdsDraft.value)
  if (!botToken) {
    telegramConfigError.value = 'Telegram bot token is required.'
    return
  }
  if (allowedUserIds.length === 0) {
    telegramConfigError.value = 'At least one allowed Telegram user ID or * is required.'
    return
  }

  isTelegramSaving.value = true
  telegramConfigError.value = ''
  try {
    await configureTelegramBot(botToken, allowedUserIds)
    telegramAllowedUserIdsDraft.value = allowedUserIds.map((value) => String(value)).join('\n')
    await Promise.all([
      refreshTelegramConfig(),
      refreshTelegramStatus(),
    ])
    window.alert('Telegram bot configured. Only allowlisted Telegram users can use the bridge.')
  } catch (error) {
    telegramConfigError.value = error instanceof Error ? error.message : 'Failed to connect Telegram bot'
    void refreshTelegramStatus()
  } finally {
    isTelegramSaving.value = false
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

function isRemoveVisible(account: UiAccountEntry): boolean {
  return hoveredAccountId.value === account.accountId || isRemoveConfirmationActive(account)
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

function formatResetDateCompact(resetsAt: number | null): string {
  if (typeof resetsAt !== 'number' || !Number.isFinite(resetsAt)) return ''
  const date = new Date(resetsAt * 1000)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function formatAccountQuota(account: UiAccountEntry): string {
  if (isAccountUnavailable(account)) {
    return account.quotaError || '402 Payment Required'
  }
  const quota = account.quotaSnapshot
  const window = pickWeeklyQuotaWindow(account)
  const fallbackWindow = quota?.primary ?? quota?.secondary ?? null
  const displayWindow = window ?? fallbackWindow
  if (displayWindow) {
    const remainingPercent = Math.max(0, Math.min(100, 100 - Math.round(displayWindow.usedPercent)))
    const refreshDate = formatResetDateCompact(displayWindow.resetsAt)
    return refreshDate
      ? `${remainingPercent}% weekly remaining · ${refreshDate}`
      : `${remainingPercent}% weekly remaining`
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
  if (account.quotaStatus === 'ready' || account.quotaStatus === 'idle') {
    return 'Quota unavailable'
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
    if (!result.accounts.some((account) => account.accountId === hoveredAccountId.value)) {
      hoveredAccountId.value = ''
    }
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
  hoveredAccountId.value = ''
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

async function onForkThread(threadId: string): Promise<void> {
  const nextThreadId = await forkThreadById(threadId)
  if (!nextThreadId) return
  if (!isHomeRoute.value) {
    await router.push({ name: 'thread', params: { threadId: nextThreadId } })
  } else {
    await router.replace({ name: 'thread', params: { threadId: nextThreadId } })
  }
  if (isMobile.value) setSidebarCollapsed(true)
}

function isWorktreePath(cwdRaw: string): boolean {
  const cwd = cwdRaw.trim().replace(/\\/gu, '/')
  if (!cwd) return false
  return cwd.includes('/.codex/worktrees/') || cwd.includes('/.git/worktrees/')
}

function resolvePreferredLocalCwd(projectName: string, fallbackCwd = ''): string {
  const group = projectGroups.value.find((row) => row.projectName === projectName)
  if (!group) return fallbackCwd.trim()
  const nonWorktreeThread = group.threads.find((thread) => !isWorktreePath(thread.cwd))
  const candidate = nonWorktreeThread?.cwd?.trim() ?? group.threads[0]?.cwd?.trim() ?? ''
  return candidate || fallbackCwd.trim()
}

function onStartNewThread(projectName: string): void {
  const projectGroup = projectGroups.value.find((group) => group.projectName === projectName)
  const projectCwd = resolvePreferredLocalCwd(projectName, projectGroup?.threads[0]?.cwd?.trim() ?? '')
  if (projectCwd) {
    newThreadCwd.value = projectCwd
  }
  if (isMobile.value) setSidebarCollapsed(true)
  if (isHomeRoute.value) return
  void router.push({ name: 'home' })
}

function onBrowseThreadFiles(threadId: string): void {
  let targetCwd = ''
  for (const group of projectGroups.value) {
    const thread = group.threads.find((row) => row.id === threadId)
    if (thread?.cwd?.trim()) {
      targetCwd = thread.cwd.trim()
      break
    }
  }
  if (!targetCwd || typeof window === 'undefined') return
  window.open(`/codex-local-browse${encodeURI(targetCwd)}`, '_blank', 'noopener,noreferrer')
}

function onStartNewThreadFromToolbar(): void {
  const selected = selectedThread.value
  const cwd = selected
    ? resolvePreferredLocalCwd(selected.projectName, selected.cwd?.trim() ?? '')
    : ''
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

function onRespondServerRequest(payload: UiServerRequestReply): void {
  void handleServerRequestResponse(payload)
}

async function handleServerRequestResponse(payload: UiServerRequestReply): Promise<void> {
  const responded = await respondToPendingServerRequest(payload)
  const followUpMessageText = payload.followUpMessageText?.trim() ?? ''
  if (!responded || !followUpMessageText || isHomeRoute.value) return

  try {
    await sendMessageToSelectedThread(followUpMessageText, [], [], 'steer', [])
  } catch {
    // sendMessageToSelectedThread already surfaces the error through shared state.
  }
}

async function onForkThreadFromMessage(payload: { threadId: string; turnIndex: number }): Promise<void> {
  const forkedThreadId = await forkThreadFromTurn(payload.threadId, payload.turnIndex)
  if (!forkedThreadId) return
  await router.push({ name: 'thread', params: { threadId: forkedThreadId } })
  if (selectedThreadId.value !== forkedThreadId) {
    await selectThread(forkedThreadId)
  }
  if (isMobile.value) setSidebarCollapsed(true)
}

function setSidebarCollapsed(nextValue: boolean): void {
  if (isSidebarCollapsed.value === nextValue) return
  isSidebarCollapsed.value = nextValue
  saveSidebarCollapsed(nextValue)
}

function focusSettingsPanel(): void {
  void nextTick(() => {
    const focusable = getSettingsFocusableElements()
    if (focusable.length > 0) {
      focusable[0]?.focus()
      return
    }
    settingsPanelRef.value?.focus()
  })
}

function captureSettingsFocusOrigin(): void {
  if (typeof document === 'undefined') return
  const activeElement = document.activeElement
  settingsPreviouslyFocusedElement.value = activeElement instanceof HTMLElement ? activeElement : null
}

function getSettingsFocusableElements(): HTMLElement[] {
  const panel = settingsPanelRef.value
  if (!panel) return []
  const nodes = Array.from(panel.querySelectorAll<HTMLElement>(SETTINGS_FOCUSABLE_SELECTOR))
  return nodes.filter((node) => {
    if (node.getAttribute('aria-hidden') === 'true') return false
    if (node.hidden) return false
    const hasLayoutBox = node.getClientRects().length > 0
    if (!hasLayoutBox && node !== document.activeElement) return false
    return true
  })
}

function openSettingsPanel(): void {
  if (!isSettingsOpen.value) captureSettingsFocusOrigin()
  if (route.name === ROUTE_THREAD && routeThreadId.value) {
    settingsReturnRoute.value = { name: ROUTE_THREAD, params: { threadId: routeThreadId.value } }
  } else if (route.name === ROUTE_SKILLS) {
    settingsReturnRoute.value = { name: ROUTE_SKILLS }
  } else if (route.name !== ROUTE_SETTINGS) {
    settingsReturnRoute.value = { name: ROUTE_HOME }
  }
  isSettingsOpen.value = true
  focusSettingsPanel()
  if (route.name !== ROUTE_SETTINGS) {
    void router.push({ name: ROUTE_SETTINGS })
  }
}

function toggleSettingsPanel(): void {
  if (isSettingsOpen.value) {
    closeSettingsPanel()
  } else {
    openSettingsPanel()
  }
}

function closeSettingsPanel(options?: { skipRouteSync?: boolean; restoreFocus?: boolean }): void {
  const wasOpen = isSettingsOpen.value
  isSettingsOpen.value = false
  if (!wasOpen) {
    settingsPreviouslyFocusedElement.value = null
  }
  if (wasOpen && options?.restoreFocus !== false) {
    void nextTick(() => {
      const previous = settingsPreviouslyFocusedElement.value
      settingsPreviouslyFocusedElement.value = null
      const wasInsideSettingsPanel = previous && settingsPanelRef.value?.contains(previous)
      if (previous && previous.isConnected && !wasInsideSettingsPanel) {
        previous.focus()
        return
      }
      settingsButtonRef.value?.focus()
    })
  } else if (wasOpen) {
    settingsPreviouslyFocusedElement.value = null
  }
  if (!options?.skipRouteSync && route.name === ROUTE_SETTINGS) {
    void router.replace(settingsReturnRoute.value)
  }
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.closest(EDITABLE_TARGET_SELECTOR) !== null
}

function isSettingsShortcut(event: KeyboardEvent): boolean {
  return event.key === KEY_CHAR_SETTINGS || event.code === KEY_CODE_COMMA
}

function isHomeShortcut(event: KeyboardEvent): boolean {
  return event.key.toLowerCase() === KEY_CHAR_H || event.code === KEY_CODE_H
}

function isSidebarToggleShortcut(event: KeyboardEvent): boolean {
  return event.key.toLowerCase() === KEY_CHAR_B || event.code === KEY_CODE_B
}

function hasPrimaryModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey !== event.metaKey
}

function hasNoOptionalModifiers(event: KeyboardEvent): boolean {
  return !event.altKey
}

function hasOnlyPrimaryModifier(event: KeyboardEvent): boolean {
  return hasPrimaryModifier(event) && !event.shiftKey && hasNoOptionalModifiers(event)
}

function hasPrimaryWithShiftModifier(event: KeyboardEvent): boolean {
  return hasPrimaryModifier(event) && event.shiftKey && hasNoOptionalModifiers(event)
}

function shouldIgnoreShortcutRepeat(event: KeyboardEvent): boolean {
  return event.repeat
}

function onWindowKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented) return
  if (event.isComposing) return
  const isEditableTarget = isEditableKeyboardTarget(event.target)
  if (event.key === 'Tab' && isSettingsOpen.value && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const focusable = getSettingsFocusableElements()
    if (focusable.length === 0) {
      event.preventDefault()
      settingsPanelRef.value?.focus()
      return
    }
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const currentIndex = active ? focusable.indexOf(active) : -1
    if (event.shiftKey) {
      if (currentIndex <= 0) {
        event.preventDefault()
        focusable[focusable.length - 1]?.focus()
      }
      return
    }
    if (currentIndex === -1 || currentIndex === focusable.length - 1) {
      event.preventDefault()
      focusable[0]?.focus()
    }
    return
  }
  if (hasPrimaryWithShiftModifier(event) && isHomeShortcut(event)) {
    if (shouldIgnoreShortcutRepeat(event)) return
    if (isEditableTarget) return
    event.preventDefault()
    if (isSettingsOpen.value) {
      closeSettingsPanel({ skipRouteSync: true })
    }
    if (route.name !== ROUTE_HOME) {
      void router.push({ name: ROUTE_HOME })
    }
    return
  }
  if (event.key === 'Escape' && isSettingsOpen.value) {
    closeSettingsPanel()
    return
  }
  if (!hasOnlyPrimaryModifier(event)) return
  if (isSettingsShortcut(event)) {
    if (shouldIgnoreShortcutRepeat(event)) return
    if (isEditableTarget) return
    event.preventDefault()
    toggleSettingsPanel()
    return
  }
  if (!isSidebarToggleShortcut(event)) return
  if (shouldIgnoreShortcutRepeat(event)) return
  if (isEditableTarget) return
  event.preventDefault()
  setSidebarCollapsed(!isSidebarCollapsed.value)
}

function onDocumentPointerDown(event: PointerEvent): void {
  if (!isSettingsOpen.value) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (settingsPanelRef.value?.contains(target)) return
  if (settingsButtonRef.value?.contains(target)) return
  closeSettingsPanel()
}

function onSettingsAreaClick(event: MouseEvent): void {
  if (!isSettingsOpen.value) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (settingsPanelRef.value?.contains(target)) return
  if (settingsButtonRef.value?.contains(target)) return
  closeSettingsPanel()
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
  if (route.name === 'home') {
    void loadWorkspaceRootOptionsState()
    void refreshDefaultProjectName()
  }
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
    await syncThreadSelectionWithRoute()
  } finally {
    mobileResumeSyncInProgress.value = false
  }
}

function onSubmitThreadMessage(payload: { text: string; imageUrls: string[]; fileAttachments: Array<{ label: string; path: string; fsPath: string }>; skills: Array<{ name: string; path: string }>; mode: 'steer' | 'queue' }): void {
  const text = payload.text
  scheduleMobileConversationJumpToLatest()
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


function scheduleMobileConversationJumpToLatest(): void {
  if (!isMobile.value || isHomeRoute.value) return

  const jumpToLatest = () => {
    threadConversationRef.value?.jumpToLatest()
  }

  jumpToLatest()
  void nextTick(() => {
    jumpToLatest()
    if (typeof window === 'undefined') return
    window.requestAnimationFrame(() => {
      jumpToLatest()
      window.requestAnimationFrame(jumpToLatest)
    })
  })
}

function onSelectNewThreadFolder(cwd: string): void {
  newThreadCwd.value = cwd.trim()
  createFolderError.value = ''
}

function onSelectNewWorktreeBranch(branch: string): void {
  newWorktreeBaseBranch.value = branch.trim()
}

async function loadThreadBranches(cwd: string): Promise<void> {
  const targetCwd = cwd.trim()
  if (!targetCwd || route.name !== 'thread') {
    threadBranchOptions.value = []
    currentThreadBranch.value = null
    return
  }
  isLoadingThreadBranches.value = true
  try {
    const state = await getGitBranchState(targetCwd)
    threadBranchOptions.value = state.options
    currentThreadBranch.value = state.currentBranch
  } catch {
    threadBranchOptions.value = []
    currentThreadBranch.value = null
  } finally {
    isLoadingThreadBranches.value = false
  }
}

function onSelectContentHeaderBranch(value: string): void {
  if (value === '__review__') {
    isReviewPaneOpen.value = !isReviewPaneOpen.value
    return
  }
  if (value === '__detached_head__') return
  if (isSwitchingThreadBranch.value) return
  const targetBranch = value.trim()
  if (!targetBranch || targetBranch === (currentThreadBranch.value ?? '')) return
  const cwd = composerCwd.value.trim()
  if (!cwd) return

  isSwitchingThreadBranch.value = true
  void checkoutGitBranch(cwd, targetBranch)
    .then((branch) => {
      currentThreadBranch.value = branch || targetBranch
      isReviewPaneOpen.value = false
      return loadThreadBranches(cwd)
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to switch branch'
      window.alert(message)
    })
    .finally(() => {
      isSwitchingThreadBranch.value = false
    })
}

async function onCreateProject(): Promise<void> {
  const baseDir = await resolveProjectBaseDirectory()
  if (!baseDir) return

  await refreshDefaultProjectName()
  const suggestedName = defaultNewProjectName.value.trim() || 'New Project (1)'
  const projectName = window.prompt(`Create project in ${baseDir}`, suggestedName)
  if (projectName === null) return

  const normalizedProjectName = projectName.trim()
  if (!normalizedProjectName) return

  const targetPath = normalizeAbsolutePath(joinPath(baseDir, normalizedProjectName))
  if (!targetPath) return

  try {
    const normalizedPath = await openProjectRoot(targetPath, {
      createIfMissing: true,
      label: '',
    })
    if (!normalizedPath) return

    newThreadCwd.value = normalizedPath
    pinProjectToTop(getPathLeafName(normalizedPath))
    await loadWorkspaceRootOptionsState()
    await refreshDefaultProjectName()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create the project.'
    window.alert(message)
  }
}

async function onOpenExistingFolder(): Promise<void> {
  const startPath = newThreadCwd.value.trim() || await resolveProjectBaseDirectory()
  if (!startPath) return
  isCreateFolderOpen.value = false
  isExistingFolderPickerOpen.value = true
  existingFolderFilter.value = ''
  await loadExistingFolderListing(startPath)
  if (!existingFolderError.value) {
    void nextTick(() => existingFolderFilterInputRef.value?.focus())
  }
}

function onCloseExistingFolderPanel(): void {
  existingFolderBrowseRequestId += 1
  isExistingFolderPickerOpen.value = false
  isExistingFolderLoading.value = false
  existingFolderError.value = ''
  existingFolderFilter.value = ''
  onCloseCreateFolderPanel()
}

async function onBrowseExistingFolder(path: string): Promise<void> {
  if (!path || isExistingFolderLoading.value) return
  existingFolderFilter.value = ''
  await loadExistingFolderListing(path)
}

function onToggleHiddenFolders(): void {
  const currentPath = existingFolderBrowsePath.value.trim()
  if (!isExistingFolderPickerOpen.value || !currentPath) return
  void loadExistingFolderListing(currentPath)
}

function onRetryExistingFolderBrowse(): void {
  const currentPath = existingFolderBrowsePath.value.trim()
  if (!isExistingFolderPickerOpen.value || !currentPath || isExistingFolderLoading.value) return
  void loadExistingFolderListing(currentPath)
}

async function onConfirmExistingFolder(path = existingFolderBrowsePath.value): Promise<void> {
  const targetPath = path.trim()
  if (!targetPath) return

  existingFolderError.value = ''
  isOpeningExistingFolder.value = true
  try {
    const normalizedPath = await openProjectRoot(targetPath, {
      createIfMissing: false,
      label: '',
    })
    if (!normalizedPath) {
      existingFolderError.value = 'Failed to open the selected folder.'
      return
    }

    newThreadCwd.value = normalizedPath
    pinProjectToTop(getPathLeafName(normalizedPath))
    await loadWorkspaceRootOptionsState()
    await refreshDefaultProjectName()
    onCloseExistingFolderPanel()
  } catch (error) {
    existingFolderError.value = error instanceof Error ? error.message : 'Failed to open the selected folder.'
  } finally {
    isOpeningExistingFolder.value = false
  }
}

async function onOpenCreateFolderPanel(): Promise<void> {
  createFolderError.value = ''
  if (isCreateFolderOpen.value) {
    onCloseCreateFolderPanel()
    return
  }
  if (!isExistingFolderPickerOpen.value) {
    const startPath = newThreadCwd.value.trim() || await resolveProjectBaseDirectory()
    if (!startPath) return
    isExistingFolderPickerOpen.value = true
    existingFolderFilter.value = ''
    await loadExistingFolderListing(startPath)
    if (existingFolderError.value) return
  }
  if (existingFolderError.value) return
  createFolderDraft.value = defaultNewProjectName.value
  isCreateFolderOpen.value = true
  void nextTick(() => createFolderInputRef.value?.focus())
}

function onCloseCreateFolderPanel(): void {
  createFolderError.value = ''
  createFolderDraft.value = ''
  isCreateFolderOpen.value = false
}

async function onCreateFolder(): Promise<void> {
  const normalizedInput = createFolderDraft.value.trim()
  if (!normalizedInput) return

  createFolderError.value = ''
  if (existingFolderError.value) {
    createFolderError.value = 'Reload the current folder before creating a new one.'
    return
  }
  isCreatingFolder.value = true

  const baseDir = createFolderParentPath.value.trim()
  const targetPath = normalizeAbsolutePath(joinPath(baseDir, normalizedInput))

  if (!targetPath) {
    createFolderError.value = 'Unable to determine where the new folder should be created.'
    isCreatingFolder.value = false
    return
  }

  if (!isCreateFolderNameValid.value) {
    createFolderError.value = 'Enter a single folder name.'
    isCreatingFolder.value = false
    return
  }

  try {
    const normalizedPath = await createLocalDirectory(targetPath)
    if (!normalizedPath) {
      createFolderError.value = 'Failed to create the folder.'
      return
    }

    createFolderError.value = ''
    existingFolderFilter.value = ''
    await loadExistingFolderListing(normalizedPath)
    onCloseCreateFolderPanel()
  } catch (error) {
    createFolderError.value = error instanceof Error ? error.message : 'Failed to create folder.'
  } finally {
    isCreatingFolder.value = false
  }
}

async function applyLaunchProjectPathFromUrl(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const launchProjectPath = new URLSearchParams(window.location.search).get('openProjectPath')?.trim() ?? ''
  if (!launchProjectPath) return false
  try {
    const normalizedPath = await openProjectRoot(launchProjectPath, {
      createIfMissing: false,
      label: '',
    })
    if (!normalizedPath) return false
    newThreadCwd.value = normalizedPath
    pinProjectToTop(getPathLeafName(normalizedPath))
    await router.replace({ name: 'home' })
    await loadWorkspaceRootOptionsState()
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.delete('openProjectPath')
    window.history.replaceState({}, '', nextUrl.toString())
    return true
  } catch {
    // If launch path is invalid, keep normal startup behavior.
    return false
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

async function loadExistingFolderListing(path: string): Promise<void> {
  const requestId = ++existingFolderBrowseRequestId
  existingFolderBrowsePath.value = normalizePathForUi(path).trim()
  existingFolderError.value = ''
  isExistingFolderLoading.value = true

  try {
    const listing = await listLocalDirectories(path, { showHidden: showHiddenFolders.value })
    if (requestId !== existingFolderBrowseRequestId) return
    existingFolderBrowsePath.value = listing.path
    existingFolderParentPath.value = listing.parentPath
    existingFolderEntries.value = listing.entries
  } catch (error) {
    if (requestId !== existingFolderBrowseRequestId) return
    existingFolderError.value = error instanceof Error ? error.message : 'Failed to load local folders.'
    existingFolderParentPath.value = getPathParent(existingFolderBrowsePath.value)
    existingFolderEntries.value = []
    onCloseCreateFolderPanel()
  } finally {
    if (requestId === existingFolderBrowseRequestId) {
      isExistingFolderLoading.value = false
    }
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
function joinPath(parent: string, child: string): string {
  const rawParent = normalizePathForUi(parent).trim()
  const normalizedChild = normalizePathForUi(child).trim().replace(/^[\\/]+/u, '')
  if (!rawParent || !normalizedChild) return ''
  const separator = rawParent.includes('\\') && !rawParent.includes('/') ? '\\' : '/'
  if (/^[a-zA-Z]:[\\/]?$/u.test(rawParent)) {
    return `${rawParent.slice(0, 2)}${separator}${normalizedChild}`
  }
  if (/^\/+$/u.test(rawParent)) {
    return `/${normalizedChild}`
  }
  const normalizedParent = rawParent.replace(/[\\/]+$/u, '')
  if (!normalizedParent) return ''
  return `${normalizedParent}${separator}${normalizedChild}`
}

function normalizeAbsolutePath(value: string): string {
  const normalizedValue = normalizePathForUi(value).trim()
  if (!normalizedValue) return ''

  const uncMatch = normalizedValue.match(/^\\\\([^\\/]+)[\\/]+([^\\/]+)([\\/].*)?$/u)
  if (uncMatch) {
    const [, server, share, suffix = ''] = uncMatch
    const segments = collapsePathSegments(suffix.split(/[\\/]+/u))
    return segments.length > 0
      ? `\\\\${server}\\${share}\\${segments.join('\\')}`
      : `\\\\${server}\\${share}`
  }

  const driveMatch = normalizedValue.match(/^([a-zA-Z]:)([\\/].*)?$/u)
  if (driveMatch) {
    const [, drive, suffix = ''] = driveMatch
    const separator = normalizedValue.includes('\\') && !normalizedValue.includes('/') ? '\\' : '/'
    const segments = collapsePathSegments(suffix.split(/[\\/]+/u))
    return segments.length > 0 ? `${drive}${separator}${segments.join(separator)}` : `${drive}${separator}`
  }

  if (normalizedValue.startsWith('/')) {
    const segments = collapsePathSegments(normalizedValue.split('/'))
    return segments.length > 0 ? `/${segments.join('/')}` : '/'
  }

  return normalizedValue
}

function collapsePathSegments(rawSegments: readonly string[]): string[] {
  const segments: string[] = []
  for (const rawSegment of rawSegments) {
    const segment = rawSegment.trim()
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (segments.length > 0) {
        segments.pop()
      }
      continue
    }
    segments.push(segment)
  }
  return segments
}

function onSelectModel(modelId: string): void {
  setSelectedModelIdForThread(composerThreadContextId.value, modelId)
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

function onRollback(payload: { turnId: string }): void {
  const targetTurnId = payload.turnId.trim()
  if (targetTurnId.length > 0) {
    const rollbackUserMessage = [...filteredMessages.value]
      .reverse()
      .find((message) => (
        message.role === 'user'
        && (message.turnId?.trim() ?? '') === targetTurnId
        && message.text.trim().length > 0
      ))
    if (rollbackUserMessage?.text && threadComposerRef.value) {
      threadComposerRef.value.appendTextToDraft(rollbackUserMessage.text)
    }
  }
  void rollbackSelectedThread(payload.turnId)
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

function setBoolPref(key: string, value: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value ? '1' : '0')
}

function loadDarkModePref(): 'system' | 'light' | 'dark' {
  if (typeof window === 'undefined') return 'system'
  const v = window.localStorage.getItem(DARK_MODE_KEY)
  if (v === 'light' || v === 'dark') return v
  return 'system'
}

function setDarkModePref(value: 'system' | 'light' | 'dark'): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DARK_MODE_KEY, value)
}

function loadInProgressSendModePref(): 'steer' | 'queue' {
  if (typeof window === 'undefined') return 'steer'
  const v = window.localStorage.getItem(IN_PROGRESS_SEND_MODE_KEY)
  return v === 'queue' ? 'queue' : 'steer'
}

function loadChatWidthPref(): ChatWidthMode {
  if (typeof window === 'undefined') return 'standard'
  const value = window.localStorage.getItem(CHAT_WIDTH_KEY)
  return value === 'standard' || value === 'wide' || value === 'extra-wide' ? value : 'standard'
}

function toggleSendWithEnter(): void {
  sendWithEnter.value = !sendWithEnter.value
  window.localStorage.setItem(SEND_WITH_ENTER_KEY, sendWithEnter.value ? '1' : '0')
}

function cycleInProgressSendMode(): void {
  inProgressSendMode.value = inProgressSendMode.value === 'steer' ? 'queue' : 'steer'
  window.localStorage.setItem(IN_PROGRESS_SEND_MODE_KEY, inProgressSendMode.value)
}

function cycleCollaborationMode(): void {
  const available = availableCollaborationModes.value
    .map((mode) => mode.value)
    .filter((value): value is 'default' | 'plan' => value === 'default' || value === 'plan')
  const modeOrder: Array<'default' | 'plan'> = available.length > 0 ? available : ['default', 'plan']
  const current = selectedCollaborationMode.value === 'plan' ? 'plan' : 'default'
  const index = modeOrder.indexOf(current)
  const next = modeOrder[(index + 1 + modeOrder.length) % modeOrder.length]
  setSelectedCollaborationMode(next)
}

function cycleSelectedModel(): void {
  const models = availableModelIds.value
  if (models.length === 0) return
  const current = (composerSelectedModelId.value || selectedModelId.value || '').trim()
  const currentIndex = models.indexOf(current)
  const next = models[(currentIndex + 1 + models.length) % models.length]
  setSelectedModelIdForThread(composerThreadContextId.value, next)
}

function cycleReasoningEffort(): void {
  const order: Array<ReasoningEffort | ''> = ['', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh']
  const current = selectedReasoningEffort.value
  const index = order.indexOf(current)
  const next = order[(index + 1 + order.length) % order.length]
  setSelectedReasoningEffort(next)
}

function cycleProvider(): void {
  if (freeModeLoading.value) return
  const order: Array<'codex' | 'openrouter' | 'opencode-zen' | 'custom'> = ['codex', 'openrouter', 'opencode-zen', 'custom']
  const currentIndex = order.indexOf(selectedProvider.value)
  const next = order[(currentIndex + 1 + order.length) % order.length]
  void onProviderChange(next)
}

function cycleDictationLanguage(): void {
  const options = dictationLanguageOptions.value.map((option) => option.value)
  if (options.length === 0) return
  const current = dictationLanguage.value
  const index = options.indexOf(current)
  const next = options[(index + 1 + options.length) % options.length]
  onDictationLanguageChange(next)
}

function beginTopLevelSettingWrite(target: '' | 'appearance' | 'menu-bar' | 'notifications' | 'approval' | 'sandbox' | 'agent-network' | 'web-search'): boolean {
  if (isWritingTopLevelSetting.value) return false
  isWritingTopLevelSetting.value = true
  activeTopLevelSettingWrite.value = target
  parityError.value = ''
  parityConfigWriteResult.value = ''
  parityThreadActionResult.value = ''
  return true
}

function finishTopLevelSettingWrite(): void {
  activeTopLevelSettingWrite.value = ''
  isWritingTopLevelSetting.value = false
}

async function refreshConfigSummaryAfterSuccessfulTopLevelWrite(baseMessage: string): Promise<void> {
  try {
    parityConfigRead.value = await readConfigSummary()
    parityConfigWriteResult.value = baseMessage
  } catch (refreshError) {
    const detail = refreshError instanceof Error ? refreshError.message : 'unknown error'
    parityConfigWriteResult.value = `${baseMessage} (summary refresh failed: ${detail})`
  }
}

async function cycleDarkMode(): Promise<void> {
  if (!beginTopLevelSettingWrite('appearance')) return
  const previous = darkMode.value
  const order: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark']
  const idx = order.indexOf(darkMode.value)
  darkMode.value = order[(idx + 1) % order.length]
  setDarkModePref(darkMode.value)
  applyDarkMode()
  try {
    await writeConfigValue('appearance.theme', darkMode.value, 'upsert')
    parityError.value = ''
    parityThreadActionResult.value = 'Updated appearance theme'
    await refreshConfigSummaryAfterSuccessfulTopLevelWrite('Updated appearance theme via config/value/write')
  } catch (error) {
    darkMode.value = previous
    setDarkModePref(darkMode.value)
    applyDarkMode()
    parityConfigWriteResult.value = ''
    parityThreadActionResult.value = ''
    parityError.value = error instanceof Error ? error.message : 'Failed to update appearance theme'
  } finally {
    finishTopLevelSettingWrite()
  }
}

async function toggleShowInMenuBar(): Promise<void> {
  if (!beginTopLevelSettingWrite('menu-bar')) return
  const previous = showInMenuBar.value
  const previousDraft = parityGeneralMenuBarDraft.value
  showInMenuBar.value = !showInMenuBar.value
  const nextDraft = showInMenuBar.value ? 'enabled' : 'disabled'
  parityGeneralMenuBarDraft.value = nextDraft
  setBoolPref(SHOW_IN_MENU_BAR_KEY, showInMenuBar.value)
  try {
    await writeConfigValue('general_settings.menu_bar', nextDraft, 'upsert')
    parityError.value = ''
    parityThreadActionResult.value = 'Updated menu bar setting'
    await refreshConfigSummaryAfterSuccessfulTopLevelWrite('Updated menu bar setting via config/value/write')
  } catch (error) {
    showInMenuBar.value = previous
    parityGeneralMenuBarDraft.value = previousDraft
    setBoolPref(SHOW_IN_MENU_BAR_KEY, showInMenuBar.value)
    parityConfigWriteResult.value = ''
    parityThreadActionResult.value = ''
    parityError.value = error instanceof Error ? error.message : 'Failed to update menu bar setting'
  } finally {
    finishTopLevelSettingWrite()
  }
}

async function toggleNotificationsEnabled(): Promise<void> {
  if (!beginTopLevelSettingWrite('notifications')) return
  const previous = notificationsEnabled.value
  const previousDraft = parityGeneralNotificationsDraft.value
  notificationsEnabled.value = !notificationsEnabled.value
  const nextDraft = notificationsEnabled.value ? 'enabled' : 'disabled'
  parityGeneralNotificationsDraft.value = nextDraft
  setBoolPref(NOTIFICATIONS_ENABLED_KEY, notificationsEnabled.value)
  try {
    await writeConfigValue('general_settings.notifications', nextDraft, 'upsert')
    parityError.value = ''
    parityThreadActionResult.value = 'Updated notifications setting'
    await refreshConfigSummaryAfterSuccessfulTopLevelWrite('Updated notifications setting via config/value/write')
  } catch (error) {
    notificationsEnabled.value = previous
    parityGeneralNotificationsDraft.value = previousDraft
    setBoolPref(NOTIFICATIONS_ENABLED_KEY, notificationsEnabled.value)
    parityConfigWriteResult.value = ''
    parityThreadActionResult.value = ''
    parityError.value = error instanceof Error ? error.message : 'Failed to update notifications setting'
  } finally {
    finishTopLevelSettingWrite()
  }
}

async function cycleApprovalPolicy(): Promise<void> {
  if (!beginTopLevelSettingWrite('approval')) return
  const previous = parityApprovalPolicy.value
  const order = ['untrusted', 'on-failure', 'on-request', 'never'] as const
  const index = order.indexOf(previous as (typeof order)[number])
  const next = order[(index + 1 + order.length) % order.length]
  parityApprovalPolicy.value = next
  try {
    await writeConfigValue('approval_policy', next, 'replace')
    parityError.value = ''
    parityThreadActionResult.value = 'Updated approval policy'
    await refreshConfigSummaryAfterSuccessfulTopLevelWrite('Updated approval policy via config/value/write')
  } catch (error) {
    parityApprovalPolicy.value = previous
    parityConfigWriteResult.value = ''
    parityThreadActionResult.value = ''
    parityError.value = error instanceof Error ? error.message : 'Failed to update approval policy'
  } finally {
    finishTopLevelSettingWrite()
  }
}

async function cycleSandboxMode(): Promise<void> {
  if (!beginTopLevelSettingWrite('sandbox')) return
  const previous = paritySandboxMode.value
  const order = ['read-only', 'workspace-write', 'danger-full-access'] as const
  const index = order.indexOf(previous as (typeof order)[number])
  const next = order[(index + 1 + order.length) % order.length]
  paritySandboxMode.value = next
  try {
    await writeConfigValue('sandbox_mode', next, 'replace')
    parityError.value = ''
    parityThreadActionResult.value = 'Updated sandbox mode'
    await refreshConfigSummaryAfterSuccessfulTopLevelWrite('Updated sandbox mode via config/value/write')
  } catch (error) {
    paritySandboxMode.value = previous
    parityConfigWriteResult.value = ''
    parityThreadActionResult.value = ''
    parityError.value = error instanceof Error ? error.message : 'Failed to update sandbox mode'
  } finally {
    finishTopLevelSettingWrite()
  }
}

async function toggleAgentNetworkAccess(): Promise<void> {
  if (!beginTopLevelSettingWrite('agent-network')) return
  const previous = paritySandboxNetworkAccess.value
  const next = previous === 'enabled' ? 'disabled' : 'enabled'
  paritySandboxNetworkAccess.value = next
  try {
    await writeConfigValue('sandbox_workspace_write.network_access', next === 'enabled', 'upsert')
    parityError.value = ''
    parityThreadActionResult.value = 'Updated sandbox workspace-write network access'
    await refreshConfigSummaryAfterSuccessfulTopLevelWrite('Updated sandbox workspace-write network access via config/value/write')
  } catch (error) {
    paritySandboxNetworkAccess.value = previous
    parityConfigWriteResult.value = ''
    parityThreadActionResult.value = ''
    parityError.value = error instanceof Error ? error.message : 'Failed to update sandbox workspace-write network access'
  } finally {
    finishTopLevelSettingWrite()
  }
}

async function cycleWebSearchMode(): Promise<void> {
  if (!beginTopLevelSettingWrite('web-search')) return
  const previous = parityWebSearchMode.value
  const order = ['disabled', 'cached', 'live'] as const
  const index = order.indexOf(previous as (typeof order)[number])
  const next = order[(index + 1 + order.length) % order.length]
  parityWebSearchMode.value = next
  try {
    await writeConfigValue('web_search', next, 'replace')
    parityError.value = ''
    parityThreadActionResult.value = 'Updated web search mode'
    await refreshConfigSummaryAfterSuccessfulTopLevelWrite('Updated web search mode via config/value/write')
  } catch (error) {
    parityWebSearchMode.value = previous
    parityConfigWriteResult.value = ''
    parityThreadActionResult.value = ''
    parityError.value = error instanceof Error ? error.message : 'Failed to update web search mode'
  } finally {
    finishTopLevelSettingWrite()
  }
}

function cycleChatWidth(): void {
  const order: ChatWidthMode[] = ['standard', 'wide', 'extra-wide']
  const idx = order.indexOf(chatWidth.value)
  chatWidth.value = order[(idx + 1) % order.length]
  window.localStorage.setItem(CHAT_WIDTH_KEY, chatWidth.value)
}

function cycleAgentSpeedMode(): void {
  if (isUpdatingSpeedMode.value) return
  const nextMode: SpeedMode = selectedSpeedMode.value === 'fast' ? 'standard' : 'fast'
  void updateSelectedSpeedMode(nextMode)
}

function toggleDictationClickToToggle(): void {
  dictationClickToToggle.value = !dictationClickToToggle.value
  window.localStorage.setItem(DICTATION_CLICK_TO_TOGGLE_KEY, dictationClickToToggle.value ? '1' : '0')
}

function toggleDictationAutoSend(): void {
  dictationAutoSend.value = !dictationAutoSend.value
  window.localStorage.setItem(DICTATION_AUTO_SEND_KEY, dictationAutoSend.value ? '1' : '0')
}

function toggleAgentAmbientSuggestions(): void {
  agentAmbientSuggestionsEnabled.value = !agentAmbientSuggestionsEnabled.value
  window.localStorage.setItem(AGENT_AMBIENT_SUGGESTIONS_KEY, agentAmbientSuggestionsEnabled.value ? '1' : '0')
}


function toggleGithubTrendingProjects(): void {
  showGithubTrendingProjects.value = !showGithubTrendingProjects.value
  window.localStorage.setItem(GITHUB_TRENDING_PROJECTS_KEY, showGithubTrendingProjects.value ? '1' : '0')
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
    await refreshAll({ includeSelectedThreadMessages: false, providerChanged: true, awaitAncillaryRefreshes: true })
    if (route.name === 'thread') {
      void router.push({ name: 'home' })
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
    await refreshAll({ includeSelectedThreadMessages: false, providerChanged: true, awaitAncillaryRefreshes: true })
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
    await refreshAll({ includeSelectedThreadMessages: false, providerChanged: true, awaitAncillaryRefreshes: true })
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
    await refreshAll({ includeSelectedThreadMessages: false, providerChanged: true, awaitAncillaryRefreshes: true })
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
    const key = freeModeCustomKey.value.trim()
    await setFreeModeCustomKey(key)
    freeModeCustomKey.value = ''
    await loadFreeModeStatus()
    await refreshAll({ includeSelectedThreadMessages: false })
  } catch {
    // Silently fail
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
    await refreshAll({ includeSelectedThreadMessages: false })
  } catch {
    // Silently fail
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
    // Ignore — free mode status unknown
  }
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

function loadAccountsSectionCollapsed(): boolean {
  if (typeof window === 'undefined') return true
  const value = window.localStorage.getItem(ACCOUNTS_SECTION_COLLAPSED_STORAGE_KEY)
  if (value === null) return true
  return value === '1'
}

function toggleAccountsSectionCollapsed(): void {
  isAccountsSectionCollapsed.value = !isAccountsSectionCollapsed.value
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    ACCOUNTS_SECTION_COLLAPSED_STORAGE_KEY,
    isAccountsSectionCollapsed.value ? '1' : '0',
  )
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
  await applyLaunchProjectPathFromUrl()
  hasInitialized.value = true
  await syncThreadSelectionWithRoute()
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

      if (route.name === 'home' || route.name === 'skills') {
        if (selectedThreadId.value !== '') {
          await selectThread('')
        }
        continue
      }

      if (route.name === 'thread') {
        const threadId = routeThreadId.value
        if (!threadId) continue

        if (!knownThreadIdSet.value.has(threadId)) {
          await router.replace({ name: 'home' })
          continue
        }

        if (selectedThreadId.value !== threadId) {
          await selectThread(threadId)
        } else {
          void ensureThreadMessagesLoaded(threadId, { silent: true })
        }
      }
    } while (hasPendingRouteSync)

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
  () => [newThreadRuntime.value, newThreadCwd.value] as const,
  ([runtime, cwd]) => {
    if (runtime !== 'worktree') return
    void loadWorktreeBranches(cwd)
  },
  { immediate: true },
)

watch(
  () => newThreadRuntime.value,
  (runtime) => {
    if (runtime === 'local') {
      worktreeInitStatus.value = { phase: 'idle', title: '', message: '' }
      const current = newThreadCwd.value.trim()
      if (current && isWorktreePath(current)) {
        const fallbackProjectName = selectedThread.value?.projectName ?? getPathLeafName(current)
        const localCwd = resolvePreferredLocalCwd(fallbackProjectName, '')
        if (localCwd) {
          newThreadCwd.value = localCwd
        }
      }
      return
    }
    void loadWorktreeBranches(newThreadCwd.value)
  },
)

watch(
  () => route.name,
  (name) => {
    if (name !== 'home') {
      worktreeInitStatus.value = { phase: 'idle', title: '', message: '' }
    }
    if (name !== 'thread') {
      isReviewPaneOpen.value = false
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
  () => [route.name, composerCwd.value] as const,
  ([routeName, cwd]) => {
    if (routeName !== 'thread') {
      threadBranchOptions.value = []
      currentThreadBranch.value = null
      return
    }
    void loadThreadBranches(cwd)
  },
  { immediate: true },
)

watch(
  pageTitle,
  (value) => {
    if (typeof document === 'undefined') return
    document.title = value
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
        const created = await createWorktree(newThreadCwd.value, newWorktreeBaseBranch.value)
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
    scheduleMobileConversationJumpToLatest()
  } catch {
    // Error is already reflected in state.
  }
}

async function loadWorktreeBranches(sourceCwd: string): Promise<void> {
  const normalizedSourceCwd = sourceCwd.trim()
  if (!normalizedSourceCwd) {
    worktreeBranchOptions.value = []
    newWorktreeBaseBranch.value = ''
    return
  }

  isLoadingWorktreeBranches.value = true
  try {
    const options = await getWorktreeBranchOptions(normalizedSourceCwd)
    worktreeBranchOptions.value = options
    const currentSelection = newWorktreeBaseBranch.value.trim()
    const hasCurrentSelection = currentSelection.length > 0 && options.some((option) => option.value === currentSelection)
    if (!hasCurrentSelection) {
      const preferredMainOption = options.find((option) => option.value.trim() === 'main')
      newWorktreeBaseBranch.value = preferredMainOption?.value ?? options[0]?.value ?? ''
    }
  } catch {
    worktreeBranchOptions.value = []
    newWorktreeBaseBranch.value = ''
  } finally {
    isLoadingWorktreeBranches.value = false
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
  @apply flex-1 min-h-0 min-w-0 w-full flex flex-col gap-2 sm:gap-3 pt-1 pb-2 sm:pb-4 overflow-x-hidden;
}



.content-error {
  @apply m-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700;
}

.content-grid {
  @apply flex-1 min-h-0 flex flex-col gap-3;
}

.content-grid-home {
  @apply overflow-y-auto;
}

.content-thread {
  @apply flex-1 min-h-0;
}

.composer-with-queue {
  @apply w-full shrink-0 px-2 sm:px-6;
}

.content-header-branch-dropdown :deep(.composer-dropdown-trigger) {
  @apply rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 transition hover:bg-zinc-50;
}

.content-header-branch-dropdown :deep(.composer-dropdown-value) {
  @apply max-w-40 truncate;
}

.content-header-branch-dropdown :deep(.composer-dropdown-menu-wrap) {
  left: auto;
  right: 0;
}

.content-header-branch-dropdown.is-review-open :deep(.composer-dropdown-trigger) {
  @apply border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800;
}

.content-header-branch-dropdown.is-review-open :deep(.composer-dropdown-chevron) {
  @apply text-white;
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
  @apply h-auto p-0 text-2xl sm:text-[2.5rem] leading-[1.05];
}

.new-thread-folder-dropdown :deep(.composer-dropdown-value) {
  @apply leading-[1.05];
}

.new-thread-folder-dropdown :deep(.composer-dropdown-chevron) {
  @apply h-4 w-4 sm:h-5 sm:w-5 mt-0;
}

.new-thread-folder-selected {
  @apply mt-2 mb-0 max-w-3xl text-center text-xs text-zinc-500 break-all;
}

.new-thread-folder-actions {
  @apply mt-3 flex w-full max-w-3xl flex-wrap items-center justify-center gap-2;
}

.new-thread-folder-action {
  @apply inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-default disabled:opacity-60;
}

.new-thread-folder-action-primary {
  @apply border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800;
}

.new-thread-open-folder-overlay {
  @apply fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4;
}

.new-thread-open-folder {
  @apply flex w-full max-w-3xl max-h-[90vh] flex-col gap-2 overflow-y-auto rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-left shadow-xl;
}

.new-thread-open-folder-header {
  @apply flex items-center justify-between gap-3;
}

.new-thread-open-folder-title {
  @apply m-0 text-sm font-semibold text-zinc-900;
}

.new-thread-open-folder-close {
  @apply border-0 bg-transparent p-0 text-sm text-zinc-500 transition hover:text-zinc-800;
}

.new-thread-open-folder-label {
  @apply m-0 text-xs font-medium uppercase tracking-wide text-zinc-500;
}

.new-thread-open-folder-current {
  @apply flex items-start gap-2;
}

.new-thread-open-folder-path {
  @apply m-0 min-w-0 flex-1 rounded-xl bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-700 break-all;
}

.new-thread-open-folder-actions {
  @apply flex flex-wrap items-center gap-2;
}

.new-thread-open-folder-toggle {
  @apply inline-flex items-center gap-2 text-sm text-zinc-600;
}

.new-thread-open-folder-toggle-input {
  @apply relative h-4 w-4 shrink-0 appearance-none rounded-[4px] border border-zinc-300 bg-white outline-none transition;
}

.new-thread-open-folder-toggle-input:focus-visible {
  box-shadow: 0 0 0 3px rgb(228 228 231);
}

.new-thread-open-folder-toggle-input:checked {
  border-color: rgb(24 24 27);
  background-color: rgb(255 255 255);
}

.new-thread-open-folder-toggle-input::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border-right: 2px solid rgb(24 24 27);
  border-bottom: 2px solid rgb(24 24 27);
  transform: rotate(45deg);
  opacity: 0;
}

.new-thread-open-folder-toggle-input:checked::after {
  opacity: 1;
}

.new-thread-open-folder-filter {
  @apply w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400;
}

.new-thread-open-folder-create {
  @apply flex flex-col gap-2;
}

.new-thread-open-folder-create-composer {
  @apply flex items-center gap-2;
}

.new-thread-open-folder-create-input {
  @apply w-full min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400;
}

.new-thread-open-folder-create-submit {
  @apply shrink-0;
}

.new-thread-folder-action[aria-pressed='true'] {
  @apply border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800;
}

.new-thread-open-folder-status {
  @apply m-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600;
}

.new-thread-open-folder-error {
  @apply m-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700;
}

.new-thread-open-folder-error-actions {
  @apply flex flex-wrap items-start gap-2;
}

.new-thread-open-folder-list {
  @apply m-0 flex max-h-72 list-none flex-col gap-1 overflow-y-auto p-0 pr-3;
  scrollbar-gutter: stable;
  scrollbar-color: rgb(161 161 170) rgb(244 244 245);
  scrollbar-width: thin;
}

.new-thread-open-folder-list::-webkit-scrollbar {
  width: 10px;
}

.new-thread-open-folder-list::-webkit-scrollbar-track {
  background: rgb(244 244 245);
  border-radius: 9999px;
}

.new-thread-open-folder-list::-webkit-scrollbar-thumb {
  background: rgb(161 161 170);
  border-radius: 9999px;
  border: 2px solid rgb(244 244 245);
}

.new-thread-open-folder-list::-webkit-scrollbar-thumb:hover {
  background: rgb(113 113 122);
}

.new-thread-open-folder-item {
  @apply grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1;
}

.new-thread-open-folder-item-main {
  @apply min-w-0 truncate rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-left text-sm font-medium leading-5 text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-100;
}

.new-thread-open-folder-item-main:disabled,
.new-thread-open-folder-item-open:disabled {
  @apply cursor-default opacity-60;
}

.new-thread-open-folder-item-name {
  @apply block truncate;
}

.new-thread-open-folder-item-open {
  @apply inline-flex h-7 items-center justify-center rounded-xl border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50;
}

.new-thread-runtime-dropdown {
  @apply mt-3;
}

.new-thread-branch-select {
  @apply mt-3 w-full max-w-3xl;
}

.new-thread-branch-select-label {
  @apply m-0 mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500;
}

.new-thread-branch-dropdown :deep(.composer-dropdown-trigger) {
  @apply h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700;
}

.new-thread-branch-select-help {
  @apply mt-1 mb-0 text-xs text-zinc-500;
}

.new-thread-runtime-help {
  @apply mt-2 mb-0 max-w-3xl text-center text-xs text-zinc-500;
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

.sidebar-settings-button.is-active {
  @apply bg-zinc-200 text-zinc-900;
}

.sidebar-settings-button-version {
  @apply ml-auto min-w-0 truncate text-right text-xs;
}

.sidebar-settings-icon {
  @apply w-4.5 h-4.5;
}

.sidebar-settings-panel {
  @apply mb-1 max-h-[min(70vh,36rem)] overflow-y-auto rounded-lg border border-zinc-200 bg-white;
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

.sidebar-settings-telegram-panel {
  @apply border-t border-zinc-100 bg-zinc-50/70 px-3 py-3;
}

.sidebar-settings-field {
  @apply flex flex-col gap-1.5;
}

.sidebar-settings-field + .sidebar-settings-field {
  @apply mt-3;
}

.sidebar-settings-field-label {
  @apply text-xs font-medium text-zinc-700;
}

.sidebar-settings-input,
.sidebar-settings-textarea {
  @apply w-full rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-800 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200;
}

.sidebar-settings-textarea {
  @apply min-h-20 resize-y font-mono text-xs;
}

.sidebar-settings-field-help {
  @apply mt-2 text-xs leading-5 text-zinc-500;
}

.sidebar-settings-telegram-error {
  @apply mt-2 rounded-md bg-rose-50 px-2.5 py-2 text-xs text-rose-700;
}

.sidebar-settings-telegram-actions {
  @apply mt-3 flex items-center justify-end;
}

.sidebar-settings-telegram-save {
  @apply rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-default disabled:opacity-60;
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

.sidebar-settings-account-collapse {
  @apply inline-flex h-5 w-5 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100;
}

.sidebar-settings-account-collapse-icon {
  @apply text-[11px] leading-none;
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
  @apply flex flex-col gap-2;
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
  @apply invisible shrink-0 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] leading-4 text-zinc-500 opacity-0 pointer-events-none transition-colors hover:bg-amber-50 disabled:cursor-default disabled:opacity-60;
}

.sidebar-settings-account-remove.is-visible {
  @apply visible opacity-100 pointer-events-auto;
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

.sidebar-settings-row--input {
  @apply flex flex-col gap-1 py-1.5;
}

.sidebar-settings-error {
  @apply text-xs text-red-600 bg-red-50 rounded px-2 py-1.5 break-words;
}

.sidebar-settings-key-group {
  @apply flex items-center gap-1.5 w-full;
}

.sidebar-settings-key-input {
  @apply flex-1 min-w-0 text-xs rounded border border-zinc-200 bg-white px-2 py-1 outline-none transition-colors placeholder:text-zinc-400;
}

.sidebar-settings-key-input:focus {
  @apply border-zinc-400;
}

.sidebar-settings-key-save {
  @apply shrink-0 rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-default;
}

.sidebar-settings-key-masked {
  @apply flex-1 min-w-0 text-xs text-zinc-500 font-mono truncate;
}

.sidebar-settings-key-clear {
  @apply shrink-0 w-6 h-6 flex items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-400 transition-colors hover:text-zinc-600 hover:border-zinc-300 disabled:opacity-40;
}

.sidebar-settings-provider-select {
  @apply min-w-0 max-w-40 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none transition-colors cursor-pointer;
}

.sidebar-settings-provider-select:focus {
  @apply border-zinc-400 ring-2 ring-zinc-200;
}

.sidebar-settings-segmented {
  @apply inline-flex items-center rounded-md border border-zinc-200 bg-white p-0.5;
}

.sidebar-settings-segmented-option {
  @apply rounded px-2 py-1 text-xs text-zinc-600 transition-colors;
}

.sidebar-settings-segmented-option.is-active {
  @apply bg-zinc-800 text-white;
}

.sidebar-settings-provider-info {
  @apply flex items-center justify-between w-full;
}

.sidebar-settings-provider-link {
  @apply text-xs text-blue-600 hover:text-blue-700 underline shrink-0;
}

:root.dark .sidebar-settings-provider-select {
  @apply border-zinc-600 bg-zinc-800 text-zinc-200;
}

:root.dark .sidebar-settings-provider-select:focus {
  @apply border-zinc-500 ring-zinc-700;
}

:root.dark .sidebar-settings-segmented {
  @apply border-zinc-600 bg-zinc-800;
}

:root.dark .sidebar-settings-segmented-option {
  @apply text-zinc-300;
}

:root.dark .sidebar-settings-segmented-option.is-active {
  @apply bg-zinc-100 text-zinc-900;
}

:root.dark .sidebar-settings-provider-link {
  @apply text-blue-400 hover:text-blue-300;
}

:root.dark .sidebar-settings-key-input {
  @apply border-zinc-600 bg-zinc-800 text-zinc-200 placeholder:text-zinc-500;
}

:root.dark .sidebar-settings-key-input:focus {
  @apply border-zinc-500;
}

:root.dark .sidebar-settings-key-save {
  @apply border-zinc-600 bg-zinc-700 text-zinc-200 hover:bg-zinc-600;
}

:root.dark .sidebar-settings-key-masked {
  @apply text-zinc-400;
}

:root.dark .sidebar-settings-key-clear {
  @apply border-zinc-600 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500;
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

.sidebar-settings-context-row {
  @apply cursor-default;
}

.sidebar-settings-context-value {
  @apply text-xs font-semibold text-zinc-700 text-right;
}

.sidebar-settings-context-value[data-state='ok'] {
  @apply text-emerald-700;
}

.sidebar-settings-context-value[data-state='warning'] {
  @apply text-amber-700;
}

.sidebar-settings-context-value[data-state='danger'] {
  @apply text-rose-700;
}

.sidebar-settings-context-meta {
  @apply block text-[11px] font-normal text-zinc-500;
}

.sidebar-settings-rate-limits {
  @apply border-t border-zinc-200 px-2 pt-2;
}

.sidebar-settings-parity-section {
  @apply rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2;
}

.sidebar-settings-parity-header {
  @apply flex items-center justify-between gap-2;
}

.sidebar-settings-parity-header-actions {
  @apply flex items-center gap-1;
}

.sidebar-settings-parity-meta {
  @apply m-0 mt-1 text-[11px] text-zinc-600;
}

.sidebar-settings-parity-list {
  @apply mt-2 border-t border-zinc-200 pt-2;
}

.sidebar-settings-parity-list-title {
  @apply m-0 text-[11px] font-medium text-zinc-700;
}

.sidebar-settings-parity-list-item {
  @apply m-0 mt-1 text-[11px] text-zinc-600;
}

.sidebar-settings-parity-app-row {
  @apply mt-1 flex items-center justify-between gap-2;
}

.sidebar-settings-parity-archived-list {
  @apply mt-1 mb-2 flex flex-col gap-1;
}

.sidebar-settings-parity-archived-row {
  @apply flex items-center justify-between gap-2;
}

.sidebar-settings-parity-archived-title {
  @apply min-w-0 truncate text-[11px] text-zinc-600;
}

.sidebar-settings-parity-command-output {
  @apply mt-2 max-h-28 overflow-auto rounded border border-zinc-200 bg-white p-2 text-[11px] text-zinc-700;
}

:root.dark .sidebar-settings-parity-section {
  @apply border-zinc-700 bg-zinc-900/70;
}

:root.dark .sidebar-settings-parity-list {
  @apply border-zinc-700;
}

:root.dark .sidebar-settings-parity-meta,
:root.dark .sidebar-settings-parity-list-item {
  @apply text-zinc-300;
}

:root.dark .sidebar-settings-parity-archived-title {
  @apply text-zinc-300;
}

:root.dark .sidebar-settings-parity-command-output {
  @apply border-zinc-700 bg-zinc-900 text-zinc-200;
}

:root.dark .sidebar-settings-parity-list-title {
  @apply text-zinc-200;
}

.sidebar-settings-build-label {
  @apply border-t border-zinc-100 px-3 py-2 text-[11px] text-zinc-500;
}

</style>
