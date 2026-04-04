# Tests

This file tracks manual regression and feature verification steps.

## Template

### Feature: <name>

#### Prerequisites
- <required setup>

#### Steps
1. <action>
2. <action>

#### Expected Results
- <result>

#### Rollback/Cleanup
- <cleanup action, if any>

### Feature: Telegram bot token stored in dedicated global file

#### Prerequisites
- App server is running from this repository.
- A valid Telegram bot token is available.
- Access to `~/.codex/` on the host machine.

#### Steps
1. In the app UI, open Telegram connection and submit a bot token.
2. Verify file `~/.codex/telegram-bridge.json` exists.
3. Open `~/.codex/telegram-bridge.json` and confirm it contains a `botToken` field.
4. Restart the app server and call Telegram status endpoint from UI to confirm it still reports configured.

#### Expected Results
- Telegram token is persisted in `~/.codex/telegram-bridge.json`.
- Telegram bridge remains configured after restart.

#### Rollback/Cleanup
- Remove `~/.codex/telegram-bridge.json` to clear saved Telegram token.

### Feature: Telegram chatIds persisted for bot DM sending

#### Prerequisites
- App server is running from this repository.
- Telegram bot already configured in the app.
- Access to `~/.codex/telegram-bridge.json`.

#### Steps
1. Send `/start` to the Telegram bot from your DM.
2. Wait for the app to process the update, then open `~/.codex/telegram-bridge.json`.
3. Confirm `chatIds` contains your DM chat id as the first element.
4. In the app, reconnect Telegram bot with the same token.
5. Re-open `~/.codex/telegram-bridge.json` and confirm `chatIds` remains present.

#### Expected Results
- `chatIds` is written after Telegram DM activity.
- `chatIds` persists across bot reconfiguration.
- `botToken` and `chatIds` are both present in `~/.codex/telegram-bridge.json`.

#### Rollback/Cleanup
- Remove `chatIds` or delete `~/.codex/telegram-bridge.json` to clear persisted chat targets.

### Feature: Skills dropdown closes after selection in composer

#### Prerequisites
- App is running from this repository.
- At least one thread exists and can be selected.
- At least one installed skill is available.

#### Steps
1. Open an existing thread so the message composer is enabled.
2. Click the `Skills` dropdown in the composer footer.
3. Click any skill option in the dropdown list.
4. Re-open the `Skills` dropdown and click the same skill again to unselect it.

#### Expected Results
- The skills dropdown closes immediately after each selection click.
- Selected skill appears as a chip above the composer input when checked.
- Skill chip is removed when the skill is unchecked on the next selection.

#### Rollback/Cleanup
- Remove the selected skill chip(s) before leaving the thread, if needed.

### Feature: Skills Hub manual search trigger

#### Prerequisites
- App is running from this repository.
- Open the `Skills Hub` view.

#### Steps
1. Type a unique query value in the Skills Hub search input (for example: `docker`), but do not press Enter or click Search yet.
2. Confirm the browse results do not refresh immediately while typing.
3. Click the `Search` button.
4. Change the query text to another value and press Enter in the input.
5. Clear the query, then click `Search` to reload the default browse list.

#### Expected Results
- Typing alone does not trigger remote Skills Hub search requests.
- Results refresh only after explicit submit via the `Search` button or Enter key.
- Empty-state text (if shown) references the last submitted query.
- Submitting an empty query returns the default skills listing.

#### Rollback/Cleanup
- Clear the search input and run a blank search to return to default listing.

### Feature: Dark theme for trending GitHub projects and local project dropdown

#### Prerequisites
- App is running from this repository.
- Home/new-thread screen is open.
- Appearance is set to `Dark` in Settings.
- `GitHub trending projects` setting is enabled.

#### Steps
1. On the home/new-thread screen, inspect the `Choose folder` dropdown trigger.
2. Open the `Choose folder` dropdown and confirm menu/option contrast remains readable in dark mode.
3. Inspect the `Trending GitHub projects` section title, scope dropdown, and project cards.
4. Hover a trending project card and the scope dropdown trigger.
5. Toggle appearance back to `Light`, then return to `Dark`.

#### Expected Results
- Local project dropdown trigger/value uses dark theme colors with readable contrast.
- Trending section title, empty/loading text, scope dropdown, and cards use dark backgrounds/borders/text.
- Hover states in dark mode stay visible and do not switch to light backgrounds.
- Theme switch back/forth preserves correct styling for both controls.

