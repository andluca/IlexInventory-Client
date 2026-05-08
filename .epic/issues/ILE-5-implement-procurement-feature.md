---
id: ILE-5
github_id: null
status: open
assignee: null
state: Queued
type: item
depends_on: [ILE-4]
---

# ILE-5 Implement Procurement (purchase orders) feature

## Overview

Land the POs list (`/purchase-orders`), draft new/edit (`/purchase-orders/new`, `/purchase-orders/:id/edit`), and detail (`/purchase-orders/:id`) pages per SPEC §3.4. List filters: status (`draft` / `received`), supplier search, date range (offset pagination). Draft form: supplier name + optional contact, line editor (product picker, quantity via `<DecimalInput>`, unit_cost via `<DecimalInput>`), "Save draft" → POST/PATCH. Receive modal (F3 terminal): per-line `batch_code` (required, supplier-stamped lot) + optional `expiration_date`, action-confirmation modal, `Idempotency-Key` minted at submit, redirect to read-only PO detail with the batches that were created. Wire 409 stale-state handling per SPEC §2.5: refetch + toast `"This PO has already been received elsewhere."` when a stale tab attempts PATCH/DELETE/Receive after another tab received.

## Surface

- [ ] `src/routes/purchase-orders.*` (index, new, $id.edit, $id)
- [ ] `src/features/procurement/PosListPage.tsx`, `PoDraftPage.tsx`, `PoDetailPage.tsx`, `ReceiveModal.tsx`, `PoLineEditor.tsx`, `ReceiveConfirmModal.tsx`
- [ ] `src/data/procurement/queries.ts`, `mutations.ts`, `keys.ts`
- [ ] Tests: receive Idempotency-Key header asserted, 409 stale-state refetch + toast wording, post-receive read-only state (no PATCH/DELETE affordances), no optimistic update on receive

## Dependencies

- ILE-4 (catalog feature)
- BE phase 7 (procurement endpoints live) — already done per BE status (ILEX-005 completed).
