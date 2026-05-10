# ILE-12 — Constrain shell to viewport; remove cascading 100vh and min-height baselines

## Overview

The dashboard scrolls vertically on a fresh viewport even though the visible content fits, and a horizontal scrollbar appears at common widths. The user reports this as broken responsivity. Three layers of layout drift compound the issue:

1. **AppShell uses `minHeight: '100vh'` on the outer Box, no `overflow` boundary.** The sidebar, main column, and right rail are all `position: sticky` with `h="100vh"`. Because the outer wrapper has *min*-height (not fixed height) and never sets `overflow: hidden`, any time the main column's content + chrome adds up to less than 100vh the page still extends to a full viewport, and any time it adds up to *more*, the **page** scrolls instead of the **main column** scrolling — defeating `overflowY: 'auto'` on `<main>`.
2. **EmptyState forces `minHeight: 400` inline.** Every list page (Products, POs, SOs, Stock) rendering the empty branch reserves 400px even on screens where the surrounding chrome already fills the viewport, pushing real content past the fold.
3. **Topbar / Sidebar / RightRailSlot borders are out of phase.** The sidebar's logo container is `p="md"` (16px y-padding); the topbar is `py="xs"` (~8px y-padding). Their bottom borders therefore land at different y coordinates, which is the "containers don't match" the user called out. The borders are also defined inline as raw `'1px solid var(--mantine-color-dark-4)'` strings in eight places — drift from token discipline.

## Surface

- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/AppShell.tsx` — outer Box: `minHeight: '100vh'` → fixed `height: '100vh'` + `overflow: 'hidden'`. Inner `<main>` becomes the sole vertical scroll surface (`overflowY: 'auto'`, `minWidth: 0` already present on the column wrapper).
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/Sidebar.tsx` — logo container density mismatch: currently `p="md"`. Adopt single shared density (e.g. both `py="md" px="md"`) so bottom borders form a continuous line across `<aside>` + `<header>`. Replace three inline `'1px solid …'` borders with `chromeBorder` constant.
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/Topbar.tsx` — apply matching density change (`py="xs"` → `py="md"`). Replace one inline border with `chromeBorder`.
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/RightRailSlot.tsx` — keep collapsed (36px) and expanded (320px) widths and sticky behaviour identical; replace four inline borders with `chromeBorder`.
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/components/EmptyState.tsx` — drop inline `minHeight: 400` + raw `'1px dashed var(--mantine-color-dark-4)'`. Switch to `<Card withBorder>` (Mantine primitive) so empty content adapts to its container. Charcoal-only.
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/borders.ts` — **NEW**, single named export `chromeBorder` for the canonical chrome divider literal. Module shape (named exports, no default) so ILE-15 can append `surfaces` / `shadows.elevated` / glass tokens without churn.
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/__tests__/AppShell.test.tsx` — **NEW**, behavioural test asserting `<main>` is the scroll surface (overflow-y boundary lives there, not on the body).

## Dependencies

- ILE-11 (deploy SPA fallback) — completed.
- ILE-14 (cmdk context layer violation) — completed; AppShell composes CmdkPalette, no behavioural change there.
- Coordinates with ILE-15 (visual cohesion tokens — pending). ILE-12 creates `theme/borders.ts` with the single `chromeBorder` constant; ILE-15 will later expand it (`surfaces.elevated`, `shadows.elevated`, glass-on-chrome variant) and consume it from `theme/mantine.ts` + `tailwind.config.ts`. The eight inline border literals are swapped HERE to avoid ILE-15 re-doing the work.

## Context

### What already exists

- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/AppShell.tsx` — composes `<Sidebar>`, `<Topbar>`, `<RightRailSlot>`, `<CmdkPalette>`, `<ManualBatchModal>`. Outer Box currently `minHeight: '100vh'`; main column already has `overflowY: 'auto'` + `minWidth: 0` — only the outer height + overflow boundary is wrong.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/Sidebar.tsx` — `<aside w={240} h="100vh" position: sticky>`, three inline borders (right, bottom-of-logo, top-of-footer). Logo container `p="md"`.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/Topbar.tsx` — `<header px="md" py="xs">`, one inline `borderBottom`.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/RightRailSlot.tsx` — collapsed branch (36px) has 1 border; expanded branch (320px) has 3 borders (left + group separator + footer top). Wired to `useAgentPanel` store. Behaviour locked by `RightRailSlot.test.tsx`.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/components/EmptyState.tsx` — only callsite of `minHeight: 400` + only `'1px dashed …'` literal in the codebase. Behaviour locked by `EmptyState.test.tsx` (4 tests: title/body, icon, action handlers, agentPrompt).
- `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/tokens.ts` — design tokens module; pattern for named exports (`colors`, `gray`, `radius`, `shadows`, `focus`). No `borders` export yet — that's the gap ILE-15 will fully fill, but ILE-12 lands the minimal foothold.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/test/render.tsx` — `renderWithProviders` (Mantine + QueryClient). Pattern reference for the new AppShell test wrapper.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/__tests__/RightRailSlot.test.tsx` — pattern reference: bare `MantineProvider` + `render`, behavioural assertions only, no snapshots.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/floorMode.ts` + `useFloorMode` store — applies `<html class="floor">` for floor-mode density. Not touched here; layout change must not break it.
- EmptyState consumers: `ProductsListPage`, `PosListPage`, `SosListPage`, `StockByBatchPage`, `RecallReportPage`. Tests asserting `EmptyState` rendering already use behavioural queries (heading text, action button text) — none assert minHeight or the dashed-border style, so the chrome swap to `<Card withBorder>` is safe.

