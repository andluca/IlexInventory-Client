---
description: Plan + execute one issue end-to-end (dispatches planner then executor sequentially)
argument-hint: @docs/issues/[issue-file].md
---

# Run

Instructions: $ARGUMENTS

Dispatch `planner` (Opus) and then `executor` (Sonnet) on the same issue, sequentially. Equivalent to `/plan` followed by `/execute` on the same path, with one summary at the end instead of two.

Pre-condition: the argument must point at an existing issue file under `docs/issues/` (created by `/break`).

Steps:

1. **Plan.** Dispatch the `planner` agent (Agent tool with `subagent_type: planner`) with the issue path verbatim. Wait for it to return.
2. **Gate.** If the planner returned with the issue marked `blocked` in `docs/issues/status.md` — **stop here**. Report the blocker to the user. Do not proceed to execute; the user resolves the blocker (decision needed, BE endpoint missing, scope split, etc.) and re-runs `/run` or `/plan` separately.
3. **Execute.** Dispatch the `executor` agent (Agent tool with `subagent_type: executor`) with the same issue path. Wait for it to return.
4. **Summarize** for the user in bullets:
   - Plan summary: Tests / Implementation / Files involved (1 line each)
   - Files created or modified during execution
   - Validation gates green (or which failed)
   - Final issue status (`completed` / `blocked`)
   - Whether anything was staged for commit (only if the user explicitly asked for one)

Do not commit unless the user explicitly asked for a commit in the parent prompt.