#### Rollback/Cleanup
- Reset appearance to the previous user preference.

### Feature: Dark theme for worktree runtime selector and Skills Hub

#### Prerequisites
- App is running from this repository.
- Appearance is set to `Dark` in Settings.
- Skills Hub route is accessible.

#### Steps
1. Open the home/new-thread screen and inspect the `Local project / New worktree` runtime selector trigger.
2. Open the runtime selector and verify menu title, options, selected state, and checkmark visibility in dark mode.
3. Trigger a worktree action that shows worktree status and verify running/error status blocks remain readable in dark mode.
4. Open `Skills Hub` and verify header/subtitle, search bar, search/sort buttons, sync panel, badges, and status text.
5. Verify at least one skill card surface (title, owner, description, date, browse icon) in dark mode.
6. Open a skill detail modal and verify panel, title/owner, close button, README/body text, and footer actions in dark mode.

#### Expected Results
- Runtime dropdown trigger and menu use dark backgrounds, borders, and readable text/icons.
- Worktree status blocks use dark-friendly contrast for both running and error states.
- Skills Hub controls and sync panel are fully dark-themed with consistent hover/active states.
- Skill cards and the skill detail modal render with dark theme colors and accessible contrast.

#### Rollback/Cleanup
- Reset appearance to the previous user preference.

### Feature: Markdown file links with backticks and parentheses render correctly

#### Prerequisites
- App is running from this repository.
- An active thread is open.
- Local file exists at `/root/New Project (1)/qwe.txt`.

#### Steps
1. Send a message containing: `Done. Created [`/root/New Project (1)/qwe.txt`](/root/New Project (1)/qwe.txt) with content:`.
2. In the rendered assistant message, click the `/root/New Project (1)/qwe.txt` link.
3. Right-click the same link and choose `Copy link` from the context menu.
4. Paste the copied link into a text field and inspect it.

#### Expected Results
- The markdown link renders as one clickable file link (not split into partial tokens).
- Clicking opens the local browse route for the full file path.
- Copied link includes the full encoded path and still resolves to the same file.

#### Rollback/Cleanup
- Delete `/root/New Project (1)/qwe.txt` if it was created only for this test.

### Feature: Runtime selector uses a toggle-style control

#### Prerequisites
- App is running from this repository.
- Home/new-thread screen is open.

#### Steps
1. On the home/new-thread screen, locate the runtime control below `Choose folder`.
2. Verify both options (`Local project` and `New worktree`) are visible at once without opening a menu.
3. Click `New worktree` and confirm it becomes the selected option style.
4. Click `Local project` and confirm selection returns.
5. Set Appearance to `Dark` in Settings and verify selected/unselected contrast remains readable.

#### Expected Results
- Runtime mode is presented as a two-option toggle (segmented control), not a dropdown menu.
- Clicking each option immediately switches the selected state.
- Selected option has a distinct active background/border in both light and dark themes.

#### Rollback/Cleanup
- Leave runtime mode and appearance at the previous user preference.

### Feature: Dark theme states for runtime mode toggle

#### Prerequisites
- App is running from this repository.
- Home/new-thread screen is open.
- Appearance is set to `Dark` in Settings.

#### Steps
1. Locate the runtime mode toggle (`Local project` and `New worktree`) under `Choose folder`.
2. Hover each option and verify hover state is visible against dark backgrounds.
3. Select `New worktree`, then select `Local project` and compare active/inactive contrast.
4. Tab to the toggle options with keyboard navigation and verify the focus ring is visible.
5. Confirm icon color remains readable for selected and unselected options.

#### Expected Results
- Toggle container, options, and text/icons use dark-friendly colors.
- Hover and selected states are clearly distinguishable in dark mode.
- Keyboard focus ring is visible and does not blend into the background.

#### Rollback/Cleanup
- Return appearance and runtime selection to the previous user preference.

### Feature: pnpm dev script installs dependencies and starts Vite

#### Prerequisites
- `pnpm` is installed globally (`npm i -g pnpm` or via corepack).
- Repository is cloned and `node_modules/` does not exist (or may be stale).

#### Steps
1. Remove `node_modules/` if present: `rm -rf node_modules`.
2. Run `pnpm run dev`.
3. Wait for Vite dev server to start and display the local URL.
4. Open the displayed URL in a browser.