### Spec reference

- `docs/specs/SPEC.md` §2 — foundations (no `as any` outside generated, no bare fetch, charcoal-only palette).
- `docs/decisions.md` — charcoal-only palette is locked (no light mode).
- ILE-15 issue file — coordinated module shape for `theme/borders.ts`.

### Decisions already made that affect this issue

- Charcoal-only palette; no light-mode tokens (locked, SPEC).
- `theme/tokens.ts` already uses named exports — `theme/borders.ts` follows the same convention so ILE-15 can append.
- Floor-mode density is governed by `<html class="floor">` and the `floor:` Tailwind variant — layout primitives must stay floor-mode-clean.
- RightRailSlot widths (36px collapsed, 320px expanded) are locked by `RightRailSlot.test.tsx`; do not change.
- Tests are behavioural, not snapshots (per `tdd` skill).

## Plan

### Generated types

Not applicable. No BE endpoint or schema change. `generate:api --check` must remain a no-op.

### Data layer

Not applicable. Pure layout / chrome change.

### Components & features

**New file** `src/theme/borders.ts`:

```ts
/**
 * Chrome border tokens.
 *
 * Single source of truth for shell dividers (sidebar / topbar / right rail / EmptyState).
 * ILE-15 will extend this module with surfaces.elevated, shadows.elevated, and a
 * glass-on-chrome variant — keep it as a named-export module so additions don't churn.
 */
export const chromeBorder = '1px solid var(--mantine-color-dark-4)' as const
```

**Modify** `src/components/EmptyState.tsx`:

- Replace outer `<Box style={{ ..., minHeight: 400, border: '1px dashed …', borderRadius, padding }}>` with Mantine `<Card withBorder padding="xl">` (`Card` already encodes `surface` background + token border-radius). Drop `minHeight`. Center contents via `display: 'flex'` + `alignItems` retained on the inner Stack/Card body or via `<Card>` + flexbox helpers.
- Inner `<Stack align="center" gap="md" maw={480}>` and all action handling untouched.
- The four existing `EmptyState.test.tsx` cases (title+body, icon, action handlers, agentPrompt) must pass without modification.

**Modify** `src/features/shell/AppShell.tsx`:

- Outer Box: `style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}` (was `minHeight: '100vh'`, no overflow).
- Inner main column wrapper unchanged (`flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0`).
- `<Box component="main" style={{ flex: 1, overflowY: 'auto' }}>` unchanged — but it now meaningfully scrolls because the parent caps height.

**Modify** `src/features/shell/Sidebar.tsx`:

