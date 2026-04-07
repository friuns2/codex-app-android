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

### Feature: Sandbox approval requests recognize newer Codex payloads

#### Prerequisites
- App is running from this repository with a Codex CLI/app-server version that can request approvals.
- `bubblewrap` is installed so sandboxed command approvals can be triggered.
- Approval policy is set to request approval on sandbox escalation.

#### Steps
1. Start a thread and ask Codex to run a command that requires approval outside the current sandbox.
2. Wait for the pending request panel to appear.
3. Confirm the request is shown as an approval prompt, not the generic fallback with `Return Empty Result` and `Reject Request`.
4. Verify the panel offers approval choices (`Yes`, `Yes for Session`, decline text field, `Skip`).
5. If the approval payload includes a command preview or writable root, verify that preview text is shown in the panel.

#### Expected Results
- Sandbox-related approval requests are classified as approvals even when Codex sends newer method or payload variants.
- The approval UI offers normal approval actions instead of the unknown-request fallback buttons.
- The request stays attached to the correct thread rather than only appearing as a global pending request.

#### Rollback/Cleanup
- Decline or skip the pending approval request after verification.

### Feature: Collaboration mode selector moved into composer dropdown row

#### Prerequisites
- App is running from this repository.
- At least one thread exists and can be opened.
- The selected thread is idle so composer controls are enabled.

#### Steps
1. Open an existing thread so the composer footer controls are visible.
2. Click the `+` attach menu and inspect the available actions/settings.
3. Confirm there is no standalone `Plan mode` switch inside that menu.
4. In the composer footer row, locate the new collaboration mode dropdown near `Model`, `Skills`, and `Thinking`.
5. Open the collaboration mode dropdown and switch from `Default` to `Plan`.
6. Confirm the dropdown label updates to `Plan`.
7. Switch back from `Plan` to `Default`.
8. Return to the home/new-thread screen, switch the collaboration mode dropdown to `Plan`, and send the very first message in a brand new thread.
9. After navigation into the created thread, confirm the composer still shows `Plan` for that thread.

#### Expected Results
- Collaboration mode is selectable from a dedicated dropdown in the composer control row.
- The attach menu no longer contains a separate `Plan mode` switch.
- Selecting `Plan` or `Default` updates the dropdown label immediately without affecting the other composer controls.
- A new thread created while `Plan` is selected keeps that mode for its first turn and remains on `Plan` after the thread opens.

#### Rollback/Cleanup
- Leave the collaboration mode set to the previous user preference before ending the test.

### Feature: MCP elicitation requests and thread status labels

#### Prerequisites
- App is running from this repository with a recent Codex CLI/app-server build.
- At least one configured MCP server can trigger `mcpServer/elicitation/request` or `item/permissions/requestApproval`.

#### Steps
1. Start a thread and trigger an MCP flow that asks for user input or permission approval.
2. Confirm the thread row status chip in the sidebar appears in English (`Awaiting approval` or `Awaiting response`).
3. Open the pending request panel for `mcpServer/elicitation/request`.
4. Confirm only the black pending-request panel is shown for the request; no duplicate yellow in-conversation request card should appear.
5. If the elicitation is `form` mode, verify the requested fields are rendered as inputs/selects/checkboxes based on the schema.
6. For a required form field that has no schema default, click `Continue` without answering it and verify the request stays open with a validation error instead of submitting a fabricated answer.
7. For an optional boolean or enum field that has no schema default, verify the control starts unselected rather than prefilled with `False` or the first enum option.
8. If the elicitation is `url` mode, verify an authorization link is shown only when the URL uses `http` or `https`.
9. Submit `Continue`, then repeat and verify `Decline` and `Cancel` are also available.
10. Trigger an `item/permissions/requestApproval` request and verify `Accept` and `Accept for Session` are shown instead of the generic fallback buttons.

#### Expected Results
- MCP elicitation requests no longer fall back to `Return Empty Result` / `Reject Request`.
- Pending requests are shown only once, in the dedicated black pending-request panel.
- Form-mode elicitation requests submit structured `{ action, content }` responses.
- Required MCP form fields without defaults must be answered explicitly before the request can be accepted.
- Optional MCP boolean/enum fields without defaults remain unset until the user chooses a value.
- URL-mode elicitation requests show an authorization link and submit a valid `{ action }` response.
- Non-HTTP(S) authorization URLs are not rendered as clickable links.
- Permissions approval requests submit proper permission grants with turn/session scope.
- Sidebar pending-request chips are displayed in English.

