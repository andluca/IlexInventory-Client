---
id: ILE-5
github_id: null
status: completed
assignee: null
state: Done
type: item
depends_on: [ILE-4]
---

# ILE-5 Implement Procurement (purchase orders) feature

## Overview

Land the POs list (`/purchase-orders`), draft new/edit (`/purchase-orders/new`, `/purchase-orders/:id/edit`), and detail (`/purchase-orders/:id`) pages per SPEC §3.4. List filters: status (`draft` / `received`), supplier search, date range (offset pagination). Draft form: supplier name + optional contact, line editor (product picker, quantity via `<DecimalInput>`, unit_cost via `<DecimalInput>`), "Save draft" → POST/PATCH. Receive modal (F3 terminal): per-line `batch_code` (required, supplier-stamped lot) + optional `expiration_date`, action-confirmation modal, `Idempotency-Key` minted at submit, redirect to read-only PO detail with the batches that were created. Wire 409 stale-state handling per SPEC §2.5: refetch + toast `"This PO has already been received elsewhere."` when a stale tab attempts PATCH/DELETE/Receive after another tab received.

## Surface

- [ ] `src/routes/_authed.purchase-orders.index.tsx`, `_authed.purchase-orders.new.tsx`, `_authed.purchase-orders.$id.edit.tsx`, `_authed.purchase-orders.$id.tsx`
- [ ] `src/features/procurement/PosListPage.tsx`, `PoDraftPage.tsx`, `PoDetailPage.tsx`, `ReceiveModal.tsx`, `PoLineEditor.tsx`, `ReceiveConfirmModal.tsx`
- [ ] `src/data/procurement/queries.ts`, `mutations.ts`, `keys.ts`
- [ ] Sidebar: flip `/purchase-orders` from `available: false` to `available: true` (`src/features/shell/Sidebar.tsx`)
- [ ] Tests: receive Idempotency-Key header asserted, 409 stale-state refetch + toast wording, post-receive read-only state (no PATCH/DELETE affordances), no optimistic update on receive

## Dependencies

- ILE-4 (catalog feature)
- BE phase 7 (procurement endpoints live) — already done per BE status (ILEX-005 completed).


# Specification

## Page: POs list
File: `src/routes/_authed.purchase-orders.index.tsx` (route) + `src/features/procurement/PosListPage.tsx` (component)

Lists every purchase order owned by the current user. Realizes R5 per SPEC §3.4. Layout archetype A3 (List with filters): page header (H1 "Purchase Orders", supplier search, "New PO" primary button), filter row (status `SegmentedControl` with `Draft / Received / All`, date-range pickers `from`/`to`), dense Mantine `<Table>`, offset pagination footer.

### Preconditions

* User is authenticated (the route is under `_authed`)
* BE procurement endpoints reachable at `${VITE_API_BASE_URL}/purchase-orders`

### Primary Use Case — list, filter, search, paginate

#### Workflow
* User visits `/purchase-orders`
* `usePosList({ status, search, from, to, page, limit })` reads from URL search params; defaults: `status=undefined` (All), `search=''`, `from=undefined`, `to=undefined`, `page=1`, `limit=50`
* Mantine table renders columns: `Created at` (`YYYY-MM-DD`), `Supplier`, `Status` (badge: `draft` = amber / `received` = tereré), `Lines` (count), `Received at` (or em-dash for drafts)
* Row click → `navigate({ to: '/purchase-orders/$id', params: { id: row.id } })`
* Supplier search input is debounced 250 ms; updates `?search=` in URL search
* Status `SegmentedControl` updates `?status=`
* Date-range `<DateInput>` pair updates `?from=` / `?to=` (ISO `YYYY-MM-DD`)
* Pagination footer updates `?page=`

#### Output
* URL is `/purchase-orders?status=draft&search=acme&from=2026-01-01&page=2`
* Table shows rows from `data.items`; footer shows `Showing 51–80 of 132`

### Edge Case — empty list

* When `total === 0` and there are no active filters: render empty-state copy "No purchase orders yet. Create one to start receiving stock." + a primary "New PO" button
* When `total === 0` but filters are active: render empty-state copy "No purchase orders match these filters. Clear filters?" + a "Clear filters" link

### Edge Case — server error

* On any non-2xx, render `<Alert color="red">` above the table with `error.detail ?? error.error`
* Filters remain interactive

### Examples

* Visit `/purchase-orders`; See: empty state "No purchase orders yet"; Click "New PO"; See: navigate to `/purchase-orders/new`
* Visit `/purchase-orders?status=draft`; See: filtered rows showing draft amber badge
* Visit `/purchase-orders?from=2026-01-01&to=2026-01-31`; See: rows with `created_at` inside the range only

