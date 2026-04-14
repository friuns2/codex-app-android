function normalizeFileUrlToPath(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (!trimmed.startsWith('file://')) return trimmed

  try {
    return decodeURIComponent(trimmed.replace(/^file:\/\//u, ''))
  } catch {
    return trimmed.replace(/^file:\/\//u, '')
  }
}

function normalizePathSeparators(value: string): string {
  return value.replace(/\\/gu, '/')
}

function normalizePathDots(value: string): string {
  const normalized = normalizePathSeparators(value.trim())
  if (!normalized) return ''

  const windowsDriveMatch = normalized.match(/^[A-Za-z]:/u)
  const windowsDrive = windowsDriveMatch?.[0] ?? ''
  let rest = windowsDrive ? normalized.slice(windowsDrive.length) : normalized
  let root = windowsDrive

  if (rest.startsWith('/')) {
    root = `${root}/`
    rest = rest.slice(1)
  }

  const parts = rest.split('/').filter(Boolean)
  const stack: string[] = []
  for (const part of parts) {
    if (part === '.') continue
    if (part === '..') {
      if (stack.length > 0) stack.pop()
      continue
    }
    stack.push(part)
  }

  const joined = stack.join('/')
  if (root) return `${root}${joined}`.replace(/\/+$/u, '') || root
  return joined || normalized
}

export function isAbsoluteFilePath(value: string): boolean {
  const normalized = normalizePathDots(normalizeFileUrlToPath(value))
  return normalized.startsWith('/') || /^[A-Za-z]:\//u.test(normalized)
}

function inferHomeFromCwd(cwd: string): string {
  const normalized = normalizePathDots(normalizeFileUrlToPath(cwd))
  if (!normalized.startsWith('/')) return ''

  const parts = normalized.split('/').filter(Boolean)
  if (parts[0] === 'home' && parts[1]) {
    return `/${parts.slice(0, 2).join('/')}`
  }
  if (parts[0] === 'Users' && parts[1]) {
    return `/${parts.slice(0, 2).join('/')}`
  }
  return ''
}

export function resolveFilePath(pathValue: string, cwd = ''): string {
  const normalizedPath = normalizePathDots(normalizeFileUrlToPath(pathValue))
  if (!normalizedPath) return ''
  if (isAbsoluteFilePath(normalizedPath)) return normalizedPath

  if (normalizedPath.startsWith('~/')) {
    const homeBase = inferHomeFromCwd(cwd)
    if (homeBase) {
      return normalizePathDots(`${homeBase}/${normalizedPath.slice(2)}`)
    }
  }

  const normalizedCwd = normalizePathDots(normalizeFileUrlToPath(cwd))
  if (!normalizedCwd) return normalizedPath
  return normalizePathDots(`${normalizedCwd.replace(/\/+$/u, '')}/${normalizedPath}`)
}

export function joinFilePath(basePath: string, childName: string): string {
  const base = normalizePathDots(basePath)
  const child = normalizePathSeparators(childName.trim()).replace(/^\/+/u, '')
  if (!base) return child
  if (!child) return base
  return normalizePathDots(`${base.replace(/\/+$/u, '')}/${child}`)
}

export function getParentFilePath(pathValue: string): string {
  const normalized = normalizePathDots(pathValue)
  if (!normalized) return ''
  if (normalized === '/' || /^[A-Za-z]:\/?$/u.test(normalized)) return normalized

  const trimmed = normalized.replace(/\/+$/u, '')
  const lastSlash = trimmed.lastIndexOf('/')
  if (lastSlash < 0) return ''
  if (lastSlash === 2 && /^[A-Za-z]:\//u.test(trimmed)) return `${trimmed.slice(0, 2)}/`
  if (lastSlash === 0) return '/'
  return trimmed.slice(0, lastSlash)
}

export function getPathLeafName(pathValue: string): string {
  const normalized = normalizePathDots(pathValue).replace(/\/+$/u, '')
  if (!normalized) return ''
  if (normalized === '/') return '/'

  const windowsRootMatch = normalized.match(/^([A-Za-z]:)$/u)
  if (windowsRootMatch) return windowsRootMatch[1]

  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized
}

export function buildFilesRouteQuery(
  pathValue: string,
  options?: { cwd?: string },
): Record<string, string> {
  const query: Record<string, string> = {}
  const normalizedPath = pathValue.trim()
  if (normalizedPath) query.path = normalizedPath
  const normalizedCwd = options?.cwd?.trim() ?? ''
  if (normalizedCwd) query.cwd = normalizedCwd
  return query
}

export function buildFilesRouteLocation(
  pathValue: string,
  options?: { cwd?: string },
): { name: 'files'; query: Record<string, string> } {
  return {
    name: 'files',
    query: buildFilesRouteQuery(pathValue, options),
  }
}

export function buildFilesRouteHref(
  pathValue: string,
  options?: { cwd?: string },
): string {
  const query = new URLSearchParams(buildFilesRouteQuery(pathValue, options))
  const suffix = query.toString()
  return suffix ? `/#/files?${suffix}` : '/#/files'
}

export function buildRawFileHref(pathValue: string): string {
  const normalized = pathValue.trim()
  if (!normalized) return '#'
  return `/codex-local-file?path=${encodeURIComponent(normalized)}`
}

export function getPathBreadcrumbs(pathValue: string): Array<{ label: string; path: string }> {
  const normalized = normalizePathDots(pathValue)
  if (!normalized) return []

  const segments: Array<{ label: string; path: string }> = []
  const windowsDriveMatch = normalized.match(/^([A-Za-z]:)(\/.*)?$/u)
  if (windowsDriveMatch) {
    const drive = windowsDriveMatch[1]
    const rest = windowsDriveMatch[2] ?? ''
    const parts = rest.split('/').filter(Boolean)
    let current = `${drive}/`
    segments.push({ label: drive, path: current })
    for (const part of parts) {
      current = joinFilePath(current, part)
      segments.push({ label: part, path: current })
    }
    return segments
  }

  if (normalized.startsWith('/')) {
    segments.push({ label: '/', path: '/' })
  }

  const parts = normalized.split('/').filter(Boolean)
  let current = normalized.startsWith('/') ? '/' : ''
  for (const part of parts) {
    current = current ? joinFilePath(current, part) : part
    segments.push({ label: part, path: current })
  }
  return segments
}