#### Expected Results
- `pnpm install` runs automatically before Vite starts (dependencies are installed).
- Vite dev server starts successfully and serves the app.
- No `npm` commands are invoked.

#### Rollback/Cleanup
- None.

### Feature: Stop button interrupts active turn without missing turnId

#### Prerequisites
- App is running from this repository.
- At least one thread can run a long response (for example, request a large code explanation).

#### Steps
1. Send a prompt that keeps the assistant generating for several seconds.
2. Immediately click the `Stop` button before the first assistant chunk fully completes.
3. Confirm generation halts.
4. Repeat with a resumed/existing in-progress thread (reload app while a turn is running, then click `Stop`).

#### Expected Results
- No error appears saying `turn/interrupt requires turnId`.
- Turn is interrupted successfully in both immediate-stop and resumed-thread scenarios.
- Thread state exits in-progress and the stop control returns to idle.

#### Rollback/Cleanup
- None.

### Feature: Revert PR #16 mobile viewport and chat scroll behavior changes

### Feature: Revert new-project folder-browser flow to inline add flow

#### Prerequisites
- App is running from this repository.
- Home/new-thread screen is open.
- At least one writable parent directory exists for creating a test project folder.

#### Steps
1. On the home/new-thread screen, open the `Choose folder` dropdown.
2. Click `+ Add new project`.
3. Enter a new folder name (for example `New Project Inline Test`) and click `Open`.
4. Confirm the app selects the newly created/opened project folder.
5. Repeat step 2, but enter an absolute path to an existing folder and click `Open`.

#### Expected Results
- Clicking `+ Add new project` opens inline input inside the dropdown instead of navigating to `/codex-local-browse...`.
- Entering a folder name creates/selects that project under the current base directory.
- Entering an absolute path opens that existing folder without creating a nested directory.

#### Rollback/Cleanup
- Delete the test folder created in step 3 if it was created only for verification.

### Feature: Disable auto-restore to last thread when opening home URL

#### Prerequisites
- App is running from this repository.
- At least one existing thread is available.
- Browser local storage may contain previous app state.

#### Steps
1. Open an existing thread route and confirm messages are visible.
2. Open `http://localhost:<port>/` (home route) in the same browser profile.
3. Refresh the home route once.
4. Close and re-open the app/tab at the home URL again.

#### Expected Results
- The app remains on the home/new-thread screen and does not auto-navigate to `/thread/<id>`.
- Refreshing home still keeps the user on home.

#### Rollback/Cleanup
- None.

#### Prerequisites
- App is running from this repository.
- A thread exists with enough messages to scroll.
- Test on a mobile-sized viewport (for example 375x812).

#### Steps
1. Open an existing thread and scroll up to the middle of the chat history.
2. Wait for an assistant response to stream while staying at the same scroll position.
3. Send a follow-up message and observe chat positioning when completion finishes.
4. Open the composer on mobile and drag within the composer area.
5. Open/close the on-screen keyboard on mobile and verify the page layout remains usable.

#### Expected Results
- Chat behavior matches pre-PR #16 baseline (no PR #16 scroll-preservation logic active).
- No regressions from reverting PR #16 changes in conversation rendering and composer behavior.
- Mobile layout no longer includes PR #16 visual-viewport sync changes.

#### Rollback/Cleanup
- Re-apply PR #16 commits if the reverted behavior is not desired.

### Feature: Thread load capped to latest 10 turns

#### Prerequisites
- App is running from this repository.
- At least one thread exists with more than 10 turns/messages.

#### Steps
1. Open a long thread that previously caused UI lag during initial load.
2. While the thread is loading, immediately click another thread in the sidebar.
3. Return to the long thread.
4. Count visible loaded history blocks and confirm only the newest portion is shown.
5. Call `/codex-api/rpc` with method `thread/read` for the same thread and inspect `result.thread.turns.length`.
6. Call `/codex-api/rpc` with method `thread/resume` for the same thread and inspect `result.thread.turns.length`.

#### Expected Results
- Initial thread load renders only the most recent 10 turns.
- UI remains responsive during thread load.
- You can switch to another thread without the UI freezing.
- `thread/read` and `thread/resume` RPC responses contain at most 10 turns.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Skills list request scoped to active thread cwd

#### Prerequisites
- App is running from this repository.
- Browser DevTools Network tab is open.
- At least two threads exist with different `cwd` values.