- Import `chromeBorder` from `@/theme/borders`.
- Outer `<Box component="aside">` `borderRight: chromeBorder`.
- Logo `<Box>`: change `p="md"` → `py="md" px="md"` (no behavioural change today; documents the y-axis explicitly to make Topbar parity clear); `borderBottom: chromeBorder`.
- Footer `<Box p="md">` `borderTop: chromeBorder` (unchanged density).

**Modify** `src/features/shell/Topbar.tsx`:

- Import `chromeBorder` from `@/theme/borders`.
- Change `py="xs"` → `py="md"` so the bottom border lands at the same y-coordinate as the sidebar logo's bottom border.
- `borderBottom: chromeBorder`.

**Modify** `src/features/shell/RightRailSlot.tsx`:

- Import `chromeBorder` from `@/theme/borders`.
- Both branches (collapsed `w={36}` + expanded `w={320}`) `borderLeft: chromeBorder`.
- Header Group `borderBottom: chromeBorder`.
- Footer Box `borderTop: chromeBorder`.
- All other props (widths, sticky positioning, store wiring, ActionIcon handlers) unchanged.

### Routes

Not applicable. No route change. AppShell continues to mount inside `src/routes/_authed.tsx`.

### Tests (write FIRST)

**New** `src/features/shell/__tests__/AppShell.test.tsx`:

- `describe('AppShell')`
  - `it('main column is the scroll surface (overflow-y: auto)')` — render `<AppShell><div data-testid="page" /></AppShell>` inside `MantineProvider` + `QueryClientProvider` + `RouterProvider` (memory history at `/`). Query the `<main>` element via `screen.getByRole('main')`. Assert `getComputedStyle(main).overflowY === 'auto'`. Assert the outer container does not (`getComputedStyle(outer).overflow !== 'auto'` and is `'hidden'`).
  - Behavioural test only — no snapshots, no implementation internals (per `tdd` skill).
  - Mount cost: AppShell pulls `useAuthMe` (Topbar) + Cmdk items. Mock the auth call with MSW (`server.use(...)`) returning `{ user: null }` to avoid real network. RightRailSlot renders unconditionally — store state default (`open: false`) is fine.

Existing tests must stay green:

- `src/components/EmptyState.test.tsx` (4 tests) — behavioural; the `<Card withBorder>` swap leaves heading / body / icon / action / agentPrompt intact.
- `src/features/shell/__tests__/RightRailSlot.test.tsx` (2 tests) — behavioural; chromeBorder swap is style-equivalent.
- All feature tests using EmptyState (`StockByBatchPage`, `RecallReportPage`, `ProductsListPage`, `PosListPage`, `SosListPage`) — verified to query EmptyState by heading text only; no minHeight/style assertions.

Total: 384 → 385 tests.

### Implementation

Order (red → green):

1. **Test (Component test, red)** — author `src/features/shell/__tests__/AppShell.test.tsx` with the overflow boundary assertion. Run: fails because outer Box still has `minHeight`, no `overflow: hidden`.
2. **Theme (Util)** — create `src/theme/borders.ts` with the single `chromeBorder` named export, JSDoc noting ILE-15 will extend this module.
3. **Feature (AppShell)** — update `src/features/shell/AppShell.tsx`: outer Box `height: '100vh'` + `overflow: 'hidden'`. Run new test → green.
4. **Feature (Sidebar)** — update `src/features/shell/Sidebar.tsx`: import `chromeBorder`; replace 3 inline literals; logo container `py="md" px="md"`. Run shell test suite → green.
5. **Feature (Topbar)** — update `src/features/shell/Topbar.tsx`: import `chromeBorder`; replace 1 inline literal; `py="xs"` → `py="md"` so bottom border aligns with sidebar logo bottom border.
6. **Feature (RightRailSlot)** — update `src/features/shell/RightRailSlot.tsx`: import `chromeBorder`; replace 4 inline literals (collapsed `borderLeft`, expanded `borderLeft`, header `borderBottom`, footer `borderTop`). Widths and sticky behaviour untouched.
7. **Component (EmptyState)** — update `src/components/EmptyState.tsx`: swap outer `<Box>` for `<Card withBorder padding="xl">`, drop `minHeight: 400` + dashed-border literal, keep inner `<Stack>` and action wiring. Run `EmptyState.test.tsx` → still green.
8. **Verification** — run full test suite (385 tests), typecheck, lint, the eight grep gates. Confirm no inline `'1px solid var(--mantine-color-dark-4)'` remains under `src/features/shell/` or `src/components/EmptyState.tsx`.

