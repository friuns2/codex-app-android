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
9. Choose `npm run dev` from the `Run...` quick-command menu.
10. Confirm the command is submitted to the active terminal.
11. Choose `Add command...` from the `Run...` menu.
12. Enter a custom command in the prompt and confirm it runs immediately.

### New Chat Flow
1. Open the new-chat screen.
2. Choose or confirm a working folder.
3. Click the terminal button in the top-right header.
4. Confirm the terminal opens below the new-chat composer before a thread exists.
5. Run `pwd` and confirm it matches the selected folder.

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
5. Use the `Run...` menu several times.
6. Confirm only the five most-used/recent commands are shown before `Add command...`.
7. Click `New`.
8. Confirm a second terminal tab appears and becomes active.
9. Click the first terminal tab.
10. Confirm its previous output is restored.
11. Click `Close`.
12. Confirm the active PTY exits and the drawer hides only when the last tab is closed.

### Layout
1. Resize the desktop browser window.
2. Confirm the prompt is not clipped and the terminal refits.
3. Repeat at `375x812` and `768x1024`.
4. Confirm there is no horizontal page overflow and the terminal remains usable.

### Expected Result
- Terminal behavior matches Codex.app-style integrated terminal basics: per-thread terminal, project-scoped cwd, header toggle, keyboard shortcut, recent output buffer, and readable snapshot endpoint.
- Quick-command menu submits common project commands to the active terminal without replacing the session.
- Custom quick commands are added via the `Run...` menu prompt and sorted by most-used/recent history.
