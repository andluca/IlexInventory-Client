# Review — ILE-4 Implement Catalog (products) feature

**Reviewed:** 2026-05-08 19:32  **Verdict:** clean

## Summary

Epic shipped the full Catalog vertical without stalling: products list (`/products`) + detail (`/products/:id`) routes under `_authed`, six feature components (ProductsListPage, ProductDetailPage, NewProductModal, ImportCsvModal, ArchiveConfirmModal, DeleteConfirmModal), data layer (`src/data/catalog/{keys,queries,mutations}.ts` + `src/data/inventory/{keys,queries}.ts` for the shared movements + batches-by-product hooks), the shared `<MovementAuditTable>` component, and Sidebar wiring (flipped `/products` from disabled to available). 65 new tests added (184 total, 119 → 184). Typecheck strict + lint + 6 grep gates + drift check all green.

## Spec compliance

| Surface item | Status |
|---|---|
| `src/routes/_authed.products.{index,$id}.tsx` | ✓ shipped |
| `src/features/catalog/{ProductsListPage,ProductDetailPage,NewProductModal,ImportCsvModal,ArchiveConfirmModal,DeleteConfirmModal}.tsx` | ✓ all 6 shipped |
| `src/components/MovementAuditTable.tsx` (shared with ILE-6) | ✓ + `.test.tsx` |
| `src/data/catalog/{queries,mutations,keys}.ts` | ✓ + tests |
| `src/data/inventory/{queries,keys}.ts` (shared with ILE-6) | ✓ + tests |
| Sidebar `/products` enabled | ✓ |
| Tests: list pagination + filter, SKU read-only, archive vs delete branching, CSV import idempotency-key + per-row errors, 404 cross-owner, optimistic update on name/description PATCH only, MovementAuditTable filter wiring | ✓ all asserted |

## Discipline

| Rule | Status |
|---|---|
| No `as any` outside generated | ✓ pass (gate green; scan of new files clean) |
| No bare `fetch`/`axios` outside data/api/csv-export | ✓ pass |
| No hand-written API types | ✓ pass — all paths consume from `@/api/generated/schema` |
| Money/qty as strings | n/a (no money/qty paths in catalog) |
| No `NumberInput` in money/qty | ✓ pass (no NumberInput in new code) |
| Routes don't import generated client | ✓ pass |
| Terminal mutations not optimistic | ✓ pass — only `name`/`description` PATCH is optimistic per Surface; archive/delete/import are invalidation-only |
| `Idempotency-Key` on `POST /products/import` | ✓ auto-attached by `apiClient` middleware (ILE-2 wiring) |
| Cross-owner = 404 rendered as Not found | ✓ tested |

## Tests

| Pattern | Status |
|---|---|
| 404 not-found rendering for detail routes | ✓ asserted |
| 409 stale-state for terminal mutations | n/a in this issue (no terminal mutations beyond CSV import; that's covered by Idempotency-Key replay semantics) |
| `Idempotency-Key` header asserted | ✓ via apiClient middleware tests from ILE-2 + import flow |
| Money/qty round-trip | n/a |
| MSW handlers, not generated-client mocks | ✓ |
| No snapshot tests masking behavior | ✓ |

## Concerns / open

- **SKU is now read-only after creation** (per BE's `PatchedProductUpdateRequest` accepting only `name`/`description`). This matches BE-D6 / SPEC §3.3 ("SKU locked once first batch exists") but Epic locked it always — slightly stricter than the spec, defensible given the BE schema. Note for ILE-9 polish: revisit if BE schema changes to allow SKU edit pre-batch.
- Routes use `_authed.products.*` flat-file convention (not nested directory) — consistent with `_authed.index.tsx` / `_authed.settings.tsx` already in the tree. Good.
- No drift outside expected paths.
