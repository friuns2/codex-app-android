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

---

### Settings parity diagnostics: Apps, MCPs, and experimental features

#### Feature/Change Name
Sidebar Settings now includes a Codex-app parity diagnostics section that loads app list, MCP server status, experimental features, and config requirements from app-server RPC.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Codex app-server reachable from the web UI

#### Steps
1. Open the web UI and open `Settings` in the sidebar
2. Locate the `App parity` section
3. Verify counts are shown for Apps, Experimental, and MCP
4. Verify rows render for available Apps, Experimental features, and MCP servers
5. Click `Reload MCP`
6. Confirm MCP server rows refresh without breaking the settings panel

#### Expected Results
- `App parity` section is visible in Settings
- The section shows loaded counts and config requirement summary (sandbox/approval)
- App rows show enabled/accessibility status
- Experimental feature rows show stage and on/off state
- MCP rows show auth status and tool count
- `Reload MCP` triggers MCP reload and refreshes server statuses

#### Rollback/Cleanup
- None

---

### Thread utility actions: compact and background terminal cleanup

#### Feature/Change Name
Settings now exposes two thread-level app-server actions for the selected thread: `Compact current thread` (`thread/compact/start`) and `Clean background terminals` (`thread/backgroundTerminals/clean`).

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open any existing thread

#### Steps
1. Open sidebar `Settings`
2. Confirm both buttons appear while a thread is selected:
   - `Compact current thread`
   - `Clean background terminals`
3. Click `Compact current thread`
4. Click `Clean background terminals`

#### Expected Results
- Both actions call the app-server without UI crashes
- Thread view remains responsive after both actions
- Thread/state refresh runs after each action

#### Rollback/Cleanup
- None

---

### Unarchive thread action

#### Feature/Change Name
Settings App parity section now exposes an `Unarchive` action backed by `thread/unarchive` using an input thread id.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. At least one archived thread id available

#### Steps
1. Open sidebar `Settings`
2. In `App parity` -> `Archived threads`, enter an archived thread id
3. Click `Unarchive`

#### Expected Results
- The app calls `thread/unarchive` successfully
- Thread list refreshes and the unarchived thread becomes available again in active threads

#### Rollback/Cleanup
- Re-archive the thread from thread menu if needed

---

### Archived thread list with one-click unarchive

#### Feature/Change Name
Settings `App parity` now loads recent archived threads and provides one-click `Unarchive` actions per row.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. At least one archived thread exists

#### Steps
1. Open sidebar `Settings`
2. Go to `App parity` -> `Archived threads`
3. Verify archived thread rows appear
4. Click `Unarchive` on one archived row

#### Expected Results
- Recent archived threads are listed without manual id lookup
- Clicking `Unarchive` restores that thread to active threads
- Archived list refreshes after action

#### Rollback/Cleanup
- Re-archive the thread if needed

---

### Command exec from settings parity panel

#### Feature/Change Name
Settings `App parity` now includes a `Command exec` control that calls `command/exec` in the selected thread cwd and shows stdout/stderr.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Select a thread with a valid cwd

#### Steps
1. Open sidebar `Settings`
2. In `App parity` -> `Command exec`, enter `pwd`
3. Click `Run`

#### Expected Results
- Command executes through app-server RPC
- Output panel shows `exitCode`, plus stdout/stderr when available
- UI remains responsive during and after execution

#### Rollback/Cleanup
- None

---

### Feedback upload from settings parity panel

#### Feature/Change Name
Settings `App parity` includes a `Feedback upload` form wired to `feedback/upload`.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Optional: select a thread so feedback includes current thread id

#### Steps
1. Open `Settings` -> `App parity`
2. In `Feedback upload`, set classification (for example `bug`)
3. Optionally enter reason text
4. Click `Submit`

#### Expected Results
- Submission succeeds via app-server RPC
- UI shows a success status line (including returned threadId when provided)
- Settings panel remains usable after submit

#### Rollback/Cleanup
- None

---

### Refresh parity diagnostics

#### Feature/Change Name
Settings `App parity` includes `Refresh parity` to re-fetch apps, experimental features, MCP servers, config requirements, and archived threads.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)

#### Steps
1. Open `Settings` -> `App parity`
2. Click `Refresh parity`

#### Expected Results
- Button enters loading state during fetch
- Parity counts/lists refresh without closing Settings panel

#### Rollback/Cleanup
- None

---

### MCP OAuth login from settings parity panel

#### Feature/Change Name
Settings `App parity` includes `MCP OAuth login` wired to `mcpServer/oauth/login`.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. MCP server name that supports OAuth is known

#### Steps
1. Open `Settings` -> `App parity`
2. Enter MCP server name in `MCP OAuth login`
3. Click `Start OAuth`

#### Expected Results
- OAuth start call succeeds via app-server RPC
- Returned authorization URL is opened in a new tab/window
- UI shows launch status text

#### Rollback/Cleanup
- Close opened auth tab if not needed

---

### Config value write from settings parity panel

#### Feature/Change Name
Settings `App parity` includes `Config write` controls for `approval_policy` and `sandbox_mode` via `config/value/write`.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. App-server allows config writes for current environment

#### Steps
1. Open `Settings` -> `App parity`
2. Choose an approval policy and sandbox mode in `Config write`
3. Click `Save`

#### Expected Results
- UI saves both config values via RPC
- Success message shows selected values
- No settings panel crash/regression

#### Rollback/Cleanup
- Restore previous approval/sandbox values using same controls

---

### Account logout from settings parity panel

#### Feature/Change Name
Settings `App parity` includes `Logout active account` wired to `account/logout`.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. At least one active logged-in account

#### Steps
1. Open `Settings` -> `App parity`
2. Click `Logout active account`

#### Expected Results
- App-server receives `account/logout`
- Account state refreshes in settings account list
- Parity diagnostics refresh without UI crash

#### Rollback/Cleanup
- Log in again and refresh accounts if needed

---

### Account read visibility in parity panel

#### Feature/Change Name
Settings `App parity` shows active account details from `account/read` (email, plan type, account type, requiresOpenaiAuth).

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)

#### Steps
1. Open `Settings` -> `App parity`
2. Locate `Account` section

#### Expected Results
- Account summary row is shown from latest `account/read` payload
- `requiresOpenaiAuth` state is displayed

#### Rollback/Cleanup
- None

---

### Config read visibility in parity panel

#### Feature/Change Name
Settings `App parity` shows `config/read` summary: model, provider, approval policy, sandbox mode, and web search mode.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)

#### Steps
1. Open `Settings` -> `App parity`
2. Locate `Config read` section

#### Expected Results
- Config read values are displayed from latest app-server snapshot
- Unset values are shown as `(unset)`

#### Rollback/Cleanup
- None

---

### In-progress steer uses turn/steer

#### Feature/Change Name
When a thread is in progress and composer mode is `Steer`, sending a new prompt now calls `turn/steer` with `expectedTurnId` instead of starting a new turn.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Existing thread with an active in-progress turn
3. Composer in-progress mode set to `Steer`

#### Steps
1. Start a long-running turn in a thread
2. While it is running, send a follow-up prompt with mode `Steer`

#### Expected Results
- App sends steer request to active turn (`turn/steer`)
- No new independent turn is started for that follow-up message
- Thread updates continue on the same active turn timeline

#### Rollback/Cleanup
- Switch in-progress mode to `Queue` if steer behavior is not desired

---

### Realtime thread compacted visibility

#### Feature/Change Name
When app-server emits `thread/compacted`, UI now immediately surfaces compacted status (`Context compacted`) and marks the thread as unread by event.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. A thread where compaction can be triggered

#### Steps
1. Trigger thread compaction (for example via `Compact current thread` in settings)
2. Wait for realtime notification

#### Expected Results
- Thread receives immediate compacted activity state in UI
- Thread is marked unread/event-updated in sidebar state
- Normal sync still follows and does not regress

#### Rollback/Cleanup
- None

---

### Realtime app list update refreshes parity panel

#### Feature/Change Name
When app-server emits `app/list/updated`, the parity diagnostics panel auto-refreshes while Settings is open.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Settings panel open on `App parity`
3. Trigger an app list update event from app-server (for example via app install/enable workflow)

#### Steps
1. Keep `Settings` -> `App parity` open
2. Trigger `app/list/updated`

#### Expected Results
- Parity panel data refreshes automatically without manual button click
- No duplicate/error spam in UI while updates arrive

#### Rollback/Cleanup
- None

---

### Realtime config/deprecation warning visibility

#### Feature/Change Name
Global warning notifications (`configWarning`, `deprecationNotice`, `windows/worldWritableWarning`) are surfaced in UI error state.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Ability to trigger one of these warning notifications from app-server

#### Steps
1. Trigger any of: `configWarning`, `deprecationNotice`, `windows/worldWritableWarning`
2. Observe app-level error/warning presentation

#### Expected Results
- Warning text from notification is captured and shown via shared error state
- No crash or notification processing regression

#### Rollback/Cleanup
- None

---

### MCP OAuth completion realtime refresh

#### Feature/Change Name
When app-server emits `mcpServer/oauthLogin/completed`, parity diagnostics auto-refresh through the app-list revision signal.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Settings panel open on `App parity`
3. Start and complete MCP OAuth flow

#### Steps
1. Trigger MCP OAuth login from parity panel
2. Complete OAuth in browser
3. Wait for `mcpServer/oauthLogin/completed` notification

#### Expected Results
- Parity panel refreshes automatically after OAuth completion
- Updated MCP auth status appears without manual refresh

#### Rollback/Cleanup
- None

---

### Account realtime update refreshes parity diagnostics

#### Feature/Change Name
When app-server emits `account/updated` or `account/rateLimits/updated`, parity/account diagnostics auto-refresh through the shared app-list revision signal.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Settings panel open on `App parity`
3. Trigger account update or rate-limit update notification

#### Steps
1. Keep `Settings` -> `App parity` open
2. Trigger account state change (switch/login/logout/refresh) or quota update

#### Expected Results
- Parity panel refreshes automatically after account notifications
- Account summary and quota-adjacent diagnostics stay current without manual refresh

#### Rollback/Cleanup
- None

---

### Realtime terminal interaction visibility

#### Feature/Change Name
When app-server emits `item/commandExecution/terminalInteraction`, UI now surfaces a live `Terminal interaction` activity state with the prompt/message.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Trigger a command flow that requests terminal interaction

#### Steps
1. Start a command that pauses for terminal interaction
2. Wait for `item/commandExecution/terminalInteraction` notification

#### Expected Results
- Turn activity updates to `Terminal interaction`
- Activity details include the prompt/message from notification
- Thread is marked unread/event-updated

#### Rollback/Cleanup
- None

---

### Realtime MCP tool call progress visibility

#### Feature/Change Name
When app-server emits `item/mcpToolCall/progress`, UI now surfaces a live `MCP tool progress` activity state with tool/progress details.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Trigger an MCP tool call that emits progress notifications

#### Steps
1. Start a turn that invokes an MCP tool with progress updates
2. Wait for `item/mcpToolCall/progress` notifications

#### Expected Results
- Turn activity updates to `MCP tool progress`
- Activity details include tool/progress text from notification payload
- Thread is marked unread/event-updated as progress arrives

#### Rollback/Cleanup
- None

---

### Realtime turn diff update visibility

#### Feature/Change Name
When app-server emits `turn/diff/updated`, UI now surfaces `Turn diff updated` activity state and marks thread unread/event-updated.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Trigger a turn that emits `turn/diff/updated`

#### Steps
1. Run a turn that performs file changes
2. Wait for `turn/diff/updated` notification

#### Expected Results
- Activity label updates to `Turn diff updated`
- Activity details indicate whether diff content is present
- Thread unread/event indicator updates

#### Rollback/Cleanup
- None

---

### Realtime fuzzy file search session visibility

#### Feature/Change Name
When app-server emits `fuzzyFileSearch/sessionUpdated` or `fuzzyFileSearch/sessionCompleted`, UI now surfaces `Fuzzy file search` activity state with progress/completion details.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Trigger a fuzzy file search flow that emits session notifications

#### Steps
1. Start fuzzy file search
2. Observe `sessionUpdated` notifications
3. Observe `sessionCompleted` notification

#### Expected Results
- Activity label updates to `Fuzzy file search`
- Activity details show progress/completion text (and match count when present)
- Thread is marked unread/event-updated

#### Rollback/Cleanup
- None

---

### Realtime raw response item completion visibility

#### Feature/Change Name
When app-server emits `rawResponseItem/completed`, UI now surfaces `Raw response item` activity state with completion details.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Trigger a flow that emits `rawResponseItem/completed`

#### Steps
1. Run a turn that produces raw response item completion events
2. Observe `rawResponseItem/completed` notifications

#### Expected Results
- Activity label updates to `Raw response item`
- Activity details include completed item type (when available)
- Thread is marked unread/event-updated

#### Rollback/Cleanup
- None

---

### Account login completion realtime refresh

#### Feature/Change Name
When app-server emits `account/login/completed`, parity/account diagnostics auto-refresh through the shared revision signal.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Settings panel open on `App parity`
3. Trigger account login flow to completion

#### Steps
1. Start account login
2. Complete login and wait for `account/login/completed`

#### Expected Results
- Parity panel refreshes automatically after login completion
- Account summary and related diagnostics reflect new logged-in account

#### Rollback/Cleanup
- Logout if test login should be reverted

---

### Account login start from parity panel

#### Feature/Change Name
Settings `App parity` includes `Start ChatGPT login` wired to `account/login/start` and opens returned auth URL.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)

#### Steps
1. Open `Settings` -> `App parity`
2. In `Account`, click `Start ChatGPT login`

#### Expected Results
- App-server receives `account/login/start` request
- Browser opens returned `authUrl`
- UI shows login start status with loginId when available

#### Rollback/Cleanup
- Close opened login tab/window if not needed

---

### Account login cancel from parity panel

#### Feature/Change Name
Settings `App parity` includes `Cancel login` wired to `account/login/cancel` using the latest started `loginId`.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Start login first via `Start ChatGPT login` so a loginId is present

#### Steps
1. In `Settings` -> `App parity`, click `Start ChatGPT login`
2. Click `Cancel login`

#### Expected Results
- App-server receives `account/login/cancel` with current loginId
- UI shows cancel status (`canceled` or `notFound`)
- Active loginId state is cleared after cancel attempt

#### Rollback/Cleanup
- Restart login if you need to continue auth flow

---

### Legacy auth notification parity refresh

#### Feature/Change Name
Parity/account diagnostics auto-refresh when legacy auth lifecycle notifications arrive (`authStatusChange`, `loginChatGptComplete`, `sessionConfigured`).

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Settings panel open on `App parity`
3. Trigger auth lifecycle notifications on a server that emits legacy events

#### Steps
1. Keep `Settings` -> `App parity` open
2. Trigger legacy auth status/login/session events

#### Expected Results
- Parity panel refreshes automatically after each legacy auth event
- Account-related diagnostics remain current without manual refresh

#### Rollback/Cleanup
- None

---

### Account login completed outcome visibility

#### Feature/Change Name
When app-server emits `account/login/completed`, UI now reads `success`/`error` and surfaces failure immediately via shared error state.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Trigger account login completion notifications with both success and failure cases (when possible)

#### Steps
1. Start account login flow
2. Complete with success and observe state
3. Trigger/observe a failed login completion payload (if available)

#### Expected Results
- Failed completion (`success: false`) sets a visible login error message
- Successful completion does not leave stale login failure in shared error state
- Existing parity auto-refresh still runs via revision signal

#### Rollback/Cleanup
- Retry login or logout/login cycle as needed

---

### Login completion clears stale parity login state

#### Feature/Change Name
After parity/account refresh confirms logged-in account email, parity login staging state is cleaned: tracked loginId is cleared and stale `Login started` status is replaced with `Login completed`.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Start ChatGPT login from parity panel and complete auth flow

#### Steps
1. Click `Start ChatGPT login` in parity account section
2. Complete login externally and wait for parity refresh
3. Re-open/check parity account section status

#### Expected Results
- `Cancel login` no longer remains enabled from stale loginId
- Status message does not stay at `Login started`; it updates to `Login completed`
- Account summary shows authenticated account info

#### Rollback/Cleanup
- Logout if needed to reset account state

---

### Realtime reasoning text delta visibility

#### Feature/Change Name
UI now processes both `item/reasoning/summaryTextDelta` and `item/reasoning/textDelta` as live reasoning stream updates.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Trigger a turn that emits `item/reasoning/textDelta`

#### Steps
1. Start a turn with reasoning streaming enabled
2. Observe incoming reasoning deltas

#### Expected Results
- Live reasoning text updates for `item/reasoning/textDelta` events (not only summary deltas)
- No regression in existing summary reasoning stream behavior

#### Rollback/Cleanup
- None

---

### Parity diagnostics pagination completeness

#### Feature/Change Name
`app/list`, `experimentalFeature/list`, and `mcpServerStatus/list` parity loaders now follow `nextCursor` to load multi-page inventories.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. App-server data large enough to paginate (or mocked to emit `nextCursor`)

#### Steps
1. Open `Settings` -> `App parity`
2. Trigger `Refresh parity`
3. Verify lists include entries beyond first page when pagination is present

#### Expected Results
- Diagnostics loaders request subsequent pages while `nextCursor` exists
- Duplicates are deduplicated by id/name
- Lists stop gracefully when cursor is absent

#### Rollback/Cleanup
- None

---

### API key login start from parity panel

#### Feature/Change Name
Settings `App parity` account section now supports API key login via `account/login/start` with `type: apiKey`.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Valid API key available

#### Steps
1. Open `Settings` -> `App parity`
2. In `Account`, enter API key in `OpenAI API key`
3. Click `Login with API key`

#### Expected Results
- App-server receives API key login request
- UI shows API key login start/result status
- Account/parity data refreshes after successful login

#### Rollback/Cleanup
- Logout active account if needed

---

### Config write includes web_search mode

#### Feature/Change Name
Parity `Config write` now saves `web_search` along with `approval_policy` and `sandbox_mode`.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. App-server allows config writes

#### Steps
1. Open `Settings` -> `App parity`
2. In `Config write`, choose approval, sandbox, and web_search modes
3. Click `Save`

#### Expected Results
- UI writes all three config keys via `config/value/write`
- Success status includes all saved values
- No settings regression after write

#### Rollback/Cleanup
- Restore previous config values via same controls

---

### App enable/disable from parity panel

#### Feature/Change Name
Parity `Apps` list now supports enable/disable toggles via `config/value/write` on `apps.<id>.enabled`.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. At least one app entry visible in parity Apps list

#### Steps
1. Open `Settings` -> `App parity`
2. In `Apps`, click `Disable` (or `Enable`) for a row

#### Expected Results
- App enabled state is written through config API
- Row updates to reflect new enabled/disabled state
- Success status message shows written key/value

#### Rollback/Cleanup
- Toggle the app back to previous state

---

### Experimental feature enable/disable from parity panel

#### Feature/Change Name
Parity `Experimental features` list now supports enable/disable toggles via config writes.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. At least one experimental feature visible in parity list

#### Steps
1. Open `Settings` -> `App parity`
2. In `Experimental features`, click `Enable` or `Disable` for a row

#### Expected Results
- App attempts config write for selected feature flag
- UI row updates optimistically to new on/off state on success
- Write result or error appears in parity status area

#### Rollback/Cleanup
- Toggle feature back to prior state

---

### Realtime revision refresh updates settings account list

#### Feature/Change Name
When the shared realtime revision signal updates while Settings is open, the app now refreshes both parity diagnostics and the Settings account list.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Settings panel open
3. Trigger notifications that increment revision signal (for example account/app auth events)

#### Steps
1. Keep Settings open on sidebar
2. Trigger revision-driving notification

#### Expected Results
- Account cards refresh without manual Reload click
- Parity panel refreshes as before
- No duplicate error spam or UI freeze

#### Rollback/Cleanup
- None

---

### MCP OAuth completion outcome visibility

#### Feature/Change Name
When app-server emits `mcpServer/oauthLogin/completed`, UI now parses success/error outcome and surfaces failure immediately via shared error state.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Trigger MCP OAuth completion notifications with both success and failure cases when possible

#### Steps
1. Start MCP OAuth login flow
2. Complete OAuth with success and observe state
3. Trigger/observe failed completion payload (if available)

#### Expected Results
- Failed completion (`success: false`) sets visible OAuth failure message
- Successful completion clears stale OAuth error text if present
- Existing parity auto-refresh still runs

#### Rollback/Cleanup
- Retry OAuth login for affected MCP server

---

### Config requirements extended visibility

#### Feature/Change Name
Parity `configRequirements/read` summary now includes allowed web-search modes, network requirement state, and residency requirement in addition to sandbox and approval.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Locate config requirements summary line in parity panel

#### Expected Results
- Summary includes `sandbox`, `approval`, `web`, `network`, and `residency` fields
- Values fall back to `any` when requirement fields are not constrained

#### Rollback/Cleanup
- None

---

### Atomic parity config writes via config/batchWrite

#### Feature/Change Name
Parity `Config write` now persists approval/sandbox/web_search in one `config/batchWrite` request instead of multiple independent writes.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Pick values for approval, sandbox, and web_search
2. Click `Save`

#### Expected Results
- One batch write request carries all three edits
- Success message still reports all three saved values
- No partial update behavior from sequential writes

#### Rollback/Cleanup
- Save previous values via same controls

---

### Parity compact current thread action

#### Feature/Change Name
Settings `App parity` panel now exposes `Compact current thread`, wiring to `thread/compact/start` for the selected thread.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open an existing thread
3. Open `Settings` -> `App parity`

#### Steps
1. In `Archived threads`, click `Compact current thread`

#### Expected Results
- Button shows `Compacting…` while request is in flight
- Success meta line appears: `Compaction started for <thread-id>`
- If request fails, parity error message is shown

#### Rollback/Cleanup
- None (compaction is a thread operation)

---

### Parity steer active turn control

#### Feature/Change Name
Settings `App parity` now includes `Steer active turn`, sending steer text to the in-progress thread turn via existing `turn/steer` path.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open a thread with an active in-progress turn
3. Open `Settings` -> `App parity`

#### Steps
1. Enter steer text in `Steer active turn`
2. Click `Steer`

#### Expected Results
- Button is enabled only when selected thread is in progress
- UI shows `Steer message sent` on success
- Input clears on success
- Errors are surfaced in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity interrupt active turn control

#### Feature/Change Name
Settings `App parity` now includes `Interrupt active turn`, using the same active turn interrupt path as the main composer (`turn/interrupt`).

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open a thread with an in-progress turn
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Interrupt` in `Interrupt active turn`

#### Expected Results
- Button is enabled only while the selected thread is in progress
- Button shows `Interrupting…` while request is in flight
- UI shows `Interrupt signal sent` on success
- Errors are surfaced in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity clean background terminals control

#### Feature/Change Name
Settings `App parity` now includes `Clean background terminals`, calling `thread/backgroundTerminals/clean` for the selected thread.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open any thread
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Clean background terminals` in `Archived threads` parity block

#### Expected Results
- Button shows `Cleaning…` while request is in flight
- Success meta line appears: `Background terminals cleaned for <thread-id>`
- If request fails, parity error message is shown

#### Rollback/Cleanup
- None

---

### Parity refresh account from auth control

#### Feature/Change Name
Settings `App parity` Account block now includes `Refresh account from auth`, reloading account/auth state and parity account summary in place.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Refresh account from auth`

#### Expected Results
- Button shows `Refreshing…` while in flight
- Account list/state and parity account summary refresh
- Result line shows `Account refreshed from auth state`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity protocol catalog viewer

#### Feature/Change Name
Settings `App parity` now includes `Protocol catalog`, loading app-server method and notification catalogs.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Load methods/notifications`

#### Expected Results
- Button shows `Loading…` while in flight
- Methods line appears with total count and sample entries
- Notifications line appears with total count and sample entries
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity pending server requests viewer

#### Feature/Change Name
Settings `App parity` now includes `Pending server requests`, loading current server request queue summaries (`id` + `method`).

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Load pending requests`

#### Expected Results
- Button shows `Loading…` while in flight
- Count line updates to current queue size
- Up to five request summaries are shown as `id=<id> · <method>`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity thread state cache viewer

#### Feature/Change Name
Settings `App parity` now includes `Thread state cache`, loading thread title cache size and pinned-thread count from bridge endpoints.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Load title/pin cache`

#### Expected Results
- Button shows `Loading…` while in flight
- `thread title cache entries` updates to cached title count
- `pinned thread ids` updates to pin count
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity generate thread title tool

#### Feature/Change Name
Settings `App parity` now includes `Generate thread title`, calling `generate-thread-title` and showing the generated title preview.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Enter a prompt in `Generate thread title`
2. Click `Generate`

#### Expected Results
- Button shows `Generating…` while request is in flight
- `generated:` line displays returned title text (or `(empty title)` when empty)
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity thread search diagnostics

#### Feature/Change Name
Settings `App parity` now includes `Thread search diagnostics`, calling `searchThreads` with a manual query and showing matched thread-id count.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Enter a search query
2. Click `Search`

#### Expected Results
- Button shows `Searching…` while in flight
- `matched thread ids` displays the count returned by search API
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity set default model control

#### Feature/Change Name
Settings `App parity` now includes `Set default model`, allowing direct `setDefaultModel` calls from available model IDs.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Select a model in `Set default model`
2. Click `Set model`

#### Expected Results
- Button shows `Saving…` while in flight
- Success line shows `Saved default model=<model-id>`
- Config read section reflects updated model value
- Errors show in parity error line on failure

#### Rollback/Cleanup
- Re-run with previous model ID

---

### Parity set speed mode control

#### Feature/Change Name
Settings `App parity` now includes `Set speed mode`, calling `setCodexSpeedMode` (`standard`/`fast`) and showing saved state.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Choose `standard` or `fast` in `Set speed mode`
2. Click `Set speed`

#### Expected Results
- Button shows `Saving…` while in flight
- Success line shows `Saved speed mode=<mode>`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- Set mode back to previous value

---

### Parity rate limit reader

#### Feature/Change Name
Settings `App parity` now includes `Read rate limits`, calling `account/rateLimits/read` and showing primary/secondary usage summaries.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read limits`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line displays primary/secondary usage when snapshot exists
- Summary shows `No rate limit snapshot available` if backend returns null
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity archive current thread control

#### Feature/Change Name
Settings `App parity` now includes `Archive current thread`, using the same archive path as sidebar actions and refreshing archived thread list.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open any thread
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Archive current thread`

#### Expected Results
- Button shows `Archiving…` while in flight
- Success line shows `Archived <thread-id>`
- Archived threads list refreshes and includes the archived thread
- Errors show in parity error line on failure

#### Rollback/Cleanup
- Use `Unarchive` for the same thread in parity panel

---

### Parity resume current thread control

#### Feature/Change Name
Settings `App parity` now includes `Resume current thread`, calling `thread/resume` and showing resumed model in parity status.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open any thread
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Resume current thread`

#### Expected Results
- Button shows `Resuming…` while in flight
- Status line shows `Resumed <thread-id> (model=<model>)`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity accounts list inspector

#### Feature/Change Name
Settings `App parity` Account block now includes `Load accounts list`, calling `getAccounts` and showing total/active account summary.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Load accounts list`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `accounts=<count> · active=<account-id|none>`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity switch account by ID

#### Feature/Change Name
Settings `App parity` Account block now includes `Switch account`, allowing direct account switch using an account ID.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. At least two available accounts
3. Open `Settings` -> `App parity`

#### Steps
1. Enter target account id in `account id to switch`
2. Click `Switch account`

#### Expected Results
- Button shows `Switching…` while in flight
- Active account switches to the requested account
- Summary line shows `switched active account=<account-id>`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- Switch back to previous account id

---

### Parity remove account by ID

