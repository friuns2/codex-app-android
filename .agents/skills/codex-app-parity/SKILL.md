---
name: "codex-app-parity"
description: "Use when implementing or changing user-visible behavior/UI in this repository and parity with the installed Codex desktop app must be validated before coding."
---

# Codex App Parity Skill

Use this skill for any feature work or user-visible behavior/UI change in this repository.
Do not use it for purely internal refactors that do not affect behavior.

## Objective

Ensure behavior is implemented with Codex.app as the source of truth, then verified with headless Playwright and screenshots.

## Project Instructions

## Codex.app-First Development Policy

For every **new feature** and every **behavior/UI change**, treat the installed desktop app as the source of truth:

- App path: `/Applications/Codex.app`
- Primary bundle to inspect: `/Applications/Codex.app/Contents/Resources/app.asar`

Do not implement first and compare later. Compare first, then implement.

## How to Search for Features in Codex.app

### Extraction

Extract the app bundle once (reuse if already extracted):

```bash
mkdir -p /tmp/codex-app-extracted
npx asar extract "/Applications/Codex.app/Contents/Resources/app.asar" /tmp/codex-app-extracted
```

### Key Directories

| Directory | Contents |
|-----------|----------|
| `/tmp/codex-app-extracted/webview/assets/` | Main frontend bundle (`index-*.js`) + locale files |
| `/tmp/codex-app-extracted/.vite/build/` | Electron main process (`main.js`, `main-*.js`, `preload.js`, `worker.js`) |
| `/tmp/codex-app-extracted/package.json` | App metadata, version, entry point |

### Searching the Minified Bundle

The main UI bundle is a single large minified JS file at `webview/assets/index-*.js`. Use Python to search since `grep -o` with large repeat counts fails on macOS:

```python
python3 -c "
with open('/tmp/codex-app-extracted/webview/assets/index-<hash>.js', 'r') as f:
    content = f.read()
idx = content.find('YOUR_SEARCH_TERM')
if idx >= 0:
    print(content[max(0, idx-200):idx+500])
"
```

### What to Search For

1. **i18n keys**: Search locale files (`webview/assets/zh-TW-*.js`, `webview/assets/en-*.js`, etc.) for human-readable labels. Keys follow the pattern `component.feature.property` (e.g., `composer.dictation.tooltip`).

2. **Component functions**: Minified React components follow patterns like `function X4n({prop1:t,prop2:e,...})`. Search for the feature's i18n key to find the component that renders it.

3. **API calls and endpoints**: Search main process files (`.vite/build/main-*.js`) for endpoint URLs, auth handling, and IPC channels. Key patterns:
   - `prodApiBaseUrl` → production API base (e.g., `https://chatgpt.com/backend-api`)
   - `devApiBaseUrl` → dev API base (e.g., `http://localhost:8000/api`)
   - `fetch-request` / `fetch-response` → IPC-proxied HTTP calls from renderer to main process

4. **Icon names**: Search for icon imports like `audiowave-dark.svg`, `book-open-dark.svg`. Icon mapping is in the main bundle around the `Hwn=Object.assign({` pattern.

5. **Keyboard shortcuts**: Search for `CmdOrCtrl+`, `Cmd+`, `keydown`, `keyCode`, or specific key names.

### Search Strategy

1. Start with **i18n locale files** — they have human-readable labels that identify features.
2. Use the i18n key to find the **component** in the main bundle.
3. Trace the component to find **hooks/composables**, **API calls**, and **event handlers**.
4. Check the **main process** bundle for any server-side proxying or Electron IPC handling.

### Architecture Notes

- **Renderer → Main Process**: The renderer uses a `Uu` HTTP client class that sends `fetch-request` IPC messages to the main process. The main process class `tle` handles these, adds auth tokens, and uses `electron.net.fetch` to make actual HTTP calls.
- **Auth**: Auth tokens come from the app-server's `getAuthStatus` RPC method (ChatGPT backend auth).
- **App-server**: A `codex app-server` child process communicating via JSON-RPC over stdin/stdout. Our bridge middleware proxies RPC calls to it.
- **Config constants**: `R7` = prodApiBaseUrl (`https://chatgpt.com/backend-api`), `I7` = devApiBaseUrl (`http://localhost:8000/api`), `C7` = originator (`Codex Desktop`).

## Required Workflow (Feature Work)

1. Identify target behavior:
- Restate what behavior is being added/changed.
- Define whether it is: data mapping, runtime event handling, UX text, visual treatment, interaction model, or all of these.

2. Inspect Codex.app before coding:
- Locate the implementation in `app.asar` (extract and search built assets as needed).
- Find relevant strings/keys/functions/components for the feature (status labels, event names, item types, summaries, collapse/expand behavior, etc.).
- Capture the closest equivalent pattern if exact parity is not present.

3. Build a parity checklist from Codex.app:
- Data model shape (fields used by UI).
- Realtime event sources and transitions.
- Rendering structure (what is shown collapsed vs expanded).
- Copy/text behavior (phrasing and status wording).
- Interaction behavior (auto-expand, auto-collapse, click/keyboard handling).
- Visibility rules (when elements appear/disappear).

4. Implement against that checklist:
- Prefer Codex.app behavior over novel design.
- Keep deviations minimal and intentional.
- If deviating, include a short reason in the final response.

5. Verify parity after implementation:
- Confirm each checklist item.
- Run local build/tests.
- Re-check UI behavior against Codex.app reference.

## Response Requirements (When delivering feature changes)

For feature tasks, include:

- `Codex.app analysis`: what was inspected (files/areas/patterns).
- `Parity result`: matched items and any explicit deviations.
- `Fallback note` only if Codex.app could not be inspected or had no equivalent.

## Fallback Rules

If Codex.app cannot be inspected (missing app, extraction/search failure) or has no equivalent pattern:

- State the blocker explicitly.
- Use best local implementation consistent with existing repository patterns.
- Keep behavior conservative and avoid speculative UX innovations.

## Scope and Safety

- This policy applies to **feature behavior and UX decisions**, not just styling.
- Bug fixes should still check Codex.app when they affect user-visible behavior.
- Prefer minimal patches that align with app behavior rather than large refactors.

## Completion Verification Requirement

- After completing a task that changes behavior or UI, always run a Playwright verification in **headless** mode.
- Always capture a screenshot of the changed result and display that screenshot in chat when reporting completion.

## Self-Improvement Protocol

After each feature implementation session that uses this skill:

1. **Record new findings**: Append a dated `## Findings:` section documenting any newly discovered Codex.app internals (state keys, API endpoints, component patterns, auth flows, etc.).
2. **Update search instructions**: If new search techniques were used (e.g., a better way to extract minified code, new file locations), update the "How to Search for Features" section.
3. **Update architecture notes**: If new IPC channels, API endpoints, or data flows were discovered, add them to the Architecture Notes.
4. **Keep findings actionable**: Each finding should include enough detail that a future session can reuse it without re-discovering.

## Findings: Workspace Root Ordering (2026-02-25)

- Codex.app persists workspace root ordering/labels in global state JSON keys:
  - `electron-saved-workspace-roots` (order source of truth)
  - `electron-workspace-root-labels`
  - `active-workspace-roots`
- In this environment, persisted file path is:
  - `~/.codex/.codex-global-state.json`
- In packaged desktop runs, equivalent userData path is typically:
  - `~/Library/Application Support/Codex/.codex-global-state.json`
