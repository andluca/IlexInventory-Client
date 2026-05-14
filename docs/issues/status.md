# Project Status

Last updated: 2026-05-12T02:30:00Z

## Issues

- [x] ILE-6 - completed
- [x] ILE-7 - completed
- [x] ILE-8 - completed
- [x] ILE-9 - completed
- [x] ILE-10 - completed
- [x] [ILE-11-deploy-spa-fallback.md](ILE-11-deploy-spa-fallback.md) - completed
- [x] [ILE-12-fix-shell-layout-overflow.md](ILE-12-fix-shell-layout-overflow.md) - completed
- [x] [ILE-13-import-products-invalidation.md](ILE-13-import-products-invalidation.md) - completed
- [x] [ILE-14-cmdk-context-layer-violation.md](ILE-14-cmdk-context-layer-violation.md) - completed
- [x] [ILE-15-visual-cohesion-tokens.md](ILE-15-visual-cohesion-tokens.md) - completed
- [x] [ILE-16-list-page-function-size.md](ILE-16-list-page-function-size.md) - completed
- [x] [ILE-17-cors-allow-headers-idempotency.md](ILE-17-cors-allow-headers-idempotency.md) - completed (BE-side, see `IlexInventory-Server` commit `09df7b1`)
- [x] [ILE-18-remove-agent-chat.md](ILE-18-remove-agent-chat.md) - completed
- [x] [ILE-19-botanical-token-system.md](ILE-19-botanical-token-system.md) - completed
- [x] [ILE-20-shell-primitives.md](ILE-20-shell-primitives.md) - completed
- [x] [ILE-21-unify-header-with-spine.md](ILE-21-unify-header-with-spine.md) - completed
- [ ] [ILE-22-adopt-page-primitives.md](ILE-22-adopt-page-primitives.md) - planned (requires ILE-20)
- [ ] [ILE-23-glass-overlays-kpi.md](ILE-23-glass-overlays-kpi.md) - planned (requires ILE-19, ILE-20)

## Dependency layers (for `/build`)

- **Layer 1** (parallel): ~~ILE-18, ILE-19~~ — completed 2026-05-12
- **Layer 2** (parallel): ~~ILE-20, ILE-21~~ — completed 2026-05-12
- **Layer 3** (parallel): ILE-22, ILE-23

Source plan: `/home/andluca/.claude/plans/i-want-to-refactor-linear-sphinx.md` — "Operations Terminal × Botanical Glass" refactor.

## Summary

Total: 18 issues
Completed: 16
In progress: 0
Planned: 2
Pending: 0
Blocked: 0
Failed: 0

## Execution Log

### ILE-21 — completed 2026-05-12T02:30:00Z

