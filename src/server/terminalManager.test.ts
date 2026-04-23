import { describe, expect, it } from 'vitest'
import {
  ThreadTerminalManager,
  type TerminalNotification,
  type TerminalPty,
} from './terminalManager'

type ExitPayload = { exitCode: number, signal?: number }

class FakePty implements TerminalPty {
  writes: string[] = []
  resizes: Array<{ cols: number, rows: number }> = []
  killed = false
  private dataHandlers: Array<(data: string) => void> = []
  private exitHandlers: Array<(event: ExitPayload) => void> = []

  write(data: string): void {
    this.writes.push(data)
  }

  resize(cols: number, rows: number): void {
    this.resizes.push({ cols, rows })
  }

  kill(): void {
    this.killed = true
  }

  onData(handler: (data: string) => void): { dispose: () => void } {
    this.dataHandlers.push(handler)
    return { dispose: () => {} }
  }

  onExit(handler: (event: ExitPayload) => void): { dispose: () => void } {
    this.exitHandlers.push(handler)
    return { dispose: () => {} }
  }

  emitData(data: string): void {
    for (const handler of this.dataHandlers) {
      handler(data)
    }
  }

  emitExit(event: ExitPayload = { exitCode: 0 }): void {
    for (const handler of this.exitHandlers) {
      handler(event)
    }
  }
}

function createHarness(options: {
  exists?: (path: string) => boolean
  homeDir?: () => string
  cwd?: () => string
  shell?: string
} = {}) {
  const ptys: FakePty[] = []
  const spawnCalls: Array<{ file: string, opt: { cols?: number, rows?: number, cwd?: string, env?: Record<string, string | undefined> } }> = []
  const notifications: TerminalNotification[] = []
  let helperCalls = 0
  const manager = new ThreadTerminalManager({
    spawn: (file, _args, opt) => {
      const pty = new FakePty()
      ptys.push(pty)
      spawnCalls.push({ file, opt })
      return pty
    },
    exists: options.exists ?? ((value) => value === '/repo' || value === '/home/tester'),
    homeDir: options.homeDir ?? (() => '/home/tester'),
    cwd: options.cwd ?? (() => '/fallback-cwd'),
    shell: options.shell ?? '/bin/zsh',
    platform: 'darwin',
    ensureSpawnHelperExecutable: () => {
      helperCalls += 1
    },
  })
  manager.subscribe((notification) => notifications.push(notification))
  return {
    manager,
    ptys,
    spawnCalls,
    notifications,
    get helperCalls() {
      return helperCalls
    },
  }
}

