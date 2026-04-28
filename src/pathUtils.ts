function stripWindowsDevicePathPrefix(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  if (trimmed.startsWith('\\\\?\\UNC\\')) {
    return `\\\\${trimmed.slice('\\\\?\\UNC\\'.length)}`
  }

  if (trimmed.startsWith('\\\\?\\')) {
    return trimmed.slice('\\\\?\\'.length)
  }

  return trimmed
}

export function normalizePathForUi(value: string): string {
  return stripWindowsDevicePathPrefix(value)
}

function isWindowsLikePath(value: string): boolean {
  return /^[a-z]:[\\/]/iu.test(value) || value.startsWith('\\\\')
}

export function normalizePathForComparison(value: string): string {
  const normalized = normalizePathForUi(value).replace(/[\\/]+/gu, '/')
  return isWindowsLikePath(normalized) ? normalized.toLowerCase() : normalized
}

export function getPathLeafName(value: string): string {
  const normalized = normalizePathForUi(value).replace(/[\\/]+$/u, '')
  if (!normalized) return ''

  const separatorIndex = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'))
  if (separatorIndex < 0) return normalized
  return normalized.slice(separatorIndex + 1)
}

export function getPathParent(value: string): string {
  const normalized = normalizePathForUi(value).replace(/[\\/]+$/u, '')
  if (!normalized) return ''

  const separatorIndex = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'))
  if (separatorIndex <= 0) return ''
  return normalized.slice(0, separatorIndex)
}

export function toProjectName(value: string): string {
  const leaf = getPathLeafName(value)
  return leaf || normalizePathForUi(value) || 'unknown-project'
}

export function isProjectlessChatPath(value: string): boolean {
  const normalized = normalizePathForUi(value).replace(/[\\/]+/gu, '/')
  if (!normalized) return false
  return /(?:^|\/)Documents\/Codex\/\d{4}-\d{2}-\d{2}\/[^/]+$/u.test(normalized)
}
