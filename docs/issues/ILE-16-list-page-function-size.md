# ILE-16 — Split list-page components over 60 LOC

## Overview

Project rule (ilex-discipline §12, matches BE invariant): **components / functions are capped at 60 lines.** Five list / detail pages currently exceed this and are growing surfaces — they're the priority. Each page follows the same A3 / A4 archetype and admits the same extraction shape:

| File | Top-level component (LOC) |
|---|---|
| `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/StockByBatchPage.tsx` | 287 |
| `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductsListPage.tsx` | 255 |
| `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductDetailPage.tsx` | 226 |
| `/home/andluca/Documents/Github/IlexInventory-Client/src/features/procurement/PosListPage.tsx` | 217 |
| `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/SosListPage.tsx` | 196 |

The standard A3 list extraction shape (per `code-review-partner` §12 + §14):
- filter row → `<XListFilters>` sibling
- header / actions → inline on the orchestrator (small enough) or `<XListHeader>` if it pushes the orchestrator over 60
- table body → `<XListTable>` sibling
- URL builder → `buildXListUrl(params)` in `src/features/{domain}/utils.ts`
- page-level wrapper stays small and orchestrates: read URL → build hook params → call data hook → render filters / states / table

`ProductDetailPage` is A4 (Detail with action bar) so the shape is slightly different: header stack, action bar, details form, and the bottom `MovementAuditTable` subview each become a sibling.

While the area is open, also extract the two duplicated helpers between `SosListPage` and `SoDetailPage` into `src/features/sales/utils.ts` (per ilex-discipline §14, same-feature DRY): `statusBadgeColor` and `effectiveStatus(so)`.

## Surface

- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/StockByBatchPage.tsx` — orchestrator trimmed
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/StockListFilters.tsx` — new sibling
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/StockListTable.tsx` — new sibling
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/utils.ts` — new (`buildStockListUrl`)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/utils.test.ts` — new (URL-builder unit test)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductsListPage.tsx` — orchestrator trimmed
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductsListFilters.tsx` — new sibling
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductsListTable.tsx` — new sibling
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/utils.ts` — new (`buildProductsListUrl`)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/utils.test.ts` — new (URL-builder unit test)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductDetailPage.tsx` — orchestrator trimmed
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductDetailHeader.tsx` — new sibling
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductDetailActions.tsx` — new sibling
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductDetailForm.tsx` — new sibling
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/procurement/PosListPage.tsx` — orchestrator trimmed
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/procurement/PosListFilters.tsx` — new sibling
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/procurement/PosListTable.tsx` — new sibling
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/procurement/utils.ts` — new (`buildPosListUrl`)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/procurement/__tests__/utils.test.ts` — new (URL-builder unit test; matches sibling test layout)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/SosListPage.tsx` — orchestrator trimmed
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/SosListFilters.tsx` — new sibling
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/SosListTable.tsx` — new sibling
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/utils.ts` — new (`buildSosListUrl` + `statusBadgeColor` + `effectiveStatus`)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/utils.test.ts` — new (URL-builder + helpers unit tests)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/SoDetailPage.tsx` — drop local `statusBadgeColor` / `effectiveStatus`, import from `./utils`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/docs/issues/status.md` — flip ILE-16 → planned

## Dependencies

- ILE-15 (completed) — surface tokens applied at chrome layer only; list pages untouched, so no churn against this work.
- ILE-9 (completed) — `EmptyState`, `LoadingSkeleton`, `ErrorBoundary` already in `src/components/`. Sibling components reuse them as-is; they are NOT re-extracted as cross-feature abstractions.
- ILE-14 (completed) — `useCmdkContext` consumes `useProduct` / `useSo`. Hook signatures are stable; this issue does not touch the data layer.
- No BE dependency. No schema regen. No new endpoint.

## Context

### What already exists