#### Feature/Change Name
Settings `App parity` Account block now includes `Remove account`, allowing direct account removal by account ID.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. At least one removable account
3. Open `Settings` -> `App parity`

#### Steps
1. Enter target account id in `account id to remove`
2. Click `Remove account`

#### Expected Results
- Button shows `Removing…` while in flight
- Account is removed from backend account list
- Summary line shows `removed account=<id> · remaining=<count>`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- Re-add/login the removed account if needed

---

### Parity current model config reader

#### Feature/Change Name
Settings `App parity` now includes `Current model config`, calling `config/read` via `getCurrentModelConfig` and showing model/provider/effort/speed summary.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read current model config`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `model`, `provider`, `effort`, and `speed`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity collaboration modes reader

#### Feature/Change Name
Settings `App parity` now includes `Collaboration modes`, calling `collaborationMode/list` and showing mode count + IDs.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read collaboration modes`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows mode count and mode IDs when available
- Shows `No collaboration modes returned` when list is empty
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity raw rate limits response reader

#### Feature/Change Name
Settings `App parity` now includes `Raw rate limits response`, calling `account/rateLimits/read` raw response helper and showing `rate_limits` entry count.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read raw rate limits`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `raw rate_limits entries=<count>`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity available models reader

#### Feature/Change Name
Settings `App parity` now includes `Available models`, calling `getAvailableModelIds` and showing model count with sample IDs.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read available models`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `count=<n>` and sample model IDs when available
- Shows `No available model IDs returned` when empty
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity workspace roots state reader

#### Feature/Change Name
Settings `App parity` now includes `Workspace roots state`, calling `getWorkspaceRootsState` and showing counts for order/active/labels.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read workspace roots`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `order=<n> · active=<n> · labels=<n>`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity home directory reader

#### Feature/Change Name
Settings `App parity` now includes `Home directory`, calling `getHomeDirectory` and showing the resolved path.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read home directory`

#### Expected Results
- Button shows `Loading…` while in flight
- Home directory absolute path is shown in parity panel
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity git branch state reader

#### Feature/Change Name
Settings `App parity` now includes `Git branch state`, calling `getGitBranchState` for the selected thread cwd.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open a thread with a valid git workspace cwd
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Read branch state`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `branch=<name|detached> · detached=<yes|no>`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity worktree branch options reader

#### Feature/Change Name
Settings `App parity` now includes `Worktree branch options`, calling `getWorktreeBranchOptions` for selected thread cwd.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open a thread with valid git cwd
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Read worktree branches`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `count=<n>` with sample branch names
- Shows `No branch options returned` when empty
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity thread search indexed count visibility

#### Feature/Change Name
`Thread search diagnostics` now also shows backend `indexedThreadCount` alongside matched thread-id count.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Enter a query in `Thread search diagnostics`
2. Click `Search`

#### Expected Results
- `matched thread ids` updates to the query match count
- `indexed threads` shows backend indexed thread count
- Both values clear/reload on each new search request

#### Rollback/Cleanup
- None

---

### Parity home directory listing reader

#### Feature/Change Name
Settings `App parity` Home directory block now includes `List home folders`, calling `listLocalDirectories` for the resolved home path.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read home directory` (optional)
2. Click `List home folders`

#### Expected Results
- Button shows `Loading…` while in flight
- `home folder entries` shows non-hidden directory entry count
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity project root suggestion reader

#### Feature/Change Name
Settings `App parity` now includes `Project root suggestion`, calling `getProjectRootSuggestion` for a provided base path.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Enter a base path in `Project root suggestion`
2. Click `Suggest root`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `name=<suggested-name> · path=<suggested-path>`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity Telegram status reader

#### Feature/Change Name
Settings `App parity` now includes `Telegram status`, calling `getTelegramStatus` and showing concise configured/active/chat/thread counts.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read Telegram status`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `configured`, `active`, `chats`, and `threads`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity Telegram config reader

#### Feature/Change Name
Settings `App parity` Telegram block now includes `Read Telegram config`, showing redacted config presence summary (no secret token output).

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read Telegram config`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `botTokenPresent=<yes|no> · allowedUserIds=<count>`
- Raw bot token value is not displayed
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity GitHub projects reader

#### Feature/Change Name
Settings `App parity` now includes `GitHub projects`, calling `getGithubProjectsForScope` for a selected scope.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Pick a scope in `GitHub projects`
2. Click `Read GitHub projects`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `count=<n>` and top project names when available
- Shows `No projects returned` when empty
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity collaboration mode setter

#### Feature/Change Name
Settings `App parity` Collaboration modes block now includes `Set mode`, allowing direct switch between `default` and `plan` modes.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Choose `default` or `plan` in mode selector
2. Click `Set mode`

#### Expected Results
- Button shows `Saving…` while in flight
- Summary line shows `selected=<mode>`
- Composer collaboration mode reflects selected value
- Errors show in parity error line on failure

#### Rollback/Cleanup
- Set mode back to previous value

---

### Parity reasoning effort setter

#### Feature/Change Name
Settings `App parity` now includes `Reasoning effort` control to set selected effort (`minimal|low|medium|high`).

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Choose an effort in `Reasoning effort`
2. Click `Set effort`

#### Expected Results
- Button shows `Saving…` while in flight
- Success line shows `Saved reasoning effort=<value>`
- Selected effort in composer state reflects chosen value
- Errors show in parity error line on failure

#### Rollback/Cleanup
- Set effort back to previous value

---

### Parity selected-thread model setter

#### Feature/Change Name
Settings `App parity` now includes `Set selected thread model`, allowing model override for the active thread context.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open an existing thread
3. Open `Settings` -> `App parity`

#### Steps
1. Pick a model in `Set selected thread model`
2. Click `Set thread model`

#### Expected Results
- Button shows `Saving…` while in flight
- Success line shows `Saved selected thread model=<model-id>`
- Composer selected model for current thread reflects chosen value
- Errors show in parity error line on failure

#### Rollback/Cleanup
- Set model back to previous thread model

---

### Parity thread groups reader

#### Feature/Change Name
Settings `App parity` now includes `Thread groups`, calling `getThreadGroups` and showing project/thread totals.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read thread groups`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `projects=<n> · threads=<n>`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity skills catalog reader

#### Feature/Change Name
Settings `App parity` now includes `Skills catalog`, calling `getSkillsList` and showing skill count with sample names.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read skills`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `count=<n>` and sample skill names
- Shows `No skills returned` when empty
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity thread title cache sample visibility

#### Feature/Change Name
`Thread state cache` now shows up to three cached thread title samples (`<thread-id>: <title>`) in addition to counts.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Load title/pin cache`

#### Expected Results
- `thread title cache entries` and `pinned thread ids` still update
- Up to three sample lines show cached title entries from title cache order
- Previous sample lines clear before each reload

#### Rollback/Cleanup
- None

---

### Parity pinned thread sample visibility

#### Feature/Change Name
`Thread state cache` now also shows up to three sample pinned thread IDs in addition to pin count.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Load title/pin cache`

#### Expected Results
- `pinned thread ids` count still updates
- Up to three `pinned: <thread-id>` sample lines are rendered when pin state exists
- Prior pinned samples clear before each reload

#### Rollback/Cleanup
- None

---

### Parity archived threads custom limit

#### Feature/Change Name
`Archived threads` in `App parity` now supports custom fetch limit (`1..200`) before loading archived thread rows.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Enter a limit value in archived-thread limit input
2. Click `Load archived`

#### Expected Results
- Archived list refreshes with the requested/clamped limit
- Unarchive actions continue to refresh using the same configured limit
- Errors show in parity error line on failure

#### Rollback/Cleanup
- Set limit back to `12`

---

### Parity selected thread detail reader

#### Feature/Change Name
`Archived threads` parity block now includes `Read selected thread detail`, calling `getThreadDetail` for the active thread.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Select any thread
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Read selected thread detail`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `messages`, `inProgress`, and `activeTurn`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity selected thread messages reader

#### Feature/Change Name
`Archived threads` parity block now includes `Read thread messages`, calling `getThreadMessages` for the active thread.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Select any thread
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Read thread messages`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `persisted messages=<count>`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity selected thread review result reader

#### Feature/Change Name
`Archived threads` parity block now includes `Read review result`, calling `getThreadReviewResult` for the active thread.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Select any thread
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Read review result`

#### Expected Results
- Button shows `Loading…` while in flight
- Summary line shows `review label=<label> · findings=<count>`
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity accounts inspector metadata visibility

#### Feature/Change Name
`Load accounts list` parity summary now includes imported-account id and observed auth-mode mix in addition to count/active id.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Load accounts list`

#### Expected Results
- Summary line includes `accounts`, `active`, `imported`, and `authModes`
- `imported` falls back to `(none)` when unavailable
- `authModes` shows unique non-empty modes or `(none)`

#### Rollback/Cleanup
- None

---

### Parity raw rate limits metadata summary

#### Feature/Change Name
`Raw rate limits response` summary now reports primary/secondary window presence and bucket-key count/sample from `rateLimitsByLimitId`.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read raw rate limits`

#### Expected Results
- Summary includes `primary=<yes|no>` and `secondary=<yes|no>`
- Summary includes `buckets=<count>` and up to three bucket keys when available
- Errors show in parity error line on failure

#### Rollback/Cleanup
- None

---

### Parity selected thread detail file-change count

#### Feature/Change Name
`Read selected thread detail` summary now includes persisted `fileChanges` count from thread detail messages.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Select a thread (preferably one with file change history)
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Read selected thread detail`

#### Expected Results
- Summary line includes `fileChanges=<count>` alongside message/in-progress/active-turn data
- Count reflects number of persisted `fileChange` message items in returned detail payload

#### Rollback/Cleanup
- None

---

### Parity pending request method distribution

#### Feature/Change Name
`Pending server requests` parity inspector now includes grouped method distribution summary (for example `methodA:2, methodB:1`).

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Load pending requests`

#### Expected Results
- Existing request count/row list remains
- New `methods:` line shows grouped method counts (up to five groups)
- Unknown or missing method values are grouped as `unknown-method`

#### Rollback/Cleanup
- None

---

### Parity thread groups largest-project summary

#### Feature/Change Name
`Thread groups` parity summary now includes largest project bucket detail (`largest=<project>:<count>`) in addition to total project/thread counts.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read thread groups`

#### Expected Results
- Summary includes `projects`, `threads`, and `largest`
- `largest` identifies project name with highest thread count
- `largest=(none)` when no groups are returned

#### Rollback/Cleanup
- None

---

### Parity home directory listing parent-path visibility

#### Feature/Change Name
`List home folders` parity output now also shows `home parent path` from listing metadata.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `List home folders`

#### Expected Results
- `home folder entries` still shows entry count
- `home parent path` line displays listing parent path when available
- Parent path value clears before each reload and updates with newest listing

#### Rollback/Cleanup
- None

---

### Parity selected thread messages role breakdown

#### Feature/Change Name
`Read thread messages` parity summary now includes role distribution (`roles=role:count,...`) in addition to total persisted message count.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Select any thread with mixed roles
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Read thread messages`

#### Expected Results
- Summary includes `persisted messages=<n>`
- Summary also includes `roles=<role:count,...>` when roles are present
- Unknown/empty roles are grouped as `unknown`

#### Rollback/Cleanup
- None

---

### Parity review status and inferred severity

#### Feature/Change Name
`Read review result` parity summary now includes `status` and `topSeverity` (inferred from finding tags such as `[P0]..[P3]` when present).

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Select a thread with/without review findings
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Read review result`

#### Expected Results
- Summary includes `status=<available|none>`
- Summary includes `topSeverity=<Px|n/a>`
- Existing `review label` and `findings` fields remain

#### Rollback/Cleanup
- None

---

### Parity selected thread detail message-type distribution

#### Feature/Change Name
`Read selected thread detail` summary now includes `types=<messageType:count,...>` derived from persisted thread detail messages.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Select a thread with mixed message types
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Read selected thread detail`

#### Expected Results
- Summary includes `types=` segment with up to four message-type buckets
- Messages without explicit type are grouped as `text`
- Existing `messages`, `fileChanges`, `inProgress`, and `activeTurn` data remain

#### Rollback/Cleanup
- None

---

### Parity pending request method sort order

#### Feature/Change Name
`Pending server requests` method distribution now sorts groups by descending count (then method name) before truncating to top five.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Load pending requests`

#### Expected Results
- `methods:` summary lists highest-frequency methods first
- Ties are resolved alphabetically by method name
- Existing grouped count format remains unchanged

#### Rollback/Cleanup
- None

---

### Parity selected thread messages role sort order

#### Feature/Change Name
`Read thread messages` role summary now sorts roles by descending count (then role name) before truncating to top four.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Select a thread with multiple roles
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Read thread messages`

#### Expected Results
- `roles=` summary lists highest-frequency roles first
- Ties are sorted alphabetically by role key
- Existing message count and role format remain unchanged

#### Rollback/Cleanup
- None

---

### Parity selected thread detail message-type sort order

#### Feature/Change Name
`Read selected thread detail` message-type summary now sorts type buckets by descending count (then message-type name) before truncating to top four.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Select a thread with multiple message types
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Read selected thread detail`

#### Expected Results
- `types=` summary lists highest-frequency message types first
- Ties are sorted alphabetically by message-type key
- Existing summary fields remain unchanged

#### Rollback/Cleanup
- None

---

### Parity archived-thread loading guard

#### Feature/Change Name
Archived-thread parity actions now share a single loading guard/state so archived list reload, unarchive row actions, and unarchive-by-id do not race.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Load archived`
2. While loading, attempt to click unarchive buttons or submit unarchive-by-id

#### Expected Results
- `Load archived` button shows `Loading…` while request is in flight
- Unarchive row buttons and unarchive-by-id button are disabled during load
- Archived list refresh path remains correct after archive/unarchive actions

#### Rollback/Cleanup
- None

---

### Parity command exec duration visibility

#### Feature/Change Name
`Command exec` parity output now includes `durationMs` measured client-side for each command run.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Enter any command in `Command exec`
2. Click `Run`

#### Expected Results
- Output starts with `exitCode=<n>` and `durationMs=<n>`
- Existing `stdout` / `stderr` sections remain unchanged
- Duration is non-negative and updates each run

#### Rollback/Cleanup
- None

---

### Parity pending request loader duration

#### Feature/Change Name
`Load pending requests` now appends `durationMs` to the method distribution summary for request-latency visibility.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Load pending requests`

#### Expected Results
- `methods:` line includes grouped counts and `durationMs=<n>`
- Duration is non-negative and changes per request
- Existing request count and row summaries remain

#### Rollback/Cleanup
- None

---

### Parity thread groups loader duration

#### Feature/Change Name
`Read thread groups` summary now includes `durationMs` to expose request latency alongside project/thread totals.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read thread groups`

#### Expected Results
- Summary includes `projects`, `threads`, `largest`, and `durationMs`
- `durationMs` is non-negative and updates each request
- Existing grouped totals remain unchanged

#### Rollback/Cleanup
- None

---

### Parity GitHub projects scope and duration summary

#### Feature/Change Name
`Read GitHub projects` summary now includes selected scope and `durationMs` in addition to project count/sample names.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Select any scope in `GitHub projects`
2. Click `Read GitHub projects`

#### Expected Results
- Summary includes `scope=<selected-scope>`
- Summary includes `durationMs=<n>` for each request
- Existing project count/sample output remains when projects are returned

#### Rollback/Cleanup
- None

---

### Parity selected thread review loader duration

#### Feature/Change Name
`Read review result` parity summary now includes `durationMs` to surface review-read request latency.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Select any thread
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Read review result`

#### Expected Results
- Summary includes existing review label/status/findings/topSeverity fields
- Summary also includes `durationMs=<n>`
- Duration is non-negative and refreshes per request

#### Rollback/Cleanup
- None

---

### Parity selected thread messages loader duration

#### Feature/Change Name
`Read thread messages` parity summary now includes `durationMs` for message-read request latency.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Select any thread
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Read thread messages`

#### Expected Results
- Summary includes `persisted messages=<n>` and role distribution
- Summary now also includes `durationMs=<n>`
- Duration is non-negative and updates per request

#### Rollback/Cleanup
- None

---

### Parity selected thread detail loader duration

#### Feature/Change Name
`Read selected thread detail` summary now includes `durationMs` for detail-read request latency.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Select any thread
3. Open `Settings` -> `App parity`

#### Steps
1. Click `Read selected thread detail`

#### Expected Results
- Summary includes message/file-change/type/in-progress/active-turn fields
- Summary now also includes `durationMs=<n>`
- Duration is non-negative and updates per request

#### Rollback/Cleanup
- None

---

### Parity skills enabled/scope summary

#### Feature/Change Name
`Read skills` parity summary now includes enabled count and scope distribution in addition to total count and sample names.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read skills`

#### Expected Results
- Summary includes `count=<n>` and `enabled=<n>`
- Summary includes `scopes=<scope:count,...>` (top three scopes)
- Existing sample skill names remain appended

#### Rollback/Cleanup
- None

---

### Parity skills loader duration

#### Feature/Change Name
`Read skills` parity summary now includes `durationMs` to expose skills catalog request latency.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read skills`

#### Expected Results
- Summary includes existing count/enabled/scope/name fields
- Summary now also includes `durationMs=<n>`
- Empty response summary includes `No skills returned · durationMs=<n>`

#### Rollback/Cleanup
- None

---

### Parity workspace roots loader duration

#### Feature/Change Name
`Read workspace roots` parity summary now includes `durationMs` to expose workspace-roots request latency.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read workspace roots`

#### Expected Results
- Summary includes `order`, `active`, and `labels`
- Summary now also includes `durationMs=<n>`
- Duration is non-negative and refreshes per request

#### Rollback/Cleanup
- None

---

### Parity available models loader duration

#### Feature/Change Name
`Read available models` parity summary now includes `durationMs` to expose model-catalog request latency.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read available models`

#### Expected Results
- Summary includes model count/sample IDs when available
- Summary now also includes `durationMs=<n>`
- Empty response case includes `No available model IDs returned · durationMs=<n>`

#### Rollback/Cleanup
- None

---

### Parity current model config loader duration

#### Feature/Change Name
`Read current model config` summary now includes `durationMs` to expose config-read request latency.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read current model config`

#### Expected Results
- Summary includes model/provider/effort/speed fields
- Summary now also includes `durationMs=<n>`
- Duration is non-negative and updates per request

#### Rollback/Cleanup
- None

---

### Parity collaboration modes labels and duration

#### Feature/Change Name
`Read collaboration modes` summary now includes both mode `values` and `labels`, plus `durationMs`.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read collaboration modes`

#### Expected Results
- Summary includes `count`, `values`, and `labels`
- Summary includes `durationMs=<n>`
- Empty response case includes `No collaboration modes returned · durationMs=<n>`

#### Rollback/Cleanup
- None

---

### Parity thread state cache loader duration

