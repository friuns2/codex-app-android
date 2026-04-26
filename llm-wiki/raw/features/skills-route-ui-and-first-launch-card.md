# Skills route UI and first-launch Plugins card

Date: 2026-04-26

## Facts

- The home route gained a first-launch card for Plugins and Apps.
- The card copy was revised to a more user-friendly variant:
  - title: `Plugins are here`
  - body mentions `Gmail, Calendar, GitHub, Slack, Browser Use, and more`
- The card no longer persists dismissal in browser `localStorage`.
- Dismissal is now stored in Codex global state through bridge endpoints:
  - `GET /codex-api/preferences/first-launch-plugins-card`
  - `PUT /codex-api/preferences/first-launch-plugins-card`
- The persisted key in `.codex-global-state.json` is:
  - `first-launch-plugins-card-dismissed`

## Skills route UI changes

- The route label changed from `Directory` to `Skills`.
- The sidebar link became a more prominent destination card with:
  - accent icon
  - primary title `Skills`
  - subtitle `Plugins, apps, MCPs`
- The route header also gained a larger `Skills` title and matching accent icon.
- The internal `DirectoryHub` page title remains `Skills & Apps`.

## Dark theme lesson

- The initial header/sidebar accent styling looked acceptable in light mode but regressed in dark mode.
- Causes:
  - route-specific accent classes overrode global dark text styling
  - older `.sidebar-skills-link` dark override assumed the previous plain button
- Fix required coordinated dark overrides across:
  - `src/components/content/ContentHeader.vue`
  - `src/style.css`
  - `src/App.vue`

## Verification

- Playwright checks were run against the Skills route in both light and dark theme.
- Passing assertions included:
  - `Skills` header visible
  - `Skills & Apps` title visible
  - `Plugins, apps, MCPs` sidebar subtitle visible

## Dev server workflow lesson

- `npm run dev` originally failed cleanly in this worktree because `scripts/dev.cjs` always ran `pnpm install`.
- In this environment, `node_modules` was symlinked to a shared dependency tree.
- The fix was to reuse existing dependency binaries when present and skip forced reinstall for normal dev startup.
