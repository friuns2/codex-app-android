---
name: "codex-app-parity"
description: "Use when implementing or changing user-visible behavior/UI in this repository and parity with the latest official Codex references must be validated before coding. Prefer official OpenAI docs and official code; use an installed Codex app only as supplemental reference when available."
---

# Codex App Parity Skill

Use this skill for any feature work or user-visible behavior/UI change in this repository.
Do not use it for purely internal refactors that do not affect behavior.

## Objective

Ensure behavior is implemented against the latest official Codex references, then verified with headless Playwright and screenshots.

## Project Instructions

## Official Codex Reference-First Development Policy

For every **new feature** and every **behavior/UI change**, treat the latest official Codex materials as the source of truth.

Reference priority:

1. Official OpenAI Codex docs on `developers.openai.com` / `platform.openai.com`
2. Official OpenAI code in `openai/codex`
3. Official product pages or release notes when relevant to user-visible behavior
4. A locally installed `Codex.app` bundle only if it is actually available on the current machine

Do not implement first and compare later. Compare first, then implement.

When sources conflict, prefer current official docs or official repository behavior over older reverse-engineered desktop bundle findings.

Because this workspace is commonly developed on Linux, do not assume `/Applications/Codex.app` exists.

## Official Sources To Check First

- Docs entry point: `https://platform.openai.com/docs/codex`
- Developer portal landing page: `https://developers.openai.com/`
- Official repository: `https://github.com/openai/codex`

If the task depends on the **latest** behavior, verify the current official source before coding and note the concrete source pages you used.

## How to Search for Features in Official References

### Docs-first search

1. Search official Codex docs for the feature or workflow.
2. Search official developer docs for adjacent terminology, model/tool references, or product guidance.
3. Capture the exact page titles and URLs that informed the implementation.

### Official code search

Use the official `openai/codex` repository as the code reference when docs are insufficient or when behavior needs implementation detail:

- Search `README.md`, `docs/`, and relevant packages first.
- Use repository search terms based on UI labels, settings names, RPC names, and command names.
- Prefer current main-branch code or the latest tagged release over older snippets copied elsewhere.

### Optional local desktop bundle inspection

If a local desktop app is available, it can still be inspected as supplemental evidence for UI details that are missing from official docs/code.

Typical macOS paths:

- App path: `/Applications/Codex.app`
- Primary bundle: `/Applications/Codex.app/Contents/Resources/app.asar`

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

1. Start with **official docs** and current product documentation.
2. If docs are too high-level, inspect the **official repository** for implementation patterns.
3. If a desktop bundle is available and still needed, use **i18n locale files** and bundle search to recover UI details.
4. Trace the result to find **hooks/composables**, **API calls**, **event handlers**, and supporting process logic.

### Architecture Notes

- **Renderer → Main Process**: The renderer uses a `Uu` HTTP client class that sends `fetch-request` IPC messages to the main process. The main process class `tle` handles these, adds auth tokens, and uses `electron.net.fetch` to make actual HTTP calls.
- **Auth**: Auth tokens come from the app-server's `getAuthStatus` RPC method (ChatGPT backend auth).
- **App-server**: A `codex app-server` child process communicating via JSON-RPC over stdin/stdout. Our bridge middleware proxies RPC calls to it.
- **Config constants**: `R7` = prodApiBaseUrl (`https://chatgpt.com/backend-api`), `I7` = devApiBaseUrl (`http://localhost:8000/api`), `C7` = originator (`Codex Desktop`).

## Required Workflow (Feature Work)

1. Identify target behavior:
- Restate what behavior is being added/changed.
- Define whether it is: data mapping, runtime event handling, UX text, visual treatment, interaction model, or all of these.

2. Inspect official Codex references before coding:
- Check the latest official docs first.
- Check the official `openai/codex` repository when implementation detail is needed.
- If available and useful, inspect a local `Codex.app` bundle as supplemental evidence.
- Find relevant strings/keys/functions/components for the feature (status labels, event names, item types, summaries, collapse/expand behavior, etc.).
- Capture the closest equivalent pattern if exact parity is not present.

3. Build a parity checklist from the official references:
- Data model shape (fields used by UI).
- Realtime event sources and transitions.
- Rendering structure (what is shown collapsed vs expanded).
- Copy/text behavior (phrasing and status wording).
- Interaction behavior (auto-expand, auto-collapse, click/keyboard handling).
- Visibility rules (when elements appear/disappear).

4. Implement against that checklist:
- Prefer official Codex behavior over novel design.
- Keep deviations minimal and intentional.
- If deviating, include a short reason in the final response.

5. Verify parity after implementation:
- Confirm each checklist item.
- Run local build/tests.
- Re-check UI behavior against the official references you used.

## Response Requirements (When delivering feature changes)

For feature tasks, include:

- `Official Codex reference analysis`: what was inspected (docs pages, repo areas, optional desktop bundle areas).
- `Parity result`: matched items and any explicit deviations.
- `Fallback note` only if the official references were insufficient or had no equivalent.

## Fallback Rules

If the official references are insufficient, unreachable, or have no equivalent pattern:

