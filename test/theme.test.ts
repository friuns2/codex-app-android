import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  APPEARANCE_MODES,
  cycleAppearanceMode,
  getEffectiveTheme,
  getStoredAppearanceMode,
  type AppearanceMode,
} from '../src/theme.ts'
import {
  BUILT_IN_THEMES,
  cycleThemeId,
  DEFAULT_THEME_ID,
  DEFAULT_THEME_META_COLOR,
  getThemeMetaColor,
  getStoredThemeId,
  normalizeMetaThemeColor,
  type ThemeId,
} from '../src/theme/themes.ts'

const styleCss = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8')
const appShellThemeCss = readFileSync(resolve(process.cwd(), 'src/theme/app-shell-theme.css'), 'utf8')
const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const manifestWebmanifest = readFileSync(resolve(process.cwd(), 'public/manifest.webmanifest'), 'utf8')
const appVue = readFileSync(resolve(process.cwd(), 'src/App.vue'), 'utf8')
const accountMenuVue = readFileSync(resolve(process.cwd(), 'src/components/content/AccountMenu.vue'), 'utf8')
const composerDropdownVue = readFileSync(resolve(process.cwd(), 'src/components/content/ComposerDropdown.vue'), 'utf8')
const composerRuntimeDropdownVue = readFileSync(resolve(process.cwd(), 'src/components/content/ComposerRuntimeDropdown.vue'), 'utf8')
const composerSkillPickerVue = readFileSync(resolve(process.cwd(), 'src/components/content/ComposerSkillPicker.vue'), 'utf8')
const reviewPaneVue = readFileSync(resolve(process.cwd(), 'src/components/content/ReviewPane.vue'), 'utf8')
const skillsHubVue = readFileSync(resolve(process.cwd(), 'src/components/content/SkillsHub.vue'), 'utf8')
const threadComposerVue = readFileSync(resolve(process.cwd(), 'src/components/content/ThreadComposer.vue'), 'utf8')
const threadConversationVue = readFileSync(resolve(process.cwd(), 'src/components/content/ThreadConversation.vue'), 'utf8')
const desktopLayoutVue = readFileSync(resolve(process.cwd(), 'src/components/layout/DesktopLayout.vue'), 'utf8')
const sidebarThreadTreeVue = readFileSync(resolve(process.cwd(), 'src/components/sidebar/SidebarThreadTree.vue'), 'utf8')

function getThemeTokenBlock(theme: string, appearance: string): Record<string, string> {
  const escapedTheme = theme.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedAppearance = appearance.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = styleCss.match(
    new RegExp(`:root\\[data-theme='${escapedTheme}'\\]\\[data-appearance='${escapedAppearance}'\\]\\s*\\{([\\s\\S]*?)\\n\\}`)
  )
  assert.ok(match, `missing token block for ${theme}/${appearance}`)

  return Object.fromEntries(
    Array.from(match[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)).map((tokenMatch) => [
      `--${tokenMatch[1]}`,
      tokenMatch[2].trim(),
    ])
  )
}

test('appearance modes remain system, light, and dark', () => {
  assert.deepEqual(APPEARANCE_MODES, ['system', 'light', 'dark'])
  assert.equal(getEffectiveTheme('system', false), 'light')
  assert.equal(getEffectiveTheme('system', true), 'dark')
  assert.equal(getEffectiveTheme('light', true), 'light')
  assert.equal(getEffectiveTheme('dark', false), 'dark')
})

test('appearance mode helpers still sanitize and cycle values', () => {
  assert.equal(getStoredAppearanceMode('system'), 'system')
  assert.equal(getStoredAppearanceMode('light'), 'light')
  assert.equal(getStoredAppearanceMode('dark'), 'dark')
  assert.equal(getStoredAppearanceMode('missing'), 'system')
  assert.equal(getStoredAppearanceMode(null), 'system')

  let current: AppearanceMode = 'system'
  const seen = new Set<AppearanceMode>()
  for (let index = 0; index < APPEARANCE_MODES.length; index += 1) {
    seen.add(current)
    current = cycleAppearanceMode(current)
  }

  assert.deepEqual([...seen], APPEARANCE_MODES)
  assert.equal(current, 'system')
})