Unified header (header-over-sidebar) + tereré spine on active nav shipped. (1) `src/features/shell/Topbar.tsx` → renamed to `Header.tsx` (worktree executor created Header.tsx fresh; orchestrator deleted Topbar.tsx). (2) `Header.tsx` (101 LOC with JSX) is a full-width sticky 3-section bar: 240px left brand block (logo + mono lowercase org tag from `useAuthMe()` with `'ilex'` fallback) → middle `<CmdkTrigger>` → right `<FloorModeToggle>` + user avatar `<Menu>`. Outer `<Box component="header" role="banner">` with `bg-surface-elevated backdrop-blur-elevated`, `borderTop: meniscus`, `borderBottom: chromeBorder`, `position: sticky top:0 zIndex:20`, `py="md"`. (3) `Sidebar.tsx` (96 LOC): removed inner logo block; `h="100vh"` → `h="100%"`; each NavLink wrapped in `<Box style={{ position: 'relative' }}>` with conditional `{isActive && <Box className="spine" aria-hidden data-testid="spine" />}`; Mantine NavLink active background cleared via `styles={{ root: { background: 'transparent' } }}` so the spine is the single active cue. (4) `AppShell.tsx` (55 LOC, under 60 cap): restructured outer flex from row → column → `[<Header /> / row [<Sidebar /> | <main>]]`. Preserved `height:100vh + overflow:hidden`, `<main overflowY:auto>` as sole scroll surface, floor-mode effect, `<CmdkPalette>` + `<ManualBatchModal>` mounts. (5) `AppShell.test.tsx` updated: structural assertions for the new column layout — `<header>` is first child of outer flex; sidebar inside inner row alongside main. ILE-12 scroll contract assertions preserved. One unused `header` variable removed during gate fixup. (6) New `Sidebar.spine.test.tsx` with 3 behavioural tests (memory-router setup, `findByTestId('spine')` async pattern matching the project's TanStack Router test idiom). Initially used sync `getByTestId`; fixed during gate run to use async `findByTestId` + `waitFor`. (7) ILE-21 worktree's duplicate `.spine` keyframes in global.css discarded — ILE-19 already owns those rules in main.

Files modified (4): `Sidebar.tsx`, `AppShell.tsx`, `AppShell.test.tsx`, `Sidebar.spine.test.tsx` (the new file's queries). Files created (2): `Header.tsx`, `Sidebar.spine.test.tsx`. Files deleted (1): `Topbar.tsx`. Suite 422 → 438 (+3 spine + 1 column-layout AppShell test; the ILE-20 +5+4+3 = 12 tests are on the same merge).

### ILE-20 — completed 2026-05-12T02:30:00Z

Shared shell primitives shipped — three new components in `src/components/`. (1) `PageHeader.tsx` (57 LOC): glass-surfaced `<Box data-motion="page-header">` wrapping `<Group justify="space-between">` with `<Stack gap="xs">` containing optional `contextTag` (`ff="monospace" tt="uppercase" letterSpacing:0.08em`), `<Title order={1}>`, optional subtitle, and actions slot on the right. Outer carries `bg-surface-elevated backdrop-blur-elevated`, `borderTop: meniscus`, `border: chromeBorder`, `borderRadius: lg`, `padding: lg`. Entry animation declarative via `[data-motion="page-header"]` rule in `global.css` (ILE-19 owns). (2) `ErrorState.tsx` (42 LOC): `<Alert color="red" variant="light" radius="md" icon role="alert" title="Something went wrong">` body unwraps `ApiError.detail ?? ApiError.error` or falls back to generic; optional `<Button>Retry</Button>`. (3) `StatusBanner.tsx` (46 LOC): `<Box role="status">` with `TONE_BG`/`TONE_BORDER` lookups for terere/amber/clay tinted glass; icon + children in `<Group>`. (4) `docs/design/components.md` extended with §PageHeader, §ErrorState, §StatusBanner, §Page lifecycle (canonical `isError → ErrorState / isPending → LoadingSkeleton / empty → EmptyState / data → content`). (5) 12 new behavioural tests: PageHeader 5 (title h1, subtitle omitted, contextTag mono uppercase + dimmed, actions slot, glass class via `data-motion` selector), ErrorState 4 (ApiError.detail, ApiError.error fallback, generic for non-ApiError, retry callback), StatusBanner 3 (one per tone bg/border). One PageHeader glass-class test initially used `container.firstElementChild.className` which returned empty (Mantine wrapper); fixed during gate run to use `container.querySelector('[data-motion="page-header"]')`.

Files created (7): `src/components/{PageHeader,ErrorState,StatusBanner}.tsx` + colocated `.test.tsx` each, plus appended sections in `docs/design/components.md`. Zero existing pages touched — adoption is ILE-22. All gates green: typecheck clean, lint + 6 grep gates clean, 438/438 tests, generate:api --check no drift, build green.

**Build orchestration notes:** both L2 worktrees branched from `36f2f8a` (before the L1 merges had landed on main), so direct branch-merge would have conflicted. Orchestrator copied files from each worktree into main via `cp` and applied small test fixes (PageHeader glass-class assertion path + Sidebar.spine async pattern + AppShell.test.tsx unused-var) before committing. Future runs: ensure parallel L2+ executor worktrees branch from the L1-merged tip, not from origin/main.

### ILE-19 — completed 2026-05-12T01:35:00Z

Botanical token system shipped as additive expansion. (1) `src/theme/tokens.ts` extended `surfaces` with `elevatedHigh` (rgb 18 18 18 / 0.85), `elevatedHighBlur` (16px), three tinted variants (`tintedTerere/Amber/Clay` at 0.08–0.10 alpha) + matching borders, `meniscus` (1px hairline at white 0.04), and a two-stop `ambientGradient` (tereré dawn top-left + graphite warmth bottom-right). Extended `shadows` with `hoverLift` and `modalGlass`. New `motion` block exports duration (fast/base/slow) + ease (out/inOut). (2) `tailwind.config.ts` imports `motion`; extends `backgroundColor` / `backdropBlur` / `borderColor` / `boxShadow` / `transitionTimingFunction` / `transitionDuration` with the new tokens. (3) `src/theme/mantine.ts` exposes 16 new keys under `theme.other`. (4) `src/theme/global.css` declares CSS vars for ambient + motion in `:root`; extends `body` to apply `background-image: var(--ambient-gradient)` with `background-attachment: fixed`; extends `prefers-reduced-transparency` block to neutralize new glass + tinted classes + ambient gradient; new `prefers-reduced-motion` block strips transitions; appends `[data-motion="page-header"]` + `@keyframes page-header-in` + `.spine` + `@keyframes spine-in` (consumed by ILE-20 and ILE-21 — owning all keyframes here keeps layer-2 surfaces disjoint). (5) `docs/design/tokens.md` gains "Surfaces & elevation: extended" and "Motion" sections. (6) New `src/theme/__tests__/tokens.test.ts` with 20 smoke tests. Initially missing `import { describe, it, expect } from 'vitest'` — fixed post-merge during gate run.

Files modified: `src/theme/tokens.ts`, `src/theme/mantine.ts`, `tailwind.config.ts`, `src/theme/global.css`, `docs/design/tokens.md`. Files created: `src/theme/__tests__/tokens.test.ts`. Merge: `4152f03`. Suite 409 → 422 (+13 incl. token smoke + dropped agentPrompt assertions). Typecheck clean, lint + 6 grep gates clean, generate:api --check matches snapshot, build green. Zero app behaviour change beyond the (intentional + subtle) body ambient gradient.

### ILE-18 — completed 2026-05-12T01:35:00Z

Agent chat placeholder removed end-to-end. Deleted 4 files: `src/features/shell/RightRailSlot.tsx` + test, `src/stores/agent-panel.ts`, `src/features/shell/cmdk-items/agent.ts`. Plus the now-orphaned `src/features/shell/cmdk-items/__tests__/agent.test.ts` (missed by the worktree executor — caught by post-merge typecheck). Edited `AppShell.tsx` (drop RightRailSlot mount), `CmdkPalette.tsx` (drop `useAgentPanel` + `buildAgentActions` imports + `openAgent` + Agent action group), `EmptyState.tsx` (drop `agentPrompt` prop + `useAgentPanel` import + Ask-Ilex button), three list pages (`ProductsListPage`, `SosListPage`, `PosListPage` — drop `agentPrompt="..."`), and four tests. Two test files (`ProductsListPage.test.tsx`, `SosListPage.test.tsx`) had "Ask Ilex" assertions in their empty-state tests — also missed by the worktree executor, caught by post-merge Vitest run, fixed by dropping the assertions and renaming the test cases. Final grep check: `grep -RE "useAgentPanel|agent-panel|RightRailSlot|agentPrompt|buildAgentActions" src/` returns empty.

Files deleted (4): RightRailSlot.tsx + test, agent-panel.ts, cmdk-items/agent.ts, cmdk-items/__tests__/agent.test.ts. Files modified (10): AppShell.tsx + test, CmdkPalette.tsx + test, EmptyState.tsx + test, ProductsListPage.tsx + test, PosListPage.tsx, SosListPage.tsx + test. Merge: `57ca1e4`.

**Build orchestration notes for future runs:** the parallel-worktree executor subagent stopped before running its validation gates (no Bash permission in its tool scope at this session); orchestrator (main) ran the gates and applied the missed cleanups. The worktree branches were briefly lost during a `cd`-induced HEAD drift in the orchestrator; merges were recovered from dangling commits via `git fsck --lost-found` + `git merge --no-ff <sha>`. Future `/build` runs: prefer `git -C <path>` over `cd <path>` in the orchestrator's shell, and ensure the executor subagent inherits Bash permissions so it can finish its own gates within its worktree.

### ILE-17 — completed 2026-05-10T18:15:00Z

Cross-repo BE fix shipped in `IlexInventory-Server` commit `09df7b1` (`fix(cors): allow idempotency-key in preflight (ILE-17)`). `backend/settings/base.py` now sets `CORS_ALLOW_HEADERS = (*default_headers, "idempotency-key")` alongside an import of `corsheaders.defaults.default_headers`. New preflight test at `backend/apps/core/tests/api/test_cors.py` asserts that `OPTIONS /api/v1/sales-orders/{id}/commit` with `Access-Control-Request-Headers: idempotency-key, x-csrftoken, content-type` returns 200 with `idempotency-key` (and the default `x-csrftoken` + `content-type`) listed in `Access-Control-Allow-Headers`. Full BE suite 499/499 green. FE side: nothing to change — verification happens post-deploy by running `tests/e2e/critical-flow.spec.ts` against the production deploy (deferred to operator).

### ILE-16 — completed 2026-05-10T17:50:00Z

Five-step A3/A4 extraction completed. All five orchestrators now pass the ≤60 non-blank non-comment LOC cap (SosListPage: 54, PosListPage: 54, ProductsListPage: 59, StockByBatchPage: 57, ProductDetailPage: 55). 

**Files created (19):** `src/features/sales/{utils.ts, utils.test.ts, SosListFilters.tsx, SosListTable.tsx}`, `src/features/procurement/{utils.ts, PosListFilters.tsx, PosListTable.tsx, __tests__/utils.test.ts}`, `src/features/catalog/{utils.ts, utils.test.ts, ProductsListFilters.tsx, ProductsListTable.tsx, ProductDetailHeader.tsx, ProductDetailActions.tsx, ProductDetailForm.tsx}`, `src/features/inventory/{utils.ts, utils.test.ts, StockListFilters.tsx, StockListTable.tsx}`.

**Files modified (8):** `src/features/sales/{SosListPage.tsx, SoDetailPage.tsx}`, `src/features/procurement/PosListPage.tsx`, `src/features/catalog/{ProductsListPage.tsx, ProductDetailPage.tsx}`, `src/features/inventory/StockByBatchPage.tsx`, `scripts/check-grep-gates.sh` (StockListFilters added to NumberInput allowlist alongside StockByBatchPage), `docs/issues/status.md`.

**Test count:** 387 → 409 (+22 new pure-function unit tests: 9 sales utils, 5 procurement utils, 5 catalog utils, 3 inventory utils). All 387 existing behavioural tests byte-equivalent (no rename, no move).

**DRY:** `statusBadgeColor` + `effectiveStatus` now defined exactly once in `src/features/sales/utils.ts`; `SoDetailPage` and `SosListTable` import from there.

**Gates:** typecheck clean, lint + 6 grep gates clean, `generate:api --check` no drift, `npm run build` succeeded.

### ILE-16 — planned 2026-05-10T16:35:00Z

Five-step refactor (one feature per step) to bring five page orchestrators under the 60-LOC discipline cap. Standard A3 list shape — filter row → `<XListFilters>`, table → `<XListTable>`, URL builder → `buildXListUrl(params)` in `src/features/{domain}/utils.ts`, page-level wrapper orchestrates. `ProductDetailPage` (A4) splits header / actions / form into siblings instead. While the area is open: `statusBadgeColor` + `effectiveStatus` (verbatim duplicates between `SosListPage` and `SoDetailPage`) move to `src/features/sales/utils.ts` (skill §14 same-feature DRY). Sibling components stay in their feature folder — no cross-feature abstraction. NumberInput allowlist preserved (only `StockListFilters.tsx` for `expiring_within` integer filter). No data-layer change, no schema regen, no route change, no new optimistic mutation. Tests: 387 existing behavioural tests stay byte-equivalent (no rename, no move); ~15 new pure-function unit tests across 4 URL-builder files + sales helpers (387 → ~402). Steps applied independently with green tests between each so the executor commits per step.

### ILE-15 — completed 2026-05-10T16:20:00Z

Surface-elevation tokens + glass-on-chrome shipped. (1) `src/theme/tokens.ts` extended with new `surfaces` block (`surfaces.elevated = 'rgb(18 18 18 / 0.72)'`, `surfaces.elevatedBlur = '12px'`) and `shadows.elevated = '0 4px 16px 0 rgb(0 0 0 / 0.35)'` (additive — `shadows.card='none'` unchanged). (2) `tailwind.config.ts` imports `surfaces, shadows` from tokens; extends `backgroundColor['surface-elevated']`, `backdropBlur.elevated`, `boxShadow.elevated` — single source of truth preserved. (3) `src/theme/mantine.ts` imports same; adds `theme.other` block with `surfaceElevated`, `surfaceElevatedBlur`, `shadowElevated`. (4) `src/theme/global.css` appended `@media (prefers-reduced-transparency: reduce) { .bg-surface-elevated { background-color: var(--mantine-color-dark-7) !important; backdrop-filter: none !important; } }`. (5) `Topbar.tsx` drops inline `backgroundColor: 'var(--mantine-color-dark-7)'`; all three chrome components (`Sidebar.tsx`, `Topbar.tsx`, `RightRailSlot.tsx`) gain `className="bg-surface-elevated backdrop-blur-elevated"` on outer Box. LOC-neutral on Topbar/Sidebar (+1 attr), +2 on RightRailSlot (both branches). (6) Two new behavioural tests appended to `AppShell.test.tsx`: assert chrome classes on sidebar/topbar/right-rail; assert topbar no longer sets inline `backgroundColor`. Suite: 385 → 387. (7) `docs/design/tokens.md` gains "Surfaces & elevation" section documenting the three tokens + a11y fallback. Note: stale `tsconfig.node.json` declaration cache required `tsc -p tsconfig.node.json` rebuild after `tokens.ts` edit — the `composite: true` + `emitDeclarationOnly` pattern caches `.d.ts` to `node_modules/.cache/tsc-node/` and the main `tsc --noEmit` reads from it.

Files modified: `src/theme/tokens.ts`, `src/theme/mantine.ts`, `tailwind.config.ts`, `src/theme/global.css`, `src/features/shell/Topbar.tsx`, `src/features/shell/Sidebar.tsx`, `src/features/shell/RightRailSlot.tsx`, `src/features/shell/__tests__/AppShell.test.tsx`, `docs/design/tokens.md`.

### ILE-15 — planned 2026-05-10T16:10:00Z

Layered on top of ILE-12 (borders + EmptyState already done). Scope narrowed to surface-elevation tokens + glass-on-chrome. (1) Extend `src/theme/tokens.ts` with `surfaces.elevated = 'rgb(18 18 18 / 0.72)'` + `surfaces.elevatedBlur = '12px'` (charcoal at ~0.72 alpha keeps AA contrast for text/text-muted) and `shadows.elevated = '0 4px 16px 0 rgb(0 0 0 / 0.35)'` (additive — `shadows.card='none'` stays). `borders.ts` NOT extended — one export still suffices. (2) Wire tokens through both consumers: `tailwind.config.ts` gains `backgroundColor['surface-elevated']` + `backdropBlur.elevated` + `boxShadow.elevated`; `mantine.ts` exposes the same three under `theme.other` for forward-looking component overrides. Single source of truth preserved. (3) Apply to shell only — `Sidebar` / `Topbar` / `RightRailSlot` outer Boxes get `className="bg-surface-elevated backdrop-blur-elevated"`. Topbar drops its inline `backgroundColor: 'var(--mantine-color-dark-7)'` (line 39) — moved to Tailwind. List pages, data tables, EmptyState untouched (glass on dense content reads as noise). (4) `global.css` gains `@media (prefers-reduced-transparency: reduce) { .bg-surface-elevated { background-color: var(--mantine-color-dark-7) !important; backdrop-filter: none !important; } }` — acceptable `!important` for accessibility fallback. (5) Two new behavioural tests appended to existing `AppShell.test.tsx`: assert sidebar/topbar/right-rail carry the chrome classes; assert topbar no longer sets inline `backgroundColor`. jsdom does not evaluate the reduced-transparency media query → manual smoke only for that path. (6) `docs/design/tokens.md` gains a "Surfaces & elevation" section documenting the three tokens + the a11y fallback. Charcoal-only locked decision intact; Inter/JetBrains Mono untouched. No BE change, no schema regen, no route change, no data hook change. LOC-neutral (RightRailSlot +2). Tests 385 → 387.

### ILE-12 — completed 2026-05-10T15:45:00Z

Three-layer shell layout fix shipped. (1) `AppShell.tsx` outer Box `minHeight: '100vh'` → `height: '100vh'` + `overflow: 'hidden'` so `<main>` is the sole vertical scroll surface; new behavioural test `AppShell.test.tsx` asserts outer `overflow:hidden` + `<main>` `overflowY:auto`. (2) Density alignment: Topbar `py="xs"` → `py="md"` so bottom border lands at same y-coordinate as Sidebar logo bottom border. (3) New `src/theme/borders.ts` with single named export `chromeBorder = '1px solid var(--mantine-color-dark-4)' as const` (module shape for ILE-15 extension); all eight inline literals replaced — Sidebar.tsx (3) / Topbar.tsx (1) / RightRailSlot.tsx (4). (4) `EmptyState.tsx` drops `minHeight: 400` + `'1px dashed …'`, switches to `<Card withBorder padding="xl">` — empty list pages now adapt to container. RightRailSlot widths (36/320), `useFloorMode`, `applyFloorClass` untouched. Tests: 384 → 385 (all passing). Typecheck clean. Lint + 6 grep gates clean. `generate:api --check` no diff. Zero inline `'1px solid/dashed var(--mantine-color-dark-4)'` remain in shell/EmptyState.

Files created: `src/theme/borders.ts`, `src/features/shell/__tests__/AppShell.test.tsx`.
Files modified: `src/features/shell/AppShell.tsx`, `src/features/shell/Sidebar.tsx`, `src/features/shell/Topbar.tsx`, `src/features/shell/RightRailSlot.tsx`, `src/components/EmptyState.tsx`.

### ILE-12 — planned 2026-05-10T14:35:00Z

Three-layer shell layout fix. (1) `AppShell.tsx` outer Box `minHeight: '100vh'` → fixed `height: '100vh'` + `overflow: 'hidden'` so `<main>` becomes the sole vertical scroll surface. (2) Density alignment: Topbar `py="xs"` → `py="md"` to match Sidebar logo `p="md"` so bottom borders land at the same y. (3) New `src/theme/borders.ts` with single named export `chromeBorder = '1px solid var(--mantine-color-dark-4)' as const` — all eight inline literals across `Sidebar.tsx` (3) / `Topbar.tsx` (1) / `RightRailSlot.tsx` (4) swap to it. `EmptyState.tsx` drops `minHeight: 400` + `'1px dashed …'` and switches to `<Card withBorder>` so empty list pages adapt to container height. New behavioural test `src/features/shell/__tests__/AppShell.test.tsx` asserts `<main>` overflow-y:auto and outer container is `overflow:hidden`. Module shape (named exports) chosen so ILE-15 can append `surfaces.elevated` / `shadows.elevated` / glass-on-chrome without churn. RightRailSlot widths (36/320), `useFloorMode` store, and `applyFloorClass` untouched. No schema change, no data-layer change, no route change. Tests 384 → 385.

### ILE-6 — completed 2026-05-08T21:00:00Z

Steps 1–6 + 9 shipped green. Step 7 deferred to ILE-9 (per plan). Step 8 (RecallReportPage) gated — `/batches/{id}/recall-report` absent from schema; follow-up required once BE phase 8 ships the endpoint.

### ILE-7 — completed 2026-05-09T00:42:00Z

Re-shipped after BE schema drift. 294/294 tests green, typecheck + all 6 grep gates clean, generate:api --check matches live BE. Routes split: `/$id` is layout (Outlet) + `/$id/index` (SoDetailPage) — fixes render-loop on draft→edit redirect. Data layer matches current BE shape: `SalesOrderResponse.allocations` is top-level (was per-line); `AllocationResponse` fields are `id/sales_order_line_id/batch_id/allocated_quantity/unit_cost/created_at`; path param is `{so_id}` (was `{sales_order_id}`). FefoPreview groups flat `preview.allocations` by `line_id` client-side; totals card removed (BE no longer ships totals). Voided badge derived from `voided_at` first (BE keeps `status='committed'` on voided).

### ILE-8 — completed 2026-05-09T11:44:00Z

Steps 1–8 shipped. 340/340 tests green (+46 new). Typecheck, lint, generate:api --check all clean. 5 SPEC §4 grep gates clean. Files: `src/data/financials/keys.ts` + `queries.ts`, `src/utils/money.ts` (`formatPercent`), `src/components/CsvExportButton.tsx`, `src/features/dashboard/{DashboardPage,FinancialSummary,MarginByProductTable,ExpiringSoonWidget,DateRangePicker,QuickActions}.tsx`, `src/routes/_authed.index.tsx` (placeholder → DashboardPage), `src/features/inventory/BatchDetailPage.tsx` (movements CSV button).

Judgment calls:
1. `formatPercent` uses `min=0/max=1` fractionDigits (not strict ≥10/0 rule) — satisfies all worked examples including the 900% guard.
2. `/financials/margin` implemented as cursor pagination (schema is truth; SPEC §3.7 still says offset — follow-up needed in `docs/specs` + `endpoints.md`).
3. `ExpiringSoonWidget` "View all" uses `href=` string rather than TanStack `Link` to avoid cross-feature type coupling with `/stock` route `validateSearch`.

Manual smoke deferred to user.

### ILE-9 — completed 2026-05-09T13:15:00Z

Steps 1–11 shipped (step 11.4 manual smoke deferred to user). 379/379 tests green (+39 new). Typecheck, lint, generate:api --check all clean. 6 SPEC §4 grep gates clean. Files: `src/components/{EmptyState,LoadingSkeleton,ErrorBoundary}.tsx`, `src/stores/{agent-panel,manual-batch-modal,act-modal-bus}.ts` (`cmdk.ts` deleted), `src/features/shell/{RightRailSlot,CmdkPalette,CmdkTrigger}.tsx`, `src/features/shell/cmdk-items/{navigate,create,act,agent}.ts` + `useCmdkContext.ts`, `src/features/shell/AppShell.tsx`, `src/routes/_authed.tsx` (ErrorBoundary wrap), `src/data/inventory/queries.ts` (`enabled` flag on `useBatchesByProduct`).

Bus wired into `BatchDetailPage`, `SoDetailPage`, `SoDraftPage`, `ProductDetailPage`. `LoadingSkeleton` adopted on 8 pages. `EmptyState` with `agentPrompt` adopted on `ProductsListPage`, `PosListPage`, `SosListPage`, `StockByBatchPage`.

### ILE-13 — completed 2026-05-10T13:40:00Z

Added `useQueryClient()` + `onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKeys.lists() })` to `useImportProducts` in `src/data/catalog/mutations.ts`. Added one new test `'on 200 invalidates catalogKeys.lists()'` inside the existing `describe('useImportProducts')` block in `src/data/catalog/mutations.test.ts`, modeled on `useArchiveProduct → on 200 invalidates detail + lists`. TDD cycle: red (0 calls assertion), green (1 call). Suite went 383 → 384 tests. All validation gates: typecheck clean, lint + 6 grep gates clean, generate:api --check matches snapshot, no schema drift.

### ILE-14 — completed 2026-05-10T14:00:00Z

Additive `{ enabled? }` option added to `useBatch` (`UseBatchOptions`) and `useSo` (`UseSoOptions`) in the data layer, defaulting to `enabled: true` so all existing positional callers (BatchDetailPage, RecallReportPage, SoDetailPage, SoDraftPage, and their test files) continue unchanged. `useCmdkContext.ts` refactored from 133 LOC to 99 total / 84 non-empty: dropped `useQuery`, `apiClient`, `ApiError`, `inventoryKeys`, `salesKeys`, `catalogKeys` imports; replaced the three inline `useQuery` blocks (lines 57-91) with `useBatch(batchId, { enabled })` / `useSo(soId, { enabled })` / `useProduct(productId, { enabled })`. `useBatchesByProduct` call, the `useMatches` regex matching block, and the `CmdkContext` discriminator shape are byte-identical. All 384 tests pass untouched. Typecheck clean, lint + 6 grep gates clean, `generate:api --check` matches snapshot. No `apiClient.GET/POST/...` calls remain anywhere in `src/features/`. Layer rule now fully enforced for the ⌘K context path; 404-no-retry policy (BE-D4) inherited automatically.

### ILE-14 — planned 2026-05-10T14:20:00Z

Refactor `src/features/shell/cmdk-items/useCmdkContext.ts`: replace three inline `useQuery` blocks (lines 57-91) calling `apiClient.GET` directly with `useBatch` / `useSo` / `useProduct` data-layer hooks. Verified `useProduct` already accepts `{ enabled? }`; `useBatch` and `useSo` do not — small additive change adds `UseBatchOptions { enabled? }` / `UseSoOptions { enabled? }` second param defaulting to `true`, preserving all existing positional callers (BatchDetailPage, RecallReportPage, SoDetailPage, SoDraftPage, plus their test files). `useBatchesByProduct` already supports `enabled` per ILE-9 — untouched. `CmdkContext` discriminator shape stays byte-identical so `act.ts` consumer is unchanged. Existing 4 `useCmdkContext.test.tsx` cases (already MSW-driven, no `apiClient` mock) and 6 `act.test.ts` cases are expected to pass untouched — the refactor inherits the data-layer 404-no-retry policy (BE-D4). LOC target ≤80 (down from 132); <60 out of scope per prompt. No new tests, no schema regen, no `act.ts` change, no route change.

### ILE-13 — planned 2026-05-10T14:05:00Z

Single-file fix in `src/data/catalog/mutations.ts`: add `useQueryClient()` + `onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKeys.lists() })` to `useImportProducts` (lines 165-179). Closes the only gap among the seven SPEC §2.5 terminal mutations missing post-success invalidation. New test colocated in existing `src/data/catalog/mutations.test.ts` (no `__tests__/` subdir in this domain), modeled on `useArchiveProduct → 'on 200 invalidates detail + lists'`: spy on `qc.invalidateQueries`, fire mutate, await `isSuccess`, assert called with `{ queryKey: catalogKeys.lists() }`. MSW + real `QueryClient`, no TanStack-internal mocks. No BE work, no schema regen, no `ImportCsvModal` change. Per-product `catalogKeys.detail(id)` invalidation deferred — `ProductImportResponse` is summary-only.

### ILE-11 — completed 2026-05-10T13:33:00Z

Shipped `public/_redirects` (single-line `/* /index.html 200` rewrite) and `netlify.toml` ([build] + [[redirects]] blocks). Vite copied `_redirects` into `dist/_redirects` verbatim with no build wiring. `vercel.json` left untouched (`git diff vercel.json` empty). No source code, tests, or generated client touched. All gates green: 383/383 tests, typecheck clean, lint + 6 grep gates clean, `generate:api --check` OK (fallback to snapshot), `npm run build` succeeded (`dist/_redirects` confirmed present). Manual ops follow-up (Railway env vars, post-deploy DevTools smoke, canonical-host decision) remains operator surface — not executor scope.

### ILE-10 — completed 2026-05-09T03:18:00Z

Steps 1–7 shipped. 383/383 unit tests green, typecheck + lint + 6 grep gates clean, production build succeeds, generate:api --check matches live BE. R7 RecallReportPage + `/batches/$id/recall-report` route + `useRecallReport` hook (offset paginated). Playwright E2E: `critical-flow.spec.ts` (signup → product → PO receive → SO commit → recall → recall-report → CSV) and `fefo-shortfall.spec.ts`; `tests/e2e/fixtures/api.ts` seed helper; `playwright.config.ts`; `test:e2e` + `test:e2e:ui` scripts; `@playwright/test` devDep.

CI: `.github/workflows/ci.yml` (typecheck + lint + unit + generate:api --check + build on PR/main). Deploy: `.github/workflows/deploy.yml` (Vercel push-to-main + PR previews) + `vercel.json` (SPA fallback). `vitest.config.ts` excludes `tests/e2e/**` so unit + e2e suites don't fight over `.spec.ts`.

Step 8 manual smoke (run e2e against local BE + Vercel deploy + secrets) deferred to user — Vercel project setup needs `VERCEL_TOKEN` / `ORG_ID` / `PROJECT_ID`.

## Notes

### Code review sweep — 2026-05-09T16:00:00Z

User asked for a whole-repo review against the `code-review-partner` skill plus a fullstack check against `IlexInventory-Server`. Validation chain green at the time of review (typecheck, 383/383 tests, ESLint + 6 grep gates, generate:api --check). Findings produced ILE-11 through ILE-17.

#### Locked architectural decisions (do not relitigate)

- SPA per `docs/decisions.md` — the take-home brief allows either SPA or MPA; SPA is appropriate-scope and already shipped with 19 routes + 383 tests. The user-observed "direct nav 404" is a deploy-config gap (Netlify SPA fallback), not an architecture problem. ILE-11.
- Charcoal-only palette, no light mode, Inter + JetBrains Mono. ILE-15 must respect this when introducing surface/elevation tokens.
- All terminal mutations are no-optimistic — BE walks FEFO + writes allocations + ledger movements + idempotency rows in one transaction.

#### Cross-repo verification (BE at `../IlexInventory-Server`)

- All 25 FE-called endpoints map to a real BE URL pattern + view method. No drift between FE / BE / `docs/endpoints.md`.
- BE-emitted `backend/openapi.json` matches FE-consumed `docs/openapi.snapshot.json` path-for-path.
- BE auth views return `{user, csrf_token}` (`apps/core/apis.py:153, 199, 243`); FE stashes via `setCsrfToken(raw.csrf_token)`. Shape contract holds.
- BE pagination serializers emit `{items, total}` (offset) and `{items, next_cursor}` (cursor) — matches FE consumers.
- BE `settings/prod.py` correctly sets `SESSION_COOKIE_SAMESITE = "None"`, `CSRF_COOKIE_SAMESITE = "None"`, `SECURE=True`, `CORS_ALLOW_CREDENTIALS=True`. Wiring depends on Railway's `DJANGO_SETTINGS_MODULE=settings.prod` (set via `wsgi.py`/`asgi.py` `os.environ.setdefault`) plus `CORS_ALLOWED_ORIGINS` env var.

#### Real prod failure mode (root cause)

The user's "lots of endpoints hitting error on prod web" is **CORS preflight blocking `idempotency-key`**, not endpoint drift. `django-cors-headers` default `CORS_ALLOW_HEADERS` includes `x-csrftoken` but **not** `idempotency-key`. Every cross-origin terminal mutation is blocked by the browser before reaching Django. Tracked as ILE-17 (BE one-line fix). Dev never hits this because the Vite proxy makes the FE same-origin with the BE.

#### Suggested ship order

ILE-17 → ILE-11 → ILE-13 → ILE-12 → ILE-14 → ILE-15 → ILE-16. Biggest user-visible wins first; ILE-17 is the BE one-liner that unblocks 8 endpoints; ILE-11 closes the deploy direct-nav 404; ILE-13 stops a silent stale-cache bug.