- **Five list-page test files** (already behavioural — assert on rendered DOM, not internals):
  - `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/__tests__/StockByBatchPage.test.tsx` (291 LOC)
  - `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/__tests__/ProductsListPage.test.tsx` (213 LOC)
  - `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/__tests__/ProductDetailPage.test.tsx` (382 LOC)
  - `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/__tests__/SosListPage.test.tsx` (278 LOC)
  - `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/__tests__/SoDetailPage.test.tsx` (267 LOC)
  - Procurement has no `__tests__/` dir — there is no `PosListPage.test.tsx` today; the orchestrator is covered by E2E `tests/e2e/critical-flow.spec.ts` only. The plan does NOT add a behavioural test for `PosListPage` (out of scope for a refactor); it only adds the pure URL-builder unit test.
- **Shared display primitives** already extracted (do not re-extract): `src/components/{EmptyState,LoadingSkeleton,ErrorBoundary,MovementAuditTable}.tsx`.
- **Modals + editors** already siblings in each feature folder — `ManualBatchModal`, `NewProductModal`, `ImportCsvModal`, `ArchiveConfirmModal`, `DeleteConfirmModal`, `VoidConfirmModal`, `AllocationsTable`. The orchestrators stay responsible for owning their `useState` flags and rendering them.
- **Data hooks** stable: `useProductsList`, `usePosList`, `useSosList` (cursor / `useInfiniteQuery`), `useBatchesList`, `useProduct`, `useUpdateProduct`, `useBatchesByProduct`. No data-layer change in this issue.
- **`SoDetailPage` already has** local `statusBadgeColor` (lines 33-37) and `effectiveStatus` (lines 41-44) duplicated from `SosListPage` (lines 33-37, 41-44) — exact byte-for-byte duplicates.

### Spec reference

- `ilex-discipline` §12 — function size cap (60 LOC), standard extraction shapes for list pages.
- `ilex-discipline` §14 — DRY targets explicitly call out `statusBadgeColor` and `effectiveStatus` as same-feature duplicates worth extracting; warns against cross-feature abstractions.
- `docs/architecture.md` — Features layer "Must only call data hooks, render Mantine + Tailwind, handle local UI state." Sibling components stay inside the feature folder.

### Decisions already made that affect this issue

- **Sibling components live in the feature folder, NOT in `src/components/`.** Cross-feature similarity (e.g. all list pages have a filter row) is coincidence per skill §14 — the shapes diverge (`StockByBatchPage` has `expiring_within` / `Select` / `SegmentedControl`; `ProductsListPage` has debounced `TextInput` / `SegmentedControl`; `PosListPage` has `TextInput` + `SegmentedControl`; `SosListPage` has `TextInput` + four-way `SegmentedControl`). No `<ListFilters>` generic.
- **`NumberInput` allowlist:** `StockByBatchPage` uses it for `expiring_within` (integer-only filter). After extraction the import moves to `StockListFilters.tsx` — the SPEC §4 grep gate `grep -RE "\bNumberInput\b" src/features/` allowlist already covers integer-only contexts (page size, expiring_within). Plan keeps this clean by ensuring `StockListFilters` is the only new file with `NumberInput`.
- **Money / qty stays as strings end-to-end** — none of the extractions touch money/qty math.
- **No new optimistic updates.** `ProductDetailPage` PATCH (`useUpdateProduct`) stays non-optimistic, as today.
- **Orchestrator owns local `useState`** for modals (`manualBatchOpen`, `newProductOpened`, etc.) and for the act-modal-bus effect (ILE-9 wiring). Siblings receive `opened` / `onOpen` callbacks as props — never lift state out of the page-level wrapper.
- **URL is source of truth** for filters (decision per `docs/product.md` and existing pages). URL builders are pure functions taking the typed search shape and returning the next search shape; orchestrators call `navigate({ to, search: buildXListUrl(...) })`.

## Plan

### Generated types
- None. No schema regen, no new endpoint, no `npm run generate:api` run.

### Data layer
- **No change.** Hooks stay where they are. Sibling components receive query results / params via props, they do NOT call hooks themselves (with one exception below).
- Exception: `<XListTable>` siblings can read sibling lookup data (`<StockListTable>` needs `useProductsList({ limit: 200 })` to map `product_id → name`). This stays in the orchestrator and is passed as a `productOptions` / `productNameById` prop — keeps the table sibling pure-presentational and keeps the data hook in the orchestrator's view-model.