test('theme helpers keep macos opt-in and leave default as fallback', () => {
  assert.equal(DEFAULT_THEME_ID, 'default')
  assert.deepEqual(
    BUILT_IN_THEMES.map((theme) => theme.id),
    ['default', 'graphite', 'macos']
  )
  assert.equal(getStoredThemeId('default'), 'default')
  assert.equal(getStoredThemeId('graphite'), 'graphite')
  assert.equal(getStoredThemeId('macos'), 'macos')
  assert.equal(getStoredThemeId('missing' as ThemeId), DEFAULT_THEME_ID)
  assert.equal(cycleThemeId('default'), 'graphite')
  assert.equal(cycleThemeId('graphite'), 'macos')
  assert.equal(cycleThemeId('macos'), 'default')
  assert.equal(DEFAULT_THEME_META_COLOR, '#f1f5f9')
  assert.equal(getThemeMetaColor('default', 'light'), '#f1f5f9')
  assert.equal(getThemeMetaColor('default', 'dark'), '#18181b')
  assert.equal(getThemeMetaColor('graphite', 'light'), '#eef2f7')
  assert.equal(getThemeMetaColor('graphite', 'dark'), '#111827')
  assert.equal(getThemeMetaColor('macos', 'light'), '#f5f5f7')
  assert.equal(getThemeMetaColor('macos', 'dark'), '#1c1c1e')
  assert.equal(normalizeMetaThemeColor('#f1f5f9', '#000000'), '#f1f5f9')
  assert.equal(normalizeMetaThemeColor('rgb(245 245 247)', '#000000'), 'rgb(245 245 247)')
  assert.equal(normalizeMetaThemeColor('rgb(var(--color-materialThick-dark))', '#1c1c1e'), '#1c1c1e')
  assert.equal(normalizeMetaThemeColor('color-mix(in srgb, white 90%, black)', '#f5f5f7'), '#f5f5f7')
  assert.equal(normalizeMetaThemeColor('', '#f5f5f7'), '#f5f5f7')
})