#### Feature/Change Name
`Load title/pin cache` now reports `durationMs` for the combined thread-title/pin-cache read operation.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Load title/pin cache`

#### Expected Results
- `durationMs` line appears after successful load
- Duration is non-negative and refreshes each load
- Existing cache counts and sample rows remain

#### Rollback/Cleanup
- None

---

### Parity home directory loader duration

#### Feature/Change Name
`Read home directory` parity output now includes `durationMs` for home-directory lookup latency.

#### Prerequisites/Setup
1. Dev server running (`pnpm run dev`)
2. Open `Settings` -> `App parity`

#### Steps
1. Click `Read home directory`

#### Expected Results
- Home directory path still renders
- `durationMs` line appears and is non-negative
- Duration resets and updates per request

#### Rollback/Cleanup
- None

## Feature: Parity panel thread rollback and file-change revert actions

### Prerequisites / Setup
- Start the app in a workspace with at least one existing thread.
- Ensure the selected thread has at least one completed turn and has a valid `cwd`.
- Open Settings -> App parity panel.

### Steps
1. In the thread actions area, enter `1` in `rollback turns` and click `Rollback turns`.
2. Confirm the action result line reports the selected thread id, rollback turn count, and returned message count.
3. In `turn id for revert`, enter a known completed turn id for that thread.
4. Leave `cwd for revert` empty (to use current thread `cwd`) and click `Revert file changes`.
5. Confirm the action result reports reverted file count and optional error count.
6. Repeat step 4 with an invalid `turn id` and verify an error is shown without breaking the panel.

### Expected Result(s)
- Rollback action is available in parity UI and calls backend successfully for valid values.
- Revert file-change action is available in parity UI and uses selected thread `cwd` when input is empty.
- Success and failure statuses render in parity action result/error area.

### Rollback / Cleanup Notes
- If rollback/revert modified thread state unexpectedly, use existing thread archive/resume utilities or repeat workflow on a test thread.

## Feature: Parity panel composer file search

### Prerequisites / Setup
- Start the app with a selected thread that has a valid `cwd`.
- Open Settings -> App parity panel.

### Steps
1. In `Composer file search`, set `cwd` to a real workspace path (or leave it empty when a thread with cwd is selected).
2. Enter a query string such as `package` and click `Search files`.
3. Confirm summary output includes result count and duration.
4. Try a query that should return no matches.

### Expected Result(s)
- Search action calls `/codex-api/composer-file-search` through gateway.
- Summary renders `count=<n> · durationMs=<n>` and includes sample paths when available.
- Empty results still render a valid summary with `count=0`.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel file upload action

### Prerequisites / Setup
- Start the app and open Settings -> App parity panel.
- Have a small local file ready for upload testing.

### Steps
1. In `File upload`, choose a local file from the file picker.
2. Confirm `selected: <filename>` appears.
3. Click `Upload file`.
4. Confirm result line shows either uploaded path or failed status with duration.

### Expected Result(s)
- Parity panel exposes `/codex-api/upload-file` through gateway `uploadFile`.
- Successful uploads show `uploaded=<path> · durationMs=<n>`.
- Failed uploads still show `upload failed · durationMs=<n>` without UI breakage.

### Rollback / Cleanup Notes
- Uploaded artifacts (if any) can be removed manually from their returned storage path.

## Feature: Parity panel start thread action

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Optionally prepare a workspace `cwd` and model id.

### Steps
1. In thread actions, set optional `start thread cwd` and optional `start thread model`.
2. Click `Start thread`.
3. Confirm result shows new thread id, resolved model, and duration.
4. Verify thread lists refresh after success.

### Expected Result(s)
- `startThread(cwd?, model?)` is callable directly from parity panel.
- Success output includes `Started thread <id> · model=<model> · durationMs=<n>`.
- Errors are shown in parity error area without breaking panel interactions.

### Rollback / Cleanup Notes
- Archive/delete test threads if they are no longer needed.

## Feature: Parity panel persist generated title to selected thread

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Select a thread so `selectedThreadId` is available.

### Steps
1. Enter a title prompt and click `Generate` in `Generate thread title`.
2. Confirm `generated: ...` appears.
3. Click `Persist to selected thread`.
4. Confirm parity action result reports persisted title for the selected thread.

### Expected Result(s)
- Parity panel can call `persistThreadTitle(threadId, title)`.
- Success result appears as `Persisted title for <threadId> · durationMs=<n>`.
- Thread list refreshes without errors after persisting title.

### Rollback / Cleanup Notes
- Re-run persist with previous title if rollback is needed.

## Feature: Parity panel persist pinned thread IDs

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure thread state cache can be loaded.

### Steps
1. Click `Load title/pin cache`.
2. In `thread ids (comma-separated)`, enter one or more thread IDs.
3. Click `Persist pinned ids`.
4. Confirm action result reports persisted count and duration.
5. Confirm pinned samples/count refresh after save.

### Expected Result(s)
- Parity panel can call `persistPinnedThreadIds(threadIds)`.
- Result appears as `Persisted pinned thread ids (<n>) · durationMs=<n>`.
- Thread state cache refresh reflects updated pinned IDs.

### Rollback / Cleanup Notes
- Re-run persist with previous pinned ID list to restore prior state.

## Feature: Parity panel review workflow actions

### Prerequisites / Setup
- Select a thread with a valid `cwd` in Settings -> App parity panel.
- Ensure repository at `cwd` is accessible.

### Steps
1. In thread diagnostics, set review scope/view and optional base branch.
2. Click `Init review git`.
3. Click `Start thread review`.
4. Click `Read review snapshot`.

### Expected Result(s)
- `initializeReviewGit(cwd)` runs and reports duration.
- `startThreadReview(threadId, scope, workspaceView, baseBranch?)` runs and reports scope/view.
- `getReviewSnapshot(...)` renders summary with file count, line deltas, scope/view, and duration.

### Rollback / Cleanup Notes
- No persistent cleanup expected from read operations; reuse existing thread actions if a thread should be archived afterward.

## Feature: Parity panel GitHub trending API action

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `GitHub projects`, click `Read trending API`.
2. Observe returned summary content.

### Expected Result(s)
- Parity panel invokes `getGithubTrendingProjects(5)`.
- Summary includes `trending-api count=<n>` with sample project names and `durationMs`.
- Empty/failure cases are surfaced without breaking parity panel.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel workspace roots write (round-trip)

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. Click `Read workspace roots`.
2. Click `Write loaded roots`.
3. Observe write result text.

### Expected Result(s)
- `getWorkspaceRootsState()` result is cached for parity write.
- `setWorkspaceRootsState(...)` is invoked by `Write loaded roots`.
- Result includes order/active/labels counts and `durationMs`.

### Rollback / Cleanup Notes
- Re-run `Read workspace roots` + `Write loaded roots` after any intentional root changes to sync state.

## Feature: Parity panel manual pending-request reply

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure at least one pending server request exists (or use any known request id for failure-path check).

### Steps
1. Click `Load pending requests`.
2. Enter a `request id`.
3. Choose `approve` or `deny`.
4. For `deny`, optionally fill a reason.
5. Click `Reply request`.

### Expected Result(s)
- Parity panel calls `replyToServerRequest(id, payload)` directly.
- Success shows `Replied to request id=<id> · mode=<mode> · durationMs=<n>`.
- Pending request list refreshes after reply.

### Rollback / Cleanup Notes
- Use this only on disposable/test pending requests; denied requests may require re-triggering upstream actions.

## Feature: Parity panel direct background-terminal clean by thread id

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Have a valid thread id.

### Steps
1. In thread actions, enter a thread id in `thread id for direct clean`.
2. Click `Direct clean by id`.
3. Observe action result.

### Expected Result(s)
- Parity panel calls `cleanThreadBackgroundTerminals(threadId)` directly.
- Result shows `Background terminals cleaned (direct) for <threadId> · durationMs=<n>`.
- Errors are surfaced in parity error area for invalid IDs.

### Rollback / Cleanup Notes
- No cleanup required; action is idempotent for already-clean states.

## Feature: Parity panel direct turn interrupt by thread/turn id

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Have a valid thread id and in-progress turn id.

### Steps
1. In `Interrupt active turn`, fill `thread id (direct interrupt)`.
2. Fill `turn id (required)`.
3. Click `Direct interrupt`.

### Expected Result(s)
- Parity panel calls `interruptThreadTurn(threadId, turnId)` directly.
- Result text shows `Direct interrupt sent (thread=<id>, turn=<id>) · durationMs=<n>`.
- Errors are surfaced for invalid or stale ids.

### Rollback / Cleanup Notes
- No cleanup required; this only sends an interrupt signal.

## Feature: Parity panel direct start turn by thread id

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Have a valid thread id.

### Steps
1. In `Steer active turn`, fill `thread id (direct start turn)` and `turn text`.
2. Click `Direct start turn`.
3. Observe result text.

### Expected Result(s)
- Parity panel calls `startThreadTurn(threadId, text, [])`.
- Result shows `Direct turn started (thread=<id>, turn=<turnId>) · durationMs=<n>`.
- Errors are surfaced for invalid thread IDs or request failures.

### Rollback / Cleanup Notes
- Archive/discard test turns using existing thread actions if needed.

## Feature: Parity panel direct steer turn by thread/expected-turn id

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Have a valid thread id and current in-progress expected turn id.

### Steps
1. In `Steer active turn`, fill `thread id (direct steer)`.
2. Fill `expected turn id` and `steer text`.
3. Click `Direct steer`.

### Expected Result(s)
- Parity panel calls `steerThreadTurn(threadId, expectedTurnId, text, [])`.
- Result shows `Direct steer sent (...) · durationMs=<n>` including returned turn id when available.
- Errors are surfaced for stale/invalid expected turn ids.

### Rollback / Cleanup Notes
- No cleanup required; steer updates the active turn behavior.

## Feature: Parity panel apply review action

### Prerequisites / Setup
- Open Settings -> App parity panel with a selected thread that has valid `cwd`.
- Optionally load review snapshot first.

### Steps
1. In review controls, choose action (`stage`/`unstage`/`revert`) and level (`all`/`file`/`hunk`).
2. For `file` or `hunk`, provide `path`.
3. Click `Apply review action`.

### Expected Result(s)
- Parity panel calls `applyReviewAction(...)` with selected scope/view/action/level/path.
- Snapshot summary updates with applied action, file count, line deltas, and duration.
- Validation prevents file/hunk action without path.

### Rollback / Cleanup Notes
- Use inverse review action (for example unstage after stage) to rollback test operations.

## Feature: Parity panel header actions (Refresh parity + Reload MCP)

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure parity panel is visible and has a loaded status block.

### Steps
1. Click `Refresh parity`.
2. Confirm parity status content updates and the loading indicator clears.
3. Click `Reload MCP`.
4. Confirm the panel reports MCP tools refreshed and no stale loading state remains.
5. Repeat steps 1-4 while settings panel remains open.

### Expected Result(s)
- Both actions complete without closing settings.
- Result text updates with fresh status text and no UI lockup.
- No console or UI error appears for repeated invocations.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel thread-action disabled-state guards

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure no thread is selected, then select a thread and toggle active/inactive turn states as needed.

### Steps
1. With no selected thread, inspect buttons that require thread context (for example rollback, compact, clean terminals, direct thread actions).
2. Verify thread-required controls are disabled.
3. Select a thread and verify relevant controls become enabled.
4. While an action is loading, verify only the active action shows loading/disabled state.

### Expected Result(s)
- Controls that require a selected thread are disabled when thread context is missing.
- Controls become enabled only when prerequisites are satisfied.
- Loading guards prevent duplicate submits for in-flight requests.

### Rollback / Cleanup Notes
- No cleanup required beyond returning to the previously selected thread.

## Feature: Parity panel direct thread management by id

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Prepare an existing thread id for archive/unarchive/rename/fork checks.

### Steps
1. In `Archived threads`, fill `thread id (direct archive/unarchive/rename/fork)`.
2. Click `Direct archive` and verify the thread appears in archived list after reload.
3. Click `Direct unarchive` and verify the thread is removed from archived list after reload.
4. Fill `new thread name (for direct rename)` and click `Direct rename`.
5. Click `Direct fork` and verify result text includes a new forked thread id.

### Expected Result(s)
- Direct actions call gateway-level `archiveThread`, `unarchiveThread`, `renameThread`, and `forkThread`.
- Result line shows success status with `durationMs`.
- Thread list/archived list refreshes after direct actions.

### Rollback / Cleanup Notes
- Rename can be reverted by running direct rename again with original name.
- Archived state can be reverted with direct unarchive.

## Feature: Parity panel live notification stream

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Keep a thread active so backend notifications can be emitted.

### Steps
1. Click `Start stream` in `Live notifications`.
2. Trigger at least one backend event (for example send a message or load thread metadata).
3. Verify `received` counter increases and sample rows appear.
4. Click `Clear` and verify counter/sample list reset.
5. Click `Stop stream` and verify no new samples are appended.

### Expected Result(s)
- Stream uses `subscribeCodexNotifications` and renders method-level notification samples.
- Start/Stop toggles subscription state safely.
- Clear resets stream diagnostics without breaking the panel.

### Rollback / Cleanup Notes
- Stop stream before leaving settings to avoid background subscription.

## Feature: Parity panel direct project-root open/create

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Prepare a valid filesystem path in `Project root suggestion` base-path input.

### Steps
1. Enter a base path.
2. Click `Open root` and verify result text shows opened path and duration.
3. Click `Open/create root` and verify result text includes `createIfMissing=yes`.
4. Repeat with an existing path and a new path to verify both modes.

### Expected Result(s)
- Parity panel calls `openProjectRoot(path, { createIfMissing, label: 'App parity' })`.
- Result line reports normalized opened path and `durationMs`.
- Errors are shown in parity error area for invalid paths or permissions failures.

### Rollback / Cleanup Notes
- Remove any test-created directories if you used `Open/create root` on temporary paths.

## Feature: Parity panel direct local-directory create

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Have a writable path for creating a test folder.

### Steps
1. In `Home directory`, set `directory path to create` with an absolute path for a new folder.
2. Click `Create directory`.
3. Verify result line reports `created=<path>` and `durationMs`.
4. If home path is loaded, click `List home folders` and confirm entry count updates when path is under home.

### Expected Result(s)
- Parity panel calls `createLocalDirectory(path)` directly.
- Success/failure feedback is visible in parity result/error lines.
- Existing home-directory diagnostics continue to work after directory creation.

### Rollback / Cleanup Notes
- Remove any temporary test directories created during this check.

## Feature: Parity panel Telegram config write

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Have a valid Telegram bot token and allowed user id(s), or a safe test token for negative-path checks.

### Steps
1. In `Telegram status`, click `Read Telegram config` to preload current values.
2. Update `telegram bot token`.
3. Set `allowed user ids` using comma/newline format (or `*`).
4. Click `Write Telegram config`.
5. Verify status/config summaries refresh after write.

### Expected Result(s)
- Parity panel calls `configureTelegramBot(botToken, allowedUserIds)` using the same parser as main settings flow.
- Config summary reflects `botTokenPresent` and updated allowed-user count.
- Status summary refreshes without breaking the parity panel.

### Rollback / Cleanup Notes
- Restore previous token/user-allowlist values and write config again if this was a temporary test update.

## Feature: Parity panel direct account + config read

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure backend is reachable and at least one account context exists.

### Steps
1. In `Account`, click `Read account + config`.
2. Observe account row and config-read block update.
3. Verify account summary includes refresh duration.

### Expected Result(s)
- Parity panel directly calls `readAccount()` and `readConfigSummary()`.
- Account details (`email/plan/type/requiresOpenaiAuth`) and config read values are refreshed in-place.
- `parityAccountsSummary` shows `account/config refreshed · durationMs=<n>`.

### Rollback / Cleanup Notes
- No cleanup required; read-only diagnostic action.

## Feature: Parity panel generic config key/value write

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Identify a safe config key for test updates.

### Steps
1. In `Config write`, set `config key`.
2. Set `config value` using text, number, boolean, or JSON object/array.
3. Choose merge strategy (`upsert` or `replace`).
4. Click `Write key/value`.
5. Verify success summary includes key/value, merge strategy, and `durationMs`.

### Expected Result(s)
- Parity panel calls `writeConfigValue(keyPath, parsedValue, mergeStrategy)`.
- Value parsing supports `true/false/null`, numbers, JSON, and plain strings.
- Errors surface in parity error line for invalid keys or backend rejection.

### Rollback / Cleanup Notes
- Re-run `Write key/value` with prior value to restore any changed config key.

## Feature: Parity panel config batch JSON write

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Prepare a safe JSON batch payload with one or more config operations.

### Steps
1. In `Config write`, paste batch JSON into `batch JSON`.
2. Click `Write batch JSON`.
3. Verify success summary reports operation count and `durationMs`.
4. Try invalid payload shape and confirm error appears in parity error line.

### Expected Result(s)
- Parity panel parses JSON array and calls `writeConfigBatch(...)`.
- Each item requires `keyPath`; `mergeStrategy` defaults to `upsert` unless `replace` is provided.
- Validation errors are surfaced without breaking parity panel state.

### Rollback / Cleanup Notes
- Reapply previous values via batch or key/value writer for any changed keys.

## Feature: Parity panel direct git branch checkout

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Select a thread with valid `cwd` on a git repository.
- Ensure target branch exists locally or is resolvable by git checkout logic.

### Steps
1. In `Git branch state`, click `Read branch state` to capture current branch.
2. Enter `target branch name`.
3. Click `Checkout branch`.
4. Verify summary shows checkout result and `durationMs`.
5. Optionally read worktree branches again to confirm branch list/state remains consistent.

### Expected Result(s)
- Parity panel calls `checkoutGitBranch(cwd, targetBranch)` directly.
- Git branch summary updates with checked-out branch and latency.
- Errors are surfaced in parity error line for invalid branch or checkout failures.

### Rollback / Cleanup Notes
- Checkout the original branch using the same parity action after validation.

## Feature: Parity panel thread diagnostics by thread id

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Have a valid thread id.

### Steps
1. In `Archived threads`, fill `thread id (direct read)`.
2. Click `Read detail by id`.
3. Click `Read messages by id`.
4. Click `Read review by id`.

### Expected Result(s)
- Parity panel calls `getThreadDetail`, `getThreadMessages`, and `getThreadReviewResult` with the provided thread id.
- Summary lines include `thread=<id>` and `durationMs`.
- Errors are shown in parity error line for invalid/stale thread ids.

### Rollback / Cleanup Notes
- No cleanup required; read-only diagnostic actions.

## Feature: Parity panel thread search with configurable limit

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure thread index has data.

### Steps
1. In `Thread search diagnostics`, enter a `search query`.
2. Set `limit` to a small value (for example `5`) and run `Search`.
3. Set `limit` to a larger value (for example `200`) and run `Search` again.

### Expected Result(s)
- Parity panel calls `searchThreads(query, limit)` with provided limit (clamped to valid range).
- `matched thread ids` and `indexed threads` summaries update on each run.
- Invalid/empty limit falls back to default behavior without breaking UI.

### Rollback / Cleanup Notes
- No cleanup required; read-only diagnostic action.

## Feature: Parity panel pending-request id quick-fill

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure at least one pending server request exists.

### Steps
1. Click `Load pending requests`.
2. Click `Use first pending id`.
3. Verify `request id` input is auto-filled from the first pending summary.
4. Optionally send approve/deny reply using the prefilled id.

### Expected Result(s)
- Quick-fill extracts the first pending id from loaded parity request summaries.
- Reply flow uses the prefilled id without manual typing.
- No side effects occur when pending list is empty (button disabled).

### Rollback / Cleanup Notes
- No cleanup required beyond normal pending-request reply handling.

## Feature: Parity panel live-notification method filter

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure backend emits notifications.

### Steps
1. In `Live notifications`, enter a `method filter` fragment (for example `thread/`).
2. Click `Start stream`.
3. Trigger mixed backend activity.
4. Verify only matching methods are counted/sampled.
5. Clear filter and repeat to confirm unfiltered stream behavior.

### Expected Result(s)
- Stream only records notifications whose method contains the filter text (case-insensitive).
- `received` count and sample rows reflect filtered notifications.
- Empty filter preserves existing unfiltered behavior.

### Rollback / Cleanup Notes
- Stop stream before leaving parity panel.

## Feature: Parity panel worktree-branch quick-fill

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Select a thread with git-backed `cwd`.

### Steps
1. In `Worktree branch options`, click `Read worktree branches`.
2. Click `Use first branch option`.
3. Verify `target branch name` in `Git branch state` is auto-filled.
4. Optionally run `Checkout branch` using the prefilled value.

### Expected Result(s)
- Loaded branch options are cached in parity state.
- Quick-fill copies the first available branch option into checkout draft.
- Button remains disabled when no branch options are available.

### Rollback / Cleanup Notes
- If you checked out a different branch, switch back using parity checkout action.

## Feature: Parity panel thread-id quick-fill for by-id diagnostics

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure a thread is selected in the sidebar.

### Steps
1. In `Archived threads`, click `Use selected thread id`.
2. Verify `thread id (direct read)` is auto-filled with current selection.
3. Run `Read detail by id`/`Read messages by id`/`Read review by id`.

### Expected Result(s)
- Quick-fill copies current selected thread id into direct-read input.
- By-id diagnostic actions can run without manual id typing.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-clean thread-id quick-fill

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure a thread is selected.

### Steps
1. In direct clean-by-id controls, click `Use selected thread id`.
2. Verify `thread id for direct clean` is auto-filled.
3. Click `Direct clean by id`.

### Expected Result(s)
- Quick-fill copies selected thread id to direct-clean input.
- Direct clean action runs without manual id typing.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-interrupt quick-fill helpers

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Select a thread with an active turn for full-path validation.

### Steps
1. In `Interrupt active turn`, click `Use selected thread id`.
2. Click `Use active turn id`.
3. Verify both direct-interrupt inputs are auto-filled.
4. Click `Direct interrupt`.

### Expected Result(s)
- Thread-id helper fills `thread id (direct interrupt)` from current selection.
- Turn-id helper fills `turn id (required)` from selected thread active turn.
- Direct interrupt can run without manual id copy/paste when active turn data exists.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel current-branch quick-fill for checkout

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Select a thread with git-backed `cwd`.

### Steps
1. Click `Read branch state`.
2. Click `Use current branch`.
3. Verify `target branch name` is auto-filled with current branch.
4. Optionally run `Checkout branch` (no-op if already on same branch).

### Expected Result(s)
- Current branch from branch-state read is cached in parity state.
- Quick-fill copies cached current branch into checkout input.
- Button stays disabled when branch is detached or branch name is unavailable.

### Rollback / Cleanup Notes
- No cleanup required unless you changed branch during validation.

## Feature: Parity panel config-batch sample template fill

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `Config write`, click `Fill sample batch`.
2. Verify `batch JSON` input is populated with a valid JSON array template.
3. Optionally click `Write batch JSON` to execute template operations.

### Expected Result(s)
- Sample button fills syntactically valid batch JSON including representative `replace` and `upsert` operations.
- Filled payload can be edited before writing.

### Rollback / Cleanup Notes
- Restore any changed config values if sample payload was executed.

## Feature: Parity panel draft clear/reset helpers

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. Enter values in pending-reply fields, config key/value fields, and config batch JSON.
2. Click `Clear reply fields`, `Clear key/value`, and `Clear batch` respectively.
3. Verify corresponding draft inputs are reset.

### Expected Result(s)
- Pending reply id/reason fields clear without affecting loaded pending list.
- Config key/value drafts clear and merge strategy resets to `upsert`.
- Config batch JSON draft clears immediately.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel search/filter clear helpers

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. Enter values in `Thread search diagnostics` query/limit and run search.
2. Click `Clear search drafts`.
3. Verify query clears, limit resets to `200`, and search counters reset.
4. In `Live notifications`, enter a filter and click `Clear filter`.

### Expected Result(s)
- Search drafts and derived counters reset without affecting other parity data.
- Notification filter clears immediately, returning stream behavior to unfiltered mode.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel suggested-path quick-fill

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Have a valid base path for project-root suggestion.

### Steps
1. Enter base path and click `Suggest root`.
2. Click `Use suggested path`.
3. Verify base-path input updates to suggested project path.
4. Optionally run `Open root`/`Open/create root` with that prefilled path.

### Expected Result(s)
- Suggest action caches suggested `path` in parity state.
- Quick-fill copies suggested path into base-path input without retyping.

### Rollback / Cleanup Notes
- No cleanup required unless root open/create operations were executed.

## Feature: Parity panel composer-search cwd quick-fill

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Select a thread that has valid `cwd`.

### Steps
1. In `Composer file search`, click `Use selected thread cwd`.
2. Verify `cwd` input is auto-filled.
3. Optionally run `Search files`.

### Expected Result(s)
- Quick-fill copies selected thread cwd into composer-search cwd draft.
- Search can run without manual cwd copy/paste.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel composer-search draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `Composer file search`, fill `cwd` and `query`, and run `Search files`.
2. Click `Clear search drafts`.

### Expected Result(s)
- `cwd` and `query` inputs clear.
- Existing composer-search summary output is reset.
- No impact on unrelated parity blocks.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel start-thread cwd quick-fill

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Select a thread with valid `cwd`.

### Steps
1. In `Archived threads` start-thread controls, click `Use selected thread cwd`.
2. Verify `start thread cwd` field is auto-filled.
3. Optionally click `Start thread`.

### Expected Result(s)
- Quick-fill copies selected thread cwd into start-thread cwd input.
- Start-thread action can run without manual cwd copy/paste.

### Rollback / Cleanup Notes
- Archive/remove any temporary thread started during validation if needed.

## Feature: Parity panel start-thread model quick-fill

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure a selected model is available in current thread context.

### Steps
1. In start-thread controls, click `Use selected model`.
2. Verify `start thread model` input is auto-filled.
3. Optionally click `Start thread`.

### Expected Result(s)
- Quick-fill copies current selected model id into start-thread model draft.
- Start-thread action can run without manual model-id typing.

### Rollback / Cleanup Notes
- No cleanup required unless extra test thread was created.

## Feature: Parity panel start-thread draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. Fill `start thread cwd` and `start thread model` fields.
2. Click `Clear start-thread drafts`.

### Expected Result(s)
- Both start-thread draft inputs are cleared.
- No other parity state is modified.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel branch-draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Optionally load branch state/worktree options and prefill checkout draft.

### Steps
1. Fill/derive branch-related drafts (`target branch name`, current-branch quick-fill, worktree-option quick-fill).
2. Click `Clear branch drafts`.

### Expected Result(s)
- Checkout target branch draft clears.
- Cached current-branch value and worktree-option cache clear.
- Worktree branch options summary is reset.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-turn draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. Fill direct start-turn and direct steer-turn draft inputs.
2. Click `Clear direct turn drafts`.

### Expected Result(s)
- Draft inputs for direct start/steer turn controls are cleared.
- No unrelated parity fields are changed.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-turn thread-id quick-fill

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure a thread is selected.

### Steps
1. In direct start/steer controls, click `Use selected thread id`.
2. Verify both `thread id (direct start turn)` and `thread id (direct steer)` are auto-filled.
3. Optionally execute direct start or direct steer actions.

### Expected Result(s)
- One helper action fills both direct-turn thread-id drafts from selected thread context.
- Reduces manual copy/paste for direct start/steer diagnostics.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-interrupt draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. Fill direct interrupt `thread id` and `turn id` fields and optionally run direct interrupt.
2. Click `Clear interrupt drafts`.

### Expected Result(s)
- Direct interrupt thread-id and turn-id drafts clear.
- Direct interrupt result text is reset.
- Other parity fields are unaffected.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel thread-by-id draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. Fill `thread id (direct read)` and run one or more by-id read actions.
2. Click `Clear by-id drafts`.

### Expected Result(s)
- By-id thread id draft clears.
- By-id detail/messages/review summaries reset.
- Cached active-turn id used by helper flows is cleared.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-thread draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. Fill direct-thread inputs: `thread id (direct archive/unarchive/rename/fork)` and `new thread name`.
2. Click `Clear direct thread drafts`.

### Expected Result(s)
- Direct-thread id draft clears.
- Direct-thread name draft clears.
- No unrelated parity state is modified.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-thread selected-id quick-fill

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure one thread is selected in the sidebar/thread context.

### Steps
1. In direct-thread action controls, click `Use selected thread id (direct thread actions)`.
2. Verify the direct-thread id field is auto-filled from current selected thread id.
3. Optionally run `Direct archive`, `Direct unarchive`, `Direct rename`, or `Direct fork`.

### Expected Result(s)
- Direct-thread id draft is filled without manual copy/paste.
- Direct thread actions can be run immediately using the selected thread context.

### Rollback / Cleanup Notes
- Undo/cleanup any direct thread action intentionally triggered during validation.

## Feature: Parity panel direct-clean draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In direct clean-by-id controls, fill `thread id for direct clean`.
2. Click `Clear clean draft`.

### Expected Result(s)
- Direct clean thread-id draft clears.
- No unrelated parity draft/state is changed.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel revert draft helpers

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Select a thread with a valid `cwd`.

### Steps
1. In revert controls, click `Use selected thread cwd`.
2. Verify revert `cwd` draft is populated from selected thread.
3. Fill `turn id for revert`.
4. Click `Clear revert drafts`.

### Expected Result(s)
- Quick-fill copies selected thread cwd into revert cwd input.
- Clear action resets both revert turn-id and revert cwd drafts.
- No unrelated parity state is changed.

### Rollback / Cleanup Notes
- No cleanup required unless a revert action was intentionally executed during validation.

## Feature: Parity panel rollback draft helpers

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In rollback controls, click `Set rollback=1`.
2. Verify `rollback turns` input becomes `1`.
3. Click `Clear rollback draft`.

### Expected Result(s)
- Default helper sets rollback draft to `1`.
- Clear helper resets rollback draft to empty value.
- No unrelated parity state is changed.

### Rollback / Cleanup Notes
- No cleanup required unless rollback action was intentionally executed during validation.

## Feature: Parity panel rollback/revert result reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Execute rollback or revert once so rollback/revert status line is visible.

### Steps
1. Click `Clear rollback/revert result`.

### Expected Result(s)
- Rollback/revert status line clears.
- Rollback/revert draft inputs remain unchanged.
- No rollback/revert RPC is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel command draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `Command exec`, enter a command draft and run once to produce output.
2. Click `Clear command drafts`.

### Expected Result(s)
- Command input draft is cleared.
- Command output preview is cleared.
- No unrelated parity state is changed.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel command-input reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Command exec`, ensure command output is visible.

### Steps
1. Enter a command draft.
2. Click `Clear command input`.

### Expected Result(s)
- Command input draft clears.
- Existing command output remains visible.
- No command execution is triggered by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel upload draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `File upload`, select a file (optionally upload once to populate result path).
2. Click `Clear upload draft`.

### Expected Result(s)
- Selected upload file name is cleared.
- Stored upload result path/summary is cleared.
- Upload action is disabled again until a file is re-selected.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel upload-result reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `File upload`, perform an upload once so result path is visible.

### Steps
1. Click `Clear upload result`.

### Expected Result(s)
- Upload result path/summary clears.
- Selected file draft remains unchanged.
- No upload request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel turn-result reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Trigger any steer/interrupt action so turn result text is visible.

### Steps
1. Click `Clear turn results`.

### Expected Result(s)
- Steer result text clears.
- Interrupt result text clears.
- No turn action RPC is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel feedback draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `Feedback upload`, change classification/log toggle/reason and optionally submit once.
2. Click `Clear feedback drafts`.

### Expected Result(s)
- Classification resets to `general`.
- Logs toggle resets to `on`.
- Reason draft clears.
- Feedback result summary clears.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel MCP OAuth draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `MCP OAuth login`, enter a server name and optionally start OAuth once.
2. Click `Clear OAuth drafts`.

### Expected Result(s)
- MCP OAuth server-name draft clears.
- MCP OAuth result summary clears.
- No unrelated parity state is changed.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel account-action draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In Account actions, enter values in `account id to switch` and `account id to remove`.
2. Click `Clear account action drafts`.

### Expected Result(s)
- Switch-account draft clears.
- Remove-account draft clears.
- No unrelated parity state is changed.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel login draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In Account login controls, enter an API key draft and/or start a login flow to populate login status.
2. Click `Clear login drafts`.

### Expected Result(s)
- API key draft clears.
- Tracked active login id clears.
- Login status/result summary clears.
- No unrelated parity state is changed.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel account summary reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Load account info at least once to populate account summaries.

### Steps
1. In Account controls, click `Clear account summaries`.

### Expected Result(s)
- Account summary line clears.
- Account login/result status line clears.
- No account session/logout/login action is triggered by this reset.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel status reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Trigger any parity action that populates error and/or thread-action status lines.

### Steps
1. Click `Clear parity status`.

### Expected Result(s)
- Parity error line is cleared.
- Parity thread-action status line is cleared.
- No action is executed against thread/account state.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel Telegram draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `Telegram status` controls, populate bot token / allowed IDs and optionally load config.
2. Click `Clear Telegram drafts`.

### Expected Result(s)
- Telegram bot-token draft clears.
- Telegram allowed-user-ids draft clears.
- Telegram config summary line clears.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel pinned-id draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `Thread state cache`, enter one or more IDs in `thread ids (comma-separated)`.
2. Click `Clear pinned-id draft`.

### Expected Result(s)
- Pinned thread ids draft input is cleared.
- No pin persistence request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel archived-limit draft helpers

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `Archived threads`, edit `fetch limit` with any value.
2. Click `Set fetch limit=12` and verify input value.
3. Click `Clear fetch limit`.

### Expected Result(s)
- Default helper sets archived fetch limit draft to `12`.
- Clear helper resets fetch limit draft to empty value.
- No archived-thread request is triggered by these helpers alone.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel model draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure model dropdown options are loaded.

### Steps
1. Select values in `Set default model` and `Set selected thread model` dropdowns.
2. Click `Clear model drafts`.

### Expected Result(s)
- Default-model draft resets to empty/unselected.
- Thread-model draft resets to empty/unselected.
- No model-setting request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel mode-draft reset to current state

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. Change `Set speed mode` and `Collaboration modes` drafts away from current values.
2. Click `Reset mode drafts`.

### Expected Result(s)
- Speed-mode draft resets to current selected speed mode.
- Collaboration-mode draft resets to current selected collaboration mode.
- No write request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel reasoning-effort draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `Reasoning effort`, change the effort draft to a different value.
2. Click `Reset effort draft`.

### Expected Result(s)
- Reasoning-effort draft resets to current selected effort (`medium` fallback when unset).
- No settings write request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel title-draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `Generate thread title`, enter a prompt and optionally generate a title.
2. Click `Clear title drafts`.

### Expected Result(s)
- Title prompt draft clears.
- Generated title preview clears.
- No title-generation or persist request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel create-directory draft helpers

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Load home directory once using `Read home directory`.

### Steps
1. In home-directory controls, click `Use home directory`.
2. Verify `directory path to create` is populated.
3. Optionally create once to populate result text, then click `Clear directory draft`.

### Expected Result(s)
- Quick-fill copies loaded home directory into create-directory path draft.
- Clear action resets create-directory path draft and result text.
- No create-directory request is sent by clear action itself.

### Rollback / Cleanup Notes
- Remove any intentionally created test directory if one was created during validation.

## Feature: Parity panel project-suggestion draft helpers

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Load home directory once using `Read home directory`.

### Steps
1. In `Project root suggestion`, click `Use home directory` and verify base-path input updates.
2. Optionally run `Suggest root` once, then click `Clear suggestion drafts`.

### Expected Result(s)
- Home-directory helper fills project-suggestion base path.
- Clear action resets base-path draft, suggestion result, and cached suggested path.
- No open/create-root request is sent by clear action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel review-draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In review controls, populate `base branch` and `path` drafts and optionally load/apply once.
2. Click `Clear review drafts`.

### Expected Result(s)
- Review base-branch draft clears.
- Review action-path draft clears.
- Review snapshot summary clears.
- No review action RPC is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel unarchive-id draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `Archived threads`, enter a value in `thread id to unarchive`.
2. Click `Clear unarchive draft`.

### Expected Result(s)
- Unarchive thread-id draft clears.
- No unarchive request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel live-notification stream-state reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Live notifications`, populate both filter draft and sample rows (start stream and wait for entries).

### Steps
1. Click `Reset stream state`.

### Expected Result(s)
- Notification filter draft clears.
- Notification sample rows clear.
- Notification received counter resets to `0`.
- Stream active/inactive state is unchanged.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel protocol-cache reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Protocol catalog`, load methods/notifications at least once.

### Steps
1. Click `Clear protocol cache`.