#### Steps
1. Reload the app and wait for initial data load.
2. In Network tab, inspect `/codex-api/rpc` requests with method `skills/list`.
3. Verify request params contain `cwds` with only the currently selected thread cwd.
4. Switch to another thread with a different cwd.
5. Inspect the next `skills/list` request and verify `cwds` now contains only the new selected thread cwd.

#### Expected Results
- `skills/list` no longer sends every thread cwd in one request.
- Each `skills/list` call includes at most one cwd for the active thread context.
- Skills list still updates when changing selected thread.

#### Rollback/Cleanup
- No cleanup required.

---

### Feature: GitHub Website Redesign — OpenClaw-Inspired Design + Web Demo Link

#### Prerequisites
- The `docs/index.html` file has been updated with the new design.
- A browser is available to view the page locally or via GitHub Pages.

#### Steps
1. Open `docs/index.html` in a browser (local file or via GitHub Pages).
2. Verify the fixed **navigation bar** at top with brand logo, section links, and "Get the App" CTA.
3. Verify the **announcement banner** below nav shows the XCodex WASM link.
4. Verify **hero section** displays lobster emoji, "AnyClaw" title with gradient, tagline, and four CTA buttons: "Try Web Demo", "Google Play", "Download APK", "GitHub".
5. Click **"Try Web Demo"** button — confirm it navigates to `https://xcodex.slrv.md/#/`.
6. Verify the **stats bar** shows key metrics (2 AI Agents, 1 APK, 0 Root Required, 73MB, infinity).
7. Scroll to **Live Demo** section — verify embedded iframe loads `https://xcodex.slrv.md/#/` with mock browser chrome.
8. Scroll to **Screenshots** section — verify four images render (2 desktop, 2 mobile).
9. Scroll to **Features** section — verify 6 feature cards in a 3-column grid.
10. Scroll to **Testimonials** section — verify two rows of auto-scrolling marquee cards (row 2 scrolls reverse). Hover to pause.
11. Scroll through **Architecture**, **Boot Sequence**, **Quick Start**, and **Tech Stack** sections — verify content renders.
12. Verify the **footer** includes a "Web Demo" link to `https://xcodex.slrv.md/#/`.
13. Test responsive at 768px and 480px — nav links collapse, grids single-column, buttons stack vertically.

#### Expected Results
- Page has a dark, premium feel with gradient accents, grain overlay, and smooth animations.
- All links to `https://xcodex.slrv.md/#/` work (announcement, hero CTA, demo section, quick start text, footer).
- Marquee testimonials scroll continuously and pause on hover.
- Embedded iframe demo loads successfully.
- Mobile responsive layout works at all breakpoints.

#### Rollback/Cleanup
- Revert `docs/index.html` to previous commit if needed.

### Feature: Keep manual chat scroll position during streaming

#### Prerequisites
- App is running from this repository.
- A thread exists with enough history to allow scrolling away from bottom.

#### Steps
1. Open the thread and scroll upward so latest messages are not visible.
2. Send a new message that produces a streaming assistant response.
3. During streaming, do not scroll and observe viewport position.
4. After streaming completes, verify the viewport remains at the same manual position.

#### Expected Results
- Streaming updates do not force auto-scroll to the bottom when user has manually scrolled away.
- User can continue reading older history while the response streams.
- If the thread is already at the bottom when streaming starts, the latest streaming overlay remains visible.

#### Rollback/Cleanup
- Revert the scroll-preservation change in `src/components/content/ThreadConversation.vue` if manual scroll locking needs to be removed.

### Feature: Rollback API/UI no longer requires turn index in rollback payload

#### Prerequisites
- App is running from this repository.
- A thread exists with at least 2 completed turns.
- Rollback control is visible in the thread conversation message actions.

#### Steps
1. Open any existing thread with multiple turns.
2. In DevTools Network tab, keep `/codex-api/rpc` requests visible.
3. Click rollback on a user or assistant message that is not the newest one.
4. Confirm rollback succeeds and the thread is truncated to the selected turn.
5. Inspect the UI event flow by repeating rollback from a different turn and confirm the selected message can rollback without relying on a numeric turn index.
6. Use dictation resend flow (or "rollback latest user turn" flow) and confirm the latest user turn is rolled back correctly.

