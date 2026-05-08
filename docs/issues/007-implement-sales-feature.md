# Implement Sales (sales orders) feature — draft, commit, void

## Overview

Land SOs list (`/sales-orders`, cursor pagination via `useInfiniteQuery`), draft new/edit (`/sales-orders/new`, `/sales-orders/:id/edit`), and detail (`/sales-orders/:id`) per SPEC §3.6. List filters: status, voided, customer search, date range. Draft form: customer name + optional contact, line editor (product picker, quantity via `<DecimalInput>`, sell_price via `<DecimalInput>`). FEFO preview: calls `POST /sales-orders/:id/preview` (non-mutating) and renders proposed allocations by `expiration_date ASC NULLS LAST` so the owner sees what FEFO will do *before* committing. Commit: action-confirmation modal → `POST /commit` with `Idempotency-Key`; **no optimistic update** (the BE walks FEFO + writes allocations + ledger movements atomically, which the client cannot honestly mirror). 422 shortfall renders `{ shortfall: { product_id, required, available } }` inline. Admin override (BE-D11): "Edit allocations" affordance hidden behind a disclosure to keep the default flow clean — when populated, body includes explicit `allocations`. Void: confirmation modal → `POST /void` with `Idempotency-Key`; voided banner shows `voided_at`; further actions disabled. 409 stale-state on commit (already-committed SO) and on void (already-voided SO) → refetch + toast per SPEC §2.5.

## Surface

- [ ] `src/routes/sales-orders.*` (index, new, $id.edit, $id)
- [ ] `src/features/sales/SosListPage.tsx`, `SoDraftPage.tsx`, `SoDetailPage.tsx`, `FefoPreview.tsx`, `CommitConfirmModal.tsx`, `VoidConfirmModal.tsx`, `AllocationsTable.tsx`, `AllocationOverrideEditor.tsx`, `ShortfallBanner.tsx`
- [ ] `src/data/sales/queries.ts` (cursor pagination), `mutations.ts`, `keys.ts`
- [ ] Tests: FEFO preview rendering from server response, commit Idempotency-Key header, no-optimistic on commit, 422 shortfall inline rendering, admin-override disclosure default-hidden, void Idempotency-Key, 409 stale-state on commit + void, voided-state UI disabling

## Dependencies

- 006
- BE phase 9 (sales endpoints live)
