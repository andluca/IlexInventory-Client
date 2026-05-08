---
description: Execute a planned issue (dispatches executor agent in Sonnet)
argument-hint: @docs/issues/[issue-file].md
---

# Execute

Instructions: $ARGUMENTS

Dispatch the `executor` agent (model: sonnet) with the issue path as input. The agent reads the planned issue, runs the surface-aware TDD loop (component / hook / page / route / generated-types refresh / docs), hits the validation gates (typecheck strict, no `as any` outside generated, no bare fetch outside data layer, generated client up to date, no `NumberInput` in money/qty paths), and marks the issue `completed` in `docs/issues/status.md`. It does not commit unless the user explicitly asked.

Pre-condition: the issue must already have a `## Plan` section written by `/plan` (or the `planner` agent). If not, the executor will abort and report — run `/plan` first.

Invocation: Agent tool with `subagent_type: executor`, prompt including the issue path verbatim plus any extra context the user passed.

After the agent returns, summarize for the user in bullets: files created/modified, gates green, final issue status, and (if anything was staged) the suggested commit message.
