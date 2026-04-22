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
- At least one Telegram user ID is available for allowlisting.
- Access to `~/.codex/` on the host machine.

#### Steps
1. In the app UI, open Telegram connection and submit a bot token plus one or more allowed Telegram user IDs.
2. Verify file `~/.codex/telegram-bridge.json` exists.
3. Open `~/.codex/telegram-bridge.json` and confirm it contains `botToken` and `allowedUserIds` fields.
4. Restart the app server and call Telegram status endpoint from UI to confirm it still reports configured.

#### Expected Results
- Telegram token is persisted in `~/.codex/telegram-bridge.json`.
- Telegram allowlisted user IDs are persisted in `~/.codex/telegram-bridge.json`.
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
- `botToken`, `chatIds`, and `allowedUserIds` are all present in `~/.codex/telegram-bridge.json`.

#### Rollback/Cleanup
- Remove `chatIds` or delete `~/.codex/telegram-bridge.json` to clear persisted chat targets.

### Feature: Telegram bridge rejects unauthorized senders

#### Prerequisites
- App server is running from this repository.
- Telegram bot is configured with a known `allowedUserIds` entry.
- One Telegram account is allowlisted and one separate Telegram account is not.

#### Steps
1. From the allowlisted Telegram account, send `/start` to the bot.
2. Confirm the bot responds normally.
3. From the non-allowlisted Telegram account, send `/start` to the same bot.
4. From the non-allowlisted account, send a normal text prompt.

#### Expected Results
- The allowlisted account can use the Telegram bridge normally.
- The non-allowlisted account receives an unauthorized response.
- No thread is created or updated for the non-allowlisted account.

#### Rollback/Cleanup
- Remove test chat mappings from `~/.codex/telegram-bridge.json` if needed.

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

### Feature: Per-thread model selection

#### Prerequisites
- App is running from this repository against a Codex app-server that supports thread-scoped model persistence.
- At least two selectable models are available in the composer model picker.
- At least one existing thread is available, or you can create one during the test.

#### Steps
1. On the new-thread screen, choose model `A` in the composer.
2. Send a message to create a new thread.
3. In that thread, switch the composer model to model `B`.
4. Send another message in the same thread so the thread persists model `B`.
5. Create or open a different thread and set its model to model `A`.
6. Switch back and forth between the two threads.
7. Refresh the browser while one of the threads is selected.
8. Re-open both threads again after the refresh.
9. While thread `A` is selected, use the sidebar thread menu to fork thread `B`.
10. Open the forked thread and confirm the composer model matches thread `B`, not the currently selected thread.
11. Restart the app-server or otherwise force a model-list refresh that does not include one thread’s persisted model, then switch back to that thread.
12. Delete one of the test threads you changed, refresh the thread list, and continue switching between the remaining thread and the new-thread screen.

#### Expected Results
- Each thread restores its own last selected model when you switch threads.
- The new-thread screen keeps its own draft model selection instead of inheriting the last opened thread.
- After browser refresh, reopening a thread restores the model persisted for that thread.
- Forked or newly created threads keep the resolved model returned by Codex, including fallback to the supported default model when needed.
- Forking a nonselected thread from the sidebar uses that source thread’s persisted model.
- If the selected thread’s persisted model is not returned in the latest model list, the composer still shows that model as the active selection instead of falling back to the placeholder label.
- Removing a thread prunes its saved per-thread model state, and model selection continues to update normally for the remaining threads without runtime errors.

#### Rollback/Cleanup
- Reset each tested thread back to its original model selection if you changed an existing conversation for the test.

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

### Feature: New thread worktree creation supports searchable base-branch selector

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Use a folder that is inside a Git repository with at least two branches (for example `main` and a feature branch).

#### Steps
1. Open the `New thread` screen.
2. Select a project folder that points to a Git repository.
3. Change runtime to `New worktree`.
4. Verify a `Base branch` dropdown appears.
5. Open the dropdown and type part of a branch name in search.
6. Select a non-default branch from the filtered list.
7. Submit the first message to trigger worktree creation.
8. In the opened thread, confirm `cwd` points to a new worktree path under `~/.codex/worktrees/`.
9. In terminal, run `git -C <new-worktree-path> rev-parse --abbrev-ref HEAD` and `git -C <new-worktree-path> merge-base HEAD <selected-base-branch>`.

#### Expected Results
- `Base branch` selector is visible only in `New worktree` mode.
- Dropdown supports search/filter for branch names.
- Worktree creation succeeds and creates a new branch named `codex/<id>`.
- New worktree branch is based on the selected branch (merge-base confirms expected ancestry).

#### Rollback/Cleanup
- Remove temporary worktree after verification: `git -C <repo-root> worktree remove <new-worktree-path>`.
- Delete temporary branch if needed: `git -C <repo-root> branch -D codex/<id>`.

### Feature: Worktree branch selector sorts branches by last active commit

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Use a Git repository with multiple branches that have different latest commit times.

#### Steps
1. Open `New thread`.
2. Select the Git project folder.
3. Set runtime to `New worktree`.
4. Open the `Base branch` dropdown.
5. Note the first 3-5 branches shown.
6. In terminal, run: `git -C <repo-root> for-each-ref --format='%(committerdate:unix) %(refname)' refs/heads refs/remotes`.
7. Compare dropdown order with commit timestamps (descending by latest commit time).

#### Expected Results
- Branches are ordered by most recently active commit first.
- If a branch exists in both local and remote refs, it appears once.
- Ties are ordered alphabetically by branch name.

#### Rollback/Cleanup
- No cleanup required.

### Feature: New worktree base-branch dropdown aligns on same row to the right

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Open `New thread` and select a Git project folder.

#### Steps
1. On desktop width (>=1024px), switch runtime to `New worktree`.
2. Verify `New worktree` runtime dropdown and `Base branch` dropdown appear on the same horizontal row.
3. Verify `Base branch` control is positioned to the right of runtime mode control.
4. Switch runtime back to `Local project`.
5. Verify branch dropdown disappears while runtime control remains aligned.
6. Resize viewport to mobile width (~375px) and switch back to `New worktree`.
7. Verify controls stack vertically for mobile readability.

#### Expected Results
- Desktop: runtime and branch controls are on one row, with branch selector on the right.
- Local runtime hides the branch selector without breaking layout.
- Mobile view stacks controls vertically.

#### Rollback/Cleanup
- No cleanup required.

### Feature: New worktree creation uses detached HEAD parity behavior

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Select a Git-backed folder on `New thread`.

#### Steps
1. Set runtime to `New worktree`.
2. Choose any base branch in `Base branch` dropdown.
3. Send first message to trigger worktree creation.
4. Copy resulting worktree `cwd` from thread context.
5. Run `git -C <worktree-cwd> status --branch --porcelain`.
6. Run `git -C <worktree-cwd> rev-parse --abbrev-ref HEAD`.

#### Expected Results
- Worktree is created successfully.
- Git status reports detached HEAD state (no local branch checkout).
- `rev-parse --abbrev-ref HEAD` returns `HEAD`.

#### Rollback/Cleanup
- Remove test worktree when done: `git -C <repo-root> worktree remove <worktree-cwd>`.

### Feature: Thread RPC strips inline image/file payloads into links

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Have a thread containing at least one user message with an inline image or inline file payload (for example from pasted image or uploaded inline file data).

#### Steps
1. Open browser devtools Network tab.
2. Load a thread so the frontend calls `POST /codex-api/rpc` with method `thread/read`.
3. Inspect the JSON response body under `result.thread.turns[*].items[*].content[*]`.
4. Find entries that previously carried inline `data:` payloads.
5. Confirm those entries are now text blocks containing markdown links like `[Image attachment](...)` or `[File attachment](...)`.

#### Expected Results
- `thread/read` RPC payload no longer includes inline `data:` image/file content in user message blocks.
- Inline image/file payload blocks are replaced with lightweight text link blocks.
- Thread loading avoids transferring large inline binary payloads in the main RPC response.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Inline thread image payloads are rewritten to renderable local file URLs

#### Prerequisites
- Start app from this repository (`pnpm run dev`).
- Have a thread that includes a user inline image block originally stored as a `data:` payload.

#### Steps
1. Open the thread in the chat UI.
2. Confirm the message area where the inline image appears.
3. Open Network tab and inspect `POST /codex-api/rpc` `thread/read` response.
4. Verify image block now has `type: "image"` and `url` with `file://...` (not `data:`).

#### Expected Results
- Inline `data:` image payload is not sent in RPC response.
- UI still renders the image from the generated local file URL.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Rapid thread switching during active load

#### Prerequisites
- Start app from this repository (`pnpm run dev`).
- Ensure there are at least 3 existing threads with enough history so opening each thread triggers a visible loading state.

#### Steps
1. Open thread A from the sidebar.
2. While thread A is still loading, quickly click thread B and then thread C.
3. Repeat fast switching across multiple threads (for example A -> B -> C -> A) before each load settles.
4. Observe selected row highlight, URL route (`/thread/:threadId`), and conversation content after loading settles.

#### Expected Results
- The final clicked thread is always the selected thread.
- Sidebar highlight, route thread id, and rendered conversation stay in sync.
- No stale intermediate selection remains after rapid clicks.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Thread auto-scrolls to latest message after load

#### Prerequisites
- Start app from this repository (`pnpm run dev`).
- Have a thread with enough messages to require scrolling.

#### Steps
1. Open the long thread from the sidebar.
2. Wait for `Loading messages...` to disappear.
3. Observe the conversation viewport position immediately after load.
4. Switch to another thread, then back to the same long thread.

#### Expected Results
- After each thread load, conversation snaps to the bottom-most/latest message.
- The latest message is visible without manual scrolling.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Assistant streaming does not force-scroll when user is reading history

#### Prerequisites
- Start app from this repository (`pnpm run dev`).
- Open a thread long enough to scroll.

#### Steps
1. Scroll up so latest message is not visible.
2. Send a new prompt and wait for assistant reply to stream.
3. Observe viewport while reply is in progress.
4. Click `Jump to latest` (or manually scroll to bottom).
5. Send another prompt and observe streaming behavior again.

#### Expected Results
- While scrolled up, streaming assistant output does not pull viewport to bottom.
- After returning to bottom, streaming output auto-follows newest content.

#### Rollback/Cleanup
- No cleanup required.

### Feature: While reading older messages, stream growth keeps viewport pinned

#### Prerequisites
- Start app from this repository (`pnpm run dev`).
- Open a long thread and scroll up away from bottom.

#### Steps
1. Keep viewport fixed on an older message section.
2. Trigger a long assistant response so content height grows continuously.
3. Observe viewport position for 10-20 seconds during streaming.

#### Expected Results
- Viewport stays pinned at the same absolute scroll location while streaming.
- No gradual downward drift occurs until user manually jumps to latest/bottom.

#### Rollback/Cleanup
- No cleanup required.

### Feature: Thread stream parity — stream-first hydration with full turn history

#### Prerequisites
- App is running from this repository (`pnpm run dev`).
- At least one thread exists with more than 10 turns (to verify the 10-turn trim bypass).

#### Steps
1. Open a long thread (>10 turns) in the UI.
2. Open DevTools Network tab and inspect the outgoing requests.
3. Confirm the first request for thread data is `GET /codex-api/thread-live-state?threadId=...` (not `POST /codex-api/rpc` with `thread/read`).
4. Inspect the response JSON and confirm `conversationState.turns` contains ALL turns (not trimmed to 10).
5. Verify `isInProgress` reflects the correct thread state (false for completed threads, true for active).
6. Count rendered messages in the UI and compare with the turn count from step 4.
7. Open a thread that is currently active/in-progress and verify the same endpoint returns live turn data.
8. Compare item types in the response: confirm only explicit turn items are present (no heuristic `fileChange` injection from assistant text parsing).
9. Open DevTools and call `fetch('/codex-api/thread-stream-events?threadId=<id>&limit=50').then(r=>r.json()).then(console.log)` and verify the endpoint returns `{ events: [...] }` structure.
10. Simulate a live-state endpoint failure (e.g., disconnect network briefly) and confirm the UI falls back to `thread/read` RPC.

#### Expected Results
- Thread detail loading uses `/codex-api/thread-live-state` as the primary data source.
- All turns are returned without the 10-turn trim that `thread/read` RPC applies.
- Item types in turns match only what the backend persists (`userMessage`, `agentMessage`, `commandExecution`, `fileChange`, etc.) — no heuristic injection.
- `thread/read` RPC is used only as a fallback when the live-state endpoint fails.
- Stream events endpoint returns buffered notification frames for active threads.
- Live command executions during an active turn include `turnId` for strict turn scoping.
- Command execution items are recovered from the session log for old/completed threads.
- Commands are interleaved with agent messages in correct chronological order (not appended at end).
- File change items (from `apply_patch` tool calls) are recovered from the session log with diff data and `kind.type` format.

#### Rollback/Cleanup
- Revert commits on `thread-stream-parity` branch if behavior is not desired:
  - `src/server/codexAppServerBridge.ts` (stream endpoints + notification buffering)
  - `src/api/codexGateway.ts` (stream-first hydration)
  - `src/api/normalizers/v2.ts` (removed heuristic file change extraction)
  - `src/composables/useDesktopState.ts` (strict turn scoping on live commands)

### Feature: Thread stream parity works on Linux (Oracle A1 ARM64)

#### Prerequisites
- Oracle A1 server accessible via SSH (`ssh a1`).
- Codex CLI installed on A1 (`codex --version` works).
- Existing Codex sessions with commands and file edits on A1.

#### Steps
1. Clone or pull branch `codex/thread-stream-parity` on A1 into `~/codexui`.
2. Run `pnpm install` and start dev server: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
3. From A1 locally, call `curl http://localhost:<port>/codex-api/rpc -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"thread/list","params":{},"id":1}'` and verify thread list returns.
4. Pick a thread with known commands and file edits (e.g., MCP server deploy thread).
5. Call `curl http://localhost:<port>/codex-api/thread-live-state?threadId=<id>` and inspect response.
6. Verify `conversationState.turns[*].items` contains `commandExecution` items recovered from session log with correct `command`, `status`, and `aggregatedOutput`.
7. Verify `fileChange` items recovered from `apply_patch` session log entries with `changes[].path`, `changes[].operation`, and `changes[].diff`.
8. Verify items are interleaved chronologically with `agentMessage` items (not all commands at the start or end).
9. Test from Mac via Tailscale: `curl --http1.1 http://100.127.77.25:<port>/codex-api/thread-live-state?threadId=<id>` (use `--http1.1` to avoid Vite HTTP/2 upgrade hang).

#### Expected Results
- Bridge server starts and spawns Codex app-server on Linux ARM64 without errors.
- `thread/list` RPC returns all threads from `~/.codex/sessions/`.
- `thread-live-state` returns full turn history with recovered `commandExecution` and `fileChange` items.
- Session log parsing works with Linux file paths (`/home/ubuntu/.codex/sessions/...`).
- Chronological interleaving matches the order seen on macOS (commands appear between agent messages, not appended).
- Tailscale remote access works with `--http1.1` flag.

#### Verified Results (2026-04-08)
- A1 server: Ubuntu ARM64, Node v22.22.0, Codex CLI 0.101.0.
- Thread `019d62d5-9fa7-7ad2-bab7-b5225d617734`: 21 turns, 120 commands, 17 file changes recovered.
- Thread `019d6a60-d303-7d50-bdf3-7a7f7e38abb1`: 10 turns, 62 commands, 3 file changes recovered.
- Thread `019d658d-ca06-7c80-8ef6-ee22c828b407`: 4 turns, 73 commands, 7 file changes recovered.
- All items correctly interleaved with agent messages in chronological order.
- Command content verified: `command`, `status`, `aggregatedOutput` fields present.
- File change content verified: `changes[].path`, `changes[].operation`, `changes[].diff` fields present.

#### Rollback/Cleanup
- Stop the dev server on A1: `pkill -f vite`.

### Feature: Rollback undoes apply_patch file changes

#### Prerequisites
- App is running from this repository (`pnpm run dev`).
- A thread exists with at least one completed turn that applied file changes via `apply_patch`.
- The thread's `cwd` points to a git-tracked directory.

#### Steps
1. Open a thread with file changes visible in the conversation (file change cards with diffs).
2. Note the current state of a file that was modified by the agent in a recent turn.
3. Click the rollback button on a turn that has file changes.
4. After rollback completes, check the file on disk — it should be restored to the state before the agent modified it.
5. Verify the thread conversation no longer shows the rolled-back turns.
6. For turns that added new files: verify the added files are deleted from disk.
7. For turns that deleted files: verify the deleted files are restored (if they were tracked in git).

#### Expected Results
- Clicking rollback on a turn reverts both the thread history AND the file system changes from that turn and all subsequent turns.
- Files modified by `apply_patch` in rolled-back turns are restored via `git checkout HEAD -- <path>`.
- Files created by `apply_patch` in rolled-back turns are removed from disk.
- Files deleted by `apply_patch` in rolled-back turns are restored from git HEAD.
- File moves in rolled-back turns are reversed (moved file is renamed back to original path).
- If file revert fails (e.g., not a git repo), the thread rollback still proceeds — file revert is best-effort.
- The rollback-files endpoint (`POST /codex-api/thread/rollback-files`) can be called independently for testing.

#### Rollback/Cleanup
- No cleanup required — rolled-back files are already restored.

### Feature: Markdown file links with spaces and parentheses in path

#### Prerequisites
- App is running from this repository.
- An active thread is open.
- File exists at `/home/ubuntu/Documents/New Project (2)/hosting_manager.py`.

#### Steps
1. Send this exact message:
   `[hosting_manager.py](/home/ubuntu/Documents/New Project (2)/hosting_manager.py)`
2. In the rendered message, confirm it appears as one clickable file link.
3. Click the link and confirm it opens local browse for the full file path.
4. Right-click and use `Copy link`, then verify pasted URL still points to the same full path.

#### Expected Results
- Markdown link is parsed as one link token (not split at `)` inside the path).
- Clicking navigates to the full file path in local browse view.
- Copied link contains the complete encoded path.

#### Rollback/Cleanup
- Remove test file if it was created only for this verification.

### Feature: Markdown link with backticked label renders as file link

#### Prerequisites
- App is running from this repository.
- An active thread is open.
- File exists at `/Users/igor/temp/TestChat/qwe.txt`.

#### Steps
1. Send this exact message:
   [`/Users/igor/temp/TestChat/qwe.txt`](/Users/igor/temp/TestChat/qwe.txt)
2. In the rendered message, confirm it appears as one clickable file link.
3. Verify the visible link text is `/Users/igor/temp/TestChat/qwe.txt` (without backticks).
4. Click the link and confirm it opens local browse for the full file path.

#### Expected Results
- Backticks inside markdown label do not break markdown-link parsing.
- The label renders as plain link text (no backtick glyphs).
- Clicking opens `/codex-local-browse/Users/igor/temp/TestChat/qwe.txt`.

#### Rollback/Cleanup
- Remove test file if it was created only for this verification.

---

### Fix: Codex.app "New Worktree" Button Missing After Account Switch (CDP Injection)

#### Prerequisites
- `/Applications/Codex.app` installed
- Script at `scripts/fix-codex-worktree-button.sh` or `~/.codex/scripts/fix-codex-worktree-button.sh`
- Python 3 with `websockets` package (`pip3 install websockets`)

