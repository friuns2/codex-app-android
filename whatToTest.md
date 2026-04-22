# What To Test

## Codex.app-Style Integrated Terminal

### Prerequisites
- Run the dev server at `http://127.0.0.1:4173`.
- Open an existing local or worktree thread with a valid working directory.

### Core Flow
1. Click the terminal button in the top-right thread header.
2. Confirm the terminal drawer opens below the composer.
3. Press `Cmd+J` on macOS or `Ctrl+J` elsewhere.
4. Confirm the drawer toggles closed/open and the header button pressed state updates.
5. Type `pwd` and press Enter.
6. Confirm the printed path matches the thread/project working directory.
7. Type `echo terminal-ok` and press Enter.
8. Confirm `terminal-ok` appears in the terminal output.

### Snapshot API
1. With the terminal session still running, request:
   `/codex-api/thread-terminal-snapshot?threadId=<thread-id>`
2. Confirm the response includes `session.cwd`, `session.shell`, `session.buffer`, and `session.truncated`.
3. Confirm `session.buffer` contains `terminal-ok`.

### Session Behavior
1. Hide the terminal, then reopen it.
2. Confirm recent output is restored.
3. Refresh the browser and reopen the same thread.
4. Confirm the terminal can reattach and continue accepting input.
5. Click `New terminal`.
6. Confirm the active terminal session is replaced.
7. Click `Close`.
8. Confirm the PTY exits and the drawer hides.

### Layout
1. Resize the desktop browser window.
2. Confirm the prompt is not clipped and the terminal refits.
3. Repeat at `375x812` and `768x1024`.
4. Confirm there is no horizontal page overflow and the terminal remains usable.

### Expected Result
- Terminal behavior matches Codex.app-style integrated terminal basics: per-thread terminal, project-scoped cwd, header toggle, keyboard shortcut, recent output buffer, and readable snapshot endpoint.
