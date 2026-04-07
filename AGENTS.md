# AGENTS.md

## Git Workflow (Compact)

- Keep both worktrees clean before merge/rebase:
  - feature worktree: `git status --short`
  - main worktree: `git status --short`
- If any merge/rebase is already in progress, abort it first in that worktree:
  - merge: `git merge --abort`
  - rebase: `git rebase --abort`
- Always checkpoint local changes in main worktree before merge/rebase:
  - `git add -A && git commit -m "temp-before-merge-<branch>"`
  - skip only if there are no local changes.
- Standard merge path:
  1. commit task in feature worktree
  2. create/switch feature branch
  3. rebase feature branch on `main`
  4. from main worktree: `git checkout main && git merge --no-ff <feature-branch>`
- If user explicitly asks for a single merge commit, use:
  - `git checkout main`
  - `git reset --hard <pre-merge-main-commit>`
  - `git checkout <feature-branch>`
  - `git rebase main`
  - `git checkout main`
  - `git merge --no-ff <feature-branch> -m "Merge branch '<feature-branch>' into main"`

## Never Blindly Merge (MANDATORY)

- Never use automatic conflict-bias strategies blindly (for example: `git merge -X theirs`, `git merge -X ours`, `git checkout --theirs .`, `git checkout --ours .`).
- If conflicts occur, inspect each conflicted file and resolve intentionally.
- After conflict resolution, run required verification/tests before pushing.

## Conflict Avoidance and Recovery (MANDATORY)

- Do not rebase long-lived mixed-history branches directly onto `main` if it creates broad unrelated conflicts.
- Prefer a fresh branch from `main` + cherry-pick only task-relevant commits.
- If a branch is already checked out in another worktree, rebase/commit there, then merge by branch name from main worktree.
- If merge pulls unrelated conflicts, abort and retry with a narrower commit set.

## package.json / tests.md Conflict Rule

- For any merge/rebase conflict involving `package.json`, always resolve by taking the current local/checkpoint `package.json` entirely (full file replacement) without additional review, then continue merge.
- Treat `package.json` as generated/low-priority for conflict resolution and do not block merge completion on its conflicts.
- For any merge/rebase conflict involving `tests.md`, always resolve by taking the current local/checkpoint `tests.md` entirely (full file replacement) without additional review, then continue merge.
- Treat `tests.md` as low-priority for conflict resolution and do not block merge completion on its conflicts.

## Commit After Each Task

- Always create a commit after completing each discrete task or sub-task.
- Do not batch multiple tasks into a single commit.
- Each commit message should describe the specific change made.

## Pre-Merge Squash Review (MANDATORY)

- Before merging to local `main`, diff-compare all changes on the current branch against `main`.

## Tests Documentation Rule (MANDATORY)

- After every feature implementation, update `tests.md` in the repository root.
- Add a new section describing how to test the feature manually.
- Each test section must include:
  - feature/change name
  - prerequisites/setup
  - exact step-by-step actions
  - expected result(s)
  - rollback/cleanup notes (if applicable)
- Keep existing test cases; append or update only what is needed for the new feature.
- Do not mark a feature task complete until `tests.md` is updated.

## Completion Verification Requirement (MANDATORY)

- Test changes before reporting completion when feasible.
- Run Playwright verification only when the user explicitly asks for Playwright/browser automation testing.
- If a change affects package/runtime/module loading behavior, also run a CJS smoke test before completion.
- CJS smoke test requirement:
  1. Build the project/artifact first (if needed).
  2. Run a Node `require(...)` check against the changed entry (or closest public CJS entry).
  3. Confirm the module loads without runtime errors and expected exported symbol(s) exist.
  4. Include the exact CJS command and result summary in the completion report.
- For Playwright automation scripts, CJS (`const { chromium } = require('playwright')`) is the default style unless ESM is explicitly required.
- Preferred Playwright verification pattern for chat parsing changes (when Playwright is requested):
  - send a message with a unique marker (for selecting the correct rendered row)
  - include mixed content in one message (for example: plain text, `**bold**`, and `` `code` ``)
  - inspect row HTML and count expected rendered nodes (for example `strong.message-bold-text`)
  - save screenshot to `output/playwright/<task-name>.png`
- Playwright test sequence (when Playwright is requested):
  1. Start or confirm a single dev server instance (`pnpm run dev -- --host 0.0.0.0 --port 4173`).
  2. If there are stale servers on the same port, stop them first to avoid false test results.
  3. Run Playwright CLI against `http://127.0.0.1:4173` (or required test URL) and exercise the changed flow.
  4. For responsive/mobile changes, run checks at 375x812 and 768x1024.
  5. Wait 2-3 seconds before capturing final screenshot(s).
  6. Save screenshots under `output/playwright/` with task-specific names.
- Capture screenshots only when Playwright verification is requested.
- If the dev server fails to start due to pre-existing errors, fix them first or work around them before testing.
- If requested Playwright assertions fail, do not report completion; fix and re-run until passing.

## Browser Automation: Prefer Playwright CLI Over Cursor Browser Tool

- For all browser interactions (navigation, clicking, typing, screenshots, snapshots), prefer the Playwright CLI skill in headless mode over the Cursor IDE browser MCP tool.
- Do not run Playwright for routine task completion unless the user explicitly asks for it.
- Playwright CLI is faster, more reliable, and works in headless environments without a desktop.
- Use headless mode by default; only add `--headed` when a live visual check is explicitly needed.
- Skill location: `~/.codex/skills/playwright/SKILL.md` (wrapper script: `~/.codex/skills/playwright/scripts/playwright_cli.sh`).
- Minimum reporting format in completion messages:
  - tested URL
  - viewport(s)
  - assertion/result summary
  - screenshot absolute path(s)
  - CJS command/result (when module-loading behavior was changed)

## NPX Testing Rule

- For any `npx` package behavior test, **publish first**, then test the published `@latest` package.
- Do not rely on local unpublished changes when validating `npx` behavior.
- Run `npx` validation on the Oracle host (not local machine) unless user explicitly asks otherwise.
- For Playwright verification of `npx` behavior, use the Oracle host Tailscale URL (for example `http://100.127.77.25:<port>`) instead of `localhost`.

## A1 Playwright Verification (From Mac via Tailscale)

- Use this flow when validating UI behavior on Oracle A1 from the local Mac machine.
- On A1, start the app server with Codex CLI available in `PATH`:
  - `export PATH="$HOME/.npm-global/bin:$PATH"`
  - `pnpm run dev -- --host 0.0.0.0 --port 4173`
- From Mac, run Playwright against Tailscale URL (`http://100.127.77.25:4173`), not localhost.
- Verify success with both checks:
  - UI assertion in Playwright (new project/folder appears in sidebar or selector).
  - Filesystem assertion on A1 (`test -d /home/ubuntu/<project-name>`).
- Save screenshot artifact under `output/playwright/` and include it in the report.

## Playwright Evidence For UI Fixes

- When the user asks to test with Playwright, run the verification on the explicitly requested project/thread context (for example `TestChat`).
- Screenshot artifacts must show complete passing evidence for the tested feature, not only the base page load.
- For refresh-persistence fixes, include a post-refresh screenshot that still shows the expected UI state.