#### Root Cause
The Statsig SDK in Codex.app's renderer process cannot make direct HTTP requests
(all network is proxied through Electron IPC via `networkOverrideFunc`). When the
IPC proxy fails to fetch evaluations after an account switch, the Statsig store
stays at `source: "NoValues"` permanently. Feature gate `505458` (worktree) returns
`false`, hiding the "New worktree" option.

#### Steps
1. Open Codex.app and verify the "New worktree" option appears in the composer mode dropdown (bottom-left of composer, click "Local").
2. Switch accounts via profile dropdown (e.g. "Use Copilot account" or "Use OpenAI account").
3. Verify the "New worktree" option is now missing from the mode dropdown.
4. Run: `bash scripts/fix-codex-worktree-button.sh`
5. Script will:
   - Restart Codex.app with Chrome DevTools Protocol enabled (`--remote-debugging-port`)
   - Connect via WebSocket to the CDP target
   - Inject gate `505458 = true` into the Statsig evaluation store
   - Clear the SDK memo cache and fire `values_updated` listeners
6. Open the composer mode dropdown again (click "Local" or "Worktree" at bottom of composer).

#### Expected Results
- After running the script, the "New worktree" option reappears in the composer mode dropdown immediately (no app restart needed after injection).
- Gate `505458` returns `true` from `checkGate()`.
- Use `--dry-run` to preview actions without making changes.
- Use `--port PORT` to specify a custom CDP port (default: 9339).
- If Codex.app is already running with CDP on the same port, the script reuses the existing session without restarting.

#### Rollback/Cleanup
- Quit and relaunch Codex.app normally (without `--remote-debugging-port`) to remove CDP access.
- The injected gate value persists only in memory for the current app session; restarting Codex.app resets it.

### Feature: GitHub trending projects disabled by default on new chat

#### Prerequisites
- App is running from this repository.
- Browser local storage key `codex-web-local.github-trending-projects.v1` is unset (fresh profile or manually removed).

#### Steps
1. Open the app to the new chat/home screen.
2. Verify the `Trending GitHub projects` section is not shown.
3. Open Settings and enable `GitHub trending projects`.
4. Return to new chat/home and verify the trending section appears.
5. Refresh the page and verify enabled state persists.

#### Expected Results
- With no saved preference, trending section is hidden by default.
- Enabling the setting immediately shows trending projects.
- Saved preference persists across refresh.

#### Rollback/Cleanup
- Reset `GitHub trending projects` setting to your preferred state.

### Feature: Lazy message rendering (windowed conversation)

#### Prerequisites
- App is running from this repository.
- A thread exists with more than 50 messages (send many short messages, or use a long-running session).

#### Steps — initial load window

1. Open a thread with 60+ messages.
2. Observe that the conversation list does **not** show all messages immediately — only the most recent ~50 are rendered.
3. Verify the latest messages are visible and the chat is scrolled to the bottom.
4. Confirm a "Load earlier messages" button appears at the top of the visible list.

#### Steps — scroll-triggered load

5. Scroll up slowly toward the top of the conversation list.
6. When the scroll position reaches within ~200 px of the top, verify that the previous 30 messages appear automatically above the current ones.
7. Confirm the viewport does **not** jump — the messages you were reading stay in view.
8. Repeat scrolling up to verify additional chunks load on demand.
9. Once all messages are loaded, verify the "Load earlier messages" button disappears.

#### Steps — manual load button

10. Reload the page and open the same long thread.
11. Click "Load earlier messages" button without scrolling.
12. Verify 30 older messages are prepended and scroll position is preserved.

#### Steps — live session growth

13. Start an active Codex session (or send many messages in quick succession).
14. Let the conversation exceed 50 messages while staying scrolled to the bottom.
15. Verify the rendered count stays bounded (top of the DOM list advances as new messages arrive).
16. Scroll up and confirm "Load earlier messages" works to reveal trimmed messages.

#### Steps — rollback / message shrink

17. In a thread with a turn that can be rolled back, trigger a rollback.
18. Verify the conversation does **not** go blank — messages still render after the list shrinks.
19. Confirm `renderWindowStart` recovers gracefully and earlier messages remain accessible.

#### Expected Results
- Only ≤50 messages are in the DOM on initial load.
- Scrolling to the top (or clicking the button) appends older messages without a viewport jump.
- During live output, the rendered window stays bounded; old messages are trimmed from the top while the user follows the bottom.
- After a rollback the conversation remains visible; no blank screen.

#### Rollback/Cleanup
- No persistent state is changed — closing or refreshing the tab resets the render window.
### Feature: CLI auto-stars friuns2/codexui on startup (best-effort)

#### Prerequisites
- `gh` CLI installed and authenticated (`gh auth status`).
- Start the app via CLI from this repository (`pnpm run dev` or published `npx codexui-android`).

#### Steps
1. Ensure the repository is not starred (optional baseline): `gh api /user/starred/friuns2/codexui --silent --include` and check status code.
2. Launch `codexui` CLI once.
3. After startup, run: `gh api /user/starred/friuns2/codexui --silent --include`.
4. Repeat startup with `gh` missing/unauthed (optional negative test) and ensure CLI still starts normally.

#### Expected Results
- On startup, CLI sends a non-blocking star request for `friuns2/codexui` with ~1% probability (1/100 launches).
- When `gh` is available and authenticated, repository ends up starred.
- If `gh` is unavailable or fails, startup continues without crash.

#### Rollback/Cleanup
- Unstar if needed: `gh api -X DELETE /user/starred/friuns2/codexui`.

### Feature: Sentry error tracking and encrypted auth context

#### Prerequisites
- Sentry project `node-express` in org `dfv-p0` accessible.
- Valid `~/.codex/auth.json` with `tokens.account_id` and `tokens.access_token`.
- Project built: `pnpm run build:cli`.

#### Steps
1. Start the CLI: `node dist-cli/index.js --no-tunnel --no-open --no-login`.
2. Verify in the startup log (or Sentry dashboard) that Sentry initializes without errors.
3. Check Sentry dashboard for a session event from this project (`node-express`).
4. Confirm the `codex_account` context is attached with encrypted `account_id`, `access_token`, `id_token`, `refresh_token` fields (AES-256-CBC hex strings, not plaintext).
5. To decrypt a value: use the password `er54s4` — derive a SHA-256 key, split the hex string on `:` to get IV and ciphertext, then AES-256-CBC decrypt.

#### Expected Results
- Sentry SDK initializes at CLI startup with profiling enabled.
- `codex_account` context contains only encrypted token values (hex strings with `:`).
- No plaintext tokens appear in Sentry events.
- CLI startup is not blocked or slowed noticeably by Sentry init.

#### Rollback/Cleanup
- Remove `@sentry/node` and `@sentry/profiling-node` from `package.json` and delete `src/cli/instrument.ts` to fully revert.

---

### Free Mode (OpenRouter)

#### Feature
Toggle "Free mode" in settings to use free OpenRouter models without an OpenAI API key. Uses XOR-encrypted community keys that rotate randomly per request. Default model is `openrouter/free` — OpenRouter's meta-model that auto-routes to the least-loaded free model, avoiding per-model rate limits. Model selector shows only free models when free mode is on. Config is isolated from `~/.codex/config.toml` — state stored in `~/.codex/webui-free-mode.json` and passed to app-server via `-c` CLI args.

#### Prerequisites
- Project built: `pnpm run build`.
- Codex CLI installed and available in PATH.

#### Steps
1. Start the server: `node dist-cli/index.js --no-tunnel --no-open --no-login`.
2. Open the UI in a browser (default `http://localhost:5999`).
3. Open the sidebar settings panel (gear icon).
4. Toggle **Free mode (OpenRouter)** ON.
5. Verify the toggle turns on and model dropdown changes to `openrouter/free`.
6. Click the model dropdown — verify it shows **only** free models (gemma, llama, qwen, etc.) and no GPT/OpenAI default models.
7. Verify `~/.codex/config.toml` was NOT modified (no `model_provider` or `model` entries added).
8. Verify `~/.codex/webui-free-mode.json` exists and contains `{"enabled":true,"apiKey":"sk-or-v1-...","model":"openrouter/free"}`.
9. Open a new thread and send a message (e.g. "Say hello").
10. Verify a response comes back from a free OpenRouter model (may be rate-limited during high demand).
11. Toggle **Free mode (OpenRouter)** OFF.
12. Verify the model dropdown reverts to GPT-5.3-codex (or default OpenAI model).
13. Verify model dropdown shows normal OpenAI models (not free models).

#### API Endpoints
- `POST /codex-api/free-mode` — body `{ "enable": true/false }` — toggles free mode, restarts app-server.
- `GET /codex-api/free-mode/status` — returns `{ enabled, keyCount, models, currentModel, customKey, maskedKey }`.
- `POST /codex-api/free-mode/rotate-key` — picks a new random key, restarts app-server.
- `POST /codex-api/free-mode/custom-key` — body `{ "key": "sk-or-v1-..." }` — sets a custom OpenRouter API key. Send empty string to revert to community keys.
- `GET /codex-api/provider-models` — returns `{ data: [...], exclusive: true }` when free mode is on (only free models shown).

#### Custom API Key
- When free mode is ON, an "OpenRouter API key" input appears below the toggle in settings.
- Enter your own `sk-or-v1-...` key and click "Set" (or press Enter) to use your own OpenRouter key.
- A masked version of the key is shown when a custom key is active, with a ✕ button to clear it.
- Clearing the custom key reverts to community keys.

#### Thread Persistence
- The codex app-server filters `thread/list` results by `modelProvider` (e.g. `openai` vs `openrouter-free`).
- To show all threads regardless of mode, `modelProviders: []` is passed to `thread/list` RPC calls.
- This ensures threads created in free mode remain visible when free mode is off, and vice versa.
- Toggling free mode ON/OFF preserves all threads — no data is lost.
- Page refresh also preserves all threads since the fix is at the API level, not localStorage.

#### Known Limitations
- `wire_api="chat"` is not supported by the codex CLI — must use `wire_api="responses"`.
- Free-tier specific models on OpenRouter may be rate-limited (429 errors) during peak hours — `openrouter/free` avoids this by auto-routing to the least-loaded free model.

#### Expected Results
- Free mode ON: App-server is restarted with `-c` config args for openrouter-free provider. Model selector shows only free models.
- Free mode OFF: App-server is restarted without free mode args. Model selector shows default models.
- `~/.codex/config.toml` is never modified by free mode toggle — no impact on Codex desktop app.
- 68 encrypted keys available, decrypted at runtime with XOR key `er54s4`.
- Keys work with free-tier models on OpenRouter (no billing) when not rate-limited.
- Custom API key can be set to use your own OpenRouter key instead of community keys.

#### Rollback/Cleanup
- Remove `src/server/freeMode.ts`, revert changes in `codexAppServerBridge.ts`, `codexGateway.ts`, and `App.vue`.
- Delete `~/.codex/webui-free-mode.json` to clear free mode state.

### Feature: Codex.app Thread Provider Filter Patch (fix-codex-thread-filter.sh)

#### Prerequisites
- macOS with `/Applications/Codex.app` installed.

#### Steps
1. **Dry-run**: `bash scripts/fix-codex-thread-filter.sh --dry-run`
   - Should extract asar, find `product-name-*.js`, locate `listThreads` pattern, and exit cleanly.
2. **Apply patch**: `bash scripts/fix-codex-thread-filter.sh`
   - Extracts `app.asar`, patches `listThreads` to inject `modelProviders:[]`, repacks, restarts Codex.app.
   - Verify output shows "Patch marker verified in installed asar".
3. **Verify in Codex.app**:
   - Open Codex.app after patch.
   - If threads were created with different model providers (e.g. `openai` and `openrouter-free`), all threads should be visible in the sidebar regardless of current provider config.
4. **Restore**: `bash scripts/fix-codex-thread-filter.sh --restore`
   - Restores the backup `app.asar.bak` and reverts to original behavior.

#### Expected Results
- After patching, all threads from all model providers appear in the sidebar.
- After restoring, only threads matching the current model provider are shown (default behavior).
- Patch survives Codex.app restarts but is overwritten by app updates.

#### Rollback/Cleanup
- Run `bash scripts/fix-codex-thread-filter.sh --restore` to undo.
- Backup is stored at `/Applications/Codex.app/Contents/Resources/app.asar.bak`.

### Fix: Delete/rename thread dialog height cap

#### Prerequisites
- App is running from this repository.
- At least one thread exists with a long title (can be achieved by renaming a thread to a very long string).

#### Steps — Delete button visibility

1. Right-click (or long-press) a thread in the sidebar to open the context menu.
2. Click **Delete**.
3. Verify the confirmation dialog appears and the **Delete** / **Cancel** buttons are fully visible without scrolling the page.
4. Repeat with a thread whose title is very long (50+ characters); confirm buttons remain visible.
5. On a small viewport (e.g. browser DevTools device emulation at 375 × 667), repeat steps 1–4 and confirm the dialog never exceeds the screen height.

#### Steps — Long title wrapping

6. Rename a thread to a string with no spaces (e.g. `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`).
7. Open the Delete dialog for that thread.
8. Verify the long title in the subtitle area wraps onto multiple lines rather than overflowing or being clipped horizontally.
9. If the title is long enough to fill the subtitle area, verify a vertical scrollbar appears within the subtitle, and the title, input, and buttons remain visible outside the scroll area.

#### Steps — Rename dialog

10. Open the Rename dialog for a thread with a long title.
11. Confirm the rename input field, title text, and **Save** / **Cancel** buttons are all fully visible.
12. Type a very long string into the rename input and confirm it does not push the buttons off screen.

#### Expected Results
- Dialog is capped at 90 vh; action buttons are always pinned at the bottom.
- Long unbroken thread titles wrap within the subtitle area; no horizontal clipping.
- Vertical scrollbar appears in the subtitle region if the title exceeds available height.

#### Rollback/Cleanup
- Rename any test threads back to original names if desired.

### Feature: Provider dropdown in settings (replaces free mode toggle)

#### Prerequisites
- App is running from this repository (`pnpm run dev`).

#### Steps
1. Open Settings panel from the sidebar.
2. Verify the settings panel is scrollable when content overflows.
3. Verify the Accounts section does NOT have its own scrollbar — it flows naturally within the settings panel scroll.
4. Locate the **Provider** dropdown (default: "Codex").
5. Change provider to **OpenRouter**.
6. Verify a "Get API key" link appears next to the OpenRouter API key label, pointing to `https://openrouter.ai/keys`.
7. Verify the API key input field is shown with placeholder `sk-or-v1-... (optional, uses free keys if empty)`.
8. Optionally enter an OpenRouter API key and click Set.
9. Change provider to **Custom endpoint**.
10. Verify URL and API key input fields appear.
11. Enter a valid endpoint URL and click Save.
12. Change provider back to **Codex**.
13. Verify the config is reset and no provider-specific fields are shown.

#### Expected Results
- Provider dropdown shows three options: Codex, OpenRouter, Custom endpoint.
- Selecting OpenRouter enables free mode with community keys (or custom key if provided).
- Selecting Custom endpoint allows setting a custom API base URL and bearer token.
- Selecting Codex disables external provider mode and uses the default Codex backend.
- Settings panel scrolls as a whole; accounts section has no independent scrollbar.
- OpenRouter option includes a "Get API key" link to openrouter.ai/keys.

#### Rollback/Cleanup
- Switch provider back to Codex to restore default behavior.

### Feature: CLI no longer requires codex login on startup

#### Prerequisites
- Remove `~/.codex/auth.json` to simulate a first-time user.

#### Steps
1. Run `npx codexui` or `pnpm run dev`.
2. Verify the CLI prints a message about not being logged in but does NOT block or prompt for login.
3. Verify the server starts and the web UI loads successfully.
4. Use the Provider dropdown in settings to select OpenRouter and start chatting without a Codex account.

#### Expected Results
- CLI does not run `codex login` on startup.
- A friendly message is shown: "You can log in later via settings or run `codexui login`."
- The app is fully usable without a Codex account when using OpenRouter or custom providers.

#### Rollback/Cleanup
- Run `codexui login` to restore Codex authentication if needed.

---

### Codex CLI + OpenCode Zen Big Pickle Model

#### Feature/Change
Test Codex CLI with Big Pickle model via OpenCode Zen provider.

#### Prerequisites/Setup
1. Codex CLI v0.93.0 installed (`npm install -g @openai/codex@0.93.0`) - this version supports `wire_api = "chat"` which Big Pickle requires.
2. OpenCode CLI v1.4.3+ installed (`npm install -g opencode`).
3. OpenCode Zen API key set as env var: `export OPENCODE_ZEN_API_KEY="sk-..."`
4. Config in `~/.codex/config.toml`:
   ```toml
   [model_providers.opencode-zen]
   name = "OpenCode Zen"
   base_url = "https://opencode.ai/zen/v1"
   env_key = "OPENCODE_ZEN_API_KEY"
   wire_api = "chat"

   [profiles.pickle]
   model = "big-pickle"
   model_provider = "opencode-zen"
   ```
5. OpenCode config in `~/.config/opencode/opencode.json`:
   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "model": "opencode/big-pickle",
     "provider": {
       "opencode": {
         "options": {
           "apiKey": "sk-..."
         }
       }
     }
   }
   ```

#### Step-by-Step Actions

**Test 1: Codex CLI with Big Pickle (profile)**
1. `export OPENCODE_ZEN_API_KEY="sk-..."`
2. `echo "say hi" | codex exec --profile pickle`
3. Expect: Big Pickle responds with a greeting. Shows `provider: opencode-zen` in header.

**Test 2: Codex CLI with inline config**
1. `echo "say hi" | OPENCODE_ZEN_API_KEY="sk-..." codex exec -m "big-pickle" -c 'model_provider="opencode-zen"'`
2. Expect: Same response.

**Test 3: OpenCode CLI with Big Pickle**
1. `echo "" | opencode run --pure "say hi"`
2. Expect: Big Pickle responds with a greeting.

**Test 4: Direct API verification**
1. `curl -s -X POST "https://opencode.ai/zen/v1/chat/completions" -H "Content-Type: application/json" -H "Authorization: Bearer sk-..." -d '{"model":"big-pickle","messages":[{"role":"user","content":"say hi"}],"max_tokens":100}'`
2. Expect: JSON response with `choices[0].message.content` containing a greeting.

#### Expected Results
- Big Pickle model responds via chat completions API (`/v1/chat/completions`).
- Big Pickle is free during beta period.
- Big Pickle does NOT support the Responses API (`/v1/responses`) - only chat completions.
- Codex CLI v0.118+ will NOT work with Big Pickle (removed `wire_api = "chat"` support).
- Codex CLI v0.93.0 works with `wire_api = "chat"`.

#### Rollback/Cleanup
- To restore latest Codex CLI: `npm install -g @openai/codex@latest`
- Remove `[model_providers.opencode-zen]` and `[profiles.pickle]` from `~/.codex/config.toml`.
- Remove API key from environment.

---

### OpenCode Zen Provider & Wire API Selector in codexui

#### Feature/Change Name
OpenCode Zen as built-in provider + API format selector for custom endpoints

#### Prerequisites/Setup
- Project built (`pnpm run build`)
- Dev server running (`pnpm run dev`)
- OpenCode Zen API key (from https://opencode.ai/auth)

#### Step-by-Step Actions

**Test 1: Select OpenCode Zen provider**
1. Open the app in browser
2. Click the provider dropdown in the sidebar settings
3. Select "OpenCode Zen"
4. Verify: An API key input field appears with "Get API key" link
5. Enter a valid OpenCode Zen API key (sk-...)
6. Click "Save"
7. Verify: Provider is saved, model list fetches from OpenCode Zen `/models` endpoint
8. Send a message — it should use `wire_api = "chat"` (Chat Completions API)

**Test 2: Select Custom endpoint with API format selector**
1. Select "Custom endpoint" from the provider dropdown
2. Enter a custom base URL (e.g., `https://opencode.ai/zen/v1`)
3. Enter an API key
4. Verify: An "API format" dropdown appears with "Responses API" (default) and "Chat Completions"
5. Select "Chat Completions"
6. Click "Save"
7. Verify: Provider is saved with `wireApi = "chat"`
8. Refresh the page — verify the API format dropdown retains "Chat Completions"