describe('ThreadTerminalManager edge cases', () => {
  it('rejects missing thread ids before spawning', () => {
    const { manager, spawnCalls } = createHarness()

    expect(() => manager.attach({ threadId: '   ', cwd: '/repo' })).toThrow('Missing threadId')
    expect(spawnCalls).toHaveLength(0)
  })

  it('falls back from invalid cwd to home, then process cwd', () => {
    const homeHarness = createHarness({
      exists: (value) => value === '/home/tester',
    })
    const homeSession = homeHarness.manager.attach({ threadId: 'thread-1', cwd: '/missing' })

    expect(homeSession.cwd).toBe('/home/tester')
    expect(homeHarness.spawnCalls[0]?.opt.cwd).toBe('/home/tester')

    const cwdHarness = createHarness({
      exists: () => false,
      cwd: () => '/process-cwd',
    })
    const cwdSession = cwdHarness.manager.attach({ threadId: 'thread-1', cwd: '/missing' })

    expect(cwdSession.cwd).toBe('/process-cwd')
    expect(cwdHarness.spawnCalls[0]?.opt.cwd).toBe('/process-cwd')
  })

  it('clamps initial and resize dimensions', () => {
    const { manager, ptys, spawnCalls } = createHarness()
    const session = manager.attach({
      threadId: 'thread-1',
      cwd: '/repo',
      cols: 9999,
      rows: -10,
    })

    expect(spawnCalls[0]?.opt.cols).toBe(500)
    expect(spawnCalls[0]?.opt.rows).toBe(1)

    manager.resize(session.id, 0, 9999)

    expect(ptys[0]?.resizes).toEqual([{ cols: 1, rows: 500 }])
  })

  it('normalizes PTY environment for macOS locale and node-pty helper', () => {
    const harness = createHarness()
    const { manager, spawnCalls } = harness

    manager.attach({ threadId: 'thread-1', cwd: '/repo' })

    expect(harness.helperCalls).toBe(1)
    expect(spawnCalls[0]?.opt.env?.TERM).toBe('xterm-256color')
    expect(spawnCalls[0]?.opt.env?.LANG).toBe('en_US.UTF-8')
    expect(spawnCalls[0]?.opt.env?.LC_ALL).toBe('en_US.UTF-8')
    expect(spawnCalls[0]?.opt.env?.LC_CTYPE).toBe('en_US.UTF-8')
    expect(spawnCalls[0]?.opt.env).not.toHaveProperty('TERMINFO')
    expect(spawnCalls[0]?.opt.env).not.toHaveProperty('TERMINFO_DIRS')
  })

  it('truncates snapshots to the last 16 KiB and marks them truncated', () => {
    const { manager, ptys, notifications } = createHarness()
    manager.attach({ threadId: 'thread-1', cwd: '/repo' })

    const longOutput = `${'a'.repeat(20 * 1024)}tail`
    ptys[0]?.emitData(longOutput)
    const snapshot = manager.getSnapshotForThread('thread-1')

    expect(snapshot?.truncated).toBe(true)
    expect(snapshot?.buffer).toHaveLength(16 * 1024)
    expect(snapshot?.buffer.endsWith('tail')).toBe(true)
    expect(notifications.some((notification) => notification.method === 'terminal-data')).toBe(true)
  })

  it('reattaches an existing session, emits init log, and syncs changed cwd safely', () => {
    const { manager, ptys, notifications } = createHarness({
      exists: (value) => value === '/repo' || value === "/repo/with ' quote",
    })
    const first = manager.attach({ threadId: 'thread-1', cwd: '/repo' })
    ptys[0]?.emitData('previous output')
    notifications.splice(0, notifications.length)

    const second = manager.attach({
      threadId: 'thread-1',
      cwd: "/repo/with ' quote",
      sessionId: first.id,
    })

    expect(second.id).toBe(first.id)
    expect(second.cwd).toBe("/repo/with ' quote")
    expect(ptys[0]?.writes.at(-1)).toBe("cd '/repo/with '\\'' quote'\r")
    expect(notifications.map((notification) => notification.method)).toEqual([
      'terminal-init-log',
      'terminal-attached',
    ])
  })

  it('creates new tab sessions and removes active snapshots on close/exit', () => {
    const { manager, ptys, notifications } = createHarness()
    const first = manager.attach({ threadId: 'thread-1', cwd: '/repo', sessionId: 'first' })
    const second = manager.attach({ threadId: 'thread-1', cwd: '/repo', sessionId: 'second', newSession: true })

    expect(first.id).toBe('first')
    expect(second.id).toBe('second')
    expect(ptys[0]?.killed).toBe(false)
    expect(manager.getSnapshotForThread('thread-1')?.id).toBe('second')

    manager.close('second')

    expect(ptys[1]?.killed).toBe(true)
    expect(manager.getSnapshotForThread('thread-1')).toBeNull()
    expect(notifications.some((notification) => notification.method === 'terminal-exit')).toBe(true)

    const reattached = manager.attach({ threadId: 'thread-1', cwd: '/repo', sessionId: 'first' })
    expect(reattached.id).toBe('first')
    expect(manager.getSnapshotForThread('thread-1')?.id).toBe('first')

    const third = manager.attach({ threadId: 'thread-1', cwd: '/repo', sessionId: 'third' })
    expect(third.id).toBe('third')
    ptys[2]?.emitExit({ exitCode: 7 })

    expect(manager.getSnapshotForThread('thread-1')).toBeNull()
  })
})