### Expected Result(s)
- Methods summary line is cleared.
- Notifications summary line is cleared.
- No protocol-catalog request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel home-diagnostics reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In home-directory controls, run `Read home directory` and `List home folders` at least once.

### Steps
1. Click `Clear home diagnostics`.

### Expected Result(s)
- Home folder entry count clears.
- Home parent path clears.
- Home diagnostics duration clears.
- Home directory value itself remains unchanged.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel GitHub-results reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `GitHub projects`, load either `Read GitHub projects` or `Read trending API` at least once.

### Steps
1. Click `Clear GitHub results`.

### Expected Result(s)
- GitHub projects summary line clears.
- No GitHub API request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel branch-summary reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Load `Git branch state` and `Worktree branch options` at least once.

### Steps
1. Click `Clear branch summaries`.

### Expected Result(s)
- Git branch summary line clears.
- Worktree branch options summary line clears.
- No branch read/checkout request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel available-model summary reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Available models`, click `Read available models` at least once.

### Steps
1. Click `Clear model list summary`.

### Expected Result(s)
- Available-model summary line clears.
- No model-list read request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel rate-limit summary reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In rate-limit controls, run `Read limits` and/or `Read raw rate limits` at least once.

### Steps
1. Click `Clear rate-limit summaries`.

### Expected Result(s)
- Read-rate-limits summary line clears.
- Raw-rate-limits summary line clears.
- No rate-limit read request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel model-config summary reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Run `Read current model config` and/or `Read available models` at least once.

### Steps
1. Click `Clear model-config summaries`.

### Expected Result(s)
- Current-model summary line clears.
- Available-model summary line clears.
- No model-config read request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel collaboration-summary reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Collaboration modes`, run `Read collaboration modes` and/or `Set mode` at least once.

### Steps
1. Click `Clear collaboration summary`.

### Expected Result(s)
- Collaboration-modes summary line clears.
- No collaboration-mode read/write request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel workspace-roots diagnostics reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Workspace roots state`, click `Read workspace roots` at least once.

### Steps
1. Click `Clear workspace-roots diagnostics`.

### Expected Result(s)
- Workspace-roots summary line clears.
- Loaded workspace-roots draft state is cleared (so `Write loaded roots` becomes disabled).
- No workspace-roots read/write request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel Telegram-status reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Telegram status`, click `Read Telegram status` at least once.

### Steps
1. Click `Clear Telegram status`.

### Expected Result(s)
- Telegram status summary line clears.
- No Telegram status read request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel Telegram allow-all quick-fill

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In Telegram config controls, click `Use allow-all (*)`.

### Expected Result(s)
- Telegram allowed-user-ids draft becomes `*`.
- No Telegram config write request is sent by quick-fill action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel thread-state diagnostics reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Thread state cache`, click `Load title/pin cache` at least once.

### Steps
1. Click `Clear thread-state diagnostics`.

### Expected Result(s)
- Thread-title cache count resets to `0`.
- Pinned-thread count resets to `0`.
- Duration and sample rows clear.
- No thread-state read/write request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel skills-summary reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Skills catalog`, click `Read skills` at least once.

### Steps
1. Click `Clear skills summary`.

### Expected Result(s)
- Skills summary line clears.
- No skills read request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel home-directory value reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In home-directory controls, click `Read home directory` at least once.

### Steps
1. Click `Clear home directory value`.

### Expected Result(s)
- Home directory value line clears.
- No home-directory read request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel active-account summary reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Load account data so active account summary is visible.

### Steps
1. Click `Clear active account summary`.

### Expected Result(s)
- Active account summary row clears.
- No account read/switch/logout request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel config-read summary reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Load config read data so the `Config read` block is visible.

### Steps
1. Click `Clear config read summary`.

### Expected Result(s)
- `Config read` summary block is hidden/cleared.
- No config read/write request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel pending-request summary reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Pending server requests`, click `Load pending requests` at least once.

### Steps
1. Click `Clear pending-request summaries`.

### Expected Result(s)
- Pending-request list summaries clear.
- Pending-request method summary clears.
- No pending-request read/reply RPC is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel MCP-server cache reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure MCP server rows are visible in `MCP servers` section.

### Steps
1. Click `Clear MCP server cache`.

### Expected Result(s)
- MCP server rows are cleared from the parity section.
- No MCP status reload request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel app/feature cache reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure app and experimental-feature rows are visible.

### Steps
1. Click `Clear app/feature cache`.

### Expected Result(s)
- App rows clear from parity section.
- Experimental-feature rows clear from parity section.
- No app/feature list request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel config-requirements reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure config-requirements summary line is visible.

### Steps
1. Click `Clear config requirements`.

### Expected Result(s)
- Config-requirements summary resets to `No requirements`.
- No app/parity refresh request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel write-result reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Execute at least one parity action that produces a write/result status line.

### Steps
1. In `Config write`, click `Clear write results`.

### Expected Result(s)
- Config write result line clears.
- Thread action result line clears.
- Feedback result line clears.
- No write operation is triggered by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel pending-reply mode reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `Pending server requests`, change reply mode to `deny`.
2. Click `Reset reply mode`.

### Expected Result(s)
- Reply mode returns to `approve`.
- No pending-request reply RPC is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel pending-reply result reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Send a pending-request reply once so reply result text is visible.

### Steps
1. Click `Clear reply result`.

### Expected Result(s)
- Pending-reply result/status line clears.
- No pending-request reply RPC is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel policy-draft reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `Config write`, change approval/sandbox/web-search dropdown drafts.
2. Click `Reset policy drafts`.

### Expected Result(s)
- Approval draft resets to `on-request`.
- Sandbox draft resets to `workspace-write`.
- Web-search draft resets to `live`.
- No config write request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel selected-thread diagnostics reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Select a thread and run one or more selected-thread diagnostics reads.

### Steps
1. Click `Clear selected-thread diagnostics`.

### Expected Result(s)
- Selected-thread detail/messages/review summary lines clear.
- Cached active-turn id used by direct-interrupt helper clears.
- No thread read request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel GitHub-scope reset

### Prerequisites / Setup
- Open Settings -> App parity panel.

### Steps
1. In `GitHub projects`, switch scope to a non-default value.
2. Click `Reset GitHub scope`.

### Expected Result(s)
- GitHub scope resets to `trending-daily`.
- No GitHub projects read request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel archived-thread cache reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Archived threads`, click `Load archived` at least once.

### Steps
1. Click `Clear archived cache`.

### Expected Result(s)
- Archived-thread list rows clear.
- No archived-thread load request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel thread-groups summary reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Thread groups`, click `Read thread groups` at least once.

### Steps
1. Click `Clear thread-groups summary`.

### Expected Result(s)
- Thread-groups summary line clears.
- No thread-groups read request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel home-folder-list summary reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In home-directory controls, click `List home folders` at least once.

### Steps
1. Click `Clear home folder list summary`.

### Expected Result(s)
- Home-folder entry-count summary clears.
- No home-folder listing request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel unarchive selected-thread quick-fill

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure one thread is selected.

### Steps
1. In `Archived threads`, click `Use selected thread id` next to unarchive controls.

### Expected Result(s)
- `thread id to unarchive` draft is populated with current selected thread id.
- No unarchive request is sent by quick-fill action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel error-only reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Trigger any parity error so error line is visible.

### Steps
1. Click `Clear parity error`.

### Expected Result(s)
- Parity error line clears.
- Other status lines (for example thread action result) remain unchanged.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel create-directory suggested-path quick-fill

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Generate a project suggestion so `suggested path` is available.

### Steps
1. In create-directory controls, click `Use suggested project path`.

### Expected Result(s)
- `directory path to create` draft is populated with suggested project path.
- No directory-create request is sent by quick-fill action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel suggested-path reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Generate a project suggestion so `suggested path` is populated.

### Steps
1. Click `Clear suggested path`.

### Expected Result(s)
- Cached suggested project path clears.
- Base-path draft remains unchanged.
- No suggestion/open/create request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel suggestion-result-only reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Run `Suggest root` once so suggestion result line is visible.

### Steps
1. Click `Clear suggestion result only`.

### Expected Result(s)
- Suggestion result line clears.
- Base-path draft and cached suggested path remain unchanged.
- No suggestion/open/create request is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel project-suggestion selected-cwd quick-fill

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure a thread with valid `cwd` is selected.

### Steps
1. In `Project root suggestion`, click `Use selected thread cwd`.

### Expected Result(s)
- Project-suggestion base-path draft is populated from selected thread cwd.
- No suggestion/open/create request is sent by quick-fill action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel archived-action result reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Trigger any archived-thread action that writes archived action status.

### Steps
1. In `Archived threads`, click `Clear archived action result`.

### Expected Result(s)
- Archived/action status line is cleared.
- No archived-thread RPC is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel rollback/revert full reset

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Enter values in `rollback turns`, `turn id for revert`, and `cwd for revert`.
- Ensure rollback/revert action result text is visible.

### Steps
1. In rollback/revert controls, click `Reset rollback/revert controls`.

### Expected Result(s)
- `rollback turns` draft is cleared.
- `turn id for revert` draft is cleared.
- `cwd for revert` draft is cleared.
- Rollback/revert action result line is cleared.
- No rollback/revert RPC is sent by reset action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel selected-thread cwd clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure a thread with non-empty `cwd` is selected.

### Steps
1. In `Thread controls`, click `Copy selected thread cwd` in the `Start thread` group.
2. Paste clipboard content into any text field.
3. In rollback/revert controls, click `Copy selected thread cwd` again.
4. Paste clipboard content again into any text field.

### Expected Result(s)
- Clipboard receives the selected thread `cwd` value.
- Parity action result shows `Copied selected thread cwd` on success.
- If clipboard write is blocked, parity error shows `Failed to copy selected thread cwd`.
- No thread start/revert RPC is sent by the copy action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel selected-thread id clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure a thread is selected and `selectedThreadId` is non-empty.

### Steps
1. In `Thread controls` direct-action group, click `Copy selected thread id`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the selected thread id value.
- Parity action result shows `Copied selected thread id` on success.
- If clipboard write is blocked, parity error shows `Failed to copy selected thread id`.
- No direct thread action RPC (archive/unarchive/rename/fork) is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel selected-model clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure `selectedModelId` is available (non-empty).

### Steps
1. In `Thread controls` start-thread group, click `Copy selected model`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the selected model id value.
- Parity action result shows `Copied selected model` on success.
- If clipboard write is blocked, parity error shows `Failed to copy selected model`.
- No start-thread request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-clean thread-id clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure a thread is selected and `selectedThreadId` is non-empty.

### Steps
1. In `Thread controls` direct-clean group, click `Copy selected thread id`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the selected thread id value.
- Parity action result shows `Copied selected thread id` on success.
- If clipboard write is blocked, parity error shows `Failed to copy selected thread id`.
- No direct-clean RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel current-thread action row thread-id clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure a thread is selected and `selectedThreadId` is non-empty.

### Steps
1. In `Thread controls` current-thread action row, click `Copy selected thread id`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the selected thread id value.
- Parity action result shows `Copied selected thread id` on success.
- If clipboard write is blocked, parity error shows `Failed to copy selected thread id`.
- No current-thread action RPC (resume/archive/compact/clean) is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-thread-id draft clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In direct thread actions, ensure `thread id for direct archive/unarchive/rename/fork` draft is non-empty.

### Steps
1. In direct thread actions, click `Copy direct thread id`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current direct-thread-id draft value.
- Parity action result shows `Copied direct thread id` on success.
- If clipboard write is blocked, parity error shows `Failed to copy direct thread id`.
- No direct thread RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-thread-name draft clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In direct thread actions, ensure `new thread name (for direct rename)` draft is non-empty.

### Steps
1. In direct thread actions, click `Copy direct thread name`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current direct-thread-name draft value.
- Parity action result shows `Copied direct thread name` on success.
- If clipboard write is blocked, parity error shows `Failed to copy direct thread name`.
- No direct rename RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel start-thread cwd draft clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure `start thread cwd (optional)` draft is non-empty.

### Steps
1. In `Thread controls` start-thread group, click `Copy start-thread cwd`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current start-thread cwd draft value.
- Parity action result shows `Copied start-thread cwd` on success.
- If clipboard write is blocked, parity error shows `Failed to copy start-thread cwd`.
- No start-thread RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel start-thread model draft clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure `start thread model (optional)` draft is non-empty.

### Steps
1. In `Thread controls` start-thread group, click `Copy start-thread model`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current start-thread model draft value.
- Parity action result shows `Copied start-thread model` on success.
- If clipboard write is blocked, parity error shows `Failed to copy start-thread model`.
- No start-thread RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel revert turn-id draft clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In rollback/revert controls, ensure `turn id for revert` draft is non-empty.

### Steps
1. In rollback/revert controls, click `Copy revert turn id`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current revert turn-id draft value.
- Parity action result shows `Copied revert turn id` on success.
- If clipboard write is blocked, parity error shows `Failed to copy revert turn id`.
- No revert RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel revert cwd draft clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In rollback/revert controls, ensure `cwd for revert` draft is non-empty.

### Steps
1. In rollback/revert controls, click `Copy revert cwd`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current revert cwd draft value.
- Parity action result shows `Copied revert cwd` on success.
- If clipboard write is blocked, parity error shows `Failed to copy revert cwd`.
- No revert RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel rollback-turns draft clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In rollback/revert controls, ensure `rollback turns` draft is non-empty.

### Steps
1. In rollback/revert controls, click `Copy rollback turns`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current rollback-turns draft value.
- Parity action result shows `Copied rollback turns` on success.
- If clipboard write is blocked, parity error shows `Failed to copy rollback turns`.
- No rollback RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel clean-thread-id draft clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In direct-clean controls, ensure `thread id for direct clean` draft is non-empty.

### Steps
1. In direct-clean controls, click `Copy clean thread id`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current clean-thread-id draft value.
- Parity action result shows `Copied clean thread id` on success.
- If clipboard write is blocked, parity error shows `Failed to copy clean thread id`.
- No direct-clean RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-rename selected-thread-title quick-fill

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure a thread with non-empty title is selected.

### Steps
1. In direct thread actions, click `Use selected thread title`.

### Expected Result(s)
- `new thread name (for direct rename)` draft is populated from selected thread title.
- No direct rename RPC is sent by quick-fill action itself.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-rename selected-thread-title clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure a thread with non-empty title is selected.

### Steps
1. In direct thread actions, click `Copy selected thread title`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the selected thread title value.
- Parity action result shows `Copied selected thread title` on success.
- If clipboard write is blocked, parity error shows `Failed to copy selected thread title`.
- No direct rename RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel command-output clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Run a command in `Command exec` so command output is visible.

### Steps
1. In `Command exec`, click `Copy command output`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current command output text.
- Parity action result shows `Copied command output` on success.
- If clipboard write is blocked, parity error shows `Failed to copy command output`.
- No new command execution is triggered by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel command-input clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure `Command exec` input is non-empty.

### Steps
1. In `Command exec`, click `Copy command input`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current command input text.
- Parity action result shows `Copied command input` on success.
- If clipboard write is blocked, parity error shows `Failed to copy command input`.
- No command execution is triggered by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel upload-file-name clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `File upload`, select a file so selected file name is visible.

### Steps
1. In `File upload`, click `Copy upload file name`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the selected upload file name.
- Parity action result shows `Copied upload file name` on success.
- If clipboard write is blocked, parity error shows `Failed to copy upload file name`.
- No upload request is triggered by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel upload-result clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `File upload`, run an upload so upload result text is visible.

### Steps
1. In `File upload`, click `Copy upload result`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current upload result text.
- Parity action result shows `Copied upload result` on success.
- If clipboard write is blocked, parity error shows `Failed to copy upload result`.
- No new upload request is triggered by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel steer-instruction clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Steer active turn`, enter non-empty text in `steer instruction`.

### Steps
1. Click `Copy steer instruction`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current steer instruction text.
- Parity action result shows `Copied steer instruction` on success.
- If clipboard write is blocked, parity error shows `Failed to copy steer instruction`.
- No steer request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-start-turn text clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In direct start turn controls, ensure `turn text` draft is non-empty.

### Steps
1. In direct start turn controls, click `Copy direct start turn text`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current direct-start-turn text draft.
- Parity action result shows `Copied direct start turn text` on success.
- If clipboard write is blocked, parity error shows `Failed to copy direct start turn text`.
- No direct start-turn RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-steer text clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In direct steer controls, ensure `steer text` draft is non-empty.

### Steps
1. In direct steer controls, click `Copy direct steer text`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current direct-steer text draft.
- Parity action result shows `Copied direct steer text` on success.
- If clipboard write is blocked, parity error shows `Failed to copy direct steer text`.
- No direct-steer RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-steer expected-turn-id clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In direct steer controls, ensure `expected turn id` draft is non-empty.

### Steps
1. In direct steer controls, click `Copy expected turn id`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current expected-turn-id draft.
- Parity action result shows `Copied expected turn id` on success.
- If clipboard write is blocked, parity error shows `Failed to copy expected turn id`.
- No direct-steer RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-steer thread-id clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In direct steer controls, ensure `thread id (direct steer)` draft is non-empty.

### Steps
1. In direct steer controls, click `Copy direct steer thread id`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current direct-steer thread-id draft.
- Parity action result shows `Copied direct steer thread id` on success.
- If clipboard write is blocked, parity error shows `Failed to copy direct steer thread id`.
- No direct-steer RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-interrupt turn-id clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In direct interrupt controls, ensure `turn id (required)` draft is non-empty.

### Steps
1. In direct interrupt controls, click `Copy direct interrupt turn id`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current direct-interrupt turn-id draft.
- Parity action result shows `Copied direct interrupt turn id` on success.
- If clipboard write is blocked, parity error shows `Failed to copy direct interrupt turn id`.
- No direct-interrupt RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel direct-interrupt thread-id clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In direct interrupt controls, ensure `thread id (direct interrupt)` draft is non-empty.

### Steps
1. In direct interrupt controls, click `Copy direct interrupt thread id`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current direct-interrupt thread-id draft.
- Parity action result shows `Copied direct interrupt thread id` on success.
- If clipboard write is blocked, parity error shows `Failed to copy direct interrupt thread id`.
- No direct-interrupt RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel feedback-reason clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Feedback upload`, ensure `short reason (optional)` draft is non-empty.

### Steps
1. In `Feedback upload`, click `Copy feedback reason`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current feedback reason draft.
- Parity action result shows `Copied feedback reason` on success.
- If clipboard write is blocked, parity error shows `Failed to copy feedback reason`.
- No feedback upload request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel OAuth-server-name clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `MCP OAuth login`, ensure `mcp server name` draft is non-empty.

### Steps
1. In `MCP OAuth login`, click `Copy OAuth server name`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current OAuth server-name draft.
- Parity action result shows `Copied OAuth server name` on success.
- If clipboard write is blocked, parity error shows `Failed to copy OAuth server name`.
- No OAuth-start request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel OAuth-result clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `MCP OAuth login`, run Start OAuth so result text is visible.

### Steps
1. In `MCP OAuth login`, click `Copy OAuth result`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current OAuth result text.
- Parity action result shows `Copied OAuth result` on success.
- If clipboard write is blocked, parity error shows `Failed to copy OAuth result`.
- No OAuth-start request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel config-key clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Config write`, ensure `config key` draft is non-empty.

### Steps
1. In key/value controls, click `Copy config key`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current config-key draft.
- Parity action result shows `Copied config key` on success.
- If clipboard write is blocked, parity error shows `Failed to copy config key`.
- No config write request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel config-value clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Config write`, ensure `config value` draft is non-empty.

### Steps
1. In key/value controls, click `Copy config value`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current config-value draft.
- Parity action result shows `Copied config value` on success.
- If clipboard write is blocked, parity error shows `Failed to copy config value`.
- No config write request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel config-batch-json clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Config write`, ensure `batch JSON` draft is non-empty.

### Steps
1. In batch controls, click `Copy config batch JSON`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current config-batch JSON draft.
- Parity action result shows `Copied config batch JSON` on success.
- If clipboard write is blocked, parity error shows `Failed to copy config batch JSON`.
- No config batch write request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel config-write-result clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Config write`, run any write action so write result text is visible.

### Steps
1. In write-results controls, click `Copy write result`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current config write-result text.
- Parity action result shows `Copied write result` on success.
- If clipboard write is blocked, parity error shows `Failed to copy write result`.
- No config write request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel switch-account-id clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Account` controls, ensure `account id to switch` draft is non-empty.

### Steps
1. In account switch controls, click `Copy switch account id`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current switch-account-id draft.
- Parity action result shows `Copied switch account id` on success.
- If clipboard write is blocked, parity error shows `Failed to copy switch account id`.
- No account switch request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel remove-account-id clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Account` controls, ensure `account id to remove` draft is non-empty.

### Steps
1. In remove-account controls, click `Copy remove account id`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current remove-account-id draft.
- Parity action result shows `Copied remove account id` on success.
- If clipboard write is blocked, parity error shows `Failed to copy remove account id`.
- No account remove request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel login-result clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Account` login controls, run any login action so login result text is visible.

### Steps
1. In login controls, click `Copy login result`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current login-result text.
- Parity action result shows `Copied login result` on success.
- If clipboard write is blocked, parity error shows `Failed to copy login result`.
- No login RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel API-key-draft clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Account` login controls, ensure `OpenAI API key` draft is non-empty.

### Steps
1. In API-key login controls, click `Copy API key draft`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current API-key draft.
- Parity action result shows `Copied API key draft` on success.
- If clipboard write is blocked, parity error shows `Failed to copy API key draft`.
- No API-key login request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel accounts-summary clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Account`, run `Load accounts list` or `Read account + config` so accounts summary text is visible.

### Steps
1. In account summary controls, click `Copy accounts summary`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current accounts summary text.
- Parity action result shows `Copied accounts summary` on success.
- If clipboard write is blocked, parity error shows `Failed to copy accounts summary`.
- No account load/switch/remove request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel active-account-summary clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Account`, load or refresh account data so active account summary is visible.

### Steps
1. In account summary controls, click `Copy active account summary`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives active account summary text (email, plan, type, requiresOpenaiAuth).
- Parity action result shows `Copied active account summary` on success.
- If clipboard write is blocked, parity error shows `Failed to copy active account summary`.
- No account load/switch/remove request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel config-read-summary clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure `Config read` section is visible (read account + config has populated it).

### Steps
1. In `Config read`, click `Copy config read summary`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives config read summary lines (model/provider, approval/sandbox, web_search).
- Parity action result shows `Copied config read summary` on success.
- If clipboard write is blocked, parity error shows `Failed to copy config read summary`.
- No config read/write request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel active-login-id clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Account` login controls, ensure active login id is non-empty.

### Steps
1. In account login controls, click `Copy active login id`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current active login id.
- Parity action result shows `Copied active login id` on success.
- If clipboard write is blocked, parity error shows `Failed to copy active login id`.
- No login cancel/start request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel thread-action-result clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Trigger any parity action that sets thread action result text.

### Steps
1. In parity status controls, click `Copy thread action result`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current thread action result text.
- Thread action result is replaced with `Copied thread action result` on success.
- If clipboard write is blocked, parity error shows `Failed to copy thread action result`.
- No new parity action RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel parity-error clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Trigger any parity error so error text is visible.

### Steps
1. In parity status controls, click `Copy parity error`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current parity error text.
- Thread action result shows `Copied parity error` on success.
- If clipboard write is blocked, parity error shows `Failed to copy parity error`.
- No parity RPC is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel config-summary clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure parity config summary text is visible.

### Steps
1. In parity header controls, click `Copy config summary`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives the current config summary text.
- Thread action result shows `Copied config summary` on success.
- If clipboard write is blocked, parity error shows `Failed to copy config summary`.
- No parity refresh/write request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel apps/experimental/MCP summary clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure parity surface summary line is visible.

### Steps
1. In parity header controls, click `Copy apps/experimental/MCP summary`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives summary text in format `Apps X · Experimental Y · MCP Z`.
- Thread action result shows `Copied apps/experimental/MCP summary` on success.
- If clipboard write is blocked, parity error shows `Failed to copy apps/experimental/MCP summary`.
- No parity refresh/write request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel config-requirements-JSON clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- Ensure config requirements are loaded (not null).

### Steps
1. In parity header controls, click `Copy config requirements JSON`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives pretty-printed JSON of current config requirements.
- Thread action result shows `Copied config requirements JSON` on success.
- If clipboard write is blocked, parity error shows `Failed to copy config requirements JSON`.
- No parity refresh/write request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel protocol-catalog-summary clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Protocol catalog`, load methods/notifications so cache is non-empty.

### Steps
1. Click `Copy protocol catalog summary`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives summary lines with method/notification counts and samples.
- Thread action result shows `Copied protocol catalog summary` on success.
- If clipboard write is blocked, parity error shows `Failed to copy protocol catalog summary`.
- No protocol reload request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel notifications-sample clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Live notifications`, ensure at least one notification sample is present.

### Steps
1. Click `Copy notifications sample`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives notification sample lines (up to first 10 cached samples).
- Thread action result shows `Copied notifications sample` on success.
- If clipboard write is blocked, parity error shows `Failed to copy notifications sample`.
- No stream start/stop/reset request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel notification-filter clipboard helper

### Prerequisites / Setup
- Open Settings -> App parity panel.
- In `Live notifications`, set non-empty text in method filter input.

### Steps
1. Click `Copy notification filter`.
2. Paste clipboard content into any text field.

### Expected Result(s)
- Clipboard receives current notification filter text.
- Thread action result shows `Copied notification filter` on success.
- If clipboard write is blocked, parity error shows `Failed to copy notification filter`.
- No stream start/stop/reset request is sent by this copy action.

### Rollback / Cleanup Notes
- No cleanup required.

## Feature: Parity panel pending-request methods copy helper

### Prerequisites
- Open the app and navigate to `Settings` -> `App parity`.
- In `Pending server requests`, click `Load pending requests` so the methods summary is populated.

### Steps
1. Click `Copy pending-request methods`.
2. Paste clipboard content into any text input.

### Expected Results
- Clipboard text matches the `methods:` summary shown in the pending-request section.
- `thread action result` shows `Copied pending-request methods`.
- If summary is empty, button remains disabled and no copy attempt happens.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel Codex settings categories snapshot

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Find the `Codex settings categories` block.
2. Confirm it lists category count and a comma-separated category summary.
3. Click `Copy settings categories`.
4. Paste clipboard text into an input area.

### Expected Results
- Category list includes Codex settings taxonomy entries (for example `account`, `agent`, `appearance`, `mcp-settings`, `usage`, `worktrees`).
- `count` matches the number of listed categories.
- Clipboard contains the same comma-separated category summary shown in the panel.
- `thread action result` shows `Copied settings categories`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel settings heading group summaries

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. In `Codex settings categories`, verify `heading app` and `heading connection` summary lines are visible.
2. Click `Copy app group` and paste clipboard content.
3. Click `Copy connection group` and paste clipboard content.

### Expected Results
- `heading app` contains app-level categories (for example `account`, `agent`, `appearance`, `usage`).
- `heading connection` contains connection/integration categories (for example `mcp-settings`, `plugins-settings`, `skills-settings`, `worktrees`).
- Copy actions set `thread action result` to `Copied app settings group` and `Copied connection settings group` respectively.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel settings coverage inspector

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. In `Codex settings categories`, inspect `supported` and `missing` lines.
2. Click `Copy supported categories` and paste clipboard text.
3. Click `Copy missing categories` and paste clipboard text.

