# ILE-18 — Remove agent chat (RightRailSlot + agent-panel store + cmdk Agent group)

Status: completed

## Overview

The "Ask Ilex" agent panel shipped in ILE-9 as a placeholder pending backend wiring (ILE-13 was deferred and never landed BE-side). The panel is a disabled `<TextInput>` inside `RightRailSlot`, plus a Zustand store, a cmdk Action group, and an `agentPrompt` prop on `EmptyState` that opens it. The user has confirmed the backend will not be implemented in this iteration. The panel must come out cleanly so ILE-21 can re-lay out the shell without an orphan right column.

Pure deletion — no replacement. Lowest-risk slice; runs first to unblock everything downstream.

## Surface

- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/RightRailSlot.tsx` — delete
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/__tests__/RightRailSlot.test.tsx` — delete
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/stores/agent-panel.ts` — delete
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/cmdk-items/agent.ts` — delete
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/AppShell.tsx` — drop `RightRailSlot` import + mount
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/CmdkPalette.tsx` — drop `useAgentPanel` import, `buildAgentActions` import, agent-panel state, `openAgent` function, `agentGroup` from `allGroups`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/components/EmptyState.tsx` — drop `useAgentPanel` import, `agentPrompt` prop + handler, Ask-Ilex button
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/components/EmptyState.test.tsx` — drop agentPrompt-button test
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/__tests__/CmdkPalette.test.tsx` — drop Agent-action test + `useAgentPanel` import/reset
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/__tests__/AppShell.test.tsx` — drop right-rail assertions; rename "sidebar, topbar, and right rail carry chrome class" → "sidebar and topbar carry chrome class"
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductsListPage.tsx` — drop `agentPrompt="..."` from `<EmptyState>`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/SosListPage.tsx` — drop `agentPrompt`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/procurement/PosListPage.tsx` — drop `agentPrompt`

## Dependencies

- **Requires** none — pure deletion, no dependency.
- **Blocks** ILE-21 (shell relayout — must not still mount `<RightRailSlot />`).
- **No BE dependency.** No schema regen.
- **Decision lock:** Charcoal-only, Inter + JetBrains Mono, 60-LOC cap, four-layer architecture. None affected.

## Plan

### Implementation order

1. Delete the four files (`RightRailSlot.tsx`, `RightRailSlot.test.tsx`, `stores/agent-panel.ts`, `cmdk-items/agent.ts`).
2. Edit `AppShell.tsx`: drop `import { RightRailSlot } from './RightRailSlot'` (line 8) and `<RightRailSlot />` mount (line 46).
3. Edit `CmdkPalette.tsx`:
   - Drop `import { useAgentPanel } from '@/stores/agent-panel'` (line 14).
   - Drop `import { buildAgentActions } from './cmdk-items/agent'` (line 20).
   - Drop the two `useAgentPanel` lines (27–28).
   - Drop the `openAgent` function (lines 34–37).
   - Drop the `agentGroup` build line (line 56) and remove it from `allGroups` (line 63).
4. Edit `EmptyState.tsx`:
   - Drop `import { useAgentPanel } from '@/stores/agent-panel'` (line 12).
   - Drop the `agentPrompt?: string` prop on `EmptyStateProps` (line 26).
   - Drop the `useAgentPanel` two destructures and `handleAskIlex` function (lines 30–38).
   - Drop the `agentPrompt &&` button (lines 102–110).
   - Update the `{(actions && actions.length > 0) || agentPrompt ? (` ternary to just `{actions && actions.length > 0 ? (`.
5. Drop `agentPrompt="..."` from `<EmptyState>` calls in `ProductsListPage.tsx`, `SosListPage.tsx`, `PosListPage.tsx`.
6. Edit the three test files (drop the agent-specific tests).

### Tests after deletion

Expected count change: 409 → ~405 (drop 2 RightRailSlot tests + 1 CmdkPalette agent test + 1 EmptyState agentPrompt test).

### Validation gates

- `grep -RE "useAgentPanel|agent-panel|RightRailSlot|agentPrompt|buildAgentActions" src/` → empty.
- `tsc --noEmit` clean.
- `npm run lint` clean.
- 6 existing grep gates clean.
- `npm test` green at ~405.
- `npm run generate:api -- --check` no drift.
- `npm run build` succeeds.

## Acceptance criteria

- [ ] Four files deleted, no broken imports.
- [ ] `grep -RE "useAgentPanel|agent-panel|RightRailSlot|agentPrompt" src/` returns nothing.
- [ ] `EmptyState` no longer accepts an `agentPrompt` prop.
- [ ] `CmdkPalette` no longer has an Agent action group.
- [ ] `AppShell` no longer mounts `<RightRailSlot />`.
- [ ] All gates green; test suite at ~405.
- [ ] Manual smoke: every list page renders without a right column; ⌘K palette shows only Navigate / Create / Act groups; no Ask-Ilex button anywhere.

## Rollback

Single revert of the merge commit restores the agent panel. No data migration, no cache invalidation.

## Notes

- This issue does NOT add anything. It is the first slice of the larger refactor planned at `/home/andluca/.claude/plans/i-want-to-refactor-linear-sphinx.md`.
- The cmdk action shape (`SpotlightActionGroup`) stays — only the `Agent` group is dropped.