**Test 3: Provider persistence**
1. Select "OpenCode Zen", enter key, save
2. Refresh the page
3. Verify: Provider dropdown shows "OpenCode Zen" (not "Codex" or "OpenRouter")

**Test 4: Switch back to Codex**
1. From OpenCode Zen, select "Codex" provider
2. Verify: Free mode is disabled, standard Codex flow resumes

#### Expected Results
- OpenCode Zen appears in provider dropdown alongside Codex/OpenRouter/Custom
- OpenCode Zen defaults to `wire_api = "chat"` (Chat Completions API)
- Custom endpoints show an API format selector; default is "Responses API"
- Provider selection and wireApi are persisted in `~/.codex/webui-free-mode.json`
- Model list for OpenCode Zen is fetched from `https://opencode.ai/zen/v1/models`

#### Rollback/Cleanup
- Switch provider back to "Codex" to disable free mode
- No config files outside the project are modified (state stored in `~/.codex/webui-free-mode.json`)

### env_key Authentication for Custom Providers (codex CLI v0.93.0)

#### Feature/Change
Use `env_key` instead of `experimental_bearer_token` for API key injection when spawning the codex `app-server` subprocess. API keys are passed as environment variables to the subprocess rather than CLI config arguments.

#### Prerequisites/Setup
- codex CLI v0.93.0 installed
- Dev server running (`pnpm run dev`)
- OpenCode Zen API key: any valid key from opencode.ai

#### Step-by-Step Actions

**Test 1: OpenCode Zen with big-pickle model**
1. Open Settings, select "OpenCode Zen" provider
2. Enter a valid API key, save
3. In the model dropdown, select `big-pickle`
4. Type "say SUCCESSTEST in one word" and click Send
5. Wait for response (typically 3-5 seconds)
6. Verify: AI responds with "SUCCESSTEST"

**Test 2: Verify env var is set on subprocess**
1. After step 1-2 above, run: `ps -p $(pgrep -f "codex app-server" | tail -1) -E | tr ' ' '\n' | grep OPENCODE`
2. Verify: `OPENCODE_ZEN_API_KEY=sk-...` appears in the process environment

**Test 3: Model mismatch causes 401 (expected)**
1. With OpenCode Zen provider active, select a paid model like `gpt-5.4-mini`
2. Send a message
3. Verify: 401 Unauthorized error appears (OpenCode Zen returns 401 for paid models without billing)
4. Switch to `big-pickle` and retry — should succeed

**Test 4: wire_api deprecation awareness**
1. Run: `OPENCODE_ZEN_API_KEY="<key>" codex -c 'model_providers.oz.wire_api="chat"' -c 'model_providers.oz.base_url="https://opencode.ai/zen/v1"' -c 'model_providers.oz.env_key="OPENCODE_ZEN_API_KEY"' -c 'model_provider="oz"' -m big-pickle exec "say hi"`
2. Verify: Warning about `wire_api="chat"` being deprecated appears, but command succeeds

#### Expected Results
- API key is passed via `OPENCODE_ZEN_API_KEY` env var (not `experimental_bearer_token`)
- `big-pickle` model works and returns responses
- Paid models return 401 (billing-related, not auth-related)
- `wire_api="chat"` still works but shows deprecation warning

#### Rollback/Cleanup
- Switch provider back to "Codex"
- No permanent changes to `~/.codex/config.toml`

---

### Provider Switch Model List Isolation

#### Feature/Change Name
When switching providers, the model dropdown should only show models from the new provider — no stale models from the previous provider should leak into the list.

#### Prerequisites/Setup
1. Dev server running at `http://localhost:5173`
2. Access to at least two providers (e.g., "Codex" and "OpenRouter")

#### Steps
1. Open the app sidebar settings
2. Select "OpenRouter" provider — model list should show OpenRouter free models (e.g., `openrouter/free`, `google/gemma-3-27b-it:free`)
3. Select a model like `openrouter/free`
4. Switch provider back to "Codex"
5. Open the model dropdown

#### Expected Results
- Model list shows only Codex models (e.g., `gpt-5.2-codex`, `gpt-5.2`, `gpt-5.1-codex-max`, `gpt-5.1-codex-mini`)
- No OpenRouter models (e.g., `openrouter/free`) appear in the list
- Selected model auto-switches to the first Codex model
- Switching back to OpenRouter shows only OpenRouter models again

#### Rollback/Cleanup
- No permanent changes needed


---

### Zen Proxy Port Resolution When Vite Auto-Increments

#### Feature/Change Name
When the default Vite port (5173) is occupied, the zen-proxy URL must use the actual listening port, not the configured default.

#### Prerequisites/Setup
1. Another process already occupying port 5173
2. Dev server started (will auto-bind to 5174 or next available)
3. OpenCode Zen provider configured with API key

#### Steps
1. Start any process on port 5173 (e.g., another dev server)
2. Run `pnpm run dev` — Vite auto-binds to 5174
3. Open the app at `http://localhost:5174`
4. Switch to "OpenCode Zen" provider, enter API key, save
5. Send a message using big-pickle or any OpenCode Zen model

#### Expected Results
- The zen-proxy request goes to `http://127.0.0.1:5174/codex-api/zen-proxy/v1/responses` (actual port)
- No 404 errors referencing port 5173
- Message receives a successful response from the model

#### Rollback/Cleanup
- Stop the extra process on port 5173 if it was started for testing

---

### Model List Search / Filter

#### Feature/Change Name
Search/filter input in the model selection dropdown.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Any provider configured with available models

#### Steps
1. Open any thread or new-thread view
2. Click the model selector button in the composer bar
3. Observe the search input at the top of the dropdown
4. Type a partial model name (e.g., "pickle")
5. Observe filtered results

#### Expected Results
- A text input with placeholder "Search models..." appears at the top of the dropdown
- Typing filters the model list to only matching models (case-insensitive, matches label or value)
- Clearing the search shows all models again
- Pressing Escape clears the search text first, then closes the dropdown on second press
- "No results" shown when no models match the query

#### Rollback/Cleanup
- No permanent changes needed

---

### OpenRouter "hi" request should not return invalid_prompt

#### Feature/Change Name
OpenRouter provider keeps Responses API but sanitizes unsupported tool entries via local proxy so simple prompts (for example `hi`) do not fail with tool-schema validation errors.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. OpenRouter provider selected in Settings
3. Valid OpenRouter API key configured (custom key or community key)
4. Any OpenRouter model selected

#### Steps
1. Open any thread
2. Send `hi`
3. Wait for assistant output to complete
4. Check the response area for any JSON error block mentioning `invalid_prompt` or `Invalid Responses API request`

#### Expected Results
- Assistant returns a normal text reply to `hi`
- No `invalid_prompt` error JSON is shown in the message stream
- No message about invalid tool discriminator/type appears

#### Rollback/Cleanup
- Switch provider back to previous setting if needed

---

### Custom Endpoint API switch shows Responses vs Completions

#### Feature/Change Name
Custom endpoint settings present an API format switch with `Responses API` and `Completions API` options.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open Settings panel
3. Select provider `Custom endpoint`

#### Steps
1. In Custom endpoint settings, locate `API format` dropdown
2. Open the dropdown
3. Verify available options
4. Select `Completions API`
5. Select `Responses API`

#### Expected Results
- Dropdown options are exactly `Responses API` and `Completions API`
- Selecting either option updates the visible selected value correctly

#### Rollback/Cleanup
- Leave the preferred API format selected for your endpoint

---

### Custom Endpoint API format uses segmented toggle control

#### Feature/Change Name
Custom endpoint API format is presented as a two-button toggle (`Responses` / `Completions`) instead of a dropdown.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open Settings panel
3. Select provider `Custom endpoint`

#### Steps
1. Locate `API format` in Custom endpoint settings
2. Click `Completions`
3. Confirm the `Completions` button becomes active
4. Click `Responses`
5. Confirm the `Responses` button becomes active
6. In dark mode, verify active/inactive contrast remains readable

#### Expected Results
- API format control is a segmented two-button toggle
- Exactly two choices are available: `Responses` and `Completions`
- Active option is visually highlighted and switches immediately on click
- Control remains readable in both light and dark themes

#### Rollback/Cleanup
- Keep the desired API format selected

---

### OpenRouter API format toggle (Responses vs Completions)

#### Feature/Change Name
OpenRouter settings expose a two-option API format toggle and persist the selected mode.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open Settings panel
3. Select provider `OpenRouter`
4. OpenRouter key configured (community or custom key)

#### Steps
1. In OpenRouter settings, find `API format` toggle
2. Click `Completions`
3. Send `hi` in a thread and wait for response
4. Re-open Settings and confirm `Completions` remains selected
5. Click `Responses`
6. Send `hi` again and wait for response
7. Re-open Settings and confirm `Responses` remains selected

#### Expected Results
- OpenRouter API format control is a segmented toggle with `Responses` and `Completions`
- Both modes save successfully without provider switch errors
- Sending `hi` works in both modes (assistant reply, no `invalid_prompt` error block)
- Selected mode persists in status after refresh/reload

#### Rollback/Cleanup
- Leave OpenRouter on the preferred API format

---

### Provider-scoped model defaults + OpenRouter completions bash fallback

#### Feature/Change Name
Model defaults are stored per provider (no cross-provider leakage), and OpenRouter `Completions` mode preserves shell-tool execution by routing tool-capable requests through Responses compatibility.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open Settings panel
3. OpenRouter key configured

#### Steps
1. Switch provider to `OpenRouter` and choose a specific OpenRouter model in composer selector
2. Switch provider to `Codex`
3. Choose a Codex model different from the OpenRouter one
4. Switch back to `OpenRouter`
5. Verify previous OpenRouter model selection is restored
6. In OpenRouter settings, set API format to `Completions`
7. Send: `what codex cli version is? it should run bash commands`

#### Expected Results
- Provider switch restores the last model used for that provider
- OpenRouter model does not leak into Codex provider model list/selection, and vice versa
- In `Completions` mode, the assistant can still invoke bash/tool execution flow and return the CLI version result

#### Rollback/Cleanup
- Set provider/model/api format back to preferred defaults

---

### Unified provider proxy: OpenRouter + OpenCode Zen tool-capable completions

#### Feature/Change Name
Both OpenRouter and OpenCode Zen routes use a unified Responses proxy layer that preserves tool-capable behavior when using Completions mode.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Valid OpenRouter and/or OpenCode Zen API keys configured
3. Existing thread open

#### Steps
1. Select `OpenRouter`, set API format to `Completions`, and send: `what codex cli version is? it should run bash commands`
2. Confirm shell execution appears and includes `codex --version`
3. Select `OpenCode Zen`, set API format to `Completions`, and send the same prompt
4. Confirm shell execution appears and includes `codex --version`
5. Repeat each provider once with simple `hi` to verify non-tool path still returns assistant text normally

#### Expected Results
- Both providers work through a common proxy path without provider-specific regressions
- In Completions mode, tool-capable prompt triggers command execution for both providers
- `codex --version` output is returned in the assistant response flow
- Simple text prompt (`hi`) continues to work in Completions mode

#### Rollback/Cleanup
- Switch provider/API format back to preferred defaults

### OpenCode Zen Responses Payload Normalization

#### Feature/Change Name
OpenCode Zen `Responses` mode converts Codex Responses `input` payloads to Zen-compatible `messages` payloads.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. OpenCode Zen API key configured

#### Steps
1. Open Settings
2. Set Provider to `OpenCode Zen`
3. Set API format to `Responses`
4. Save
5. Select model `trinity-large-preview-free`
6. Send `hi`
7. Switch API format to `Completions`
8. Save
9. Select model `trinity-large-preview-free`
10. Send `hi`

#### Expected Results
- `Responses` mode posts to `/zen/v1/responses` with a `messages` payload derived from Codex Responses `input`
- `trinity-large-preview-free` returns a successful assistant greeting in `Responses` mode
- `Completions` mode still posts through `/zen/v1/chat/completions` and returns a successful assistant greeting
- Models unsupported by Zen for a chosen format, such as `minimax-m2.5-free` in `Responses` mode, surface the upstream error without being hidden

#### Rollback/Cleanup
- Switch provider/API format back to preferred defaults

---

### Raw auth/provider error messages

#### Feature/Change Name
Surface upstream auth/provider errors without rewriting them in the client normalizer.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. A provider/backend request that can return an error

#### Steps
1. Trigger a provider/backend error, such as an auth refresh failure or invalid custom-provider response
2. Observe the surfaced error text in the UI/failed RPC path

#### Expected Results
- Error text matches the original upstream/backend error message
- No replacement copy like `Authentication session conflict detected...` is injected

#### Rollback/Cleanup
- Restore provider/session settings to the preferred state

---

### Custom endpoint Completions via local Responses proxy

#### Feature/Change Name
Custom endpoint `Completions` mode uses a local Responses-compatible proxy so current Codex CLI versions do not reject `wire_api="chat"`.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Local OpenAI-compatible endpoint running at `http://127.0.0.1:8666/v1`
3. API key `pwd`

#### Steps
1. Open Settings
2. Set Provider to `Custom endpoint`
3. Enter Custom endpoint URL `http://127.0.0.1:8666/v1`
4. Enter API key `pwd`
5. Set API format to `Completions`
6. Save
7. Select model `claude-sonnet-4.5`
8. Send `hi`
9. Select model `glm-5`
10. Send `hi`
11. In the same thread, ask `what is latest codex cli version?`

#### Expected Results
- The Codex app-server starts with `wire_api="responses"` against `/codex-api/custom-proxy/v1`
- The custom provider save records a usable default model from `/models` when available
- The Codex app-server receives the custom default model via runtime config
- The model list preserves endpoint-advertised models, including `auto-*` aliases
- The local proxy forwards the request to `/v1/chat/completions`
- The UI renders an assistant greeting such as `Hey! How can I help you today?`
- `glm-5` returns a successful assistant response
- Follow-up tool-output turns do not fail with Kiro Gateway's generic `payload size exceeded ~615KB` error when the payload is small

#### Rollback/Cleanup
- Switch provider/API format back to preferred defaults

---

### TestChat GLM-5 new-thread model selection

#### Feature/Change Name
New TestChat threads use the provider-scoped model selected in the new-thread composer.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Custom endpoint provider configured for `http://127.0.0.1:8666/v1`
3. Custom endpoint API format set to `Completions`
4. The local endpoint advertises model `glm-5`

#### Steps
1. Open the app home page
2. Select project `TestChat`
3. Select model `glm-5` in the new-thread composer
4. Send `create todo list app`
5. Inspect the created session metadata or UI model selector for the new thread

#### Expected Results
- The new thread starts with model `glm-5`, not the previous model from another provider or context
- The running turn uses the custom endpoint completions proxy
- The UI keeps `glm-5` selected after the thread is created

#### Rollback/Cleanup
- Switch provider/model settings back to preferred defaults if needed

---

### User message edit action replaces rollback button

#### Feature/Change Name
The old rollback button is replaced with an `Edit message` action under each eligible user message, while keeping the existing behavior that appends the original text into the composer and rolls the thread back from that turn.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. An existing thread with at least one completed user/assistant turn

#### Steps
1. Open a thread with multiple completed turns
2. Hover a completed user message
3. Confirm `Edit message` appears under that user message
4. Confirm assistant responses no longer show the old `Rollback` button
5. Click `Edit message` on an earlier user message with recognizable text
6. Observe the composer draft after the click
7. Confirm the thread rolls back from the selected turn

#### Expected Results
- The action under eligible user messages is labeled `Edit message`
- Assistant responses no longer render the old rollback action
- Clicking `Edit message` appends the original user text into the composer
- The existing rollback behavior still truncates the selected turn and later turns

#### Rollback/Cleanup
- Re-send the edited message if you want to recreate the conversation path

---

### API perf log bodyMB uses one decimal place

#### Feature/Change Name
`[codex-api-perf]` log entries format `bodyMB` with one decimal place instead of four.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. A request large enough to trigger `[codex-api-perf]` logging

#### Steps
1. Trigger a `/codex-api/` request that exceeds the perf logging threshold
2. Inspect the server log line that includes `bodyMB=...`

#### Expected Results
- `bodyMB` is formatted with one decimal place, such as `bodyMB=3.4`
- The log does not print extra precision such as `bodyMB=3.4489`

#### Rollback/Cleanup
- None
### Feature: Find in thread keyboard/action parity

- Prerequisites/setup:
  - Start the app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open any thread containing repeated words across multiple messages.
- Steps:
  1. Open a thread page.
  2. Press `Cmd+F` (macOS) or `Ctrl+F` (Windows/Linux).
  3. Confirm the header "Find in thread" input receives focus.
  4. Enter a query that matches multiple messages.
  5. Use `Enter` and `Shift+Enter` in the find input.
  6. Use the `↑` and `↓` buttons beside the input.
  7. Click `✕` to clear search state.
- Expected result(s):
  - Match counter updates as `current/total`.
  - Active match cycles forward/backward and scrolls into view.
  - Active matched message is visibly highlighted.
  - Clearing search resets counter to `0/0` and removes highlight.
- Rollback/cleanup notes:
  - Revert changes in `src/App.vue` and `src/components/content/ThreadConversation.vue` if this behavior is not desired.

### Feature: New thread keyboard shortcut parity (`Cmd/Ctrl+N`)

- Prerequisites/setup:
  - Start the app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Ensure at least one existing thread is present.
- Steps:
  1. Open a thread route.
  2. Press `Cmd+N` (macOS) or `Ctrl+N` (Windows/Linux).
  3. Confirm app navigates to Home/New thread screen.
  4. Press `Cmd+N`/`Ctrl+N` again while already on Home.
- Expected result(s):
  - Shortcut is intercepted by app (no browser/system default action inside app view).
  - On thread route, it transitions to Home/New thread.
  - On Home route, it is a no-op navigation-wise and keeps Home active.
- Rollback/cleanup notes:
  - Revert the `onWindowKeyDown` shortcut branch in `src/App.vue`.

### Feature: Composer send shortcut parity alias (`Cmd/Ctrl+Shift+Enter`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open any thread.
  2. Type a unique marker into composer.
  3. Press `Cmd+Shift+Enter` (macOS) or `Ctrl+Shift+Enter` (Windows/Linux).
- Expected result(s):
  - Message submits successfully with `Cmd/Ctrl+Shift+Enter`.
  - Existing send shortcuts (`Enter`/`Cmd/Ctrl+Enter` depending on setting) continue to work.
- Rollback/cleanup notes:
  - Revert `isModShiftEnter` shortcut alias handling in `onInputKeydown` in `src/components/content/ThreadComposer.vue`.

### Feature: Composer plan-mode shortcut parity (`Shift+Tab`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Ensure at least one thread exists and composer is available.
- Steps:
  1. Open a thread route.
  2. Open composer attach menu and note plan-mode toggle aria label (`Enable plan mode` or `Disable plan mode`).
  3. Focus composer textarea.
  4. Press `Shift+Tab`.
  5. Re-open attach menu and read plan-mode toggle aria label again.
