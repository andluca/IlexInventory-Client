---
id: ILE-6
github_id: null
status: open
assignee: null
state: Queued
type: item
depends_on: [ILE-5]
---

# ILE-6 Implement Inventory (batches, movements, recall) feature

## Overview

Land Stock by batch (`/stock`), Batch detail (`/batches/:id`), and Recall report (`/batches/:id/recall-report`) pages per SPEC §3.5. `/stock` filters: product, recall status, `expiring_within=N` days — the last filter doubles as the R2 dedicated view linked from the dashboard widget (ILE-8 wires the link). Batch detail surfaces F4 (manual batch creation — initiated from this page since the existing batch is the UI starting context, not the target, per BE-D2), F5 (Adjust modal — kind=`adjustment`, signed quantity, non-empty notes required per BE-D7), F6 (Write off — `Idempotency-Key`), F9/F10 (Recall + Un-recall with reason; `Idempotency-Key`), F12 (Metadata correction PATCH limited to `batch_code` + `expiration_date`; other fields rejected). Movement audit (R6) subview filtered by `batch_id` reuses `<MovementAuditTable>` from ILE-4, with `metadata_correction` rows (qty=0) appearing in the timeline. Recall report renders customers from non-voided committed SOs with CSV export via `src/utils/csv-export.ts`.

## Surface

- [ ] `src/routes/stock.tsx`, `batches.$id.tsx`, `batches.$id.recall-report.tsx`
- [ ] `src/features/inventory/StockByBatchPage.tsx`, `BatchDetailPage.tsx`, `RecallReportPage.tsx`, `ManualBatchModal.tsx`, `AdjustModal.tsx`, `WriteOffModal.tsx`, `RecallModal.tsx`, `UnRecallModal.tsx`, `BatchMetadataEditor.tsx`
- [ ] `src/data/inventory/mutations.ts` (extend), `queries.ts` (extend with `expiring_within`)
- [ ] Tests: Idempotency-Key on manual batch / write-off / recall / un-recall; recall flag UI flip + reason banner; F12 PATCH allowlist (other fields disabled in UI); metadata_correction row in audit; CSV export anchor URL builder

## Dependencies

- ILE-5 (procurement feature)
- BE phase 8 (inventory endpoints live) — **in_progress** per BE status (ILEX-006 in progress). May block on BE side.