#### Expected Results
- Rollback works when triggered from message actions using `turnId` as the identifier.
- No UI path depends on `turnIndex` in rollback event payloads.
- Latest-user-turn rollback flow still works and targets the latest user `turnId`.
- No TypeScript/runtime errors are introduced in rollback interaction.

#### Rollback/Cleanup
- Revert the updated files if this behavior is not desired:
  - `src/types/codex.ts`
  - `src/api/normalizers/v2.ts`
  - `src/components/content/ThreadConversation.vue`
  - `src/App.vue`
  - `src/composables/useDesktopState.ts`

### Feature: Rollback init commit includes `.codex/.gitignore`

#### Prerequisites
- App server is running from this repository.
- Use a fresh temporary project directory with no existing `.codex/rollbacks/.git` history.

#### Steps
1. In a fresh test project folder, trigger rollback automation init by calling `/codex-api/worktree/auto-commit` with a valid commit message.
2. Verify rollback repo exists at `.codex/rollbacks/.git`.
3. In that rollback repo, run `git --git-dir .codex/rollbacks/.git --work-tree . show --name-only --pretty=format: HEAD`.
4. Confirm `.codex/.gitignore` appears in the file list for the init commit.
5. Open `.codex/.gitignore` and verify `rollbacks/` exists.

#### Expected Results
- First rollback-history commit is `Initialize rollback history`.
- That commit includes `.codex/.gitignore`.
- `.codex/.gitignore` contains `rollbacks/`.

#### Rollback/Cleanup
- Remove the temporary test folder after verification.

### Feature: Deterministic rollback commit + exact lookup with debug logs

#### Prerequisites
- App server is running from this repository.
- `worktree git automation` is enabled in UI settings.
- Test thread available where you can send at least 3 user turns.

#### Steps
1. Send a user turn that changes files and completes.
2. Send a user turn that produces no file edits and completes.
3. Send a third user turn and complete it.
4. In rollback git history (`.codex/rollbacks/.git`), verify each completed turn created a commit, including the no-edit turn.
5. Inspect one rollback commit body and confirm it contains the user message text plus `Rollback-User-Message-SHA256: <hash>`.
6. Trigger rollback to the second turn message via UI rollback action.
7. Verify server logs contain `[rollback-debug]` entries for lookup, stash (if dirty), reset, and completion.
8. Temporarily test missing-commit path by calling `/codex-api/worktree/rollback-to-message` with a non-existent message text.

#### Expected Results
- Auto-commit creates a rollback commit for every completed turn (`--allow-empty` behavior).
- Commit body includes the user message and stable hash trailer.
- Rollback uses exact hash-based commit lookup only.
- If exact commit is missing, rollback returns error and does not continue.
- Server logs include `[rollback-debug]` records for commit creation, lookup, stash, reset, and error paths.
- Browser console includes `[rollback-debug]` client-side start/success/error logs for auto-commit and rollback API calls.
- Rollback init no longer fails when `.codex` is ignored globally; init force-adds `.codex/.gitignore`.

#### Rollback/Cleanup
- Revert the changed files if you want previous non-deterministic behavior back.

### Feature: Per-turn changed files panel with lazy diff loading

#### Prerequisites
- App server running from this repository.
- Worktree git automation enabled.
- A thread with at least one completed turn that touched files.

#### Steps
1. Open a thread and locate a `Worked for ...` separator message.
2. Expand the worked separator.
3. Verify a changed-files panel appears above command details.
4. Confirm file list entries show file path and `+/-` counts.
5. Click one changed file row to expand it.
6. Verify diff content loads only after expansion (lazy load behavior).
7. Collapse and re-expand the same file row; verify diff reuses loaded content.
8. Switch to another thread and back; verify panel reloads for the active thread context.

#### Expected Results
- Each worked message can show changed files for its turn.
- Diff for a file is fetched only on expand, not for all files upfront.
- Errors (missing commit/diff load failure) are shown inline in the panel.
- Existing command output expand/collapse behavior remains unchanged.
- Changed-files panel still resolves after page refresh or app-server restart.
- Changed-files panel appears at the end of the worked message block (after command rows).

#### Rollback/Cleanup
- No cleanup required.

### Feature: Worked separator is non-expandable

#### Prerequisites
- App server running from this repository.
- A thread with at least one `Worked for ...` separator.

#### Steps
1. Open a thread and locate a `Worked for ...` message.
2. Click the separator line/text area.
3. Verify no expand/collapse behavior is triggered on the separator itself.
4. Verify changed-files panel still appears below the separator when data exists.