### Expected Results
- `supported` line lists categories currently represented by parity controls.
- `missing` line lists remaining Codex settings categories not yet represented.
- Copy actions set `thread action result` to:
  - `Copied supported settings categories`
  - `Copied missing settings categories`

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel settings focus-category controls

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Use first missing` and observe `focus category` input.
2. Click `Copy focus category` and paste clipboard text.
3. Click `Use first supported` and repeat copy/paste.
4. Click `Clear focus`.

### Expected Results
- `Use first missing` fills the input with the first item from `missing` categories.
- `Use first supported` fills the input with the first item from `supported` categories.
- Copy action sets `thread action result` to `Copied focus settings category` and clipboard matches input value.
- `Clear focus` clears the input.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel personalization draft controls

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Personalization parity`.

### Steps
1. Change tone, avatar, and memory selectors to non-default values.
2. Verify summary line updates immediately.
3. Click `Copy personalization summary` and paste clipboard text.
4. Click `Reset personalization`.

### Expected Results
- Summary line always reflects current selector values in format `tone=... · avatar=... · memory=...`.
- Copy action sets `thread action result` to `Copied personalization summary`.
- Clipboard matches the visible summary line.
- Reset returns selectors to defaults: `friendly`, `default`, `enabled`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel usage draft controls

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Usage parity`.

### Steps
1. Change auto top-up selector and monthly budget value.
2. Confirm summary line updates immediately.
3. Click `Copy usage summary` and paste clipboard text.
4. Click `Reset usage`.

### Expected Results
- Summary line follows format `autoTopUp=... · budgetUsd=...`.
- Copy action sets `thread action result` to `Copied usage summary`.
- Clipboard matches visible summary line.
- Reset returns values to defaults: `auto top-up disabled` and budget `0`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel appearance draft controls

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Appearance parity`.

### Steps
1. Change theme and density selectors.
2. Confirm summary line updates immediately.
3. Click `Copy appearance summary` and paste clipboard text.
4. Click `Reset appearance`.

### Expected Results
- Summary line follows format `theme=... · density=...`.
- Copy action sets `thread action result` to `Copied appearance summary`.
- Clipboard matches visible summary line.
- Reset returns defaults: `system` theme and `comfortable` density.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel data controls draft controls

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Data controls parity`.

### Steps
1. Change telemetry and training selectors.
2. Confirm summary line updates immediately.
3. Click `Copy data controls summary` and paste clipboard text.
4. Click `Reset data controls`.

### Expected Results
- Summary line follows format `telemetry=... · training=...`.
- Copy action sets `thread action result` to `Copied data controls summary`.
- Clipboard matches visible summary line.
- Reset returns defaults: telemetry `enabled` and training `enabled`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel computer-use draft controls

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Computer-use parity`.

### Steps
1. Change mode and vision selectors.
2. Confirm summary line updates immediately.
3. Click `Copy computer-use summary` and paste clipboard text.
4. Click `Reset computer-use`.

### Expected Results
- Summary line follows format `mode=... · vision=...`.
- Copy action sets `thread action result` to `Copied computer-use summary`.
- Clipboard matches visible summary line.
- Reset returns defaults: mode `ask`, vision `enabled`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel general-settings draft controls

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `General settings parity`.

### Steps
1. Change notifications and menu bar selectors.
2. Confirm summary line updates immediately.
3. Click `Copy general settings summary` and paste clipboard text.
4. Click `Reset general settings`.

### Expected Results
- Summary line follows format `notifications=... · menuBar=...`.
- Copy action sets `thread action result` to `Copied general settings summary`.
- Clipboard matches visible summary line.
- Reset returns defaults: notifications `enabled`, menu bar `enabled`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel local-environments draft controls

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Local environments parity`.

### Steps
1. Change environment name and shell.
2. Confirm summary line updates immediately.
3. Click `Copy local env summary` and paste clipboard text.
4. Click `Reset local env`.

### Expected Results
- Summary line follows format `name=... · shell=...`.
- Copy action sets `thread action result` to `Copied local environment summary`.
- Clipboard matches visible summary line.
- Reset returns defaults: name `local-default`, shell `zsh`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel plugins-settings draft controls

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Plugins settings parity`.

### Steps
1. Change plugins enabled selector and plugin source value.
2. Confirm summary line updates immediately.
3. Click `Copy plugins summary` and paste clipboard text.
4. Click `Reset plugins`.

### Expected Results
- Summary line follows format `plugins=... · source=...`.
- Copy action sets `thread action result` to `Copied plugins summary`.
- Clipboard matches visible summary line.
- Reset returns defaults: plugins `enabled`, source `marketplace`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity coverage model updated after missing-slice implementation

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Inspect `supported` and `missing` summary lines.
2. Confirm previously implemented slices (`appearance`, `computer-use`, `data-controls`, `general-settings`, `local-environments`, `personalization`, `plugins-settings`, `usage`) are in `supported`.
3. Verify `missing` count is reduced accordingly.

### Expected Results
- Newly implemented category slices appear in `supported`.
- `missing` summary excludes those categories.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel connections draft controls

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Connections parity`.

### Steps
1. Change remote host, status, and auth selectors.
2. Confirm summary line updates immediately.
3. Click `Copy connections summary` and paste clipboard text.
4. Click `Reset connections`.

### Expected Results
- Summary line follows format `host=... · status=... · auth=...`.
- Copy action sets `thread action result` to `Copied connections summary`.
- Clipboard matches visible summary line.
- Reset returns defaults: host `localhost`, status `connected`, auth `token`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel environments draft controls

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Environments parity`.

### Steps
1. Change environment label and type.
2. Confirm summary line updates immediately.
3. Click `Copy environments summary` and paste clipboard text.
4. Click `Reset environments`.

### Expected Results
- Summary line follows format `name=... · type=...`.
- Copy action sets `thread action result` to `Copied environments summary`.
- Clipboard matches visible summary line.
- Reset returns defaults: name `default`, type `local`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel settings coverage summary copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Inspect the `coverage:` line.
2. Click `Copy coverage summary`.
3. Paste clipboard text into any input area.

### Expected Results
- Coverage line shows `supported/total (percent%)` format.
- Copy action sets `thread action result` to `Copied settings coverage summary`.
- Clipboard text matches the visible coverage value.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel worktrees draft controls

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Worktrees parity`.

### Steps
1. Change auto cleanup selector and repository path.
2. Confirm summary line updates immediately.
3. Click `Copy worktrees summary` and paste clipboard text.
4. Click `Reset worktrees`.

### Expected Results
- Summary line follows format `autoCleanup=... · repository=...`.
- Copy action sets `thread action result` to `Copied worktrees summary`.
- Clipboard matches visible summary line.
- Reset returns defaults: auto cleanup `enabled`, repository empty.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel git-settings draft controls

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Git settings parity`.

### Steps
1. Change default branch and auto-fetch selector.
2. Confirm summary line updates immediately.
3. Click `Copy git settings summary` and paste clipboard text.
4. Click `Reset git settings`.

### Expected Results
- Summary line follows format `defaultBranch=... · autoFetch=...`.
- Copy action sets `thread action result` to `Copied git settings summary`.
- Clipboard matches visible summary line.
- Reset returns defaults: branch `main`, auto-fetch `enabled`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel settings completion state

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Inspect the `completion:` line.
2. Click `Copy completion state`.
3. Paste clipboard text into any input area.

### Expected Results
- `completion` shows `complete` when `missing` count is zero, otherwise `incomplete`.
- Copy action sets `thread action result` to `Copied settings completion state`.
- Clipboard text matches the visible completion value.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel settings snapshot JSON copy

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Adjust at least one draft field in any parity subsection (for example appearance theme).
2. Click `Copy settings snapshot JSON`.
3. Paste clipboard content into a text editor.

### Expected Results
- Clipboard contains valid JSON.
- JSON includes category coverage fields and subsection objects (`personalization`, `usage`, `appearance`, `dataControls`, `computerUse`, `general`, `localEnvironments`, `plugins`, `connections`, `environments`, `worktrees`, `git`).
- Copy action sets `thread action result` to `Copied settings snapshot JSON`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel missing-features report copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy missing-features report`.
2. Paste clipboard content into a markdown-capable editor.

### Expected Results
- Report is markdown text with heading `Codex Settings Parity Report`.
- Report includes coverage/completion totals and a `Missing Categories` section.
- If no missing categories remain, section shows `- (none)`.
- Copy action sets `thread action result` to `Copied missing-features report`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel changelog entry copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity changelog entry`.
2. Paste clipboard content into a markdown-capable editor.

### Expected Results
- Clipboard contains markdown heading in format `## Parity Update (YYYY-MM-DD)`.
- Entry includes `Coverage`, `Completion`, and `Missing categories` lines.
- Copy action sets `thread action result` to `Copied parity changelog entry`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel checklist copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity checklist`.
2. Paste clipboard content into a markdown-capable editor.

### Expected Results
- Clipboard contains heading `Codex Settings Parity Checklist`.
- Checklist includes coverage/completion lines and category checklist rows (`- [x] name` or `- [ ] name`).
- Copy action sets `thread action result` to `Copied parity checklist`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel metrics line copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity metrics line`.
2. Paste clipboard content into a plain text input.

### Expected Results
- Clipboard contains a single-line summary including date, coverage, completion, and missing count.
- Copy action sets `thread action result` to `Copied parity metrics line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel badge text copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity badge text`.
2. Paste clipboard content into a plain text input.

### Expected Results
- Clipboard contains `parity:<completion> (<coverage>)` format.
- Copy action sets `thread action result` to `Copied parity badge text`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel release-note block copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity release-note block`.
2. Paste clipboard content into a markdown-capable editor.

### Expected Results
- Clipboard contains a markdown section starting with `### Codex App Parity`.
- Block includes coverage, completion, missing count, and date snapshot.
- Copy action sets `thread action result` to `Copied parity release-note block`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel handoff packet copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity handoff packet`.
2. Paste clipboard content into a markdown-capable editor.

### Expected Results
- Clipboard contains a multi-section markdown packet with coverage/completion, checklist, and release-note section.
- Copy action sets `thread action result` to `Copied parity handoff packet`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel self-check action

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Run parity self-check`.

### Expected Results
- `thread action result` shows `Parity self-check PASS` when missing categories are zero and completion is `complete`.
- If parity is incomplete, result should show `FAIL` and parity error should explain missing/completion mismatch.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel self-check result copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity self-check result`.
2. Paste clipboard content into a plain text input.

### Expected Results
- Clipboard contains `Parity self-check <PASS|FAIL> · coverage=... · missing=...`.
- Copy action sets `thread action result` to `Copied parity self-check result`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel verification stamp copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity verification stamp`.
2. Paste clipboard text into a plain text input.

### Expected Results
- Clipboard contains `parity-verified <ISO_TIMESTAMP> coverage=... completion=...` format.
- Copy action sets `thread action result` to `Copied parity verification stamp`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel JSON line copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity JSON line`.
2. Paste clipboard text into a plain text input.

### Expected Results
- Clipboard contains one-line JSON with keys: `t`, `coverage`, `completion`, `missing`.
- Copy action sets `thread action result` to `Copied parity JSON line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel global settings-drafts reset

### Prerequisites
- Open `Settings` -> `App parity`.
- Change values in multiple parity slices (for example appearance, usage, connections).

### Steps
1. Click `Reset all parity drafts`.

### Expected Results
- All parity slice drafts reset to their defined defaults.
- Focus category draft is cleared.
- No error is shown for normal reset flow.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel self-check status indicator

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Observe `self-check` line before running validation.
2. Click `Run parity self-check`.
3. Click `Copy parity self-check result`.

### Expected Results
- `self-check` starts as `not-run`.
- After validation/copy, it updates to `PASS` or `FAIL` consistently with current parity state.
- Action result and status line stay aligned.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel self-check last-run timestamp

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Confirm `self-check last-run` is visible.
2. Click `Run parity self-check`.
3. Click `Copy parity self-check result`.

### Expected Results
- `self-check last-run` starts as `never` before checks run.
- After running/copying self-check, it updates to an ISO timestamp.
- Timestamp refreshes on subsequent self-check operations.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel status bundle copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity status bundle`.
2. Paste clipboard content into a plain text input.

### Expected Results
- Clipboard contains one line with `coverage`, `completion`, `selfCheck`, and `lastRun` fields.
- Copy action sets `thread action result` to `Copied parity status bundle`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel summary markdown copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity summary markdown`.
2. Paste clipboard content into a markdown-capable editor.

### Expected Results
- Clipboard contains `## Parity Summary` with coverage/completion/self-check/last-run bullets.
- Copy action sets `thread action result` to `Copied parity summary markdown`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel self-check status reset

### Prerequisites
- Open `Settings` -> `App parity`.
- Run `Run parity self-check` at least once so status/timestamp are populated.

### Steps
1. Click `Reset self-check status`.

### Expected Results
- `self-check` returns to `not-run`.
- `self-check last-run` returns to `never`.
- `thread action result` shows `Reset parity self-check status`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel audit trail copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity audit trail`.
2. Paste clipboard content into a markdown-capable editor.

### Expected Results
- Clipboard contains `# Parity Audit Trail` section.
- Content includes coverage, completion, self-check status, self-check last-run, and generation timestamp.
- Copy action sets `thread action result` to `Copied parity audit trail`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel heartbeat line copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity heartbeat line`.
2. Paste clipboard content into a plain text input.

### Expected Results
- Clipboard contains one line starting with `parity_heartbeat|` and fields for coverage/completion/selfcheck/timestamp.
- Copy action sets `thread action result` to `Copied parity heartbeat line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel evidence bundle JSON copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity evidence bundle JSON`.
2. Paste clipboard content into a text editor.

### Expected Results
- Clipboard contains pretty JSON with `generatedAt`, `categories`, `selfCheck`, and `statusBundle`.
- Copy action sets `thread action result` to `Copied parity evidence bundle JSON`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel CSV line copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity CSV line`.
2. Paste clipboard content into a plain text editor.

### Expected Results
- Clipboard contains one CSV row with quoted columns for timestamp, coverage, completion, missing count, self-check status, and self-check last-run.
- Copy action sets `thread action result` to `Copied parity CSV line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel YAML block copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity YAML block`.
2. Paste clipboard content into a text editor.

### Expected Results
- Clipboard contains YAML with `parity` root and keys for coverage/completion/missing/self_check/generated_at.
- Copy action sets `thread action result` to `Copied parity YAML block`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel TOML block copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity TOML block`.
2. Paste clipboard content into a text editor.

### Expected Results
- Clipboard contains TOML with `[parity]` and `[parity.self_check]` sections.
- Copy action sets `thread action result` to `Copied parity TOML block`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel XML block copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity XML block`.
2. Paste clipboard content into a text editor.

### Expected Results
- Clipboard contains XML with `<parity>` root and child fields for coverage/completion/missing/selfCheck/generatedAt.
- Copy action sets `thread action result` to `Copied parity XML block`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel plain-text block copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity plain-text block`.
2. Paste clipboard content into a plain text editor.

### Expected Results
- Clipboard contains a readable multi-line plain-text summary starting with `PARITY STATUS`.
- Copy action sets `thread action result` to `Copied parity plain-text block`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel env vars block copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity env vars block`.
2. Paste clipboard content into a plain text editor.

### Expected Results
- Clipboard contains newline-separated shell-style variables:
  `PARITY_COVERAGE`, `PARITY_COMPLETION`, `PARITY_MISSING`, `PARITY_SELF_CHECK`, `PARITY_SELF_CHECK_LAST_RUN`, `PARITY_GENERATED_AT`.
- Copy action sets `thread action result` to `Copied parity env vars block`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel NDJSON line copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity NDJSON line`.
2. Paste clipboard text into a plain text editor.

### Expected Results
- Clipboard contains one JSON object line suitable for NDJSON streams.
- Object includes `type`, `t`, `coverage`, `completion`, `missing`, `selfCheck`, and `selfCheckLastRun`.
- Copy action sets `thread action result` to `Copied parity NDJSON line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel markdown table copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity markdown table`.
2. Paste clipboard content into a markdown-capable editor.

### Expected Results
- Clipboard contains a valid markdown table with `Metric` and `Value` columns.
- Rows include coverage, completion, missing, self-check, and self-check last-run.
- Copy action sets `thread action result` to `Copied parity markdown table`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel INI block copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity INI block`.
2. Paste clipboard content into a text editor.

### Expected Results
- Clipboard contains INI-style lines under `[parity]`.
- Keys include coverage/completion/missing/self_check/self_check_last_run/generated_at.
- Copy action sets `thread action result` to `Copied parity INI block`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel HTML block copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity HTML block`.
2. Paste clipboard content into an HTML-capable editor.

### Expected Results
- Clipboard contains an HTML `<section class="parity-status">` with parity status fields.
- Copy action sets `thread action result` to `Copied parity HTML block`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel markdown list copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity markdown list`.
2. Paste clipboard content into a markdown-capable editor.

### Expected Results
- Clipboard contains markdown bullet lines for coverage/completion/missing/self-check/last-run.
- Copy action sets `thread action result` to `Copied parity markdown list`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel tuple copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity tuple`.
2. Paste clipboard into plain text input.

### Expected Results
- Clipboard contains tuple `coverage|completion|missing|selfCheck`.
- Copy action sets `thread action result` to `Copied parity tuple`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel compact code copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity compact code`.
2. Paste clipboard content into a plain text input.

### Expected Results
- Clipboard contains short code format like `P:x|M:0|S:P`.
- Copy action sets `thread action result` to `Copied parity compact code`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity panel key-value list copy

### Prerequisites
- Open `Settings` -> `App parity`.
- Locate `Codex settings categories`.

### Steps
1. Click `Copy parity key-value list`.
2. Paste clipboard text into a plain text editor.

### Expected Results
- Clipboard contains newline-separated `key=value` lines.
- Keys include coverage/completion/missing/selfCheck/selfCheckLastRun.
- Copy action sets `thread action result` to `Copied parity key-value list`.

### Rollback/Cleanup
- No cleanup required.

## Feature: macOS settings parity — Show in menu bar toggle

### Prerequisites
- Run on macOS.
- Open `Settings` in the sidebar.

### Steps
1. Locate `Show in menu bar` in the main settings list.
2. Click the row once.
3. Click the row again.

### Expected Results
- The `Show in menu bar` row is visible on macOS.
- The toggle indicator flips on each click.
- Value persists across settings close/reopen (stored in local preference key).

### Rollback/Cleanup
- Set toggle back to the original state if needed.

## Feature: App parity lists show full inventories (no top-5 truncation)

### Prerequisites
- Open `Settings` -> `App parity`.
- Ensure there are more than 5 entries in at least one list (Apps, Experimental features, or MCP servers).

### Steps
1. Open the `Apps` section and count visible rows.
2. Open the `Experimental features` section and count visible rows.
3. Open the `MCP servers` section and count visible rows.

### Expected Results
- Lists are not capped to the first 5 entries.
- All returned rows from parity loaders are rendered for each section.

### Rollback/Cleanup
- No cleanup required.

## Feature: App parity self-check uses live diagnostics coverage

### Prerequisites
- Open `Settings` -> `App parity`.
- Keep parity diagnostics in default unloaded state first.

### Steps
1. Observe `supported`, `missing`, and `coverage` before loading extra diagnostics.
2. Click parity loaders (for example: `Load skills catalog`, `Read rate limits`, `Load workspace roots state`, `Load git branch state`).
3. Observe `supported`, `missing`, and `coverage` again.
4. Click `Run parity self-check`.

### Expected Results
- `supported/missing/coverage` values change based on loaded live diagnostics.
- Self-check result reflects live-derived coverage state instead of a static full-pass baseline.

### Rollback/Cleanup
- Optional: click reset/clear actions in parity diagnostics sections.

## Feature: Refresh parity also refreshes protocol + pending requests

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Load protocol catalog` and `Load pending requests`.
2. Trigger any state change (for example, open/close settings or click `Refresh parity`).
3. Click `Refresh parity`.

### Expected Results
- Refresh also rehydrates protocol catalog summary (`methods/notifications`).
- Refresh also rehydrates pending request summary (`count/methods`).
- No stale protocol/pending-request snapshot remains after refresh.

### Rollback/Cleanup
- No cleanup required.

## Feature: Save parity drafts snapshot to config via batch write

### Prerequisites
- Open `Settings` -> `App parity`.
- Change one or more parity draft controls (for example `Appearance parity` or `General settings parity`).

### Steps
1. Click `Save parity drafts (config)` in `Codex settings categories`.
2. Observe write status output.
3. Click `Read account + config` in the `Account` parity block.

### Expected Results
- Save action completes without error.
- Write status shows `Saved parity drafts snapshot via config/batchWrite`.
- Thread action result indicates parity draft snapshot was saved.

### Rollback/Cleanup
- Optional: remove `parity_drafts.*` keys using config write tools.

## Feature: App parity shows load warnings for empty/unavailable sections

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Inspect parity metadata area under the summary lines.
3. Verify warnings appear when a section is empty/unavailable.

### Expected Results
- Warnings are rendered as `warning: ...` lines for empty critical sections:
  - Apps list
  - Experimental features list
  - MCP server list
  - Config requirements
- Warnings clear and repopulate on each refresh.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy and clear parity load warnings

### Prerequisites
- Open `Settings` -> `App parity`.
- Ensure at least one `warning: ...` line is visible.

### Steps
1. Click `Copy parity load warnings`.
2. Paste clipboard into a text editor.
3. Click `Clear load warnings`.

### Expected Results
- Clipboard contains newline-separated warning lines.
- Thread action result reports `Copied parity load warnings`.
- Warning list clears immediately after `Clear load warnings`.

### Rollback/Cleanup
- Click `Refresh parity` to regenerate warnings when applicable.

## Feature: Refresh parity warns on empty protocol/pending diagnostics

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Inspect warning lines in the parity metadata area.

### Expected Results
- If protocol catalog is empty, warning includes protocol catalog availability note.
- If pending requests are empty, warning includes pending request feed note.
- Warnings are present alongside other parity load warnings after refresh.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity warnings summary line and copy action

### Prerequisites
- Open `Settings` -> `App parity`.
- Ensure warnings are present.

### Steps
1. Confirm `warnings: <count>` line is visible.
2. Click `Copy parity warnings summary`.
3. Paste clipboard into a text field.

### Expected Results
- Summary line shows current warning count.
- Clipboard contains compact summary (`warnings=<n> · first=<warning>`).
- Thread action result reports `Copied parity warnings summary`.

### Rollback/Cleanup
- Use `Clear load warnings` if needed.

## Feature: Parity last-refresh summary and copy action

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Confirm `last refresh: ...` line updates.
3. Click `Copy parity refresh summary`.
4. Paste clipboard content into a text field.

### Expected Results
- Last-refresh line includes ISO timestamp and duration in milliseconds.
- Clipboard contains the same refresh summary text.
- Thread action result reports `Copied parity refresh summary`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity load warnings are deduplicated per refresh

### Prerequisites
- Open `Settings` -> `App parity`.
- Ensure one or more warning conditions are present.

### Steps
1. Click `Refresh parity` repeatedly (3+ times).
2. Inspect warning list.

### Expected Results
- Identical warning messages appear only once per refresh result set.
- Warning count reflects unique warnings, not accumulated duplicates.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity warnings JSON payload

### Prerequisites
- Open `Settings` -> `App parity`.
- Ensure warnings exist.

### Steps
1. Click `Copy parity warnings JSON`.
2. Paste clipboard content into a JSON viewer/editor.

### Expected Results
- Clipboard contains valid JSON with:
  - `timestamp`
  - `lastRefresh`
  - `warningCount`
  - `warnings` array
- Thread action result reports `Copied parity warnings JSON`.

### Rollback/Cleanup
- Use `Clear load warnings` if needed.

## Feature: Clear parity diagnostics snapshot

### Prerequisites
- Open `Settings` -> `App parity`.
- Ensure parity diagnostics have loaded at least once.

### Steps
1. Click `Clear diagnostics snapshot` in App parity header.
2. Inspect parity metadata and diagnostics sections.

### Expected Results
- Last refresh resets to `never`.
- Warnings list clears.
- Protocol and pending diagnostics summaries clear.
- Thread action result reports `Cleared parity diagnostics snapshot`.

### Rollback/Cleanup
- Click `Refresh parity` to repopulate diagnostics.

## Feature: Copy full parity diagnostics JSON snapshot

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity` once.
2. Click `Copy full parity diagnostics JSON`.
3. Paste clipboard into a JSON viewer.

### Expected Results
- Clipboard contains valid JSON snapshot with refresh metadata, surface counts, warnings, protocol/pending summaries, and coverage block.
- Thread action result reports `Copied full parity diagnostics JSON`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics markdown snapshot

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics markdown`.
3. Paste clipboard content into a markdown editor.

### Expected Results
- Clipboard contains markdown with refresh/surface/coverage summary.
- Markdown includes warning bullets plus protocol and pending-request sections.
- Thread action result reports `Copied parity diagnostics markdown`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics TSV snapshot

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics TSV`.
3. Paste clipboard into a spreadsheet.

### Expected Results
- Clipboard content is tab-separated with `field`/`value` rows.
- Includes refresh, surface, coverage/completion, warning count, protocol, and pending-request rows.
- Thread action result reports `Copied parity diagnostics TSV`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Diagnostics exports include parity snapshot ID

### Prerequisites
- Open `Settings` -> `App parity`.
- Click `Refresh parity` at least once.

### Steps
1. Click `Copy full parity diagnostics JSON` and verify `snapshotId` exists.
2. Click `Copy parity diagnostics markdown` and verify `Snapshot ID:` line exists.
3. Click `Copy parity diagnostics TSV` and verify `snapshot_id` row exists.

### Expected Results
- All major diagnostics export formats include a consistent snapshot identifier for correlation.

### Rollback/Cleanup
- No cleanup required.

## Feature: Diagnostics include warnings fingerprint

### Prerequisites
- Open `Settings` -> `App parity`.
- Ensure warnings exist (or none) after refresh.

### Steps
1. Check `warnings fingerprint` line in parity metadata.
2. Copy JSON/Markdown/TSV diagnostics exports.
3. Verify fingerprint field/line/row is present in each export format.

### Expected Results
- Fingerprint is deterministic for current warning set.
- Exports include matching fingerprint value for correlation.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity warnings fingerprint

### Prerequisites
- Open `Settings` -> `App parity`.
- Ensure warning fingerprint is not `none`.

### Steps
1. Click `Copy warnings fingerprint`.
2. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains fingerprint text (format `wf-...`).
- Thread action result reports `Copied parity warnings fingerprint`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity correlation key

### Prerequisites
- Open `Settings` -> `App parity`.
- Run `Refresh parity` at least once.

### Steps
1. Click `Copy parity correlation key`.
2. Paste clipboard into a text field.

### Expected Results
- Clipboard contains `<snapshot-id>::<warnings-fingerprint>`.
- Thread action result reports `Copied parity correlation key`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics compact line

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics compact line`.
3. Paste clipboard into a plain text field.

### Expected Results
- Clipboard contains a single-line summary with snapshot, refresh, coverage/completion, warnings/fingerprint, and app/exp/mcp/pending counts.
- Thread action result reports `Copied parity diagnostics compact line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics NDJSON line

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics NDJSON`.
3. Paste clipboard content into a plain text editor.

### Expected Results
- Clipboard contains one-line JSON suitable for NDJSON/log ingestion.
- Includes snapshot/correlation and key count fields.
- Thread action result reports `Copied parity diagnostics NDJSON`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics env block

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics env block`.
3. Paste clipboard content into a text editor.

### Expected Results
- Clipboard contains newline-separated `KEY=VALUE` lines.
- Includes snapshot, coverage/completion, warnings, and key count fields.
- Thread action result reports `Copied parity diagnostics env block`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics YAML snapshot

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics YAML`.
3. Paste clipboard content into a text editor.

### Expected Results
- Clipboard contains YAML-style diagnostics block with snapshot, refresh, surface counts, coverage, and warnings fingerprint/count.
- Thread action result reports `Copied parity diagnostics YAML`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics INI snapshot

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics INI`.
3. Paste clipboard content into a text editor.