- State the blocker explicitly.
- Use best local implementation consistent with existing repository patterns.
- Keep behavior conservative and avoid speculative UX innovations.

If the official references are incomplete but a local desktop app is available, use the desktop app as a secondary source rather than the primary source.

## Source Freshness Requirement

For requests involving current or changing Codex behavior:

- State the blocker explicitly.
- Verify the latest official source before coding.
- Record the concrete pages or repository locations used.
- Use explicit dates in the final note when freshness matters.

## Scope and Safety

- This policy applies to **feature behavior and UX decisions**, not just styling.
- Bug fixes should still check official Codex references when they affect user-visible behavior.
- Prefer minimal patches that align with official behavior rather than large refactors.

## Completion Verification Requirement

- After completing a task that changes behavior or UI, always run a Playwright verification in **headless** mode.
- Always capture a screenshot of the changed result and display that screenshot in chat when reporting completion.

## Self-Improvement Protocol

After each feature implementation session that uses this skill:

1. **Record new findings**: Append a dated `## Findings:` section documenting any newly discovered Codex.app internals (state keys, API endpoints, component patterns, auth flows, etc.).
2. **Update search instructions**: If new search techniques were used (e.g., a better way to extract minified code, new file locations), update the "How to Search for Features" section.
3. **Update architecture notes**: If new IPC channels, API endpoints, or data flows were discovered, add them to the Architecture Notes.
4. **Keep findings actionable**: Each finding should include enough detail that a future session can reuse it without re-discovering.

Historical findings below may come from official docs, the official repository, or earlier desktop bundle inspections.
If a finding conflicts with current official docs or current official code, treat the current official source as authoritative.

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

## Findings: Skills Scope Metadata (2026-04-17)

- The app-server `skills/list` response carries per-skill `scope` plus the parent entry `cwd`.
- Current schema values are `user`, `repo`, `system`, and `admin`.
- For UI labeling in this workspace, `repo` scope can be mapped to a project badge by deriving the project name from the entry `cwd`, while non-`repo` scopes should stay unlabeled to avoid noisy global badges.

## Findings: Plugin Runtime Surface (2026-04-17)

- On `codex-cli 0.121.0`, `meta/methods` exposes stable plugin-related RPCs through the app bridge:
  - `plugin/list`
  - `plugin/read`
  - `plugin/install`
  - `plugin/uninstall`
  - `app/list`
  - `mcpServerStatus/list`
  - `mcpServer/oauth/login`
  - `config/mcpServer/reload`
- `experimentalFeature/list` reports both `apps` and `plugins` as `stage: "stable"` and enabled by default in this runtime.
- `plugin/read` is the best detail source for desktop-parity plugin UI:
  - plugin marketplace name/path
  - manifest/interface display metadata
  - bundled skills with effective enabled state
  - related apps with `needsAuth`
  - MCP server names
- `plugin/install` has side effects on the user Codex environment and returns connector follow-up data:
  - response shape includes `authPolicy`
  - response shape includes `appsNeedingAuth[]`
  - use a real install only from an explicit user action, not from capability probing
- `app/list/updated` notifications arrive after connector data refreshes, so plugin/app settings pages should subscribe and update in-place rather than requiring a full page reload.
- `app/list/updated` already carries the latest merged `data` payload; a UI that reacts by issuing a new foreground `app/list` fetch can flash back to a loading state and lose scroll position on the Apps page. Consume the notification payload in place when possible.
- Composer invocation parity for plugins is validated against live `turn/start` payloads:
  - selected plugin should prepend a UI token such as `@linear` into the text input payload
  - selected plugin should also add a separate `mention` content item with `path: "plugin://linear@openai-curated"`
  - both are needed for reliable app-server routing; a mention item alone is not the documented parity path

## Findings: Automations Surface (2026-04-17)

- Official Codex app docs expose a first-class `Automations` concept and deeplink, but `codex-cli 0.121.0` app-server does not currently expose any `automation/*` or `automations/*` RPC methods in `meta/methods`.
- In this runtime, automation parity therefore cannot be implemented as a thin app-server proxy the way `Plugins` and `Apps` can.
- The closest official execution surface available locally is `codex exec`, which the official repository explicitly describes as the headless/non-interactive automation surface.
- A web-shell automation feature built on current official surfaces should:
  - persist its own schedule/task metadata locally
  - schedule background runs in the web server process while the app is running
  - invoke `codex exec` with explicit cwd/model/sandbox overrides rather than waiting for missing app-server automation RPCs

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

## Findings: Linux Official-Source-First Parity (2026-03-27)

- In this workspace, `/Applications/Codex.app/Contents/Resources/app.asar` was not present, so desktop bundle inspection could not be the default parity workflow.
- For Linux-based development here, use official Codex docs and the official `openai/codex` repository as the primary parity references.
- Use a local desktop bundle only as an optional supplement when it is actually available on the current machine.

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

## Findings: Message Action Removal Fallback (2026-03-27)