#### Expected Results
- `Worked for ...` acts as a visual separator only (non-interactive).
- Changed-files and command sections are not gated by a worked-separator expand toggle.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Changed-files lookup fallback when turnId metadata is missing

#### Prerequisites
- App server running from this repository.
- Playwright CLI available.

#### Steps
1. Create/prepare a test workspace (example: `/tmp/rollback-pw`).
2. Call `/codex-api/worktree/auto-commit` with:
   - `cwd=/tmp/rollback-pw`
   - `message='pw-msg-turn-1'`
   - `turnId='turn-real-1'`
3. Call `/codex-api/worktree/message-changes` with:
   - same `cwd`
   - same `message`
   - mismatched `turnId='turn-wrong'`
4. Verify response is still `200` and returns the matching commit data (message-hash fallback).
5. Capture Playwright artifact screenshot.

#### Expected Results
- `message-changes` first attempts turnId lookup.
- If turnId lookup misses, it falls back to exact message-hash lookup.
- API returns commit data instead of `No matching commit found for this user message` when message matches.

#### Rollback/Cleanup
- Remove temporary test workspace if created.

### Feature: Changed-files panel persists across refresh (assistant message level)

#### Prerequisites
- App server running from this repository.
- Existing thread in `TestChat` project with completed assistant messages.
- Worktree rollback auto-commit enabled.

#### Steps
1. Open a `TestChat` thread and confirm assistant message cards render.
2. Verify changed-files panel is shown at the end of assistant messages that have rollback commit data.
3. Hard refresh the page.
4. Re-open the same `TestChat` thread.
5. Verify changed-files panel is still shown for the same assistant message(s).
6. Expand one file diff and verify diff content loads.

#### Expected Results
- Changed-files panel is attached to assistant messages (not transient worked separators).
- Changed-files panel appears only once per turn (on the last assistant message in that turn).
- Changed-files panel is hidden while a turn is still in progress.
- Panels remain available after refresh/restart because lookup is turnId/message-hash based.
- File diff expansion still lazy-loads and displays content.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Rollback debug logs controlled by `.env`

#### Prerequisites
- App server stopped.
- Edit `.env` directly, and use `.env.local` for private local overrides.

#### Steps
1. Set `ROLLBACK_DEBUG=0` and `VITE_ROLLBACK_DEBUG=0` in `.env`.
2. Start app and trigger rollback auto-commit/message-changes flow.
3. Verify `[rollback-debug]` logs are not emitted in terminal/browser console.
4. Set `ROLLBACK_DEBUG=1` and `VITE_ROLLBACK_DEBUG=1` in `.env`.
5. Restart app and trigger the same flow again.
6. Verify `[rollback-debug]` logs appear in terminal/browser console.

#### Expected Results
- Debug logs are disabled when env flags are `0`.
- Debug logs are enabled when env flags are `1`.

#### Rollback/Cleanup
- Restore `.env` values to preferred defaults.

### Feature: Auto-commit default is disabled for new preference state

#### Prerequisites
- App server running from this repository.
- Browser local storage key `codex-web-local.worktree-git-automation.v1` is absent (new user state).

#### Steps
1. Open the app in a fresh browser profile (or clear only `codex-web-local.worktree-git-automation.v1`).
2. Open Settings and inspect the `Rollback commits` toggle state.
3. Confirm it starts in the disabled/off state.
4. Enable the toggle manually.
5. Reload the page and confirm the toggle remains enabled.
6. Disable it again, reload, and confirm it remains disabled.

#### Expected Results
- Default state is disabled when no prior preference exists.
- User-selected state persists via local storage across reloads.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Skills sync pull live-reloads installed skills list

#### Prerequisites
- App running from this repository with Skills Hub available.
- GitHub skills sync configured and connected.
- At least one skill update available in the sync source (new or edited skill metadata).

#### Steps
1. Open the app and note the currently visible installed skills for the active thread cwd.
2. In Skills Hub, trigger `Pull` from GitHub sync.
3. Wait for the pull success toast.
4. Without restarting the app/server, navigate to thread composer skill picker and verify the installed skills list.
5. Switch to another thread and back to force a normal UI refresh path.

#### Expected Results
- Pull completes successfully.
- Installed skills list reflects pulled changes immediately without app/server restart.
- Thread switch keeps showing the updated skills list (no stale cache rollback).

