# Spec: Ilex Inventory Client

## Summary

Frontend for Ilex — an inventory management system built natively for F&B CPG brands. React 18 + TypeScript (strict) + Vite, Mantine for components, Tailwind for one-offs, TanStack Query for server state, TanStack Router for type-safe routing. Pairs with [`../../IlexInventory-Server`](../../IlexInventory-Server). Four-layer architecture (Routes → Features → Data → Generated API client) with strict top-to-bottom data flow and no hand-written API types — the typed surface in `src/api/generated/` is regenerated from the server's OpenAPI 3.1 schema via `openapi-typescript`. Single owner per account; the FE renders both buyer/ops and warehouse-coordinator hats inside one shell. **Floor mode** is a UI ergonomics toggle (high contrast, larger touch targets) — purely client-side, no API awareness. App shell mounts a ⌘K command palette (Mantine Spotlight), a floor-mode toggle, and a reserved right-rail slot for the "Ask Ilex" agent panel (Phase 3 fills it; v1 ships an empty placeholder) on every authenticated page. 14 authenticated pages + 2 public pages, plus cross-cutting modals (CSV import, agent chat). Money and quantity are **strings end-to-end** (matching server's `numeric(14, 4)`); arithmetic uses `Decimal.js`; quantity stored in base units (g, ml, unit) and converted to display units (kg, L) at the formatter boundary.

Stack: React 18, TypeScript (strict), Vite, Mantine, Tailwind, TanStack Query v5, TanStack Router, `openapi-typescript`, `Decimal.js`, Vitest + Testing Library, Playwright (smoke).

---

## 1. Objective and Context

### 1.1 Objective

Ship a v1 client that satisfies the take-home brief in [`../takehome-challenge.md`](../takehome-challenge.md) plus the F&B-native UX patterns locked in [`../product.md`](../product.md): batch-aware stock views, FEFO preview on SO commit, recall toggle + recall report, append-only movement audit per batch, and an agent panel ready for the Phase 3 narrative pitch. The FE is a thin, typed surface over the BE's 36 v1 endpoints; the BE owns the data model, validation, and business logic.

### 1.2 Context

Take-home challenge brief from Kaizntree (one-week timeline). Single-tenant per user — no team or org concept. Two real personas (buyer/ops manager, warehouse coordinator) collapse into one auth identity rendered through one shell with mode toggles. The agent ("Ask Ilex") is a panel inside the shell — not a separate user.

FE decisions D0–D7 are locked in [`../decisions.md`](../decisions.md). Server decisions BE-D0–BE-D13 are referenced (not duplicated) from [`../../IlexInventory-Server/docs/decisions.md`](../../IlexInventory-Server/docs/decisions.md). Layered architecture is in [`../architecture.md`](../architecture.md). Page catalog and UX patterns are in [`../product.md`](../product.md). Endpoint catalog (consumed verbatim) is in [`../endpoints.md`](../endpoints.md).

Flow IDs (F1–F12), read view IDs (R1–R7), agent flows (A1–A3), and auth flows (X1–X2) live in [`../../IlexInventory-Server/docs/scratch-requirements.md`](../../IlexInventory-Server/docs/scratch-requirements.md) until they graduate to formal flow specs.

### 1.3 Out of v1 scope

- Native mobile apps (responsive web only; floor mode covers tablet)
- Barcode scanning / camera integration
- Push notifications, email alerts (the dashboard widget IS the channel)
- i18n / l10n (English; USD; UTC + browser-local display)
- Theme switcher (charcoal only)
- Invoice OCR (CSV import only)
- Email verification, password reset (matches BE v1 scope)
- Multi-warehouse, multi-currency (matches BE v1 scope)
- Service worker / offline mode

---

## 2. Foundation

### 2.1 Framework and Runtime

- React 18 + TypeScript with `strict: true` (no `any` outside generated client; CI grep gate enforces)
- Vite for dev server and production build
- TanStack Router for file-based, type-safe routes (D-pending; default in [`../decisions.md`](../decisions.md))
- TanStack Query v5 for all server state — cache, retries, invalidation
- Mantine v7 for components (Form, Table, Modal, Spotlight ⌘K, DatePicker for expiration dates)
- Tailwind for one-off styling — never used inside Mantine theme overrides; raw CSS lives in `src/theme/` only
- Vitest + Testing Library for unit/component tests
- Playwright for E2E smoke (login → SO commit → recall) — depth depends on time

### 2.2 Architecture (four layers)

```
Routes (src/routes/*.tsx)             ← URL → page shell; optional TanStack Query loader
   ↓
Features (src/features/{domain}/)     ← page composition + domain UI
   ↓
Data (src/data/{domain}/)             ← TanStack Query hooks + cache keys
   ↓
API client (src/api/generated/)       ← regenerated from server OpenAPI; never hand-edited
```

