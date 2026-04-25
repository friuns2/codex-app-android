export type ThemeId = 'default' | 'graphite' | 'macos'

export type BuiltInTheme = {
  id: ThemeId
  label: string
}

export const BUILT_IN_THEMES: BuiltInTheme[] = [
  { id: 'default', label: 'Default' },
  { id: 'graphite', label: 'Graphite' },
  { id: 'macos', label: 'macOS' },
]

export const DEFAULT_THEME_ID: ThemeId = 'default'

const THEME_META_COLORS: Record<ThemeId, { light: string, dark: string }> = {
  default: {
    light: '#f1f5f9',
    dark: '#18181b',
  },
  graphite: {
    light: '#eef2f7',
    dark: '#111827',
  },
  macos: {
    light: '#f5f5f7',
    dark: '#1c1c1e',
  },
}

export const DEFAULT_THEME_META_COLOR = THEME_META_COLORS[DEFAULT_THEME_ID].light

export function getStoredThemeId(value: string | null | undefined): ThemeId {
  return BUILT_IN_THEMES.some((theme) => theme.id === value)
    ? (value as ThemeId)
    : DEFAULT_THEME_ID
}

export function getThemeMetaColor(themeId: ThemeId, appearance: 'light' | 'dark'): string {
  return THEME_META_COLORS[themeId][appearance]
}

export function normalizeMetaThemeColor(rawValue: string | null | undefined, fallback: string): string {
  const value = rawValue?.trim()
  if (!value) return fallback

  const lowerValue = value.toLowerCase()
  if (lowerValue.includes('var(') || lowerValue.includes('color-mix(')) {
    return fallback
  }

  return value
}

export function cycleThemeId(current: ThemeId): ThemeId {
  const ids = BUILT_IN_THEMES.map((theme) => theme.id)
  const index = ids.indexOf(current)
  if (index === -1) return DEFAULT_THEME_ID
  return ids[(index + 1) % ids.length] as ThemeId
}
