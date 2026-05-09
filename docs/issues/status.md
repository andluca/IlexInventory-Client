# Issue Status

| Issue | Status | Updated | Notes |
|-------|--------|---------|-------|
| ILE-6 | completed | 2026-05-08T21:00:00Z | Steps 1–6 + 9 shipped green. Step 7 deferred to ILE-9 (per plan). Step 8 (RecallReportPage) gated — /batches/{id}/recall-report absent from schema; follow-up required once BE phase 8 ships the endpoint. |
| ILE-7 | completed | 2026-05-09T00:42:00Z | Re-shipped after BE schema drift. 294/294 tests green, typecheck + all 6 grep gates clean, generate:api --check matches live BE. Routes split: /$id is layout (Outlet) + /$id/index (SoDetailPage) — fixes render-loop on draft→edit redirect. Data layer matches current BE shape: SalesOrderResponse.allocations is top-level (was per-line), AllocationResponse fields are id/sales_order_line_id/batch_id/allocated_quantity/unit_cost/created_at, path param is {so_id} (was {sales_order_id}). FefoPreview groups flat preview.allocations by line_id client-side; totals card removed (BE no longer ships totals). Voided badge derived from voided_at first (BE keeps status='committed' on voided). |
