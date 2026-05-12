# ILE-22 — Adopt `<PageHeader>` + `<ErrorState>` + `<StatusBanner>` across all 16 pages

Status: planned

## Overview

ILE-20 ships three primitives (`PageHeader`, `ErrorState`, `StatusBanner`). This issue adopts them across every authenticated dashboard page. The substitution is mechanical: each page swaps its inline `<Group justify="space-between"><Title order={1}>X</Title><Button>Y</Button></Group>` for `<PageHeader title="X" actions={<Button>Y</Button>} />`, and its inline `<Alert color="red">{ApiError.is...}</Alert>` for `<ErrorState error={x.error} />`. Detail pages lift their SKU/lot-code/PO-number identifier into the `contextTag` prop. Recall/voided surfaces gain a clay-tinted `<StatusBanner>` above the body.

No data-layer change. No URL/search behaviour change. Page-level layout (Stack/Grid spacing, `p="md"` vs `p="xl"`) stays as-is. The 60-LOC budget on each orchestrator tightens by ~5 LOC.

## Surface

- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/dashboard/DashboardPage.tsx`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductsListPage.tsx`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/catalog/ProductDetailPage.tsx` (contextTag = SKU)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/procurement/PosListPage.tsx`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/procurement/PoDetailPage.tsx` (contextTag = `PO-${id}`)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/procurement/PoDraftPage.tsx`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/SosListPage.tsx`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/SoDetailPage.tsx` (contextTag = `SO-${id}`; StatusBanner tone="clay" when voided)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/SoDraftPage.tsx`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/StockByBatchPage.tsx`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/BatchDetailPage.tsx` (contextTag = lot code; StatusBanner tone="clay" when recalled)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/RecallReportPage.tsx` (StatusBanner tone="clay")
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/settings/SettingsPage.tsx`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/scripts/check-grep-gates.sh` — add 2 new gates
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/*/ProductDetailHeader.tsx` etc. — review whether sibling Header components from ILE-16 should be folded back into `PageHeader.contextTag` usage (case-by-case; defer if it harms readability)

## Dependencies

- **Requires** ILE-20 (primitives must exist).
- **Compatible with** ILE-21 in parallel (different files).
- **No BE dependency.** No schema regen.
- **Decision lock:** Behavioural tests must keep passing (project's behavioural-test discipline); structural assertions are pre-existing test smells.

## Plan

### Per-page substitution pattern

For each list page (Products / POs / SOs / Stock / Settings / Dashboard):
```diff
- <Group justify="space-between" mb="md">
-   <Title order={1}>Sales orders</Title>
-   <Button component={Link} to="/sales-orders/new" leftSection={<IconPlus size={14} />}>
-     New sales order
-   </Button>
- </Group>
+ <PageHeader
+   title="Sales orders"
+   actions={
+     <Button component={Link} to="/sales-orders/new" leftSection={<IconPlus size={14} />}>
+       New sales order
+     </Button>
+   }
+ />
```

For each detail page, additionally pass `contextTag`:
```tsx
<PageHeader
  contextTag={product.sku}
  title={product.name}
  actions={<ProductDetailActions ... />}
/>
```

For each error-state inline `<Alert color="red">`:
```diff
- {query.isError && (
-   <Alert color="red" title="Error">
-     {ApiError.is(query.error) ? query.error.detail ?? query.error.error : 'An error occurred'}
-   </Alert>
- )}
+ {query.isError && <ErrorState error={query.error} />}
```

For recall/voided surfaces:
```tsx
// BatchDetailPage when batch.is_recalled:
<StatusBanner tone="clay" icon={<IconAlertOctagon size={16} />}>
  This batch was recalled on {formatDate(batch.recalled_at)}.
</StatusBanner>

// SoDetailPage when so.voided_at:
<StatusBanner tone="clay" icon={<IconBan size={16} />}>
  This sales order was voided on {formatDate(so.voided_at)}.
</StatusBanner>

// RecallReportPage (always):
<StatusBanner tone="clay" icon={<IconAlertOctagon size={16} />}>
  Recall report for batch {batch.lot_code}.
</StatusBanner>
```

### `ProductDetailHeader` / similar siblings from ILE-16

ILE-16 split `ProductDetailPage` into siblings: `ProductDetailHeader.tsx` + `ProductDetailActions.tsx` + `ProductDetailForm.tsx`. Re-examine: does the new `PageHeader` with `contextTag` make `ProductDetailHeader.tsx` obsolete?

- If `ProductDetailHeader` only renders `<Title>{name}</Title>` + the archived badge → fold into `<PageHeader contextTag={sku} title={name} subtitle={archived ? 'Archived' : undefined} />` and delete the sibling.
- If it renders richer content (e.g., a description block, side metadata) → keep `ProductDetailHeader` and call `<PageHeader>` from inside it.

Apply the same case-by-case logic for any other Header sibling created by ILE-16. Default: prefer fewer siblings.

### Grep gates

Add to `scripts/check-grep-gates.sh`:
```bash
# Gate 7: No inline page-header pattern in features (use <PageHeader> from src/components)
if grep -RE "<Title order=\{1\}" src/features/ | grep -v "PageHeader" >/dev/null; then
  echo "FAIL gate-7: inline <Title order={1}> in src/features/"
  exit 1
fi

# Gate 8: No inline ApiError alert in features (use <ErrorState> from src/components)
if grep -RE "<Alert[^>]*color=\"red\"" src/features/ >/dev/null; then
  echo "FAIL gate-8: inline red <Alert> in src/features/"
  exit 1
fi
```

(Exact regex needs verification — `PageHeader` itself uses `<Title order={1}>` internally; the gate must scope to `src/features/`, not `src/components/`. Adjust during execution.)

### Test handling

Existing page tests should keep passing if they use role-based queries (`getByRole('heading', { level: 1 })`). Tests that asserted on DOM structure (`.closest('div')`, `parentElement` chains) will break and must be fixed to use role-based queries — do not soften `PageHeader` DOM.

Expected test count: ~435 (after ILE-21) stays roughly the same; any structurally-coupled tests get rewritten, not deleted.

### Implementation order

1. Settings (smallest, lowest-risk).
2. Dashboard.
3. List pages (Products, POs, SOs, Stock).
4. Detail pages (Product, PO, SO, Batch, Recall).
5. Draft pages (PO, SO).
6. Add grep gates.
7. Run full test suite; fix any structurally-coupled assertions in place.

### Validation gates

- `tsc --noEmit` clean.
- `npm run lint` clean.
- All 8 grep gates clean (6 existing + 2 new).
- `npm test` green; expect ~435 ± few (rewrites for role-based queries).
- `npm run build` succeeds.
- Manual walk: every page header reads identical in rhythm; detail pages show mono contextTag above title; error states all read the same; recall/voided surfaces show clay banner.

## Acceptance criteria

- [ ] All 13–16 pages import `PageHeader` from `@/components/PageHeader` and (where applicable) `ErrorState` from `@/components/ErrorState` and `StatusBanner`.
- [ ] Zero remaining inline `<Title order={1}>` inside a `Group justify="space-between"` under `src/features/` (grep-gate enforced).
- [ ] Zero remaining inline `<Alert color="red">{ApiError.is` under `src/features/` (grep-gate enforced).
- [ ] LOC budget on every refactored orchestrator still ≤60 non-blank non-comment lines.
- [ ] All gates green.
- [ ] Detail pages show the mono `contextTag` (SKU / lot code / PO-N / SO-N) above the title.
- [ ] `BatchDetailPage` shows the clay `<StatusBanner>` when `batch.is_recalled`.
- [ ] `SoDetailPage` shows the clay `<StatusBanner>` when `so.voided_at` is non-null.
- [ ] `RecallReportPage` shows the clay `<StatusBanner>` at the top.

## Rollback

Per-page substitutions are localized. A targeted revert per file is possible; full revert of the merge commit is cleanest. No data, no schema, no cache.

## Notes

- Some pages may not have a `Button` action — `PageHeader.actions` is optional, omit it.
- Some pages may have richer headers (description, side metadata) — handle case-by-case as documented under "ProductDetailHeader / similar siblings" above.
- Subtitle vs contextTag: subtitle = sentence-case human-readable; contextTag = identifier (SKU, PO-N, lot code), mono uppercase tracked-wide.
