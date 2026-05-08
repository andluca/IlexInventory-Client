---
id: ILE-4
github_id: null
status: open
assignee: null
state: Queued
type: item
depends_on: [ILE-3]
---

# ILE-4 Implement Catalog (products) feature

## Overview

Land the Products list (`/products`) and Product detail (`/products/:id`) pages with full CRUD per SPEC §3.3: dense sortable Mantine table with name/SKU search and `archived={true,false}` filter, inline "New product" modal (name, SKU, description, base_unit ∈ `g`/`ml`/`unit`), and Product detail with editable name/description, SKU input disabled after first batch (UI matches BE 409), archive vs. hard-delete affordances respecting the BE 409 contract (archive when batches exist; hard delete when none), and the Movement audit (R6) subview filtered by `product_id` with date-range (`from`/`to`) + `kind` filters per SPEC §3.5. Implement the cross-cutting CSV import modal (`POST /products/import` with `Idempotency-Key`, per-row error rendering in a dismissible panel).

## Surface

- [ ] `src/routes/products.index.tsx`, `products.$id.tsx`
- [ ] `src/features/catalog/ProductsListPage.tsx`, `ProductDetailPage.tsx`, `NewProductModal.tsx`, `ImportCsvModal.tsx`, `ArchiveConfirmModal.tsx`, `DeleteConfirmModal.tsx`
- [ ] `src/components/MovementAuditTable.tsx` (shared — also consumed by ILE-6)
- [ ] `src/data/catalog/queries.ts`, `mutations.ts`, `keys.ts`
- [ ] `src/data/inventory/queries.ts` (movements query — shared with ILE-6; lands here first)
- [ ] Tests: list pagination + filter, SKU lock UX, archive vs delete branching, CSV import with Idempotency-Key + per-row errors, 404 on cross-owner detail, optimistic update on name/description PATCH only

## Dependencies

- ILE-3 (app shell + auth)
- BE phase 6 (catalog endpoints live) — already done per BE status (ILEX-004 completed).