### Components & features

**Sibling component shape (props, not internal state):**

```ts
// All filter siblings: receive current values + onChange callbacks. No URL knowledge.
<StockListFilters
  productId={...} isRecalled={...} expiringWithin={...}
  productOptions={[{value, label}, ...]}
  onProductChange={(id) => navigate(...)}
  onRecallChange={(v) => navigate(...)}
  onExpiringChange={(n) => navigate(...)}
/>

// All table siblings: receive items + a row-click handler. No filter knowledge.
<StockListTable
  items={items}
  productNameById={productNameById}
  onRowClick={(batchId) => navigate(...)}
/>
```

**`buildXListUrl(params)` URL builders (pure functions):**

```ts
// src/features/sales/utils.ts
export function buildSosListUrl(params: {
  status?: 'draft' | 'committed' | 'voided'
  search?: string
}): SosSearch { /* drops 'all' / empty values */ }

export function statusBadgeColor(status: string): string { ... }
export function effectiveStatus(so: { status: string; voided_at: string | null }): string { ... }
```

**`ProductDetailPage` (A4 — Detail) extraction shape:**
- `<ProductDetailHeader product={product} />` — title + sku + base_unit pill + archived badge
- `<ProductDetailActions product={product} hasBatches={...} batchesLoading={...} onArchive={...} onDelete={...} />` — Archive / Delete branching
- `<ProductDetailForm product={product} onSubmit={handleSave} pending={updateProduct.isPending} />` — name / sku (disabled) / description / Save
- Orchestrator keeps: param read, `useProduct` / `useBatchesByProduct`, `useUpdateProduct`, modal `useState`, act-modal-bus effect, 404 / error / loading branches, `<MovementAuditTable>` mount.

### Routes
- **No change.** Route files in `src/routes/` already mount the page components; nothing in routes changes.

### Tests (write FIRST — TDD per `tdd` skill)

**New unit tests (URL builders + helpers):**
- `src/features/sales/utils.test.ts` — `describe('buildSosListUrl')`:
  - `it('drops status when "all"')`
  - `it('keeps status when "committed"')`
  - `it('drops empty search')`
  - `it('keeps non-empty search')`
  - `describe('statusBadgeColor')` — voided→red / committed→green / draft→gray
  - `describe('effectiveStatus')` — voided_at present → 'voided'; voided_at null → status passthrough
- `src/features/inventory/utils.test.ts` — `describe('buildStockListUrl')`:
  - `it('drops product_id, is_recalled, expiring_within when undefined')`
  - `it('keeps page when supplied')`
  - `it('preserves all three filters when set')`
- `src/features/catalog/utils.test.ts` — `describe('buildProductsListUrl')`:
  - `it('drops empty search → undefined')`
  - `it('drops archived when undefined')`
  - `it('preserves page')`
- `src/features/procurement/__tests__/utils.test.ts` — `describe('buildPosListUrl')`:
  - `it('drops status="all" → no status key in BE params')`
  - `it('keeps status="draft"')`
  - `it('drops empty search')`

**Existing list-page tests (387 total today) stay green untouched.** They are behavioural (assert on rendered DOM, MSW for API). No `__tests__/` files move. No `describe` / `it` is renamed.

Two test-surface judgment calls:
1. Sibling components do NOT get their own colocated `*.test.tsx`. They are pure-presentational and tested indirectly through the orchestrator's existing behavioural tests. Adding shallow-render tests would echo coverage (per `tdd` skill: avoid echo tests across layers).
2. The URL-builder tests are pure-function unit tests with no MSW / router / provider setup — they import the helper and call it.

### Implementation

**Five independent extractions, applied in order so the test suite stays green between each.** The executor commits one page at a time.

**Step 1 — `SosListPage`** (smallest LOC delta + reveals the helper duplication target):
1. Create `src/features/sales/utils.ts`:
   - Move `statusBadgeColor` (verbatim from SosListPage lines 33-37)
   - Move `effectiveStatus` (verbatim from SosListPage lines 41-44)
   - Add `buildSosListUrl({ status, search })` returning the exact search-object shape passed to `navigate({ to: '/sales-orders', search })` today (drop `'all'` status, drop empty search).