#### Rollback/Cleanup
- Decline or cancel the MCP request after verification, and close any opened authorization URL if it was only used for testing.

### Feature: pnpm dev script installs dependencies and starts Vite

### Feature: Tailscale CIDRs bypass password and Cloudflare tunnel is opt-in

#### Prerequisites
- App is running from this repository via CLI.
- A Tailscale client can reach the host over Tailscale IPv4 (`100.64.0.0/10`) or IPv6 (`fd7a:115c:a1e0::/48`).
- `cloudflared` is installed only if testing `--tunnel`.

#### Steps
1. Start CLI without tunnel flag: `npx codexapp --port 5900`.
2. From a Tailscale client, open `http://100.x.x.x:5900` using a host address in `100.64.0.0/10` (replace with host tailnet IP).
3. Confirm the app opens directly without the password login page.
4. (Optional IPv6 check) Open the same service using the host Tailscale IPv6 address in `fd7a:115c:a1e0::/48` and confirm it also bypasses password.
5. Stop the server and start again with tunnel enabled: `npx codexapp --port 5900 --tunnel`.
6. Confirm startup output now includes a `Tunnel:` URL only when `--tunnel` is provided.
7. Stop and restart once more without `--tunnel`, and verify no tunnel URL is printed.

#### Expected Results
- Requests from Tailscale IPv4 `100.64.0.0/10` are treated as trusted and do not require password sign-in.
- Requests from Tailscale IPv6 `fd7a:115c:a1e0::/48` are treated as trusted and do not require password sign-in.
- Cloudflare tunnel does not start by default.
- Cloudflare tunnel starts only when `--tunnel` is explicitly passed.

#### Rollback/Cleanup
- Stop the CLI process.
- If a cloudflared tunnel was started, ensure the tunnel child process has exited.

### Feature: Tunnel auto mode follows Tailscale IP detection

#### Prerequisites
- App is running from this repository via CLI.
- One environment with detected Tailscale IP (`100.64.0.0/10` or `fd7a:115c:a1e0::/48`) and one without (or simulated by disabling Tailscale).

#### Steps
1. Start server without explicit tunnel flags: `npx codexapp --port 5900`.
2. In a host where Tailscale IP is detected, verify startup output includes `Tunnel:`.
3. In a host where Tailscale IP is not detected, verify startup output does not include `Tunnel:`.
4. Start server with explicit override `--no-tunnel` and verify no `Tunnel:` output even when Tailscale IP is present.
5. Start server with explicit override `--tunnel` and verify `Tunnel:` output even when Tailscale IP is not present.

#### Expected Results
- Without explicit flags, tunnel enablement follows Tailscale IP detection.
- `--no-tunnel` always disables tunnel startup.
- `--tunnel` always enables tunnel startup.

#### Rollback/Cleanup
- Stop the CLI process after each verification run.
- Ensure cloudflared child process exits after shutdown.

### Feature: Reverse tunnel login is required unless request is trusted local or Tailscale

#### Prerequisites
- App is running with password enabled.
- One direct local browser session (`localhost`).
- One reverse tunnel path (for example SSH/Cloudflare forwarding) that reaches the same server.
- Optional Tailscale client in `100.64.0.0/10` or `fd7a:115c:a1e0::/48`.

#### Steps
1. Open app via `http://localhost:<port>` and confirm it opens without login when request is true local loopback.
2. Open app via reverse-tunnel URL and confirm login page is shown.
3. Enter correct password in reverse-tunnel URL and confirm session cookie allows access.
4. (Optional) Open app via Tailscale IP and confirm login is bypassed.

#### Expected Results
- Local loopback access is allowed without login prompt.
- Reverse-tunnel access does not bypass auth and requires password.
- Valid login on reverse-tunnel path creates session and grants access.
- Tailscale CIDR requests remain trusted.

#### Rollback/Cleanup
- Clear browser cookies for the app origin(s).
- Stop the CLI process.