- Expected result(s):
  - `Shift+Tab` toggles collaboration mode between default and plan.
  - Plan-mode aria label flips (`Enable ...` <-> `Disable ...`) after shortcut.
  - Shortcut only applies when both relevant collaboration modes are available.
- Rollback/cleanup notes:
  - Revert `Shift+Tab` shortcut handling and `toggleCollaborationModeViaShortcut` in `src/components/content/ThreadComposer.vue`.

### Feature: Composer Shift+Tab mention guard parity

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open a thread route with composer visible.
- Steps:
  1. Open attach menu and note current plan-mode aria label.
  2. Focus composer and open file mention menu by typing ` @`.
  3. Press `Shift+Tab`.
  4. Re-check plan-mode aria label.
- Expected result(s):
  - Plan mode remains unchanged while mention menu is active.
  - Mention menu remains active (not auto-committed by `Shift+Tab`).
- Rollback/cleanup notes:
  - Revert mention-menu Tab handling guard and `Shift+Tab` mention-open guard in `src/components/content/ThreadComposer.vue`.

### Feature: Composer escape handling parity (`Escape`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open a thread route with composer visible.
- Steps:
  1. Focus composer textarea.
  2. Press `Escape` with no modifiers.
  3. Check active focused element.
- Expected result(s):
  - Composer escape path runs when mention menu is not active.
  - Textarea is blurred (focus leaves composer input).
- Rollback/cleanup notes:
  - Revert `Escape` branch and `handleComposerEscape` in `src/components/content/ThreadComposer.vue`.

### Feature: Composer escape mention handling parity

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open a thread route with composer visible.
- Steps:
  1. Focus composer and open mention menu by typing ` @`.
  2. Press `Escape`.
  3. Check mention menu visibility and composer focus.
- Expected result(s):
  - Mention menu closes.
  - Composer remains focused (no blur while clearing mention UI).
- Rollback/cleanup notes:
  - Revert mention-escape handling in `onInputKeydown` in `src/components/content/ThreadComposer.vue`.

### Feature: Composer escape attach-menu handling parity

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open a thread route with composer visible.
- Steps:
  1. Focus composer input.
  2. Open composer attach menu.
  3. Press `Escape`.
- Expected result(s):
  - Attach menu closes.
  - Composer input regains/keeps focus.
- Rollback/cleanup notes:
  - Revert attach-menu escape handling in `handleComposerEscape` in `src/components/content/ThreadComposer.vue`.

### Feature: Composer model shortcut parity (`Cmd/Ctrl+T`)

- Prerequisites/setup:
  - Start the app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Ensure at least one existing thread is present.
- Steps:
  1. Open a thread route and focus composer textarea.
  2. Press `Cmd+T` (macOS) or `Ctrl+T` (Windows/Linux).
  3. Confirm composer model dropdown opens.
  4. Press `Cmd+T`/`Ctrl+T` again.
- Expected result(s):
  - Shortcut is intercepted by app.
  - First press opens composer model dropdown.
  - Second press keeps dropdown open and moves focus into model picker controls.