- For folder/project reorder parity, prefer reading these keys over browser LocalStorage-only ordering.
- Validation requirement for reorder changes:
  - Run build/typecheck.
  - Run Playwright in headless mode and capture a screenshot showing sidebar order.

## Findings: Approval Request Payload Compatibility (2026-04-07)

- This workspace bundles app-server schemas that still expose JSON-RPC server request methods such as `item/commandExecution/requestApproval` and `item/fileChange/requestApproval`, but the generated event typings also include newer approval event names such as `exec_approval_request` and `apply_patch_approval_request`.
- Newer approval payloads may carry snake_case fields (`turn_id`, `call_id`, `grant_root`) or camelCase fields (`conversationId`, `callId`, `grantRoot`) instead of the older `threadId` / `itemId` request metadata.
- For CodexUI parity work involving approvals, normalize both method aliases and payload field aliases before rendering the pending-request UI; otherwise valid approval requests can fall through to the generic unknown-request actions.
- Live schema generated from `codex-cli 0.118.0` also includes JSON-RPC server requests for `mcpServer/elicitation/request` and `item/permissions/requestApproval`. The checked-in schema snapshot in this repo can lag behind the installed CLI, so for approval/request UI bugs it is worth generating fresh schemas locally via `codex app-server generate-json-schema --out <dir>` before deciding the app-server contract.
- In live MCP elicitation schemas, required fields without defaults should remain unset until the user provides a value; preselecting `false` or the first enum option changes the meaning of the user’s response.
- For MCP `url` elicitation mode, treat the server-provided URL as untrusted input and only render clickable links for safe schemes such as `http:` and `https:`.

## Findings: Pinned Thread Persistence (2026-04-07)

- This workspace now persists pinned sidebar threads in Codex global state (`~/.codex/.codex-global-state.json`) under key `thread-pinned-ids`.
- Bridge API endpoints added for web/client parity wiring:
  - `GET /codex-api/thread-pins` -> `{ data: { threadIds: string[] } }`
  - `PUT /codex-api/thread-pins` with body `{ threadIds: string[] }`
- Frontend behavior:
  - Sidebar bootstraps pins from `thread-pinned-ids` via the bridge endpoint.
  - No `localStorage` persistence is used for pinned-thread state.

## Findings: Context Usage Meter (2026-04-01)

- Official `openai/codex` app-server protocol exposes per-thread context telemetry via `thread/tokenUsage/updated` with:
  - `tokenUsage.total`
  - `tokenUsage.last`
  - `tokenUsage.modelContextWindow`
- In the official TUI, context-window percentage is derived from `last_token_usage`, not cumulative `total_token_usage`.
- Official normalization subtracts a fixed `BASELINE_TOKENS = 12000` before computing remaining context percentage, so early turns do not look artificially "used".
- Official status/context copy found in the TUI favors:
  - `X% left`
  - `Y used`
  - `Z window`
- When docs are blocked, the quickest parity trace for this feature is:
  - `codex-rs/app-server-protocol/schema/typescript/v2/ThreadTokenUsage*.ts`
  - `codex-rs/tui/src/chatwidget.rs`
  - `codex-rs/protocol/src/protocol.rs`

## Findings: File Change Turn Summaries (2026-03-30)

- Official app-server docs in `openai/codex` confirm that:
  - `turn/diff/updated` carries `{ threadId, turnId, diff }` as the latest aggregated unified diff for the whole turn.
  - `fileChange` thread items carry `{ id, changes, status }`.
  - Each `changes` entry is `{ path, kind, diff }`.
- For persisted/history-backed UI summaries, prefer `fileChange` thread items over reconstructing state from deltas:
  - `kind` maps to add/delete/update.
  - `update` may include `move_path` for rename/move handling.
  - `item/completed` is the authoritative final state for whether edits actually applied.
- For user-facing file summaries, treat `turn/diff/updated` as a supplemental aggregated diff source, not the only source:
  - pure rename/move flows may not emit a meaningful turn diff payload for summary text.
  - `fileChange` items are the more reliable source for per-file operation labels.

## Findings: Mobile Composer Submit Stabilization (2026-03-28)

- In this workspace, mobile web send UX is more reliable when submit does two things together:

## Findings: Header Branch Switcher Includes Review Action (2026-04-08)

- Codex.app locale bundle includes explicit branch-search copy (`codex.composer.searchBranches`), which aligns with searchable branch selection controls in header/composer surfaces.
- For parity in this repo, header-level branch control now combines:
  - current branch display,
  - branch switching via searchable dropdown,
  - review-pane toggle action inside the same menu instead of a separate header button.
- Detached HEAD should be represented explicitly in the dropdown trigger when no branch name is available.
  - blur the composer textarea immediately so the virtual keyboard dismisses
  - trigger the conversation `jumpToLatest()` immediately and again over the next animation frames so the viewport stays pinned after the keyboard resize
- Relying on conversation auto-follow alone is not enough for the mobile keyboard-close transition because the viewport height change can land after the first bottom-lock pass.

## Findings: Thread Forking (2026-03-28)

- The bundled app-server protocol in this repo already exposes stable `thread/fork` support in v2, so UI work should call the RPC directly instead of simulating a new thread locally.
- `ThreadForkParams.path` is documented as an unstable rollout-path override, while `threadId` remains the preferred stable entry point for IDE clients.
- When implementing “fork from this answer” in the UI, a safe repo-local strategy is:
  - call `thread/fork` for the source thread
  - then call `thread/rollback` on the new thread for trailing turns after the chosen answer
- Verification can assert real branching, not just button presence:
  - fork from a non-final response in Playwright
  - confirm URL changes to a new thread id
  - confirm the new thread has fewer turns than the source thread
- Thread title rendering in this fork must prefer server-provided `name`/`title` over `preview`; otherwise renamed forked threads will still look identical to the source thread in the header and sidebar.

## Findings: Ordered List Numbering (2026-03-27)

- `ThreadConversation.vue` uses a custom Markdown block parser rather than a standard Markdown library.
- Ordered-list items separated by non-indented paragraphs are parsed into multiple `orderedList` blocks.
- To preserve author-visible numbering in that case, each `orderedList` block needs the original marker value persisted and rendered via the HTML `<ol start=\"...\">` attribute.
## Findings: Dictation / Microphone Feature (2026-02-26)

- **i18n keys**: `composer.dictation.*` — tooltip is "Hold to dictate", aria is "Dictate".
- **Component**: `M4n` React hook handles recording state, audio capture, and transcription.
- **Audio pipeline**: `navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } })` → `MediaRecorder` → chunks → `Blob` → multipart POST.
- **Transcription endpoint**: The renderer sends audio to `/transcribe` via the IPC fetch proxy. The main process (`tle` class) prepends the `prodApiBaseUrl` (`https://chatgpt.com/backend-api`) and attaches ChatGPT auth bearer tokens. Full URL: `https://chatgpt.com/backend-api/transcribe`.
- **Request format**: Multipart form-data with boundary `----codex-transcribe-<uuid>`, fields: `file` (audio blob) and optional `language`. Body is base64-encoded and sent with `X-Codex-Base64: 1` header.
- **Response**: `{ text: "transcribed text" }`.
- **Interaction model**: Press-and-hold to record → release to stop and transcribe → text inserted into composer. Has "insert" and "send" modes.
- **Icon**: `audiowave-dark.svg` / `audiowave-light.svg` (custom SVG, not from icon library).
- **Web app implementation**: Our bridge proxies `/codex-api/transcribe` to the ChatGPT backend using auth tokens from the app-server `getAuthStatus` RPC. Frontend uses `useDictation` composable with `MediaRecorder` API.