### Feature: Cloudflare tunnel QR includes password auto-login path

#### Prerequisites
- App is running from this repository with password enabled.
- Cloudflare tunnel startup is enabled (`--tunnel` or auto-enabled path).

#### Steps
1. Start CLI and wait for tunnel output.
2. Verify the printed `Tunnel:` URL includes `/password=` suffix.
3. Scan the terminal QR code from a phone/browser.
4. Confirm first page load enters the app without showing password form.
5. Open the tunnel base URL without `/password=` in a private window and verify login prompt still appears.

#### Expected Results
- Tunnel URL shown in startup output uses `/password=<encoded-password>`.
- QR code encodes the same auto-login URL.
- Visiting the auto-login URL sets session cookie and redirects to `/`.
- Base tunnel URL still requires login when no trusted bypass applies.

#### Rollback/Cleanup
- Stop the CLI process.
- Clear cookies for the tunnel origin if needed.

### Feature: No automatic restore of last active thread on startup

#### Prerequisites
- App is running from this repository.
- At least one existing thread is available.
- Browser local storage is enabled.

#### Steps
1. Open the app in a regular browser tab (`http://localhost:<port>/`), select any thread, then navigate back to home route (`#/`).
2. Refresh the browser tab.
3. Confirm the app remains on home route and does not auto-switch to `#/thread/:threadId`.
4. Install/open the app in PWA standalone mode, select any thread, navigate to `#/`, and relaunch the PWA.

#### Expected Results
- In regular browser-tab mode, startup does not restore and redirect to the last active thread.
- In PWA standalone mode, startup also does not restore and redirect to the last active thread.
- Existing `openProjectPath` startup behavior still opens the requested project on home.

#### Rollback/Cleanup
- Clear app local storage state if you need to reset startup behavior for retesting.

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

### Feature: Default runtime uses workspace-write sandbox with on-request approvals

#### Prerequisites
- App server is running from this repository.
- No `CODEXUI_SANDBOX_MODE` or `CODEXUI_APPROVAL_POLICY` environment overrides are set for the launch shell.

#### Steps
1. Start the app normally from this repository without passing `--sandbox-mode` or `--approval-policy`.
2. Open the startup logs or terminal output and find the runtime summary.
3. Confirm the reported sandbox mode is `workspace-write`.
4. Confirm the reported approval policy is `on-request`.
5. Restart the app with explicit overrides, for example `--sandbox-mode danger-full-access --approval-policy never`, and confirm those override the defaults.
6. With those overrides still active, trigger an account flow that uses the temporary app-server path (for example a quota/account inspection request).
7. Confirm the temporary app-server request succeeds under the active override settings and does not behave as if it were still using the original startup defaults.

#### Expected Results
- Default launch uses `workspace-write` sandbox mode.
- Default launch uses `on-request` approval policy.
- Explicit CLI flags still override the defaults when provided.
- Temporary app-server spawns in account routes use the current env-derived runtime args, including CLI overrides.

#### Rollback/Cleanup
- Remove any temporary CLI overrides before leaving the environment.

### Feature: Backticked HTTP(S) URL renders as clickable link

#### Prerequisites
- App is running from this repository.
- An active thread is open.

#### Steps
1. Send a message containing exactly: `` `https://github.com/marmeladema` ``.
2. Find the rendered message row and inspect the backticked URL token.
3. Click the rendered URL.

#### Expected Results
- The backticked URL is rendered as a clickable link, not plain inline code text.
- Clicking opens `https://github.com/marmeladema` in a new tab.

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

### Feature: Pinned threads persist across reload and prune removed threads

#### Prerequisites
- App is running from this repository.
- At least two threads exist in the sidebar.

#### Steps
1. Pin two threads from the sidebar using the pin button.
2. Refresh the app page.
3. Confirm the same threads are still shown in the `Pinned` section and in the same order.
4. Archive one of the pinned threads from the thread menu.
5. Refresh the app page again.

#### Expected Results
- Pinned threads are restored after reload from Codex app global state (`~/.codex/.codex-global-state.json` key `thread-pinned-ids`).
- Pin order is preserved between reloads.
- Archived/removed pinned thread is automatically pruned and no stale pinned row remains.