### Integration / wiring

- No new route, no new ⌘K item, no Zustand store change.
- Floor-mode is `<html class="floor">` — orthogonal to viewport boundary changes; verify by running existing floor-mode tests (no change expected).
- No theme / tokens.ts edit (ILE-15 owns that). `theme/borders.ts` is its own file; tokens.ts stays as-is.

### Documentation to update

- None. Plan updates `docs/issues/status.md` only. ILE-15 issue file already references the same `theme/borders.ts` coordination — no edit needed there. `docs/design/tokens.md` extension is owned by ILE-15.

## Files involved

Created:

- `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/borders.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/__tests__/AppShell.test.tsx`

Modified:

- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/AppShell.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/Sidebar.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/Topbar.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/RightRailSlot.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/components/EmptyState.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/docs/issues/status.md`

## Acceptance criteria

- New test `AppShell › main column is the scroll surface` passes; the outer container has `overflow: hidden` and `<main>` has `overflowY: auto`.
- Existing 384 tests stay green; total becomes 385.
- `EmptyState` no longer reserves 400px on empty list pages; it adapts to its container (`<Card withBorder>`).
- Sidebar logo bottom border and Topbar bottom border land at the same y-coordinate (both `py="md"`), forming a continuous divider across `<aside>` + `<header>`.
- All eight inline `'1px solid var(--mantine-color-dark-4)'` literals in `src/features/shell/{Sidebar,Topbar,RightRailSlot}.tsx` and the one `'1px dashed …'` in `src/components/EmptyState.tsx` are replaced (border replaced via `<Card withBorder>` for EmptyState; `chromeBorder` constant for the shell).
- RightRailSlot collapsed (36px) and expanded (320px) widths unchanged; floor-mode behaviour unchanged.
- Universal gates:
  - `npm test` green
  - `npm run typecheck` (strict) passes
  - `npm run lint` passes
  - `npm run generate:api -- --check` returns no diff (no schema change)
  - `grep -RE "(fetch|axios)\(" src/ --include='*.ts' --include='*.tsx' | grep -vE "src/data/|src/api/|src/utils/csv-export\.ts"` returns nothing
  - `grep -RE "as any" src/ --include='*.ts' --include='*.tsx' | grep -v "src/api/generated"` returns nothing
  - `grep -RE "from ['\"].*api/generated" src/features/ src/routes/` returns nothing
  - `grep -RE "\bNumberInput\b" src/features/` returns nothing outside the integer-only allowlist
  - `grep -RnE "1px (solid|dashed) var\(--mantine-color-dark-4\)" src/features/shell src/components/EmptyState.tsx` returns nothing (all literals migrated)

## Rollback

- Single-issue scope; `git revert <commit>` restores prior layout cleanly.
- No data-layer or schema change → no cache invalidation, no migration risk, no observable BE coupling.
- If `<Card withBorder>` reads visually wrong on any list page after rollout, revert just `EmptyState.tsx` (single-file rollback) — the AppShell + chrome border work is independent.
- If the viewport boundary change breaks an unforeseen route (e.g. an inner page assumes the body scrolls), revert `AppShell.tsx` only; the `chromeBorder` extraction and Topbar/Sidebar density alignment can ship independently.

## Out of scope

- Glassmorphism / `surfaces.elevated` / `shadows.elevated` tokens — ILE-15.
- Tailwind config + `theme/mantine.ts` consumption of borders module — ILE-15.
- List page function-size refactor — ILE-16.
- Any data-layer or route changes.
- Adding light-mode tokens (locked out by SPEC).
- Touching `useFloorMode` store or `applyFloorClass`.
