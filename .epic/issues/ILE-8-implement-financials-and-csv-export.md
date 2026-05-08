---
id: ILE-8
github_id: null
status: open
assignee: null
state: Queued
type: item
depends_on: [ILE-7]
---

# ILE-8 Implement Financials dashboard + per-product margin + CSV exports

## Overview

Land the Dashboard page (`/`) per SPEC §3.2 + §3.7, composing R2 (Expiring soon widget — batches with `expiration_date` within configurable N days; "View all" link → `/stock?expiring_within=N` wired in ILE-6; row click-through to batch detail) and R3 (Financial summary — revenue, COGS, profit, "Profit Margin" labeled per BE-D13 with formula `(revenue − COGS) / COGS × 100%`). Date-range picker (default last 30 days) shared between summary and per-product margin subview (offset pagination per `/financials/margin`). Quick actions surfacing "New PO", "New SO", "Import products" (mirrored in ⌘K's Create category in ILE-9). Wire CSV export anchors via `src/utils/csv-export.ts` for `/financials/dashboard`, `/financials/margin`, `/movements`, `/batches/:id/recall-report` (browser navigation with session cookie attached automatically — the documented exception to no-bare-fetch). Verify the brief's worked example renders correctly: $1,000 rev + $100 COGS → $900 profit + 900%.

## Surface

- [ ] `src/routes/index.tsx` (Dashboard)
- [ ] `src/features/dashboard/DashboardPage.tsx`, `ExpiringSoonWidget.tsx`, `FinancialSummary.tsx`, `MarginByProductTable.tsx`, `DateRangePicker.tsx`, `QuickActions.tsx`
- [ ] `src/components/CsvExportButton.tsx` (consumes `src/utils/csv-export.ts`; reused by ILE-6 recall report and ILE-7 SO list views)
- [ ] `src/data/financials/queries.ts`, `keys.ts`
- [ ] Tests: brief's worked example ($900 / 900%), date-range scoping summary + margin table together, CSV export anchor URLs (4 endpoints), expiring widget link target

## Dependencies

- ILE-7 (sales feature)
- BE phase 10 (financials endpoints live) — pending per BE status.
