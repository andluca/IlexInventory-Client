# Issue Status

| Issue | Status | Updated | Notes |
|-------|--------|---------|-------|
| ILE-6 | completed | 2026-05-08T21:00:00Z | Steps 1–6 + 9 shipped green. Step 7 deferred to ILE-9 (per plan). Step 8 (RecallReportPage) gated — /batches/{id}/recall-report absent from schema; follow-up required once BE phase 8 ships the endpoint. |
| ILE-7 | completed | 2026-05-08T22:15:00Z | All 8 steps shipped. 295 tests green (45 files), typecheck clean, lint + all grep gates passed. Routes: /sales-orders/, /sales-orders/new, /sales-orders/$id, /sales-orders/$id/edit. Data layer: salesKeys, useSosList (cursor), useSo, usePreviewSo, useCreateSo, useUpdateSo, useDeleteSo, useCommitSo (Idempotency-Key + 409/422 handling), useVoidSo (Idempotency-Key + 409). Features: SosListPage, SoDraftPage (2-col A5 + Collapse override), SoDetailPage (committed/voided view), SoLineEditor, FefoPreview (ExpiryBadge <14d, FEFO sort), ShortfallBanner (inline, not toast), CommitConfirmModal (no optimistic, 422→onShortfall, 409→onStaleState), VoidConfirmModal, AllocationsTable. Sidebar /sales-orders link enabled. |