test('index bootstraps explicit appearance support before mount', () => {
  assert.match(indexHtml, /<meta name="color-scheme" content="light dark"/)
  assert.match(indexHtml, /<meta name="theme-color" content="#020617"/)
  assert.match(indexHtml, /document\.documentElement/)
  assert.match(indexHtml, /const readStorage = \(key\) => \{/)
  assert.match(indexHtml, /try \{\s*return window\.localStorage\.getItem\(key\)\s*\} catch \{\s*return null\s*\}/)
  assert.match(indexHtml, /meta\[name="theme-color"\]/)
  assert.match(indexHtml, /themeColorMeta\.setAttribute\('content', themeColor\)/)
  assert.match(indexHtml, /meta\[name="apple-mobile-web-app-status-bar-style"\]/)
  assert.match(indexHtml, /statusBarMeta\.setAttribute\('content', effectiveAppearance === 'dark' \? 'black-translucent' : 'default'\)/)
})

test('manifest keeps upstream dark fallback browser chrome color', () => {
  assert.match(manifestWebmanifest, /"background_color": "#020617"/)
  assert.match(manifestWebmanifest, /"theme_color": "#020617"/)
})

test('shared stylesheet still defines token blocks and keeps macos styling scoped', () => {
  assert.match(styleCss, /@import "tailwindcss-uikit-colors\/v4\/macos\.css";/)
  assert.match(styleCss, /@import "\.\/theme\/app-shell-theme\.css";/)
  assert.match(styleCss, /:root\[data-theme='default'\]\[data-appearance='light'\]/)
  assert.match(styleCss, /:root\[data-theme='default'\]\[data-appearance='dark'\]/)
  assert.match(styleCss, /:root\[data-theme='graphite'\]\[data-appearance='light'\]/)
  assert.match(styleCss, /:root\[data-theme='graphite'\]\[data-appearance='dark'\]/)
  assert.match(styleCss, /:root\[data-theme='macos'\]\[data-appearance='light'\]/)
  assert.match(styleCss, /:root\[data-theme='macos'\]\[data-appearance='dark'\]/)
  assert.match(
    styleCss,
    /:root\[data-theme='macos'\]\[data-appearance='light'\]\s+\.desktop-layout,\s*:root\[data-theme='macos'\]\[data-appearance='dark'\]\s+\.desktop-layout/
  )
  assert.doesNotMatch(
    styleCss,
    /:root\[data-theme='default'\]\[data-appearance='light'\]\s+\.desktop-layout,\s*:root\[data-theme='default'\]\[data-appearance='dark'\]\s+\.desktop-layout/
  )
})

test('default theme tokens resolve to the legacy light palette', () => {
  const tokens = getThemeTokenBlock('default', 'light')

  assert.equal(tokens['--theme-body-background'], '#f1f5f9')
  assert.equal(tokens['--theme-shell-bg'], '#f1f5f9')
  assert.equal(tokens['--theme-sidebar-bg'], '#f1f5f9')
  assert.equal(tokens['--theme-main-bg'], '#ffffff')
  assert.equal(tokens['--theme-panel-bg'], '#ffffff')
  assert.equal(tokens['--theme-panel-subtle-bg'], '#fafafa')
  assert.equal(tokens['--theme-control-bg'], '#ffffff')
  assert.equal(tokens['--theme-control-hover-bg'], '#fafafa')
  assert.equal(tokens['--theme-control-active-bg'], '#f4f4f5')
  assert.equal(tokens['--theme-selection-bg'], '#e4e4e7')
  assert.equal(tokens['--theme-text-primary'], '#0f172a')
  assert.equal(tokens['--theme-text-secondary'], '#3f3f46')
  assert.equal(tokens['--theme-text-subtle'], '#52525b')
  assert.equal(tokens['--theme-text-muted'], '#71717a')
  assert.equal(tokens['--theme-shell-text'], '#0f172a')
  assert.equal(tokens['--theme-heading-text'], '#18181b')
  assert.equal(tokens['--theme-runtime-bg'], '#f4f4f5')
  assert.equal(tokens['--theme-runtime-selected-bg'], '#ffffff')
  assert.equal(tokens['--theme-runtime-selected-border'], '#e4e4e7')
  assert.equal(tokens['--theme-runtime-selected-text'], '#18181b')
  assert.equal(tokens['--theme-code-bg'], '#020617')
  assert.equal(tokens['--theme-code-header-bg'], 'rgba(15, 23, 42, 0.94)')
  assert.equal(tokens['--theme-code-text'], '#f1f5f9')
  assert.equal(tokens['--theme-code-muted'], '#94a3b8')
  assert.equal(tokens['--theme-message-text'], '#1e293b')
  assert.equal(tokens['--theme-message-heading'], '#0f172a')
  assert.equal(tokens['--theme-message-muted'], '#64748b')
  assert.equal(tokens['--theme-message-blockquote-border'], '#cbd5e1')
  assert.equal(tokens['--theme-message-blockquote-bg'], 'rgba(248, 250, 252, 0.7)')
  assert.equal(tokens['--theme-message-blockquote-text'], '#334155')
  assert.equal(tokens['--theme-message-inline-code-border'], '#e2e8f0')
  assert.equal(tokens['--theme-message-inline-code-bg'], 'rgba(241, 245, 249, 0.6)')
  assert.equal(tokens['--theme-message-inline-code-text'], '#0f172a')
  assert.equal(tokens['--theme-message-table-bg'], '#ffffff')
  assert.equal(tokens['--theme-message-table-head-bg'], '#f1f5f9')
  assert.equal(tokens['--theme-message-divider-bg'], 'rgba(203, 213, 225, 0.8)')
  assert.equal(tokens['--theme-plan-bg'], '#f0f9ff')
  assert.equal(tokens['--theme-plan-border'], '#bae6fd')
  assert.equal(tokens['--theme-plan-card-text'], '#0f172a')
  assert.equal(tokens['--theme-plan-title'], '#0c4a6e')
  assert.equal(tokens['--theme-plan-text'], '#334155')
  assert.equal(tokens['--theme-plan-badge-bg'], '#bae6fd')
  assert.equal(tokens['--theme-plan-badge-text'], '#0c4a6e')
  assert.equal(tokens['--theme-plan-inline-code-bg'], 'rgba(226, 232, 240, 0.8)')
  assert.equal(tokens['--theme-plan-inline-code-text'], '#0f172a')
  assert.equal(tokens['--theme-plan-table-bg'], 'rgba(255, 255, 255, 0.9)')
  assert.equal(tokens['--theme-plan-step-bg'], 'rgba(255, 255, 255, 0.8)')
  assert.equal(tokens['--theme-plan-step-border'], 'rgba(255, 255, 255, 0.7)')
  assert.equal(tokens['--theme-plan-step-text'], '#1e293b')
  assert.equal(tokens['--theme-plan-step-status-bg'], '#e2e8f0')
  assert.equal(tokens['--theme-plan-step-status-text'], '#334155')
  assert.equal(tokens['--theme-plan-step-completed-bg'], 'rgba(236, 253, 245, 0.8)')
  assert.equal(tokens['--theme-plan-step-completed-border'], '#a7f3d0')
  assert.equal(tokens['--theme-plan-step-completed-status-bg'], '#a7f3d0')
  assert.equal(tokens['--theme-plan-step-completed-status-text'], '#064e3b')
  assert.equal(tokens['--theme-plan-step-in-progress-bg'], 'rgba(255, 251, 235, 0.8)')
  assert.equal(tokens['--theme-plan-step-in-progress-border'], '#fde68a')
  assert.equal(tokens['--theme-plan-step-in-progress-status-bg'], '#fde68a')
  assert.equal(tokens['--theme-plan-step-in-progress-status-text'], '#78350f')
})

test('default theme tokens resolve to the legacy dark palette', () => {
  const tokens = getThemeTokenBlock('default', 'dark')

  assert.equal(tokens['--theme-body-background'], '#18181b')
  assert.equal(tokens['--theme-shell-bg'], '#18181b')
  assert.equal(tokens['--theme-sidebar-bg'], '#18181b')
  assert.equal(tokens['--theme-main-bg'], '#09090b')
  assert.equal(tokens['--theme-panel-bg'], '#27272a')
  assert.equal(tokens['--theme-panel-subtle-bg'], '#27272a')
  assert.equal(tokens['--theme-control-bg'], '#3f3f46')
  assert.equal(tokens['--theme-control-hover-bg'], '#3f3f46')
  assert.equal(tokens['--theme-control-active-bg'], '#3f3f46')
  assert.equal(tokens['--theme-selection-bg'], '#27272a')
  assert.equal(tokens['--theme-text-primary'], '#f4f4f5')
  assert.equal(tokens['--theme-text-secondary'], '#d4d4d8')
  assert.equal(tokens['--theme-text-subtle'], '#d4d4d8')
  assert.equal(tokens['--theme-text-muted'], '#a1a1aa')
  assert.equal(tokens['--theme-shell-text'], '#f4f4f5')
  assert.equal(tokens['--theme-heading-text'], '#f4f4f5')
  assert.equal(tokens['--theme-settings-button-text'], '#a1a1aa')
  assert.equal(tokens['--theme-runtime-bg'], '#18181b')
  assert.equal(tokens['--theme-runtime-selected-bg'], '#27272a')
  assert.equal(tokens['--theme-runtime-selected-text'], '#f4f4f5')
  assert.equal(tokens['--theme-accent'], '#18181b')
  assert.equal(tokens['--theme-code-bg'], '#09090b')
  assert.equal(tokens['--theme-code-header-bg'], '#18181b')
  assert.equal(tokens['--theme-code-text'], '#f4f4f5')
  assert.equal(tokens['--theme-code-muted'], '#a1a1aa')
  assert.equal(tokens['--theme-message-text'], '#e4e4e7')
  assert.equal(tokens['--theme-message-heading'], '#f4f4f5')
  assert.equal(tokens['--theme-message-muted'], '#a1a1aa')
  assert.equal(tokens['--theme-message-blockquote-border'], '#52525b')
  assert.equal(tokens['--theme-message-blockquote-bg'], 'rgba(39, 39, 42, 0.7)')
  assert.equal(tokens['--theme-message-blockquote-text'], '#d4d4d8')
  assert.equal(tokens['--theme-message-inline-code-border'], '#52525b')
  assert.equal(tokens['--theme-message-inline-code-bg'], 'rgba(63, 63, 70, 0.6)')
  assert.equal(tokens['--theme-message-inline-code-text'], '#e4e4e7')
  assert.equal(tokens['--theme-message-table-bg'], 'rgba(24, 24, 27, 0.9)')
  assert.equal(tokens['--theme-message-table-head-bg'], '#27272a')
  assert.equal(tokens['--theme-message-divider-bg'], 'rgba(63, 63, 70, 0.8)')
  assert.equal(tokens['--theme-plan-bg'], 'rgba(8, 47, 73, 0.4)')
  assert.equal(tokens['--theme-plan-border'], '#075985')
  assert.equal(tokens['--theme-plan-card-text'], '#0f172a')
  assert.equal(tokens['--theme-plan-title'], '#bae6fd')
  assert.equal(tokens['--theme-plan-text'], '#d4d4d8')
  assert.equal(tokens['--theme-plan-badge-bg'], '#075985')
  assert.equal(tokens['--theme-plan-badge-text'], '#e0f2fe')
  assert.equal(tokens['--theme-plan-inline-code-bg'], 'rgba(63, 63, 70, 0.6)')
  assert.equal(tokens['--theme-plan-inline-code-text'], '#e4e4e7')
  assert.equal(tokens['--theme-plan-table-bg'], 'rgba(24, 24, 27, 0.9)')
  assert.equal(tokens['--theme-plan-step-bg'], 'rgba(24, 24, 27, 0.7)')
  assert.equal(tokens['--theme-plan-step-border'], '#3f3f46')
  assert.equal(tokens['--theme-plan-step-text'], '#e4e4e7')
  assert.equal(tokens['--theme-plan-step-status-bg'], '#3f3f46')
  assert.equal(tokens['--theme-plan-step-status-text'], '#e4e4e7')
  assert.equal(tokens['--theme-plan-step-completed-bg'], 'rgba(2, 44, 34, 0.4)')
  assert.equal(tokens['--theme-plan-step-completed-border'], '#064e3b')
  assert.equal(tokens['--theme-plan-step-completed-status-bg'], '#064e3b')
  assert.equal(tokens['--theme-plan-step-completed-status-text'], '#a7f3d0')
  assert.equal(tokens['--theme-plan-step-in-progress-bg'], 'rgba(69, 26, 3, 0.4)')
  assert.equal(tokens['--theme-plan-step-in-progress-border'], '#78350f')
  assert.equal(tokens['--theme-plan-step-in-progress-status-bg'], '#78350f')
  assert.equal(tokens['--theme-plan-step-in-progress-status-text'], '#fde68a')
})

test('legacy settings styling stays on the main branch base with explicit appearance overrides while skills hub stays tokenized', () => {
  assert.match(
    appVue,
    /\.sidebar-settings-panel\s*\{\s*@apply mb-1 max-h-\[min\(70vh,36rem\)\] overflow-y-auto rounded-lg border border-zinc-200 bg-white;/
  )
  assert.match(
    appVue,
    /\.sidebar-settings-row\s*\{\s*@apply flex items-center justify-between w-full px-3 py-2\.5 text-sm text-zinc-700 border-0 bg-transparent transition hover:bg-zinc-50 cursor-pointer;/
  )
  assert.match(
    appVue,
    /\.sidebar-settings-account-section\s*\{\s*@apply border-t border-zinc-100 bg-zinc-50\/60 px-3 py-3;/
  )
  assert.match(
    appVue,
    /\.sidebar-settings-value\s*\{\s*@apply text-xs text-zinc-500 bg-zinc-100 rounded px-1\.5 py-0\.5;/
  )
  assert.match(
    appVue,
    /\.sidebar-settings-toggle\s*\{\s*@apply relative w-9 h-5 rounded-full bg-zinc-300 transition-colors shrink-0;/
  )
  assert.match(
    appVue,
    /\.sidebar-settings-account-refresh\s*\{\s*@apply shrink-0 rounded-full border border-zinc-200 bg-white px-2\.5 py-1 text-xs text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-default disabled:opacity-60;/
  )
  assert.match(
    styleCss,
    /:root\[data-appearance='dark'\]:not\(\[data-theme='macos'\]\) \.sidebar-settings-panel\s*\{\s*border-color: var\(--theme-border\);\s*background: var\(--theme-panel-bg\);/
  )
  assert.match(
    styleCss,
    /:root\[data-appearance='dark'\]:not\(\[data-theme='macos'\]\) \.sidebar-settings-telegram-panel,\s*:root\[data-appearance='dark'\]:not\(\[data-theme='macos'\]\) \.sidebar-settings-account-section\s*\{\s*border-color: var\(--theme-border\);\s*background: var\(--theme-panel-subtle-bg\);/
  )
  assert.match(
    styleCss,
    /:root\[data-appearance='dark'\]:not\(\[data-theme='macos'\]\) \.sidebar-settings-account-count,\s*:root\[data-appearance='dark'\]:not\(\[data-theme='macos'\]\) \.sidebar-settings-account-id,\s*:root\[data-appearance='dark'\]:not\(\[data-theme='macos'\]\) \.sidebar-settings-value\s*\{\s*background: var\(--theme-control-active-bg\);\s*color: var\(--theme-text-secondary\);/
  )
  assert.match(
    styleCss,
    /:root\[data-appearance='dark'\]:not\(\[data-theme='macos'\]\) \.sidebar-settings-toggle\s*\{\s*background: var\(--theme-border-strong\);/
  )
  assert.match(
    styleCss,
    /:root\[data-appearance='dark'\]:not\(\[data-theme='macos'\]\) \.sidebar-settings-toggle\.is-on\s*\{\s*background: var\(--theme-selection-bg\);/
  )
  assert.match(
    skillsHubVue,
    /\.skills-hub-sort\s*\{\s*@apply shrink-0 rounded-lg border px-2\.5 py-1\.5 text-xs font-medium transition cursor-pointer;\s*border-color: var\(--theme-border\);\s*background: var\(--theme-control-bg\);\s*color: var\(--theme-text-secondary\);/
  )
  assert.match(
    skillsHubVue,
    /\.skills-sync-badge\s*\{\s*@apply text-xs rounded-md border px-2 py-0\.5;\s*border-color: var\(--theme-border\);\s*background: var\(--theme-control-bg\);\s*color: var\(--theme-text-secondary\);/
  )
  assert.match(
    skillsHubVue,
    /\.skills-sync-panel\s*\{\s*@apply rounded-xl border p-3 flex flex-col gap-2;\s*border-color: var\(--theme-border\);\s*background: var\(--theme-panel-subtle-bg\);/
  )
})

test('legacy component styling remains the default base for non-macos themes', () => {
  assert.match(
    desktopLayoutVue,
    /\.desktop-layout\s*\{\s*@apply grid bg-slate-100 text-slate-900 overflow-hidden;/
  )
  assert.match(
    accountMenuVue,
    /\.account-menu-panel\s*\{\s*@apply absolute right-0 top-\[calc\(100%\+8px\)\] z-50 flex w-80 max-w-\[calc\(100vw-24px\)\] flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg;/
  )
  assert.match(
    composerDropdownVue,
    /\.composer-dropdown-menu\s*\{\s*@apply m-0 min-w-56 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg;/
  )
  assert.match(
    composerRuntimeDropdownVue,
    /\.runtime-toggle\s*\{\s*@apply inline-flex items-center gap-1 rounded-full border p-1;\s*border-color: var\(--theme-border\);\s*background: var\(--theme-runtime-bg, color-mix\(in srgb, var\(--theme-control-bg\) 84%, var\(--theme-main-bg\)\)\);/
  )
  assert.match(
    composerRuntimeDropdownVue,
    /\.runtime-toggle-option\.is-selected\s*\{\s*border-color: var\(--theme-runtime-selected-border, var\(--theme-selection-border\)\);\s*background: var\(--theme-runtime-selected-bg, var\(--theme-selection-bg\)\);\s*color: var\(--theme-runtime-selected-text, var\(--theme-selection-text\)\);/
  )
  assert.match(
    styleCss,
    /:root\[data-theme\]\[data-appearance\] \.runtime-toggle-option\.is-selected,\s*:root\[data-theme\]\[data-appearance\] \.composer-dropdown-option\.is-selected,\s*:root\[data-theme\]\[data-appearance\] \.organize-menu-item\[data-active='true'\],\s*:root\[data-theme\]\[data-appearance\] \.thread-row\[data-active='true'\],/
  )
  assert.match(
    styleCss,
    /:root\[data-theme\]\[data-appearance\] \.runtime-toggle-option\.is-selected\s*\{\s*border-color: var\(--theme-runtime-selected-border, var\(--theme-selection-border\)\);\s*background: var\(--theme-runtime-selected-bg, var\(--theme-selection-bg\)\);\s*color: var\(--theme-runtime-selected-text, var\(--theme-selection-text\)\);/
  )
  assert.doesNotMatch(styleCss, /^\.sidebar-settings-panel\s*\{/m)
  assert.doesNotMatch(styleCss, /^\.sidebar-settings-row\s*\{/m)
  assert.doesNotMatch(styleCss, /^\.sidebar-settings-value\s*\{/m)
  assert.doesNotMatch(
    styleCss,
    /:root\[data-theme\]\[data-appearance\] \.sidebar-settings-toggle,/
  )
  assert.match(
    composerSkillPickerVue,
    /\.skill-picker\s*\{\s*@apply absolute z-40 w-72 max-sm:!left-4 max-sm:!right-4 max-sm:!w-auto max-h-64 rounded-xl border border-zinc-200 bg-white shadow-lg flex flex-col overflow-hidden;/
  )
  assert.match(
    reviewPaneVue,
    /\.review-pane\s*\{\s*@apply flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white;/
  )
  assert.match(
    threadComposerVue,
    /\.thread-composer-shell\s*\{\s*@apply relative rounded-2xl border border-zinc-300 bg-white p-2 sm:p-3 shadow-sm;/
  )
  assert.match(
    threadConversationVue,
    /\.plan-card\s*\{\s*@apply flex max-w-\[min\(var\(--chat-card-max,76ch\),100%\)\] flex-col gap-3 rounded-2xl border px-4 py-3;\s*border-color: var\(--theme-plan-border\);\s*background: var\(--theme-plan-bg\);\s*color: var\(--theme-plan-card-text\);/
  )
  assert.doesNotMatch(
    threadConversationVue,
    /\.plan-card\s*\{\s*@apply flex max-w-\[min\(var\(--chat-card-max,76ch\),100%\)\] flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-slate-900;/
  )
  assert.doesNotMatch(
    threadConversationVue,
    /\.message-card\[data-role='assistant'\],\s*\.message-card\[data-role='system'\]\s*\{[^}]*width: fit-content;/
  )
  assert.match(
    sidebarThreadTreeVue,
    /\.organize-menu-panel\s*\{\s*@apply absolute right-0 top-full mt-1 z-30 min-w-44 rounded-xl border border-zinc-200 bg-white\/95 p-1\.5 shadow-lg backdrop-blur-sm;/
  )
  assert.doesNotMatch(sidebarThreadTreeVue, /\.thread-row\s*\{\s*@apply hover:bg-zinc-200;\s*\}/)
  assert.doesNotMatch(
    sidebarThreadTreeVue,
    /\.thread-row\[data-active='true'\]\s*\{\s*@apply bg-zinc-200;\s*\}/
  )
})

test('theme app-shell stylesheet remains available for shared shell surfaces', () => {
  assert.match(appShellThemeCss, /\.content-root\s*\{[\s\S]*var\(--theme-main-bg\)/)
  assert.match(appShellThemeCss, /\.sidebar-search-bar\s*\{[\s\S]*var\(--theme-control-bg\)/)
  assert.match(appShellThemeCss, /\.content-header-terminal-toggle\s*\{[\s\S]*var\(--theme-control-bg\)/)
  assert.match(appShellThemeCss, /\.new-thread-open-folder\s*\{[\s\S]*var\(--theme-panel-bg\)/)
})

test('shared shell controls avoid hardcoded App-level colors and keep review-open state tokenized', () => {
  assert.match(
    appShellThemeCss,
    /\.content-header-terminal-toggle\[aria-pressed='true'\]\s*\{[\s\S]*border-color: var\(--theme-selection-border\);[\s\S]*background: var\(--theme-selection-bg\);[\s\S]*color: var\(--theme-selection-text\);/
  )
  assert.match(
    appShellThemeCss,
    /\.content-header-branch-dropdown\.is-review-open \.composer-dropdown-trigger\s*\{[\s\S]*border-color: var\(--theme-info-border\);[\s\S]*background: var\(--theme-info-soft-bg\);[\s\S]*color: var\(--theme-info-text\);/
  )
  assert.doesNotMatch(
    appShellThemeCss,
    /\.new-thread-folder-action-primary,\s*\.new-thread-folder-action\[aria-pressed='true'\],\s*\.content-header-branch-dropdown\.is-review-open \.composer-dropdown-trigger/
  )
  assert.doesNotMatch(
    appVue,
    /\.content-header-terminal-toggle\s*\{\s*@apply flex h-8 items-center gap-1\.5 rounded-full border border-zinc-200 bg-white px-2\.5 text-xs text-zinc-700 transition hover:bg-zinc-50;\s*\}/
  )
  assert.doesNotMatch(
    appVue,
    /\.content-header-branch-dropdown\.is-review-open\s*:deep\(\.composer-dropdown-trigger\)\s*\{\s*@apply border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800;\s*\}/
  )
  assert.doesNotMatch(
    appVue,
    /\.new-thread-open-folder-overlay\s*\{\s*@apply fixed inset-0 z-50 flex items-center justify-center bg-black\/40 p-4;/
  )
})

test('shared shell active states stay centralized instead of drifting in App scoped CSS', () => {
  assert.match(
    appShellThemeCss,
    /\.sidebar-skills-link\.is-active\s*\{[\s\S]*background: var\(--theme-selection-bg\);[\s\S]*color: var\(--theme-selection-text\);/
  )
  assert.match(
    appShellThemeCss,
    /\.new-thread-open-folder-toggle-input:focus-visible\s*\{[\s\S]*color-mix\(in srgb, var\(--theme-selection-bg\) 85%, transparent\)/
  )
  assert.match(
    appShellThemeCss,
    /\.new-thread-open-folder-toggle-input:checked\s*\{[\s\S]*border-color: var\(--theme-accent\);[\s\S]*background-color: var\(--theme-control-bg\);/
  )
  assert.doesNotMatch(
    appVue,
    /\.sidebar-skills-link\.is-active\s*\{[^}]*background: var\(--theme-[^;]+;/
  )
  assert.doesNotMatch(
    appVue,
    /\.new-thread-open-folder-toggle-input:focus-visible\s*\{[^}]*box-shadow:/
  )
  assert.doesNotMatch(
    appVue,
    /\.new-thread-open-folder-toggle-input:checked\s*\{[^}]*background-color:/
  )
})

test('pressed sidebar search toggle keeps selected-state styling instead of generic control styling', () => {
  assert.match(
    appVue,
    /\.sidebar-search-toggle\[aria-pressed='true'\]\s*\{\s*border-color: var\(--theme-selection-border\);\s*background: var\(--theme-selection-bg\);\s*color: var\(--theme-selection-text\);/
  )
  assert.doesNotMatch(
    styleCss,
    /:root\[data-theme\]\[data-appearance\] \.sidebar-search-toggle\[aria-pressed='true'\],/
  )
})

test('macos sidebar settings stay compact instead of using inflated fallback sizing', () => {
  assert.match(
    styleCss,
    /:root\[data-theme='macos'\]\[data-appearance='light'\] \.sidebar-settings-row,\s*:root\[data-theme='macos'\]\[data-appearance='dark'\] \.sidebar-settings-row \{[\s\S]*min-height: 2\.5rem;[\s\S]*padding-inline: 0\.75rem;/
  )
  assert.match(
    styleCss,
    /:root\[data-theme='macos'\]\[data-appearance='light'\] \.sidebar-settings-provider-select,[\s\S]*:root\[data-theme='macos'\]\[data-appearance='dark'\] \.sidebar-settings-telegram-save \{[\s\S]*min-height: 1\.875rem;[\s\S]*padding-inline: 0\.625rem;/
  )
  assert.doesNotMatch(
    styleCss,
    /:root\[data-theme='macos'\]\[data-appearance='light'\] \.sidebar-settings-row,\s*:root\[data-theme='macos'\]\[data-appearance='dark'\] \.sidebar-settings-row \{[\s\S]*min-height: 2\.75rem;/
  )
  assert.doesNotMatch(
    styleCss,
    /:root\[data-theme='macos'\]\[data-appearance='light'\] \.sidebar-settings-provider-select,[\s\S]*:root\[data-theme='macos'\]\[data-appearance='dark'\] \.sidebar-settings-telegram-save \{[\s\S]*min-height: 2\.125rem;/
  )
  assert.match(
    appVue,
    /class="sidebar-settings-row sidebar-settings-row--select sidebar-settings-row--provider"/
  )
  assert.match(
    appVue,
    /class="sidebar-settings-row sidebar-settings-row--select sidebar-settings-row--language"/
  )
  assert.match(
    styleCss,
    /@media \(max-width: 768px\) \{[\s\S]*:root\[data-theme='macos'\]\[data-appearance='light'\] \.sidebar-settings-row--provider,\s*:root\[data-theme='macos'\]\[data-appearance='dark'\] \.sidebar-settings-row--provider,\s*:root\[data-theme='macos'\]\[data-appearance='light'\] \.sidebar-settings-row--language,\s*:root\[data-theme='macos'\]\[data-appearance='dark'\] \.sidebar-settings-row--language \{[\s\S]*padding-inline: 0\.625rem;[\s\S]*gap: 0\.5rem;/
  )
  assert.match(
    styleCss,
    /@media \(max-width: 768px\) \{[\s\S]*:root\[data-theme='macos'\]\[data-appearance='light'\] \.sidebar-settings-row--provider \.sidebar-settings-provider-select,\s*:root\[data-theme='macos'\]\[data-appearance='dark'\] \.sidebar-settings-row--provider \.sidebar-settings-provider-select \{[\s\S]*max-width: 8rem;[\s\S]*:root\[data-theme='macos'\]\[data-appearance='light'\] \.sidebar-settings-row--language \.sidebar-settings-language-dropdown \.composer-dropdown-value,\s*:root\[data-theme='macos'\]\[data-appearance='dark'\] \.sidebar-settings-row--language \.sidebar-settings-language-dropdown \.composer-dropdown-value \{[\s\S]*max-width: 3\.5rem;/
  )
})

test('macos assistant conversation cards keep panel padding inside the message shell', () => {
  assert.match(
    styleCss,
    /:root\[data-theme='macos'\]\[data-appearance='light'\] \.message-body\[data-role='assistant'\] \.message-card,\s*:root\[data-theme='macos'\]\[data-appearance='dark'\] \.message-body\[data-role='assistant'\] \.message-card,\s*:root\[data-theme='macos'\]\[data-appearance='light'\] \.message-body\[data-role='system'\] \.message-card,\s*:root\[data-theme='macos'\]\[data-appearance='dark'\] \.message-body\[data-role='system'\] \.message-card\s*\{[^}]*padding:\s*0\.875rem 1rem;/
  )
  assert.match(
    threadConversationVue,
    /<style>\s*:root\[data-theme='macos'\]\[data-appearance='light'\] \.message-body\[data-role='assistant'\] \.message-card\[data-role='assistant'\],\s*:root\[data-theme='macos'\]\[data-appearance='dark'\] \.message-body\[data-role='assistant'\] \.message-card\[data-role='assistant'\],\s*:root\[data-theme='macos'\]\[data-appearance='light'\] \.message-body\[data-role='system'\] \.message-card\[data-role='system'\],\s*:root\[data-theme='macos'\]\[data-appearance='dark'\] \.message-body\[data-role='system'\] \.message-card\[data-role='system'\]\s*\{\s*padding:\s*0\.875rem 1rem;\s*\}\s*<\/style>/
  )
})

test('queued message strip and pending request panels use theme tokens with macos polish', () => {
  assert.match(
    styleCss,
    /:root\[data-theme\]\[data-appearance\] \.queued-messages-inner\s*\{[\s\S]*border-color: var\(--theme-border\);[\s\S]*background: color-mix\(in srgb, var\(--theme-panel-subtle-bg\) 92%, transparent\);/
  )
  assert.match(
    styleCss,
    /:root\[data-theme\]\[data-appearance\] \.queued-row-edit,\s*:root\[data-theme\]\[data-appearance\] \.queued-row-steer\s*\{[\s\S]*border-color: var\(--theme-border\);[\s\S]*background: var\(--theme-control-bg\);[\s\S]*color: var\(--theme-text-secondary\);/
  )
  assert.match(
    styleCss,
    /:root\[data-theme\]\[data-appearance\] \.thread-pending-request-shell\s*\{[\s\S]*border-color: var\(--theme-border\);[\s\S]*background: var\(--theme-panel-bg\);[\s\S]*color: var\(--theme-text-primary\);/
  )
  assert.match(
    styleCss,
    /:root\[data-theme\]\[data-appearance\] \.thread-pending-request-primary\s*\{[\s\S]*border-color: var\(--theme-accent\);[\s\S]*background: var\(--theme-accent\);[\s\S]*color: var\(--theme-accent-contrast\);/
  )
  assert.match(
    styleCss,
    /:root\[data-theme='macos'\]\[data-appearance='light'\] \.queued-messages-inner,\s*:root\[data-theme='macos'\]\[data-appearance='dark'\] \.queued-messages-inner,\s*:root\[data-theme='macos'\]\[data-appearance='light'\] \.thread-pending-request-shell,\s*:root\[data-theme='macos'\]\[data-appearance='dark'\] \.thread-pending-request-shell\s*\{[\s\S]*border-radius: var\(--theme-macos-panel-radius\);/
  )
})