#### Rollback/Cleanup
- If needed, run another sync pull/push to restore previous skill state in the sync repo.

### Feature: Force Refresh Skills button in Skills Sync panel

#### Prerequisites
- App running from this repository with Skills Hub route accessible.
- At least one installed skill is available for the current thread cwd.

#### Steps
1. Open `Skills Hub`.
2. In `Skills Sync (GitHub)`, click `Force Refresh Skills`.
3. Verify button text changes to `Refreshing...` during the request and returns after completion.
4. Verify success toast appears.
5. Open the thread composer skills picker and confirm installed skills list is present and current.
6. Switch to another thread and back to ensure refreshed list remains consistent.

#### Expected Results
- `Force Refresh Skills` triggers a manual refresh without requiring pull/push.
- Loading state prevents duplicate clicks while refresh is in progress.
- Installed skills list updates immediately and remains updated across thread switches.

#### Rollback/Cleanup
- No cleanup required.

### Feature: SkillHub shows detailed skill load errors

#### Prerequisites
- App running from this repository.
- At least one invalid installed skill file exists (for example unresolved merge markers in `SKILL.md`).

#### Steps
1. Open `Skills Hub`.
2. Trigger `Force Refresh Skills`.
3. Locate the `Some skills failed to load` panel above the skills sections.
4. Verify each row shows:
   - the failing `SKILL.md` path
   - the exact parser error message from app server (for example invalid YAML line/column details).
5. Fix the invalid skill file and trigger `Force Refresh Skills` again.

#### Expected Results
- SkillHub surfaces app-server load failures with detailed path and message.
- Messages are specific enough to identify the broken file and parser failure reason.
- Error panel disappears after invalid skills are fixed and refreshed.

#### Rollback/Cleanup
- Restore any intentionally broken local skill files used for testing.

### Feature: Startup sync preserves local skill edits when remote is ahead

#### Prerequisites
- Skills sync configured to a private GitHub fork.
- Local skills repo has a tracked edit in an existing skill file.
- Remote `main` has at least one newer commit than local (simulate from another machine or commit directly on GitHub).

#### Steps
1. Edit a local skill file (for example update description text in `SKILL.md`) and keep the change.
2. Trigger `Startup Sync` in Skills Hub.
3. If a non-fast-forward condition exists, allow startup sync to complete retry path.
4. Re-open the same local skill file and verify your edit remains.
5. Trigger `Force Refresh Skills` and verify no unexpected skill removals occurred.

#### Expected Results
- Startup sync no longer fails with non-fast-forward push due to missing remote integration.
- Local tracked skill edits remain after sync (not overwritten by remote state).
- Sync path rebases/pulls with autostash and auto-resolves conflicts by mtime policy:
  - choose remote (`theirs`) when remote file commit time is newer than local file mtime.
  - choose local (`ours`) otherwise.
- No manual conflict intervention is required during startup sync retries.

#### Rollback/Cleanup
- Revert test-only skill text changes if they were not intended to keep.

### Feature: Startup sync conflict fallback when one side is missing

#### Prerequisites
- Skills sync repo contains a conflict candidate where only one side exists for a path (for example delete/modify scenario).
- Skills Hub is accessible.

#### Steps
1. Open `Skills Hub`.
2. Click `Startup Sync`.
3. Wait for sync completion or error toast.
4. Verify no toast/error contains `does not have our version`.

#### Expected Results
- Sync conflict resolver handles missing `--ours`/`--theirs` versions safely.
- Startup sync does not fail with `git checkout --ours/--theirs` missing-version errors.

#### Rollback/Cleanup
- None.

### Feature: Remote changes win when no local uncommitted skill edits exist

#### Prerequisites
- Skills sync configured with GitHub.
- Local skills repo working tree is clean (`git status --porcelain` empty under skills dir).
- Remote skills repo has newer commits touching existing skill files.

#### Steps
1. Confirm no local uncommitted changes in skills directory.
2. Trigger `Startup Sync` in Skills Hub.
3. After sync, inspect the skill file changed remotely.
4. Trigger `Force Refresh Skills` and confirm loaded skill content matches remote update.

#### Expected Results
- Sync pull/reconcile does not preserve stale local file content when local tree is clean.
- Remote updates are applied locally and remain after startup sync completes.

#### Rollback/Cleanup
- None.