### Expected Results
- Clipboard contains INI-style diagnostics with `[parity]` and `[surface]` sections.
- Includes snapshot, refresh, coverage/completion, warning metrics, and key count fields.
- Thread action result reports `Copied parity diagnostics INI`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics XML snapshot

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics XML`.
3. Paste clipboard content into an XML-aware editor.

### Expected Results
- Clipboard contains well-formed XML-style diagnostics payload with snapshot/refresh/coverage/warnings and surface counts.
- Thread action result reports `Copied parity diagnostics XML`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics HTML snapshot

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics HTML`.
3. Paste clipboard content into an HTML-aware editor.

### Expected Results
- Clipboard contains HTML snippet with summary, warnings list, and key count details.
- Thread action result reports `Copied parity diagnostics HTML`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics plain report

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics plain report`.
3. Paste clipboard content into a text editor.

### Expected Results
- Clipboard contains readable multiline diagnostics report with snapshot, coverage/completion, warning metrics/list, and surface counts.
- Thread action result reports `Copied parity diagnostics plain report`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics checklist

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics checklist`.
3. Paste clipboard content into a markdown editor.

### Expected Results
- Clipboard contains checklist-style markdown with parity readiness checks and metadata.
- Thread action result reports `Copied parity diagnostics checklist`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics minimal JSON

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics minimal JSON`.
3. Paste clipboard content into a text editor.

### Expected Results
- Clipboard contains compact one-line JSON with snapshot/fingerprint/coverage and warning count.
- Thread action result reports `Copied parity diagnostics minimal JSON`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics query string

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics query string`.
3. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains URL query-string style key/value output (`snapshot=...&coverage=...`).
- Includes refresh, coverage/completion, warning, and surface count fields.
- Thread action result reports `Copied parity diagnostics query string`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics table row

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics table row`.
3. Paste clipboard content into a markdown table or spreadsheet row.

### Expected Results
- Clipboard contains single pipe-delimited row with snapshot, refresh, coverage/completion, warnings/fingerprint, and count columns.
- Thread action result reports `Copied parity diagnostics table row`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics markdown table

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics markdown table`.
3. Paste clipboard content into a markdown editor.

### Expected Results
- Clipboard contains markdown table with header, divider, and one diagnostics row.
- Row includes snapshot, refresh, coverage/completion, warning metrics, and core count columns.
- Thread action result reports `Copied parity diagnostics markdown table`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics badge

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics badge`.
3. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains a compact badge-like status line with snapshot, coverage, and warnings fingerprint.
- Thread action result reports `Copied parity diagnostics badge`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics CLI args

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics CLI args`.
3. Paste clipboard content into a terminal or text editor.

### Expected Results
- Clipboard contains space-separated `--parity-...=...` argument tokens.
- Includes snapshot, coverage/completion, warning metrics, and core counts.
- Thread action result reports `Copied parity diagnostics CLI args`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics shell export block

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics shell export`.
3. Paste clipboard content into a shell script or terminal.

### Expected Results
- Clipboard contains multiline `export PARITY_...="..."` statements.
- Includes snapshot, coverage/completion, warnings/fingerprint, and core counts.
- Thread action result reports `Copied parity diagnostics shell export`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics .properties block

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics .properties`.
3. Paste clipboard content into a text editor.

### Expected Results
- Clipboard contains newline-separated `key=value` lines using `parity.*` keys.
- Includes snapshot, coverage/completion, warnings/fingerprint, and surface counts.
- Thread action result reports `Copied parity diagnostics .properties`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics markdown bullets

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics markdown bullets`.
3. Paste clipboard content into markdown-capable text area.

### Expected Results
- Clipboard contains concise bullet list with snapshot, refresh, coverage/completion, warnings, and surface counts.
- Thread action result reports `Copied parity diagnostics markdown bullets`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics CSV block

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics CSV block`.
3. Paste clipboard content into a spreadsheet or CSV viewer.

### Expected Results
- Clipboard contains CSV with one header line and one value row.
- Includes snapshot, refresh, coverage/completion, warning metrics, and surface counts.
- Thread action result reports `Copied parity diagnostics CSV block`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics key-value block

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics key-value block`.
3. Paste clipboard content into a plain text editor.

### Expected Results
- Clipboard contains sorted `parity.*=...` lines.
- Includes snapshot, refresh, coverage/completion, warnings, and core counts.
- Thread action result reports `Copied parity diagnostics key-value block`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics JSON array item

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics JSON array item`.
3. Paste clipboard content into a JSON array context.

### Expected Results
- Clipboard contains one JSON object followed by a trailing comma.
- Includes snapshot, coverage/completion, warning metrics, and core counts.
- Thread action result reports `Copied parity diagnostics JSON array item`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity diagnostics status sentence

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity diagnostics status sentence`.
3. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains one human-readable status sentence summarizing snapshot, refresh, completion/coverage, warnings/fingerprint, and surface counts.
- Thread action result reports `Copied parity diagnostics status sentence`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity refresh latency line

### Prerequisites
- Open `Settings` -> `App parity`.
- Click `Refresh parity` at least once.

### Steps
1. Click `Copy parity refresh latency line`.
2. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains `parity_refresh_latency_ms=... parity_refresh_latency_s=...`.
- Thread action result reports `Copied parity refresh latency line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity warning list inline

### Prerequisites
- Open `Settings` -> `App parity`.
- Ensure warnings are present.

### Steps
1. Click `Copy parity warning list inline`.
2. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains warnings joined on one line separated by ` ; `.
- Thread action result reports `Copied parity warning list inline`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity warning count line

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Copy parity warning count line`.
2. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains `parity_warning_count=... parity_warnings_fingerprint=...`.
- Thread action result reports `Copied parity warning count line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity completion line

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity completion line`.
3. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains one line with completion state, coverage summary, and snapshot id.
- Thread action result reports `Copied parity completion line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity surface counts line

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity surface counts line`.
3. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains one line with apps/experimental/mcp/pending/warnings counts.
- Thread action result reports `Copied parity surface counts line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity pending summary line

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity pending summary line`.
3. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains pending count and pending summary text in one line.
- Thread action result reports `Copied parity pending summary line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity protocol summary line

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity protocol summary line`.
3. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains one line with protocol methods and notifications counts.
- Thread action result reports `Copied parity protocol summary line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity snapshot/fingerprint tuple

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity snapshot/fingerprint tuple`.
3. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains `<snapshot>|<warningsFingerprint>`.
- Thread action result reports `Copied parity snapshot/fingerprint tuple`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity digest line

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity digest line`.
3. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains compact digest line with snapshot, completion/coverage, warning count, and warnings fingerprint.
- Thread action result reports `Copied parity digest line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity health score line

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity health score line`.
3. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains `parity_health_score=... completion=... warnings=...`.
- Thread action result reports `Copied parity health score line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity refresh stamp

### Prerequisites
- Open `Settings` -> `App parity`.
- Click `Refresh parity`.

### Steps
1. Click `Copy parity refresh stamp`.
2. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains `parity_stamp snapshot=... refresh="..."`.
- Thread action result reports `Copied parity refresh stamp`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity timestamp line

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Copy parity timestamp line`.
2. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains `parity_timestamp=<iso> parity_refresh="..."`.
- Thread action result reports `Copied parity timestamp line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity refresh epoch line

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity refresh epoch line`.
3. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains `parity_refresh_epoch_ms=... parity_refresh_iso="..."`.
- Thread action result reports `Copied parity refresh epoch line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity warning IDs line

### Prerequisites
- Open `Settings` -> `App parity`.
- Ensure warnings are present.

### Steps
1. Click `Copy parity warning IDs line`.
2. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains `parity_warning_ids=W1,W2,...`.
- Thread action result reports `Copied parity warning IDs line`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity warning map JSON

### Prerequisites
- Open `Settings` -> `App parity`.
- Ensure warnings are present.

### Steps
1. Click `Copy parity warning map JSON`.
2. Paste clipboard content into a JSON-aware editor.

### Expected Results
- Clipboard contains JSON object mapping warning IDs (`W1`, `W2`, ...) to warning messages.
- Thread action result reports `Copied parity warning map JSON`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Copy parity warning map inline

### Prerequisites
- Open `Settings` -> `App parity`.
- Ensure warnings are present.

### Steps
1. Click `Copy parity warning map inline`.
2. Paste clipboard content into a text field.

### Expected Results
- Clipboard contains compact warning map format like `W1:...; W2:...`.
- Thread action result reports `Copied parity warning map inline`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Apply parity category settings to config

### Prerequisites
- Open `Settings` -> `App parity`.
- Parity category sections are visible for `Personalization parity`, `Usage parity`, `Data controls parity`, and `Local environments parity`.

### Steps
1. In `Personalization parity`, set values and click `Apply personalization`.
2. In `Usage parity`, set values and click `Apply usage`.
3. In `Data controls parity`, set values and click `Apply data controls`.
4. In `Local environments parity`, set values and click `Apply local env`.

### Expected Results
- Each click shows a success thread action result indicating applied parity settings via `config/batchWrite`.
- No parity error is shown.
- `Config read summary` updates after apply actions.

### Rollback/Cleanup
- Optionally reset each section with its existing `Reset ...` button.

## Feature: Apply extended parity category settings to config

### Prerequisites
- Open `Settings` -> `App parity`.
- Parity category sections are visible for `Appearance`, `Computer-use`, `General settings`, `Plugins settings`, `Connections`, `Environments`, `Worktrees`, and `Git settings`.

### Steps
1. In each listed section, set non-default values.
2. Click each corresponding apply button: `Apply appearance`, `Apply computer-use`, `Apply general settings`, `Apply plugins`, `Apply connections`, `Apply environments`, `Apply worktrees`, `Apply git settings`.

### Expected Results
- Each action reports applied parity settings via `config/batchWrite`.
- No parity error is shown.
- Config summary refreshes after each apply.

### Rollback/Cleanup
- Use each section's existing `Reset ...` button to restore defaults.

## Feature: Main settings menu-bar toggle writes config

### Prerequisites
- Run on macOS so `Show in menu bar` is visible in Settings.

### Steps
1. Open `Settings` and click `Show in menu bar`.
2. Toggle it once to `on` and once to `off`.

### Expected Results
- Toggle state changes immediately in UI.
- `parityGeneralMenuBarDraft` state stays aligned (`enabled`/`disabled`).
- Config write result reports menu bar setting update via `config/value/write`.

### Rollback/Cleanup
- Leave toggle in preferred final state.

## Feature: Apply all parity settings in one batch

### Prerequisites
- Open `Settings` -> `App parity`.
- Set non-default values in at least two parity category sections.

### Steps
1. Click `Apply all parity settings`.
2. Wait for completion.

### Expected Results
- Action result reports `Applied all parity settings`.
- Config write result reports apply-all via `config/batchWrite`.
- No parity error is shown.

### Rollback/Cleanup
- Use `Reset all parity drafts` and/or per-section reset buttons as needed.

## Feature: Parity drafts hydrate from config on refresh

### Prerequisites
- Open `Settings` -> `App parity`.
- Apply at least one non-default parity setting (for example appearance theme or usage auto top-up).

### Steps
1. Click `Refresh parity`.
2. Observe parity draft controls across categories.

### Expected Results
- Draft controls reflect persisted config values loaded from `config/read`.
- No parity error appears during refresh.

### Rollback/Cleanup
- Reset changed settings using section reset buttons or `Apply all parity settings` with preferred values.

## Feature: Menu-bar toggle stays in sync with hydrated config

### Prerequisites
- Run on macOS.
- Ensure `general_settings.menu_bar` has a persisted value (`enabled` or `disabled`).

### Steps
1. Open `Settings` -> `App parity`.
2. Click `Refresh parity`.
3. Observe both `Show in menu bar` (main setting row) and `General settings parity` menu bar draft.

### Expected Results
- Main `Show in menu bar` toggle matches hydrated config state.
- `parityGeneralMenuBarDraft` matches the same state.
- Local preference key remains aligned with hydrated value.

### Rollback/Cleanup
- Toggle `Show in menu bar` to preferred state.

## Feature: Parity refresh uses single config read bundle

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Confirm parity config summary and parity draft controls update together.

### Expected Results
- Config summary and parity drafts both refresh successfully in one parity refresh pass.
- No parity error is shown.

### Rollback/Cleanup
- No cleanup required.

## Feature: Apply general/all parity keeps top-level menu-bar toggle in sync

### Prerequisites
- Run on macOS and open `Settings` -> `App parity`.

### Steps
1. In `General settings parity`, change menu bar value and click `Apply general settings`.
2. Change it again and click `Apply all parity settings`.
3. Observe top-level `Show in menu bar` row.

### Expected Results
- Top-level toggle immediately matches applied `general_settings.menu_bar` value in both apply paths.
- Local preference key is updated consistently.

### Rollback/Cleanup
- Set menu bar to preferred final value.

## Feature: Reset all parity drafts syncs top-level menu-bar toggle

### Prerequisites
- Run on macOS and open `Settings` -> `App parity`.

### Steps
1. Set `General settings parity` menu bar draft to `disabled` and apply it.
2. Click `Reset all parity drafts`.
3. Observe top-level `Show in menu bar` row.

### Expected Results
- Top-level toggle immediately reflects reset general draft default (`enabled`).
- Local preference key is updated to match.

### Rollback/Cleanup
- Set menu bar to preferred final state.

## Feature: Reset general parity section syncs top-level menu-bar toggle

### Prerequisites
- Run on macOS and open `Settings` -> `App parity`.

### Steps
1. Set `General settings parity` menu bar to `disabled`.
2. Click `Reset general settings`.
3. Observe top-level `Show in menu bar` row.

### Expected Results
- `General settings parity` menu bar resets to `enabled`.
- Top-level `Show in menu bar` toggle also resets to enabled immediately.
- Local preference key is updated accordingly.

### Rollback/Cleanup
- Set menu bar to preferred final state.

## Feature: Appearance parity stays synced with top-level Appearance setting

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. In `Appearance parity`, set theme to `dark` and click `Apply appearance`.
2. Verify main `Appearance` row shows `Dark`.
3. Click `Reset appearance` in parity section.
4. Verify main `Appearance` row returns to `System`.
5. Click `Apply all parity settings` with theme set to `light` and verify main row becomes `Light`.

### Expected Results
- Top-level appearance state and theme class update immediately after parity apply/reset/hydration paths.
- Local appearance preference key stays aligned.

### Rollback/Cleanup
- Set appearance to preferred final mode.

## Feature: Top-level Appearance toggle writes config and syncs parity draft

### Prerequisites
- Open `Settings`.

### Steps
1. Click top-level `Appearance` toggle to cycle through `System`, `Light`, `Dark`.
2. Open `App parity` and inspect `Appearance parity` theme draft.

### Expected Results
- UI appearance updates immediately each cycle.
- `Appearance parity` theme draft matches top-level selection.
- Config write result reports appearance update via `config/value/write`.

### Rollback/Cleanup
- Leave appearance in preferred final mode.

## Feature: Top-level appearance/menu-bar writes report parity action results

### Prerequisites
- Open `Settings`.

### Steps
1. Toggle top-level `Appearance` once.
2. Toggle `Show in menu bar` once (macOS).

### Expected Results
- Config write results are shown for both updates.
- Parity thread action result updates to `Updated appearance theme` and `Updated menu bar setting` respectively.

### Rollback/Cleanup
- Restore preferred appearance and menu-bar states.

## Feature: Top-level Notifications toggle writes config and syncs parity general draft

### Prerequisites
- Open `Settings`.

### Steps
1. Toggle top-level `Notifications` once.
2. Open `App parity` and check `General settings parity` notifications value.

### Expected Results
- Notifications toggle state changes immediately.
- `general_settings.notifications` is written via `config/value/write`.
- `General settings parity` notifications draft matches the top-level toggle.
- Parity thread action result reports notifications update.

### Rollback/Cleanup
- Restore notifications to preferred final state.

## Feature: Top-level settings writes clear stale parity error state on success

### Prerequisites
- Open `Settings`.
- Ensure a visible parity error exists (for example from a previous failed parity write).

### Steps
1. Toggle top-level `Appearance` once.
2. Toggle top-level `Notifications` once.
3. Toggle top-level `Show in menu bar` once (macOS).

### Expected Results
- Each successful write clears stale parity error text.
- Parity config/action result messages update for each setting.

### Rollback/Cleanup
- Restore preferred final settings values.

## Feature: Top-level setting toggles rollback on config write failure

### Prerequisites
- Open `Settings`.
- Have a way to force config write failure (for example temporary permission/API failure).

### Steps
1. Toggle `Appearance`, `Notifications`, or `Show in menu bar` while writes are failing.

### Expected Results
- UI toggles revert to prior state after failed write.
- Matching local preference keys revert as well.
- Parity error displays the failure reason.

### Rollback/Cleanup
- Restore normal config write behavior.

## Feature: Top-level config-writing toggles are race-guarded

### Prerequisites
- Open `Settings`.

### Steps
1. Rapidly click `Appearance`, `Notifications`, or `Show in menu bar` multiple times while write is in flight.

### Expected Results
- Only one write operation runs at a time.
- Toggles are temporarily disabled during write.
- Final state remains consistent with last successful write and no race-induced drift occurs.

### Rollback/Cleanup
- Set preferred final states.

## Feature: Top-level toggle failures clear stale success status

### Prerequisites
- Open `Settings`.
- Have a way to induce config write failure.

### Steps
1. Perform a successful top-level write (appearance/notifications/menu-bar) to set success status.
2. Induce failure and toggle again.

### Expected Results
- On failure, stale success messages are cleared.
- Error message is the only active status signal.

### Rollback/Cleanup
- Restore normal write behavior and preferred settings.

## Feature: Top-level setting writes clear stale status at action start

### Prerequisites
- Open `Settings`.
- Ensure parity status area currently shows previous success or error text.

### Steps
1. Trigger top-level `Appearance`, `Notifications`, or `Show in menu bar` write.

### Expected Results
- Previous status text is cleared immediately when the new write starts.
- Final status reflects only the current write result.

### Rollback/Cleanup
- Restore preferred final settings values.

## Feature: Top-level setting rows show in-progress status during writes

### Prerequisites
- Open `Settings`.

### Steps
1. Trigger a top-level write (`Appearance`, `Notifications`, or `Show in menu bar`).
2. Observe row value while write is in flight.

### Expected Results
- Row value temporarily shows `Updating…` during in-flight write.
- Control remains disabled until write finishes.
- Final state/value appears after completion.

### Rollback/Cleanup
- Restore preferred final settings values.

## Feature: Only active top-level setting row shows Updating state

### Prerequisites
- Open `Settings`.

### Steps
1. Trigger one top-level write (for example `Notifications`).
2. Observe all three top-level rows during write.

### Expected Results
- Only the active row shows `Updating…`.
- Non-active rows keep normal value labels (`System/Light/Dark`, `On/Off`).

### Rollback/Cleanup
- Restore preferred final states.

## Feature: Top-level settings continuously mirror to parity drafts via watchers

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Change top-level `Appearance`.
2. Change top-level `Notifications`.
3. Change top-level `Show in menu bar` (macOS).
4. Observe corresponding parity drafts without requiring manual refresh.

### Expected Results
- `Appearance` mirrors to `parityAppearanceThemeDraft`.
- `Notifications` mirrors to `parityGeneralNotificationsDraft`.
- `Show in menu bar` mirrors to `parityGeneralMenuBarDraft`.

### Rollback/Cleanup
- Restore preferred final settings values.

## Feature: Top-level handlers rely on watcher-based parity sync (no duplicate manual assignment)

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Toggle top-level `Appearance`, `Notifications`, and `Show in menu bar`.
2. Observe corresponding parity draft values.

### Expected Results
- Parity draft values still update correctly via watchers.
- Behavior remains unchanged from user perspective.

### Rollback/Cleanup
- Restore preferred final setting values.

## Feature: Watcher sync does not clobber parity drafts during apply actions

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Start an apply action for parity settings (`Apply general settings` or `Apply all parity settings`).
2. Observe draft fields during in-flight apply.

### Expected Results
- Watcher-based top-level mirroring does not overwrite parity drafts mid-apply.
- Draft and applied values remain consistent after completion.

### Rollback/Cleanup
- Restore preferred final setting values.

## Feature: Parity refresh hydration does not override in-flight top-level setting writes

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Trigger a top-level write (`Appearance`, `Notifications`, or `Show in menu bar`).
2. While write is in flight, trigger `Refresh parity`.

### Expected Results
- In-flight top-level state is not overwritten by hydration during the write.
- Final values remain consistent with the completed write outcome.

### Rollback/Cleanup
- Restore preferred final setting values.

## Feature: Top-level setting write lifecycle is centralized

### Prerequisites
- Open `Settings`.

### Steps
1. Trigger each top-level config-writing action (`Appearance`, `Notifications`, `Show in menu bar`).

### Expected Results
- Behavior is unchanged: lock, status clear, per-row in-flight label, and unlock all work correctly.
- No regressions from lifecycle deduplication.

### Rollback/Cleanup
- Restore preferred final setting values.

## Feature: Top-level writes do not rollback on post-write config-summary refresh failure

### Prerequisites
- Open `Settings`.
- Have a way to make `config/read` fail while `config/value/write` still succeeds.

### Steps
1. Trigger top-level `Appearance`, `Notifications`, or `Show in menu bar` update.
2. Force/read observe `config/read` refresh failure after write.

### Expected Results
- UI state remains at the newly written value (no false rollback).
- Success status for the write remains visible.
- Config summary refresh failure does not override successful write outcome.

### Rollback/Cleanup
- Restore normal read behavior and preferred setting values.

## Feature: Successful top-level writes report non-blocking summary refresh failures

### Prerequisites
- Open `Settings`.
- Have a way to make `config/read` fail after `config/value/write` success.

### Steps
1. Trigger top-level `Appearance`, `Notifications`, or `Show in menu bar` write.
2. Observe status text when summary refresh fails.

### Expected Results
- Write remains treated as successful (no rollback).
- Config write status includes `(summary refresh failed: ...)` detail.
- Action result still indicates the setting was updated.

### Rollback/Cleanup
- Restore normal `config/read` behavior and preferred setting values.

## Feature: Opening Settings triggers parity/account refresh sync

### Prerequisites
- Keep app running long enough for settings/account/parity data to potentially drift.

### Steps
1. Close settings panel.
2. Re-open settings panel.

### Expected Results
- On open, account state refresh runs.
- Parity surface refresh runs without requiring manual `Refresh parity` click.
- Top-level/parity controls reflect latest persisted/backend state.

### Rollback/Cleanup
- No cleanup required.

## Feature: Parity refresh ignores stale overlapping requests

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Trigger multiple parity refreshes quickly (open-settings auto-refresh plus manual `Refresh parity`).
2. Observe final parity data/state.

### Expected Results
- Older/stale refresh responses do not overwrite newer refresh state.
- Final UI reflects latest refresh request only.
- Loading/error state resolves from latest request path.

### Rollback/Cleanup
- No cleanup required.

## Feature: Top-level settings hydrate from config on app startup

### Prerequisites
- Persist non-default values for appearance/notifications/menu-bar in config.

### Steps
1. Restart the app.
2. Open settings panel.

### Expected Results
- Top-level `Appearance`, `Notifications`, and `Show in menu bar` reflect persisted config immediately.
- No need to open App parity or click `Refresh parity` first.

### Rollback/Cleanup
- Restore preferred final settings values.

## Feature: Top-level settings re-sync on app-list revision and settings open

### Prerequisites
- App running with potential external config changes.

### Steps
1. Trigger an app-list revision event while settings panel is closed.
2. Open settings panel.

### Expected Results
- Top-level settings are re-synced from persisted config on revision events even when settings panel is closed.
- Opening settings also refreshes top-level settings before parity/account refresh completes.

### Rollback/Cleanup
- Restore preferred final settings values.

## Feature: Settings sync avoids redundant config bundle reads on mount/open paths

### Prerequisites
- Start app with Settings initially closed.

### Steps
1. Let initial mount complete.
2. Open settings panel.
3. Trigger app-list revision while settings open, then while settings closed.

### Expected Results
- Mount/open paths avoid duplicate top-level+parity bundle fetch overlap.
- Behavior remains unchanged: top-level settings still sync, parity still refreshes when needed.

### Rollback/Cleanup
- No cleanup required.

## Feature: Top-level settings sync ignores stale overlapping hydration responses

### Prerequisites
- Trigger multiple top-level config sync calls in quick succession (for example rapid open/close settings plus revision events).

### Steps
1. Cause overlapping `loadTopLevelSettingsFromConfig` triggers.
2. Observe final top-level setting values.

### Expected Results
- Older responses do not overwrite newer sync state.
- Final top-level appearance/notifications/menu-bar reflect the latest sync call.

### Rollback/Cleanup
- Restore preferred final settings values.

## Feature: Top-level write summary refresh uses shared post-write helper

### Prerequisites
- Open `Settings`.

### Steps
1. Execute top-level writes for `Appearance`, `Notifications`, and `Show in menu bar`.

### Expected Results
- Each path still updates config summary status consistently.
- If summary refresh fails, each path reports identical `(summary refresh failed: ...)` suffix behavior.

### Rollback/Cleanup
- Restore preferred final settings values.

## Feature: Boolean top-level preference writes use shared helper

### Prerequisites
- Open `Settings`.

### Steps
1. Toggle `Notifications` and `Show in menu bar` (macOS) via top-level controls.
2. Use reset/apply flows in `General settings parity`.

### Expected Results
- Boolean preference persistence behavior is unchanged.
- Menu-bar/notifications state remains consistent across top-level and parity flows.

### Rollback/Cleanup
- Restore preferred final setting values.

## Feature: Boolean pref writes route through helper without redundant window guards

### Prerequisites
- Open `Settings`.

### Steps
1. Exercise menu-bar and notifications changes via top-level + parity general flows.

### Expected Results
- Behavior remains identical.
- Boolean preference persistence still works in all touched paths.

### Rollback/Cleanup
- Restore preferred setting values.

## Feature: Dark/menu-bar/notifications pref persistence uses helper paths

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Trigger top-level and parity flows that update appearance, notifications, and menu-bar states.

### Expected Results
- Preference persistence behavior is unchanged.
- No regressions in cross-sync behavior after helper consolidation.

### Rollback/Cleanup
- Restore preferred final settings values.

## Feature: General top-level settings hydration uses shared helper

### Prerequisites
- Have persisted notifications/menu-bar values in config.

### Steps
1. Trigger startup top-level sync and parity refresh sync paths.
2. Observe notifications/menu-bar top-level and parity draft states.

### Expected Results
- Both paths produce consistent hydration behavior.
- Top-level/pairty states remain aligned with write-lock respect where applicable.

### Rollback/Cleanup
- Restore preferred final settings values.

## Feature: Appearance top-level hydration uses shared helper

### Prerequisites
- Persist non-default appearance theme in config.

### Steps
1. Trigger startup top-level sync and parity refresh sync paths.
2. Observe top-level appearance and parity appearance draft.

### Expected Results
- Both paths hydrate appearance consistently.
- Write-lock respect is preserved during parity refresh.

### Rollback/Cleanup
- Restore preferred final appearance mode.

## Feature: General draft-to-top-level sync uses shared helper

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Run `Reset general settings`, `Apply general settings`, `Reset all parity drafts`, and `Apply all parity settings`.
2. Observe top-level notifications/menu-bar values after each action.

### Expected Results
- Top-level notifications/menu-bar remain consistent with parity general drafts across all actions.
- Behavior remains unchanged after helper consolidation.

### Rollback/Cleanup
- Restore preferred final setting values.

## Feature: Draft-to-top-level appearance sync uses shared helper

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Run appearance-related parity flows: `Reset appearance`, `Apply appearance`, and `Apply all parity settings`.

### Expected Results
- Top-level appearance remains synchronized with parity appearance draft in all three flows.
- Behavior remains unchanged after helper consolidation.

### Rollback/Cleanup
- Restore preferred final appearance mode.

## Feature: App parity config write includes sandbox network access

### Prerequisites
- Open `Settings` -> `App parity`.
- Codex app-server supports `config/batchWrite` and `config/read`.

### Steps
1. In `Config write`, select `sandbox: workspace-write`.
2. Change the new `network` dropdown to `enabled`.
3. Click `Save`.
4. Check the `Config read` block and copy summary.
5. Repeat with `network: disabled`.

### Expected Results
- Save writes `sandbox_workspace_write.network_access` with the selected boolean value.
- Status text includes `network_access=enabled` or `network_access=disabled`.
- `Config read` displays `sandbox network: enabled` or `sandbox network: disabled`.
- Approval policy, sandbox mode, and web search writes continue to work.

### Rollback/Cleanup
- Restore the preferred sandbox/network setting after testing.

## Feature: Copy parity warning count JSON

### Prerequisites
- Open `Settings` -> `App parity`.

### Steps
1. Click `Refresh parity`.
2. Click `Copy parity warning count JSON`.
3. Paste clipboard content into a JSON-aware editor.

### Expected Results
- Clipboard contains compact JSON with the current warning count, for example `{"warnings":0}`.
- Thread action result reports `Copied parity warning count JSON`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings route parity path (`#/settings`) opens/closes settings panel

