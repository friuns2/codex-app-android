export type AppearanceMode = 'system' | 'light' | 'dark'
export type EffectiveTheme = 'light' | 'dark'

export const APPEARANCE_MODES: AppearanceMode[] = ['system', 'light', 'dark']

export function getStoredAppearanceMode(value: string | null | undefined): AppearanceMode {
  return APPEARANCE_MODES.includes(value as AppearanceMode) ? (value as AppearanceMode) : 'system'
}

export function getEffectiveTheme(mode: AppearanceMode, prefersDark: boolean): EffectiveTheme {
  if (mode === 'system') {
    return prefersDark ? 'dark' : 'light'
  }
  return mode
}

export function cycleAppearanceMode(mode: AppearanceMode): AppearanceMode {
  const index = APPEARANCE_MODES.indexOf(mode)
  if (index === -1) return 'system'
  return APPEARANCE_MODES[(index + 1) % APPEARANCE_MODES.length]
}