Critical rule: data flows top to bottom only. Full responsibilities, import rules, file locations, and naming conventions in [`../architecture.md`](../architecture.md).

CI gates:
- All tests pass
- `tsc --noEmit` passes (strict)
- Generated client up to date with server's OpenAPI (no diff after regen)
- No bare `fetch` / `axios` outside `src/data/` (grep gate)
- No `as any` outside `src/api/generated/` (grep gate)
- No `import { ... } from '../api/generated'` from `src/features/` or `src/routes/` (grep gate — features call data hooks, never the generated client directly)

### 2.3 Auth and Authorization

- DRF `SessionAuthentication` + cookie session (BE-D? matches FE D6)
- `fetch` is configured with `credentials: 'include'` so the session cookie travels with every request
- CSRF token retrieved via the `csrftoken` cookie and echoed in the `X-CSRFToken` header on state-changing requests (POST/PATCH/DELETE)
- `App` component checks `/auth/me` on mount; redirects to `/login` on 401
- Logged-in routes are guarded by a `RequireAuth` wrapper that suspends on the `/auth/me` query and redirects on 401
- Cross-owner access returns 404 from the server — UI surfaces "Not found" without distinguishing from never-existed (BE-D4)

### 2.4 Money and Quantity Precision

- DB and wire format: strings (e.g., `"100.0000"`) matching BE's `numeric(14, 4)`
- Arithmetic: `Decimal.js` only — no JS `number` math on money or quantity
- Display: formatter utils in `src/utils/`
  - `money.ts`: parses `numeric(14, 4)` strings; formats with locale + currency; `formatMoney("1000.0000")` → `"$1,000.00"`
  - `qty.ts`: base-unit aware; converts g→kg, ml→L on display when threshold reached; preserves `unit` as-is
- Quantity inputs: the user types in display units (kg, L); the form converts to base units (g, ml) before submission. The server never sees `kg`.
- Profit margin formula (BE-D13): `(revenue − COGS) / COGS × 100%`. Labeled "Profit Margin" in the UI to match the brief's worded example.
- **Input components**: Mantine's `NumberInput` returns `number` and is therefore banned for money/qty fields. A shared `<DecimalInput>` wrapper (`src/components/DecimalInput.tsx`) renders a `TextInput` with regex validation and exposes a string `value` / `onChange(string)`. CI grep gate fails on `NumberInput` imports inside `src/features/` outside an allowlist of integer-only contexts (e.g., page size, `expiring_within` days).

### 2.5 API Contract Consumption

