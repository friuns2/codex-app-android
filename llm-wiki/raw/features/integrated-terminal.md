# Integrated Terminal Implementation Source

Date captured: 2026-04-22

## Context
The `codex-web-local` project added a Codex.app-style integrated terminal for local/worktree threads.

## Implementation Facts
- Runtime dependencies:
  - `@xterm/xterm`
  - `@xterm/addon-fit`
  - `node-pty`
- Server entry point:
  - `src/server/terminalManager.ts`
- Frontend terminal panel:
  - `src/components/content/ThreadTerminalPanel.vue`
- Frontend integration:
  - `src/App.vue`
  - `src/api/codexGateway.ts`
  - `src/composables/useDesktopState.ts`
- Tests:
  - `src/server/terminalManager.test.ts`
  - `vitest.config.ts`
  - `package.json` script `test:unit`

## Codex.app Parity Facts
- Codex.app package inspected: `26.417.41555`.
- Codex.app ships `node-pty@1.1.0`.
- Codex.app terminal shortcut: `CmdOrCtrl+J`.
- Codex.app terminal UI strings include:
  - `Toggle terminal`
  - `New terminal`
  - `Close`
- Codex.app terminal manager behavior includes:
  - `TERM=xterm-256color`
  - 16 KiB rolling output buffer
  - snapshot shape `{ cwd, shell, buffer, truncated }`
  - events/messages such as `terminal-data`, `terminal-init-log`, `terminal-attached`, `terminal-exit`, and `terminal-error`

## Web Implementation Decisions
- Web transport uses `/codex-api/ws` and HTTP endpoints instead of Electron IPC.
- Terminal endpoints include:
  - `POST /codex-api/thread-terminal/attach`
  - `POST /codex-api/thread-terminal/input`
  - `POST /codex-api/thread-terminal/resize`
  - `POST /codex-api/thread-terminal/close`
  - `GET /codex-api/thread-terminal-snapshot?threadId=<id>`
- The snapshot endpoint returns `{ session: { cwd, shell, buffer, truncated } | null }`.
- The web UI supports multiple terminal tabs per thread; `New terminal` creates and switches to a new PTY without killing existing tabs.
- `ThreadTerminalManager` has dependency injection for tests, including PTY spawn, filesystem existence checks, cwd/home fallback, platform, shell, and helper setup.

## Fixes From Visual Review
- The terminal panel must not be part of the pending-request/composer `v-if`/`v-else` pair; otherwise the composer disappears when the terminal is open.
- On mobile, sidebar collapse must run immediately on first render to avoid the drawer covering the terminal.
- Mobile terminal height and padding are constrained so the terminal and composer remain visible in the viewport.
- PTY locale is normalized (`en_US.UTF-8` on macOS) to avoid shell startup warnings such as `setlocale` / `Bad file descriptor`.
- `node-pty` `spawn-helper` may need executable permissions restored at runtime because pnpm can ignore native package build scripts.

## Verification
- `pnpm run test:unit`: 7 terminal manager edge-case tests passed.
- `pnpm run build`: frontend and CLI builds passed.
- CJS smoke confirmed `node-pty.spawn` and `dist-cli/index.js`.
- Playwright terminal checklist verified:
  - header toggle and `Cmd/Ctrl+J`
  - `pwd` output matches thread cwd
  - snapshot buffer contains command output
  - no locale startup warnings
  - hide/reopen and refresh/reopen reattach behavior
  - `New terminal` tab creation and tab switching behavior
  - close cleanup
  - desktop/mobile/tablet layout without horizontal overflow

## PRs
- Main implementation PR: `friuns2/codexUI#69`
- Follow-up tests and visual polish PR: `friuns2/codexUI#70`
