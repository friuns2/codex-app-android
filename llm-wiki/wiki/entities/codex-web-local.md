# Entity: codex-web-local

## Summary
`codex-web-local` is a local fork/workspace for a Codex web UI and CLI wrapper (`codexapp`).

## Tech profile
- Frontend: Vue 3, Vite, TypeScript
- Backend bridge: Node + Express
- CLI output: `dist-cli/index.js` via tsup

## Operational characteristics
- Frequent branch merges into local `main`
- Strong conflict-resolution policy (intentional per-file merges)
- Manual regression documentation in `tests.md`
- Integrated terminal uses a Node PTY bridge plus an xterm frontend for local/worktree threads

## Source links
- [Source snapshot](../../raw/projects/codex-web-local.md)
- [Integrated terminal source](../../raw/features/integrated-terminal.md)
- [Integrated terminal concept](../concepts/integrated-terminal.md)
- [Merge-to-main workflow concept](../concepts/merge-to-main-workflow.md)
