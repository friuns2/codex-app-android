/**
 * File management API routes.
 * Provides list, create, delete, move, download, and upload operations
 * for files and directories within an arbitrary workspace path.
 */
import { mkdir, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { basename, dirname, extname, isAbsolute, join, normalize, resolve } from 'node:path'
import { homedir } from 'node:os'

/** JSON response helper. */
function setJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

/** Cached allowed roots, computed once at startup. */
let cachedAllowedRoots: string[] | null = null

/**
 * Allowed root directories for file operations.
 * Only the CLI workspace arg, CODEX_HOME, home dir, and /tmp are permitted.
 */
function getAllowedRoots(): string[] {
  if (cachedAllowedRoots) return cachedAllowedRoots
  const roots: string[] = []
  const home = homedir()
  roots.push(home)
  // ~/.codex is always allowed (config, skills, sessions)
  const defaultCodexHome = join(home, '.codex')
  roots.push(defaultCodexHome)
  const codexHome = process.env.CODEX_HOME?.trim()
  if (codexHome) roots.push(codexHome)
  const workspace = process.env.CODEX_WORKSPACE?.trim()
  if (workspace) roots.push(workspace)
  // /tmp for temp files; /workspace for Docker/container setups
  roots.push('/tmp', '/workspace')
  cachedAllowedRoots = [...new Set(roots.map((r) => resolve(normalize(r))))]
  return cachedAllowedRoots
}

/**
 * Validate + authorize a path.
 * Resolves symlinks via realpath for existing paths, falls back to lexical resolve for new paths.
 * Must be absolute and under an allowed root after canonicalization.
 */
async function resolveAndValidate(p: string): Promise<string | null> {
  if (!p || !isAbsolute(p)) return null
  let canonical: string
  try {
    canonical = await realpath(p)
  } catch {
    // Path may not exist yet (create operations) — use lexical resolve
    canonical = resolve(normalize(p))
  }
  const roots = getAllowedRoots()
  const sep = process.platform === 'win32' ? '\\' : '/'
  const ok = roots.some((root) => canonical === root || canonical.startsWith(root + sep))
  return ok ? canonical : null
}

/** Synchronous pre-check (fast reject before async resolveAndValidate). */
function isAllowedPath(p: string): boolean {
  if (!p || !isAbsolute(p)) return false
  const resolved = resolve(normalize(p))
  const roots = getAllowedRoots()
  const sep = process.platform === 'win32' ? '\\' : '/'
  return roots.some((root) => resolved === root || resolved.startsWith(root + sep))
}

/** Single directory entry returned by the list endpoint. */
type FileEntry = {
  name: string
  path: string
  isDirectory: boolean
  size: number
  mtimeMs: number
  extension: string
}

/**
 * Handles file management routes.
 *
 * @returns True if the route was handled, false otherwise.
 */
export async function handleFileRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  context: { readJsonBody: (req: IncomingMessage) => Promise<unknown> },
): Promise<boolean> {

  // --- LIST directory contents (read-only, no workspace restriction) ---
  if (req.method === 'GET' && url.pathname === '/codex-api/files') {
    const dirPath = url.searchParams.get('path') ?? ''
    const showHidden = url.searchParams.get('showHidden') === '1'
    if (!dirPath || !isAbsolute(dirPath)) {
      setJson(res, 400, { error: 'Expected absolute directory path.' })
      return true
    }
    try {
      const dirStat = await stat(dirPath)
      if (!dirStat.isDirectory()) {
        setJson(res, 400, { error: 'Path is not a directory.' })
        return true
      }
      const entries = await readdir(dirPath, { withFileTypes: true })
      const items: FileEntry[] = []
      for (const entry of entries) {
        if (!showHidden && entry.name.startsWith('.')) continue
        const entryPath = join(dirPath, entry.name)
        try {
          const entryStat = await stat(entryPath)
          items.push({
            name: entry.name,
            path: entryPath,
            isDirectory: entry.isDirectory(),
            size: entryStat.size,
            mtimeMs: entryStat.mtimeMs,
            extension: entry.isDirectory() ? '' : extname(entry.name).toLowerCase(),
          })
        } catch {
          // Skip entries we can't stat (permission issues, broken symlinks).
        }
      }
      items.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      })
      setJson(res, 200, { path: dirPath, parentPath: dirname(dirPath), entries: items })
    } catch {
      setJson(res, 404, { error: 'Directory not found.' })
    }
    return true
  }

  // --- CREATE directory ---
  if (req.method === 'POST' && url.pathname === '/codex-api/files/mkdir') {
    const body = (await context.readJsonBody(req)) as Record<string, unknown> | null
    const dirPath = typeof body?.path === 'string' ? body.path : ''
    if (!isAllowedPath(dirPath)) {
      setJson(res, 400, { error: 'Expected absolute path.' })
      return true
    }
    try {
      const canonical = await resolveAndValidate(dirPath)
      if (!canonical) { setJson(res, 403, { error: 'Path is outside allowed workspace.' }); return true }
      await mkdir(canonical, { recursive: true })
      setJson(res, 200, { ok: true, path: canonical })
    } catch (err) {
      setJson(res, 500, { error: err instanceof Error ? err.message : 'Failed to create directory.' })
    }
    return true
  }

  // --- CREATE empty file ---
  if (req.method === 'POST' && url.pathname === '/codex-api/files/create') {
    const body = (await context.readJsonBody(req)) as Record<string, unknown> | null
    const filePath = typeof body?.path === 'string' ? body.path : ''
    if (!isAllowedPath(filePath)) {
      setJson(res, 400, { error: 'Expected absolute path.' })
      return true
    }
    try {
      const canonical = await resolveAndValidate(filePath)
      if (!canonical) { setJson(res, 403, { error: 'Path is outside allowed workspace.' }); return true }
      await mkdir(dirname(canonical), { recursive: true })
      await writeFile(canonical, '', { flag: 'wx' })
      setJson(res, 200, { ok: true, path: canonical })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create file.'
      const code = err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'EEXIST' ? 409 : 500
      setJson(res, code, { error: msg })
    }
    return true
  }

  // --- DELETE file or directory ---
  if (req.method === 'DELETE' && url.pathname === '/codex-api/files') {
    const targetPath = url.searchParams.get('path') ?? ''
    if (!isAllowedPath(targetPath)) {
      setJson(res, 400, { error: 'Expected absolute path.' })
      return true
    }
    try {
      const canonical = await resolveAndValidate(targetPath)
      if (!canonical) { setJson(res, 403, { error: 'Path is outside allowed workspace.' }); return true }
      await rm(canonical, { recursive: true, force: true })
      setJson(res, 200, { ok: true })
    } catch (err) {
      setJson(res, 500, { error: err instanceof Error ? err.message : 'Failed to delete.' })
    }
    return true
  }

  // --- MOVE / RENAME ---
  if (req.method === 'POST' && url.pathname === '/codex-api/files/move') {
    const body = (await context.readJsonBody(req)) as Record<string, unknown> | null
    const from = typeof body?.from === 'string' ? body.from : ''
    const to = typeof body?.to === 'string' ? body.to : ''
    if (!isAllowedPath(from) || !isAllowedPath(to)) {
      setJson(res, 400, { error: 'Expected absolute paths for from and to.' })
      return true
    }
    try {
      const canonFrom = await resolveAndValidate(from)
      const canonTo = await resolveAndValidate(to)
      if (!canonFrom || !canonTo) { setJson(res, 403, { error: 'Path is outside allowed workspace.' }); return true }
      await mkdir(dirname(canonTo), { recursive: true })
      await rename(canonFrom, canonTo)
      setJson(res, 200, { ok: true, from: canonFrom, to: canonTo })
    } catch (err) {
      setJson(res, 500, { error: err instanceof Error ? err.message : 'Failed to move.' })
    }
    return true
  }

  // --- DOWNLOAD file (read-only, no workspace restriction) ---
  if (req.method === 'GET' && url.pathname === '/codex-api/files/download') {
    const filePath = url.searchParams.get('path') ?? ''
    if (!filePath || !isAbsolute(filePath)) {
      setJson(res, 400, { error: 'Expected absolute file path.' })
      return true
    }
    try {
      const fileStat = await stat(filePath)
      if (!fileStat.isFile()) {
        setJson(res, 400, { error: 'Path is not a file.' })
        return true
      }
      const fileName = basename(filePath)
      res.statusCode = 200
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
      res.setHeader('Content-Length', fileStat.size)

      const { createReadStream } = await import('node:fs')
      const stream = createReadStream(filePath)
      stream.pipe(res)
      stream.on('error', () => {
        if (!res.headersSent) setJson(res, 500, { error: 'Read error.' })
        else res.end()
      })
    } catch {
      setJson(res, 404, { error: 'File not found.' })
    }
    return true
  }

  // --- UPLOAD files to a target directory ---
  if (req.method === 'POST' && url.pathname === '/codex-api/files/upload') {
    const targetDir = url.searchParams.get('path') ?? ''
    if (!isAllowedPath(targetDir)) {
      setJson(res, 400, { error: 'Expected absolute target directory path.' })
      return true
    }
    try {
      const canonicalDir = await resolveAndValidate(targetDir)
      if (!canonicalDir) { setJson(res, 403, { error: 'Path is outside allowed workspace.' }); return true }
      const contentType = req.headers['content-type'] ?? ''
      const boundaryMatch = contentType.match(/boundary=([^\s;]+)/)
      if (!boundaryMatch) {
        setJson(res, 400, { error: 'Missing multipart boundary.' })
        return true
      }

      const body = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', () => resolve(Buffer.concat(chunks)))
        req.on('error', reject)
      })

      const boundary = boundaryMatch[1]
      const boundaryBuf = Buffer.from(`--${boundary}`)
      const parts: Buffer[] = []
      let searchStart = 0
      while (searchStart < body.length) {
        const idx = body.indexOf(boundaryBuf, searchStart)
        if (idx < 0) break
        if (searchStart > 0) parts.push(body.subarray(searchStart, idx))
        searchStart = idx + boundaryBuf.length
        if (body[searchStart] === 0x0d && body[searchStart + 1] === 0x0a) searchStart += 2
      }

      const headerSep = Buffer.from('\r\n\r\n')
      const uploaded: string[] = []
      for (const part of parts) {
        const headerEnd = part.indexOf(headerSep)
        if (headerEnd < 0) continue
        const headers = part.subarray(0, headerEnd).toString('utf8')
        const fnMatch = headers.match(/filename="([^"]+)"/i)
        if (!fnMatch) continue
        const rawName = fnMatch[1]
        const safeName = rawName.replace(/\.\./g, '_')
        let end = part.length
        if (end >= 2 && part[end - 2] === 0x0d && part[end - 1] === 0x0a) end -= 2
        const fileData = part.subarray(headerEnd + 4, end)

        const destPath = join(canonicalDir, safeName)
        await mkdir(dirname(destPath), { recursive: true })
        await writeFile(destPath, fileData)
        uploaded.push(destPath)
      }

      setJson(res, 200, { ok: true, uploaded })
    } catch (err) {
      setJson(res, 500, { error: err instanceof Error ? err.message : 'Upload failed.' })
    }
    return true
  }

  return false
}
