export type ChatWidthMode = 'standard' | 'wide' | 'extra-wide'

export type DirectoryTryItemPayload = {
  kind: 'app' | 'plugin' | 'skill' | 'composio'
  name: string
  displayName: string
  skillPath?: string
  prompt?: string
  attachedSkills?: Array<{ name: string; path: string }>
}

export type ChatWidthPreset = {
  label: string
  columnMax: string
  cardMax: string
}