## Findings: Chat Markdown Image Embeds (2026-03-04)

- Codex.app renderer bundle includes markdown-to-HTML image handling (`image({href,title,text})` emits `<img src="...">`), consistent with inline markdown image rendering in assistant/user text.
- In web parity mode, absolute local paths in markdown image URLs need explicit server mediation; browser runtime does not resolve `/Users/...` as local files.
- A dedicated local image endpoint (`/codex-local-image?path=...`) is required for parity-like rendering of absolute filesystem image paths in browser-delivered UI.
- Express `sendFile` must allow dot-directory segments (`dotfiles: 'allow'`) or paths under `~/.codex/...` return 404 despite existing files.

## Findings: Composer Enter Behavior (2026-03-05)

- Codex.app composer input is rich-text/multiline (`ProseMirror`-based), not single-line.
- Enter handling is configurable (`enterBehavior`):
  - `enter` submits by default.
  - `newline` inserts a newline on Enter.
  - `cmdIfMultiline` inserts newline when multiline, otherwise submits.
- Newline shortcuts are explicitly bound:
  - `Shift-Enter` inserts newline.
  - `Alt-Enter` inserts newline.
  - `Mod-Enter` submits.
- This confirms multiline composition parity requires newline-capable input plus explicit Enter-vs-newline key handling.

## Findings: Composer `@` Mentions (2026-03-05)

- Codex.app uses a dedicated mention trigger plugin for `@` with pattern `/(^|\s)(@[^\s@]*)$/`, so mentions activate at word boundaries and stop on whitespace or a second `@`.
- Mention entries are stored as an inline `mention-ui` node with attrs `{ label, path, fsPath }`, rendered with data attributes `at-mention-label`, `at-mention-path`, and `at-mention-fs-path`.
- Mention picker keyboard behavior includes:
  - `Escape` closes mention UI.
  - `Enter` and `Tab` commit the highlighted mention.
- Composer placeholder copy in local mode explicitly documents this affordance: `Ask Codex anything, @ to add files, / for commands`.

## Findings: Thread Rename Flow (2026-03-12)

- Codex.app locale keys confirm sidebar rename flow is dialog-based, not inline:
  - `sidebarElectron.renameThread`
  - `sidebarElectron.renameThreadDialogTitle`
  - `sidebarElectron.renameThreadDialogSubtitle`
  - `sidebarElectron.renameThreadDialogPlaceholder`
  - `sidebarElectron.renameThreadDialogSave`
  - `sidebarElectron.renameThreadDialogCancel`
  - `sidebarElectron.renameThreadDialogAriaLabel`
- App-server RPC for rename uses method `thread/name/set` with params `{ threadId, name }` (not `threadName`).
- `thread/name/updated` realtime notification carries `{ threadId, threadName }`, so parity implementations should handle both request/response naming differences (`name` on write, `threadName` on notification).

## Findings: Local Parity Fallback (2026-03-27)

- In this workspace, `/Applications/Codex.app/Contents/Resources/app.asar` was not present, so Codex.app-first inspection could not run.
- For user-visible changes under this constraint, use the skill's fallback path explicitly: preserve existing repository interaction patterns, keep the UX conservative, and call out the parity blocker in the completion report.

## Findings: Settings Account Labels (2026-03-24)

- No equivalent multi-account switcher UI was found in the installed Codex.app bundle for Settings/account list behavior, so parity work should follow the existing local Settings visual language instead of inventing a separate header menu.
- When showing multiple saved accounts that share the same email, account/workspace identity needs its own dedicated label line; folding the workspace identifier into secondary metadata and truncating it makes entries indistinguishable in narrow sidebars.

## Findings: Mobile Install Icons (2026-03-23)

- In this web workspace, mobile home-screen installation depends on both `link[rel="apple-touch-icon"]` in `index.html` and the PNG entries in `public/manifest.webmanifest`; updating only the manifest is not enough for iPhone-style add-to-home-screen flows.
- Small PNGs generated from SVG via headless Chrome can silently degrade to all-white images when the SVG is loaded indirectly during screenshot capture. Rendering a reliable large PNG first and deriving smaller sizes from that output avoids blank icon assets.
- For non-transparent exported PNG icons, any transparent margin around the SVG is rasterized against the page background. Set an explicit dark page background during capture or use full-bleed icon artwork to avoid white edges that make installed icons look washed out.
- A more reliable fix than screenshot capture is to rasterize SVGs through a browser canvas (`Image` + `drawImage` + `canvas.toDataURL()`), which preserves the real SVG bounds and avoids dark corner contamination from the page background.

## Findings: PWA Packaging Fallback (2026-03-23)

- This repository can be made installable as a browser app without changing runtime behavior by adding standard PWA assets:
  - HTML manifest link + theme color metadata
  - production-only service worker registration in `src/main.ts`
  - static `manifest.webmanifest`
  - static icons under `public/icons/`
- Codex.app desktop parity could not be inspected in this environment because `/Applications/Codex.app` was unavailable, so PWA packaging should follow the fallback path and avoid speculative UX changes.
- A conservative service worker strategy for this repo is:
  - bypass `/codex-api/*` and local file proxy endpoints
  - use navigation fallback to cached `/`
  - use runtime caching for same-origin static assets and manifest

## Findings: Plan Mode Turn Start (2026-03-22)

- App-server rejects `turn/start.collaborationMode` unless the client advertises `initialize.capabilities.experimentalApi = true`.
- `turn/start.collaborationMode.settings.model` must be a non-empty concrete model id. Sending `""` can leave a plan-mode thread stuck or fail without rendering plan output.
- In this environment, `collaborationMode/list` returns `Plan` with `mode: "plan"` and `reasoning_effort: "medium"`, but `model` is `null`, so the client must source the actual model from current config or available models before starting the turn.

## Findings: Account Rate Limits Protocol (2026-03-21)

- App-server exposes quota state via `account/rateLimits/read` and pushes live updates with `account/rateLimits/updated`.
- Read responses can include `rateLimitsByLimitId.codex`; if absent, fall back to the legacy top-level `rateLimits` bucket.
- Runtime payloads use camelCase fields:
  - snapshot: `limitId`, `limitName`, `planType`, `primary`, `secondary`, `credits`
  - window: `usedPercent`, `windowDurationMins`, `resetsAt`
  - credits: `hasCredits`, `unlimited`, `balance`
- For compact composer display, a conservative summary can be derived from `primary`/`secondary` windows without forcing a full account panel.
- Weekly refresh copy can be derived entirely client-side by selecting the quota window whose `windowDurationMins` is `10080` (or the nearest longer weekly-like window) and formatting its `resetsAt` timestamp into a calendar date for the tooltip.
- On touch/mobile surfaces, quota details hidden only in a `title` attribute are effectively invisible. Weekly refresh information needs to be rendered as visible text in the composer quota badge, not only in hover-only tooltip content.
- For compact inline display, the weekly refresh segment should be date-only (for example `Mar 28` / `3月28日`) and appended on the same line as the quota summary instead of using a separate explanatory label.

## Findings: Empty Project Removal Persistence (2026-03-21)

- In this web UI, empty project groups can be recreated purely from persisted workspace-root state, even when no threads exist for that project.