## Page: PO draft (new + edit)
File: `src/routes/_authed.purchase-orders.new.tsx`, `_authed.purchase-orders.$id.edit.tsx` + `src/features/procurement/PoDraftPage.tsx`

Realizes F3 (draft) per SPEC §3.4. Custom draft-form layout (not A5 — no FEFO preview). Single component drives both `new` and `:id/edit`: when there is no `:id`, the form starts empty and `Save draft` calls `POST /purchase-orders`; when there is `:id`, the form hydrates from `usePo(id)` and `Save draft` calls `PATCH /purchase-orders/:id` (replace-style: full lines payload).

### Preconditions

* User is authenticated
* On edit: PO exists, owner matches (else 404), and `status === 'draft'` (else 409 on PATCH/DELETE — see Edge Cases)

### Primary Use Case — fill draft + save

#### Workflow
* Header: H1 "New purchase order" (or "Edit PO #{shortId}")
* Supplier card: `<TextInput label="Supplier name" required>`, `<TextInput label="Contact (optional)">`
* Lines card: `<PoLineEditor>` — table with rows for each line; columns: `Product` (Mantine `<Select>` populated by `useProductsList({ archived: false, limit: 200 })`), `Quantity` (`<DecimalInput unit={baseUnit} precision={4}>`), `Unit cost` (`<DecimalInput unit="$" precision={4}>`), action column with a remove icon. "Add line" button below the table appends a blank line
* Footer: subtotal computed client-side via `Decimal.js` over the lines (not sent to the server — derived only)
* Action bar: `Save draft` (primary), `Cancel` (returns to `/purchase-orders`), and on edit only: `Receive` (opens `<ReceiveModal>`) and `Delete draft` (opens a small confirm modal)
* Submit `Save draft`:
  - validate at least one line, all required fields filled, quantity > 0, unit_cost ≥ 0 (display unit string converts to base-unit number for the wire — see Notes)
  - on `new`: `POST /purchase-orders` → on 200 navigate to `/purchase-orders/:id/edit` with new id and toast "Draft saved"
  - on `edit`: `PATCH /purchase-orders/:id` (replace-style — full `lines` array) → on 200 stay, toast "Draft saved", refetch detail

#### Input
* `POST /purchase-orders` body: `{ supplier_name: string, supplier_contact?: string | null, lines: [{ product_id: string, quantity: number, unit_cost: number }] }`
* `PATCH /purchase-orders/:id` body: `PatchedPurchaseOrderUpdateRequest` shape (same fields, all optional; we always send the full `lines` array on save — replace semantics per `endpoints.md`)

### Edge Case — concurrent receive (stale-tab race)

#### Workflow
* User has the draft open in tab A; tab B receives the same PO
* User clicks `Save draft` (PATCH) or `Delete draft` in tab A
* BE returns 409
* Data layer toasts `"This PO has already been received elsewhere."` and refetches `usePo(id)` (per SPEC §2.5 stale-state handling)
* On refetch, page rerenders as **read-only** — `Save draft` / `Delete draft` / `Receive` affordances disappear; user is invited to navigate to detail

### Edge Case — validation error

