---
description: Run plan + execute over every pending issue in docs/issues/status.md. Topo-sorts dependencies into layers; issues within a layer run in parallel via git-worktree isolation.
argument-hint: (none — operates on the pending queue)
---

# Build

Instructions: $ARGUMENTS

Drive the project forward by running planner + executor over every issue currently marked `pending` in [`docs/issues/status.md`](../../docs/issues/status.md). Layer-aware: issues whose dependencies are all met run **in parallel** within a layer, isolated by git worktrees so they don't stomp on each other. Use this when you trust the planner/executor loop and want to come back to either a finished tree or a single concrete blocker.

Pre-condition: `docs/issues/status.md` exists with a `## Issues` section (created by `/break`).

## Steps

1. **Discover the queue.** Read `docs/issues/status.md`. Collect issue files whose status is `pending`. If none, report "queue empty" and stop. For each, read its `## Dependencies` section.

2. **Build the dependency graph.** Edges are FE-side issue numbers (e.g. `005` depends on `004`). BE-side dependencies (`BE phase N`) are notes for the planner — they don't affect the FE topology, but if the BE phase isn't met, the planner will mark the issue `blocked` when it runs. Detect cycles; abort loudly if any.

3. **Topo-sort into layers.** Layer 0 = pending issues with no FE dependencies (or all FE deps already `completed`). Layer 1 = pending issues whose FE deps are all in Layer 0 ∪ already-`completed`. Etc. Print the resulting layer plan to the user before starting:

   ```
   Layer 0: {001}
   Layer 1: {002}
   Layer 2: {003}
   ...
   ```

   For the current 10-issue queue this will be 10 single-issue layers (linear chain). The mechanism is dormant until a future spec produces a fan-out queue.

4. **Process layers in order.** For each layer:

   - **If the layer has 1 issue**, run it directly in the current working tree (no worktree overhead):
     a. If the issue is `pending`: dispatch `planner` (Agent tool, `subagent_type: planner`). Wait.
     b. If the issue is now `planned` (planner just ran or it was already planned from a prior `/build`): dispatch `executor` (Agent tool, `subagent_type: executor`). Wait.
     c. If the issue is `in_progress` (executor was interrupted in a previous run): abort the whole `/build` with `"issue {path} in_progress — resolve manually"`. Don't try to recover.
     d. If planner or executor marked the issue `blocked`, **stop the whole `/build`**. Do not proceed to the next layer.

   - **If the layer has 2+ issues**, dispatch them in parallel:
     a. Pre-check: confirm each issue's `## Surface` checklist writes to **disjoint file roots** (no two issues in the same layer touch the same file). If overlap is detected, abort the layer with `"layer {N} has overlapping surfaces: {issues}; cannot parallelize safely"` — the user re-runs `/break` or resolves manually.
     b. **Plan in parallel.** Send a single message containing one Agent tool call per issue, all with `subagent_type: planner` and `isolation: "worktree"`. Wait for all to return.
     c. If any planner marked its issue `blocked`, **stop** — do not execute any of the layer. The user resolves the blocker and re-runs.
     d. **Execute in parallel.** Send a single message containing one Agent tool call per issue, all with `subagent_type: executor` and `isolation: "worktree"`. The executors will commit their changes on their worktree branches (override of the default no-commit rule, **only inside `/build`'s worktree mode** — see Worktree merge protocol below). Wait for all to return.
     e. If any executor marked its issue `blocked`, **stop** — and explicitly do *not* merge any of the layer's worktrees back. The user inspects, resolves, re-runs.
     f. **Merge the layer.** For each successful executor in the layer, in numerical order: `git merge --no-ff {worktree_branch}` against the main working branch. Conflicts at this step indicate a missed surface overlap (Step 4-a should have caught this); abort with the conflicting paths, leave the merge in progress for the user.
     g. **Run gates once for the merged layer** (not per agent — gates against the merged tree are the source of truth): `npm test -- --run`, `npm run typecheck`, `npm run lint`, `npm run generate:api -- --check`, plus the SPEC §4 grep gates. If any fail, mark every issue in the layer `blocked` with reason `"layer-merge regression: {failing gate}"` and stop.

5. **Final summary.** After the loop ends (queue exhausted or a blocker hit), report:
   - Layer plan that ran (which layer indices, how many issues each, parallel or single)
   - Issues completed in this run (paths + 1-line summary from each executor)
   - Worktree branches merged (if any) and any that were left dangling because a layer blocked
   - The issue (or layer) that blocked, with reason
   - Issues still `pending` (not yet attempted)
   - Final whole-tree validation gates result

## Worktree merge protocol (parallel layers only)

In single-issue layers, the executor's normal "leave the working tree dirty" behavior applies (the user reviews + commits). In parallel layers, this doesn't work — multiple agents can't share one dirty tree. So:

- Each parallel agent runs with `isolation: "worktree"`, gets its own worktree + branch.
- The executor in worktree mode **does** commit at the end of its run, on its worktree branch only, with a Conventional Commit message like `feat: {issue title} (issue {NNN})`. It still does **not** push, and it does **not** touch the main branch.
- `/build` merges those branches back into the main working branch with `git merge --no-ff` after gates pass against the layer-merged tree.
- The main branch is not pushed. The user reviews the merge commits afterward.
- If the user did **not** ask for commits in the parent prompt, `/build` performs the worktree commits and the merges anyway (they're internal to the parallel mechanism), but stops short of any `git push`. The user can `git reset` the merge commits if they want a different layout, or amend them, or push as-is.

## Hard rules

- **Stop on first `blocked`.** Anywhere in the loop. Do not silently skip; do not attempt downstream layers. The user resolves the blocker and re-runs `/build`, which picks up where it left off (the still-`pending` issues are reprocessed).
- **Re-entrancy.** If `/build` is restarted, issues already `completed` are skipped. Issues already `planned` skip the planner step and go straight to the executor. Issues `in_progress` abort the build (manual resolution required).
- **Do not push.** Internal merge commits are local. The user pushes manually after review.
- **Do not parallelize within a non-disjoint layer.** Surface overlap detection is a hard precondition for parallel dispatch. If the planner ever needs to write into a shared file root that two issues both touch, those issues belong in the same issue, not the same layer.
- **Respect the BE.** If a planner marks an issue `blocked` because a BE phase isn't met, the layer stops. The user runs the BE side or publishes an OpenAPI snapshot, then re-runs `/build`.
- **Gates run on the merged tree, not per agent.** Per-agent gates inside a worktree are noise; a layer is green only if the union of its changes is green.

## When to use vs. /run

- `/run` — one issue. Sequential by definition. Use when you want a clean checkpoint between issues.
- `/build` — autonomous loop with layered parallelism where the dependency graph allows it. Use when you trust the planner/executor loop and want to come back to a finished or single-blocker state.

For the current FE queue (10 issues, linear chain), `/build` will run 10 single-issue layers sequentially in the main working tree — the parallel + worktree mechanism stays dormant. The first time `/break` produces a fan-out queue, the mechanism activates automatically.
