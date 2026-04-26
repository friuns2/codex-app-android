# Skills route UI

This page documents the recent `Skills` route UX changes and the implementation lessons that should be reused for future directory-like surfaces.

## Summary

The route previously surfaced a generic `Directory` label in the sidebar and content header. It was updated to a clearer `Skills` destination with stronger visual emphasis, while the inner page title remains `Skills & Apps`.

## Key behavior

- Sidebar destination label: `Skills`
- Sidebar support copy: `Plugins, apps, MCPs`
- Header label on the route: `Skills`
- Inner directory page title: `Skills & Apps`
- First-launch plugin/app discovery is introduced from the home route through a dedicated card.

## Persistence model

The first-launch Plugins card is server-backed, not browser-backed.

- Read endpoint: `/codex-api/preferences/first-launch-plugins-card`
- Write endpoint: `/codex-api/preferences/first-launch-plugins-card`
- Global-state key: `first-launch-plugins-card-dismissed`

This means dismissal should follow Codex server/profile state instead of one browser profile.

## UI implementation lessons

- Route-level accent styles need explicit dark-theme treatment; inherited light-mode typography is not enough.
- When upgrading a utility nav row into a more prominent card, also revisit any existing dark-theme overrides in `src/style.css`.
- Keep the route name and inner page name distinct when useful:
  - `Skills` for navigation clarity
  - `Skills & Apps` for the full directory context

## Verification standard

For this route, the effective smoke test is:

1. Open `#/skills`
2. Verify the sidebar `Skills` destination is visible and legible
3. Verify the header `Skills` title is visible
4. Verify the page-level `Skills & Apps` heading is visible
5. Repeat in both light and dark theme

## Related pages

- [Entity: codex-web-local](../entities/codex-web-local.md)
- [Overview](../overview.md)
- [Source: skills route UI and first-launch card](../../raw/features/skills-route-ui-and-first-launch-card.md)