- With Codex.app unavailable for inspection, message-action removals should be implemented as full UI deletion, not partial hiding.
- In this codebase, message actions span both template nodes in `ThreadConversation.vue` and shared dark-theme overrides in `style.css`; removing only the button markup leaves dead hover/dark styles behind.
- A safe fallback cleanup is to remove the template block, the helper functions/imports that feed it, and the corresponding `.message-action*` selectors together in the same change.

## Findings: Retry Error Status Restoration (2026-03-28)

- Official Codex protocol marks transient stream failures separately from terminal failures: `stream_error` is documented as a notification the system is already handling with retry/backoff, and v2 `error` notifications expose `willRetry`.
- In `openai/codex` TUI (`codex-rs/tui_app_server/src/chatwidget.rs`), retry-status UI is restored on the next non-retry notification instead of remaining visible for the rest of the turn.
- For codexui parity, retry/reconnect overlays should be stored as transient state and cleared when follow-up non-retry events arrive or when the transport emits `ready` after reconnect.

## Findings: File Diff Viewer Rendering (2026-03-30)

- Official `openai/codex` TUI renders changed files as a compact summary first, then lets the user inspect per-file diffs from the change list instead of navigating away to a file URL.
- The canonical per-file payload remains `fileChange.changes[*].diff`; `turn/diff/updated` is useful as turn-level supplemental state but is not required to render an individual file diff viewer.
- For rename/move cases, the target syntax/language and display label should prefer `move_path` when present, while still keeping the original path visible in the header.
- A safe web fallback is:
  - open an in-app modal/panel from the changed-file summary row
  - render unified diff hunks with separate old/new line gutters
  - fall back to synthetic add/delete-only rendering when only raw file content is available
  - show an explicit empty-state message when summaries were recovered from assistant text but no diff payload survived in thread history

## Findings: Session JSONL Patch Recovery (2026-03-30)

- In this workspace with Codex CLI `0.116.0`, `thread/read` can return full turn/item history while still omitting any persisted `fileChange` items for older turns.
- The raw session JSONL referenced by `thread.path` can still preserve edit intent through `response_item.type = "custom_tool_call"` entries where `name = "apply_patch"` and `input` contains the patch body.
- A practical parity fallback for historical diff viewing is:
  - resolve the session JSONL from `thread/read`
  - group `apply_patch` tool calls by `turn_context.turn_id`
  - parse per-file sections from the patch body
  - synthesize `fileChange`-like UI metadata only when canonical `fileChange` items are missing

## Findings: Mobile Diff Viewer Layout (2026-03-30)

- Official Codex references inspected here cover compact file summaries and per-file diff inspection, but do not provide a distinct mobile-web layout pattern for narrow viewports.
- For this repo, a conservative mobile fallback is more usable than keeping the desktop split pane:
  - preserve the desktop two-column viewer on wide screens
  - switch to a single-column full-screen diff on narrow screens
  - move the changed-file list behind a top toolbar trigger and reveal it as a bottom sheet
  - keep line numbers visible but shrink their gutter widths on mobile so diff code keeps most of the screen width

## Findings: Build Badge Placement On Mobile (2026-03-30)

- The global top-right build badge in `App.vue` is acceptable on desktop but can overlap transient mobile overlays such as the diff viewer because it sits above content with a fixed viewport anchor.
- A safer mobile fallback is:
  - hide the floating badge on mobile
  - expose the same version/worktree string inside the existing Settings panel instead of adding another mobile-only surface

## Findings: App-Server Files UI Baseline (2026-04-14)

- In Codex CLI `0.120.0`, `codex app-server generate-ts --experimental` exposes a stable read-only filesystem baseline for UI work: `fs/readDirectory`, `fs/getMetadata`, and `fs/readFile`, plus write/watch methods that can be layered later.
- The generated protocol is enough to implement an in-app file browser even when official public docs or official repo UI references do not provide a concrete desktop/web file-explorer spec.
- `fs/watch` is explicitly connection-scoped via `watchId`; for web clients that use stateless HTTP RPC plus a separate notification transport, treating watch support as a later phase is safer than coupling it into an MVP explorer.

## Findings: Pulse Surface Constraints (2026-04-18)

- Official Help Center docs for ChatGPT Pulse state that the feature is available on web, iOS, and Android, and explicitly unavailable in desktop apps as of the April 2026 help copy.
- The same docs expose two user-visible controls that are worth mirroring in desktop-adjacent UIs even before live delivery exists:
  - `Show Pulse in new chats`
  - `Reference memory in suggestions`
- `openai/codex` does not currently expose a first-party Pulse implementation or Pulse-specific API schema, so parity work in this repo should treat the Help Center behavior as the source of truth and keep desktop implementations conservative:
  - add the Today/Pulse entry point and settings
  - preserve curate/feedback history affordances
  - do not claim official desktop support when only a local preview/cache-backed version exists
- Additional Pulse interaction cues documented in the public help copy and release notes:
  - Pulse is a once-daily card surface rather than a persistent inbox
  - users can give thumbs up/down feedback on cards
  - users can save a card into chat history for later
  - users can ask a follow-up directly from a card
  - cards that are not saved or interacted with should not be treated as long-lived history