## Findings: Mobile Foreground Resume (2026-03-23)

- In this web workspace, a conservative mobile-only freshness policy can be implemented at the app shell level (`App.vue`) by combining:
  - `document.visibilitychange` to record background entry
  - `window.pageshow` to catch BFCache restores
  - `window.focus` as a final foreground fallback
- Restricting the behavior to the existing `<768px` mobile breakpoint avoids forcing reloads on tablet/desktop layouts during tab focus changes.
- A small hidden-duration threshold helps avoid accidental reloads from transient overlays while still reloading after real app switches.
- The persistence source of truth is still the global state keys:
  - `electron-saved-workspace-roots`
  - `electron-workspace-root-labels`
  - `active-workspace-roots`
- Removing a project must delete matching workspace-root entries from all three persisted collections; updating in-memory order alone is insufficient because hydration will rebuild an empty placeholder group on refresh.
- The placeholder group is produced by `orderGroupsByProjectOrder(...)`, which materializes `{ projectName, threads: [] }` when a persisted project name has no matching incoming thread group.

## Findings: Markdown Block Rendering Fallback (2026-03-21)

- Codex.app could not be inspected in this Linux environment because `/Applications/Codex.app` is unavailable.
- Conservative fallback for message markdown rendering is to keep the existing inline parser and add a lightweight block parser in `ThreadConversation.vue`.
- A low-risk split that matches existing web UI structure is:
  - block-level parsing for paragraphs, unordered lists, ordered lists, and inline markdown images
  - inline parsing reused for bold, inline code, URLs, and file links