* On 400 with `error.fields`, map onto Mantine form errors (e.g., `lines[0].quantity` → render under that line's quantity input)
* Subtotal stays visible; the page does not reset on error

### Examples

* Visit `/purchase-orders/new`; fill supplier + add 2 lines; click "Save draft"; See: navigate to `/purchase-orders/{id}/edit`, toast "Draft saved"
* Visit `/purchase-orders/{id}/edit`; remove a line; click "Save draft"; See: PATCH sent with the new full lines array; toast "Draft saved"
* Click "Receive"; See: `<ReceiveModal>` opens

## Modal: ReceiveModal
File: `src/features/procurement/ReceiveModal.tsx`

Realizes the F3 terminal action. Two-step flow inside the same Mantine `<Modal>`:
1. Per-line entry table — for each line in the draft, owner enters `batch_code` (required, supplier-stamped lot) and optional `expiration_date` (`<DateInput valueFormat="YYYY-MM-DD">`)
2. Action-confirmation step — a `<ReceiveConfirmModal>` summarising "About to create N batches" + "Receive" / "Cancel" — per SPEC §3.9 confirmation modals are required for terminal mutations

### Workflow

* Owner clicks "Receive" on the draft → step 1 opens; the line list mirrors `po.lines` (product name resolved via the cached products list)
* `batch_code` is required per line; `expiration_date` is optional (`null` ok per BE)
* "Continue to confirmation" advances to step 2 only when all lines have a non-empty `batch_code`
* Step 2: "Receive {N} batches?" copy + line summary; "Confirm" → submits
* Submit: `useReceivePo({ id, lines: [{ line_id, batch_code, expiration_date | null }] })` calls `POST /purchase-orders/:id/receive`. The `Idempotency-Key` header is auto-attached by `apiClient` middleware (path is in `ALWAYS_IDEMPOTENT_POST_PATHS`). The mutation **does not** retry — the user retries manually, and the apiClient mints a key once per attempt; if we ever wire automatic retry, we hold the key in a `useRef` so retries reuse it (see SPEC §2.5)
* On 200: invalidate `procurementKeys.all` + `inventoryKeys.batchesByPo(id)`; navigate to `/purchase-orders/:id` (read-only detail); toast "Received N batches"
* On 409 (already received): toast `"This PO has already been received elsewhere."`; refetch `usePo(id)`; close modal; the caller page rerenders as detail-style (no draft affordances)
* On 400 `validation_error` with `error.fields`: render field-level errors against the matching line row

### Notes

* No optimistic update — the receive endpoint atomically creates batches + movements server-side (SPEC §2.5 prohibits optimistic on terminal mutations)
* Lines render in the order returned by `po.lines` (created_at asc); the BE preserves order

## Page: PO detail (post-receive)
File: `src/routes/_authed.purchase-orders.$id.tsx` + `src/features/procurement/PoDetailPage.tsx`

Realizes R5 + F3 (post-receive) per SPEC §3.4. Archetype A4 (Detail with action bar). Read-only — no PATCH/DELETE/Receive affordances.

### Preconditions

* `:id` route param is a UUID
* User is authenticated and owns the PO (else 404 → "Not found", per BE-D4)

### Primary Use Case — read-only detail

#### Workflow
* `usePo(id)` resolves the PO
* Header: H2 "PO #{shortId}", `<Badge color="tereré">Received</Badge>` (or `<Badge color="amber">Draft</Badge>` if status===draft, with a link "Open draft editor" → `/purchase-orders/:id/edit`)
* Meta row: supplier name, supplier_contact, `Created` (ISO date), `Received at` (or em-dash for drafts)
* Lines table: `Product`, `Quantity` (formatted via `formatQty(line.quantity, baseUnit)`), `Unit cost` (`formatMoney(line.unit_cost)`), `Subtotal` (computed client-side)
* Batches table — only when `status === 'received'`: `useBatchesByPoId(id)` resolves the batches; columns: `Product`, `Batch code` (mono), `Expiration date` (or em-dash), `On hand`, `Unit cost`. Each row is a link to `/batches/:id` (will hard-route once ILE-6 lands; for now a placeholder href is fine — link still works since the batch detail route ships in ILE-6)
* No action bar buttons in v1: no edit / no delete / no re-receive / no duplicate / no PDF (SPEC §3.4: drop the prototype's `Duplicate / Export PDF / Cancel PO`)

### Edge Case — 404 cross-owner

* `usePo(id)` errors with `ApiError(status=404)`
* Page renders empty-state "Not found. This PO doesn't exist or you don't have access." + "Back to purchase orders" link (matches the catalog page treatment)

### Edge Case — status is still `draft`

* Page is reachable at `/purchase-orders/:id` even when status is still draft (the detail route does not gate on status)
* Render the same layout but with the amber "Draft" badge and an inline link to `/purchase-orders/:id/edit` ("Open draft editor"). Don't try to render the batches table when there are none.

### Examples

* Visit `/purchase-orders/{id}` after receive; See: header with received badge, lines table, batches table populated with the N batches that were just created
* Click a row in the batches table; See: navigate to `/batches/:id` (handled by ILE-6)

## Function: usePosList
File: `src/data/procurement/queries.ts`
Input: `({ status?: 'draft' | 'received'; search?: string; from?: string; to?: string; page?: number; limit?: number })`
Returns: `UseQueryResult<PurchaseOrderListResponse, ApiError>`

### Implementation

* `queryKey: procurementKeys.list({ status, search, from, to, page, limit })`
* `queryFn`: `apiClient.GET('/api/v1/purchase-orders', { params: { query: { status, search, from, to, limit, offset: (page-1) * limit } } })` — generated client only, no bare fetch
* `placeholderData: (prev) => prev` (smooth pagination — same idiom as `useProductsList`)
* `staleTime: 30_000`

## Function: usePo
File: `src/data/procurement/queries.ts`
Input: `(id: string)`
Returns: `UseQueryResult<PurchaseOrderResponse, ApiError>`

### Implementation

* `queryKey: procurementKeys.detail(id)`
* `queryFn`: `apiClient.GET('/api/v1/purchase-orders/{po_id}', { params: { path: { po_id: id } } })`
* `retry: false` on 404 (mirrors `useProduct` — don't mask cross-owner case)

## Function: useCreatePo
File: `src/data/procurement/mutations.ts`
Input: `()`
Returns: `UseMutationResult<PurchaseOrderResponse, ApiError, PurchaseOrderCreateRequest>`

### Implementation

* `mutationFn`: `apiClient.POST('/api/v1/purchase-orders', { body })`
* `onSuccess`: invalidate `procurementKeys.lists()`; do NOT navigate (caller handles routing)
* No idempotency key (drafts aren't terminal, BE doesn't require it)

## Function: useUpdatePo
File: `src/data/procurement/mutations.ts`
Input: `()`
Returns: `UseMutationResult<PurchaseOrderResponse, ApiError, { id: string; supplier_name?: string; supplier_contact?: string | null; lines?: LineCreateRequest[] }>`

### Implementation

* `mutationFn`: `apiClient.PATCH('/api/v1/purchase-orders/{po_id}', { params: { path: { po_id: id } }, body })`. Always sends the full `lines` array (replace-style per `endpoints.md`)
* No optimistic update (per SPEC §2.5 — `lines` is multi-row and order matters; not the trivial single-row case)
* `onSuccess`: invalidate `procurementKeys.detail(id)` + `procurementKeys.lists()`
* `onError`: caller maps 409 to refetch + toast

## Function: useDeletePo
File: `src/data/procurement/mutations.ts`
Input: `()`
Returns: `UseMutationResult<void, ApiError, { id: string }>`

### Implementation

* `mutationFn`: `apiClient.DELETE('/api/v1/purchase-orders/{po_id}', { params: { path: { po_id: id } } })` (204)
* `onSuccess`: `queryClient.removeQueries({ queryKey: procurementKeys.detail(id) })`; invalidate `procurementKeys.lists()`
* `onError`: caller maps 409 to refetch + toast (`"This PO has already been received elsewhere."`)

## Function: useReceivePo
File: `src/data/procurement/mutations.ts`
Input: `()`
Returns: `UseMutationResult<PurchaseOrderResponse, ApiError, { id: string; lines: ReceiveLineRequest[] }>`

### Implementation

* `mutationFn`: `apiClient.POST('/api/v1/purchase-orders/{po_id}/receive', { params: { path: { po_id: id } }, body: { lines } })`. The `Idempotency-Key` header is auto-attached by the apiClient middleware (path is in `ALWAYS_IDEMPOTENT_POST_PATHS`)
* `retry: false` (terminal mutation; user retries manually)
* `onSuccess`: invalidate `procurementKeys.detail(id)` + `procurementKeys.lists()` + `inventoryKeys.batchesByPo(id)`
* `onError`: caller maps 409 to refetch + toast

## Function: useBatchesByPoId
File: `src/data/inventory/queries.ts` (extends ILE-4's file — no new directory)
Input: `(poId: string)`
Returns: `UseQueryResult<BatchListResponse, ApiError>`

### Implementation

* Used by `<PoDetailPage>` to render the batches table. The BE's `GET /batches` does not accept a `purchase_order_id` query param (verified in `src/api/generated/schema.ts` — only `product_id`, `is_recalled`, `expiring_within`, `limit`, `offset`)
* Strategy for v1: read `usePo(poId)` from the cache (or pass the lines in as an arg), unique the `product_id`s, fan-out a `GET /batches?product_id={x}` per product, then filter the union by `purchase_order_line_id ∈ po.lines.map(l => l.id)`. With v1's small scale this is acceptable; document the BE follow-up in Notes
* `queryKey: inventoryKeys.batchesByPo(poId)`
* `queryFn`: see strategy above. Implementation likely uses `Promise.all` + `apiClient.GET('/api/v1/batches', { params: { query: { product_id, limit: 200 } } })` per product
* `staleTime: 30_000`

## Component: PoLineEditor
File: `src/features/procurement/PoLineEditor.tsx`

Reusable line-table editor for the draft form. Pure controlled component — does not own state.

### Props

```ts
type PoLineEditorProps = {
  lines: Array<{
    product_id: string
    quantity: string   // string per SPEC §2.4 — converted to number on submit
    unit_cost: string
  }>
  products: Array<{ id: string; name: string; sku: string; base_unit: string }>
  errors?: Record<number, { product_id?: string; quantity?: string; unit_cost?: string }>
  onChange: (lines: PoLineEditorProps['lines']) => void
  disabled?: boolean
}
```

### Behavior

* Renders a table; each row has `<Select>` for product (search by name or SKU), `<DecimalInput>` for quantity (unit pulled from selected product's `base_unit`), `<DecimalInput>` for unit cost (no unit suffix; placeholder `$0.00`), and a remove button
* "Add line" button below the table appends `{ product_id: '', quantity: '', unit_cost: '' }`
* Removing the last line is allowed; the parent form validates `lines.length >= 1` on submit
* When `disabled` (e.g., during `isPending` or once status flips to received), all inputs and buttons render in disabled state

## Component: ReceiveConfirmModal
File: `src/features/procurement/ReceiveConfirmModal.tsx`

Confirmation step for the receive flow. Small wrapper over Mantine `<Modal>` — receives a summary string and a confirm callback. Same shape as `<ArchiveConfirmModal>` from ILE-4 but without an internal mutation hook (the parent `<ReceiveModal>` owns the mutation).

### Props

```ts
type ReceiveConfirmModalProps = {
  opened: boolean
  pendingLineCount: number
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}
```

## Lib: src/data/procurement/keys.ts

```ts
export const procurementKeys = {
  all: ['procurement'] as const,
  lists: () => [...procurementKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...procurementKeys.lists(), filters ?? {}] as const,
  details: () => [...procurementKeys.all, 'detail'] as const,
  detail: (id: string) => [...procurementKeys.details(), id] as const,
}
```

## Lib: src/data/inventory/keys.ts (extension)

Add `batchesByPo`:

```ts
batchesByPo: (poId: string) => [...inventoryKeys.all, 'batchesByPo', poId] as const,
```

## External Dependencies

### BE procurement endpoints
Used for: PO list / draft CRUD / receive.
Endpoints: `GET/POST /purchase-orders`, `GET/PATCH/DELETE /purchase-orders/{id}`, `POST /purchase-orders/{id}/receive`.

* All requests carry the session cookie (apiClient `credentials: 'include'`)
* CSRF token attached on POST/PATCH/DELETE (apiClient middleware)
* `POST /purchase-orders/{id}/receive` carries `Idempotency-Key` (apiClient middleware)
* 4xx envelope `{ error, detail?, fields? }` normalized to `ApiError` (apiClient middleware)
* 409 on PATCH/DELETE/Receive when the PO has moved past `draft` (BE-D6) — caller maps to refetch + toast per SPEC §2.5

### BE catalog endpoints (read-only)
Used for: product picker in `<PoLineEditor>`.
Endpoints: `GET /products` via the existing `useProductsList` hook.

### BE inventory endpoints (read-only)
Used for: post-receive batches table on PO detail.
Endpoints: `GET /batches?product_id={x}` (fanned-out per unique product on the PO; filtered client-side by `purchase_order_line_id`).


# Plan

Each step is independently shippable. Within a step, a failing test goes first, then the implementation, then the green run (per `tdd` skill).

1. **Land the procurement data layer (`src/data/procurement/`)**
   - Why: every UI surface in this issue depends on `usePosList` / `usePo` / `useCreatePo` / `useUpdatePo` / `useDeletePo` / `useReceivePo`. Building hooks first means downstream UI tests assert against real hooks, not mocks. Confirms the generated `PurchaseOrderCreateRequest` / `PatchedPurchaseOrderUpdateRequest` / `ReceiveLineRequest` types flow through cleanly.
   - [ ] Create `src/data/procurement/keys.ts` per Specification
   - [ ] Create `src/data/procurement/queries.ts` with `usePosList` and `usePo`
   - [ ] Create `src/data/procurement/mutations.ts` with the four mutations
   - [ ] Write `queries.test.ts`: MSW handlers covering `GET /purchase-orders` 200 with paginated body; `usePosList({ status, search, from, to, page })` resolves with mapped items; query params (`status=draft`, `search=acme`, `from=2026-01-01`, `offset=50`) are forwarded; `GET /purchase-orders/:id` 404 lands `error.status === 404` and only hits MSW once (asserts `retry: false`)
   - [ ] Write `mutations.test.ts`: `useCreatePo` 200 invalidates `procurementKeys.lists()`; `useUpdatePo` PATCH sends the full `lines` array (replace-style); `useDeletePo` 204 removes detail from cache + invalidates list; `useReceivePo` 200 sends `Idempotency-Key` header (assert via MSW request inspection); `useReceivePo` does not retry (`retry: false`); `useUpdatePo` and `useDeletePo` 409 surface as `ApiError(status=409)` so callers can map to refetch + toast
   - [ ] `npm test && npm run typecheck` green

2. **Extend the inventory data layer with `useBatchesByPoId`**
   - Why: `<PoDetailPage>` needs the batches that a receive created, but `GET /batches` doesn't accept a `purchase_order_id` filter. Land the fan-out hook first so the detail page can render against a real hook in step 6's tests.
   - [ ] Add `batchesByPo: (poId)` to `src/data/inventory/keys.ts`
   - [ ] Add `useBatchesByPoId(poId: string)` to `src/data/inventory/queries.ts`. Reads the cached `usePo(poId)` (via `queryClient.getQueryData(procurementKeys.detail(poId))`) for the line list, fans out `GET /batches?product_id=X` per unique product, filters the union by `purchase_order_line_id ∈ poLineIds`, returns a `BatchListResponse`-shaped object
   - [ ] Write a test: PO with 2 lines (different products), MSW returns 3 batches per product (one of which is on the PO line); the hook returns exactly the 2 PO-linked batches (one per line)
   - [ ] `npm test && npm run typecheck` green

3. **Land `<PoLineEditor>` shared component**
   - Why: needed by `<PoDraftPage>`. Building it as a controlled stateless component first lets the draft page own form state and lets the editor be unit-testable in isolation (no MSW needed).
   - [ ] Write `PoLineEditor.test.tsx`: mount with 1 line; `<Select>` lists products from the prop; selecting a product emits `onChange` with the new `product_id` and stamps the unit on the quantity input; typing in `<DecimalInput>` for quantity emits `onChange` with the string value (no number coercion); "Add line" appends a blank line; remove button removes the row; passing `errors[0].quantity` shows the error under the quantity input; `disabled` propagates to all inputs and buttons
   - [ ] Implement `src/features/procurement/PoLineEditor.tsx` (Mantine `<Table>` + `<Select>` + `<DecimalInput>`)
   - [ ] `npm test && npm run typecheck && npm run lint` green

4. **Land `<PosListPage>` + the route**
   - Why: ships the read view (R5). Independent of any draft / receive flow — exercises the list hook + filters + pagination.
   - [ ] Write `PosListPage.test.tsx`:
     - happy: MSW returns `{ items: [...], total: 80, limit: 50, offset: 0 }`; rows render with status badges; click row → `navigate` called with the PO id
     - status filter: click `Draft` segment → MSW request includes `?status=draft`
     - supplier search: type "acme" → debounced 250 ms → MSW request includes `?search=acme`
     - date-range filter: pick `from=2026-01-01` → MSW request includes `?from=2026-01-01`
     - pagination: click `Next` → URL becomes `?page=2`; MSW request includes `?offset=50`
     - empty no-filters: `total=0` and no filters → empty-state "No purchase orders yet" + "New PO" CTA
     - empty with filters: `total=0` and `status=draft` → empty-state "No purchase orders match these filters" + "Clear filters"
   - [ ] Implement `src/features/procurement/PosListPage.tsx` (page header, filter row, debounced search, Mantine `<Table>`, pagination footer — mirror the structure of `<ProductsListPage>`)
   - [ ] Create `src/routes/_authed.purchase-orders.index.tsx` mounting `<PosListPage>`. `validateSearch`: `status` ∈ `'draft' | 'received' | undefined`; `search` string-or-undefined; `from`/`to` ISO date strings or undefined; `page` positive int (defaults to 1)
   - [ ] Flip the `/purchase-orders` entry in `src/features/shell/Sidebar.tsx` from `available: false` to `available: true`
   - [ ] `npm test && npm run typecheck && npm run lint` green

5. **Land `<PoDraftPage>` (new + edit) + routes**
   - Why: ships F3 draft CRUD. Combining `new` and `edit` in one component is justified — the state machine differs only in whether `:id` is in route params and whether the form starts empty vs hydrated. Splitting them would duplicate the line editor wiring.
   - [ ] Write `PoDraftPage.test.tsx`:
     - new happy: visit `/purchase-orders/new`; fill supplier name + 1 line; click "Save draft"; MSW POST 200 returns new PO; navigate called with `/purchase-orders/{id}/edit`; toast "Draft saved"
     - edit hydrate: visit `/purchase-orders/{id}/edit`; MSW returns PO with 2 lines; both lines render with their values
     - edit save: change supplier name; click "Save draft"; MSW PATCH 200; assert PATCH body sent the full lines array (replace-style)
     - validation: click "Save draft" with no lines → "Add at least one line" inline error; with empty supplier name → "Supplier name is required"
     - 409 on PATCH (stale-tab race): MSW returns 409; toast `"This PO has already been received elsewhere."` shown; refetch fires for `procurementKeys.detail(id)`; on refetch the page rerenders without `Save draft` / `Delete draft` / `Receive` buttons
     - delete draft: click "Delete draft"; confirm modal; MSW DELETE 204; navigate called with `/purchase-orders`
   - [ ] Implement `src/features/procurement/PoDraftPage.tsx`. Use `useForm` from `@mantine/form` for supplier fields; manage `lines` as a separate `useState` so `<PoLineEditor>` is fully controlled. Convert string quantity / unit_cost to number on submit (`Number(value)`); reject NaN at the form layer
   - [ ] Create `src/routes/_authed.purchase-orders.new.tsx` (mount `<PoDraftPage>` with no `id`)
   - [ ] Create `src/routes/_authed.purchase-orders.$id.edit.tsx` (mount `<PoDraftPage>` reading `id` from path params)
   - [ ] `npm test && npm run typecheck && npm run lint` green

6. **Land `<PoDetailPage>` (read-only) + route**
   - Why: ships the read-only post-receive view + the in-tab "still draft" fallback. Separates from the draft page so the test surface stays focused on read-only assertions.
   - [ ] Write `PoDetailPage.test.tsx`:
     - happy received: MSW returns PO with `status='received'`, 2 lines; `useBatchesByPoId` returns 2 batches → both lines + both batches render; no "Save draft" / "Receive" / "Delete" buttons
     - draft fallback: MSW returns PO with `status='draft'` → amber badge + "Open draft editor" link to `/purchase-orders/{id}/edit`
     - 404 cross-owner: MSW returns 404 → empty-state "Not found" + "Back to purchase orders" link
     - batch row click: click a batch row → `navigate` called with `/batches/{id}` (the route lands in ILE-6; for now just assert the navigate call)
   - [ ] Implement `src/features/procurement/PoDetailPage.tsx`
   - [ ] Create `src/routes/_authed.purchase-orders.$id.tsx`
   - [ ] `npm test && npm run typecheck && npm run lint` green

7. **Land `<ReceiveModal>` + `<ReceiveConfirmModal>` + wire from `<PoDraftPage>`**
   - Why: closes the F3 terminal flow. Splitting from step 5 keeps the Idempotency-Key + 409 + redirect tests in their own file. Confirmation modal is required by SPEC §3.9 for terminal mutations.
   - [ ] Write `ReceiveModal.test.tsx`:
     - per-line entry: opens with rows mirroring `po.lines`; "Continue to confirmation" disabled until all `batch_code` filled; advancing renders `<ReceiveConfirmModal>` with "About to create N batches"
     - happy submit: confirm → MSW POST 200; navigate called with `/purchase-orders/{id}`; toast "Received N batches"; assert via MSW that the request had a non-empty `Idempotency-Key` header
     - 409 stale-tab: MSW returns 409; toast `"This PO has already been received elsewhere."`; modal closes; refetch fires for `procurementKeys.detail(id)`
     - validation: MSW returns 400 with `error.fields = { 'lines.0.batch_code': ['required'] }` → field-level error renders against line 0's batch_code input; modal stays open
     - no optimistic update: assert that during the in-flight pending state, the cache for `procurementKeys.detail(id)` still shows `status='draft'`; only after resolve does it become `received`
   - [ ] Write `ReceiveConfirmModal.test.tsx`: opens with the right "About to create N batches" copy; clicking "Confirm" calls `onConfirm`; clicking "Cancel" calls `onCancel`; while `isPending`, both buttons disable and the confirm button shows a loader
   - [ ] Implement `src/features/procurement/ReceiveModal.tsx` (Mantine `<Modal>` with two-step state: `entry` → `confirm`)
   - [ ] Implement `src/features/procurement/ReceiveConfirmModal.tsx`
   - [ ] Wire the "Receive" button in `<PoDraftPage>` (edit mode only) to open the modal
   - [ ] `npm test && npm run typecheck && npm run lint` green

8. **Validation pass: regenerate, typecheck, test, drift, lint, smoke**
   - Why: confirms the procurement surface is coherent before unblocking ILE-6. Mirrors ILE-4's step 9 — the full gate catches module-resolution / grep-gate violations here, not in ILE-6's first PR.
   - [ ] `npm run generate:api -- --check` (no schema drift)
   - [ ] `npm run typecheck && npm test && npm run lint` (all green)
   - [ ] Re-run the SPEC §4 grep gates locally (bare fetch outside data, `as any` outside generated, features importing `api/generated`, `NumberInput` in features) — expect 0 hits
   - [ ] `npm run dev` smoke: log in → click "Purchase Orders" in sidebar (now enabled) → empty state → click "New PO" → fill supplier + 1 line → "Save draft" → land on edit → click "Receive" → fill batch_code per line → confirm → land on detail with received badge + batches table
   - [ ] Update Surface checkboxes to reflect what landed
   - [ ] Append a Journal entry summarizing what shipped and any judgment calls (e.g., whether the `useBatchesByPoId` fan-out stays here or is replaced by a BE follow-up; whether `PoDraftPage` was split into `new` + `edit` or stayed unified)


# Notes

- **Strings vs numbers on the wire.** The generated `LineCreateRequest` types `quantity: number` and `unit_cost: number`, but SPEC §2.4 mandates strings end-to-end on the FE. Keep the form values as strings (`<DecimalInput>` contract); convert to number with `Number(value)` only inside the data hook's mutationFn body, validating with `Decimal.js` first. Do **not** keep two parallel value shapes in the form. The BE response (`PurchaseOrderLineResponse`) returns `quantity: string` / `unit_cost: string` (decimal precision-correct), so display continues to use the string formatters.
- **No `useReceivePoIdempotencyKey` ref needed.** TanStack Query's automatic retry is disabled on this mutation (`retry: false`), so the apiClient middleware mints a fresh UUIDv7 per call and we don't need to thread a stable key through state. If we ever want auto-retry on the receive endpoint, hold the key in a `useRef` so retries reuse it (per SPEC §2.5 — "the same key is reused so the BE returns the cached response").
- **No optimistic update on receive.** Per SPEC §2.5, terminal mutations never use optimistic updates — the BE atomically creates batches + ledger movements which the client cannot mirror honestly. The modal stays open with a spinner; on resolve we redirect to detail. Confirmed in tests by snapshotting `procurementKeys.detail(id)` mid-flight.
- **No optimistic update on PATCH `/purchase-orders/{id}` either.** Unlike `useUpdateProduct` (which is a single-row, two-display-field PATCH), `useUpdatePo` replaces the lines array — this is multi-row and order-sensitive. SPEC §2.5 reserves optimistic for trivial single-row PATCHes; PO PATCH is not that. Skip it.
- **`useBatchesByPoId` is a fan-out workaround.** The BE's `GET /batches` doesn't expose a `purchase_order_id` query param. The hook fans out per unique product on the PO, then filters by `purchase_order_line_id`. This works fine at v1 scale (a few products per PO) but is the obvious BE follow-up — adding `?purchase_order_id=` to `/batches` makes this a one-line client change. Note in the Journal so ILE-6's planner sees it.
- **Status filter is binary in v1.** SPEC §3.4 explicitly drops `sent` / `partial` / `cancelled` from the v0 prototype. Only `draft` and `received` are valid; `validateSearch` rejects others (falls back to `undefined`).
- **Replace-style PATCH on lines.** `endpoints.md` documents PATCH as replace-style on the `lines` array. Always send the full array on every save — no per-line POST/PATCH/DELETE. Validates that the BE's "draft → received" boundary is the only state transition, and keeps client logic simple.
- **Detail-page batches table can render without ILE-6.** The link target `/batches/:id` lands in ILE-6, so clicking a row before ILE-6 ships will route to a 404 / placeholder. That's acceptable — ILE-5's PR doesn't need to ship the destination, only the link source. Tests assert on the navigate call, not on the rendered batch detail.
- **Sidebar gating.** Flip only the `/purchase-orders` entry to `available: true` in this issue. ILE-6/7 each flip their own entry.
- **No CmdK wiring.** "New PO" / "Receive" are **not** added to the ⌘K Create / Act categories in this issue. ILE-9 owns the spotlight; that issue will read the procurement data hooks already built here.
- **Toast copy.** Stick to the same vocabulary as ILE-4's catalog: `"Draft saved"`, `"Received N batches"`, `"Couldn't save — try again."`, `"This PO has already been received elsewhere."` (the last is verbatim from SPEC §2.5 — do not paraphrase, the wording is the contract).
- **Route file naming.** Use the flat-file convention from ILE-4 (`_authed.purchase-orders.index.tsx`, `_authed.purchase-orders.new.tsx`, `_authed.purchase-orders.$id.edit.tsx`, `_authed.purchase-orders.$id.tsx`). Don't introduce a nested directory; keeps the diff small and consistent with `_authed.products.*`.


# Journal