#### Rollback/Cleanup
- Unpin test threads if needed.
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

### Feature: Startup sync does not delete remote AGENTS.md

#### Prerequisites
- Skills sync configured to `friuns2/codexskills`.
- Remote `main` contains `AGENTS.md`.
- Local skills repo is clean before startup sync.

#### Steps
1. Confirm remote `AGENTS.md` exists on `main`.
2. Confirm local `~/.codex/skills` is clean.
3. Trigger `Startup Sync`.
4. After completion, inspect latest commit created by sync (if any).
5. Verify `AGENTS.md` still exists locally and in remote `origin/main`.

#### Expected Results
- Startup sync may update manifest, but must not delete `AGENTS.md`.
- If sync creates a commit, changed files do not include `D AGENTS.md`.
- Local and remote `AGENTS.md` hashes remain equal after sync.

#### Rollback/Cleanup
- None.

### Feature: Bidirectional AGENTS.md sync via Startup Sync

#### Prerequisites
- Skills sync configured to `friuns2/codexskills`.
- `~/.codex/skills` is a clean git working tree before each sub-test.
- Skills Hub startup sync endpoint is reachable.

#### Steps
1. Remote -> Local:
2. Add a unique marker to remote `AGENTS.md` on `main`.
3. Confirm local `HEAD` is behind `origin/main`.
4. Trigger `Startup Sync`.
5. Verify local `AGENTS.md` contains the remote marker and local `HEAD == origin/main`.
6. Local -> Remote:
7. Add a different unique marker to local `~/.codex/skills/AGENTS.md`.
8. Confirm local working tree shows `M AGENTS.md`.
9. Trigger `Startup Sync`.
10. Verify remote `origin/main:AGENTS.md` contains the local marker and local `HEAD == origin/main`.

#### Expected Results
- Remote-only AGENTS edits are pulled into local without deletion.
- Local AGENTS edits are pushed to remote after startup sync.
- After each sync direction, local and remote commit SHAs match.

#### Rollback/Cleanup
- Remove temporary test markers from `AGENTS.md` if required.

### Feature: Mixed local+remote AGENTS edits do not stall Startup Sync

#### Prerequisites
- Skills sync configured and working.
- Local skills repo clean before test start.

#### Steps
1. Add marker `A` to remote `AGENTS.md`.
2. Add marker `B` to local `AGENTS.md` before syncing.
3. Trigger `Startup Sync`.
4. Wait for startup status to finish (`inProgress=false`).
5. Verify sync outcome explicitly:
6. If sync succeeds, local/remote SHAs match and expected merged marker result is present.
7. If sync fails, status includes a concrete error message (not silent success).

#### Expected Results
- Startup sync must not report success while local remains behind remote.
- No stale stash side-effects are introduced (no unexpected conflict from old stash entries).
- Final state is either a valid synchronized result or an explicit failure status with actionable error.

#### Rollback/Cleanup
- Reset local skills repo to `origin/main` after test if needed.

### Feature: Startup sync uses deterministic pull reconcile (`fetch + reset --hard`) before local replay

#### Prerequisites
- Skills sync is logged in and targets `friuns2/codexskills`.
- Local repo path is `~/.codex/skills`.
- Startup Sync endpoint is reachable at `/codex-api/skills-sync/startup-sync`.

#### Steps
1. Remote-only case:
2. Commit a unique marker to remote `AGENTS.md` on `main`.
3. Ensure local repo is clean and reset to `origin/main`, then trigger `Startup Sync`.
4. Confirm marker appears locally and `HEAD == origin/main`.
5. Local-only case:
6. Add a unique local marker to `~/.codex/skills/AGENTS.md` (uncommitted), trigger `Startup Sync`.
7. Confirm marker is pushed and `HEAD == origin/main` with clean worktree.
8. Mixed case:
9. Add local marker first, then commit a newer remote marker.
10. Trigger `Startup Sync` and verify mtime policy result (newer remote marker wins, older local marker dropped).
11. Confirm final state is clean with `HEAD == origin/main`.