- This avoids introducing a full markdown dependency while fixing the most visible raw-markup regressions (`- item`, `1. item`, `**bold**`).
- Expanded fallback block support that still fits this local parser architecture:
  - headings (`#` ... `######`)
  - blockquotes (`> quote`)
  - task lists (`- [ ]`, `- [x]`)
  - thematic breaks (`---`, `***`, `___`)
  - fenced code blocks (``` / ~~~)
- To avoid breaking local-image rendering and file-link handling, code-fence splitting should happen before inline image token splitting, otherwise `![...](...)` inside fenced code can be misparsed as a real image block.

## Findings: Mobile Composer Auto-Zoom Fallback (2026-03-21)

- Codex.app could not be inspected in this environment, so mobile zoom behavior was handled with a browser-level fallback.

## Findings: Plan Mode Fallback Wiring (2026-03-22)

- Codex.app could not be inspected in this Linux environment because `/Applications/Codex.app` is unavailable, so plan-mode behavior was aligned to the shipped app-server protocol instead of renderer-bundle parity.
- App-server protocol already exposes the full plan-mode surface needed by the web UI:
  - `TurnStartParams.collaborationMode`
  - `ModeKind = "plan" | "default"`
  - `turn/plan/updated`
  - `item/plan/delta`
  - `ThreadItem.type = "plan"`
  - `item/tool/requestUserInput`
- Conservative web fallback for plan mode:
  - persist the selected collaboration mode locally under `codex-web-local.collaboration-mode.v1`
  - send `collaborationMode: { mode: "plan", settings: { model, reasoning_effort, developer_instructions: null } }` only when plan mode is selected
  - omit `collaborationMode` entirely for default mode to disable plan mode cleanly
- `collaborationMode/list` can be treated as advisory rather than authoritative for web fallback:
  - when available, use server labels for `default` / `plan`
  - still keep static `Default` and `Plan` options available so the feature remains usable against servers that lag the preset-list endpoint
- `request_user_input` questions need broader handling than the original approval-like UI:
  - support selectable options with descriptions
  - support free-text questions when `options` is `null` or empty
  - support secret answers via password inputs when `isSecret` is true
- On mobile browsers, especially iOS Safari, focusing text inputs below `16px` commonly triggers viewport auto-zoom.
- In this repo, the main composer textarea used `text-sm` (`14px` computed on mobile), which is sufficient to trigger that browser behavior.
- Conservative fix: keep viewport meta unchanged and raise focusable text input font-size to `16px` on mobile widths, instead of disabling pinch zoom globally.

## Findings: Dark Markdown Theme Coverage Fallback (2026-03-21)

- Codex.app could not be inspected in this environment, so dark-mode markdown behavior was aligned using existing web theme conventions.
- When adding new markdown block renderers in `ThreadConversation.vue`, matching `:root.dark` overrides must also be added in `style.css`; otherwise the new nodes inherit light-theme slate colors and become low-contrast in dark mode.
- The markdown-specific classes that require explicit dark coverage in the current UI are:
  - headings (`.message-heading`, `.message-heading-h6`)
  - emphasis (`.message-bold-text`, `.message-italic-text`, `.message-strikethrough-text`)
  - blockquote/list/task styles (`.message-blockquote`, `.message-list`, `.message-task-checkbox`)
  - fenced code and divider styles (`.message-code-block`, `.message-code-language`, `.message-divider`)
- A safe fallback pattern is to keep foreground text near existing dark message colors (`zinc-100`/`zinc-200`) and move structural surfaces to darker zinc backgrounds, so markdown blocks remain legible without deviating from the current dark theme.

## Findings: Web Title Branding Fallback (2026-03-21)

- Codex.app could not be inspected in this environment, so title branding was aligned using the existing web entry points.
- The browser tab title for the main app comes from `index.html`.
- The unauthenticated/login page has its own inline HTML template in `authMiddleware.ts`, so branding changes need to update both places to stay consistent.

## Findings: Sidebar Thread Menu Clickability Fallback (2026-03-21)

- Codex.app could not be inspected in this environment, so thread-menu behavior was aligned using stable web popover patterns.
- In this sidebar implementation, thread menus are rendered inside the `right-hover` slot of `SidebarMenuRow`; if the row stops being hovered and no explicit open-state override is applied, that slot can collapse and make the menu hard to interact with.
- Outside-click dismissal must include `openThreadMenuId` in the shared dismiss-listener condition. Otherwise thread menus fall back to ad-hoc closing logic and can behave inconsistently.
- For rows near the bottom of the scrollable sidebar, the menu should choose its open direction based on available space in the nearest overflow-clipping ancestor rather than always opening downward.
- A low-risk fallback is:
  - keep the row in `forceRightHover` mode while its menu is open
  - raise the open row above siblings with a higher z-index
  - auto-flip the menu upward when the scroll container has less space below than above

## Findings: Thread Delete Semantics (2026-03-12)

- In this app-server API surface there is no `thread/delete` method in v2 docs/schemas; thread removal from active list is handled through `thread/archive`.
- For delete-like UI parity in sidebar menus, implement a destructive confirmation dialog and route confirmation to `thread/archive`.

## Findings: Build Badge (2026-03-16)

- Searched extracted Codex.app webview assets for `build-badge`, `WT`, and `worktree` UI markers; no explicit build badge or worktree/version label found in renderer bundle.

## Findings: Parity Extraction Sanity Check (2026-03-27)

- In this environment, `/Applications/Codex.app` may be absent while `/tmp/codex-app-extracted` still exists as an empty directory from a prior session.
- Before relying on extracted bundle searches, verify both the app bundle path and that the extraction target actually contains files.
- When both checks fail for a UI change, treat parity inspection as blocked, use existing repository behavior as the fallback baseline, and report that gap explicitly in the final response.

## Findings: Terminal-Focus Shortcut Verification Hygiene (2026-04-21)

- Shortcut tests that claim "ignored under terminal focus" must avoid using editable controls (`input`, `textarea`) as the focused probe.
- Use a non-editable focus target (for example a `div` with `tabIndex=-1`) inside a terminal-like host (`[data-codex-terminal]`) so assertions exercise terminal guards rather than editable-target guards.
- Treat this as required verification hygiene for all `*-ignore-terminal-focus-*` Playwright assertions.

## Findings: Message Action Removal Fallback (2026-03-27)

- With Codex.app unavailable for inspection, message-action removals should be implemented as full UI deletion, not partial hiding.
- In this codebase, message actions span both template nodes in `ThreadConversation.vue` and shared dark-theme overrides in `style.css`; removing only the button markup leaves dead hover/dark styles behind.
- A safe fallback cleanup is to remove the template block, the helper functions/imports that feed it, and the corresponding `.message-action*` selectors together in the same change.

## Findings: Detached HEAD Worktree Creation (2026-04-08)

- Codex.app worker bundle creates new worktrees with detached HEAD semantics:
  - `git worktree add --detach <worktreePath> <startRef>`
- Evidence location in extracted app bundle:
  - `/tmp/codex-app-extracted/.vite/build/worker.js` (`Xq(...)` flow)
- Parity implication for this repo:
  - New worktree creation should not create/switch to a new local branch by default.
  - API responses should treat branch as nullable/absent for detached worktrees.

## Findings: Thread Find Command Parity (2026-04-21)

- Codex.app locale bundles include command-surface keys for in-thread find behavior (`codex.command.findInThread`), which should map to a direct thread-local search action rather than sidebar/global thread filtering.
- For this repo, a low-risk parity step is:
  - expose a thread-scoped find input in the thread header actions area,
  - bind `Cmd/Ctrl+F` to focus that input on thread routes,
  - support forward/backward stepping (`Enter` / `Shift+Enter` and arrow buttons),
  - scroll active match into view and visibly highlight it.
- When a prior query already exists, `Cmd/Ctrl+F` should select all existing text after focusing so users can replace the query immediately.
- `Cmd/Ctrl+F` should also ignore terminal-like focus to avoid hijacking terminal keyboard workflows.
- Implementation note for this codebase:
  - `ThreadConversation.vue` can be targeted safely via `data-message-id` plus `scrollIntoView`,
  - match state can be owned in `App.vue` using existing `filteredMessages` as the search corpus.

## Findings: Route History Shortcut Parity (2026-04-21)

- Codex.app shortcut map includes route-history commands:
  - `navigateBack`: `CmdOrCtrl+[`
  - `navigateForward`: `CmdOrCtrl+]`
- In this repo, a low-risk parity step is to bind non-shift bracket shortcuts in `App.vue` global keydown handler and route them to router history navigation:
  - `router.back()` for `BracketLeft`
  - `router.forward()` for `BracketRight`
- Keep shift-modified bracket shortcuts (`Cmd/Ctrl+Shift+[`, `Cmd/Ctrl+Shift+]`) reserved for thread cycling to avoid collisions.
- Navigation shortcuts should also ignore terminal-like focus so terminal workflows are not interrupted by history/thread-navigation accelerators.

## Findings: Sidebar Search Shortcut Parity (2026-04-21)

- Codex.app accelerator map includes `searchChats` bound to `CmdOrCtrl+G`.
- In this repo, a low-risk parity implementation is to map `Cmd/Ctrl+G` in `App.vue` global keydown to:
  - ensure sidebar search UI is visible,
  - focus `sidebarSearchInputRef` on the next tick.
- This preserves existing thread-local find behavior on `Cmd/Ctrl+F` while providing global thread-list search parity.

## Findings: Alternate New Thread Shortcut Parity (2026-04-21)

- Codex.app accelerator map includes `newThreadAlt` on `CmdOrCtrl+Shift+O` in addition to `newThread` on `CmdOrCtrl+N`.
- In this repo, parity can be implemented safely by routing `Cmd/Ctrl+Shift+O` to the existing new-thread action (`onStartNewThreadFromToolbar`) so behavior stays consistent with `Cmd/Ctrl+N`.
- New-thread/open-folder shortcut paths should ignore terminal-like focus so terminal workflows are not interrupted by workspace/thread navigation accelerators.

## Findings: Open Folder Shortcut Parity (2026-04-21)

- Codex.app accelerator map includes `openFolder` on `CmdOrCtrl+O`.
- In this repo, a low-risk parity mapping is to route `Cmd/Ctrl+O` to the existing folder-picker action (`onOpenExistingFolder`) so it opens the same "Select folder" dialog as the UI button path.

## Findings: Archive Thread Shortcut Parity (2026-04-21)

- Codex.app accelerator map includes `archiveThread` on `CmdOrCtrl+Shift+A`.
- In this repo, parity can be implemented by reusing existing archive flow in `App.vue` (`archiveThreadById(selectedThreadId)`) when a thread is selected, keeping behavior aligned with sidebar archive action.
- Route-scope gating should require active thread context (`route.name === 'thread'`) so archive shortcuts are ignored on home/settings surfaces.
- Archive shortcut should also ignore terminal-like focus to avoid accidental destructive actions during terminal workflows.

## Findings: Quick Chat Shortcut Parity (2026-04-21)

- Codex.app accelerator map includes `quickChat` on `CmdOrCtrl+Alt+N`.
- In this repo, a conservative parity step is to map `Cmd/Ctrl+Alt+N` to the same new-thread entry flow as `Cmd/Ctrl+N` (`onStartNewThreadFromToolbar`) to preserve predictable behavior.

## Findings: Sidebar File Search Shortcut Parity (2026-04-21)

- Codex.app accelerator map includes `searchFiles` on `CmdOrCtrl+P`.
- This fork has no separate file-search palette, but it does have a sidebar search surface with focusable input.
- A low-risk parity mapping is to route `Cmd/Ctrl+P` to open/focus sidebar search (same target as `searchChats`) while preventing browser print default behavior.

## Findings: Command Surface Shortcut Parity (2026-04-21)

- Codex.app accelerator map includes `openCommandMenu` on `CmdOrCtrl+Shift+P`.
- This fork does not have a dedicated command palette, but it has a first-class Skills hub command surface.
- A conservative parity fallback is to route `Cmd/Ctrl+Shift+P` to the Skills route, preserving a discoverable command-oriented destination without introducing a new modal system.

## Findings: Alternate Command Surface Shortcut Parity (2026-04-21)

- Codex.app accelerator map also includes `openCommandMenuAlt` on `CmdOrCtrl+K`.
- For parity consistency in this repo, route both command-menu accelerators (`Cmd/Ctrl+Shift+P` and `Cmd/Ctrl+K`) to the same Skills hub command surface.

## Findings: Diff Panel Shortcut Parity Fallback (2026-04-21)

- Codex.app accelerator map includes `toggleDiffPanel` on `CmdOrCtrl+Alt+B`.
- This fork does not expose a standalone diff panel shell, but it does expose a review/diff pane on thread routes.
- A conservative parity fallback is to map `Cmd/Ctrl+Alt+B` to toggling `isReviewPaneOpen` on thread routes only.
- Review-toggle shortcut should also ignore terminal-like focus to avoid interrupting terminal workflows.
- Shortcut handling should also require an active thread id so review-toggle accelerators cannot open stale review state without a selected thread context.

## Findings: Browser Panel Shortcut Parity Fallback (2026-04-21)

- Codex.app accelerator map includes `toggleBrowserPanel` on `CmdOrCtrl+Shift+B`.
- This fork has no standalone browser panel, but has an always-available sidebar settings panel.
- A low-risk fallback is to map `Cmd/Ctrl+Shift+B` to settings-panel toggle (`isSettingsOpen`) rather than introducing a new panel type.

## Findings: Terminal Toggle Shortcut Parity Fallback (2026-04-21)

- Codex.app accelerator map includes `toggleTerminal` on `CmdOrCtrl+J`.
- This fork has no dedicated terminal panel surface.
- A conservative parity fallback is to map `Cmd/Ctrl+J` to the existing sidebar visibility toggle (`setSidebarCollapsed`) so it still controls a primary shell panel without adding new UI primitives.

## Findings: New Window Shortcut Parity Fallback (2026-04-21)

- Codex.app accelerator map includes `newWindow` on `CmdOrCtrl+Shift+N`.
- This fork does not support spawning additional desktop windows.
- A low-risk parity fallback is to map `Cmd/Ctrl+Shift+N` to the existing new-thread/home flow (`onStartNewThreadFromToolbar`), aligning with in-app "new workspace context" behavior.

## Findings: Thread Pin Shortcut Parity (2026-04-21)

- Codex.app accelerator map includes `toggleThreadPin` on `CmdOrCtrl+Alt+P`.
- This fork already supports pinned threads in the sidebar and persists pin ids.
- Parity mapping uses existing sidebar pin action by triggering the selected row's `.thread-pin-button` when `Cmd/Ctrl+Alt+P` is pressed.
- Shortcut handling should not fall back to the first visible row when no active thread row exists; pin actions must remain scoped to active selection only.
- Route-scope gating should require active thread context (`route.name === 'thread'` plus selected thread id) so pin shortcuts are ignored on home/settings surfaces.
- Pin shortcut should also ignore terminal-like focus to avoid interrupting terminal workflows.

## Findings: Trace Toggle Shortcut Parity Fallback (2026-04-21)

- Codex.app accelerator map includes `toggleTraceRecording` on `CmdOrCtrl+Shift+S`.
- This fork does not expose trace-recording controls in the main shell.
- A conservative fallback is to map `Cmd/Ctrl+Shift+S` to settings-panel toggle so the shortcut still lands on a diagnostics/configuration surface without introducing new tracing state machinery.
- For shortcut reliability, fallback behavior should open Settings deterministically (including from collapsed sidebar) rather than toggling closed on repeated keypress.
- This shortcut path should also ignore terminal-like focus for consistency with other global route/panel accelerators.

## Findings: Settings Shortcut Deterministic Open (`CmdOrCtrl+,`) (2026-04-21)

- Desktop command map exposes a dedicated `settings` accelerator on `CmdOrCtrl+,`.
- For parity-consistent shortcut ergonomics in this fork, `Cmd/Ctrl+,` should open Settings deterministically (and uncollapse sidebar if needed), not toggle closed on repeated presses.
- Settings shortcuts should ignore terminal-like focus to avoid interrupting terminal workflows with panel-open side effects.

## Findings: Command Surface Shortcuts Open Skills With Sidebar Recovery (2026-04-21)

- Desktop map exposes command-surface accelerators (`openCommandMenu` and `openCommandMenuAlt`) that should reliably land on the command destination.
- In this fork, parity fallback routes these accelerators to Skills; when sidebar is collapsed, shortcut handling should first restore sidebar visibility so Skills controls are immediately usable.
- Both accelerators (`Cmd/Ctrl+K` and `Cmd/Ctrl+Shift+P`) should be validated independently to avoid drift where one path regresses while the other remains correct.
- Command-surface shortcuts should also ignore terminal-like focus so terminal workflows are not interrupted by route-jump accelerators.

## Findings: Sidebar Toggle Shortcuts Should Ignore Active Text Inputs (2026-04-21)

- Panel-toggle accelerators (`Cmd/Ctrl+J`, `Cmd/Ctrl+B`) should not fire while focus is inside editable targets (for example sidebar search input), to avoid interrupting typing flows.
- A safe guard is to skip these shortcuts when `event.target` resolves to `input`, `textarea`, or other textbox/contenteditable nodes.
- Contenteditable detection should include generic `[contenteditable]` surfaces (excluding explicit `contenteditable=\"false\"`), not only `contenteditable=\"true\"`, to cover editor variants.
- Editable-target detection should also include `select` controls so keyboard shortcut guards respect active form selection interactions.
- Editable-target detection should include `role=\"combobox\"` interactive controls to cover custom select/autocomplete widgets that behave like text-entry surfaces.
- Editable-target detection should include `role=\"searchbox\"` interactive controls so guarded shortcuts respect active search widgets as typing surfaces.
- Editable-target detection should include `role=\"spinbutton\"` controls so numeric steppers and bounded-number fields keep keyboard focus without firing global accelerators.
- Apply the same guard to sidebar-toggle alias shortcuts (`Cmd/Ctrl+Shift+E`, `Cmd/Ctrl+Shift+I`) and browser-panel fallback (`Cmd/Ctrl+Shift+B`) to keep typing ergonomics consistent across all panel toggles.
- Apply the same guard to review-panel shortcut (`Cmd/Ctrl+Alt+B`) so typing-focused inputs do not accidentally toggle review state.
- Apply the same editable-target guard to pin toggle shortcut (`Cmd/Ctrl+Alt+P`) so pinning does not trigger accidentally while typing in focused inputs.
- Apply the same editable-target guard to archive shortcut (`Cmd/Ctrl+Shift+A`) so destructive archive actions are not triggered while typing.
- Apply the same editable-target guard to navigation/thread-cycle shortcuts (`Cmd/Ctrl+[`, `Cmd/Ctrl+]`, `Cmd/Ctrl+Shift+[`, `Cmd/Ctrl+Shift+]`, `Cmd/Ctrl+1..9`) so typing in focused inputs cannot unexpectedly navigate away.
- Apply the same editable-target guard to command-surface and settings shortcuts (`Cmd/Ctrl+K`, `Cmd/Ctrl+Shift+P`, `Cmd/Ctrl+,`, `Cmd/Ctrl+Shift+S`) so typing in focused inputs is never interrupted by route/panel jumps.
- Apply the same editable-target guard to dictation shortcut (`Ctrl+M`) so typing in focused inputs does not accidentally trigger microphone toggling.
- Apply the same editable-target guard to new-thread/new-window/open-folder shortcuts (`Cmd/Ctrl+N`, `Cmd/Ctrl+Shift+N`, `Cmd/Ctrl+Alt+N`, `Cmd/Ctrl+Shift+O`, `Cmd/Ctrl+O`) so text-input typing cannot trigger workspace/thread navigation.
- Apply the same editable-target guard to thread `R` shortcuts (`Cmd/Ctrl+Shift+R` review toggle and `Cmd+Ctrl+R` rename) so typing in focused inputs cannot trigger thread actions.
- Apply the same editable-target guard to copy shortcuts (`Cmd/Ctrl+Alt+L`, `Cmd/Ctrl+Alt+Shift+C`, `Cmd/Ctrl+Alt+S`, `Cmd/Ctrl+Shift+C`, `Cmd/Ctrl+Alt+C`) so typing in focused inputs cannot trigger clipboard actions unexpectedly.
- Apply the same editable-target guard to model shortcuts (`Cmd/Ctrl+T`, `Cmd/Ctrl+Shift+M`) so typing in focused inputs cannot open composer model controls unexpectedly.
- Apply the same editable-target guard to search shortcuts (`Cmd/Ctrl+G`, `Cmd/Ctrl+P`) so focused input typing is not disrupted by re-triggering sidebar-search shortcut handlers.
- Apply the same editable-target guard to thread-find shortcut (`Cmd/Ctrl+F`) so typing in focused inputs does not steal focus to the thread-find input unexpectedly.
- Apply the same editable-target guard to global `Escape` panel-close handling so typing-focused form controls do not inadvertently close Settings/Review panes.
- Global `Escape` panel-close handling should also ignore terminal-like focus (`[data-codex-terminal]`, `.xterm`, and related selectors) so terminal workflows are not interrupted by panel-close side effects.
- Sidebar and browser-panel toggle shortcuts (`Cmd/Ctrl+B`, `Cmd/Ctrl+J`, `Cmd/Ctrl+Shift+E`, `Cmd/Ctrl+Shift+I`, `Cmd/Ctrl+Shift+B`) should also ignore terminal-like focus so terminal workflows are not interrupted by panel-collapse/panel-toggle side effects.

## Findings: Deeplink Copy Shortcut Parity (2026-04-21)

- Codex.app accelerator map includes `copyDeeplink` on `CmdOrCtrl+Alt+L`.
- This fork can support direct parity behavior by copying the current app URL deeplink to clipboard.
- Implementation should use `navigator.clipboard.writeText` with an `execCommand('copy')` fallback for broader runtime compatibility.
- Copy shortcuts should ignore terminal-like focus so terminal workflows are not interrupted by clipboard accelerators that target app chrome context.

## Findings: Session Id Copy Shortcut Parity Fallback (2026-04-21)

- Codex.app accelerator map includes `copySessionId` on `CmdOrCtrl+Alt+C`.
- This fork lacks a distinct exposed session-id primitive in the shell header.
- A conservative fallback is to copy current context identifier:
  - thread route: active `threadId`
  - non-thread route: current route name (for example `skills`).

## Findings: Working Directory Copy Shortcut Parity Fallback (2026-04-21)

- Codex.app accelerator map includes `copyWorkingDirectory` on `CmdOrCtrl+Shift+C`.
- This fork can copy active thread cwd when available, but some routes (for example Skills) have no cwd context.
- A conservative fallback is:
  - copy `composerCwd` when non-empty,
  - otherwise copy current route name for deterministic behavior.

## Findings: Conversation Path Copy Shortcut Parity Fallback (2026-04-21)

- Codex.app accelerator map includes `copyConversationPath` on `CmdOrCtrl+Alt+Shift+C`.
- This fork does not expose a dedicated conversation-path field in chrome controls.
- A conservative fallback is to copy route context:
  - thread route: `/thread/<threadId>`
  - otherwise: current hash path (for example `/skills`).

## Findings: Direct Thread Slot Shortcut Parity (2026-04-21)

- Codex.app accelerator map includes `thread1` through `thread9` on `CmdOrCtrl+1..9`.
- This fork already has a deterministic sidebar order source (`orderedThreadIds`).
- Parity mapping is direct: bind number shortcuts to 1-based index selection within `orderedThreadIds`, with out-of-range slots treated as no-op.
- Digit-thread shortcuts should ignore terminal-like focus for consistency with other global navigation accelerators.

## Findings: File Tree Panel Shortcut Parity Fallback (2026-04-21)

- Codex.app accelerator map includes `toggleFileTreePanel` on `Command+Shift+E`.
- This fork has no dedicated file-tree panel separate from the sidebar shell.
- A conservative parity fallback is to map `Cmd/Ctrl+Shift+E` to sidebar visibility toggle (`setSidebarCollapsed`) so the shortcut still controls the primary navigation tree surface.

## Findings: Rename Thread Shortcut Parity Fallback (2026-04-21)

- Codex.app accelerator map includes `renameThread` on `Command+Control+R`.
- This fork has a dialog-based rename flow in sidebar thread controls plus a stable rename API (`renameThreadById`).
- Parity behavior should route `Command+Control+R` into the existing rename dialog for the selected thread (instead of a browser prompt) so keyboard and menu rename UX stay consistent.
- When sidebar chrome is collapsed, shortcut handling should reopen sidebar first and then launch the same rename dialog path to avoid divergent fallback UI.
- Route-scope gating should require an active thread route (`#/thread/...`) plus selected thread id; shortcut must not open rename dialogs from home/settings contexts.
- Shortcut handling should also be gated out while terminal-like surfaces are focused to avoid hijacking terminal key workflows.
- Rename dialog accessibility label should also stay explicit (`aria-label=\"Rename thread\"`) to match rename-dialog intent and keyboard/screen-reader affordance.

## Findings: Dictation Shortcut Parity Fallback (2026-04-21)

- Codex.app accelerator map includes `dictation` on `Ctrl+M`.
- This fork already exposes a composer dictation mic control with existing dictation state/error handling.
- A conservative parity fallback is to intercept `Ctrl+M` on active thread routes and trigger the existing `.thread-composer-mic` button, reusing current dictation behavior instead of adding a second dictation state path.
- Shortcut handling should also be gated out when terminal-like surfaces are focused (`[data-codex-terminal]`, `.xterm`, and related selectors) to avoid hijacking terminal key workflows.

## Findings: Composer Status Visibility Parity (2026-04-21)

- This fork already computes compact quota and context-usage status strings in `ThreadComposer.vue` (`quotaSummaryText`, `contextUsageSummaryText`) but parity requires these to be visible inline, not hidden in tooltip-only metadata.
- A conservative parity implementation is to render one inline status row beneath composer controls:
  - left: quota summary text with detailed tooltip,
  - right: context summary text plus remaining-context bar with tone coloring.
- Keep weekly refresh date embedded directly in the compact quota summary segment to preserve date-only inline display.

## Findings: Locale-Aware Compact Weekly Date Formatting (2026-04-21)

- Compact weekly refresh dates should be rendered with locale-aware month/day formatting (for example `Apr 28` in English locales) instead of hardcoded `X月Y日`.
- Apply the same compact formatter behavior across composer quota summary and account quota summary surfaces to avoid inconsistent date localization.

## Findings: Sidebar Thread Menu Boundary Placement (2026-04-21)

- For rows near the bottom of the sidebar, thread context menus should open upward and remain clamped inside the nearest overflow-clipping container, not only inside viewport bounds.
- In this fork, `updateOpenThreadMenuPlacement` should:
  - resolve direction via nearest clipping ancestor,
  - clamp vertical placement using that boundary rect (`minTop`/`maxTop`),
  - still respect viewport top/bottom limits as a secondary guard.

## Findings: Detached HEAD Trigger Label Normalization (2026-04-21)

- Header branch dropdown trigger should render `Detached HEAD` whenever current branch is missing or blank.
- Normalize branch value using trimmed string logic (`''` treated the same as `null`) before selecting dropdown model value; otherwise blank branch values can render an empty trigger instead of explicit detached-head state.

## Findings: Detached HEAD Load-Time Normalization (2026-04-21)

- Branch-state RPC reads can return nullable/blank current branch values.
- Normalize current branch immediately at load time (`trim()` + empty-to-null) so downstream UI state and shortcut logic always treat blank branch as detached-head instead of carrying an empty-string branch state.

## Findings: Thread Rename Notification Alias Compatibility (2026-04-21)

- Realtime `thread/name/updated` payloads should be treated defensively for field naming variants.
- For parity safety, read both `threadName` and `name` when applying rename notifications so UI title updates remain robust across protocol variants.

## Findings: Settings Workspace Identity Label Resilience (2026-04-21)

- For account cards that share the same email, workspace/account identity should remain clearly distinguishable on its own line.
- A low-risk hardening is to:
  - keep a dedicated `Workspace ID <short-id>` label line,
  - use a slightly longer short-id slice (12 chars) for differentiation,
  - expose full id via tooltip (`Workspace ID: ...`) to avoid ambiguity in narrow panels,
  - allow identity chip text to wrap (`break-all`) so long ids stay readable in narrow sidebar cards,
  - avoid forced truncation on account meta text so supplemental identity context stays visible in narrow layouts.

## Findings: Composer Placeholder Copy Parity (2026-04-21)

- Codex.app mention/command affordance copy uses command language (`/ for commands`) rather than skills-specific language.
- For local parity fallback in this fork, active-thread composer placeholder should be:
  - `Ask Codex anything, @ to add files, / for commands`.

## Findings: Composer Shortcut Parity (`CmdOrCtrl+T`) (2026-04-21)

- Extracted webview bundle wiring shows `CmdOrCtrl+T` attached to composer control shortcut handling, not global new-thread routing.
- For this fork, a safer parity fallback is to map `Cmd/Ctrl+T` on thread routes to composer model-control toggle behavior (same local control path as keyboard-open model picker), rather than forcing Home/new-thread navigation.
- Shortcut handling should require active thread selection (`selectedThreadId`) in addition to thread route context, so model controls are not opened in stale/no-selection states.
- Repeat key presses should keep the model picker open and move focus inside picker controls, rather than closing it.

## Findings: Composer Model Shortcut Parity (2026-04-21)

- In extracted desktop webview bundles, `CmdOrCtrl+Shift+M` is wired to model-control keyboard handling in the composer surface, while `CmdOrCtrl+B` remains the sidebar-toggle accelerator.
- For this fork, `Cmd/Ctrl+Shift+M` should target composer model control (open/toggle model dropdown) on thread routes, not sidebar collapse.
- Shortcut handling should require active thread selection (`selectedThreadId`) alongside thread route gating.
- Repeat key presses should focus model picker controls if already open.
- Keep sidebar toggle on `Cmd/Ctrl+B` and panel fallbacks on their existing accelerators to avoid shortcut collisions.
- In layouts where multiple composer dropdown trigger nodes exist, shortcut targeting must skip disabled triggers and pick the first enabled model trigger; otherwise shortcuts can be consumed without opening the picker.

## Findings: Composer Submit Alias Parity (2026-04-21)

- Codex.app bundle includes `CmdOrCtrl+Enter` submit behavior and a `CmdOrCtrl+Shift+Enter` accelerator alias reference.
- In this fork, a low-risk parity hardening is to treat `Cmd/Ctrl+Shift+Enter` as an explicit send alias in composer key handling.
- Keep existing Enter behavior and `sendWithEnter` preference semantics intact; only add the mod+shift enter alias path.

## Findings: Conversation Path Copy Shortcut Alias (2026-04-21)

- Current extracted desktop accelerator maps include `copyConversationPath` bound to `CmdOrCtrl+Alt+S`.
- This fork previously only exposed `Cmd/Ctrl+Alt+Shift+C` for conversation-path copy.
- Safe parity alignment is to add `Cmd/Ctrl+Alt+S` as an alias to the same `copyConversationPath` helper, while keeping the existing fallback combo for compatibility.

## Findings: File Tree Shortcut Variant Alias (2026-04-21)

- Extracted desktop bundles show `toggleFileTreePanel` on `Command+Shift+E` in one variant and `Command+Shift+I` in another.
- For this fork’s sidebar-based fallback, both accelerators should map to the same sidebar visibility toggle path to preserve cross-build shortcut compatibility.

## Findings: Composer Shift+Tab Mode Toggle (2026-04-21)

- Extracted composer keydown logic includes a `Shift+Tab` handler (when composer is focused and no modifier keys other than Shift) that toggles collaboration mode between default and plan.
- For parity in this fork, `Shift+Tab` should be handled in `ThreadComposer` keydown and routed to collaboration-mode toggle instead of only falling through to browser focus traversal.
- The same extracted logic gates this shortcut on `hasActiveMentionMenu === false`; when mention UI is active, `Shift+Tab` should not toggle collaboration mode.
- Shortcut should also respect actual available mode options (`plan` and `default`) rather than assuming those modes exist when mode list is empty.

## Findings: Composer Escape Handling (2026-04-21)

- Extracted composer keydown logic includes an explicit `Escape` path when composer is focused and no modifier keys are pressed (outside active mention menu handling).
- For parity in this fork, add a composer-local escape handler for the textarea path (close local picker state if needed, otherwise blur composer input) rather than relying only on global page-level escape handling.
- Attach-menu escape behavior may require a window-level keydown listener because focus can move to attach controls; parity-safe handling closes the attach menu and refocuses composer on bare `Escape`.

## Findings: Browser Panel Shortcut Fallback (`CmdOrCtrl+Shift+B`) (2026-04-21)

- Desktop shortcut maps bind `toggleBrowserPanel` to `CmdOrCtrl+Shift+B`.
- This fork does not currently expose a dedicated browser side panel surface from `App.vue`.
- A safer parity fallback than settings-toggle is to reserve `Cmd/Ctrl+Shift+B` for thread-side panel behavior by mapping it to review-panel toggle on thread routes.
- On non-thread routes, the same shortcut should still control a primary shell panel (sidebar toggle) instead of no-op, so accelerator behavior remains globally useful.
- When no active thread id is selected, shortcut handling should follow the non-thread fallback path (sidebar toggle) instead of toggling review state without target context.
- Keep settings on `Cmd/Ctrl+,` (and existing fallback aliases) so browser-panel accelerator does not collide with configuration shortcuts.

## Findings: Thread `R` Shortcut Terminal-Focus Guard (2026-04-21)

- Thread `R` shortcuts (`Cmd+Ctrl+R` rename and `Cmd/Ctrl+Shift+R` review toggle) should be ignored while terminal-like surfaces are focused.
- Applying `!isTerminalLikeFocused()` to both handlers preserves terminal editing/navigation workflows and aligns with existing model/dictation shortcut safety guards.

## Findings: Search Shortcut With Collapsed Sidebar (`CmdOrCtrl+P`/`CmdOrCtrl+G`) (2026-04-21)

- Desktop command map exposes chat/file search shortcuts as global accelerators.
- In this fork, search input lives in the sidebar and is absent when sidebar is collapsed.
- Parity-safe behavior is to uncollapse the sidebar first, then show/focus the sidebar search input when `Cmd/Ctrl+P` or `Cmd/Ctrl+G` is triggered.
- Focus should be applied after layout commit (for example `nextTick` + animation-frame retry) so shortcut focus remains reliable immediately after expanding the sidebar.
- When a prior query exists, shortcut focus should select all existing text so users can immediately replace the query without manual selection.
- Search shortcuts should also ignore terminal-like focus so terminal workflows are not interrupted by global sidebar-search accelerators.