### Prerequisites
- Run the app and open any route (`#/`, `#/thread/<id>`, or `#/skills`).

### Steps
1. Click the sidebar `Settings` button.
2. Confirm URL changes to `#/settings` and settings panel is open.
3. Press `Escape`.
4. Repeat from a thread route and click outside the settings panel.

### Expected Results
- Opening settings navigates to `#/settings`.
- Closing settings (Escape/outside click/button toggle) returns to the previous route (`#/thread/<id>`, `#/skills`, or `#/`).
- Settings panel visibility stays in sync with route state.

### Rollback/Cleanup
- No cleanup required.

## Feature: Top-level notifications/menu-bar toggles write current value (no stale draft)

### Prerequisites
- Open `Settings` -> `App parity`.
- Ensure `general_settings.notifications` and `general_settings.menu_bar` are visible via config summary.

### Steps
1. Toggle `Notifications` from top-level settings.
2. Immediately click `Refresh parity` and observe `general settings` draft summary.
3. Toggle `Show in menu bar` from top-level settings.
4. Immediately click `Refresh parity` and observe `general settings` draft summary.

### Expected Results
- Config writes persist the newly toggled value in both cases.
- Parity drafts (`notifications`, `menuBar`) match the top-level toggled state with no inversion/lag.
- On write failure, UI and draft values roll back together.

### Rollback/Cleanup
- Restore preferred final notifications/menu-bar states.

## Feature: Keyboard shortcut opens settings (`Cmd/Ctrl + ,`)

### Prerequisites
- App is focused.
- Start from any route (`#/`, `#/thread/<id>`, or `#/skills`).

### Steps
1. Press `Cmd + ,` on macOS (or `Ctrl + ,` on non-macOS).
2. Observe route and settings panel state.

### Expected Results
- Settings panel opens.
- Route changes to `#/settings`.
- Existing `Cmd/Ctrl + b` sidebar shortcut behavior remains unchanged.

### Rollback/Cleanup
- Close settings with `Escape` or toggle button.

## Feature: Settings route shows Settings title and page title

### Prerequisites
- App running with sidebar visible.

### Steps
1. Open settings (button or `Cmd/Ctrl + ,`).
2. Observe content header title.
3. Observe browser tab title.

### Expected Results
- Content header title is `Settings` while route is `#/settings`.
- Browser tab title is `Settings • <host>` while settings route is active.
- Navigating back to thread/home restores normal title behavior.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings button active state follows settings route

### Prerequisites
- Sidebar visible.

### Steps
1. Open settings so route becomes `#/settings`.
2. Observe the sidebar `Settings` button style.
3. Close settings to return to a non-settings route.

### Expected Results
- `Settings` button shows active state while route is `#/settings`.
- Active state clears after leaving `#/settings`.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings route stays accessible with sidebar collapse changes

### Prerequisites
- App running with at least one thread.

### Steps
1. Collapse the sidebar.
2. Navigate to `#/settings` (or press `Cmd/Ctrl + ,`).
3. While settings is open, collapse the sidebar again.

### Expected Results
- Entering `#/settings` auto-expands the sidebar so settings panel is reachable.
- If sidebar is collapsed while settings is open, settings closes and route returns to prior non-settings route.
- No stuck `#/settings` state with hidden settings UI.

### Rollback/Cleanup
- Reopen sidebar/settings as desired.

## Feature: Settings panel receives focus when opened

### Prerequisites
- App running with sidebar visible.

### Steps
1. Open settings via button, `Cmd/Ctrl + ,`, or direct `#/settings` navigation.
2. Press `Tab` and `Shift+Tab`.

### Expected Results
- Settings panel container is focusable when opened.
- Keyboard focus starts inside settings context without requiring an extra click.
- Existing Escape close behavior still works.

### Rollback/Cleanup
- No cleanup required.

## Feature: Focus returns to Settings button when panel closes

### Prerequisites
- Sidebar visible and settings can be opened.

### Steps
1. Open settings.
2. Close settings using `Escape`.
3. Reopen settings and close by clicking outside the panel.

### Expected Results
- After close, keyboard focus returns to the sidebar `Settings` button.
- Reopening with keyboard works immediately without extra click.

### Rollback/Cleanup
- No cleanup required.

## Feature: Sidebar Settings navigation entry

### Prerequisites
- Sidebar expanded.

### Steps
1. Click `Settings` entry under `Skills Hub` in sidebar.
2. Observe route and settings panel state.
3. Navigate away and return.

### Expected Results
- Clicking sidebar `Settings` opens settings panel and navigates to `#/settings`.
- Sidebar `Settings` entry shows active state while settings route is active.
- Existing settings button and shortcut behavior remain unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Sidebar nav entries expose active page semantics

### Prerequisites
- Sidebar expanded.

### Steps
1. Navigate to `#/skills` and inspect `Skills Hub` button.
2. Navigate to `#/settings` and inspect `Settings` button.

### Expected Results
- Active entry has `aria-current="page"`.
- Inactive entry does not set `aria-current`.
- Visual active-state behavior is unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings trigger announces controlled panel

### Prerequisites
- Sidebar visible.

### Steps
1. Open DevTools and inspect the sidebar `Settings` button.
2. Confirm `aria-controls` value.
3. Open settings and inspect panel element id.

### Expected Results
- Settings button exposes `aria-controls="sidebar-settings-panel"`.
- Open settings panel element has `id="sidebar-settings-panel"`.
- Existing open/close behavior remains unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings panel exposes dialog semantics

### Prerequisites
- Sidebar visible.

### Steps
1. Inspect sidebar `Settings` button in DevTools.
2. Open settings and inspect panel element.

### Expected Results
- Settings button exposes `aria-haspopup="dialog"`.
- Settings panel exposes `role="dialog"`, `aria-modal="false"`, and `aria-label="Settings"`.
- Existing open/close behavior remains unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings dialog uses labelled title reference

### Prerequisites
- Sidebar visible.

### Steps
1. Open settings.
2. Inspect settings panel element in DevTools.
3. Inspect title element id `sidebar-settings-panel-title`.

### Expected Results
- Panel uses `aria-labelledby="sidebar-settings-panel-title"`.
- Title element exists and contains `Settings`.
- Dialog remains keyboard-focusable and close behavior is unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: `Cmd/Ctrl + ,` toggles settings open and close

### Prerequisites
- Sidebar visible.

### Steps
1. Press `Cmd/Ctrl + ,` once.
2. Press `Cmd/Ctrl + ,` again.

### Expected Results
- First press opens settings and routes to `#/settings`.
- Second press closes settings and returns to the prior route.
- Existing `Escape` close behavior still works.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings trigger exposes keyboard shortcut metadata

### Prerequisites
- Sidebar visible.

### Steps
1. Inspect the sidebar `Settings` button in DevTools.

### Expected Results
- Button exposes `aria-keyshortcuts="Meta+, Control+,"`.
- Existing `Cmd/Ctrl + ,` behavior is unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Sidebar Settings entry does not auto-close itself on mobile

### Prerequisites
- Mobile viewport/emulation with sidebar visible.

### Steps
1. Tap sidebar `Settings` entry.

### Expected Results
- Settings opens and remains open.
- Sidebar is not immediately collapsed by that click path.
- Route remains `#/settings` until user closes settings.

### Rollback/Cleanup
- Close settings manually after verification.

## Feature: Sidebar Settings entry toggles open and close

### Prerequisites
- Sidebar expanded.

### Steps
1. Click sidebar `Settings` entry once.
2. Click sidebar `Settings` entry again.

### Expected Results
- First click opens settings and navigates to `#/settings`.
- Second click closes settings and returns to prior route.
- Behavior matches settings button and `Cmd/Ctrl + ,` toggle flow.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings controls expose pressed toggle state

### Prerequisites
- Sidebar visible.

### Steps
1. Inspect sidebar `Settings` nav entry and footer `Settings` button in DevTools while closed.
2. Open settings.
3. Inspect both controls again.

### Expected Results
- Both controls set `aria-pressed="false"` when settings is closed.
- Both controls set `aria-pressed="true"` when settings is open.
- Existing open/close behavior remains unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Sidebar Settings entry exposes explicit accessible label

### Prerequisites
- Sidebar expanded.

### Steps
1. Inspect sidebar `Settings` entry in DevTools.

### Expected Results
- Entry exposes `aria-label="Settings (Cmd/Ctrl+,)"`.
- Existing toggle behavior and active state semantics remain unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings close restores previous focus target

### Prerequisites
- Sidebar visible.

### Steps
1. Focus an interactive control outside settings (for example sidebar search input).
2. Open settings.
3. Close settings via `Escape`.

### Expected Results
- Focus returns to the previously focused control when still mounted.
- If previous control is unavailable, focus falls back to the `Settings` button.
- Existing route close behavior remains unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings close does not restore focus to hidden panel elements

### Prerequisites
- Sidebar visible.

### Steps
1. Open settings.
2. Focus an interactive control inside settings panel.
3. Close settings with `Escape`.

### Expected Results
- Focus does not attempt to remain on a now-hidden settings control.
- Focus falls back to the `Settings` button (or valid previous non-panel target).
- No keyboard trap or lost-focus state after close.

### Rollback/Cleanup
- No cleanup required.

## Feature: Repeated open calls do not overwrite focus-return origin

### Prerequisites
- Sidebar visible.

### Steps
1. Focus a non-settings control (for example sidebar search input).
2. Open settings.
3. Trigger another open path while still open (for example click route-active `Settings` control pattern in test harness or call open action twice).
4. Close settings.

### Expected Results
- Focus returns to the original pre-open control, not to a later in-panel element.
- Repeated open attempts while already open do not degrade close-focus behavior.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings controls expose tooltip shortcut hint

### Prerequisites
- Sidebar visible.

### Steps
1. Hover sidebar `Settings` nav entry.
2. Hover footer `Settings` button.

### Expected Results
- Both controls expose `title="Settings (Cmd/Ctrl+,)"`.
- Existing accessibility labels and toggle behavior remain unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings close handler is idempotent

### Prerequisites
- Sidebar visible.

### Steps
1. Open settings.
2. Trigger close once (e.g. `Escape`).
3. Trigger close path again immediately (e.g. another `Escape` or route-close path).

### Expected Results
- First close behaves normally (route + focus restoration).
- Subsequent close calls while already closed do not cause extra focus jumps.
- No regression in normal open/close behavior.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings dialog traps Tab focus while open

### Prerequisites
- Sidebar visible.

### Steps
1. Open settings.
2. Press `Tab` repeatedly until the last focusable control.
3. Press `Tab` once more.
4. Press `Shift+Tab` from the first focusable control.

### Expected Results
- Focus cycles within settings controls and does not escape to background UI.
- Forward tab from last wraps to first.
- Reverse tab from first wraps to last.
- `Escape` still closes settings.

### Rollback/Cleanup
- Close settings after verification.

## Feature: Route-driven settings close uses same close lifecycle

### Prerequisites
- Settings open on `#/settings`.

### Steps
1. With settings open, navigate to a non-settings route (for example select a thread).
2. Observe focus behavior and settings visibility.

### Expected Results
- Settings closes through the same lifecycle as manual close.
- Focus restoration behavior remains consistent.
- No route ping-pong or duplicate navigation side effects.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings open focuses first interactive control

### Prerequisites
- Sidebar visible.

### Steps
1. Open settings via button, shortcut, or `#/settings`.
2. Observe initial keyboard focus target.

### Expected Results
- Initial focus lands on the first focusable settings control.
- If no focusable control exists, focus falls back to settings panel container.
- Tab trap and Escape close behavior remain unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: `Cmd/Ctrl + Shift + H` navigates to home and closes settings

### Prerequisites
- Start from `#/thread/<id>` or `#/settings`.

### Steps
1. Press `Cmd/Ctrl + Shift + H`.

### Expected Results
- Route navigates to `#/` (`home`).
- If settings was open, it closes via normal close lifecycle.
- Existing settings and thread interactions remain unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings toggle behavior is consistent across all entry points

### Prerequisites
- Sidebar visible.

### Steps
1. Toggle settings via sidebar `Settings` entry.
2. Toggle settings via footer `Settings` button.
3. Toggle settings via `Cmd/Ctrl + ,`.

### Expected Results
- All three entry points follow identical open/close behavior.
- Route transitions and focus lifecycle remain consistent regardless of entry point.

### Rollback/Cleanup
- No cleanup required.

## Feature: Sidebar Settings nav entry exposes full dialog trigger semantics

### Prerequisites
- Sidebar expanded.

### Steps
1. Inspect sidebar `Settings` entry in DevTools while closed.
2. Open settings and inspect the same entry again.

### Expected Results
- Entry exposes `aria-controls="sidebar-settings-panel"` and `aria-haspopup="dialog"`.
- Entry exposes `aria-keyshortcuts="Meta+, Control+,"`.
- `aria-expanded` flips from `false` to `true` when settings opens.
- Existing toggle behavior remains unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Direct `#/settings` navigation preserves focus-return origin

### Prerequisites
- Sidebar visible.
- Focus a non-settings control (for example sidebar search input).

### Steps
1. Navigate directly to `#/settings` (address bar/router navigation).
2. Close settings.

### Expected Results
- Settings opens normally from route-driven path.
- Closing settings restores focus to the original pre-navigation control when available.
- Fallback-to-settings-button behavior still applies when original control is unavailable.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings focus-origin capture uses shared helper across open paths

### Prerequisites
- Sidebar visible.

### Steps
1. Open settings from trigger button and close.
2. Open settings via direct route (`#/settings`) and close.

### Expected Results
- Focus-return behavior is consistent across both open paths.
- No behavioral regressions after helper refactor.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings dialog exposes close shortcut metadata

### Prerequisites
- Settings open.

### Steps
1. Inspect settings panel element in DevTools.

### Expected Results
- Panel exposes `aria-keyshortcuts="Escape"`.
- Existing Escape close behavior remains unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings dialog exposes descriptive accessibility hint

### Prerequisites
- Settings open.

### Steps
1. Inspect settings panel element in DevTools.
2. Inspect referenced description element.

### Expected Results
- Panel exposes `aria-describedby="sidebar-settings-panel-description"`.
- Description element exists and includes close/tab navigation guidance.
- Existing keyboard behavior remains unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Home shortcut avoids double-route transition when closing settings

### Prerequisites
- Open settings on `#/settings`.

### Steps
1. Press `Cmd/Ctrl + Shift + H`.

### Expected Results
- Settings closes and app navigates directly to `#/`.
- No transient route bounce through stored return-route.
- Focus and close lifecycle remain intact.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings Tab trap ignores modified key chords

### Prerequisites
- Settings open.

### Steps
1. Press plain `Tab` and `Shift+Tab` in settings.
2. Press modified Tab combinations (e.g. `Ctrl+Tab`, `Alt+Tab`, or `Cmd+Tab` where available to app context).

### Expected Results
- Plain Tab/Shift+Tab remain trapped within settings dialog.
- Modified key chords are not intercepted by the settings Tab trap logic.
- Escape close behavior remains unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Global home/sidebar shortcuts ignore editable typing targets