2. Create `src/features/sales/utils.test.ts` (TDD red → green): see Tests above.
3. `src/features/sales/SoDetailPage.tsx` — drop local `statusBadgeColor` + `effectiveStatus`, import from `./utils`. Behaviour unchanged. Re-run suite: 387 + new utils tests must be green.
4. Create `src/features/sales/SosListFilters.tsx` — receives `(status, search, onSearchChange, onStatusChange)`, renders `<TextInput>` + `<SegmentedControl>`. Note: the current `SosListPage` puts the `<TextInput>` in the header `<Group>` and the `<SegmentedControl>` in a row below. Extraction keeps this split — the header sibling owns the search input, a separate filter sibling owns the segmented control. Or fold both into `SosListFilters` since they're conceptually one row of filters; pick whichever yields a sub-60 orchestrator. **Plan recommends folding both into `SosListFilters`** and passing through to the orchestrator's header `<Group>` via composition.
5. Create `src/features/sales/SosListTable.tsx` — receives `items`, `onRowClick(soId, status)`, renders the `<Table>` block (lines 160-225 today). Imports `effectiveStatus` + `statusBadgeColor` from `./utils`.
6. Trim `SosListPage.tsx` orchestrator — keep search state + debounce effect + `useSosList` call + `<EmptyState>` branches + Load-more button. Target: ≤60 LOC. Re-run suite — all SosListPage behavioural tests must stay green.

**Step 2 — `PosListPage`** (same shape as Sos but offset-paginated, no helper duplication):
1. Create `src/features/procurement/utils.ts` with `buildPosListUrl({ status, search, page })`.
2. Create `src/features/procurement/__tests__/utils.test.ts` (the procurement folder has no `__tests__/` dir today — this creates it). Pure-function unit tests.
3. Create `src/features/procurement/PosListFilters.tsx` — `<TextInput>` + `<SegmentedControl>`.
4. Create `src/features/procurement/PosListTable.tsx` — table + offset pagination footer.
5. Trim `PosListPage.tsx` to orchestrator. Target ≤60 LOC.