#### Expected Results
- Startup sync does not fail with missing merge refs (`MERGE_HEAD`/`REBASE_HEAD`) in this path.
- Remote-only changes are always pulled first and visible locally.
- Local-only changes are preserved and pushed during the same startup sync run.
- Mixed local+remote edits converge automatically with no manual conflict handling.

#### Rollback/Cleanup
- Remove temporary test markers from `AGENTS.md` if not needed.

### Feature: Revert Renat scrolling/input-layout behavior (without Fast mode changes)

#### Prerequisites
- App builds successfully (`pnpm run build`).
- Open a thread with enough messages to scroll.
- Composer is visible in the main chat view.

#### Steps
1. Open a long thread and scroll upward away from bottom.
2. Trigger live overlay updates (for example by sending a new prompt) and observe scroll behavior.
3. Confirm message list horizontal overflow behavior in conversation and desktop main area.
4. In composer, verify there is no drag/drop overlay UI when dragging files over the input.
5. In composer, paste an image from clipboard and verify it is not auto-attached through paste handler.
6. Use file picker/camera attach buttons and confirm attachments still work.
7. Confirm Fast mode UI/toggle remains present and unchanged.

#### Expected Results
- Scroll behavior follows reverted layout logic for conversation/desktop containers.
- Composer drag-active overlay is removed from the input field layout.
- Clipboard image paste no longer triggers drag/paste attachment flow.
- Standard picker-based attachments still work.
- Fast mode button and related controls are unchanged.

#### Rollback/Cleanup
- `git restore src/components/content/ThreadComposer.vue src/components/content/ThreadConversation.vue src/components/layout/DesktopLayout.vue src/style.css tests.md`

### Feature: Chat file-link context menu (open/copy/edit)

#### Prerequisites
- App server is running from this repository.
- Open a thread that contains rendered `.message-file-link` anchors (for example Markdown file links).

#### Steps
1. In a message with a file link, right-click the file link text.
2. Verify the custom context menu appears near the pointer.
3. Click `Open link` and confirm the link opens in a new tab.
4. Right-click the same file link again and click `Copy link`, then paste into a text input to verify copied value.
5. For links under `/codex-local-browse...`, right-click and click `Edit file`.
6. Click outside the menu and press `Escape` while the menu is open.

#### Expected Results
- Right-clicking any `.message-file-link` opens the custom context menu.
- Menu includes `Open link` and `Copy link` for all links.
- Menu includes `Edit file` only for browseable local file links.
- Pointer-down outside, blur, and `Escape` close the menu.

#### Rollback/Cleanup
- Close any tabs opened during the test.

### Feature: Dark theme command rows in chat remain readable

#### Prerequisites
- App is running from this repository.
- Open any thread that contains command execution entries.
- Appearance is set to `Dark` in Settings.

#### Steps
1. Open a thread with one or more command execution rows in the conversation.
2. Verify command label text, grouped command label text, and status text in collapsed rows.
3. Locate a file-change summary row (for example: `▶ 2 files changed · 2 edited`) and verify the chevron and summary text are readable.
4. Expand a command row to show output and inspect the output panel border contrast.
5. Confirm status colors for running/success/error command rows are distinguishable in dark mode.
6. Toggle back to `Light` theme and confirm command rows still use the existing light styling.

#### Expected Results
- Command labels and grouped command labels are readable against dark row backgrounds.
- File-change summary rows keep readable chevron and summary text in dark mode.
- Default status text is readable in dark mode.
- Running/success/error status colors remain visible in dark mode.
- Expanded command output border is visible without using a bright light-theme border.
- Light theme command row styling is unchanged.

#### Rollback/Cleanup
- Return appearance setting to the previous user preference.

### Feature: Home composer vertical alignment matches reference layout

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Open the `New thread` (home) screen with a selected folder/project.
- Ensure desktop viewport width (for example >= 1280px).

#### Steps
1. Open the home screen and observe the hero block (`Let's build`) and composer placement.
2. Confirm the hero/settings block is vertically centered within the available content area.
3. Confirm the message composer sits in the lower area of the content column (not immediately below top content).
4. Resize window height taller/shorter and re-check vertical placement.
5. Open any thread route and verify thread composer layout remains unchanged.