### Prerequisites
- Focus an editable control (`input`, `textarea`, or contenteditable`) in the app.

### Steps
1. Press `Cmd/Ctrl + Shift + H` while typing in an editable control.
2. Press `Cmd/Ctrl + B` while typing in an editable control.

### Expected Results
- Neither shortcut triggers while typing in editable targets.
- Outside editable targets, both shortcuts continue to work as before.
- Settings shortcut (`Cmd/Ctrl + ,`) behavior remains unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Keyboard editable-target detection uses shared helper

### Prerequisites
- App running with editable controls available.

### Steps
1. Repeat global shortcut checks from editable and non-editable targets.

### Expected Results
- Behavior is unchanged after helper refactor.
- Editable-target shortcut guards still apply exactly as before.

### Rollback/Cleanup
- No cleanup required.

## Feature: Global shortcut guards treat `<select>` as editable target

### Prerequisites
- Focus a `select` control in settings or other UI.

### Steps
1. While focused on the `select`, press `Cmd/Ctrl + Shift + H`.
2. While focused on the `select`, press `Cmd/Ctrl + B`.

### Expected Results
- Neither shortcut triggers while a `select` has focus.
- Outside editable targets, shortcuts continue to work.

### Rollback/Cleanup
- No cleanup required.

## Feature: Global shortcut guards detect nested contenteditable targets

### Prerequisites
- Have a `contenteditable` surface with nested child elements.

### Steps
1. Place focus/caret inside a nested child element within the contenteditable region.
2. Press `Cmd/Ctrl + Shift + H` and `Cmd/Ctrl + B`.

### Expected Results
- Shortcuts are ignored while focus is inside any descendant of a `contenteditable="true"` container.
- Outside editable targets, shortcuts continue to work.

### Rollback/Cleanup
- No cleanup required.

## Feature: Editable shortcut guard supports all contenteditable variants

### Prerequisites
- Have editable regions using values like `contenteditable=""` or `contenteditable="plaintext-only"`.

### Steps
1. Focus inside those contenteditable regions.
2. Press `Cmd/Ctrl + Shift + H` and `Cmd/Ctrl + B`.

### Expected Results
- Global shortcuts are suppressed for all editable contenteditable variants (except explicit `contenteditable="false"`).
- Shortcut behavior outside editable targets is unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Global shortcuts are ignored during IME composition

### Prerequisites
- Use an IME input method (for example CJK composition) in an editable field.

### Steps
1. Start text composition so key events have `isComposing=true`.
2. While composing, press shortcut combinations used by app (`Cmd/Ctrl + ,`, `Cmd/Ctrl + B`, `Cmd/Ctrl + Shift + H`).

### Expected Results
- Shortcuts are ignored while IME composition is active.
- After composition ends, shortcuts resume normal behavior.

### Rollback/Cleanup
- No cleanup required.

## Feature: Global shortcuts ignore key-repeat events

### Prerequisites
- App focused on a non-editable surface.

### Steps
1. Hold `Cmd/Ctrl + ,` so the key repeats.
2. Hold `Cmd/Ctrl + B` so the key repeats.
3. Hold `Cmd/Ctrl + Shift + H` so the key repeats.

### Expected Results
- Each shortcut executes at most once per keypress sequence.
- Repeated keydown events (`event.repeat=true`) do not retrigger actions.

### Rollback/Cleanup
- No cleanup required.

## Feature: Repeat suppression applies to shortcuts without breaking Tab traversal

### Prerequisites
- Settings open.

### Steps
1. Hold `Tab` to advance focus repeatedly in settings.
2. Hold shortcut keys (`Cmd/Ctrl + ,`, `Cmd/Ctrl + B`, `Cmd/Ctrl + Shift + H`).

### Expected Results
- Repeated `Tab` events continue cycling focus as normal.
- Shortcut actions are still limited to one execution per keypress hold sequence.

### Rollback/Cleanup
- No cleanup required.

## Feature: Editable-target detection uses unified closest-selector helper

### Prerequisites
- Have focusable editable controls (`input`, `textarea`, `select`, and contenteditable region).

### Steps
1. Focus each editable control type and trigger guarded shortcuts.
2. Repeat from non-editable UI controls.

### Expected Results
- Shortcut guard behavior is unchanged after helper simplification.
- Editable controls suppress guarded shortcuts; non-editable controls do not.

### Rollback/Cleanup
- No cleanup required.

## Feature: Route watcher avoids refocus when settings is already open

### Prerequisites
- Settings open with focus on a specific settings control.

### Steps
1. Trigger a route update that keeps route at `#/settings` (without closing settings).
2. Observe current focused element.

### Expected Results
- Focus does not jump back to first settings control while panel is already open.
- Initial open from non-settings route still applies normal focus behavior.

### Rollback/Cleanup
- No cleanup required.

## Feature: Closing already-closed settings clears stale focus-origin state

### Prerequisites
- Trigger code paths that call close while settings may already be closed.

### Steps
1. Close settings normally.
2. Trigger close again while already closed.
3. Reopen and close settings.

### Expected Results
- No stale focus-origin state leaks across close cycles.
- Subsequent open/close focus restoration behaves normally.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings focus trap includes visible fixed/sticky controls

### Prerequisites
- Settings panel contains focusable controls that may render with `position: fixed` or `position: sticky` styling (or any layout where `offsetParent` can be null).

### Steps
1. Open settings.
2. Use `Tab`/`Shift+Tab` to cycle focus across all visible controls.
3. Verify controls with fixed/sticky-like layout still participate.

### Expected Results
- Focus trap includes all visible focusable controls, even when `offsetParent` is null.
- No visible settings control is skipped due to layout mode.

### Rollback/Cleanup
- No cleanup required.

## Feature: Route-driven settings close can skip focus restoration

### Prerequisites
- Open settings on `#/settings`.

### Steps
1. Trigger navigation to a non-settings route while settings is open (for example select a thread).
2. Observe focused element after navigation settles.

### Expected Results
- Settings closes cleanly without forcing focus back to previous settings-origin element.
- Navigation target keeps expected focus behavior with no jump back to settings trigger.
- Manual close flows (Escape/toggle) still restore focus normally.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings shortcut detection supports key and code matching

### Prerequisites
- Keyboard layouts where `event.key` mapping can vary.

### Steps
1. Press the Settings shortcut chord (`Cmd/Ctrl` + physical comma key).
2. Repeat on alternate keyboard layout if available.

### Expected Results
- Settings shortcut still works when `event.code` is `Comma`.
- Existing toggle/open-close behavior remains unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Home/sidebar shortcuts support key and code matching

### Prerequisites
- Keyboard layouts where `event.key` may vary from physical key label.

### Steps
1. Trigger `Cmd/Ctrl + Shift + H` using the physical H key.
2. Trigger `Cmd/Ctrl + B` using the physical B key.
3. Repeat on alternate keyboard layout if available.

### Expected Results
- Home shortcut works via key or `KeyH` code detection.
- Sidebar toggle shortcut works via key or `KeyB` code detection.
- Existing shortcut guards (editable/IME/repeat) remain unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Shortcut modifier checks use shared helpers without behavior change

### Prerequisites
- App focused on non-editable surface.

### Steps
1. Verify `Cmd/Ctrl + ,`, `Cmd/Ctrl + B`, `Cmd/Ctrl + Shift + H` still work.
2. Verify variants with disallowed modifiers (e.g. `Alt` combinations) remain ignored.

### Expected Results
- Shortcut behavior is unchanged after helper refactor.
- Modifier gating remains consistent across all guarded shortcuts.

### Rollback/Cleanup
- No cleanup required.

## Feature: Keyboard modifier branch logic uses explicit helper predicates

### Prerequisites
- App focused on non-editable surface.

### Steps
1. Re-run shortcut checks for:
- `Cmd/Ctrl + ,`
- `Cmd/Ctrl + B`
- `Cmd/Ctrl + Shift + H`
2. Re-run negative checks with disallowed modifier combinations.

### Expected Results
- Behavior is unchanged after predicate helper extraction.
- Shortcut gating remains consistent and readable in implementation.

### Rollback/Cleanup
- No cleanup required.

## Feature: Shortcuts require exactly one primary modifier (Ctrl xor Meta)

### Prerequisites
- App focused on non-editable surface.

### Steps
1. Trigger shortcuts with only `Ctrl` (or only `Meta`) pressed.
2. Trigger same shortcuts with both `Ctrl` and `Meta` pressed together.

### Expected Results
- Shortcuts work with exactly one primary modifier.
- Shortcuts are ignored when both primary modifiers are held simultaneously.

### Rollback/Cleanup
- No cleanup required.

## Feature: Shortcut repeat guard uses shared helper

### Prerequisites
- App focused on non-editable surface.

### Steps
1. Hold shortcut keys for settings, sidebar toggle, and home.

### Expected Results
- Repeat suppression behavior is unchanged after helper extraction.
- Each shortcut still triggers once per key-hold sequence.

### Rollback/Cleanup
- No cleanup required.

## Feature: Home shortcut metadata is exposed to assistive tech

### Prerequisites
- App loaded on any route.

### Steps
1. Inspect the content area in DevTools for screen-reader-only shortcut metadata.

### Expected Results
- Hidden metadata node advertises `aria-keyshortcuts="Meta+Shift+H Control+Shift+H"`.
- Existing home shortcut behavior remains unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Home shortcut metadata is static (non-live)

### Prerequisites
- App loaded on any route.

### Steps
1. Inspect the screen-reader-only shortcut metadata node in DevTools.

### Expected Results
- Node keeps `aria-keyshortcuts` metadata.
- Node does not use `aria-live`, avoiding unintended announcement churn.
- Home shortcut behavior is unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Shortcut accessibility strings are centralized as shared constants

### Prerequisites
- App loaded with sidebar and content area visible.

### Steps
1. Inspect sidebar settings entry and footer settings button accessibility attributes.
2. Inspect home shortcut metadata node in content area.

### Expected Results
- Settings controls still expose identical shortcut label/key metadata.
- Home shortcut metadata remains unchanged.
- Behavior is unchanged after constant extraction.

### Rollback/Cleanup
- No cleanup required.

## Feature: Home shortcut hint text is centralized as a shared constant

### Prerequisites
- App loaded with content area visible.

### Steps
1. Inspect the screen-reader-only home shortcut metadata node.

### Expected Results
- Displayed hint text is unchanged.
- Implementation uses a shared constant for the home shortcut hint string.
- No behavioral change in shortcut handling.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings dialog accessibility description text is centralized

### Prerequisites
- Open settings panel.

### Steps
1. Inspect `#sidebar-settings-panel-description` text in DevTools.

### Expected Results
- Description text remains unchanged for users/assistive tech.
- Implementation references a shared constant for the dialog accessibility description.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings panel accessibility IDs are centralized as shared constants

### Prerequisites
- Settings panel open.

### Steps
1. Inspect settings trigger and panel attributes in DevTools.
2. Confirm `aria-controls`, `id`, `aria-labelledby`, and `aria-describedby` still resolve correctly.

### Expected Results
- Trigger-to-panel and label/description relationships are unchanged.
- Implementation uses shared constants for settings panel IDs.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings dialog escape shortcut metadata is centralized

### Prerequisites
- Settings panel open.

### Steps
1. Inspect settings panel `aria-keyshortcuts` attribute in DevTools.

### Expected Results
- Attribute value remains `Escape`.
- Implementation references shared constant for dialog shortcut metadata.
- Escape close behavior remains unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings dialog title text is centralized

### Prerequisites
- Settings panel open.

### Steps
1. Inspect `#sidebar-settings-panel-title` text in DevTools.

### Expected Results
- Title text remains `Settings` for users/assistive tech.
- Implementation sources this text from a shared constant.

### Rollback/Cleanup
- No cleanup required.

## Feature: Visible Settings labels are centralized as shared constant

### Prerequisites
- Sidebar visible.

### Steps
1. Inspect sidebar Settings entry text.
2. Inspect footer Settings button text.

### Expected Results
- Both controls still render `Settings`.
- Implementation sources this visible label from one shared constant.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings dialog title reuses shared visible label constant

### Prerequisites
- Settings panel open.

### Steps
1. Inspect settings dialog title node (`#sidebar-settings-panel-title`) in DevTools.
2. Compare visible settings labels in sidebar and footer controls.

### Expected Results
- Dialog title text and visible settings labels remain consistent (`Settings`).
- Implementation no longer duplicates separate dialog-title constant.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings route logic uses shared route-name constants

### Prerequisites
- Open and close settings from button, sidebar entry, and `Cmd/Ctrl + ,`.

### Steps
1. Exercise settings open/close flows from thread/home/skills routes.
2. Exercise home shortcut (`Cmd/Ctrl + Shift + H`) while settings is open.

### Expected Results
- Behavior is unchanged after route-name constant extraction.
- Settings return-route behavior and home navigation remain consistent.

### Rollback/Cleanup
- No cleanup required.

## Feature: Template route checks/actions use shared route constants

### Prerequisites
- Sidebar expanded with at least one thread selected.

### Steps
1. Click `Skills Hub` sidebar entry.
2. Open a thread and verify header branch dropdown visibility.

### Expected Results
- Skills navigation still opens `#/skills`.
- Branch dropdown still appears only on thread route.
- Behavior remains unchanged after template constant usage refactor.

### Rollback/Cleanup
- No cleanup required.

## Feature: Shortcut key/code literals are centralized as constants

### Prerequisites
- App focused on non-editable surface.

### Steps
1. Trigger settings/home/sidebar shortcuts.
2. Validate behavior on layouts where physical key code matching is relevant.

### Expected Results
- Shortcut behavior remains unchanged.
- Implementation uses shared constants for key/code literals.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings shortcut ignores editable typing targets

### Prerequisites
- Focus an editable control (`input`, `textarea`, `select`, or contenteditable).

### Steps
1. Press `Cmd/Ctrl + ,` while editable control is focused.
2. Move focus to a non-editable surface and press `Cmd/Ctrl + ,` again.

### Expected Results
- Settings shortcut is ignored while typing in editable targets.
- Settings shortcut works normally from non-editable targets.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings focus trap includes contenteditable controls

### Prerequisites
- Settings panel contains or embeds a `contenteditable` control.

### Steps
1. Open settings.
2. Use `Tab` / `Shift+Tab` to traverse focusable controls.

### Expected Results
- Contenteditable controls are included in the focus cycle.
- Focus remains trapped within settings while open.

### Rollback/Cleanup
- No cleanup required.

## Feature: Global shortcut guards treat ARIA textbox controls as editable targets

### Prerequisites
- Have a control with `role="textbox"` that accepts text input.

### Steps
1. Focus the textbox-role control.
2. Press guarded shortcuts (`Cmd/Ctrl + ,`, `Cmd/Ctrl + B`, `Cmd/Ctrl + Shift + H`).

### Expected Results
- Guarded shortcuts are ignored while focus is in textbox-role controls.
- Shortcut behavior outside editable targets remains unchanged.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings focus trap includes ARIA textbox-role controls

### Prerequisites
- Settings panel includes a focusable control with `role="textbox"`.

### Steps
1. Open settings.
2. Use `Tab` / `Shift+Tab` to traverse controls.

### Expected Results
- Textbox-role controls are included in focus cycle.
- Focus remains trapped within settings while open.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings focusable selector is centralized as shared constant

### Prerequisites
- Settings panel open with multiple focusable controls.

### Steps
1. Traverse controls with `Tab`/`Shift+Tab`.
2. Verify known focusable types still participate (buttons, links, inputs/select/textarea, textbox-role, contenteditable).

### Expected Results
- Focus trap behavior is unchanged after selector constant extraction.
- Implementation no longer rebuilds selector inline in function scope.

### Rollback/Cleanup
- No cleanup required.

## Feature: Combobox-role controls are treated as editable/focus-trap targets

### Prerequisites
- UI includes a focusable control with `role="combobox"`.

### Steps
1. Focus the combobox-role control and press guarded shortcuts.
2. Open settings and traverse focus with `Tab`/`Shift+Tab`.

### Expected Results
- Guarded global shortcuts are ignored while combobox-role control is focused.
- Combobox-role control participates in settings focus trap traversal.

### Rollback/Cleanup
- No cleanup required.

## Feature: Editable-target selector is shared across keyboard guard logic

### Prerequisites
- App includes editable controls (`input`, `textarea`, `select`, textbox/combobox roles, contenteditable).

### Steps
1. Focus each editable target type and test guarded shortcuts.
2. Focus non-editable targets and test the same shortcuts.

### Expected Results
- Behavior remains unchanged after selector centralization.
- Editable targets still suppress guarded shortcuts consistently.

### Rollback/Cleanup
- No cleanup required.

## Feature: Settings focusable selector derives editable subset from shared constant

### Prerequisites
- Settings panel open with multiple editable/non-editable controls.

### Steps
1. Traverse focus with `Tab`/`Shift+Tab` across settings controls.
2. Re-check global shortcut suppression on editable targets.

### Expected Results
- Focus-trap and editable-shortcut guard behavior remain unchanged.
- Editable control coverage stays consistent after selector derivation refactor.

### Rollback/Cleanup
- No cleanup required.

## Feature: Editable content selector fragment is centralized

### Prerequisites
- App includes contenteditable-based editable controls.

### Steps
1. Verify guarded shortcuts while focused in contenteditable controls.
2. Verify settings focus trap still includes contenteditable controls.

### Expected Results
- Behavior remains unchanged after selector-fragment constant extraction.
- No drift between editable-target and focusable selectors for contenteditable handling.

### Rollback/Cleanup
- No cleanup required.

## Feature: Searchbox-role controls are treated as editable/focus-trap targets

### Prerequisites
- UI includes a focusable control with `role="searchbox"`.

### Steps
1. Focus the searchbox-role control and press guarded shortcuts.
2. Open settings and traverse focus with `Tab`/`Shift+Tab`.

### Expected Results
- Guarded global shortcuts are ignored while searchbox-role control is focused.
- Searchbox-role control participates in settings focus trap traversal.

### Rollback/Cleanup
- No cleanup required.

## Feature: Agent ambient suggestions toggle in Settings

### Prerequisites
- App is running and Settings panel is accessible.

### Steps
1. Open `Settings`.
2. Locate `Agent ambient suggestions` row.
3. Toggle it from On to Off.
4. Close Settings and reopen it.
5. Confirm the toggle state persists.
6. Toggle back to On.

### Expected Results
- `Agent ambient suggestions` row is visible in Settings.
- Toggle updates immediately on click.
- State persists across Settings close/reopen.

### Rollback/Cleanup
- Return toggle to previous value.

## Feature: Agent speed toggle in Settings

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Locate `Agent speed` row.
3. Click once to switch from `Standard` to `Fast` (or vice versa).
4. Click again to switch back.

### Expected Results
- `Agent speed` row is visible and shows current mode (`Standard` or `Fast`).
- Clicking the row triggers mode switch and updates the displayed value.
- While a speed update is in flight, row shows `Updating…` and is disabled.

### Rollback/Cleanup
- Restore original speed mode after verification.

## Feature: Agent network access toggle in Settings

### Prerequisites
- App is running with Settings panel accessible.
- Active config supports `sandbox_workspace_write.network_access` writes.

### Steps
1. Open `Settings`.
2. Locate `Agent network access` row.
3. Toggle from `On` to `Off` (or vice versa).
4. Wait for `Updating…` to clear.
5. Re-open Settings and verify value remains.

### Expected Results
- Row is visible and shows current state (`On`/`Off`).
- During write, row shows `Updating…` and is disabled.
- On success, state persists and config summary refreshes.
- On failure, value rolls back and an error is shown.

### Rollback/Cleanup
- Restore previous network-access state.

## Feature: Web search mode cycle in Settings

### Prerequisites
- App is running with Settings panel accessible.
- Config supports `web_search` writes.

### Steps
1. Open `Settings`.
2. Locate `Web search mode` row.
3. Click row repeatedly to cycle through values.
4. Confirm each click shows `Updating…` during write and then a concrete mode.
5. Re-open Settings and confirm last selected mode persists.

### Expected Results
- Modes cycle in order: `disabled` -> `cached` -> `live` -> repeat.
- Failed writes roll back to previous mode and surface an error.
- Successful writes refresh config summary.

### Rollback/Cleanup
- Restore original mode after validation.

## Feature: Approval policy cycle in Settings

### Prerequisites
- App is running with Settings panel accessible.
- Config writes for `approval_policy` are available.

### Steps
1. Open `Settings`.
2. Locate `Approval policy` row.
3. Click repeatedly to cycle through values.
4. Verify `Updating…` appears during each write.

### Expected Results
- Values cycle in order: `untrusted` -> `on-failure` -> `on-request` -> `never` -> repeat.
- Failed write rolls back to previous value with visible error.
- Successful write refreshes config summary.

### Rollback/Cleanup
- Restore original approval policy.

## Feature: Sandbox mode cycle in Settings

### Prerequisites
- App is running with Settings panel accessible.
- Config writes for `sandbox_mode` are available.

### Steps
1. Open `Settings`.
2. Locate `Sandbox mode` row.
3. Click repeatedly to cycle modes.
4. Verify `Updating…` appears during each write.

### Expected Results
- Values cycle in order: `read-only` -> `workspace-write` -> `danger-full-access` -> repeat.
- Failed write rolls back to previous mode with visible error.
- Successful write refreshes config summary.

### Rollback/Cleanup
- Restore original sandbox mode.

## Feature: Collaboration mode cycle in Settings

### Prerequisites
- App is running with Settings panel accessible.
- At least one collaboration mode available (`default` and/or `plan`).

### Steps
1. Open `Settings`.
2. Locate `Collaboration mode` row.
3. Click the row repeatedly.

### Expected Results
- Row cycles through available collaboration modes in order.
- Displayed value updates immediately and remains in sync with composer mode controls.
- If only one mode is available, value remains stable.

### Rollback/Cleanup
- Return to original collaboration mode.

## Feature: Model cycle in Settings

### Prerequisites
- App is running with Settings panel accessible.
- `availableModelIds` contains at least one model.

### Steps
1. Open `Settings`.
2. Locate `Model` row.
3. Click repeatedly to cycle through available models.
4. Check composer model selection remains in sync.

### Expected Results
- Displayed model cycles through `availableModelIds` in order.
- If no model is available, row value stays `(none)` and no change occurs.
- Selected model updates through existing thread-context model state.

### Rollback/Cleanup
- Return to original model selection.

## Feature: Reasoning effort cycle in Settings

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Locate `Reasoning effort` row.
3. Click repeatedly to cycle values.

### Expected Results
- Values cycle in order: `(auto)` -> `none` -> `minimal` -> `low` -> `medium` -> `high` -> `xhigh` -> `(auto)`.
- Composer reasoning-effort state stays in sync with the selected value.

### Rollback/Cleanup
- Restore original reasoning effort.

## Feature: Provider cycle in Settings

### Prerequisites
- App is running with Settings panel accessible.
- Provider switching endpoints are available.

### Steps
1. Open `Settings`.
2. Locate `Provider` row.
3. Click repeatedly to cycle provider values.

### Expected Results
- Values cycle in order: `codex` -> `openrouter` -> `opencode-zen` -> `custom` -> repeat.
- While switching, row shows `Updating…`.
- Existing provider-specific controls remain visible for the selected provider.

### Rollback/Cleanup
- Restore original provider selection.

## Feature: Dictation language cycle row in Settings

### Prerequisites
- App is running and Settings is open.
- Dictation language options are available.

### Steps
1. Locate `Dictation language` row near top-level settings controls.
2. Click repeatedly to cycle language value.
3. Verify the lower dictation-language select reflects the same value.

### Expected Results
- Row cycles through available `dictationLanguageOptions` values.
- Value is persisted via existing dictation-language preference logic.
- Top row and lower select stay synchronized.

### Rollback/Cleanup
- Restore original dictation language.

## Feature: GitHub trending projects row shows explicit On/Off state

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Locate `GitHub trending projects` row.
3. Toggle the row on and off.

### Expected Results
- Row displays explicit value text (`On` or `Off`).
- Value changes immediately after each click.
- Existing behavior of showing/hiding trending cards remains unchanged.

### Rollback/Cleanup
- Restore original toggle state.

## Feature: Top-level toggle rows show explicit On/Off values

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Toggle `Require ⌘ + enter to send`.
3. Toggle `Click to toggle dictation`.
4. Toggle `Auto send dictation`.

### Expected Results
- Each row displays explicit `On`/`Off` text instead of only visual pill state.
- Text updates immediately after toggle.
- Existing behavior of each setting remains unchanged.

### Rollback/Cleanup
- Restore original values for the three settings.

## Feature: Agent ambient suggestions row shows explicit On/Off state

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Locate `Agent ambient suggestions` row.
3. Toggle row on and off.

### Expected Results
- Row displays explicit `On`/`Off` text.
- Text updates immediately after each toggle.
- Existing ambient-suggestions preference behavior remains unchanged.

### Rollback/Cleanup
- Restore original value.

## Feature: Top-level dictation language row shows friendly label

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Change `Dictation language` using either the top-level row or the select control.
3. Observe top-level row value text.

### Expected Results
- Top-level row shows human-friendly option label (for example `Auto-detect` or `Preferred: ...`) instead of raw value code only.
- Top-level row remains synchronized with the select control.

### Rollback/Cleanup
- Restore original dictation language value.

## Feature: Top-level provider row shows user-facing label

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle provider via top-level `Provider` row.
3. Observe displayed value text after each switch.

### Expected Results
- Row shows labels: `Codex`, `OpenRouter`, `OpenCode Zen`, `Custom endpoint`.
- No raw enum values (`codex`, `openrouter`, `opencode-zen`, `custom`) are shown in this row.
- Provider behavior remains unchanged.

### Rollback/Cleanup
- Restore original provider.

## Feature: Top-level collaboration mode row shows user-facing label

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Collaboration mode` row.

### Expected Results
- Row displays `Default` or `Plan` (title case), not raw lowercase enum.
- Cycling behavior remains unchanged.

### Rollback/Cleanup
- Restore original collaboration mode.

## Feature: Top-level model row uses `Auto` fallback label

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Observe `Model` row when no explicit model is pinned for the active context.
3. Select a concrete model, then clear/switch context back to implicit model state.

### Expected Results
- Row shows `Auto` when no explicit model ID is set.
- Row shows concrete model ID when one is set.
- Model cycling behavior remains unchanged.

### Rollback/Cleanup
- Restore original model selection state.

## Feature: Top-level reasoning effort row shows user-facing labels

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Reasoning effort` row through all values.

### Expected Results
- Row shows title-case labels (`Auto`, `None`, `Minimal`, `Low`, `Medium`, `High`, `XHigh`).
- Underlying reasoning-effort behavior and cycling order remain unchanged.

### Rollback/Cleanup
- Restore original reasoning effort value.

## Feature: Top-level approval/sandbox rows use user-facing labels

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Approval policy` and `Sandbox mode` rows.
3. Observe displayed values in each row.

### Expected Results
- Approval row shows labels like `Untrusted`, `On failure`, `On request`, `Never`.
- Sandbox row shows labels like `Read only`, `Workspace write`, `Danger full access`.
- Underlying write behavior remains unchanged.

### Rollback/Cleanup
- Restore original approval/sandbox values.

## Feature: Top-level web search mode row uses user-facing labels

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Web search mode` row.

### Expected Results
- Row displays `Disabled`, `Cached`, or `Live` (title case labels).
- Underlying cycle/write behavior remains unchanged.

### Rollback/Cleanup
- Restore original web search mode.

## Feature: Agent network access row uses Enabled/Disabled labels

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Toggle `Agent network access`.

### Expected Results
- Row displays `Enabled` or `Disabled` labels.
- Write behavior and rollback semantics remain unchanged.

### Rollback/Cleanup
- Restore original network access value.

## Feature: Top-level appearance row uses dedicated user-facing label

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Appearance` row through all states.

### Expected Results
- Row displays `System`, `Light`, `Dark` labels.
- Appearance behavior remains unchanged.

### Rollback/Cleanup
- Restore original appearance mode.

## Feature: Send behavior row uses explicit behavior label

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Toggle `Require ⌘ + enter to send`.
3. Observe row value text after each toggle.

### Expected Results
- Row shows `Enter sends` when normal Enter submit mode is active.
- Row shows `Cmd/Ctrl+Enter sends` when modifier-required submit mode is active.
- Existing submit behavior remains unchanged.

### Rollback/Cleanup
- Restore original send behavior setting.

## Feature: In-progress send mode row uses explicit behavior labels

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Toggle `When busy, send as`.

### Expected Results
- Row displays `Steer active turn` or `Queue message`.
- Existing in-progress send behavior remains unchanged.

### Rollback/Cleanup
- Restore original in-progress send mode.

## Feature: Top-level model row fallback label uses `Default model`

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Ensure active context has no explicit model override.
3. Observe `Model` row value.

### Expected Results
- Row shows `Default model` when no explicit model ID is set.
- Concrete model ID still appears when an explicit model is selected.

### Rollback/Cleanup
- Restore original model selection state.

## Feature: Top-level reasoning effort label formats xhigh as `X-High`

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Reasoning effort` until highest value is selected.

### Expected Results
- Highest value is displayed as `X-High` in top-level row.
- Other labels and behavior remain unchanged.

### Rollback/Cleanup
- Restore original reasoning effort value.

## Feature: Menu bar and notifications rows use Enabled/Disabled labels

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Toggle `Show in menu bar` (macOS only) and `Notifications`.

### Expected Results
- Rows display `Enabled` or `Disabled` labels.
- Existing write behavior and rollback semantics remain unchanged.

### Rollback/Cleanup
- Restore original values.

## Feature: Top-level chat width row uses friendly labels

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Chat width` row through all options.

### Expected Results
- Row displays `Standard`, `Wide`, `Extra Wide`.
- Existing chat width behavior remains unchanged.

### Rollback/Cleanup
- Restore original chat width value.

## Feature: Top-level model row fallback label uses `Thread default`

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Ensure no explicit model override is set for active context.
3. Observe `Model` row value.

### Expected Results
- Row shows `Thread default` fallback label.
- Explicit model IDs still render when selected.

### Rollback/Cleanup
- Restore previous model selection state.

## Feature: Top-level reasoning effort label uses `Extra High` for xhigh

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Reasoning effort` to highest value.

### Expected Results
- Highest value label is shown as `Extra High`.
- Other reasoning labels and behavior remain unchanged.

### Rollback/Cleanup
- Restore original reasoning effort value.

## Feature: Top-level collaboration mode row uses dynamic option labels

### Prerequisites
- App is running with Settings panel accessible.
- Collaboration mode list is available.

### Steps
1. Open `Settings`.
2. Cycle `Collaboration mode` row.
3. Compare row value with labels from available collaboration mode options.

### Expected Results
- Row uses option-provided labels when available.
- Fallback remains `Default`/`Plan` if labels are unavailable.
- Mode-switch behavior remains unchanged.

### Rollback/Cleanup
- Restore original collaboration mode.

## Feature: Top-level model row shows friendly aliases for common model IDs

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle/select models including known IDs (`gpt-5.4`, `gpt-5.4-mini`, `gpt-5.3-codex-spark`, `gpt-5.2`) when available.
3. Observe top-level `Model` row value.

### Expected Results
- Known IDs are shown as friendly aliases (`GPT-5.4`, `GPT-5.4 Mini`, `GPT-5.3 Codex Spark`, `GPT-5.2`).
- Unknown IDs continue to display raw model ID text.
- Selection behavior remains unchanged.

### Rollback/Cleanup
- Restore original model selection.

## Feature: Top-level sandbox mode labels are hyphenated to match config terms

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Sandbox mode` row through all values.

### Expected Results
- Row displays `Read-only`, `Workspace-write`, `Danger-full-access`.
- Underlying cycling/write behavior remains unchanged.

### Rollback/Cleanup
- Restore original sandbox mode.

## Feature: Top-level approval policy labels use hyphenated forms

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Approval policy` row through all values.

### Expected Results
- Row displays `On-failure` and `On-request` for those policies.
- Other labels (`Untrusted`, `Never`) remain unchanged.
- Behavior remains unchanged.

### Rollback/Cleanup
- Restore original approval policy.

## Feature: Top-level reasoning effort label uses `Extra-high` style

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Reasoning effort` to highest value.

### Expected Results
- Highest value displays as `Extra-high` in top-level row.
- Other reasoning labels remain readable and behavior remains unchanged.

### Rollback/Cleanup
- Restore original reasoning effort value.

## Feature: Top-level model row aliases additional common GPT-5.1 IDs

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Select/cycle to model IDs `gpt-5.1` and `gpt-5.1-codex-mini` when available.
3. Observe top-level `Model` row value.

### Expected Results
- `gpt-5.1` displays as `GPT-5.1`.
- `gpt-5.1-codex-mini` displays as `GPT-5.1 Codex Mini`.
- Unknown IDs still fallback to raw text.

### Rollback/Cleanup
- Restore original model selection.

## Feature: Top-level model row aliases `gpt-5.3-codex`

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Select/cycle to `gpt-5.3-codex` when available.
3. Observe top-level `Model` row value.

### Expected Results
- `gpt-5.3-codex` is shown as `GPT-5.3 Codex`.
- Other alias/fallback behavior remains unchanged.

### Rollback/Cleanup
- Restore original model selection.

## Feature: Top-level model row aliases additional Codex model variants

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Select/cycle to `gpt-5.4-codex` and `gpt-5.2-codex` when available.
3. Observe top-level `Model` row value.

### Expected Results
- `gpt-5.4-codex` is shown as `GPT-5.4 Codex`.
- `gpt-5.2-codex` is shown as `GPT-5.2 Codex`.
- Fallback behavior for unknown IDs remains unchanged.

### Rollback/Cleanup
- Restore original model selection.

## Feature: Top-level model row aliases `gpt-5.3` and `gpt-5.0`

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Select/cycle to `gpt-5.3` and `gpt-5.0` when available.
3. Observe top-level `Model` row value.

### Expected Results
- `gpt-5.3` displays as `GPT-5.3`.
- `gpt-5.0` displays as `GPT-5.0`.
- Existing alias/fallback behavior remains unchanged.

### Rollback/Cleanup
- Restore original model selection.

## Feature: Top-level model row aliases `gpt-5.1-codex-max`

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Select/cycle to `gpt-5.1-codex-max` when available.
3. Observe top-level `Model` row value.

### Expected Results
- `gpt-5.1-codex-max` displays as `GPT-5.1 Codex Max`.
- Existing alias/fallback behavior remains unchanged.

### Rollback/Cleanup
- Restore original model selection.

## Feature: Top-level model row aliases `gpt-5.2-codex-mini`

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Select/cycle to `gpt-5.2-codex-mini` when available.
3. Observe top-level `Model` row value.

### Expected Results
- `gpt-5.2-codex-mini` displays as `GPT-5.2 Codex Mini`.
- Existing alias/fallback behavior remains unchanged.

### Rollback/Cleanup
- Restore original model selection.

## Feature: Top-level model row aliases `gpt-5.4-codex-mini`

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Select/cycle to `gpt-5.4-codex-mini` when available.
3. Observe top-level `Model` row value.

### Expected Results
- `gpt-5.4-codex-mini` displays as `GPT-5.4 Codex Mini`.
- Existing alias/fallback behavior remains unchanged.

### Rollback/Cleanup
- Restore original model selection.

## Feature: Top-level model row aliases `gpt-5.3-mini`

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Select/cycle to `gpt-5.3-mini` when available.
3. Observe top-level `Model` row value.

### Expected Results
- `gpt-5.3-mini` displays as `GPT-5.3 Mini`.
- Existing alias/fallback behavior remains unchanged.

### Rollback/Cleanup
- Restore original model selection.

## Feature: Top-level model row aliases `gpt-5.0-codex`

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Select/cycle to `gpt-5.0-codex` when available.
3. Observe top-level `Model` row value.

### Expected Results
- `gpt-5.0-codex` displays as `GPT-5.0 Codex`.
- Existing alias/fallback behavior remains unchanged.

### Rollback/Cleanup
- Restore original model selection.

## Feature: Top-level model row aliases `gpt-5.0-mini`

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Select/cycle to `gpt-5.0-mini` when available.
3. Observe top-level `Model` row value.

### Expected Results
- `gpt-5.0-mini` displays as `GPT-5.0 Mini`.
- Existing alias/fallback behavior remains unchanged.

### Rollback/Cleanup
- Restore original model selection.

## Feature: Top-level model row aliases `gpt-5.0-codex-mini`

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Select/cycle to `gpt-5.0-codex-mini` when available.
3. Observe top-level `Model` row value.

### Expected Results
- `gpt-5.0-codex-mini` displays as `GPT-5.0 Codex Mini`.
- Existing alias/fallback behavior remains unchanged.

### Rollback/Cleanup
- Restore original model selection.

## Feature: Top-level model aliases are table-driven (refactor)

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle/select several known aliased models and an unknown model ID (if available).

### Expected Results
- Known IDs still render the same friendly labels as before.
- Unknown IDs still fall back to raw model text.
- No behavior regression from alias-map refactor.

### Rollback/Cleanup
- Restore original model selection.

## Feature: Top-level provider labels are table-driven (refactor)

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Provider` through all options.

### Expected Results
- Labels remain `Codex`, `OpenRouter`, `OpenCode Zen`, `Custom endpoint`.
- No behavior regression from map-based label refactor.

### Rollback/Cleanup
- Restore original provider.

## Feature: Top-level web search labels are table-driven (refactor)

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Web search mode` through all values.

### Expected Results
- Labels remain `Disabled`, `Cached`, `Live`.
- No behavior regression from map-based label refactor.

### Rollback/Cleanup
- Restore original web search mode.

## Feature: Top-level approval policy labels are table-driven (refactor)

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Approval policy` through all values.

### Expected Results
- Labels remain `Untrusted`, `On-failure`, `On-request`, `Never`.
- No behavior regression from map-based label refactor.

### Rollback/Cleanup
- Restore original approval policy.

## Feature: Top-level sandbox mode labels are table-driven (refactor)

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Sandbox mode` through all values.

### Expected Results
- Labels remain `Read-only`, `Workspace-write`, `Danger-full-access`.
- No behavior regression from map-based label refactor.

### Rollback/Cleanup
- Restore original sandbox mode.

## Feature: Top-level reasoning effort labels are table-driven (refactor)

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Reasoning effort` through all values.

### Expected Results
- Labels remain `Auto`, `None`, `Minimal`, `Low`, `Medium`, `High`, `Extra-high`.
- No behavior regression from map-based label refactor.

### Rollback/Cleanup
- Restore original reasoning effort.

## Feature: Top-level chat width labels are table-driven (refactor)

### Prerequisites
- App is running with Settings panel accessible.

### Steps
1. Open `Settings`.
2. Cycle `Chat width` through all values.

### Expected Results
- Labels remain `Standard`, `Wide`, `Extra Wide`.
- No behavior regression from map-based label refactor.

### Rollback/Cleanup
- Restore original chat width.
