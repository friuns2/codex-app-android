# Integrated Terminal

## Summary
The integrated terminal feature adds a Codex.app-style xterm panel to local/worktree threads in `codex-web-local`. It gives each thread an interactive PTY scoped to the thread working directory and exposes a readable snapshot endpoint for recent terminal output.

## Source
- [Integrated terminal implementation source](../../raw/features/integrated-terminal.md)

## Architecture
- The browser renders the terminal with `@xterm/xterm` and `@xterm/addon-fit` in `ThreadTerminalPanel.vue`.
- The server bridge manages PTYs with `node-pty` in `terminalManager.ts`.
- Terminal notifications reuse the existing `/codex-api/ws` stream with Codex.app-style event names:
  - `terminal-attached`
  - `terminal-init-log`
  - `terminal-data`
  - `terminal-exit`
  - `terminal-error`
- HTTP endpoints handle attach, input, resize, close, and snapshot reads.

## Parity Decisions
- Match Codex.app copy and shortcut basics:
  - `Toggle terminal`
  - `New terminal`
  - `Close`
  - `CmdOrCtrl+J`
- Match core terminal runtime behavior:
  - `TERM=xterm-256color`
  - 16 KiB rolling output buffer
  - snapshot shape `{ cwd, shell, buffer, truncated }`
- Use web transports instead of Electron IPC:
  - `/codex-api/ws`
  - `/codex-api/thread-terminal/*`

## Important Edge Cases
- Invalid cwd falls back to home, then process cwd.
- Dimension values are clamped before PTY spawn and resize.
- PTY locale should be normalized to avoid macOS shell warnings.
- `node-pty` `spawn-helper` may need executable permissions restored when pnpm skips native build scripts.
- Reattach must emit init log before attached state so hidden/reopened terminals restore recent output.
- Changed cwd on reattach must be shell-quoted before writing `cd <path>`.
- `New terminal` creates another tab without killing the previous PTY; the snapshot endpoint follows whichever tab is active.
- Close and PTY exit must clear the active thread snapshot.

## UI Lessons
- Keep the terminal outside the pending-request/composer `v-if`/`v-else` pair. If the terminal is inserted between them, Vue pairs `v-else` with the terminal instead of the pending request and hides the composer while the terminal is open.
- On mobile, sidebar collapse should run immediately on first render. Otherwise screenshot or direct-route loads can leave the drawer covering the terminal.
- Keep mobile terminal height constrained so both terminal and composer remain visible.

## Verification
- Unit coverage lives in `src/server/terminalManager.test.ts`.
- Manual and browser verification is documented in `tests.md` and `whatToTest.md`.
- The final browser checklist validated:
  - keyboard toggle
  - cwd output
  - snapshot endpoint
  - hide/reopen and refresh/reopen
  - new terminal replacement
  - close cleanup
  - desktop/mobile/tablet layout

## Related Pages
- [Entity: codex-web-local](../entities/codex-web-local.md)