#### Expected Results
- Home hero block is centered again (not top-anchored).
- Home composer aligns toward the bottom region similar to the reference screenshot.
- Resizing preserves the intended centered-hero + lower-composer structure.
- Thread route composer behavior is unchanged.

#### Rollback/Cleanup
- Revert the `.new-thread-empty` style in [src/App.vue](/Users/igor/.codex/worktrees/eaf8/codex-web-local/src/App.vue).

### Feature: Restore composer drag-and-drop file attach on input field

#### Prerequisites
- App is running with a selected thread and active composer.
- At least one local file is available to drag from Finder/File Explorer.

#### Steps
1. Drag a file over the composer input area.
2. Confirm drag highlight/overlay appears above the input.
3. Drop the file on the composer input field.
4. Verify the file is attached in composer chips.
5. Repeat with an image file and verify image preview appears.
6. In dark mode, repeat steps 1-2 and verify overlay remains readable.

#### Expected Results
- Composer shows drag-active visual state while file is hovering.
- Dropped files are attached through the same attachment pipeline as regular uploads.
- Image drops create image preview attachments.
- Dark mode drag overlay uses dark-theme colors and remains legible.

#### Rollback/Cleanup
- Remove attached files/images from the composer before closing the test thread.

### Feature: Restore clipboard image paste attachments in composer

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Open any thread where the composer is enabled.
- Have an image copied to system clipboard (for example screenshot copy).

#### Steps
1. Focus the composer textarea.
2. Paste clipboard content that contains only an image file payload.
3. Confirm an image chip/preview is added to composer attachments.
4. Copy plain text only and paste into composer.
5. Copy mixed content (plain text + image, if source provides both) and paste once.
6. Copy long plain text (at least 2000 characters) and paste into composer.
7. Confirm the long text is attached as a `.txt` file instead of being inserted into the textarea.
8. Send the message with the pasted image/text attachment.

#### Expected Results
- Image-only clipboard paste adds an image attachment to composer.
- Plain-text paste still inserts text into the composer and does not create an attachment.
- Mixed payload paste attaches the image while preserving text paste behavior.
- Long plain-text paste (>= 2000 chars) creates a `.txt` attachment and does not insert raw text into the textarea.
- Sending proceeds with the attached pasted image.

#### Rollback/Cleanup
- Remove the attached image chip from composer if not needed.

### Feature: Show user file attachments as visible chips in chat

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Open any thread with an active composer.
- Have at least one local file available to attach.

#### Steps
1. Attach one or more files via composer (file picker, paste long text as `.txt`, or other file attachment flow).
2. Send the message.
3. Locate the sent user message in conversation.
4. Verify file attachment chips are rendered above message text.
5. Click a file chip and confirm it opens the browse URL in a new tab/window.
6. Right-click the chip link and verify file-link context actions still appear (`Open link`, `Copy link`, and `Edit file` when applicable).

#### Expected Results
- Sent user messages with `fileAttachments` show visible file chips in chat.
- Chip labels match attachment labels from composer payload.
- Chip links resolve through browse URLs and remain clickable.
- Existing file-link context menu behavior works on the chip links.

#### Rollback/Cleanup
- Close any opened file tabs and remove temporary test messages if needed.

### Feature: Frontend missing-entry 404 page auto-redirects to chat

#### Prerequisites
- Build or runtime state where frontend entry cannot be served (for example missing `dist/index.html`).
- Start server and open the failing route in a browser.

#### Steps
1. Trigger the frontend missing-entry error page.
2. Confirm the page shows an error headline and a `Back to chat` link.
3. Wait 3 seconds without clicking the link.
4. Repeat and click `Back to chat` immediately.

#### Expected Results
- Error page still renders with the manual `Back to chat` link.
- Page automatically redirects to `/` after about 3 seconds.
- Manual link works instantly and is not blocked by the timer.

#### Rollback/Cleanup
- Restore frontend assets (`pnpm run build:frontend`) if they were intentionally removed for testing.

### Feature: Import 10 working DB accounts and keep Accounts section collapsed by default

#### Prerequisites
- Have a SQLite DB with `account_tokens.refresh_token` rows (default path: `/Users/igor/Git-projects/any-auto-register/account_manager.db`).
- Network access available for token exchange against OpenAI OAuth endpoint.
- Codex home available at `~/.codex` (or set `CODEX_HOME`).
- Start the app from this repository (`pnpm run dev`).