- Rollback/cleanup notes:
  - Revert the `key === 't'` composer shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Settings keyboard shortcut parity (`Cmd/Ctrl+,`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Press `Cmd+,` (macOS) or `Ctrl+,` (Windows/Linux).
  2. Confirm Settings panel opens.
  3. Press `Cmd+,` / `Ctrl+,` again.
- Expected result(s):
  - First press toggles Settings open.
  - Second press toggles Settings closed.
- Rollback/cleanup notes:
  - Revert the `event.key === ','` shortcut branch in `src/App.vue`.

### Feature: Thread cycle shortcuts parity (`Cmd/Ctrl+Shift+[`, `Cmd/Ctrl+Shift+]`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Ensure multiple threads exist in sidebar.
- Steps:
  1. Open a thread.
  2. Press `Cmd/Ctrl+Shift+]` and confirm next thread opens.
  3. Press `Cmd/Ctrl+Shift+[` and confirm previous thread opens.
  4. Repeat enough times to verify wrap-around behavior.
- Expected result(s):
  - Right cycle shortcut advances to next thread in current sidebar order.
  - Left cycle shortcut moves to previous thread.
  - Navigation wraps at boundaries.
- Rollback/cleanup notes:
  - Revert `navigateThreadByOffset` and bracket-key shortcut branches in `src/App.vue`.

### Feature: Skills route shortcut parity (`Cmd/Ctrl+Shift+K`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open any non-skills route (`/` or thread route).
  2. Press `Cmd+Shift+K` (macOS) or `Ctrl+Shift+K` (Windows/Linux).
  3. Confirm app navigates to Skills route.
  4. Press shortcut again while on Skills route.
- Expected result(s):
  - First press navigates to Skills.
  - Second press on Skills is a no-op (remains on Skills).
- Rollback/cleanup notes:
  - Revert `key === 'k' && shiftKey` shortcut branch in `src/App.vue`.

### Feature: Review pane shortcut parity (`Cmd/Ctrl+Shift+R`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open a thread route.
- Steps:
  1. Press `Cmd+Shift+R` (macOS) or `Ctrl+Shift+R` (Windows/Linux).
  2. Confirm Review pane opens.
  3. Press shortcut again.
- Expected result(s):
  - First press toggles Review pane open.
  - Second press toggles Review pane closed.
  - Shortcut does nothing outside thread routes.
- Rollback/cleanup notes:
  - Revert `key === 'r' && shiftKey` shortcut branch in `src/App.vue`.

### Feature: Escape closes Review pane

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open a thread route.
- Steps:
  1. Open Review pane (header toggle or `Cmd/Ctrl+Shift+R`).
  2. Press `Escape`.
- Expected result(s):
  - Review pane closes.
  - Thread route remains active.
- Rollback/cleanup notes:
  - Revert `Escape` handling branch for `isReviewPaneOpen` in `src/App.vue`.

### Feature: Route history shortcuts parity (`Cmd/Ctrl+[`, `Cmd/Ctrl+]`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open a thread route.
  2. Navigate to Skills route (`/#/skills`) from the app.
  3. Press `Cmd+[` (macOS) or `Ctrl+[` (Windows/Linux).
  4. Confirm app navigates back to the previous route.
  5. Press `Cmd+]` or `Ctrl+]`.
- Expected result(s):
  - `Cmd/Ctrl+[` navigates backward in app history.
  - `Cmd/Ctrl+]` navigates forward in app history.
  - Existing `Cmd/Ctrl+Shift+[` and `Cmd/Ctrl+Shift+]` thread cycle shortcuts still work.
- Rollback/cleanup notes:
  - Revert non-shift bracket shortcut branches in `onWindowKeyDown` in `src/App.vue`.

### Feature: Sidebar search shortcut parity (`Cmd/Ctrl+G`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open app on any route.
  2. Press `Cmd+G` (macOS) or `Ctrl+G` (Windows/Linux).
  3. Confirm sidebar search input becomes visible and focused.
  4. Type a query and verify sidebar thread list filters.
- Expected result(s):
  - `Cmd/Ctrl+G` opens sidebar search if hidden.
  - Keyboard focus lands in the sidebar search input.
  - Existing search behavior and clear/escape handling continue to work.
- Rollback/cleanup notes:
  - Revert `key === 'g'` shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Alternate new-thread shortcut parity (`Cmd/Ctrl+Shift+O`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open any non-home route (for example Skills).
  2. Press `Cmd+Shift+O` (macOS) or `Ctrl+Shift+O` (Windows/Linux).
  3. Confirm app navigates to Home/New thread screen.
  4. Press the shortcut again while on Home.
- Expected result(s):
  - Shortcut is intercepted by app.
  - It triggers the same behavior as `Cmd/Ctrl+N` new-thread shortcut.
  - Repeated invocation on Home keeps Home active.
- Rollback/cleanup notes:
  - Revert `key === 'o' && shiftKey` shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Open-folder shortcut parity (`Cmd/Ctrl+O`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open any route.
  2. Press `Cmd+O` (macOS) or `Ctrl+O` (Windows/Linux).
  3. Confirm "Select folder" dialog opens.
  4. Press `Escape` to close the dialog.
- Expected result(s):
  - Shortcut is intercepted by app and opens local folder picker dialog.
  - Folder filter input is focused when dialog opens.
  - Escape closes the dialog.
- Rollback/cleanup notes:
  - Revert non-shift `key === 'o'` shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Archive-thread shortcut parity (`Cmd/Ctrl+Shift+A`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open an existing thread.
  2. Press `Cmd+Shift+A` (macOS) or `Ctrl+Shift+A` (Windows/Linux).
  3. Observe sidebar thread list for removal of archived thread.
- Expected result(s):
  - Shortcut is intercepted by app.
  - Selected thread is archived using the same behavior as sidebar archive action.
  - Archived thread disappears from the active sidebar list.
- Rollback/cleanup notes:
  - Revert `key === 'a' && shiftKey` archive shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Quick-chat shortcut parity (`Cmd/Ctrl+Alt+N`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open any non-home route (for example Skills).
  2. Press `Cmd+Alt+N` (macOS) or `Ctrl+Alt+N` (Windows/Linux).
  3. Confirm app navigates to Home/New thread screen.
- Expected result(s):
  - Shortcut is intercepted by app.
  - It triggers the same Home/New thread navigation as `Cmd/Ctrl+N`.
- Rollback/cleanup notes:
  - Revert `key === 'n' && altKey` shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Sidebar file-search shortcut parity (`Cmd/Ctrl+P`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open app on any route.
  2. Press `Cmd+P` (macOS) or `Ctrl+P` (Windows/Linux).
  3. Confirm sidebar search input opens and receives focus.
  4. Type a marker query.
- Expected result(s):
  - Browser print dialog is suppressed in-app.
  - Sidebar search becomes visible and focused.
  - Typed query is reflected in sidebar search input.
- Rollback/cleanup notes:
  - Revert `key === 'p'` shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Command-surface shortcut parity (`Cmd/Ctrl+Shift+P`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open any non-skills route.
  2. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux).
  3. Confirm app navigates to Skills hub route.
  4. Press shortcut again while already on Skills route.
- Expected result(s):
  - Shortcut is intercepted by app.
  - First press opens Skills hub command surface.
  - Second press on Skills is a no-op (stays on Skills).
- Rollback/cleanup notes:
  - Revert shift-modified `key === 'p'` shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Alternate command-surface shortcut parity (`Cmd/Ctrl+K`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open any non-skills route.
  2. Press `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux).
  3. Confirm app navigates to Skills hub route.
  4. Press shortcut again while already on Skills route.
- Expected result(s):
  - Shortcut is intercepted by app.
  - First press opens Skills hub command surface.
  - Second press on Skills is a no-op (stays on Skills).
- Rollback/cleanup notes:
  - Revert non-shift `key === 'k'` shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Diff-panel shortcut parity fallback (`Cmd/Ctrl+Alt+B`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open an existing thread route.
- Steps:
  1. Press `Cmd+Alt+B` (macOS) or `Ctrl+Alt+B` (Windows/Linux).
  2. Confirm review/diff pane opens.
  3. Press shortcut again.
- Expected result(s):
  - Shortcut is intercepted by app.
  - First press toggles review pane open.
  - Second press toggles review pane closed.
  - Shortcut is no-op outside thread routes.
- Rollback/cleanup notes:
  - Revert `key === 'b' && altKey` shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Browser-panel shortcut parity fallback (`Cmd/Ctrl+Shift+B`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open app on any route.
  2. Press `Cmd+Shift+B` (macOS) or `Ctrl+Shift+B` (Windows/Linux).
  3. Confirm settings panel opens.
  4. Press shortcut again.
- Expected result(s):
  - Shortcut is intercepted by app.
  - First press opens settings side panel.
  - Second press closes settings side panel.
- Rollback/cleanup notes:
  - Revert `key === 'b' && shiftKey` shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Terminal-toggle shortcut parity fallback (`Cmd/Ctrl+J`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open app on desktop layout.
  2. Press `Cmd+J` (macOS) or `Ctrl+J` (Windows/Linux).
  3. Confirm sidebar visibility toggles.
  4. Press shortcut again.
- Expected result(s):
  - Shortcut is intercepted by app.
  - First press toggles sidebar collapsed state.
  - Second press restores previous sidebar visibility.
- Rollback/cleanup notes:
  - Revert `key === 'j'` shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: New-window shortcut parity fallback (`Cmd/Ctrl+Shift+N`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open any non-home route.
  2. Press `Cmd+Shift+N` (macOS) or `Ctrl+Shift+N` (Windows/Linux).
  3. Confirm app navigates to Home/New thread screen.
  4. Press shortcut again while already on Home.
- Expected result(s):
  - Shortcut is intercepted by app.
  - It triggers the same home/new-thread behavior as `Cmd/Ctrl+N`.
  - Repeated invocation on Home keeps Home active.
- Rollback/cleanup notes:
  - Revert `key === 'n' && shiftKey` shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Thread-pin shortcut parity (`Cmd/Ctrl+Alt+P`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Ensure at least one thread exists in the sidebar.
- Steps:
  1. Select a thread row in the sidebar.
  2. Press `Cmd+Alt+P` (macOS) or `Ctrl+Alt+P` (Windows/Linux).
  3. Observe pinned state indicator for the selected thread.
  4. Press shortcut again.
- Expected result(s):
  - Shortcut is intercepted by app.
  - First press toggles selected thread pin state.
  - Second press restores original pin state.
- Rollback/cleanup notes:
  - Revert `key === 'p' && altKey` shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Trace-toggle shortcut parity fallback (`Cmd/Ctrl+Shift+S`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open app on any route.
  2. Press `Cmd+Shift+S` (macOS) or `Ctrl+Shift+S` (Windows/Linux).
  3. Confirm settings panel opens.
  4. Press shortcut again.
- Expected result(s):
  - Shortcut is intercepted by app.
  - First press toggles settings panel open.
  - Second press toggles settings panel closed.
- Rollback/cleanup notes:
  - Revert `key === 's' && shiftKey` shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Deeplink-copy shortcut parity (`Cmd/Ctrl+Alt+L`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open any route (for example `#/skills`).
  2. Press `Cmd+Alt+L` (macOS) or `Ctrl+Alt+L` (Windows/Linux).
  3. Read clipboard text.
- Expected result(s):
  - Shortcut is intercepted by app.
  - Clipboard contains current app deeplink URL.
- Rollback/cleanup notes:
  - Revert `key === 'l' && altKey` shortcut branch and `copyCurrentDeeplink` helper in `src/App.vue`.

### Feature: Session-id copy shortcut parity fallback (`Cmd/Ctrl+Alt+C`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open `#/skills`.
  2. Press `Cmd+Alt+C` (macOS) or `Ctrl+Alt+C` (Windows/Linux).
  3. Read clipboard text.
- Expected result(s):
  - Shortcut is intercepted by app.
  - Clipboard contains current session identifier fallback (`skills` on Skills route, thread id on thread route).
- Rollback/cleanup notes:
  - Revert `key === 'c' && altKey` shortcut branch and `copySessionIdentifier` helper in `src/App.vue`.

### Feature: Working-directory copy shortcut parity fallback (`Cmd/Ctrl+Shift+C`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open `#/skills`.
  2. Press `Cmd+Shift+C` (macOS) or `Ctrl+Shift+C` (Windows/Linux).
  3. Read clipboard text.
- Expected result(s):
  - Shortcut is intercepted by app.
  - Clipboard contains active cwd when available; otherwise current route-name fallback (`skills` on Skills route).
- Rollback/cleanup notes:
  - Revert `key === 'c' && shiftKey` shortcut branch and `copyWorkingDirectoryIdentifier` helper in `src/App.vue`.

### Feature: Conversation-path copy shortcut parity fallback (`Cmd/Ctrl+Alt+Shift+C`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open `#/skills`.
  2. Press `Cmd+Alt+Shift+C` (macOS) or `Ctrl+Alt+Shift+C` (Windows/Linux).
  3. Read clipboard text.
- Expected result(s):
  - Shortcut is intercepted by app.
  - Clipboard contains current conversation/path context (`/skills` on Skills route, `/thread/<id>` on thread route).
- Rollback/cleanup notes:
  - Revert `key === 'c' && altKey && shiftKey` shortcut branch and `copyConversationPath` helper in `src/App.vue`.

### Feature: Conversation-path copy shortcut parity alias (`Cmd/Ctrl+Alt+S`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Ensure at least one thread exists in sidebar.
- Steps:
  1. Open a thread route.
  2. Press `Cmd+Alt+S` (macOS) or `Ctrl+Alt+S` (Windows/Linux).
  3. Read clipboard content.
- Expected result(s):
  - Clipboard contains current conversation route path (example: `/thread/<id>`).
  - Existing fallback combo `Cmd/Ctrl+Alt+Shift+C` remains functional.
- Rollback/cleanup notes:
  - Revert `key === 's' && altKey` conversation-path shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Direct thread-slot shortcuts parity (`Cmd/Ctrl+1..9`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Ensure at least two threads exist.
- Steps:
  1. Press `Cmd/Ctrl+2`.
  2. Confirm the second thread in sidebar order becomes active.
  3. Press `Cmd/Ctrl+1`.
  4. Confirm the first thread becomes active.
- Expected result(s):
  - Shortcuts are intercepted by app.
  - Number keys jump to matching 1-based thread slot among visible sidebar order.
  - Out-of-range slots are no-op.
- Rollback/cleanup notes:
  - Revert numeric-key branch in `onWindowKeyDown` and `navigateThreadByNumber` in `src/App.vue`.

### Feature: File-tree panel shortcut parity fallback (`Cmd/Ctrl+Shift+E`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Open app on desktop layout.
  2. Press `Cmd+Shift+E` (macOS) or `Ctrl+Shift+E` (Windows/Linux).
  3. Confirm sidebar visibility toggles.
  4. Press the shortcut again.
- Expected result(s):
  - Shortcut is intercepted by app.
  - First press toggles sidebar collapsed state.
  - Second press restores previous sidebar visibility.
- Rollback/cleanup notes:
  - Revert `key === 'e' && shiftKey` shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: File-tree panel shortcut parity alias (`Cmd/Ctrl+Shift+I`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Steps:
  1. Confirm sidebar is visible.
  2. Press `Cmd+Shift+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux).
  3. Confirm sidebar collapses.
  4. Press shortcut again.
- Expected result(s):
  - First press collapses sidebar.
  - Second press restores sidebar.
  - Existing `Cmd/Ctrl+Shift+E` fallback remains functional.
- Rollback/cleanup notes:
  - Revert `key === 'i' && shiftKey` shortcut branch in `onWindowKeyDown` in `src/App.vue`.

### Feature: Composer model shortcut parity (`Cmd/Ctrl+Shift+M`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open any thread route.
- Steps:
  1. Focus the thread page with composer visible.
  2. Press `Cmd+Shift+M` (macOS) or `Ctrl+Shift+M` (Windows/Linux).
  3. Confirm composer model dropdown opens.
  4. Press the shortcut again.
- Expected result(s):
  - First press opens model dropdown.
  - Second press keeps dropdown open and focuses model picker controls.
  - Shortcut does not collapse sidebar.
- Rollback/cleanup notes:
  - Revert `key === 'm' && shiftKey` composer model shortcut branch and `openComposerModelDropdownViaShortcut` helper in `src/App.vue`.

### Feature: Composer model shortcut thread-view parity (`Cmd/Ctrl+Shift+M`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open any thread route.
- Steps:
  1. Focus a non-composer element in thread view (for example header area).
  2. Trigger `Cmd/Ctrl+Shift+M`.
  3. Inspect composer model dropdown visibility.
- Expected result(s):
  - Shortcut still opens model dropdown while thread view is focused.
- Rollback/cleanup notes:
  - Revert thread-route shortcut branches for `key === 't'` and `key === 'm'` in `src/App.vue`.

### Feature: Rename-thread shortcut parity fallback (`Command+Control+R`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open any thread route with an existing thread.
- Steps:
  1. Press `Command+Control+R` on macOS.
  2. Enter a new thread title in the rename dialog and confirm.
  3. Verify sidebar/header title updates.
- Expected result(s):
  - Shortcut is intercepted by app.
  - Rename dialog opens with current thread title prefilled.
  - Rename dialog accessibility label is `Rename thread`.
  - Confirming a non-empty new title invokes thread rename and updates visible thread title.
  - If sidebar is collapsed, shortcut expands sidebar and opens the same rename dialog flow.
- Rollback/cleanup notes:
  - Revert `metaKey && ctrlKey && key === 'r'` shortcut branch, sidebar-tree exposed rename opener, and shortcut rename helper wiring in `src/App.vue` / `src/components/sidebar/SidebarThreadTree.vue`.

### Feature: Dictation shortcut parity fallback (`Ctrl+M`)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open an existing thread route where composer mic button is visible.
- Steps:
  1. Press `Ctrl+M`.
  2. Observe dictation mic control behavior.
- Expected result(s):
  - Shortcut is intercepted by app on thread routes.
  - Existing composer dictation control (`.thread-composer-mic`) is triggered.
  - If microphone permissions are unavailable, existing dictation error handling is shown by composer.
- Rollback/cleanup notes:
  - Revert `code === 'KeyM' && ctrlKey` shortcut branch and `toggleComposerDictationViaButton` helper in `src/App.vue`.

### Feature: Composer inline quota/context status visibility parity

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open an active thread.
- Steps:
  1. Observe composer footer area below control row.
  2. If quota data is available, confirm quota summary text is visible inline.
  3. If context usage data is available, confirm context summary and progress bar are visible inline.
  4. Hover each segment and verify tooltip content appears.
- Expected result(s):
  - Status text is visible in the composer surface (not tooltip-only).
  - Quota summary and context usage can render together on one row.
  - Context usage bar width reflects remaining context percent.
- Rollback/cleanup notes:
  - Revert inline status row markup in `src/components/content/ThreadComposer.vue`.

### Feature: Locale-aware compact weekly refresh dates in quota summaries

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Ensure quota snapshot data is available.
- Steps:
  1. Open any active thread and inspect composer inline quota summary.
  2. Open settings account list and inspect account quota summary text.
  3. Confirm compact refresh segment uses localized month/day formatting (for example `Apr 28` in English locales).
- Expected result(s):
  - Compact weekly refresh date is date-only and locale-aware.
  - No hardcoded `X月Y日` formatting appears in non-CJK locales.
- Rollback/cleanup notes:
  - Revert `formatResetDateCompact` in `src/components/content/ThreadComposer.vue` and `src/App.vue`.

### Feature: Sidebar thread menu boundary-aware direction/placement parity

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Ensure sidebar has enough threads to scroll.
- Steps:
  1. Scroll thread list near the bottom of the sidebar.
  2. Open the context menu for a near-bottom thread row (right-click).
  3. Observe menu open direction and panel bounds.
- Expected result(s):
  - Menu opens upward (`data-open-direction="up"`) when there is insufficient room below.
  - Menu panel stays within the nearest clipping/scroll container bounds.
  - Menu does not get placed off-screen while still respecting viewport limits.
- Rollback/cleanup notes:
  - Revert `updateOpenThreadMenuPlacement` boundary clamping changes in `src/components/sidebar/SidebarThreadTree.vue`.

### Feature: Detached HEAD branch trigger labeling parity

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open an existing thread route where no branch name is available.
- Steps:
  1. Observe header branch dropdown trigger text.
  2. Open dropdown and inspect options.
- Expected result(s):
  - Trigger explicitly shows `Detached HEAD` (not empty/placeholder) when current branch is missing.
  - Dropdown includes `Detached HEAD` option and trigger label matches it.
- Rollback/cleanup notes:
  - Revert `contentHeaderBranchDropdownValue` normalization and trimmed comparison in `src/App.vue`.

### Feature: Detached HEAD normalization on branch-state load

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open a thread in a detached-head workspace state.
- Steps:
  1. Open the thread so branch state is loaded from RPC.
  2. Open the header branch dropdown trigger.
  3. Confirm label/value behavior when server branch is empty or null.
- Expected result(s):
  - Empty/blank branch names from branch-state reads are normalized to detached-head state.
  - Trigger continues to show `Detached HEAD` consistently after branch-state refreshes.
- Rollback/cleanup notes:
  - Revert `loadThreadBranches` branch normalization in `src/App.vue`.

### Feature: Composer placeholder copy parity (`@` files, `/` commands)

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open an active thread route.
- Steps:
  1. Inspect composer textarea placeholder text.
- Expected result(s):
  - Placeholder reads exactly: `Ask Codex anything, @ to add files, / for commands`.
- Rollback/cleanup notes:
  - Revert `placeholderText` active-thread copy in `src/components/content/ThreadComposer.vue`.

### Feature: Thread rename realtime notification alias compatibility

- Prerequisites/setup:
  - Build app and inspect realtime rename handler implementation.
- Steps:
  1. Verify `thread/name/updated` handler reads both `threadName` and `name` fields from notification params.
  2. Confirm build/typecheck passes.
- Expected result(s):
  - Rename notifications using either payload field (`threadName` or `name`) update thread title state.
- Rollback/cleanup notes:
  - Revert thread rename notification alias support in `src/composables/useDesktopState.ts`.

### Feature: Settings workspace-identity label hardening

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 4173`.
  - Open Settings account list (when accounts are available).
- Steps:
  1. Inspect each `Workspace ...` ID line in account cards.
  2. Hover workspace ID line.
- Expected result(s):
  - Workspace ID line remains a dedicated label line prefixed by `Workspace ID`.
  - Displayed short id uses up to last 12 characters for better differentiation.
  - Tooltip shows full workspace/account id (`Workspace ID: <full-id>`).
  - Workspace identity chip wraps long values (`break-all`) instead of clipping in narrow panels.
  - Account meta line uses wrap-safe text (not forced truncation) in narrow panel layouts.
- Rollback/cleanup notes:
  - Revert workspace-id label/title and `shortAccountId` length update in `src/App.vue`.

### Feature: Browser-panel shortcut fallback (`Cmd/Ctrl+Shift+B`) toggles review pane on thread routes

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Ensure at least one thread exists in sidebar.
- Steps:
  1. Open any thread from the sidebar.
  2. Press `Cmd+Shift+B` (macOS) or `Ctrl+Shift+B` (Windows/Linux).
  3. Press the same shortcut again.
- Expected result(s):
  - First press opens review pane (`.review-pane`) and header branch dropdown gains `is-review-open` class.
  - Second press closes review pane.
  - Settings panel is not toggled by this shortcut.
- Rollback/cleanup notes:
  - Revert `Cmd/Ctrl+Shift+B` key handler branch in `src/App.vue`.

### Feature: Browser-panel shortcut fallback (`Cmd/Ctrl+Shift+B`) toggles sidebar on non-thread routes

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Open the Home route (not inside a thread).
- Steps:
  1. Confirm sidebar is visible.
  2. Press `Cmd+Shift+B` (macOS) or `Ctrl+Shift+B` (Windows/Linux).
  3. Press the same shortcut again.
- Expected result(s):
  - First press collapses sidebar UI on Home route.
  - Second press restores sidebar UI.
  - Shortcut does not no-op outside thread routes.
- Rollback/cleanup notes:
  - Revert non-thread fallback branch under the `Cmd/Ctrl+Shift+B` handler in `src/App.vue`.

### Feature: Composer model shortcuts target enabled dropdown trigger

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Open a thread route.
- Steps:
  1. Ensure at least one `.thread-composer-control .composer-dropdown-trigger` is disabled (for example a placeholder control) and another is enabled.
  2. Press `Cmd+T` (macOS) or `Ctrl+T` (Windows/Linux).
  3. Press `Cmd+Shift+M` (macOS) or `Ctrl+Shift+M` (Windows/Linux).
- Expected result(s):
  - Model dropdown opens/focuses from shortcuts even when the first trigger element is disabled.
  - Shortcut handling does not silently no-op by targeting a disabled trigger.
- Rollback/cleanup notes:
  - Revert enabled-trigger fallback selection logic in `openComposerModelDropdownViaShortcut` (`src/App.vue`).

### Feature: Search shortcuts expand collapsed sidebar before focusing search input

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Open Home route.
- Steps:
  1. Collapse sidebar (`Cmd/Ctrl+J`).
  2. Press `Cmd+P` (macOS) or `Ctrl+P` (Windows/Linux). Repeat with `Cmd/Ctrl+G`.
- Expected result(s):
  - Sidebar expands automatically when search shortcut is pressed while collapsed.
  - Sidebar search input appears and receives focus.
  - Focus remains on sidebar search input immediately after expansion (no transient focus loss).
  - Existing search query text is selected on focus so typing replaces the full query immediately.
  - Shortcut does not silently fail due to hidden search input.
- Rollback/cleanup notes:
  - Revert collapsed-sidebar expansion guard in `Cmd/Ctrl+P` and `Cmd/Ctrl+G` key branches in `src/App.vue`.

### Feature: Trace fallback shortcut (`Cmd/Ctrl+Shift+S`) opens Settings deterministically

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Open Home route.
- Steps:
  1. Collapse sidebar (`Cmd/Ctrl+J`).
  2. Press `Cmd+Shift+S` (macOS) or `Ctrl+Shift+S` (Windows/Linux).
  3. Press the same shortcut again.
- Expected result(s):
  - First press expands sidebar and opens Settings panel.
  - Second press keeps Settings panel open (does not toggle closed).
  - Shortcut consistently lands on configuration surface from any sidebar state.
- Rollback/cleanup notes:
  - Revert `openSettingsPanelViaShortcut` usage in `Cmd/Ctrl+Shift+S` key branch in `src/App.vue`.

### Feature: Settings shortcut (`Cmd/Ctrl+,`) opens Settings deterministically

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Open Home route.
- Steps:
  1. Collapse sidebar (`Cmd/Ctrl+J`).
  2. Press `Cmd+,` (macOS) or `Ctrl+,` (Windows/Linux).
  3. Press the same shortcut again.
- Expected result(s):
  - First press expands sidebar and opens Settings panel.
  - Second press keeps Settings panel open (no close-toggle side effect).
  - Shortcut reliably lands on Settings regardless of sidebar collapsed state.
- Rollback/cleanup notes:
  - Revert `openSettingsPanelViaShortcut` usage in `Cmd/Ctrl+,` key branch in `src/App.vue`.

### Feature: Command-surface shortcut (`Cmd/Ctrl+K`) opens Skills from collapsed sidebar

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Open Home route.
- Steps:
  1. Collapse sidebar (`Cmd/Ctrl+J`).
  2. Press `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux).
- Expected result(s):
  - Route switches to `#/skills`.
  - Sidebar expands so Skills page controls are immediately visible.
  - Shortcut does not no-op when sidebar is collapsed.
- Rollback/cleanup notes:
  - Revert `openSkillsHubViaShortcut` usage in `Cmd/Ctrl+K` / `Cmd/Ctrl+Shift+P` branches in `src/App.vue`.

### Feature: Command-surface shortcut (`Cmd/Ctrl+Shift+P`) opens Skills from collapsed sidebar

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Open Home route.
- Steps:
  1. Collapse sidebar (`Cmd/Ctrl+J`).
  2. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux).
- Expected result(s):
  - Route switches to `#/skills`.
  - Sidebar expands so Skills page controls are immediately visible.
  - Behavior matches `Cmd/Ctrl+K` path (no shortcut drift).
- Rollback/cleanup notes:
  - Revert `openSkillsHubViaShortcut` usage in the `Cmd/Ctrl+Shift+P` branch in `src/App.vue`.

### Feature: Sidebar toggle shortcuts ignore active text-input focus

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Open Home route.
- Steps:
  1. Press `Cmd/Ctrl+G` to focus sidebar search input.
  2. Type any query (for example `typing`).
  3. While input remains focused, press `Cmd/Ctrl+J`.
  4. While input remains focused, press `Cmd/Ctrl+B`.
  5. Blur the input and press `Cmd/Ctrl+J` again.
- Expected result(s):
  - Steps 3-4 do not collapse sidebar while typing in the focused input.
  - Step 5 still toggles sidebar after focus leaves editable field.
- Steps:
  6. Refocus sidebar search input.
  7. Press `Cmd/Ctrl+Shift+E`, `Cmd/Ctrl+Shift+I`, and `Cmd/Ctrl+Shift+B`.
  8. Press `Cmd/Ctrl+Alt+B`.
- Expected result(s):
  - Step 7 does not toggle/collapse sidebar while typing in focused input for alias-based panel shortcuts either.
  - Step 8 does not toggle review-panel shortcut state while typing in focused input.
- Rollback/cleanup notes:
  - Revert editable-target guards in `Cmd/Ctrl+J`, `Cmd/Ctrl+B`, `Cmd/Ctrl+Shift+E`, `Cmd/Ctrl+Shift+I`, `Cmd/Ctrl+Shift+B`, and `Cmd/Ctrl+Alt+B` branches in `src/App.vue`.

### Feature: Pin shortcut (`Cmd/Ctrl+Alt+P`) ignores active text-input focus

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Ensure sidebar search input can be focused.
- Steps:
  1. Focus sidebar search input and type any query.
  2. Press `Cmd/Ctrl+Alt+P` while the input remains focused.
- Expected result(s):
  - Pin toggle shortcut does not execute while typing in focused input.
  - Input focus/typing flow remains uninterrupted.
- Rollback/cleanup notes:
  - Revert editable-target guard in the `Cmd/Ctrl+Alt+P` shortcut branch in `src/App.vue`.

### Feature: Archive shortcut (`Cmd/Ctrl+Shift+A`) ignores active text-input focus

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Ensure a thread is selected and sidebar search input can be focused.
- Steps:
  1. Focus sidebar search input and type any query.
  2. Press `Cmd/Ctrl+Shift+A` while input remains focused.
- Expected result(s):
  - Archive shortcut does not execute while typing in focused input.
  - No accidental archive action occurs from typing context.
- Rollback/cleanup notes:
  - Revert editable-target guard in the `Cmd/Ctrl+Shift+A` shortcut branch in `src/App.vue`.

### Feature: Navigation/thread-cycle shortcuts ignore active text-input focus

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Open any thread route and focus sidebar search input.
- Steps:
  1. With input focused, press `Cmd/Ctrl+[`, `Cmd/Ctrl+]`, `Cmd/Ctrl+Shift+[`, `Cmd/Ctrl+Shift+]`.
  2. With input focused, press `Cmd/Ctrl+1` (or another numeric slot).
- Expected result(s):
  - Route/thread context remains unchanged while typing.
  - Navigation/cycle shortcuts only act when focus leaves editable input.
- Rollback/cleanup notes:
  - Revert editable-target guards in bracket and numeric navigation shortcut branches in `src/App.vue`.

### Feature: Command/settings shortcuts ignore active text-input focus

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Focus sidebar search input.
- Steps:
  1. While input is focused, press `Cmd/Ctrl+K` and `Cmd/Ctrl+Shift+P`.
  2. While input is focused, press `Cmd/Ctrl+,` and `Cmd/Ctrl+Shift+S`.
- Expected result(s):
  - No route jump to Skills and no Settings panel open while typing.
  - Normal shortcut behavior still works after focus leaves editable input.
- Rollback/cleanup notes:
  - Revert editable-target guards in `Cmd/Ctrl+K`, `Cmd/Ctrl+Shift+P`, `Cmd/Ctrl+,`, and `Cmd/Ctrl+Shift+S` branches in `src/App.vue`.

### Feature: Dictation shortcut (`Ctrl+M`) ignores active text-input focus

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Open thread route and focus sidebar search input.
- Steps:
  1. While input remains focused, press `Ctrl+M`.
- Expected result(s):
  - Shortcut event is not intercepted/prevented by app-level dictation handler while typing in input.
  - Input focus remains intact and typing flow is uninterrupted.
- Rollback/cleanup notes:
  - Revert editable-target guard in `Ctrl+M` shortcut branch in `src/App.vue`.

### Feature: New-thread/open-folder shortcuts ignore active text-input focus

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Open thread route and focus sidebar search input.
- Steps:
  1. While input is focused, press `Cmd/Ctrl+N`, `Cmd/Ctrl+Shift+N`, `Cmd/Ctrl+Alt+N`.
  2. While input is focused, press `Cmd/Ctrl+O` and `Cmd/Ctrl+Shift+O`.
- Expected result(s):
  - Route does not jump away from current thread while typing.
  - New thread/home/open-folder shortcuts only execute after focus leaves editable input.
- Rollback/cleanup notes:
  - Revert editable-target guards in new-thread/open-folder shortcut branches in `src/App.vue`.

### Feature: Thread `R` shortcuts ignore active text-input focus

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Open thread route and focus sidebar search input.
- Steps:
  1. While input is focused, press `Cmd/Ctrl+Shift+R`.
  2. While input is focused, press `Cmd+Ctrl+R`.
- Expected result(s):
  - Review pane does not open/toggle from step 1 while typing.
  - Rename action is not intercepted/executed from step 2 while typing.
  - Input focus remains intact.
- Rollback/cleanup notes:
  - Revert editable-target guards in thread `R` shortcut branches in `src/App.vue`.

### Feature: Copy shortcuts ignore active text-input focus

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Focus sidebar search input.
- Steps:
  1. While input is focused, press:
     - `Cmd/Ctrl+Alt+L`
     - `Cmd/Ctrl+Alt+Shift+C`
     - `Cmd/Ctrl+Alt+S`
     - `Cmd/Ctrl+Shift+C`
     - `Cmd/Ctrl+Alt+C`
- Expected result(s):
  - Shortcut events are not intercepted/prevented by app-level copy handlers while typing.
  - Input focus remains intact and typing flow is uninterrupted.
- Rollback/cleanup notes:
  - Revert editable-target guards in copy shortcut branches in `src/App.vue`.

### Feature: Model shortcuts ignore active text-input focus

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Open thread route and focus sidebar search input.
- Steps:
  1. While input is focused, press `Cmd/Ctrl+T`.
  2. While input is focused, press `Cmd/Ctrl+Shift+M`.
- Expected result(s):
  - Composer model dropdown does not open while typing.
  - Shortcut events are not intercepted/prevented by app-level model handlers while input is focused.
  - Model shortcuts still work when focus leaves editable input.
- Rollback/cleanup notes:
  - Revert editable-target guards in model shortcut branches in `src/App.vue`.

### Feature: Search shortcuts ignore active text-input focus

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Focus sidebar search input with an existing query.
- Steps:
  1. While input is focused, press `Cmd/Ctrl+G`.
  2. While input is focused, press `Cmd/Ctrl+P`.
- Expected result(s):
  - Shortcut events are not intercepted/prevented by app-level search handlers while typing.
  - Input focus and existing query text remain unchanged.
  - Search shortcut still works from collapsed sidebar when not focused in editable input.
- Rollback/cleanup notes:
  - Revert editable-target guards in `Cmd/Ctrl+G` and `Cmd/Ctrl+P` branches in `src/App.vue`.

### Feature: Editable-target guard includes generic contenteditable surfaces

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
- Steps:
  1. Place focus inside an element with `[contenteditable]` (except `contenteditable=\"false\"`).
  2. Trigger representative guarded shortcuts (for example `Cmd/Ctrl+K`, `Cmd/Ctrl+T`).
  3. Place focus inside a Settings `select` control (for example Provider dropdown) and trigger the same shortcuts.
- Expected result(s):
  - Guarded shortcuts are ignored while contenteditable focus is active.
  - No route/panel/model shortcut side effects occur from typing in contenteditable editors.
  - Guarded shortcuts are also ignored while native `select` controls are focused.
  - Guarded shortcuts are also ignored while controls using `role=\"combobox\"` are focused.
  - Guarded shortcuts are also ignored while controls using `role=\"searchbox\"` are focused.
- Rollback/cleanup notes:
  - Revert contenteditable selector broadening in `isEditableShortcutTarget` in `src/App.vue`.

### Feature: Thread-find shortcut ignores active text-input focus

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Open thread route and focus sidebar search input.
- Steps:
  1. While input is focused, press `Cmd/Ctrl+F`.
- Expected result(s):
  - Shortcut event is not intercepted/prevented by app-level thread-find handler while typing.
  - Focus stays on current input and does not jump to `.thread-find-input`.
  - `Cmd/Ctrl+F` still focuses thread-find input when no editable input is focused.
- Rollback/cleanup notes:
  - Revert editable-target guard in `Cmd/Ctrl+F` thread-find branch in `src/App.vue`.

### Feature: Escape panel-close handling ignores active editable focus

- Prerequisites/setup:
  - Start app with `pnpm run dev -- --host 0.0.0.0 --port 5173`.
  - Open Settings panel and focus an editable control (for example provider select).
- Steps:
  1. While control remains focused, press `Escape`.
- Expected result(s):
  - Settings panel remains open while editable control is focused.
  - Escape panel-close behavior still works when focus leaves editable controls.
- Rollback/cleanup notes:
  - Revert editable-target guard in global `Escape` handling branches in `src/App.vue`.

### Fix: Editable Shortcut Guard Includes `role="spinbutton"`

- Prerequisites/Setup:
  - Start the app with `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure Settings can be opened from the header.
- Steps:
  1. Open `http://127.0.0.1:5173`.
  2. Open Settings and focus a numeric spinbutton field (or inject a temporary `role="spinbutton"` input in test harness).
  3. While spinbutton remains focused, press `Cmd/Ctrl+K`, `Cmd/Ctrl+T`, and `Cmd/Ctrl+J`.
  4. Verify focus remains on the spinbutton and route/sidebar state does not change.
  5. Run `node output/playwright/shortcuts-ignore-spinbutton-focus-assert.cjs`.
- Expected Results:
  - Guarded shortcuts are ignored while `role="spinbutton"` is focused.
  - Focus remains on spinbutton; no Skills navigation and no sidebar toggle occurs.
  - Assertion script reports `guarded: true`.
- Rollback/Cleanup:
  - Remove `role="spinbutton"` from `isEditableShortcutTarget` selector if this guard is intentionally reverted.

### Fix: `Cmd/Ctrl+Shift+B` Requires Active Thread For Review Toggle

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open a thread route and press `Cmd/Ctrl+Shift+B` twice.
  2. Confirm review pane opens then closes.
  3. Navigate to Home route (`#/`) and press `Cmd/Ctrl+Shift+B` twice.
  4. Confirm sidebar toggles collapsed/expanded.
  5. Run:
     - `node output/playwright/review-shortcut-shift-b-toggle-assert.cjs`
     - `node output/playwright/review-shortcut-shift-b-home-sidebar-toggle-assert.cjs`
- Expected Results:
  - Thread route: shortcut toggles review pane only when an active thread exists.
  - Home route: shortcut toggles sidebar visibility.
  - Both assertion scripts report success.
- Rollback/Cleanup:
  - Revert `Cmd/Ctrl+Shift+B` conditional in `onWindowKeyDown` if fallback behavior is intentionally changed.

### Fix: `Cmd/Ctrl+Alt+B` Requires Active Thread Context

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open a thread and press `Cmd/Ctrl+Alt+B` twice.
  2. Confirm review pane opens then closes.
  3. Focus a text input and press `Cmd/Ctrl+Alt+B`.
  4. Run:
     - `node output/playwright/review-alt-b-toggle-assert.cjs`
     - `node output/playwright/review-alt-b-ignore-input-focus-assert.cjs`
- Expected Results:
  - Review pane toggles only with active thread context.
  - While typing in focused inputs, shortcut is ignored.
  - Both assertion scripts report success.
- Rollback/Cleanup:
  - Revert the `selectedThreadId` gate in `onWindowKeyDown` if Alt+B behavior is intentionally broadened.

### Fix: `Cmd+Ctrl+R` Rename Shortcut Is Thread-Route Scoped

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open a thread route and trigger `Cmd+Ctrl+R`.
  2. Verify rename dialog appears.
  3. Navigate to Home (`#/`) and trigger `Cmd+Ctrl+R` again.
  4. Verify no rename dialog appears and route stays home.
  5. Run:
     - `node output/playwright/rename-shortcut-cmd-ctrl-r-thread-opens-assert.cjs`
     - `node output/playwright/rename-shortcut-cmd-ctrl-r-home-ignored-assert.cjs`
- Expected Results:
  - Thread route: rename dialog opens.
  - Home route: shortcut is ignored.
  - Both assertion scripts pass.
- Rollback/Cleanup:
  - Revert `route.name === 'thread'` gate in the `Cmd+Ctrl+R` handler if global rename behavior is intentionally reintroduced.

### Fix: `Cmd/Ctrl+Shift+A` Archive Shortcut Is Thread-Route Scoped

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Navigate to Home (`#/`).
  2. Press `Cmd/Ctrl+Shift+A`.
  3. Verify route remains `#/` and no archive action is triggered.
  4. Run `node output/playwright/archive-shortcut-shift-a-home-ignored-assert.cjs`.
- Expected Results:
  - Archive shortcut is ignored on Home/non-thread routes.
  - Assertion script reports `ignoredOnHome: true`.
- Rollback/Cleanup:
  - Revert `route.name === 'thread'` gate in archive shortcut handler if global archive behavior is intentionally required.

### Fix: Pin Shortcut Uses Active Thread Only (No First-Row Fallback)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Inspect `toggleSelectedThreadPin()` implementation.
  2. Verify it queries only `.thread-row[data-active="true"]` and does not fallback to `.thread-row`.
  3. Run:
     - `node -e "const fs=require('fs');const s=fs.readFileSync('src/App.vue','utf8');const ok=!s.includes('?? document.querySelector<HTMLElement>(\\'.thread-row\\')')&&s.includes('document.querySelector<HTMLElement>(\\'.thread-row[data-active=\\\"true\\\"]\\')');console.log(JSON.stringify({pinFallbackRemoved:ok})); if(!ok) process.exit(1);"`
- Expected Results:
  - Pin shortcut targets active thread row only.
  - Source assertion reports `{\"pinFallbackRemoved\":true}`.
- Rollback/Cleanup:
  - Reintroduce `.thread-row` fallback only if product behavior intentionally allows pinning first visible row without active selection.

### Fix: `Cmd/Ctrl+Alt+P` Pin Shortcut Is Thread-Route Scoped

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Navigate to Home (`#/`).
  2. Press `Cmd/Ctrl+Alt+P`.
  3. Verify route remains `#/` and no pin action is consumed.
  4. Run:
     - `node output/playwright/pin-shortcut-alt-p-home-ignored-assert.cjs`
     - `node -e "const fs=require('fs');const s=fs.readFileSync('src/App.vue','utf8');const ok=/event\\.code === 'KeyP'[\\s\\S]*route\\.name === 'thread'[\\s\\S]*selectedThreadId\\.value/.test(s);console.log(JSON.stringify({pinShortcutThreadScoped:ok})); if(!ok) process.exit(1);"`
- Expected Results:
  - Pin shortcut is ignored on non-thread routes.
  - Runtime assertion reports `ignoredOnHome: true`.
  - Source assertion reports `{\"pinShortcutThreadScoped\":true}`.
- Rollback/Cleanup:
  - Revert thread-route gate for `KeyP` shortcut if global pin behavior is intentionally restored.

### Fix: Model Shortcuts Require Active Thread Selection (`Cmd/Ctrl+T`, `Cmd/Ctrl+Shift+M`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open a thread and press `Cmd/Ctrl+T`.
  2. Verify composer model control opens/focuses.
  3. Focus a text input and press `Cmd/Ctrl+T` and `Cmd/Ctrl+Shift+M`.
  4. Verify typing focus is preserved (shortcuts ignored while editing).
  5. Run:
     - `node output/playwright/model-shortcut-ctrl-t-thread-opens-assert.cjs`
     - `node output/playwright/model-shortcuts-ignore-input-focus-assert.cjs`
     - `node -e "const fs=require('fs');const s=fs.readFileSync('src/App.vue','utf8');const t=/event\\.key === 't'[\\s\\S]*route\\.name === 'thread'[\\s\\S]*selectedThreadId\\.value/.test(s);const m=/event\\.key === 'm'[\\s\\S]*event\\.shiftKey[\\s\\S]*route\\.name === 'thread'[\\s\\S]*selectedThreadId\\.value/.test(s);const ok=t&&m;console.log(JSON.stringify({modelShortcutsThreadSelectionScoped:ok})); if(!ok) process.exit(1);"`
- Expected Results:
  - `Cmd/Ctrl+T` opens model controls on active thread route.
  - While typing in inputs, model shortcuts are ignored.
  - Source assertion reports `{\"modelShortcutsThreadSelectionScoped\":true}`.
- Rollback/Cleanup:
  - Revert `selectedThreadId` gates on model shortcuts if no-selection model control behavior is intentionally required.

### Fix: `Cmd/Ctrl+F` Selects Existing Thread-Find Query

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open any thread.
  2. Enter a query in thread-find input (for example `marker-query`).
  3. Press `Cmd/Ctrl+F`.
  4. Verify thread-find input remains focused and the full query text is selected.
  5. Run:
     - `node output/playwright/thread-find-shortcut-selects-query-assert.cjs`
     - `node output/playwright/thread-find-shortcut-focuses-assert.cjs`
- Expected Results:
  - Existing query is fully selected (`selectionStart=0`, `selectionEnd=query.length`).
  - Focus remains on thread-find input.
  - Both assertion scripts pass.
- Rollback/Cleanup:
  - Revert `focusThreadFindInput()` usage in `Cmd/Ctrl+F` handler if selection-on-focus behavior is intentionally removed.

### Fix: Dictation Shortcut (`Ctrl+M`) Ignores Terminal-Like Focus

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open a thread route.
  2. Focus a terminal-like element (`[data-codex-terminal]` / `.xterm` equivalent).
  3. Press `Ctrl+M`.
  4. Verify shortcut is ignored (no dictation toggle side effects) and terminal focus remains.
  5. Run:
     - `node output/playwright/dictation-shortcut-ignore-terminal-focus-assert.cjs`
     - `node output/playwright/dictation-shortcut-ignore-input-focus-assert.cjs`
- Expected Results:
  - Dictation shortcut is ignored while terminal-like focus is active.
  - Existing editable-input guard behavior still passes.
- Rollback/Cleanup:
  - Revert `!isTerminalLikeFocused()` gate in `Ctrl+M` handler if terminal contexts should intentionally allow dictation hotkey interception.

### Fix: Thread `R` Shortcuts Ignore Terminal-Like Focus

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open a thread route.
  2. Focus terminal-like surface (`[data-codex-terminal]` / `.xterm` equivalent).
  3. Trigger `Cmd+Ctrl+R` and `Cmd/Ctrl+Shift+R`.
  4. Verify rename dialog and review pane states are unchanged.
  5. Run:
     - `node output/playwright/thread-r-shortcuts-ignore-terminal-focus-assert.cjs`
     - `node output/playwright/rename-shortcut-cmd-ctrl-r-thread-opens-assert.cjs`
     - `node output/playwright/review-shortcut-shift-b-toggle-assert.cjs`
- Expected Results:
  - Under terminal focus, both `R` shortcuts are ignored.
  - Outside terminal focus, rename and review shortcuts still work as expected.
- Rollback/Cleanup:
  - Revert `!isTerminalLikeFocused()` guards on `R` shortcut handlers if terminal contexts should intentionally permit shortcut interception.

### Fix: Global `Escape` Panel-Close Ignores Terminal-Like Focus

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open Settings panel.
  2. Focus terminal-like element (`[data-codex-terminal]` / `.xterm` equivalent).
  3. Press `Escape` and verify Settings remains open.
  4. Open thread review pane.
  5. Focus terminal-like element again and press `Escape`.
  6. Verify review pane remains open.
  7. Run:
     - `node output/playwright/escape-ignore-terminal-focus-panels-assert.cjs`
     - `node output/playwright/escape-ignore-input-focus-settings-assert.cjs`
- Expected Results:
  - `Escape` is ignored for settings/review close while terminal-like focus is active.
  - Existing editable-input escape guard remains intact.
- Rollback/Cleanup:
  - Revert `!isTerminalLikeFocused()` in global `Escape` handlers if terminal surfaces should intentionally allow panel-close behavior.

### Fix: Command Surface Shortcuts Ignore Terminal-Like Focus (`Cmd/Ctrl+K`, `Cmd/Ctrl+Shift+P`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Focus terminal-like element (`[data-codex-terminal]` / `.xterm` equivalent), including a non-editable focus target.
  2. Trigger `Cmd/Ctrl+K` and `Cmd/Ctrl+Shift+P`.
  3. Verify route/hash does not jump to `#/skills` and terminal focus remains.
  4. Run:
     - `node output/playwright/command-shortcuts-ignore-terminal-focus-assert.cjs`
     - `node output/playwright/skills-shortcut-k-opens-from-collapsed-assert.cjs`
- Expected Results:
  - Under terminal focus, command shortcuts are ignored.
  - Outside terminal focus, `Cmd/Ctrl+K` still opens Skills and expands sidebar when collapsed.
- Verification Note:
  - Terminal-focus assertions should use a non-editable focus probe (`div` with `tabIndex=-1`) inside `[data-codex-terminal]`, not an `input` element.
- Rollback/Cleanup:
  - Revert `!isTerminalLikeFocused()` gates in `K` shortcut handlers if terminal contexts should intentionally allow command-surface accelerator interception.

### Fix: Settings Shortcuts Ignore Terminal-Like Focus (`Cmd/Ctrl+,`, `Cmd/Ctrl+Shift+S`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Focus terminal-like element (`[data-codex-terminal]` / `.xterm` equivalent).
  2. Trigger `Cmd/Ctrl+,` and `Cmd/Ctrl+Shift+S`.
  3. Verify settings panel does not open and route/hash remains unchanged.
  4. Run:
     - `node output/playwright/settings-shortcuts-ignore-terminal-focus-assert.cjs`
     - `node output/playwright/settings-shortcut-comma-opens-from-collapsed-assert.cjs`
     - `node output/playwright/settings-shortcut-shift-s-opens-from-collapsed-assert.cjs`
- Expected Results:
  - Under terminal focus, settings shortcuts are ignored.
  - Outside terminal focus, both shortcuts still open Settings and keep it open on repeated keypress.
- Verification Note:
  - Use non-editable terminal focus probes so the test validates terminal guards, not editable-input guards.
- Rollback/Cleanup:
  - Revert `!isTerminalLikeFocused()` gates in settings shortcut handlers if terminal contexts should intentionally allow settings-accelerator interception.

### Fix: Search Shortcuts Ignore Terminal-Like Focus (`Cmd/Ctrl+G`, `Cmd/Ctrl+P`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Focus terminal-like element (`[data-codex-terminal]` / `.xterm` equivalent).
  2. Trigger `Cmd/Ctrl+G` and `Cmd/Ctrl+P`.
  3. Verify route/hash is unchanged and sidebar search does not open.
  4. Run:
     - `node output/playwright/search-shortcuts-ignore-terminal-focus-assert.cjs`
     - `node output/playwright/sidebar-search-shortcut-expands-assert.cjs`
     - `node output/playwright/sidebar-search-shortcut-g-expands-assert.cjs`
- Expected Results:
  - Under terminal focus, search shortcuts are ignored.
  - Outside terminal focus, both shortcuts still uncollapse sidebar and focus search input.
- Verification Note:
  - Use non-editable terminal focus probes so the assertion cannot pass through editable-target gating.
- Rollback/Cleanup:
  - Revert `!isTerminalLikeFocused()` gates in `G`/`P` search handlers if terminal contexts should intentionally allow global search accelerator interception.

### Fix: Navigation Shortcuts Ignore Terminal-Like Focus (`Cmd/Ctrl+1..9`, `Cmd/Ctrl+[`, `Cmd/Ctrl+]`, `Cmd/Ctrl+Shift+[`, `Cmd/Ctrl+Shift+]`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Focus terminal-like element (`[data-codex-terminal]` / `.xterm` equivalent).
  2. Trigger digit thread shortcut (`Cmd/Ctrl+1`) and bracket navigation shortcuts with/without `Shift`.
  3. Verify hash/route remains unchanged and terminal focus remains active.
  4. Run:
     - `node output/playwright/navigation-shortcuts-ignore-terminal-focus-assert.cjs`
     - `node output/playwright/navigation-shortcuts-ignore-input-focus-assert.cjs`
- Expected Results:
  - Under terminal focus, all listed navigation shortcuts are ignored.
  - Existing editable-input guard behavior remains intact.
- Rollback/Cleanup:
  - Revert `!isTerminalLikeFocused()` gates in digit/bracket navigation handlers if terminal contexts should intentionally allow navigation accelerator interception.

### Fix: Sidebar/Panel Toggle Shortcuts Ignore Terminal-Like Focus

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Focus terminal-like element (`[data-codex-terminal]` / `.xterm` equivalent).
  2. Trigger `Cmd/Ctrl+B`, `Cmd/Ctrl+J`, `Cmd/Ctrl+Shift+E`, `Cmd/Ctrl+Shift+I`, and `Cmd/Ctrl+Shift+B`.
  3. Verify route/hash and sidebar state remain unchanged.
  4. Run:
     - `node output/playwright/sidebar-toggle-shortcuts-ignore-terminal-focus-assert.cjs`
     - `node output/playwright/review-shortcut-shift-b-home-sidebar-toggle-assert.cjs`
     - `node output/playwright/review-shortcut-shift-b-toggle-assert.cjs`
- Expected Results:
  - Under terminal focus, listed toggle shortcuts are ignored.
  - Outside terminal focus, Shift+B still toggles review on thread route and sidebar on home route.
- Rollback/Cleanup:
  - Revert `!isTerminalLikeFocused()` gates in sidebar/panel toggle handlers if terminal contexts should intentionally allow these accelerators.

### Fix: Copy Shortcuts Ignore Terminal-Like Focus

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Focus terminal-like element (`[data-codex-terminal]` / `.xterm` equivalent).
  2. Trigger copy shortcuts: `Cmd/Ctrl+Alt+L`, `Cmd/Ctrl+Alt+Shift+C`, `Cmd/Ctrl+Alt+S`, `Cmd/Ctrl+Shift+C`, `Cmd/Ctrl+Alt+C`.
  3. Verify route/hash remains unchanged and terminal focus remains active.
  4. Run:
     - `node output/playwright/copy-shortcuts-ignore-terminal-focus-assert.cjs`
     - `node output/playwright/copy-shortcuts-ignore-input-focus-assert.cjs`
- Expected Results:
  - Under terminal focus, copy shortcuts are ignored.
  - Existing editable-input guard behavior remains intact.
- Rollback/Cleanup:
  - Revert `!isTerminalLikeFocused()` gates in copy shortcut handlers if terminal contexts should intentionally allow these accelerators.

### Fix: Thread-Find Shortcut (`Cmd/Ctrl+F`) Ignores Terminal-Like Focus

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open a thread route.
  2. Focus terminal-like element (`[data-codex-terminal]` / `.xterm` equivalent).
  3. Press `Cmd/Ctrl+F`.
  4. Verify thread-find input is not focused and route/hash remains unchanged.
  5. Run:
     - `node output/playwright/thread-find-shortcut-ignore-terminal-focus-assert.cjs`
     - `node output/playwright/thread-find-shortcut-focuses-assert.cjs`
     - `node output/playwright/thread-find-shortcut-selects-query-assert.cjs`
- Expected Results:
  - Under terminal focus, thread-find shortcut is ignored.
  - Outside terminal focus, thread-find shortcut still focuses input and selects existing query text.
- Rollback/Cleanup:
  - Revert `!isTerminalLikeFocused()` gate in `Cmd/Ctrl+F` handler if terminal contexts should intentionally allow thread-find accelerator interception.

### Fix: New-Thread/Open-Folder Shortcuts Ignore Terminal-Like Focus

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Focus terminal-like element (`[data-codex-terminal]` / `.xterm` equivalent).
  2. Trigger `Cmd/Ctrl+N`, `Cmd/Ctrl+Shift+N`, `Cmd/Ctrl+Alt+N`, `Cmd/Ctrl+Shift+O`, and `Cmd/Ctrl+O`.
  3. Verify route/hash stays unchanged and open-folder dialog does not appear.
  4. Run:
     - `node output/playwright/newthread-openfolder-shortcuts-ignore-terminal-focus-assert.cjs`
     - `node output/playwright/newthread-openfolder-shortcuts-ignore-input-focus-assert.cjs`
- Expected Results:
  - Under terminal focus, new-thread/open-folder shortcuts are ignored.
  - Existing editable-input guard behavior remains intact.
- Rollback/Cleanup:
  - Revert `!isTerminalLikeFocused()` gates in `N/O` shortcut handlers if terminal contexts should intentionally allow workspace/thread navigation accelerators.

### Fix: Thread Action Shortcuts Ignore Terminal-Like Focus (`Cmd/Ctrl+Alt+P`, `Cmd/Ctrl+Alt+B`, `Cmd/Ctrl+Shift+A`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open a thread route.
  2. Focus terminal-like element (`[data-codex-terminal]` / `.xterm` equivalent).
  3. Trigger `Cmd/Ctrl+Alt+P`, `Cmd/Ctrl+Alt+B`, and `Cmd/Ctrl+Shift+A`.
  4. Verify thread route/hash, review-open state, and active thread pin state remain unchanged.
  5. Run:
     - `node output/playwright/thread-action-shortcuts-ignore-terminal-focus-assert.cjs`
     - `node output/playwright/review-alt-b-toggle-assert.cjs`
     - `node output/playwright/archive-shortcut-shift-a-home-ignored-assert.cjs`
- Expected Results:
  - Under terminal focus, thread action shortcuts are ignored.
  - Outside terminal focus, review shortcut behavior remains intact.
- Rollback/Cleanup:
  - Revert `!isTerminalLikeFocused()` gates in pin/review/archive shortcut handlers if terminal contexts should intentionally allow these accelerators.

### Verification Utility: Terminal-Focus Probe Audit

- Purpose:
  - Ensure every `*-ignore-terminal-focus-*.cjs` Playwright assertion uses non-editable terminal probes (not `<input>`), preventing false positives from editable-target guards.
- Steps:
  1. Run `node output/playwright/audit-terminal-focus-probes.cjs`.
- Expected Results:
  - `allCompliant: true`
  - each listed script reports `usesEditableInputProbe: false` and `usesNonEditableProbe: true`.

### Verification Utility: Source Audit For Terminal Shortcut Guards

- Purpose:
  - Ensure `onWindowKeyDown` global shortcut branches that already use editable-target checks also include terminal-focus guards.
- Steps:
  1. Run `node output/playwright/audit-shortcut-terminal-guards.cjs`.
- Expected Results:
  - `allCompliant: true`
  - `missingTerminalGuard: 0`.

### Verification Utility: Full Terminal-Focus Guard Suite

- Purpose:
  - Run all terminal-focus runtime assertions in one command and fail fast on any regression.
- Steps:
  1. Run `node output/playwright/run-terminal-focus-suite.cjs`.
  2. (Optional structural checks) run:
     - `node output/playwright/audit-terminal-focus-probes.cjs`
     - `node output/playwright/audit-shortcut-terminal-guards.cjs`
- Expected Results:
  - Suite summary reports `failed: 0`.
  - Structural audits report full compliance.

### Verification Utility: One-Command Parity Checkpoint

- Purpose:
  - Run full parity verification stack (build + positive shortcut smoke + terminal-focus suite + structural audits) in one command.
- Steps:
  1. Run `node output/playwright/run-parity-verification-all.cjs`.
- Expected Results:
  - Summary reports all 6 steps passed and `failed: 0`.

### Verification Utility: Thread-Scoped Shortcut Gate Audit

- Purpose:
  - Ensure any `onWindowKeyDown` branch relying on `selectedThreadId.value` is explicitly thread-route scoped.
- Steps:
  1. Run `node output/playwright/audit-shortcut-thread-scope.cjs`.
  2. (Behavior spot-check) run:
     - `node output/playwright/rename-shortcut-cmd-ctrl-r-home-ignored-assert.cjs`
     - `node output/playwright/review-alt-b-toggle-assert.cjs`
- Expected Results:
  - Audit reports `allCompliant: true` and `missingThreadRouteGate: 0`.
  - Home-route rename shortcut remains ignored; thread-route review shortcut still toggles.

### Feature: Review-pane shortcut parity alias (`Cmd/Ctrl+Shift+R`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open an existing thread.
  2. Press `Cmd/Ctrl+Shift+R` once.
  3. Verify review pane opens (`.content-header-branch-dropdown.is-review-open` appears).
  4. Press `Cmd/Ctrl+Shift+R` again.
  5. Verify review pane closes.
  6. Run:
     - `node output/playwright/review-shortcut-shift-r-toggle-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - `Cmd/Ctrl+Shift+R` toggles review pane open and closed on thread route.
  - Shortcut smoke suite includes this alias and remains green.
- Rollback/Cleanup:
  - Revert Shift+R review shortcut branch and remove the assertion script if parity behavior is intentionally changed.

### Feature: Sidebar toggle shortcut parity checkpoint (`Cmd/Ctrl+J`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open a thread route.
  2. Press `Cmd/Ctrl+J` once.
  3. Confirm `data-sidebar-collapsed` changes and route hash remains stable.
  4. Press `Cmd/Ctrl+J` again.
  5. Confirm sidebar state restores to baseline.
  6. Run:
     - `node output/playwright/toggle-terminal-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - `Cmd/Ctrl+J` toggles sidebar collapsed state and restores it on second press.
  - Shortcut smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert `KeyJ` shortcut branch behavior and remove the dedicated assertion if parity behavior intentionally changes.

### Feature: New-thread alias shortcut parity checkpoint (`Cmd/Ctrl+Shift+O`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Navigate to `#/skills`.
  2. Trigger `Cmd/Ctrl+Shift+O` once.
  3. Confirm route moves to `#/`.
  4. Trigger `Cmd/Ctrl+Shift+O` again.
  5. Confirm route remains `#/`.
  6. Run:
     - `node output/playwright/new-thread-alt-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - The alias shortcut navigates to Home/New-thread route and remains stable on repeated press.
  - Smoke suite includes this assertion and stays green.
- Rollback/Cleanup:
  - Revert `Cmd/Ctrl+Shift+O` shortcut branch behavior and remove this assertion if parity intentionally changes.

### Feature: New-thread shortcut parity checkpoint (`Cmd/Ctrl+N`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open a thread route (`#/thread/...`).
  2. Trigger `Cmd/Ctrl+N` once.
  3. Confirm route moves to `#/`.
  4. Trigger `Cmd/Ctrl+N` again.
  5. Confirm route remains `#/`.
  6. Run:
     - `node output/playwright/new-thread-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - `Cmd/Ctrl+N` navigates from a thread route to Home/New-thread route.
  - Repeated press on Home keeps route stable.
  - Smoke suite includes this assertion and stays green.
- Rollback/Cleanup:
  - Revert `Cmd/Ctrl+N` shortcut branch behavior and remove this assertion if parity intentionally changes.

### Feature: New-window alias shortcut parity checkpoint (`Cmd/Ctrl+Shift+N`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Navigate to `#/skills`.
  2. Trigger `Cmd/Ctrl+Shift+N` once.
  3. Confirm route moves to `#/`.
  4. Trigger `Cmd/Ctrl+Shift+N` again.
  5. Confirm route remains `#/`.
  6. Run:
     - `node output/playwright/new-window-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - The alias shortcut navigates to Home/New-thread route and remains stable on repeated press.
  - Smoke suite includes this assertion and stays green.
- Rollback/Cleanup:
  - Revert `Cmd/Ctrl+Shift+N` shortcut branch behavior and remove this assertion if parity intentionally changes.

### Feature: Thread-cycle shortcut parity checkpoint (`Cmd/Ctrl+Shift+[`, `Cmd/Ctrl+Shift+]`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least two threads exist in the sidebar.
- Steps:
  1. Select the first thread in the sidebar.
  2. Trigger `Cmd/Ctrl+Shift+]` once and confirm navigation to a different thread.
  3. Trigger `Cmd/Ctrl+Shift+[` once and confirm it returns to the original thread.
  4. From the first thread, trigger `Cmd/Ctrl+Shift+[` once and confirm wrap-around to another thread.
  5. Run:
     - `node output/playwright/thread-cycle-shortcuts-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - Next/previous cycling works and wrap-around from the first thread is functional.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert bracket-cycle shortcut branches and remove this assertion if parity behavior intentionally changes.

### Feature: Thread pin toggle shortcut parity checkpoint (`Ctrl+Alt+P`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open any thread route (`#/thread/...`).
  2. Trigger `Ctrl+Alt+P` once.
  3. Confirm the active thread pinned state flips.
  4. Trigger `Ctrl+Alt+P` again.
  5. Confirm pinned state returns to the original value.
  6. Run:
     - `node output/playwright/toggle-thread-pin-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - First press toggles thread pin state.
  - Second press restores original pin state.
  - Route remains on the same thread throughout.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert the pin shortcut handling and remove this assertion if parity behavior intentionally changes.

### Feature: Diff panel toggle shortcut parity checkpoint (`Cmd/Ctrl+Alt+B`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open any thread route (`#/thread/...`).
  2. Trigger `Cmd/Ctrl+Alt+B` once.
  3. Confirm review/diff panel opens.
  4. Trigger `Cmd/Ctrl+Alt+B` again.
  5. Confirm review/diff panel closes.
  6. Run:
     - `node output/playwright/toggle-diff-panel-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - First press opens review/diff panel.
  - Second press closes it.
  - Route remains on the same thread throughout.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert diff panel shortcut handling and remove this assertion if parity behavior intentionally changes.

### Feature: Copy session ID shortcut parity checkpoint (`Cmd/Ctrl+Alt+C`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open any thread route (`#/thread/...`).
  2. Trigger `Cmd/Ctrl+Alt+C` once.
  3. Read clipboard contents.
  4. Confirm clipboard value exactly matches active thread ID.
  5. Run:
     - `node output/playwright/copy-session-id-thread-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - Clipboard text equals current thread ID.
  - Route remains stable on the same thread during copy action.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert session-id copy shortcut handling and remove this assertion if parity behavior intentionally changes.

### Feature: Copy conversation path shortcut parity checkpoint (`Cmd/Ctrl+Alt+Shift+C`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open any thread route (`#/thread/...`).
  2. Trigger `Cmd/Ctrl+Alt+Shift+C` once.
  3. Read clipboard contents.
  4. Confirm clipboard value equals `/thread/<active-thread-id>`.
  5. Run:
     - `node output/playwright/copy-conversation-path-thread-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - Clipboard text matches current conversation path.
  - Route remains stable on the active thread during copy action.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert conversation-path copy shortcut handling and remove this assertion if parity behavior intentionally changes.

### Feature: Copy working directory shortcut parity checkpoint (`Cmd/Ctrl+Shift+C`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open any thread route (`#/thread/...`).
  2. Trigger `Cmd/Ctrl+Shift+C` once.
  3. Read clipboard contents.
  4. Confirm clipboard contains a path-like working directory value.
  5. Run:
     - `node output/playwright/copy-working-directory-thread-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - Clipboard value is a valid filesystem-like path.
  - Route remains stable on the active thread during copy action.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert working-directory copy shortcut handling and remove this assertion if parity behavior intentionally changes.

### Feature: Copy conversation path alias shortcut parity checkpoint (`Cmd/Ctrl+Alt+S`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
  - Ensure at least one thread exists.
- Steps:
  1. Open any thread route (`#/thread/...`).
  2. Trigger `Cmd/Ctrl+Alt+S` once.
  3. Read clipboard contents.
  4. Confirm clipboard value equals `/thread/<active-thread-id>`.
  5. Run:
     - `node output/playwright/copy-conversation-path-alt-s-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - Clipboard text matches current conversation path.
  - Route remains stable on the active thread during copy action.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert conversation-path alias shortcut handling and remove this assertion if parity behavior intentionally changes.

### Feature: Copy deeplink shortcut parity checkpoint (`Cmd/Ctrl+Alt+L`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Navigate to `#/skills`.
  2. Trigger `Cmd/Ctrl+Alt+L` once.
  3. Read clipboard contents.
  4. Confirm clipboard text equals full current page URL.
  5. Run:
     - `node output/playwright/copy-deeplink-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - Clipboard contains the exact current deeplink URL.
  - Route remains stable after shortcut execution.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert deeplink copy shortcut handling and remove this assertion if parity behavior intentionally changes.

### Feature: Copy session ID shortcut parity checkpoint (`Cmd/Ctrl+Alt+C` on non-thread route)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Navigate to `#/skills`.
  2. Trigger `Cmd/Ctrl+Alt+C` once.
  3. Read clipboard contents.
  4. Confirm clipboard text equals `skills`.
  5. Run:
     - `node output/playwright/copy-session-id-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - Clipboard contains current non-thread session identifier (`skills`).
  - Route remains stable during shortcut execution.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert non-thread session-id copy shortcut handling and remove this assertion if parity behavior intentionally changes.

### Feature: Copy working directory shortcut parity checkpoint (`Cmd/Ctrl+Shift+C` on non-thread route)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Navigate to `#/skills`.
  2. Trigger `Cmd/Ctrl+Shift+C` once.
  3. Read clipboard contents.
  4. Confirm clipboard text equals `skills`.
  5. Run:
     - `node output/playwright/copy-working-directory-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - Clipboard contains current non-thread working-directory identifier fallback (`skills`).
  - Route remains stable during shortcut execution.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert non-thread working-directory copy shortcut handling and remove this assertion if parity behavior intentionally changes.

### Feature: Command menu alias shortcut parity checkpoint (`Cmd/Ctrl+Shift+P`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Navigate to `#/`.
  2. Trigger `Cmd/Ctrl+Shift+P` once.
  3. Confirm route navigates to `#/skills`.
  4. Trigger `Cmd/Ctrl+Shift+P` again.
  5. Confirm route stays on `#/skills`.
  6. Run:
     - `node output/playwright/open-command-menu-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - First press opens command-menu flow (skills route).
  - Second press remains stable on skills route.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert command-menu alias shortcut handling and remove this assertion if parity behavior intentionally changes.

### Feature: Command menu primary shortcut parity checkpoint (`Cmd/Ctrl+K`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Navigate to `#/`.
  2. Trigger `Cmd/Ctrl+K` once.
  3. Confirm route navigates to `#/skills`.
  4. Trigger `Cmd/Ctrl+K` again.
  5. Confirm route stays on `#/skills`.
  6. Run:
     - `node output/playwright/open-command-menu-alt-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - First press opens command-menu flow (skills route).
  - Second press remains stable on skills route.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert command-menu primary shortcut handling and remove this assertion if parity behavior intentionally changes.

### Feature: Copy conversation path shortcut parity checkpoint (`Cmd/Ctrl+Alt+Shift+C` on non-thread route)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Navigate to `#/skills`.
  2. Trigger `Cmd/Ctrl+Alt+Shift+C` once.
  3. Read clipboard contents.
  4. Confirm clipboard text equals `/skills`.
  5. Run:
     - `node output/playwright/copy-conversation-path-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - Clipboard contains current non-thread conversation path (`/skills`).
  - Route remains stable during shortcut execution.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert non-thread conversation-path copy shortcut handling and remove this assertion if parity behavior intentionally changes.

### Feature: Skills shortcut parity checkpoint (`Cmd/Ctrl+Shift+P` from collapsed sidebar)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Collapse sidebar (`Cmd/Ctrl+J`).
  2. Trigger `Cmd/Ctrl+Shift+P` once.
  3. Confirm route goes to `#/skills` and sidebar expands.
  4. Run:
     - `node output/playwright/skills-shortcut-shift-p-opens-from-collapsed-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - Shortcut opens Skills route from collapsed state.
  - Sidebar expands after shortcut.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert skills shortcut collapsed-state behavior and remove this assertion if parity behavior intentionally changes.

### Feature: Sidebar search shortcut query-selection parity checkpoint (`Cmd/Ctrl+G`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Trigger `Cmd/Ctrl+G` and type a query in sidebar search.
  2. Collapse sidebar (`Cmd/Ctrl+J`).
  3. Trigger `Cmd/Ctrl+G` again.
  4. Confirm previous query is focused and fully selected.
  5. Run:
     - `node output/playwright/sidebar-search-shortcut-selects-query-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - Reopened sidebar search preserves query and selects all text for replacement.
  - Input is focused after reopening.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert sidebar-search shortcut selection behavior and remove this assertion if parity behavior intentionally changes.

### Feature: Sidebar search shortcut input parity checkpoint (`Cmd/Ctrl+G`)

- Prerequisites/Setup:
  - Start app: `pnpm run dev -- --host 127.0.0.1 --port 5173`.
- Steps:
  1. Trigger `Cmd/Ctrl+G` once.
  2. Confirm sidebar search input is visible and focused.
  3. Type a marker query.
  4. Confirm the input value matches the marker.
  5. Run:
     - `node output/playwright/sidebar-search-shortcut-assert.cjs`
     - `node output/playwright/run-shortcut-parity-smoke.cjs`
- Expected Results:
  - Sidebar search opens and receives focus with shortcut.
  - Typed value is retained in the search input.
  - Route remains stable while interacting with search.
  - Smoke suite includes this assertion and remains green.
- Rollback/Cleanup:
  - Revert sidebar-search shortcut focus/input behavior and remove this assertion if parity behavior intentionally changes.

### Feature: Settings shortcut parity checkpoint (Cmd/Ctrl+,)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173`.

Step-by-step actions:
1. Ensure no settings panel is open in the sidebar.
2. Press `Cmd+,` on macOS (or `Ctrl+,` on Linux/Windows).
3. Verify the sidebar settings panel appears.
4. Press `Cmd+,`/`Ctrl+,` again.
5. Verify the sidebar settings panel remains open.
6. Confirm the current route/hash remains unchanged throughout.

Expected result(s):
- First shortcut press opens `.sidebar-settings-panel`.
- Second shortcut press keeps `.sidebar-settings-panel` open (no toggle-close).
- Route/hash remains stable (no unintended navigation).

Rollback/cleanup notes (if applicable):
- Remove `settings-shortcut-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if this checkpoint is intentionally excluded later.

### Feature: Search files shortcut parity checkpoint (Cmd/Ctrl+P)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173`.

Step-by-step actions:
1. Navigate to any route where the sidebar is available.
2. Press `Cmd+P` on macOS (or `Ctrl+P` on Linux/Windows).
3. Verify sidebar search input becomes visible and focused.
4. Type a marker string (for example `parity-p-shortcut`).
5. Confirm the route/hash remains unchanged.

Expected result(s):
- `.sidebar-search-input` is visible and focused after shortcut.
- Entered marker text is retained in the input.
- Route/hash is stable while using the shortcut.

Rollback/cleanup notes (if applicable):
- Remove `search-files-shortcut-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if this checkpoint is intentionally excluded later.

### Feature: Archive shortcut home-route guard parity (Cmd/Ctrl+Shift+A)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173/#/` (home route).

Step-by-step actions:
1. Ensure current route is home (`#/`) and no thread row is active.
2. Press `Cmd+Shift+A` on macOS (or `Ctrl+Shift+A` on Linux/Windows).
3. Observe that no archive action is triggered and route remains unchanged.

Expected result(s):
- Archive shortcut is ignored on home route.
- Route/hash remains `#/`.
- Shortcut event is not consumed by archive action.

Rollback/cleanup notes (if applicable):
- Remove `archive-shortcut-shift-a-home-ignored-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if behavior is intentionally changed later.

### Feature: Pin shortcut home-route guard parity (Cmd/Ctrl+Alt+P)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173/#/` (home route).

Step-by-step actions:
1. Ensure current route is home (`#/`) and no thread route is active.
2. Press `Cmd+Alt+P` on macOS (or `Ctrl+Alt+P` on Linux/Windows).
3. Confirm no pin action occurs and route remains unchanged.

Expected result(s):
- Pin shortcut is ignored on home route.
- Route/hash remains `#/`.
- Event is not consumed by pin action (`defaultPrevented` remains false).

Rollback/cleanup notes (if applicable):
- Remove `pin-shortcut-alt-p-home-ignored-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if behavior is intentionally changed later.

### Feature: Rename shortcut home-route guard parity (Cmd+Ctrl+R)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173/#/` (home route).

Step-by-step actions:
1. Ensure current route is home (`#/`) and no thread is selected.
2. Press `Cmd+Ctrl+R`.
3. Verify no rename dialog appears.
4. Confirm the route/hash remains unchanged.

Expected result(s):
- Rename shortcut is ignored on home route.
- `.rename-thread-overlay .rename-thread-panel[aria-label="Rename thread"]` does not appear.
- Route/hash remains `#/`.

Rollback/cleanup notes (if applicable):
- Remove `rename-shortcut-cmd-ctrl-r-home-ignored-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if behavior is intentionally changed later.

### Feature: Command/settings shortcuts input-focus guard parity

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173`.

Step-by-step actions:
1. Open sidebar search input (`Cmd+G`/`Ctrl+G`) and type any text.
2. Keep focus inside the search input.
3. Press `Cmd+K`/`Ctrl+K`, `Cmd+Shift+P`/`Ctrl+Shift+P`, `Cmd+,`/`Ctrl+,`, and `Cmd+Shift+S`/`Ctrl+Shift+S`.
4. Observe route and settings panel state.

Expected result(s):
- Route/hash remains unchanged while typing in search input.
- Settings panel does not open from `Cmd+,` or `Cmd+Shift+S` when input is focused.
- Command palette shortcuts are ignored while input is focused.

Rollback/cleanup notes (if applicable):
- Remove `command-settings-shortcuts-ignore-input-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if focus-guard behavior is intentionally changed.

### Feature: Copy shortcuts input-focus guard parity

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173`.

Step-by-step actions:
1. Focus sidebar search input (`Cmd+G`/`Ctrl+G`) and type text.
2. While input stays focused, trigger copy shortcuts:
   - `Cmd/Ctrl+Alt+L`
   - `Cmd/Ctrl+Alt+Shift+C`
   - `Cmd/Ctrl+Alt+S`
   - `Cmd/Ctrl+Shift+C`
   - `Cmd/Ctrl+Alt+C`
3. Verify focus remains in input and no shortcut action is consumed.

Expected result(s):
- All copy shortcuts are ignored while text input is focused.
- Keyboard events remain unconsumed (`defaultPrevented: false`).
- Input focus is retained throughout.

Rollback/cleanup notes (if applicable):
- Remove `copy-shortcuts-ignore-input-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if focus-guard behavior is intentionally changed.

### Feature: Dictation shortcut input-focus guard parity

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173` and ensure at least one thread exists.

Step-by-step actions:
1. Open a thread and focus sidebar search input (`Cmd+G`/`Ctrl+G`).
2. Type text in the input.
3. Press dictation shortcut (`Cmd/Ctrl+M`) while input remains focused.

Expected result(s):
- Dictation shortcut is ignored while input is focused.
- Event remains unconsumed (`defaultPrevented: false`).
- Focus stays in the search input.

Rollback/cleanup notes (if applicable):
- Remove `dictation-shortcut-ignore-input-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if focus-guard behavior is intentionally changed.

### Feature: Navigation shortcuts input-focus guard parity

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173` with at least one thread.

Step-by-step actions:
1. Open a thread, then focus sidebar search input (`Cmd+G`/`Ctrl+G`) and type text.
2. While input remains focused, press navigation shortcuts:
   - `Cmd/Ctrl+[`
   - `Cmd/Ctrl+]`
   - `Cmd/Ctrl+Shift+[`
   - `Cmd/Ctrl+Shift+]`
3. Observe route/hash after each key press.

Expected result(s):
- Route/hash remains unchanged while input is focused.
- Navigation shortcuts are ignored in focused text input context.

Rollback/cleanup notes (if applicable):
- Remove `navigation-shortcuts-ignore-input-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if focus-guard behavior is intentionally changed.

### Feature: Search shortcuts input-focus guard parity

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173`.

Step-by-step actions:
1. Focus sidebar search input (`Cmd+G`/`Ctrl+G`) and type text.
2. While input remains focused, press `Cmd/Ctrl+G` and `Cmd/Ctrl+P`.
3. Observe input value, focus state, and whether shortcut event is consumed.

Expected result(s):
- Search shortcuts are ignored while input is focused.
- Input value remains unchanged.
- Focus remains in input and events are not consumed (`defaultPrevented: false`).

Rollback/cleanup notes (if applicable):
- Remove `search-shortcuts-ignore-input-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if focus-guard behavior is intentionally changed.

### Feature: Model shortcuts input-focus guard parity

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173` with at least one thread.

Step-by-step actions:
1. Open a thread and focus sidebar search input (`Cmd+G`/`Ctrl+G`), then type text.
2. While input remains focused, press model shortcuts:
   - `Cmd/Ctrl+T`
   - `Cmd/Ctrl+Shift+M`
3. Observe composer model menu and focus state.

Expected result(s):
- Model shortcuts are ignored while text input is focused.
- Composer model menu does not open.
- Input focus remains intact and events are not consumed (`defaultPrevented: false`).

Rollback/cleanup notes (if applicable):
- Remove `model-shortcuts-ignore-input-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if focus-guard behavior is intentionally changed.

### Feature: New-thread/open-folder shortcuts input-focus guard parity

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173` with at least one thread.

Step-by-step actions:
1. Open a thread, focus sidebar search input (`Cmd+G`/`Ctrl+G`), and type text.
2. While input remains focused, press:
   - `Cmd/Ctrl+N`
   - `Cmd/Ctrl+Shift+N`
   - `Cmd/Ctrl+Alt+N`
   - `Cmd/Ctrl+O`
3. Observe route/hash after each shortcut.

Expected result(s):
- New-thread/new-window/open-folder shortcuts are ignored while input is focused.
- Route/hash remains unchanged.

Rollback/cleanup notes (if applicable):
- Remove `newthread-openfolder-shortcuts-ignore-input-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if focus-guard behavior is intentionally changed.

### Feature: Review shortcut input-focus guard parity (Cmd/Ctrl+Alt+B)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173` and ensure at least one thread exists.

Step-by-step actions:
1. Open a thread, focus a text input (for example sidebar search via `Cmd+G`/`Ctrl+G`), and type text.
2. While input remains focused, press `Cmd/Ctrl+Alt+B`.
3. Observe review pane visibility before and after key press.

Expected result(s):
- Review shortcut is ignored while text input is focused.
- Review pane state remains unchanged.
- Event is not consumed (`defaultPrevented: false`) and input focus remains.

Rollback/cleanup notes (if applicable):
- Remove `review-alt-b-ignore-input-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if focus-guard behavior is intentionally changed.

### Feature: Keyboard shortcuts ignore select/spinbutton focus

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173`.

Step-by-step actions:
1. Focus a `<select>` control in the UI and press representative shortcuts such as `Cmd/Ctrl+K` and `Cmd/Ctrl+T`.
2. Focus a spinbutton/number input control and press representative shortcuts such as `Cmd/Ctrl+K`, `Cmd/Ctrl+T`, and `Cmd/Ctrl+J`.
3. Observe route/hash, command/menu visibility, and whether focus stays on the form control.

Expected result(s):
- Global keyboard shortcuts are ignored while a select or spinbutton control has focus.
- Route/hash and global UI state do not change from those key presses.
- Events are not consumed (`defaultPrevented: false`) and focus remains on the current control.

Rollback/cleanup notes (if applicable):
- Remove `shortcuts-ignore-select-focus-assert.cjs` and `shortcuts-ignore-spinbutton-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if this guard behavior is intentionally changed.

### Feature: Sidebar toggle alias shortcuts ignore input focus

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173`.

Step-by-step actions:
1. Focus a text input (for example sidebar search).
2. While input remains focused, press sidebar-toggle alias shortcuts used by the app (`Cmd/Ctrl+Shift+E`, `Cmd/Ctrl+Shift+I`, `Cmd/Ctrl+B`).
3. Observe sidebar collapsed/expanded state before and after each shortcut.

Expected result(s):
- Sidebar state remains unchanged while text input is focused.
- Alias shortcuts are ignored in editable-input context.

Rollback/cleanup notes (if applicable):
- Remove `sidebar-toggle-aliases-ignore-input-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if this guard behavior is intentionally changed.

### Feature: Search shortcuts ignore terminal focus (smoke parity)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173`.

Step-by-step actions:
1. Focus terminal panel container (non-editable focus probe).
2. Press `Cmd/Ctrl+G` and `Cmd/Ctrl+P`.
3. Observe route/hash and search input visibility.

Expected result(s):
- Both search shortcuts are ignored while terminal focus is active.
- Route/hash remains unchanged and search input is not opened.

Rollback/cleanup notes (if applicable):
- Remove `search-shortcuts-ignore-terminal-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if terminal-focus behavior is intentionally changed.

### Feature: Dictation shortcut ignores terminal focus (smoke parity)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173`.

Step-by-step actions:
1. Focus terminal panel container (non-editable focus probe).
2. Press dictation shortcut `Cmd/Ctrl+M`.
3. Observe focus and whether any dictation toggle side effect appears.

Expected result(s):
- Dictation shortcut is ignored while terminal focus is active.
- Event is not consumed (`defaultPrevented: false`) and terminal focus remains.

Rollback/cleanup notes (if applicable):
- Remove `dictation-shortcut-ignore-terminal-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if terminal-focus behavior is intentionally changed.

### Feature: Command shortcuts ignore terminal focus (smoke parity)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173`.

Step-by-step actions:
1. Focus terminal panel container (non-editable focus probe).
2. Press command shortcuts `Cmd/Ctrl+K` and `Cmd/Ctrl+Shift+P`.
3. Observe route/hash and focus state.

Expected result(s):
- Command shortcuts are ignored while terminal focus is active.
- Route/hash stays unchanged and focus remains in terminal container.
- Events are not consumed (`defaultPrevented: false`).

Rollback/cleanup notes (if applicable):
- Remove `command-shortcuts-ignore-terminal-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if terminal-focus behavior is intentionally changed.

### Feature: Settings shortcuts ignore terminal focus (smoke parity)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173`.

Step-by-step actions:
1. Focus terminal panel container (non-editable focus probe).
2. Press `Cmd/Ctrl+,` and `Cmd/Ctrl+Shift+S`.
3. Observe route/hash and Settings panel visibility.

Expected result(s):
- Settings shortcuts are ignored while terminal focus is active.
- Route/hash remains unchanged and Settings panel does not open.
- Events are not consumed (`defaultPrevented: false`).

Rollback/cleanup notes (if applicable):
- Remove `settings-shortcuts-ignore-terminal-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if terminal-focus behavior is intentionally changed.

### Feature: Navigation shortcuts ignore terminal focus (smoke parity)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173`.

Step-by-step actions:
1. Focus terminal panel container (non-editable focus probe).
2. Press navigation shortcuts used in parity checks:
   - `Cmd/Ctrl+1`
   - `Cmd/Ctrl+[`
   - `Cmd/Ctrl+]`
   - `Cmd/Ctrl+Shift+[`
   - `Cmd/Ctrl+Shift+]`
3. Observe route/hash and focus state after each keypress.

Expected result(s):
- Navigation shortcuts are ignored while terminal focus is active.
- Route/hash remains unchanged and terminal focus is preserved.
- Events are not consumed (`defaultPrevented: false`).

Rollback/cleanup notes (if applicable):
- Remove `navigation-shortcuts-ignore-terminal-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if terminal-focus behavior is intentionally changed.

### Feature: Copy shortcuts ignore terminal focus (smoke parity)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173`.

Step-by-step actions:
1. Focus terminal panel container (non-editable focus probe).
2. Press copy-related shortcuts covered by parity checks (deeplink, conversation path variants, working directory, session id).
3. Observe route/hash and focus state.

Expected result(s):
- Copy shortcuts are ignored while terminal focus is active.
- Route/hash remains unchanged and terminal focus is preserved.
- Events are not consumed (`defaultPrevented: false`).

Rollback/cleanup notes (if applicable):
- Remove `copy-shortcuts-ignore-terminal-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if terminal-focus behavior is intentionally changed.

### Feature: Thread-find shortcut ignores terminal focus (smoke parity)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173` and ensure at least one thread exists.

Step-by-step actions:
1. Focus terminal panel container (non-editable focus probe) while on a thread route.
2. Press thread-find shortcut `Cmd/Ctrl+F`.
3. Observe route/hash and thread-find input focus state.

Expected result(s):
- Thread-find shortcut is ignored while terminal focus is active.
- Route/hash remains unchanged and thread-find input does not receive focus.
- Event is not consumed (`defaultPrevented: false`) and terminal focus remains.

Rollback/cleanup notes (if applicable):
- Remove `thread-find-shortcut-ignore-terminal-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if terminal-focus behavior is intentionally changed.

### Feature: Thread action shortcuts ignore terminal focus (smoke parity)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173` and ensure at least one thread exists.

Step-by-step actions:
1. Focus terminal panel container (non-editable focus probe) on a thread route.
2. Press thread action shortcuts used in parity checks (`pin`, `review`, `archive` combos).
3. Observe route/hash, review open state, and pin state.

Expected result(s):
- Thread action shortcuts are ignored while terminal focus is active.
- Route/hash, review open state, and pin state remain unchanged.
- Events are not consumed (`defaultPrevented: false`) and terminal focus remains.

Rollback/cleanup notes (if applicable):
- Remove `thread-action-shortcuts-ignore-terminal-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if terminal-focus behavior is intentionally changed.

### Feature: Sidebar toggle shortcuts ignore terminal focus (smoke parity)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173`.

Step-by-step actions:
1. Focus terminal panel container (non-editable focus probe).
2. Press sidebar toggle shortcut set (`Cmd/Ctrl+B`, `Cmd/Ctrl+J`, `Cmd/Ctrl+Shift+E`, `Cmd/Ctrl+Shift+I`, `Cmd/Ctrl+Shift+B`).
3. Observe route/hash, sidebar collapsed state, and focus.

Expected result(s):
- Sidebar toggle shortcuts are ignored while terminal focus is active.
- Route/hash and sidebar state remain unchanged.
- Events are not consumed (`defaultPrevented: false`) and terminal focus remains.

Rollback/cleanup notes (if applicable):
- Remove `sidebar-toggle-shortcuts-ignore-terminal-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if terminal-focus behavior is intentionally changed.

### Feature: Thread R shortcuts ignore terminal focus (smoke parity)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173` and ensure at least one thread exists.

Step-by-step actions:
1. Focus terminal panel container (non-editable focus probe) on a thread route.
2. Press thread `R` shortcut variants (rename/review combos in parity check).
3. Observe rename dialog and review pane states.

Expected result(s):
- Thread `R` shortcuts are ignored while terminal focus is active.
- Rename dialog and review pane remain closed.
- Events are not consumed (`defaultPrevented: false`) and terminal focus remains.

Rollback/cleanup notes (if applicable):
- Remove `thread-r-shortcuts-ignore-terminal-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if terminal-focus behavior is intentionally changed.

### Feature: New-thread/open-folder shortcuts ignore terminal focus (smoke parity)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app at `http://127.0.0.1:4173`.

Step-by-step actions:
1. Focus terminal panel container (non-editable focus probe).
2. Press new-thread/open-folder shortcut set used in parity checks:
   - `Cmd/Ctrl+N`
   - `Cmd/Ctrl+Shift+N`
   - `Cmd/Ctrl+Q`
   - `Cmd/Ctrl+Alt+N`
   - `Cmd/Ctrl+O`
3. Observe route/hash and open-folder dialog state.

Expected result(s):
- New-thread/open-folder shortcuts are ignored while terminal focus is active.
- Route/hash remains unchanged and open-folder dialog stays closed.
- Events are not consumed (`defaultPrevented: false`) and terminal focus remains.

Rollback/cleanup notes (if applicable):
- Remove `newthread-openfolder-shortcuts-ignore-terminal-focus-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if terminal-focus behavior is intentionally changed.

### Feature: Review shortcut toggle parity in smoke (`Cmd/Ctrl+Shift+R`)

Prerequisites/setup:
- Install dependencies with `pnpm install`.
- Start dev server from repo root: `pnpm run dev -- --host 0.0.0.0 --port 4173`.
- Open app and ensure at least one thread exists.

Step-by-step actions:
1. Open a thread in the conversation area.
2. Press `Cmd+Shift+R` (macOS) or `Ctrl+Shift+R` (Windows/Linux) once.
3. Verify review pane opens.
4. Press the same shortcut again and verify review pane closes.
5. Navigate to Home (`#/`) and press the same shortcut again.

Expected result(s):
- On a thread route, `Cmd/Ctrl+Shift+R` toggles the review pane open then closed.
- On Home route, the shortcut does not navigate away or open thread-scoped review UI.

Rollback/cleanup notes (if applicable):
- Remove `review-shortcut-assert.cjs` from `output/playwright/run-shortcut-parity-smoke.cjs` if this parity behavior is intentionally changed.