- Base URL: `/api/v1/` (configurable via `VITE_API_BASE_URL`)
- All JSON HTTP goes through generated client functions; bare `fetch` / `axios` outside `src/data/` is a CI failure. The CSV-export path is the documented exception (see below).
- TanStack Query keys: centralized per domain in `src/data/{domain}/keys.ts`. Mutations invalidate the relevant lists/details.
- **Mutation strategy**: terminal mutations (PO receive, SO commit, SO void, recall, un-recall, write-off, manual batch, products import) **never** use optimistic updates — the server performs atomic multi-row writes (batch creation, FEFO walk, allocations, ledger movements) that the client cannot honestly mirror. These mutations invalidate the affected lists/details on success and surface server state via refetch. Optimistic updates are allowed only on trivial PATCHes that touch a single row's display fields (e.g., product name/description, batch metadata correction) — and even there, only when there are no derived projections to keep coherent.
- **Stale-state handling (concurrent tabs)**: terminal endpoints return 409 if the resource has already moved past `draft`/un-recalled (BE-D6, BE-D8). The data layer maps 409 on terminal mutations to: refetch the affected detail + toast `"This {resource} has already been {received|committed|voided|...} elsewhere."` Features that hide PATCH/DELETE affordances post-terminal must still tolerate the race where the user clicked before the latest fetch returned.
- Pagination: list hooks expose `useInfiniteQuery` for cursor-paginated endpoints (`/sales-orders`, `/movements`) and `useQuery` with explicit `page`/`limit` params for offset-paginated endpoints (`/products`, `/purchase-orders`, `/batches`, `/batches/{id}/recall-report`, `/financials/margin`).
- **Idempotency-Key**: the data layer mints a UUIDv7 per mutation attempt and attaches it via the `Idempotency-Key` header on the seven BE-required endpoints (`POST /products/import`, `POST /purchase-orders/{id}/receive`, `POST /batches`, `POST /batches/{id}/recall`, `POST /batches/{id}/un-recall`, `POST /sales-orders/{id}/commit`, `POST /sales-orders/{id}/void`) plus `POST /batches/{id}/movements` when `kind=write_off` (partial — adjustment movements skip the header per BE-D7). On retry (TanStack Query's `retry` or user-driven), the same key is reused so the BE returns the cached response.
- **CSV export (untyped path)**: `?format=csv` on supporting endpoints (`/financials/dashboard`, `/financials/margin`, `/movements`, `/batches/{id}/recall-report`) returns `text/csv`, not JSON. `openapi-typescript` types these as JSON and is wrong for that content type. The FE handles export via a top-level anchor (`<a href="${VITE_API_BASE_URL}/.../?format=csv${qs}" download>`) — the browser navigates with the session cookie attached. The CI grep gate for "no bare fetch outside data layer" exempts `src/utils/csv-export.ts`, which is the only allowed builder for these URLs.
- 4xx error envelope is `{ error: ErrorCode, detail?: string, fields?: Record<string, string> }`. The data layer normalizes errors; features render field-level messages on forms and toast `detail` on non-form errors.

### 2.6 Type Generation

`openapi-typescript` runs against the server's `/openapi.json` (or a checked-in snapshot) and writes `src/api/generated/`. The script is `npm run generate:api`. Generated files are committed; CI fails if regeneration produces a diff. A thin client wrapper in `src/api/client.ts` adds the credentials/CSRF/Idempotency-Key header plumbing on top of the generated functions and normalizes the 4xx error envelope. CSV responses are *not* covered by the generated client (see §2.5 — they go through `src/utils/csv-export.ts` as anchor-driven downloads).

### 2.7 Routing Layout

```
/                                    Dashboard (R2 expiring + R3 financial summary)
/login                               Public — X1
/signup                              Public — X2
/products                            R1 by product
/products/:id                        R1 + R6 audit (filtered)
/purchase-orders                     R5
/purchase-orders/new                 F3 draft
/purchase-orders/:id/edit            F3 draft edit
/purchase-orders/:id                 F3 detail (post-receive: read-only)
/sales-orders                        R4
/sales-orders/new                    F7 draft + FEFO preview
/sales-orders/:id/edit               F7 draft edit
/sales-orders/:id                    F7 detail (post-commit) + F8 void
/stock                               R1 alternative view (by batch)
/batches/:id                         R6 audit, F4/F5/F6/F9/F10/F12 actions
/batches/:id/recall-report           R7
/settings                            Account + agent OAuth status
```

The full mapping with realized flow IDs is in [`../product.md`](../product.md).

### 2.8 App Shell

Wraps every authenticated page. Composed of:
- **Sidebar nav** — links to top-level pages
- **Topbar** — current user, floor-mode toggle, ⌘K trigger
- **⌘K command palette** — Mantine Spotlight; nav + primary actions (new PO, new SO, recall batch). Wired in shape from Phase 3; per-category content fills out across phases (final pass in Phase 10).
- **Right-rail agent slot** — empty placeholder in v1; Phase 3 (§2.9) fills it with the panel. The slot reserves layout so adding the panel later is a content swap, not a layout migration.

Floor mode (D4) sets a class on `<html>`; theme tokens switch via Mantine theme variants and Tailwind `floor:` variants. Persists in `localStorage`. No API awareness.

### 2.9 Agent (Phase 3 — out of v1 FE MVP)

The right-rail slot (§2.8) is empty in v1. Phase 3 fills it with:

- Collapsible, contextual right-side panel
- On every message, the FE attaches `{ route, filters, selected_ids }` from the current page state. **`selected_ids` ships as `[]` until v1 introduces a multi-select pattern** — no list/table currently exposes selection. The shape is reserved so the agent contract is stable from day one; populating it is a separate feature.
- Three response modes mirror the BE (BE-§3.8): A1 Query (renders read-only result), A2 Draft (renders a draft object with "Confirm" / "Discard" — the user always confirms before any write), A3 Explain (renders prose + linked supporting data)
- Auth: the user's Claude Max OAuth token (D7); the BE proxies the request and injects context

### 2.10 Config

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Server origin + `/api/v1/` | `http://localhost:8000/api/v1` |
| `VITE_OPENAPI_URL` | Source for type generation | `http://localhost:8000/openapi.json` |
| `VITE_SENTRY_DSN` | Optional Sentry DSN | (unset in dev) |

Fail-fast: the app refuses to start if `VITE_API_BASE_URL` is missing.

---

## 3. Features

Specs for individual pages, components, and hooks land under `docs/specs/` as they are written. Format definitions are in [`../specification.md`](../specification.md) — Page spec is the bridge between Functional and Technical.

**This section enumerates the surface only.** It catalogs pages, paths, realized flow IDs, consumed endpoints, and the **layout archetype** each page uses (A1–A6 from [`../design/archetypes.md`](../design/archetypes.md)). The per-page **States** section (empty / loading / error / populated / confirmation), **Examples** (Visit / Click / See / Submit), and **Modes** belong in Page specs, not here. A reader who expects symmetry with [`../specification.md`](../specification.md) should treat the rows below as the index that those specs will be written against.

**Design references.** All visual decisions are locked in [`../design/`](../design/): tokens in [`tokens.md`](../design/tokens.md), layout archetypes in [`archetypes.md`](../design/archetypes.md), shared component contracts in [`components.md`](../design/components.md), landing copy + voice in [`copy.md`](../design/copy.md). Per-page specs cite archetypes + components by name; the executor renders against those contracts instead of inventing layout.

### 3.1 Auth pages

| Page | Path | Realizes | Endpoints |
|---|---|---|---|
| Login | `/login` | X1 | `POST /auth/login`, `GET /auth/me` |
| Sign up | `/signup` | X2 | `POST /auth/signup`, `GET /auth/me` |
| Logout | (action, all pages) | X1 | `POST /auth/logout` |

**Archetype:** custom narrow centered card on charcoal — not one of A1–A6 since the auth pages are pre-shell. Use logo from landing (A1), `<DecimalInput>`-style input styling, `<ConfirmModal>`-style button hierarchy. See [`../design/archetypes.md`](../design/archetypes.md).

Simplest possible: email + password, no email verification, no password reset (matches BE v1). On success, set session cookie and redirect to `/`. Errors render inline (400 missing fields, 401 bad credentials, 409 duplicate email).

**Onboard (F1).** First-time owner lands on `/` with empty dashboards. The agent-prompt empty state ("Want me to import from CSV?", per the UX patterns in [`../product.md`](../product.md)) and ⌘K's Create category are the entry points to the onboarding terminal state — owner has 1 product + 1 batch. No dedicated guided wizard in v1; onboarding is the natural composition of F2 (add product) + F4 (manual batch) or F2 + F3 (receive PO). Settings page exposes the same affordances for empty-account recovery.

### 3.2 Dashboard

| Page | Path | Realizes | Endpoints |
|---|---|---|---|
| Dashboard | `/` | R2, R3, F11 | `GET /financials/dashboard`, `GET /batches?expiring_within=N` |

**Archetype:** A2 — Dashboard (composed widgets). Components: `<QuickActions>`, `<KpiTile>`, `<DataTable>`, `<ExpiryBadge>`, `<DateRangePicker>`, `<EmptyState>`. See [`../design/archetypes.md#a2`](../design/archetypes.md).

Composed of:
- **Expiring soon widget** (R2) — batches with `expiration_date` within configurable N days; "View all" link → `/stock?expiring_within=N` (the dedicated R2 view); row click-through to batch detail
- **Financial summary** (R3) — revenue, COGS, profit, margin totals + top-product breakdown over the selected date range (default last 30 days)
- **Quick actions** — "New PO", "New SO", "Import products" (also surfaced via ⌘K)
- **Export** (F11) — `?format=csv` on the dashboard endpoint

### 3.3 Catalog (products)

| Page | Path | Realizes | Endpoints |
|---|---|---|---|
| Products list | `/products` | R1 | `GET /products`, `POST /products`, `POST /products/import` |
| Product detail | `/products/:id` | R1, R6 | `GET /products/:id`, `PATCH /products/:id`, `POST /products/:id/archive`, `DELETE /products/:id`, `GET /movements?product_id=:id` |

**Archetypes:** Products list → A3 (List with filters); Product detail → A4 (Detail with action bar). Components: `<DataTable>`, `<DetailHeader>`, `<ActionBar>`, `<ConfirmModal>`, `<EmptyState>`, `<StatusBadge>`. See [`../design/archetypes.md`](../design/archetypes.md).

Products list:
- Dense sortable Mantine table; SKUs in JetBrains Mono
- Search by name or SKU; filter `archived={true,false}`
- Inline "New product" form (modal): name, SKU, description, base_unit ∈ `g`/`ml`/`unit`
- "Import CSV" modal (cross-cutting) — `POST /products/import` with `Idempotency-Key`; per-row errors render in a dismissible panel
- On-hand totals derived from server response

Product detail:
- Header: name, SKU (locked once first batch exists; PATCH on `sku` is a UI-disabled state), description (editable), archived state
- Batches summary table → links to `/batches/:id`
- Movement audit (R6) filtered by `product_id`
- Archive vs. delete: archive shown only when batches exist; hard delete shown only when no batches exist (matches BE 409 contract)

### 3.4 Procurement (purchase orders)

| Page | Path | Realizes | Endpoints |
|---|---|---|---|
| POs list | `/purchase-orders` | R5 | `GET /purchase-orders` |
| PO new | `/purchase-orders/new` | F3 (draft) | `POST /purchase-orders` |
| PO edit | `/purchase-orders/:id/edit` | F3 (draft) | `GET /purchase-orders/:id`, `PATCH /purchase-orders/:id`, `DELETE /purchase-orders/:id` |
| PO detail | `/purchase-orders/:id` | R5, F3 (post-receive) | `GET /purchase-orders/:id`, `POST /purchase-orders/:id/receive` |

**Archetypes:** POs list → A3 (with status chip filter, **only `draft / received`** per BE-D6 — drop `sent`/`partial`/`cancelled` from the v0 prototype); PO new/edit → custom draft-form layout with line editor (no FEFO preview, so not A5); PO detail → A4 with `<DataTable>` for the receipt-created batches. Components: `<DataTable>` (with collapsible rows for line items), `<DetailHeader>`, `<ActionBar>`, `<ConfirmModal>` (PO receive), `<DecimalInput>`. See [`../design/archetypes.md`](../design/archetypes.md). Drop the prototype's PO actions `Duplicate / Export PDF / Cancel PO` — not in v1 scope.

POs list:
- Filter by status (`draft` / `received`), supplier search, date range
- "New PO" link

PO draft (new/edit):
- Supplier name + optional contact
- Line editor: product picker, quantity, unit_cost
- "Save draft" → `POST` or `PATCH`
- "Receive" → opens the receive modal

Receive modal (F3 terminal):
- For each line, owner enters `batch_code` (supplier-stamped lot) and optional `expiration_date`
- Confirms in an action-confirmation modal (UX pattern in [`../product.md`](../product.md))
- Submit → `POST /purchase-orders/:id/receive` with `Idempotency-Key`
- Post-receive: redirect to PO detail; the page renders read-only with the batches that were created

PO detail (post-receive):
- All fields read-only
- Batches table with links to `/batches/:id`
- 409 on PATCH/DELETE — UI never offers these affordances post-receive
- Concurrent-tab race: if a stale tab still shows draft affordances and the user clicks PATCH/DELETE/Receive after another tab already received, the data layer maps the 409 to a refetch + toast `"This PO has already been received elsewhere."` (per §2.5 stale-state handling)

### 3.5 Inventory (batches, movements, recall)

| Page | Path | Realizes | Endpoints |
|---|---|---|---|
| Stock by batch | `/stock` | R1 (alt view) | `GET /batches` |
| Batch detail | `/batches/:id` | R6, F4, F5, F6, F9, F10, F12 | `GET /batches/:id`, `PATCH /batches/:id`, `POST /batches`, `POST /batches/:id/movements`, `POST /batches/:id/recall`, `POST /batches/:id/un-recall`, `GET /movements?batch_id=:id` |
| Recall report | `/batches/:id/recall-report` | R7, F11 | `GET /batches/:id/recall-report` (CSV via `?format=csv`) |

**Archetypes:** Stock by batch → A3 (List with filters); Batch detail → A4 (Detail with action bar — **the recalled-state banner variant lands here**, not in the prototype); Recall report → A3. Components: `<DetailHeader>` (with `<StatusBadge>` for recall state — not a free-flipping switch, see [`../design/archetypes.md#a4`](../design/archetypes.md)), `<ActionBar>` (Adjust / Write off / Recall / Edit metadata, with destructive intent on write-off + recall), `<ConfirmModal>` with the consequence library copy from [`../design/components.md`](../design/components.md), `<DataTable>` (movement audit, kind-colored), `<ExpiryBadge>`, `<EmptyState>`.

Stock by batch:
- Filter by product, recall status, `expiring_within=N` days
- `expiring_within=N` filter doubles as the R2 dedicated view (linked from the dashboard widget)
- On-hand derived from server
- Click row → batch detail

Batch detail:
- Header: product, batch_code (editable, F12), expiration_date (editable, F12), unit_cost (read-only), on-hand, recall flag + reason
- Action buttons (with confirmation modals): "Adjust" (F5, kind=`adjustment`, signed quantity, reason in notes — required), "Write off" (F6, kind=`write_off`, idempotent), "Recall" (F9, requires reason), "Un-recall" (F10)
- Manual batch creation (F4) is initiated from the **batch detail page** (the existing batch is the UI starting context, not the target — F4 always creates a *new* batch per BE-D2). The same affordance is mirrored in ⌘K's Create category and from the empty-state on `/stock`.
- Movement audit (R6) filtered by `batch_id`; metadata corrections (F12) appear as `metadata_correction` rows with qty=0

Recall report:
- Customers who received units from this batch via committed, non-voided SOs
- Sortable table; CSV export (F11)
- Voided SOs are absent (BE-D8)

**Movement audit (R6) surfacing.** `/movements` has no top-level page in v1 — there is no "everything that happened on Tuesday" view. The audit is exposed only **filtered**: by `batch_id` on batch detail, and by `product_id` on product detail. Both filtered subviews offer a date-range picker (`from` / `to`) and a `kind` filter (mapping the BE's `kind` enum) for period-level slicing. A standalone `/audit` page is deliberately deferred — the page list in [`../product.md`](../product.md) reflects this.

### 3.6 Sales (sales orders)

| Page | Path | Realizes | Endpoints |
|---|---|---|---|
| SOs list | `/sales-orders` | R4 | `GET /sales-orders` |
| SO new | `/sales-orders/new` | F7 (draft) | `POST /sales-orders` |
| SO edit | `/sales-orders/:id/edit` | F7 (draft) | `GET /sales-orders/:id`, `PATCH /sales-orders/:id`, `DELETE /sales-orders/:id`, `POST /sales-orders/:id/preview` |
| SO detail | `/sales-orders/:id` | R4, F7 (post-commit), F8 | `GET /sales-orders/:id`, `POST /sales-orders/:id/commit`, `POST /sales-orders/:id/void` |

**Archetypes:** SOs list → A3 (cursor pagination); SO new/edit → **A5 (Draft with side preview) — the differentiator screen, not in the v0 handoff, build deliberately**; SO detail → A4. Components: `<FefoPreview>` (the centerpiece — see [`../design/components.md#fefopreview`](../design/components.md)), `<DataTable>`, `<DetailHeader>`, `<ActionBar>`, `<ConfirmModal>` (commit + void with consequence-library copy), `<DecimalInput>`, `<StatusBadge>` (committed / voided), `<ExpiryBadge>` (in FEFO preview), `<EmptyState>`. See [`../design/archetypes.md#a5`](../design/archetypes.md).

SOs list:
- Cursor pagination (`useInfiniteQuery`)
- Filter by status, voided, customer search, date range

SO draft (new/edit):
- Customer name + optional contact
- Line editor: product picker, quantity, sell_price
- **FEFO preview** — calls `POST /sales-orders/:id/preview` and renders the proposed allocations (which batches, in which order, by expiration_date) so the owner can see what FEFO will do *before* committing. Preview is non-mutating.
- "Commit" → action-confirmation modal → `POST /sales-orders/:id/commit` with `Idempotency-Key`
- 422 shortfall: render `{ shortfall: { product_id, required, available } }` inline
- Admin override (BE-D11): an "Edit allocations" affordance lets the owner provide an explicit allocation list to commit. Hidden behind a disclosure to keep the default flow clean.

SO detail (post-commit):
- All fields read-only
- Allocations table with batch + quantity + unit_cost (committed at commit time)
- "Void" action (F8) — confirmation modal → `POST /sales-orders/:id/void` with `Idempotency-Key` (idempotent by design per BE-D8, but the header is sent for client uniformity)
- Voided state shows `voided_at` banner and disables further actions
- Concurrent-tab race: stale draft affordances on commit, or stale "Void" affordance on an already-voided SO, return 409. Mapped to refetch + toast per §2.5.

### 3.7 Financials

| Page | Path | Realizes | Endpoints |
|---|---|---|---|
| Dashboard (financial summary section) | `/` | R3, F11 | `GET /financials/dashboard` |
| Per-product margin | (subview of dashboard) | R3, F11 | `GET /financials/margin` |

**Archetype:** A2 (composed widgets) for the dashboard summary; A3 (List with filters) for the per-product margin subview. Components: `<KpiTile>` (with **direction-aware trend color** — fix the prototype's always-tereré pill), `<DataTable>`, `<DateRangePicker>`. **Critical fix vs prototype:** the margin tile must show **`900%`** for the brief example ($1,000 revenue + $100 COGS), not 90% — see [`../design/archetypes.md#a2`](../design/archetypes.md) and BE-D13.

Per-product margin is rendered as a paginated table (`useQuery` with explicit `page`/`limit` — `/financials/margin` is offset-paginated per [`../endpoints.md`](../endpoints.md)). Date-range params (`from`, `to`) are shared with the dashboard summary. CSV export via `?format=csv`. Margin column labeled "Profit Margin" (BE-D13).

### 3.8 Settings

| Page | Path | Endpoints |
|---|---|---|
| Settings | `/settings` | `GET /auth/me`, `POST /auth/logout`, agent OAuth status (Phase 3) |

**Archetype:** simple stacked sections in `<Card>`s. Components: `<DetailHeader>` (no action bar), Mantine `<Card>`, `<Button color="clay">` for logout. No archetype reference needed — this is the only page light enough to skip A1–A6.

Account info (email, created_at), logout, agent OAuth status (Phase 3 — read-only stub in v1).

### 3.9 Cross-cutting

#### CSV import modal

Triggered from the Products list ("Import CSV" button) and ⌘K. Multipart upload, `Idempotency-Key` attached. Renders per-row errors from the server response. Manual stock and PO CSV import is deferred (BE scope).

#### Agent chat panel (Phase 3)

Fills the right-rail slot reserved by the app shell (§2.8). v1 ships the slot empty. When phase 13 lands the panel, it sends `{ message, context: { route, filters, selected_ids: [] } }` (selection ships empty until a multi-select pattern lands; see §2.9) and renders three response modes (A1 Query, A2 Draft, A3 Explain). Drafts (A2) show a "Confirm" / "Discard" UI — the user always confirms before any write.

#### ⌘K command palette

Mantine Spotlight. Categories:
- **Navigate** — every page in §2.7
- **Create** — new PO, new SO, new product, manual batch
- **Act** — recall this batch (when on batch detail), commit this SO (when on SO draft), void this SO (when on SO detail post-commit)
- **Agent** — open panel + prefill query

#### Floor mode toggle

Topbar switch. Sets `<html class="floor">`; Mantine theme variant + Tailwind `floor:` variants increase row heights, font sizes, and contrast. Persists in `localStorage`.

#### Action confirmation modals

Required for all mutating terminal operations (matches UX pattern in [`../product.md`](../product.md)): PO receive, SO commit, SO void, batch recall, batch un-recall, batch write-off, product archive, product hard delete.

---

## 4. Validation Gates

Every phase is considered complete when:

```bash
npm test                                                    # vitest passes
npm run typecheck                                           # tsc --noEmit
npm run lint                                                # eslint
npm run generate:api -- --check                             # generated client matches server openapi.json
grep -RE "(fetch|axios)\(" src/features/ src/routes/        # 0 — bare HTTP outside data layer
grep -RE "(fetch|axios)\(" src/ --include='*.ts' --include='*.tsx' \
  | grep -vE "src/data/|src/api/|src/utils/csv-export\.ts"  # 0 — only data/api/csv-export may issue HTTP
grep -RE "as any" src/ --include='*.ts' --include='*.tsx' \
  | grep -v "src/api/generated"                             # 0 — no any outside generated client
grep -RE "from ['\"].*api/generated" src/features/ src/routes/  # 0 — features call data hooks, not generated client
grep -RE "\bNumberInput\b" src/features/                    # 0 outside the integer-only allowlist (page size, expiring_within)
```

Phase-specific:

| Phase | Validation |
|---|---|
| Project setup | `npm run dev` boots; `/login` renders; healthcheck against running BE returns 200; OpenAPI regeneration produces a valid client |
| Auth | Sign-up creates account + sets session cookie; login/logout work; `/auth/me` resolves on app load; 401 redirects to `/login`; CSRF token attached on POST/PATCH/DELETE |
| Catalog | Product CRUD works through hooks; SKU input disabled after first batch (UI matches BE 409); archive vs delete affordances respect the rules; CSV import surfaces per-row errors |
| Procurement | PO draft CRUD works; receive modal collects batch_code + expiration_date per line; submission attaches Idempotency-Key; post-receive page is read-only (no PATCH/DELETE affordances); 409 on stale-tab PATCH/DELETE/Receive triggers refetch + toast |
| Inventory (batches) | Manual batch flow creates batch + initial movement; batch detail PATCH limited to `batch_code` and `expiration_date`; movement audit shows `metadata_correction` rows |
| Inventory (movements) | Adjustment requires non-empty notes (form validation matches BE D7); write-off attaches Idempotency-Key; recall with reason flips UI flag and reason banner; un-recall reverses |
| Sales (draft) | SO draft CRUD works; FEFO preview renders proposed allocations from server response; admin-override allocation editor hidden behind disclosure |
| Sales (commit) | Commit attaches Idempotency-Key; 422 shortfall renders `{ required, available }` inline; redirect to detail on success; no optimistic update — UI waits for server response before showing committed state |
| Sales (void) | Void modal confirms; voided state banner shows `voided_at`; further actions disabled; 409 on stale-tab void triggers refetch + toast |
| Financials | Dashboard renders revenue/COGS/profit/margin matching the brief example: $1,000 revenue + $100 COGS → $900 profit + 900% margin (BE-D13); date-range picker scopes both summary and per-product margin |
| Reports / CSV | CSV export downloads stream from `/financials/dashboard`, `/financials/margin`, `/movements`, `/batches/:id/recall-report` via `src/utils/csv-export.ts` (anchor download, not the typed client); session cookie attached automatically |
| Money / qty precision | No `NumberInput` in money/qty paths (grep gate); `<DecimalInput>` round-trips strings through forms; `formatMoney("1000.0000")` → `"$1,000.00"`; quantity converts kg/L → g/ml on submit |
| ⌘K | Spotlight opens on ⌘K (and Ctrl+K); Navigate / Create / Act / Agent categories show context-appropriate items |
| Floor mode | Toggle persists in localStorage; row heights and contrast change; charcoal palette preserved |
| Owner isolation | Cross-owner navigation (paste another user's URL) renders "Not found" without leaking existence |
| OpenAPI | Generated client regenerates without manual edits; CI fails on drift; type errors surface at build, not runtime |
| Agent (Phase 3) | Panel opens; sends `{ route, filters, selected_ids }` context; A2 Draft renders Confirm/Discard before any write |
| Deploy | Production build (`npm run build`) succeeds; static assets serve from CDN/object store; `VITE_API_BASE_URL` configurable per environment |

---

## 5. Implementation Phases

| # | Phase | Description | Status | Depends on |
|---|---|---|---|---|
| 1 | Project setup | Vite + React 18 + TS strict, Mantine + Tailwind config, TanStack Router + Query, ESLint + Prettier, Vitest, env template, `<DecimalInput>` shared component | pending | — (independent of BE) |
| 2 | API client + types | `openapi-typescript` against BE schema; `src/api/client.ts` with credentials/CSRF/Idempotency-Key plumbing; 4xx error normalization; `src/utils/csv-export.ts` URL builder; `npm run generate:api` script | pending | 1, BE OpenAPI available (BE phase 13 emits the schema; can also work against an interim hand-published snapshot) |
| 3 | App shell + auth | Login, sign-up, logout, `/auth/me` guard, session cookie + CSRF, sidebar/topbar, ⌘K shell (categories filled in phase 10), floor-mode toggle, **right-rail agent slot as empty placeholder** | pending | 2, BE phase 5 |
| 4 | Catalog | Products list + detail, new product, edit, archive, hard delete; CSV import modal | pending | 3, BE phase 6 |
| 5 | Procurement | PO list, draft CRUD, receive modal with batch_code/expiration entry | pending | 4, BE phase 7 |
| 6 | Inventory | Stock by batch, batch detail, manual batch, adjust, write-off, recall, un-recall, recall report, movement audit | pending | 5, BE phase 8 |
| 7 | Sales (draft) | SO list, draft CRUD, FEFO preview rendering | pending | 6, BE phase 9 |
| 8 | Sales (commit + void) | Commit with Idempotency-Key, shortfall handling, post-commit detail, void | pending | 7 |
| 9 | Financials | Dashboard widgets (R2 expiring + R3 summary), per-product margin table, date range, CSV export | pending | 8, BE phase 10 |
| 10 | ⌘K palette | Spotlight wiring with Navigate / Create / Act / Agent categories | pending | 9 |
| 11 | Polish | Empty states, error boundaries, loading skeletons, floor-mode QA, accessibility pass | pending | 10 |
| 12 | E2E smoke | Playwright: login → SO commit → recall path | pending | 11 |
| 13 | Agent panel (Phase 3) | Fills the right-rail slot reserved in phase 3: persistent panel, context wiring (`{ route, filters, selected_ids: [] }`), A1/A2/A3 mode rendering, OAuth status surfacing on Settings. **Out of v1 MVP** | pending | 11, BE phase 14 |
| 14 | Deploy | Production build, static hosting, env config per environment | pending | 11 |

---

## 6. Decisions

D0–D7 are locked in [`../decisions.md`](../decisions.md). Summary table:

| # | Decision | Rejected | Why |
|---|---|---|---|
| D0 | UI library: Mantine + Tailwind | Pure Tailwind + headless; MUI; Chakra | Mantine ships table/modal/Spotlight ergonomics out of the box; Tailwind covers one-offs |
| D1 | Server state: TanStack Query | SWR; RTK Query | Stronger mutation ergonomics + larger community |
| D2 | Type generation from OpenAPI | Hand-written types; GraphQL; tRPC | Drift inevitable hand-written; BE is REST/Django |
| D3 | Money / quantity precision | JS `number`; BigInt | Float precision loss; BigInt has no decimal |
| D4 | Floor mode | Separate route; separate role | UI ergonomics, not a permission boundary; BE has no awareness |
| D5 | ⌘K command palette via Mantine Spotlight | Custom palette; cmdk | Spotlight is in-house with the rest of Mantine |
| D6 | Auth: cookie session | JWT; OAuth for users | No token rotation overhead at single-user scale |
| D7 | Agent: Claude Max OAuth token | Per-user API keys; server-mediated identity | Preserves Claude Max billing; no key management |

Pending defaults (not yet locked, will graduate to D8+ when committed) are listed in [`../decisions.md`](../decisions.md): TanStack Router, Vite, Mantine `useForm` + Zod, Zustand for UI-only state, Vitest, Playwright, Papa Parse, Sentry.

Cross-repo references use `BE-D{N}` for [`../../IlexInventory-Server/docs/decisions.md`](../../IlexInventory-Server/docs/decisions.md).