**Step 3 — `ProductsListPage`** (debounced search + archived filter, offset pagination):
1. Create `src/features/catalog/utils.ts` with `buildProductsListUrl({ search, archived, page })`.
2. Create `src/features/catalog/utils.test.ts`.
3. Create `src/features/catalog/ProductsListFilters.tsx` — `<TextInput>` + `<SegmentedControl>`. Owns the local debounce input state internally? **No** — debounce stays in the orchestrator (it triggers navigation, which is the orchestrator's responsibility). Sibling is controlled.
4. Create `src/features/catalog/ProductsListTable.tsx` — table + offset pagination footer.
5. Trim `ProductsListPage.tsx`. Target ≤60 LOC.

**Step 4 — `StockByBatchPage`** (the largest; three filter widgets including `NumberInput`):
1. Create `src/features/inventory/utils.ts` with `buildStockListUrl({ product_id, is_recalled, expiring_within, page })`.
2. Create `src/features/inventory/utils.test.ts`.
3. Create `src/features/inventory/StockListFilters.tsx` — `<Select>` + `<SegmentedControl>` + `<NumberInput>` for expiring-within. Owns the local debounce state for the `NumberInput` (matches the current pattern where `localExpiring` is local UI state). **NumberInput allowlist gate stays clean** — this file is the only new file importing it, and it's an integer-only context.
4. Create `src/features/inventory/StockListTable.tsx` — table + offset pagination footer. Receives `productNameById: Map<string, string>` from the orchestrator (orchestrator runs `useProductsList({ limit: 200 })` for the lookup).
5. Trim `StockByBatchPage.tsx`. Target ≤60 LOC.

**Step 5 — `ProductDetailPage`** (A4 detail, not a list — different sibling shape):
1. Create `src/features/catalog/ProductDetailHeader.tsx` — `(product) → <Stack>` with title / sku / base-unit pill / archived badge (lines 158-173 today).
2. Create `src/features/catalog/ProductDetailActions.tsx` — `(product, hasBatches, batchesLoading, onArchive, onDelete) → <Group>` with Archive / Delete button branching (lines 176-203 today).
3. Create `src/features/catalog/ProductDetailForm.tsx` — `(product, onSubmit, pending) → <form>` with the three fields + Save button. Owns its `useForm`.
4. Trim `ProductDetailPage.tsx` orchestrator — keeps: param read, `useProduct` / `useBatchesByProduct` / `useUpdateProduct`, modal `useState`, act-modal-bus effect, 404 / error / loading branches, `handleSave` (passed down), `<MovementAuditTable>` mount, `<ArchiveConfirmModal>` / `<DeleteConfirmModal>`. Target ≤60 LOC.
   - **Note:** `useForm` currently lives on the orchestrator and the `useEffect` syncs values when `product` loads (lines 76-90). Moving the form into `ProductDetailForm` is cleaner — the form sibling receives `product` and re-keys on `product.id` (or the `useEffect` moves with the form). The `handleSave` closure stays in the orchestrator since it owns `updateProduct.mutate` and the toast/error path.

**Between every step:** `npm test` + `npm run typecheck` + `npm run lint` + the six SPEC §4 grep gates must be green. The executor commits the step before moving to the next.

### Integration / wiring

- **No new ⌘K Spotlight items.** Existing items already navigate to `/products`, `/purchase-orders`, `/sales-orders`, `/stock` — those pages still mount the same orchestrator components, so URL state and route map are byte-identical.
- **No store changes.** `act-modal-bus` continues to fire into `ProductDetailPage` and `SoDetailPage` orchestrators (the bus subscription stays at the page level).
- **No theme / Tailwind change.** Mantine primitives carry across into the siblings as-is.
- **Floor mode** unaffected — list pages were never floor-mode targets.

### Documentation to update

- `/home/andluca/Documents/Github/IlexInventory-Client/docs/issues/status.md` — flip ILE-16 to `planned` now, then `completed` on execute.
- **No spec change.** The 60-LOC cap is in `code-review-partner` skill §12; it's already documented.
- **No `docs/decisions.md` change** — no architectural decision graduates here.

## Files involved

**Created:**
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/utils.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/utils.test.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/SosListFilters.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/SosListTable.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/procurement/utils.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/procurement/__tests__/utils.test.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/procurement/PosListFilters.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/procurement/PosListTable.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/utils.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/utils.test.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductsListFilters.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductsListTable.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductDetailHeader.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductDetailActions.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductDetailForm.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/utils.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/utils.test.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/StockListFilters.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/StockListTable.tsx`

**Modified:**
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/SosListPage.tsx` (orchestrator trim)
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/SoDetailPage.tsx` (drop local `statusBadgeColor` / `effectiveStatus`, import from `./utils`)
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/procurement/PosListPage.tsx` (orchestrator trim)
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductsListPage.tsx` (orchestrator trim)
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductDetailPage.tsx` (orchestrator trim)
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/StockByBatchPage.tsx` (orchestrator trim)
- `/home/andluca/Documents/Github/IlexInventory-Client/docs/issues/status.md` (status flip)

**Untouched (intentionally):**
- All five existing colocated test files (`StockByBatchPage.test.tsx`, `ProductsListPage.test.tsx`, `ProductDetailPage.test.tsx`, `SosListPage.test.tsx`, `SoDetailPage.test.tsx`) — behavioural tests, must stay byte-equivalent.
- All `src/data/*` hooks.
- All `src/api/*`, `src/routes/*`, `src/components/*`, `src/stores/*`.

## Acceptance criteria

- [ ] Each of the five top-level page components is **under 60 lines** (whitespace + comments excluded per skill §12 convention).
- [ ] All 387 existing tests stay green (no test file moved or renamed).
- [ ] **New URL-builder tests** added: `buildSosListUrl`, `buildPosListUrl`, `buildProductsListUrl`, `buildStockListUrl` — at minimum 3 cases each (drop-default / keep-set / round-trip). New helper tests for `statusBadgeColor` (3 cases) + `effectiveStatus` (2 cases). Suite count grows from 387 → ~402 (new pure-function unit tests only).
- [ ] `statusBadgeColor` and `effectiveStatus` exist in exactly **one** location: `src/features/sales/utils.ts`. `grep -n "statusBadgeColor\|effectiveStatus" src/features/sales/SosListPage.tsx src/features/sales/SoDetailPage.tsx` returns import lines only, no function definitions.
- [ ] Six SPEC §4 grep gates pass:
  - `grep -RE "(fetch|axios)\(" src/ --include='*.ts' --include='*.tsx' | grep -vE "src/data/|src/api/|src/utils/csv-export\.ts"` → empty
  - `grep -RE "as any" src/ --include='*.ts' --include='*.tsx' | grep -v "src/api/generated"` → empty
  - `grep -RE "from ['\"].*api/generated" src/features/ src/routes/` → empty
  - `grep -RE "\bNumberInput\b" src/features/` → only `StockListFilters.tsx` (integer-only `expiring_within` filter — allowlist preserved)
  - No new `as any` introduced in any new sibling
  - No layer violation: `grep -RE "apiClient\.(GET|POST|PUT|PATCH|DELETE)" src/features/` → empty
- [ ] `npm run typecheck` clean.
- [ ] `npm run lint` clean.
- [ ] `npm run generate:api -- --check` clean (no schema drift; this issue does not touch the generated client).
- [ ] No new optimistic mutation introduced. `useUpdateProduct` still invalidates without an `onMutate` block.
- [ ] Sibling components do not import from `src/routes/` (one-way data flow preserved).
- [ ] Sibling components do not call hooks from `src/data/` (orchestrators own the data layer).

## Rollback

Each of the five steps is independently revertable since it touches one feature folder (with the lone exception of Step 1, which also drops two duplicate helpers from `SoDetailPage.tsx` — that's a single-line import swap and a 8-line deletion). If any step regresses behavioural tests, the executor reverts the step's commit and re-plans the extraction without changing the others. The `utils.ts` files are pure additions and have no rollback impact on existing code.

## Notes

### Out of scope
- Optimistic updates on PATCH paths (no scope creep).
- Cross-feature abstractions (`<ListFilters>` generic, `<ListTable>` generic) — explicitly disallowed by skill §14.
- Smaller violations (worth noting for a future cleanup pass): `useCmdkContext.ts` (84 LOC after ILE-14 trim, acceptable for a route-aware hook), `LoginPage`, `SignupPage`, `RightRailSlot`, `Topbar`, `Sidebar`, `act.ts`, `api/client.ts`'s `buildClient`. None of them are in this issue's surface.
- Movement audit table (`MovementAuditTable`) is already its own component in `src/components/`; no change.

### Judgment calls flagged for the executor

1. **Filter sibling granularity** — the recommendation is "one filter sibling per page" rather than splitting search-input vs segmented-control into two siblings. If folding both into `SosListFilters` still leaves the orchestrator above 60 LOC, split into `SosListSearchInput` + `SosListSegment`. Optimize for orchestrator under 60, not for prettier sibling shapes.
2. **`ProductDetailPage` form ownership** — moving `useForm` into `ProductDetailForm` is cleaner but means the `useEffect` that syncs `form.setValues(product)` also moves; the `handleSave` callback stays in the orchestrator (it owns `updateProduct.mutate` + the toast). If the prop interface gets noisy (`onSubmit`, `submitting`, `formErrorsFromApi`), keep `useForm` on the orchestrator and pass `form` (Mantine `UseFormReturnType`) into the form sibling — Mantine's `useForm` return is designed to be passed through.
3. **`StockByBatchPage` `productOptions` lookup** — the `useProductsList({ limit: 200 })` call stays in the orchestrator (it's data-layer access). Pass `productOptions` and a `productNameById` lookup into the table / filter siblings. If the executor wants to share the lookup, derive both from the same `useProductsList` result on the orchestrator — do not call the hook twice.