#### Steps
1. Run `scripts/import-working-accounts-from-db.sh`.
2. Verify script reports `imported` rows and ends with `done imported=<n>` where `n <= 10`.
3. Open `~/.codex/accounts.json` and verify new account entries were appended/updated.
4. Verify snapshot files exist under `~/.codex/accounts/<sha256(account_id)>/auth.json`.
5. Open app settings and check the `Accounts` section is collapsed on first load.
6. Click the chevron toggle in Accounts header to expand.
7. Confirm account list/error/empty state renders correctly after expanding.
8. Reload the page and confirm collapsed/expanded state persists.

#### Expected Results
- Script imports up to 10 valid (token-exchange-successful) accounts and skips invalid tokens.
- `accounts.json` and per-account snapshot `auth.json` files are created with secure file modes.
- Accounts panel in settings is collapsed by default when no saved preference exists.
- User can expand/collapse Accounts via header toggle, and the state persists in localStorage.

#### Rollback/Cleanup
- Remove imported snapshots from `~/.codex/accounts/` and corresponding rows in `~/.codex/accounts.json` if needed.
- Delete localStorage key `codex-web-local.accounts-section-collapsed.v1` to reset UI preference.

### Feature: Copy Codex accounts to Android via ssh helper script

#### Prerequisites
- Local Codex state exists at `~/.codex/accounts` and `~/.codex/accounts.json`.
- Android helper exists and is executable: `/Users/igor/Git-projects/codex-web-local-android/andclaw/ssh.sh`.
- Android target is reachable through helper SSH path.

#### Steps
1. Run `scripts/copy-accounts-to-android.sh`.
2. Confirm script prints local account count and upload/extract progress.
3. Confirm script prints remote account count.
4. Verify script exits successfully with `Copy complete: local and remote counts match.`
5. On Android host, verify `~/.codex/accounts.json` exists and snapshots under `~/.codex/accounts/*/auth.json` are present.

#### Expected Results
- Script packs `accounts/` and `accounts.json`, uploads and extracts on Android.
- Local and remote `auth.json` snapshot counts match.
- Script exits non-zero on mismatch or missing prerequisites.

#### Rollback/Cleanup
- Remove remote copied data if needed: delete `~/.codex/accounts` and `~/.codex/accounts.json` on Android host.

### Feature: Accounts no longer stuck on "Fetching account details…"

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Have at least one imported account in the Accounts section.

#### Steps
1. Open Settings and expand `Accounts`.
2. Ensure at least one account has no immediately available quota snapshot (for example right after import/refresh, or by waiting for quota read failure).
3. Observe the quota/status line for that account after the initial fetch completes.
4. Trigger `Reload` in the Accounts header and wait for account list update.
5. Re-check accounts that are not in `Loading quota…` state.

#### Expected Results
- `Fetching account details…` appears only while the entry is truly in transient loading.
- Accounts that are not loading and still have no quota snapshot show `Quota unavailable` instead of a perpetual fetching label.
- Existing `Loading quota…` and explicit error messages continue to render correctly.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Account quota background refresh recovers from stale loading and inspection hangs

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Have multiple imported accounts in `~/.codex/accounts.json`.
- At least one account previously left with `quotaStatus: "loading"` for longer than 2 minutes, or one account that causes quota inspection to hang.

#### Steps
1. Open Settings and expand `Accounts`.
2. Trigger account list refresh by loading the page or clicking `Reload`.
3. Monitor `~/.codex/accounts.json` and confirm stale `loading` accounts are re-picked for refresh (not ignored indefinitely).
4. Wait at least 30 seconds when one account is slow/hanging.
5. Verify other accounts continue progressing instead of all remaining blocked.
6. Re-open the Accounts section and inspect final status labels for previously stuck accounts.

#### Expected Results
- `loading` states older than 2 minutes are retried automatically.
- A single hanging account inspection times out (about 25 seconds) and transitions to `error` rather than blocking the whole queue forever.
- Remaining accounts continue refreshing to `ready` as data becomes available.
- UI no longer stays indefinitely stuck waiting on one blocked account refresh.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Account quota label uses primary snapshot when windowMinutes is missing

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Have accounts where `quotaSnapshot.primary` exists but `windowMinutes` can be null.

