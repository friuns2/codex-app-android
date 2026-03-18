# AGENTS.md

## "Push to main or commit to main" Means Merge To Local Main

- When the user says "push", interpret it as: merge the current work into local `main`
- Do not push to any remote unless the user explicitly asks to push to a remote.

## Merge to local main flow for worktree:

1. In the worktree, commit changes and create a branch.
   - `git add -A && git commit -m "<message>"`
   - `git switch -c <your-branch>`
2. If the user asks for a **single merge commit**, do this exact sequence in the main worktree:
   - find pre-merge `main` from reflog (example: `git reflog main`)
   - `git checkout main`
   - `git reset --hard <pre-merge-main-commit>`
   - `git checkout <your-branch>`
   - `git rebase main`
   - `git checkout main`
   - `git merge --no-ff <your-branch> -m "Merge branch '<your-branch>' into main"`
3. Otherwise, merge into local `main` from the main worktree:
   - `git checkout <your-branch>`
   - `git rebase main`
   - `git checkout main`
   - `git merge --no-ff <your-branch>`

## Commit After Each Task

- Always create a commit after completing each discrete task or sub-task.
- Do not batch multiple tasks into a single commit.
- Each commit message should describe the specific change made.

## Completion Verification Requirement (MANDATORY)

- **ALWAYS test UI/behavior changes before reporting completion.** Never skip this step.
- After completing a task that changes behavior or UI, run a Playwright verification in headless mode.
- Start the dev server (`npm run dev`) if not already running, then open the page with Playwright CLI.
- For responsive/mobile changes, use `resize <w> <h>` to test at mobile (375x812) and tablet (768x1024) viewports.
- Before taking any screenshot, wait a few seconds to ensure the UI has fully loaded.
- Always capture a screenshot of the changed result and display that screenshot in chat when reporting completion.
- If the dev server fails to start due to pre-existing errors, fix them first or work around them before testing.

## Browser Automation: Prefer Playwright CLI Over Cursor Browser Tool

- For all browser interactions (navigation, clicking, typing, screenshots, snapshots), prefer the Playwright CLI skill in headless mode over the Cursor IDE browser MCP tool.
- Playwright CLI is faster, more reliable, and works in headless environments without a desktop.
- Use headless mode by default; only add `--headed` when a live visual check is explicitly needed.
- Skill location: `~/.codex/skills/playwright/SKILL.md` (wrapper script: `~/.codex/skills/playwright/scripts/playwright_cli.sh`).

## NPX Testing Rule

- For any `npx` package behavior test, **publish first**, then test the published `@latest` package.
- Do not rely on local unpublished changes when validating `npx` behavior.
- Run `npx` validation on the Oracle host (not local machine) unless user explicitly asks otherwise.
- For Playwright verification of `npx` behavior, use the Oracle host Tailscale URL (for example `http://100.127.77.25:<port>`) instead of `localhost`.

## A1 Playwright Verification (From Mac via Tailscale)

- Use this flow when validating UI behavior on Oracle A1 from the local Mac machine.
- On A1, start the app server with Codex CLI available in `PATH`:
  - `export PATH="$HOME/.npm-global/bin:$PATH"`
  - `npm run dev -- --host 0.0.0.0 --port 4173`
- From Mac, run Playwright against Tailscale URL (`http://100.127.77.25:4173`), not localhost.
- Verify success with both checks:
  - UI assertion in Playwright (new project/folder appears in sidebar or selector).
  - Filesystem assertion on A1 (`test -d /home/ubuntu/<project-name>`).
- Save screenshot artifact under `output/playwright/` and include it in the report.
