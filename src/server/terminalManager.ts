import { chmodSync, existsSync, lstatSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { basename, dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { spawnSync } from 'node:child_process'
import type { IPty, IPtyForkOptions } from 'node-pty-prebuilt-multiarch'

const TERMINAL_BUFFER_LIMIT = 16 * 1024
const DEFAULT_COLS = 80
const DEFAULT_ROWS = 24
const TERMINAL_NAME = 'xterm-256color'
const require = createRequire(import.meta.url)

export type TerminalNotification = {
  method: string
  params: unknown
}

export type TerminalSessionSnapshot = {
  id: string
  threadId: string
  cwd: string
  shell: string
  buffer: string
  truncated: boolean
}

type TerminalSession = {
  id: string
  threadId: string
  cwd: string
  shell: string
  pty: TerminalPty
  buffer: string
  truncated: boolean
}

export type TerminalPty = Pick<IPty, 'write' | 'resize' | 'kill' | 'onData' | 'onExit'>

type SpawnTerminal = (
  file: string,
  args: string[],
  opt: IPtyForkOptions,
) => TerminalPty

export type TerminalManagerOptions = {
  spawn?: SpawnTerminal
  exists?: (path: string) => boolean
  homeDir?: () => string
  cwd?: () => string
  platform?: NodeJS.Platform
  shell?: string
  ensureSpawnHelperExecutable?: () => void
}

export type TerminalAttachParams = {
  threadId: string
  cwd: string
  sessionId?: string
  cols?: number
  rows?: number
  newSession?: boolean
}

export class ThreadTerminalManager {
  private readonly sessions = new Map<string, TerminalSession>()
  private readonly activeSessionIdByThreadId = new Map<string, string>()
  private readonly listeners = new Set<(notification: TerminalNotification) => void>()
  private readonly spawn: SpawnTerminal
  private readonly exists: (path: string) => boolean
  private readonly homeDir: () => string
  private readonly cwd: () => string
  private readonly platform: NodeJS.Platform
  private readonly shell: string | null
  private readonly ensureSpawnHelperExecutable: () => void

  constructor(options: TerminalManagerOptions = {}) {
    this.spawn = options.spawn ?? loadTerminalSpawn()
    this.exists = options.exists ?? existsSync
    this.homeDir = options.homeDir ?? homedir
    this.cwd = options.cwd ?? process.cwd
    this.platform = options.platform ?? process.platform
    this.shell = options.shell ?? null
    this.ensureSpawnHelperExecutable = options.ensureSpawnHelperExecutable ?? ensureNodePtyPrebuiltExecutable
  }

  subscribe(listener: (notification: TerminalNotification) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  attach(params: TerminalAttachParams): TerminalSessionSnapshot {
    const threadId = params.threadId.trim()
    if (!threadId) {
      throw new Error('Missing threadId')
    }

    const requestedSessionId = params.sessionId?.trim() || ''
    const existingSessionId = params.newSession
      ? ''
      : requestedSessionId || this.activeSessionIdByThreadId.get(threadId) || ''
    const existing = existingSessionId ? this.sessions.get(existingSessionId) : null
    if (existing) {
      this.activeSessionIdByThreadId.set(threadId, existing.id)
      this.resize(existing.id, params.cols, params.rows)
      const nextCwd = this.resolveCwd(params.cwd)
      if (nextCwd !== existing.cwd) {
        existing.cwd = nextCwd
        existing.pty.write(`cd ${shellQuote(nextCwd)}\r`)
      }
      this.emitInit(existing)
      this.emitAttached(existing)
      return this.toSnapshot(existing)
    }

    const session = this.createSession({
      threadId,
      cwd: params.cwd,
      sessionId: requestedSessionId || randomUUID(),
      cols: params.cols,
      rows: params.rows,
    })
    this.sessions.set(session.id, session)
    this.activeSessionIdByThreadId.set(threadId, session.id)
    this.emitAttached(session)
    return this.toSnapshot(session)
  }

  write(sessionId: string, data: string): void {
    const session = this.requireSession(sessionId)
    session.pty.write(data)
  }

  resize(sessionId: string, cols: unknown, rows: unknown): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const nextCols = normalizeDimension(cols, DEFAULT_COLS)
    const nextRows = normalizeDimension(rows, DEFAULT_ROWS)
    session.pty.resize(nextCols, nextRows)
  }

  close(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    this.sessions.delete(session.id)
    if (this.activeSessionIdByThreadId.get(session.threadId) === session.id) {
      this.activeSessionIdByThreadId.delete(session.threadId)
    }
    session.pty.kill()
    this.emit({
      method: 'terminal-exit',
      params: {
        sessionId: session.id,
        threadId: session.threadId,
        code: null,
        signal: null,
      },
    })
  }

  getSnapshotForThread(threadId: string): TerminalSessionSnapshot | null {
    const sessionId = this.activeSessionIdByThreadId.get(threadId.trim())
    if (!sessionId) return null
    const session = this.sessions.get(sessionId)
    return session ? this.toSnapshot(session) : null
  }

  dispose(): void {
    for (const sessionId of Array.from(this.sessions.keys())) {
      this.close(sessionId)
    }
    this.listeners.clear()
  }

  private createSession(params: {
    threadId: string
    cwd: string
    sessionId: string
    cols?: number
    rows?: number
  }): TerminalSession {
    const cwd = this.resolveCwd(params.cwd)
    const shell = this.resolveShell()
    const env: Record<string, string> = {
      ...process.env,
      TERM: TERMINAL_NAME,
    } as Record<string, string>
    normalizeLocaleEnv(env, this.platform)
    delete env.TERMINFO
    delete env.TERMINFO_DIRS

    this.ensureSpawnHelperExecutable()
    const pty = this.spawn(shell, [], {
      name: TERMINAL_NAME,
      cols: normalizeDimension(params.cols, DEFAULT_COLS),
      rows: normalizeDimension(params.rows, DEFAULT_ROWS),
      cwd,
      env,
    })

    const session: TerminalSession = {
      id: params.sessionId,
      threadId: params.threadId,
      cwd,
      shell: basename(shell),
      pty,
      buffer: '',
      truncated: false,
    }

    pty.onData((data) => {
      this.appendOutput(session, data)
    })
    pty.onExit(({ exitCode, signal }) => {
      if (this.sessions.get(session.id) === session) {
        this.sessions.delete(session.id)
      }
      if (this.activeSessionIdByThreadId.get(session.threadId) === session.id) {
        this.activeSessionIdByThreadId.delete(session.threadId)
      }
      this.emit({
        method: 'terminal-exit',
        params: {
          sessionId: session.id,
          threadId: session.threadId,
          code: exitCode,
          signal: signal == null ? null : String(signal),
        },
      })
    })

    return session
  }

  private appendOutput(session: TerminalSession, data: string): void {
    const next = `${session.buffer}${data}`
    if (next.length > TERMINAL_BUFFER_LIMIT) {
      session.buffer = next.slice(-TERMINAL_BUFFER_LIMIT)
      session.truncated = true
    } else {
      session.buffer = next
    }
    this.emit({
      method: 'terminal-data',
      params: {
        sessionId: session.id,
        threadId: session.threadId,
        data,
      },
    })
  }

  private emitInit(session: TerminalSession): void {
    if (!session.buffer) return
    this.emit({
      method: 'terminal-init-log',
      params: {
        sessionId: session.id,
        threadId: session.threadId,
        log: session.buffer,
        truncated: session.truncated,
      },
    })
  }

  private emitAttached(session: TerminalSession): void {
    this.emit({
      method: 'terminal-attached',
      params: {
        sessionId: session.id,
        threadId: session.threadId,
        cwd: session.cwd,
        shell: session.shell,
      },
    })
  }

  private emit(notification: TerminalNotification): void {
    for (const listener of this.listeners) {
      listener(notification)
    }
  }

  private requireSession(sessionId: string): TerminalSession {
    const session = this.sessions.get(sessionId.trim())
    if (!session) {
      throw new Error('Terminal session missing')
    }
    return session
  }

  private resolveShell(): string {
    if (this.shell) return this.shell
    if (this.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe'
    }
    return process.env.SHELL || '/bin/zsh'
  }

  private resolveCwd(value: string): string {
    const cwd = value.trim()
    if (cwd && this.exists(cwd)) {
      return cwd
    }
    const home = this.homeDir()
    if (home && this.exists(home)) {
      return home
    }
    return this.cwd()
  }

  private toSnapshot(session: TerminalSession): TerminalSessionSnapshot {
    return {
      id: session.id,
      threadId: session.threadId,
      cwd: session.cwd,
      shell: session.shell,
      buffer: session.buffer,
      truncated: session.truncated,
    }
  }
}

function normalizeDimension(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.min(500, Math.trunc(parsed)))
}

function loadTerminalSpawn(): SpawnTerminal {
  repairNativePtyBuild('node-pty-prebuilt-multiarch')
  repairNativePtyBuild('node-pty')

  if (resolveNodePtyPrebuiltPath()) {
    try {
      const terminal = require('node-pty-prebuilt-multiarch') as { spawn: SpawnTerminal }
      return terminal.spawn
    } catch {
      // Fall back to maintained node-pty when the legacy prebuild exists but cannot load.
    }
  }
  const terminal = require('node-pty') as { spawn: SpawnTerminal }
  return terminal.spawn
}

function repairNativePtyBuild(packageName: string): void {
  try {
    const packageJson = require.resolve(`${packageName}/package.json`)
    const packageRoot = dirname(packageJson)
    const buildDir = join(packageRoot, 'build')
    const makefile = join(buildDir, 'Makefile')
    const binary = join(buildDir, 'Release', 'pty.node')
    if (!existsSync(makefile) || !isBrokenSymlink(binary)) return

    const source = readFileSync(makefile, 'utf8')
    const patched = source.replace(
      /^cmd_copy = ln -f "\$<" "\$@" 2>\/dev\/null \|\| \(rm -rf "\$@" && cp -af "\$<" "\$@"\)$/m,
      'cmd_copy = rm -rf "$@" && cp -af "$<" "$@"',
    )
    if (patched !== source) {
      writeFileSync(makefile, patched)
    }
    rmSync(binary, { force: true })
    spawnSync('make', ['BUILDTYPE=Release', '-C', buildDir], { stdio: 'ignore' })
  } catch {
    // Native PTY load below will surface the actionable error if repair fails.
  }
}

function isBrokenSymlink(path: string): boolean {
  try {
    if (!lstatSync(path).isSymbolicLink()) return false
    try {
      return !existsSync(realpathSync(path))
    } catch {
      return true
    }
  } catch {
    return false
  }
}

function resolveNodePtyPrebuiltPath(): string | null {
  try {
    const packageJson = require.resolve('node-pty-prebuilt-multiarch/package.json')
    const packageRoot = dirname(packageJson)
    const builtPath = join(packageRoot, 'build', 'Release', 'pty.node')
    if (existsSync(builtPath)) {
      return builtPath
    }
    const runtime = Object.prototype.hasOwnProperty.call(process.versions, 'electron') ? 'electron' : 'node'
    const libc = process.platform === 'linux' && existsSync('/etc/alpine-release') ? '.musl' : ''
    const binaryName = `${runtime}.abi${process.versions.modules}${libc}.node`
    const binaryPath = join(packageRoot, 'prebuilds', `${process.platform}-${process.arch}`, binaryName)
    return existsSync(binaryPath) ? binaryPath : null
  } catch {
    return null
  }
}

function ensureNodePtyPrebuiltExecutable(): void {
  if (process.platform !== 'darwin' && process.platform !== 'linux') return
  try {
    const nodePtyEntry = require.resolve('node-pty-prebuilt-multiarch')
    const packageRoot = join(dirname(nodePtyEntry), '..')
    const helperPath = join(packageRoot, 'prebuilds', `${process.platform}-${process.arch}`, 'spawn-helper')
    if (existsSync(helperPath)) {
      chmodSync(helperPath, 0o755)
    }
  } catch {
    // If the PTY package changes layout, let it surface its own spawn error.
  }
}

function normalizeLocaleEnv(env: Record<string, string>, platform: NodeJS.Platform): void {
  const locale = platform === 'darwin' ? 'en_US.UTF-8' : 'C.UTF-8'
  env.LANG = locale
  env.LC_ALL = locale
  env.LC_CTYPE = locale
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}