#### Steps
1. Open Settings and expand `Accounts`.
2. Click `Reload` and wait for account statuses to settle to `ready`.
3. Inspect account rows that previously showed `Quota unavailable` while backend had `quotaSnapshot.primary.usedPercent`.
4. Verify displayed quota labels in UI and account card titles.

#### Expected Results
- Accounts with `quotaSnapshot.primary` show a remaining-percent quota label.
- `Quota unavailable` appears only when there is truly no usable quota snapshot data.
- Team/free accounts both render quota labels consistently when primary snapshot is present.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Default runtime uses unrestricted sandbox and no approvals

#### Prerequisites
- Build artifacts are available (or run directly from source in this repo).
- No `CODEXUI_SANDBOX_MODE` or `CODEXUI_APPROVAL_POLICY` environment variables are exported in the shell.

#### Steps
1. Start the app from this repository without passing `--sandbox-mode` or `--approval-policy`.
2. Observe startup logs for the printed runtime config lines.
3. Confirm the logs show `Codex sandbox: danger-full-access` and `Approval policy: never`.
4. Stop the app and restart with explicit overrides, for example `--sandbox-mode workspace-write --approval-policy on-request`.
5. Confirm startup logs now show the override values.

#### Expected Results
- Default startup (no flags/env) uses `danger-full-access` sandbox and `never` approval policy.
- Explicit CLI overrides still take precedence and are applied correctly.

#### Rollback/Cleanup
- Unset any temporary env vars used for override checks.

### Feature: npm run dev exports unrestricted runtime defaults

#### Prerequisites
- Node and pnpm are installed.
- No shell-level `CODEXUI_SANDBOX_MODE` or `CODEXUI_APPROVAL_POLICY` overrides are set.

#### Steps
1. Run `npm run dev` from the repository root.
2. In a second terminal, run `ps eww -p $(pgrep -f "vite" | head -n 1)`.
3. Confirm the process environment contains `CODEXUI_SANDBOX_MODE=danger-full-access` and `CODEXUI_APPROVAL_POLICY=never`.
4. Stop dev server and run `CODEXUI_SANDBOX_MODE=workspace-write CODEXUI_APPROVAL_POLICY=on-request npm run dev`.
5. Re-check the Vite process environment values.

#### Expected Results
- Default `npm run dev` includes `CODEXUI_SANDBOX_MODE=danger-full-access` and `CODEXUI_APPROVAL_POLICY=never`.
- Explicit shell overrides still take precedence when provided.

#### Rollback/Cleanup
- Stop running dev servers and unset temporary env overrides.

### Feature: Approval request uses legacy in-conversation request card only

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Open a thread where Codex can trigger an approval request (for example a command or file-change approval).

#### Steps
1. Trigger an approval request in an existing thread.
2. Observe the conversation timeline where server requests are rendered.
3. Observe the composer area at the bottom of the thread.
4. Confirm the approval controls are shown in the in-conversation request card.
5. Confirm no separate composer waiting-state approval panel is rendered.

#### Expected Results
- Exactly one approval UI is visible for the active pending request.
- The approval UI appears in the conversation request card.
- Composer continues to show the standard composer UI without a separate approval panel.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Rollback appends rolled-back user text into composer input

#### Prerequisites
- App is running from this repository.
- Open any non-home thread with at least one completed user/assistant turn.
- Composer input is visible in the thread view.

#### Steps
1. In the selected thread, locate a message row with a visible rollback action.
2. Click rollback for a specific turn whose user prompt text is known.
3. Observe the composer input immediately after clicking rollback.
4. If composer already had text, verify the rolled-back user text is appended on a new line.
5. Confirm the thread rollback still completes and the turn is removed from the conversation.

#### Expected Results
- Before rollback completes, the original user message text from that turn is inserted into the composer input.
- Existing composer draft text is preserved and the restored text is appended.
- Rollback behavior still removes the selected turn(s) as before.

#### Rollback/Cleanup
- Clear composer input if restored text is no longer needed.
