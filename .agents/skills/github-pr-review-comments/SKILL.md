---
name: github-pr-review-comments
description: Use when the user asks to review GitHub pull requests, identify concrete risks, and write review comments with `gh`. Focus on actionable findings, not summaries.
---

# GitHub PR Review Comments

## When To Use

Use this skill when the user asks to:

- review open GitHub PRs
- check PRs not opened by the repo owner
- identify bugs, regressions, or missing validation in a PR
- write review comments back to GitHub with `gh`

## Goal

Produce high-signal PR review findings and, when requested, post concise review comments with `gh`.

## Review Standard

Default to a code review mindset:

- prioritize correctness bugs
- prioritize behavioral regressions
- prioritize compatibility and rollout risk
- prioritize missing validation where the blast radius is meaningful
- avoid low-value style commentary unless it masks a real bug

A review comment should only be posted if it says something concrete that could block, regress, or materially weaken the change.

## Workflow

1. Identify candidate PRs
- Prefer `gh pr list --repo friuns2/codexUI --state open`.
- If the user asks for PRs not by owner, filter out PRs whose author matches the repo owner.

2. Gather PR context
- Read PR title, author, body, changed files, and commits:
  - `gh pr view <number> --repo friuns2/codexUI --json ...`
- Read the diff:
  - `gh pr diff <number> --repo friuns2/codexUI`
- Narrow attention to risky files and changed contracts.

3. Form findings
- Each finding should answer:
  - what can break
  - why it can break
  - where in the patch it comes from
- Prefer 0-3 real findings over a long weak list.

4. Write comments when requested
- Use `gh pr comment <number> --repo friuns2/codexUI --body ...`
- Keep comments short, direct, and technical.
- One comment per distinct issue is preferred when the issues are unrelated.

## Comment Style

Use a terse, high-conviction review style:

- direct
- unsentimental
- technical
- specific about the failure mode

Good pattern:

1. Name the concern in one sentence.
2. Explain the concrete breakage path.
3. State what needs to be clarified, tested, or fixed before merge.

Avoid:

- excessive hedging
- praise padding
- long summaries of the PR before the issue
- vague “maybe consider” language when the risk is real

## Repo-Specific Notes

- Canonical GitHub repo: `friuns2/codexUI`
- Prefer reviewing non-owner PRs first when the user asks broadly.
- If a finding is platform-related, explicitly call out the platform that should be tested, for example WSL, Linux, macOS, or Windows.
- If you post comments, preserve the user’s requested tone as long as it stays professional and non-abusive.

## Output Expectations

When reporting back to the user:

- list findings first
- include PR number
- include the short reason
- mention whether comments were posted

If no real findings are found, say so directly.
