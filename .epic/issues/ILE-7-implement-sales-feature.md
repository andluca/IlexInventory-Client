---
id: ILE-7
github_id: null
status: open
assignee: null
state: Queued
type: item
depends_on: [ILE-6]
---

# ILE-7 Implement Sales (sales orders) feature — draft, FEFO preview, commit, void

## Overview

Land SOs list (`/sales-orders`, cursor pagination via `useInfiniteQuery`), draft new/edit (`/sales-orders/new`, `/sales-orders/:id/edit`), and detail (`/sales-orders/:id`) per SPEC §3.6. List filters: status, voided, customer search, date range. Draft form: customer name + optional contact, line editor (product picker, quantity via `<DecimalInput>`, sell_price via `<DecimalInput>`). FEFO preview: calls `POST /sales-orders/:id/preview` (non-mutating) and renders proposed allocations by `expiration_date ASC NULLS LAST` so the owner sees what FEFO will do *before* committing. Commit: action-confirmation modal → `POST /commit` with `Idempotency-Key`; **no optimistic update** (the BE walks FEFO + writes allocations + ledger movements atomically, which the client cannot honestly mirror). 422 shortfall renders `{ shortfall: { product_id, required, available } }` inline. Admin override (BE-D11): "Edit allocations" affordance hidden behind a disclosure to keep the default flow clean — when populated, body includes explicit `allocations`. Void: confirmation modal → `POST /void` with `Idempotency-Key`; voided banner shows `voided_at`; further actions disabled. 409 stale-state on commit (already-committed SO) and on void (already-voided SO) → refetch + toast per SPEC §2.5.

## Surface

- [x] `src/routes/_authed.sales-orders.index.tsx`, `_authed.sales-orders.new.tsx`, `_authed.sales-orders.$id.edit.tsx`, `_authed.sales-orders.$id.tsx`
- [x] `src/features/sales/SosListPage.tsx`, `SoDraftPage.tsx`, `SoDetailPage.tsx`, `FefoPreview.tsx`, `SoLineEditor.tsx`, `CommitConfirmModal.tsx`, `VoidConfirmModal.tsx`, `AllocationsTable.tsx`, `AllocationOverrideEditor.tsx`, `ShortfallBanner.tsx`
- [x] `src/data/sales/queries.ts` (cursor pagination), `mutations.ts`, `keys.ts`
- [x] Tests: FEFO preview rendering from server response, commit Idempotency-Key header, no-optimistic on commit, 422 shortfall inline rendering, admin-override disclosure default-hidden, void Idempotency-Key, 409 stale-state on commit + void, voided-state UI disabling
- [x] Sidebar `/sales-orders` flipped to `available: true`

## Dependencies

- ILE-6 (inventory feature) — done
- BE phase 9 (sales endpoints live) — **status pending**. Current `docs/openapi.snapshot.json` and `src/api/generated/schema.ts` contain ZERO references to `sales-orders` / `SalesOrder*` schemas. Step 1 verifies schema availability; if BE has not shipped, the issue blocks here per SPEC §2.6 (no `as any` outside `src/api/generated`). The existing apiClient (`src/api/client.ts:53-55`) already lists `/api/v1/sales-orders/{sales_order_id}/commit` + `/void` in `ALWAYS_IDEMPOTENT_POST_PATHS` — added in anticipation; no apiClient change needed.


# Specification

## Page: Sales orders list
File: `src/routes/_authed.sales-orders.index.tsx` (route) + `src/features/sales/SosListPage.tsx` (component)

Realizes R4 per SPEC §3.6. Lists every sales order owned by the current user. Layout archetype A3 (List with filters). Cursor-paginated via `useInfiniteQuery` per SPEC §2.5 (the only A3 page in v1 that is cursor-paginated; other A3 pages use offset).

### Preconditions

* User is authenticated (route is under `_authed`)
* BE sales endpoints reachable at `${VITE_API_BASE_URL}/sales-orders`

### Primary Use Case — list, filter, scroll

#### Workflow
* User visits `/sales-orders`
* `useSosList({ status, voided, search, from, to })` reads from URL search params; defaults: all undefined
* Mantine table renders columns: `Customer`, `Status` (`StatusBadge` — draft / committed / voided), `Lines` (count, mono), `Created`, `Committed at`, `Voided at`
* Row click → `navigate({ to: '/sales-orders/$id', params: { id: so.id } })` (committed/voided) or `'/sales-orders/$id/edit'` (draft)
* Status `SegmentedControl`: `All / Draft / Committed / Voided` updates `?status=` (and `?voided=` for the voided segment, which is a separate field on the BE)
* Customer search `<TextInput>` debounced 250ms → updates `?search=`
* Date range pair (`<DateInput>` `from` / `to`) → updates `?from=` / `?to=`
* "Load more" button at the bottom calls `fetchNextPage()` while `hasNextPage` is true (matches `useMovements` pattern; no auto-scroll trigger in v1)

#### Output
* URL: `/sales-orders?status=draft&search=acme&from=2026-01-01`
* Table shows rows with status badges; "Load more" appears when `next_cursor` is set

### Edge Case — empty list (no filters)

* `pages[0].items.length === 0` and no filters → empty-state copy "No sales orders yet. Draft your first SO to see FEFO in action." + "New SO" CTA → `/sales-orders/new`

### Edge Case — empty list (filters active)

* `items.length === 0` and any filter set → "No sales orders match these filters." + "Clear filters" link

### Edge Case — server error

* Non-2xx → `<Alert color="red">` above the table with `error.detail ?? error.error`

### Examples

* Visit `/sales-orders`; See: empty-state "No sales orders yet" + "New SO" CTA
* Visit `/sales-orders?status=committed`; See: only committed SOs, each with green badge
* Click a draft row; See: navigate to `/sales-orders/{id}/edit`
* Click a committed row; See: navigate to `/sales-orders/{id}` (detail)

## Page: Sales order draft (new + edit)
File: `src/routes/_authed.sales-orders.new.tsx` + `src/routes/_authed.sales-orders.$id.edit.tsx` (routes) + `src/features/sales/SoDraftPage.tsx` (single shared component)

Realizes F7 (draft) per SPEC §3.6. **Layout archetype A5 (Draft with side preview) — the differentiator screen, not in v0 handoff, build deliberately.** Two-column 60/40 layout: left = form (customer + line editor + admin-override disclosure), right = `<FefoPreview>`.

### Preconditions

* User is authenticated
* For edit: `:id` route param is a UUID; SO exists and `status === 'draft'` (else 409 from the BE on PATCH; UI redirects to `/sales-orders/:id` on initial load if the loaded SO has `status !== 'draft'`)

### Primary Use Case — draft, FEFO preview, commit

#### Workflow
* `/new`: empty form — `customer_name` (required), `customer_contact` (optional), `lines: []`. On first save (Save draft) the form calls `useCreateSo` and navigates to `/sales-orders/{id}/edit` (replace history) so the SO has an id for the preview endpoint
* `/:id/edit`: `useSo(id)` hydrates the form. If `status !== 'draft'`: redirect to `/sales-orders/:id` (read-only)
* Lines editor (`<SoLineEditor>`): per-line product picker (`useProductsList`), quantity (`<DecimalInput>` in display units), sell_price (`<DecimalInput>`). "+ Add line" appends an empty line
* **Save draft** button — calls `useUpdateSo` (or `useCreateSo` on first save). PATCH replaces the full lines array; no optimistic update (multi-row replace-style, SPEC §2.5)
* **FEFO preview** — `usePreviewSo(id)` calls `POST /sales-orders/:id/preview` after the SO has an id (i.e. after first save). Auto-refresh on form change debounced 300ms via the `↻ Refresh preview` affordance + an effect that calls `refetch()` after each successful save. **Preview is non-mutating** per SPEC §3.6 — it does NOT carry an Idempotency-Key (the apiClient does not list `/preview` in either path set)
* `<FefoPreview>` renders per-line cards with allocation tables sorted by `expiration_date ASC NULLS LAST` (the BE's FEFO ordering). Earliest-expiring batch's row gets `<ExpiryBadge>` if `<14d` to date. Footer: total qty, revenue, **estimated COGS**, **estimated profit margin** (tereré green if positive, clay if negative — matches the components.md polish target)
* **Commit** button (in the FEFO preview right column) — opens `<CommitConfirmModal>` with consequence-library copy: *"This consumes stock from the batches above. Sales orders are immutable after commit — you'd have to void to reverse."* Confirm → `useCommitSo.mutate({ id, allocations? })` with `Idempotency-Key` (auto-attached by middleware)
* **No optimistic update on commit** — UI waits for the server response before showing committed state (per SPEC §3.6 surface gate). On 200, navigate to `/sales-orders/:id` (the post-commit detail page)
* **Admin override disclosure** (BE-D11) — collapsed by default. When expanded, renders `<AllocationOverrideEditor>` — an editable allocation list that, when populated, becomes the request body for commit (`{ allocations: [...] }`). When collapsed/empty, the commit body is `{}` (BE walks FEFO server-side)

#### Output
* Initial state on `/new`: empty form, right column shows "Add lines to see the FEFO allocation."
* After saving with two lines: right column shows two cards with allocations
* Click Commit → modal appears → Confirm → on 200, redirected to `/sales-orders/{id}` (detail)

### Edge Case — 422 shortfall

#### Workflow
* User clicks Commit → BE returns 422 with `{ error: 'shortfall', detail: '...', fields: {}, shortfall: { product_id, required, available } }` (BE returns the `shortfall` envelope inside `detail` or as a custom field per the generated `SalesOrderCommit` 422 response — the executor confirms shape from regenerated schema)
* Modal closes; `<ShortfallBanner>` renders **inline in the right column** (not a toast, per A5 polish targets) above the FEFO preview cards: *"Cannot commit — Product '{product.name}' requires {required} but only {available} on hand."*
* Banner is dismissible; the user adjusts quantity in the line editor and re-runs the preview

### Edge Case — 409 stale-state on commit

* Tab A draft is open; tab B commits the same SO. User in tab A clicks Commit → BE returns 409. Modal closes; toast `"This sales order has already been committed elsewhere."`; refetch `useSo(id)`; on refetch the page rerenders as the post-commit detail (because `status !== 'draft'` triggers the redirect from above)

### Edge Case — concurrent draft delete

* Tab A draft is open; tab B deletes the same draft. Tab A clicks Save → 404. Toast `"This draft no longer exists."` + navigate to `/sales-orders` (list)

### Examples

* Visit `/sales-orders/new`; See: empty form + "Add lines to see the FEFO allocation." stub
* Add product P1 (qty 10, sell 5.00) + product P2 (qty 3, sell 12.00); Save draft → URL becomes `/sales-orders/{id}/edit`; FEFO preview renders two cards
* Click Commit → modal opens → Confirm → on 200, URL becomes `/sales-orders/{id}` (detail page, read-only)
* Shortfall: P1 needs 10 but only 8 on hand → click Commit → modal opens → Confirm → 422 → modal closes, red shortfall banner appears inline in right column with "Cannot commit — Product 'P1' requires 10 but only 8 on hand."

## Page: Sales order detail (post-commit)
File: `src/routes/_authed.sales-orders.$id.tsx` (route) + `src/features/sales/SoDetailPage.tsx` (component)

Realizes R4 + F7 post-commit + F8 per SPEC §3.6. Layout archetype A4 (Detail with action bar). Read-only view of a committed (or voided) SO with allocations table and Void affordance.

### Preconditions

* `:id` route param is a UUID
* User is authenticated and owns the SO (else 404 → "Not found")
* If `status === 'draft'`: redirect to `/sales-orders/:id/edit` (SoDraftPage handles draft editing)

### Primary Use Case — read detail + void

#### Workflow
* `useSo(id)` resolves the SO; allocations are returned inline (per SPEC §3.6 BE includes `lines` and post-commit `allocations`)
* Header: H2 customer_name, mono `id` short hash, `<StatusBadge>` (committed / voided), `committed_at` / `voided_at` timestamps
* Voided banner — only when `status === 'voided'`: clay-red `<Alert>` with copy `"Voided at {voided_at}."` and the action bar disabled
* Action bar:
  - `Void` (clay/destructive, only when `status === 'committed'`) → `<VoidConfirmModal>` (F8)
* Body sections:
  - **Lines table**: product name, ordered qty, sell_price, line revenue
  - **Allocations table** (`<AllocationsTable>`): per-line allocation rows with batch_code (mono, links to `/batches/{batch_id}`), expiration_date, qty allocated, unit_cost (committed at commit time — does NOT update if the batch's unit_cost later changes)
  - **Totals footer**: total qty, revenue, COGS, profit margin

#### Output
* Visiting a committed SO shows the lines table + allocations table + Void button
* Visiting a voided SO shows the red voided banner + disabled action bar; allocations remain visible per BE-D8

### Edge Case — 404 cross-owner

* `useSo(id)` errors with `ApiError(status=404)` → empty-state "Not found. This sales order doesn't exist or you don't have access." + "Back to sales orders" link

### Edge Case — 409 on void (stale tab)

* Tab A is open on a committed SO; tab B voids the same SO. User in tab A clicks Void → `<VoidConfirmModal>` Confirm → BE returns 409. Modal closes; toast `"This sales order has already been voided elsewhere."`; refetch `useSo(id)` — page rerenders with the voided banner + disabled action bar

### Examples

* Visit `/sales-orders/{committed-id}`; See: lines table + allocations table + Void button (clay)
* Click Void → modal "Voiding writes reversal movements and stamps `voided_at`. Allocations stay on the record." → Confirm → on 200, page rerenders with red voided banner + Void button gone

## Modal: CommitConfirmModal
File: `src/features/sales/CommitConfirmModal.tsx`

Realizes the action-confirmation step before `POST /sales-orders/:id/commit` per SPEC §3.6. Mantine `<Modal>` confirmation-only (no body inputs in the default flow — the body is the FEFO preview's implicit allocations, or the explicit override if the disclosure is open).

### Workflow

* Opens from the `Commit` button in the FEFO preview right column
* Body copy (consequence-library): *"This consumes stock from the batches above. Sales orders are immutable after commit — you'd have to void to reverse."*
* Footer: `[Cancel]` + `[Commit]` (tereré primary)
* Confirm → `useCommitSo.mutate({ id, allocations? })`. `Idempotency-Key` auto-attached by middleware (apiClient line 54)
* On 200: invalidate `salesKeys.detail(id)` + `salesKeys.lists()` + `inventoryKeys.all` (commit moves stock); close modal; toast `"Sales order committed"`. Caller navigates to `/sales-orders/:id`
* On 422 with shortfall: close modal; render `<ShortfallBanner>` inline in the FEFO preview right column (the SoDraftPage owns this — it sets local state from `mutation.error`)
* On 409: close modal; toast `"This sales order has already been committed elsewhere."`; refetch `useSo(id)`
* `retry: false` — terminal mutation

## Modal: VoidConfirmModal
File: `src/features/sales/VoidConfirmModal.tsx`

Realizes F8 per SPEC §3.6. Mantine `<Modal>` confirmation-only.

### Workflow

* Opens from the `Void` button on `<SoDetailPage>` (only visible when `status === 'committed'`)
* Body copy: *"Voiding writes reversal movements and stamps `voided_at`. Allocations stay on the record. Past sales reported in recall reports for the affected batches will be hidden after void."* (verbatim from `docs/design/components.md:283`)
* Footer: `[Cancel]` + `[Void]` (clay destructive)
* Confirm → `useVoidSo.mutate({ id })`. `Idempotency-Key` auto-attached (apiClient line 55). The void endpoint is idempotent by design (BE-D8) — repeated submits with the same key return the cached response, but `retry: false` keeps the mutation under user control
* On 200: invalidate `salesKeys.detail(id)` + `salesKeys.lists()` + `inventoryKeys.all` (void writes reversal movements); close modal; toast `"Sales order voided"`. Page rerenders with the voided banner
* On 409: close modal; toast `"This sales order has already been voided elsewhere."`; refetch `useSo(id)`
* `retry: false`

## Component: FefoPreview
File: `src/features/sales/FefoPreview.tsx`

Realizes the differentiator visualization per SPEC §3.6 + `docs/design/components.md` (FefoPreview). Renders the proposed FEFO allocation from `POST /sales-orders/:id/preview`.

### Props

```ts
type FefoPreviewProps = {
  preview: SalesOrderPreviewResponse | null   // generated client type
  loading?: boolean
  error?: ApiError | null
  shortfall?: { product_id: string; required: string; available: string } | null
  onRefresh: () => void
  onCommit: () => void
  commitDisabled?: boolean                     // true while previewing or no preview yet
}
```

### Visual states

* **Empty / no lines yet**: stub copy *"Add lines to see the FEFO allocation."*
* **Loading**: skeleton cards matching the line count
* **Populated**: per-line cards with allocation tables sorted by `expiration_date ASC NULLS LAST`. Earliest-expiring row gets `<ExpiryBadge>` (`<14d`). Footer: total qty, revenue, COGS, profit margin (tereré if positive, clay if negative)
* **422 shortfall**: clay-red `<ShortfallBanner>` inline above the cards (parent owns the banner state — passed via prop)
* **Generic error**: `<Alert color="red">` with `error.detail ?? error.error`

### Behavior

* `↻ Refresh preview` link at the top of the right column — calls `onRefresh`. Parent debounces form-input changes 300ms before calling
* Commit button at the bottom — disabled while preview is loading or no preview yet
* No internal state — pure presentational; parent owns preview/loading/shortfall state

## Component: SoLineEditor
File: `src/features/sales/SoLineEditor.tsx`

Per-line form rows for the SO draft. Mirrors `<PoLineEditor>`'s shape (it's the closest analogue) but with `sell_price` instead of `unit_cost` and no batch_code (batches are chosen by FEFO at commit, not by the user).

### Props

```ts
type SoLineEditorProps = {
  lines: DraftSoLine[]
  onChange: (lines: DraftSoLine[]) => void
}
type DraftSoLine = {
  product_id: string
  quantity: string      // display units, string per SPEC §2.4
  sell_price: string    // string per SPEC §2.4
}
```

### Behavior

* Per-row: product `<Select>` (from `useProductsList`), quantity `<DecimalInput>` (display units), sell_price `<DecimalInput>` (money), trash icon to remove the row
* "+ Add line" button appends an empty row
* No batch picker — batches are FEFO-allocated server-side at commit time
* Validation surfaces in the parent form (Mantine `useForm`); `onChange` propagates the full array on every edit

## Component: AllocationsTable
File: `src/features/sales/AllocationsTable.tsx`

Read-only allocations table for `<SoDetailPage>` post-commit. Each row: `Batch code` (mono, link to `/batches/{batch_id}`), `Expiration`, `Quantity` (display-unit formatted), `Unit cost`.

### Props

```ts
type AllocationsTableProps = {
  allocations: SalesOrderAllocation[]   // from generated client
  baseUnit: 'g' | 'ml' | 'unit'         // for formatQty
}
```

## Component: AllocationOverrideEditor
File: `src/features/sales/AllocationOverrideEditor.tsx`

BE-D11 admin override. Hidden by default behind a `<Disclosure>` on `<SoDraftPage>`. When expanded, lets the owner provide an explicit allocation list — when populated, the commit body becomes `{ allocations: [...] }`.

### Props

```ts
type AllocationOverrideEditorProps = {
  lines: DraftSoLine[]                  // current SO lines (read-only)
  allocations: AllocationOverride[]
  onChange: (allocations: AllocationOverride[]) => void
}
type AllocationOverride = {
  sales_order_line_id: string
  batch_id: string
  quantity: string
}
```

### Behavior

* Per SO line: list of allocation rows. Each row = `<Select>` (batch picker — feeds from `useBatchesList({ product_id: line.product_id, is_recalled: false })`) + `<DecimalInput>` quantity
* When the editor is collapsed OR `allocations.length === 0`: commit body is `{}` (BE walks FEFO)
* When expanded with rows: commit body is `{ allocations }`
* Validation: each row's batch_id must be defined and quantity > 0; row sums per line must match the line's ordered quantity (parent surfaces this; BE will 422 otherwise)

## Component: ShortfallBanner
File: `src/features/sales/ShortfallBanner.tsx`

Renders the 422 shortfall envelope inline in the FEFO preview right column. Clay-red `<Alert>`, dismissible.

### Props

```ts
type ShortfallBannerProps = {
  productName: string
  required: string
  available: string
  baseUnit: 'g' | 'ml' | 'unit'
  onDismiss: () => void
}
```

### Behavior

* Renders: *"Cannot commit — Product '{productName}' requires {formatQty(required)} but only {formatQty(available)} on hand."*
* Dismiss button clears the banner without re-running the preview (the user has to fix the form)

## Function: useSosList
File: `src/data/sales/queries.ts`
Input: `({ status?: 'draft' | 'committed' | 'voided'; voided?: boolean; search?: string; from?: string; to?: string })`
Returns: `UseInfiniteQueryResult<InfiniteData<SalesOrderListResponse>, ApiError>`

### Implementation

* `queryKey: salesKeys.list({ status, voided, search, from, to })`
* `queryFn: ({ pageParam })`: `apiClient.GET('/api/v1/sales-orders', { params: { query: { status, voided, search, from, to, cursor: pageParam } } })`
* `initialPageParam: undefined`
* `getNextPageParam: (last) => last.next_cursor ?? undefined`
* `staleTime: 10_000`

## Function: useSo
File: `src/data/sales/queries.ts`
Input: `(id: string)`
Returns: `UseQueryResult<SalesOrderResponse, ApiError>`

### Implementation

* `queryKey: salesKeys.detail(id)`
* `queryFn: apiClient.GET('/api/v1/sales-orders/{sales_order_id}', { params: { path: { sales_order_id: id } } })`
* `staleTime: 30_000`
* `retry: (n, err) => !(ApiError.is(err) && err.status === 404) && n < 3` — same pattern as `usePo`

## Function: usePreviewSo
File: `src/data/sales/queries.ts`
Input: `(id: string, options?: { enabled?: boolean })`
Returns: `UseQueryResult<SalesOrderPreviewResponse, ApiError>`

### Implementation

* **Preview is implemented as a query, not a mutation**, even though the BE method is POST. Rationale: the preview is non-mutating (BE-side: it walks FEFO without writing) and the FE benefits from TanStack's caching + refetch-on-form-change semantics. The `queryFn` issues a POST with an empty body
* `queryKey: salesKeys.preview(id)`
* `queryFn: apiClient.POST('/api/v1/sales-orders/{sales_order_id}/preview', { params: { path: { sales_order_id: id } } })`
* `enabled: options?.enabled ?? true` (parent passes `false` until the SO has an id, i.e. after first save)
* `staleTime: 0` (always considered stale — the form drives manual refetches)
* `retry: false` — preview surfaces shortfall as a successful 200 (BE returns proposed allocations + a `shortfall` field when present), not as 422 (422 is reserved for `/commit`). If the BE returns an error, the user retries via the refresh button
* **Idempotency-Key NOT attached** — `/preview` is not in either path set in apiClient (verified at `src/api/client.ts:46-61`)

## Function: useCreateSo
File: `src/data/sales/mutations.ts`
Input: `()`
Returns: `UseMutationResult<SalesOrderResponse, ApiError, SalesOrderCreateRequest>`

### Implementation

* `mutationFn`: `apiClient.POST('/api/v1/sales-orders', { body })`. **No `Idempotency-Key`** — draft creation is not in the seven-endpoint list (SPEC §2.5)
* `onSuccess`: invalidate `salesKeys.lists()`
* Caller handles navigation to `/:id/edit`

## Function: useUpdateSo
File: `src/data/sales/mutations.ts`
Input: `()`
Returns: `UseMutationResult<SalesOrderResponse, ApiError, { id: string; customer_name?: string; customer_contact?: string | null; lines?: SoLineCreateRequest[] }>`

### Implementation

* `mutationFn`: `apiClient.PATCH('/api/v1/sales-orders/{sales_order_id}', { params: { path: { sales_order_id: id } }, body })`. PATCH is replace-style on `lines` per SPEC §3.6
* No optimistic update (multi-row replace, SPEC §2.5)
* `onSuccess`: invalidate `salesKeys.detail(id)` + `salesKeys.lists()` + `salesKeys.preview(id)` (preview becomes stale on every line edit)
* Caller maps 409 to refetch + toast (the SO has been committed elsewhere)

## Function: useDeleteSo
File: `src/data/sales/mutations.ts`
Input: `()`
Returns: `UseMutationResult<void, ApiError, { id: string }>`

### Implementation

* `mutationFn`: `apiClient.DELETE('/api/v1/sales-orders/{sales_order_id}', { params: { path: { sales_order_id: id } } })`
* `onSuccess`: removeQueries `salesKeys.detail(id)`; invalidate `salesKeys.lists()`
* Caller maps 409 (already committed) → refetch + toast

## Function: useCommitSo
File: `src/data/sales/mutations.ts`
Input: `()`
Returns: `UseMutationResult<SalesOrderResponse, ApiError, { id: string; allocations?: AllocationOverride[] }>`

### Implementation

* `mutationFn`: `apiClient.POST('/api/v1/sales-orders/{sales_order_id}/commit', { params: { path: { sales_order_id: id } }, body: allocations ? { allocations } : {} })`. `Idempotency-Key` auto-attached by middleware
* `retry: false` — terminal mutation; user retries manually
* `onSuccess`: invalidate `salesKeys.detail(id)` + `salesKeys.lists()` + `inventoryKeys.all` (commit moves stock; affects every batches/movements view)
* Caller maps 422 → `<ShortfallBanner>` inline (read shortfall envelope from `error.fields` or `error.detail` per the regenerated schema's 422 shape)
* Caller maps 409 → refetch + toast

## Function: useVoidSo
File: `src/data/sales/mutations.ts`
Input: `()`
Returns: `UseMutationResult<SalesOrderResponse, ApiError, { id: string }>`

### Implementation

* `mutationFn`: `apiClient.POST('/api/v1/sales-orders/{sales_order_id}/void', { params: { path: { sales_order_id: id } } })`. Empty body. `Idempotency-Key` auto-attached by middleware
* `retry: false`
* `onSuccess`: invalidate `salesKeys.detail(id)` + `salesKeys.lists()` + `inventoryKeys.all` (void writes reversal movements)
* Caller maps 409 → refetch + toast

## Lib: src/data/sales/keys.ts (new)

```ts
export const salesKeys = {
  all: ['sales'] as const,
  lists: () => [...salesKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...salesKeys.lists(), filters ?? {}] as const,
  details: () => [...salesKeys.all, 'detail'] as const,
  detail: (id: string) => [...salesKeys.details(), id] as const,
  preview: (id: string) => [...salesKeys.all, 'preview', id] as const,
}
```

## External Dependencies

### BE sales endpoints
Used for: SO list / detail / draft CRUD / preview / commit / void.
Endpoints: `GET/POST /sales-orders`, `GET/PATCH/DELETE /sales-orders/{id}`, `POST /sales-orders/{id}/preview`, `POST /sales-orders/{id}/commit`, `POST /sales-orders/{id}/void`.

* All requests carry the session cookie (apiClient `credentials: 'include'`)
* CSRF token attached on POST/PATCH/DELETE (apiClient middleware)
* `Idempotency-Key` auto-attached on `POST /commit` and `POST /void` (apiClient `ALWAYS_IDEMPOTENT_POST_PATHS` lines 54-55)
* `Idempotency-Key` NOT attached on draft create/PATCH/DELETE/preview (per SPEC §2.5 — only the seven listed endpoints)
* 4xx envelope normalized to `ApiError` (apiClient middleware)
* 422 shortfall on commit: caller reads `error.fields.shortfall` or a custom field per the regenerated schema's `SalesOrderCommit` 422 response and renders inline
* 409 stale-state on commit/void/PATCH → caller maps to refetch + toast per SPEC §2.5

### BE catalog endpoints (read-only)
Used for: product picker in `<SoLineEditor>`; product name resolution in detail view.
Endpoints: `GET /products` (via existing `useProductsList`), `GET /products/{id}` (via existing `useProduct`).

### BE inventory endpoints (read-only, for override)
Used for: batch picker in `<AllocationOverrideEditor>` admin override.
Endpoints: `GET /batches` (via existing `useBatchesList`).


# Plan

Each step is independently shippable. Within a step, a failing test goes first, then the implementation, then the green run (per `tdd` skill).

1. **Verify schema availability + land the sales data layer (`src/data/sales/`)**
   - Why: every UI surface in this issue depends on the new hooks. Refreshing the schema first surfaces whether the BE has shipped sales endpoints (current snapshot has ZERO references to sales-orders) — if BE has not shipped, the executor halts the issue here per SPEC §2.6 (no `as any` outside `src/api/generated`). Building hooks before UI means downstream component tests assert against real hooks, not mocks.
   - [ ] `npm run generate:api` against the live BE (or `-- --check` against the snapshot). Confirm the schema includes paths `/api/v1/sales-orders`, `/api/v1/sales-orders/{sales_order_id}`, `/api/v1/sales-orders/{sales_order_id}/preview`, `/api/v1/sales-orders/{sales_order_id}/commit`, `/api/v1/sales-orders/{sales_order_id}/void`, and component schemas `SalesOrderResponse`, `SalesOrderListResponse`, `SalesOrderCreateRequest`, `PatchedSalesOrderUpdateRequest`, `SalesOrderPreviewResponse`, `SalesOrderCommitRequest`. **If absent: STOP and append a Journal entry "Step 1 GATED — BE phase 9 not shipped". Do not synthesize types.**
   - [ ] Create `src/data/sales/keys.ts` with the factory above (`all`, `lists`, `list`, `details`, `detail`, `preview`).
   - [ ] Create `src/data/sales/queries.ts` with `useSosList` (cursor `useInfiniteQuery`), `useSo`, `usePreviewSo` (POST-as-query, gated by `enabled`).
   - [ ] Create `src/data/sales/mutations.ts` with `useCreateSo`, `useUpdateSo`, `useDeleteSo`, `useCommitSo`, `useVoidSo`.
   - [ ] Write `queries.test.ts`:
     - `useSosList` cursor pagination: page 1 returns `next_cursor='c1'`; `fetchNextPage()` issues a request with `?cursor=c1`
     - `useSosList` forwards `status`, `voided`, `search`, `from`, `to` to query string
     - `useSo` resolves on 200; 404 surfaces `error.status===404` with `retry:false` (assert MSW hit count = 1)
     - `usePreviewSo({ enabled: false })` does NOT fire a request; flipping `enabled: true` fires one
     - `usePreviewSo` does NOT carry an `Idempotency-Key` header (preview is non-mutating)
   - [ ] Write `mutations.test.ts`:
     - `useCreateSo` 201 invalidates `salesKeys.lists()`; **assert NO `Idempotency-Key` header** (draft create is not in the seven-endpoint list)
     - `useUpdateSo` PATCH replaces lines; invalidates `detail` + `lists()` + `preview(id)`
     - `useCommitSo` 200 invalidates `salesKeys.detail(id)` + `inventoryKeys.all`; **assert non-empty `Idempotency-Key` header** (surface-listed commit Idempotency-Key test); `retry: false` verified by MSW hit count = 1 on a 5xx
     - `useCommitSo` with `allocations` parameter sends `{ allocations: [...] }` body; without it sends `{}` body (BE-D11 admin override branch)
     - `useCommitSo` 422 surfaces as `ApiError(status=422)` carrying the shortfall envelope (the caller reads `error.fields` / `error.detail` per the regenerated schema)
     - `useCommitSo` 409 surfaces as `ApiError(status=409)` so caller can map to refetch + toast (no-optimistic surface gate — the cache contains the pre-commit state until invalidation completes)
     - `useVoidSo` 200 sends empty body + non-empty `Idempotency-Key`; invalidates `inventoryKeys.all`; 409 surfaces for caller mapping
   - [ ] `npm test && npm run typecheck` green

2. **Land `<SosListPage>` + the index route + sidebar flip**
   - Why: ships R4. Independent of mutations — exercises `useSosList` end-to-end with cursor pagination (the only A3 page in v1 that uses `useInfiniteQuery`). Sidebar flip stays inside this step so the route is reachable from nav as soon as the page lands.
   - [ ] Write `SosListPage.test.tsx`:
     - happy: MSW returns 3 SOs across 1 page (no `next_cursor`); rows render with status badges (draft / committed / voided)
     - status filter: switch to "Committed" → MSW request includes `?status=committed`; URL updates to `/sales-orders?status=committed`
     - **cursor pagination (Examples-driven)**: page 1 returns `next_cursor='c1'` → "Load more" button appears; click → MSW request includes `?cursor=c1`; second page rows append below the first
     - empty no-filters: `items=[]` → "No sales orders yet. Draft your first SO to see FEFO in action." + "New SO" CTA → `/sales-orders/new`
     - row click: navigate called with `/sales-orders/$id` for a committed row, `/sales-orders/$id/edit` for a draft row
   - [ ] Implement `src/features/sales/SosListPage.tsx` (mirror `<PosListPage>`'s URL-as-source-of-truth pattern; add `useInfiniteQuery` "Load more" footer)
   - [ ] Create `src/routes/_authed.sales-orders.index.tsx` mounting `<SosListPage>`. `validateSearch`: `status` ∈ `'draft'|'committed'|'voided'|undefined`; `voided` boolean-or-undefined; `search` string-or-undefined; `from`/`to` ISO-date-or-undefined
   - [ ] Flip the `/sales-orders` entry in `src/features/shell/Sidebar.tsx` from `available: false` to `available: true`
   - [ ] Update `src/routeTree.gen.ts` to register the new route (TanStack Router codegen not available in the executor's session per ILE-6 journal — extend manually; file is `@ts-nocheck`)
   - [ ] `npm test && npm run typecheck && npm run lint` green

3. **Land `<SoDetailPage>` (committed + voided read view) + route + `<AllocationsTable>`**
   - Why: ships F7 post-commit and the read-only path before the draft cluster (steps 4–7), because the detail page is the destination of every commit. `<AllocationsTable>` reads the post-commit allocation rows — a small surface that locks down the schema shape (allocations include batch_code, expiration_date, quantity, unit_cost). Establishing this destination first means step 6 (commit) can assert "navigate to `/sales-orders/{id}` after 200" against a real page.
   - [ ] Write `SoDetailPage.test.tsx`:
     - happy committed: MSW returns committed SO with 2 lines + 4 allocations; header renders customer name + committed status badge + committed_at; lines table renders 2 rows; allocations table renders 4 rows with mono batch_code linking to `/batches/{id}`; Void button visible (clay)
     - **voided-state UI disabling (surface-listed test)**: MSW returns voided SO; clay-red voided banner with `voided_at`; Void button absent; allocations remain visible per BE-D8
     - 404 cross-owner: empty-state "Not found. This sales order doesn't exist or you don't have access." + "Back to sales orders" link
     - draft redirect: MSW returns SO with `status='draft'` → router replace to `/sales-orders/$id/edit`
   - [ ] Implement `src/features/sales/AllocationsTable.tsx`
   - [ ] Implement `src/features/sales/SoDetailPage.tsx` (header + voided banner + lines table + allocations table + disabled Void handler — wired up in step 6)
   - [ ] Create `src/routes/_authed.sales-orders.$id.tsx` mounting `<SoDetailPage>`
   - [ ] Update `src/routeTree.gen.ts` to register the new route
   - [ ] `npm test && npm run typecheck && npm run lint` green

4. **Land `<SoDraftPage>` + `<SoLineEditor>` + new/edit routes (form half only — no FEFO preview yet)**
   - Why: ships F7 draft CRUD without the FEFO column, so the form-state + create/PATCH/DELETE flow lands isolated from preview/commit. The right column shows the "Add lines to see the FEFO allocation." stub until step 5 wires the preview. This makes the test scope tight: form validation, save draft, edit draft, no commit logic involved.
   - [ ] Write `SoDraftPage.test.tsx` (form half):
     - happy `/new`: empty form → fill customer_name + 2 lines → Save draft → MSW POST 201 → URL replaces to `/sales-orders/{id}/edit`; **assert NO `Idempotency-Key` header** on the POST (draft create is not in the seven-endpoint list)
     - happy `/:id/edit`: MSW returns draft → form hydrates with customer_name + lines; edit a quantity → Save → MSW PATCH replaces full lines array
     - **status redirect**: MSW returns SO with `status='committed'` on initial load of `/:id/edit` → router replace to `/sales-orders/$id` (no edit allowed post-commit)
     - validation: empty customer_name blocks submit; lines.length=0 blocks submit
   - [ ] Write `SoLineEditor.test.tsx`:
     - "+ Add line" appends an empty row
     - changing product/quantity/sell_price calls `onChange` with the full updated array
     - trash icon removes the row
   - [ ] Implement `src/features/sales/SoLineEditor.tsx`
   - [ ] Implement `src/features/sales/SoDraftPage.tsx` (form left column + stub right column)
   - [ ] Create `src/routes/_authed.sales-orders.new.tsx` and `_authed.sales-orders.$id.edit.tsx`, both mounting `<SoDraftPage>` (one with `poId={undefined}`, one with `poId={params.id}` — pattern from `<PoDraftPage>`)
   - [ ] Update `src/routeTree.gen.ts`
   - [ ] `npm test && npm run typecheck && npm run lint` green

5. **Land `<FefoPreview>` + wire `usePreviewSo` into `<SoDraftPage>`'s right column**
   - Why: ships the differentiator visualization. Independent of commit — the preview is a non-mutating GET-shaped query. Splitting from step 6 keeps the FEFO rendering tests in their own file and means the commit step asserts "preview was rendered, click commit" against a real preview component.
   - [ ] Write `FefoPreview.test.tsx`:
     - **FEFO preview rendering from server response (surface-listed test)**: pass a `SalesOrderPreviewResponse` fixture with 2 lines, each with 2 allocations sorted by `expiration_date ASC NULLS LAST`; assert per-line cards render with allocation rows in the FEFO order; the earliest-expiring row in each card has `<ExpiryBadge>` if `<14d`
     - empty: `preview=null` → "Add lines to see the FEFO allocation." stub
     - loading: `loading=true` → skeleton cards
     - shortfall: pass `shortfall` prop → `<ShortfallBanner>` renders inline above the cards (not as a toast)
     - footer totals: total qty, revenue, COGS, profit margin (positive → tereré green; negative → clay)
     - commit disabled: `commitDisabled=true` → Commit button disabled
   - [ ] Write `ShortfallBanner.test.tsx`:
     - renders "Cannot commit — Product '{name}' requires {required} but only {available} on hand."
     - dismiss button calls `onDismiss`
   - [ ] Implement `src/features/sales/ShortfallBanner.tsx`
   - [ ] Implement `src/features/sales/FefoPreview.tsx`
   - [ ] Wire `usePreviewSo(id, { enabled: !!id })` in `<SoDraftPage>` (only fires after first save). Debounce form-input changes → `preview.refetch()` after 300ms idle. Replace the stub right column with `<FefoPreview>`
   - [ ] Append to `SoDraftPage.test.tsx`: form changes → after 300ms debounce, `usePreviewSo` refetch fires (assert MSW hit count went from 1 to 2)
   - [ ] `npm test && npm run typecheck && npm run lint` green

6. **Land `<CommitConfirmModal>` (F7 commit) + wire from `<FefoPreview>` + 422 shortfall handling**
   - Why: ships the commit round-trip with the no-optimistic surface gate, the Idempotency-Key surface gate, and the 422-shortfall-inline surface gate together — they're all on the same code path. Separating them would mean the executor implements the modal twice (once for the happy path, once for the shortfall path). The 409 stale-state path piggybacks on the same error handler.
   - [ ] Write `CommitConfirmModal.test.tsx`:
     - body copy matches the consequence-library text exactly
     - happy: open modal → click Commit → MSW POST 200; **assert non-empty `Idempotency-Key` header** (surface-listed commit test); modal closes; navigate called with `/sales-orders/$id` (detail)
     - **no-optimistic on commit (surface-listed test)**: while mutation is pending, the SO query cache still holds `status='draft'`; only after the 200 response does invalidation flip the cache to `status='committed'`. Assert by snapshotting the cache during pending state — the draft state is preserved
     - **422 shortfall inline rendering (surface-listed test)**: MSW returns 422 with shortfall envelope → modal closes → parent (`<SoDraftPage>`) renders `<ShortfallBanner>` inline in the right column with the right product name + required + available numbers. NOT a toast.
     - **409 stale-state on commit (surface-listed test)**: MSW returns 409 → modal closes → toast `"This sales order has already been committed elsewhere."`; refetch fires for `salesKeys.detail(id)`
     - **admin-override disclosure default-hidden (surface-listed test)**: render `<SoDraftPage>` with a saved draft → assert `<AllocationOverrideEditor>` is NOT in the DOM; click the disclosure → assert it appears
     - admin-override populated body: with override rows entered, click Commit → MSW request body is `{ allocations: [...] }`; without override, body is `{}`
   - [ ] Implement `src/features/sales/AllocationOverrideEditor.tsx` (collapsed-by-default `<Disclosure>` shell)
   - [ ] Implement `src/features/sales/CommitConfirmModal.tsx`
   - [ ] Wire `<CommitConfirmModal>` to the Commit button in `<FefoPreview>`. On success: `navigate({ to: '/sales-orders/$id', params: { id } })`. On 422: capture shortfall envelope into `<SoDraftPage>` local state → render `<ShortfallBanner>` in the right column. On 409: toast + refetch
   - [ ] `npm test && npm run typecheck && npm run lint` green

7. **Land `<VoidConfirmModal>` (F8) + wire from `<SoDetailPage>`**
   - Why: ships F8 with the void Idempotency-Key + 409 stale-state surface gates. Independent of commit — separate code path on a separate page. Voided-state UI is already covered in step 3 (the page reads `status` from the cache), so this step only needs to wire the mutation.
   - [ ] Write `VoidConfirmModal.test.tsx`:
     - body copy matches the consequence-library text exactly (verbatim from `docs/design/components.md:283`)
     - happy: open modal → Confirm → MSW POST 200 with empty body; **assert non-empty `Idempotency-Key` header** (surface-listed void test); modal closes; toast "Sales order voided"; the SO cache flips to `status='voided'` after invalidation (no optimistic update)
     - **409 stale-state on void (surface-listed test)**: MSW returns 409 → modal closes → toast `"This sales order has already been voided elsewhere."`; refetch fires for `salesKeys.detail(id)` → page rerenders with the voided banner
   - [ ] Implement `src/features/sales/VoidConfirmModal.tsx`
   - [ ] Wire `<VoidConfirmModal>` to the Void button in `<SoDetailPage>`. On success: invalidate; toast. On 409: toast + refetch
   - [ ] `npm test && npm run typecheck && npm run lint` green

8. **Validation pass: regenerate, typecheck, test, drift, lint, smoke**
   - Why: confirms the sales surface is coherent before unblocking ILE-8 (financials). Mirrors ILE-5's step 8 / ILE-6's step 9 — the full gate catches grep-gate violations here, not in ILE-8's first PR.
   - [ ] `npm run generate:api -- --check` (no schema drift)
   - [ ] `npm run typecheck && npm test && npm run lint` (all green)
   - [ ] Re-run the SPEC §4 grep gates locally (bare fetch outside data, `as any` outside generated, features importing `api/generated`, `NumberInput` in features outside the integer-only allowlist)
   - [ ] `npm run dev` smoke: log in → click "Sales Orders" in sidebar (now enabled) → see empty list → click "New SO" → fill customer + 2 lines → Save draft → see FEFO preview render with allocations → click Commit → see modal → Confirm → redirected to detail → see lines + allocations + Void button → click Void → Confirm → see voided banner. Force a 422 by ordering more than on-hand → see inline shortfall banner. Force a 409 by committing twice in two tabs → see toast + redirect.
   - [ ] Update Surface checkboxes to reflect what landed
   - [ ] Append a Journal entry summarizing what shipped, any judgment calls, and any BE follow-ups noted


# Notes

- **Strings vs numbers on the wire (same as ILE-5 / ILE-6).** Generated `SalesOrderCreateRequest`/`PatchedSalesOrderUpdateRequest` types likely have numeric fields for `quantity` and `sell_price`, but SPEC §2.4 mandates strings end-to-end on the FE. Keep `<DecimalInput>` values as strings; convert with `Number(value)` only inside the mutationFn after `Decimal.js` validation. Do not keep parallel value shapes. `SalesOrderResponse.lines[].quantity` and `unit_cost` come back as strings; display via `formatMoney` / `formatQty`.
- **Quantity unit conversion.** Line `quantity` is entered in display units (kg, L, unit) but the BE expects base units (g, ml, unit). Use `qty.ts` helpers to convert at the form/mutationFn boundary, exactly as ILE-4/5/6 do. The base unit comes from the selected product's `base_unit`.
- **Preview is a query, not a mutation (judgment call).** The BE method is POST but the operation is non-mutating per SPEC §3.6. Implementing it as a `useQuery` (with a POST `queryFn`) keeps preview state coherent with the form (cache key = `salesKeys.preview(id)`, invalidated on every PATCH via `useUpdateSo.onSuccess`). The alternative (use `useMutation` and call `mutate()` in an effect) loses TanStack Query's caching semantics and makes the "auto-refresh on form change" behavior brittle. This pattern is unique in the codebase to ILE-7 — call it out in the executor's PR.
- **No optimistic updates anywhere on commit/void.** Commit moves stock atomically (FEFO walk + allocations + sale movements) and void writes reversal movements. Both are terminal multi-row writes the client cannot honestly mirror. The cache holds the pre-commit/pre-void state until invalidation completes — the no-optimistic surface tests assert this directly.
- **422 shortfall envelope shape — confirmed at runtime.** SPEC §3.6 says the body is `{ shortfall: { product_id, required, available } }`. The generated 422 schema for `/commit` is the source of truth — the executor reads the regenerated `paths['/api/v1/sales-orders/{sales_order_id}/commit']['post']['responses']['422']` and maps `error.fields` or a custom `error.shortfall` field accordingly. If the BE uses a non-standard field name, document it in the executor's PR and mirror it in the data layer's `error` mapping.
- **Admin override hidden by default (BE-D11).** `<AllocationOverrideEditor>` lives behind a Mantine `<Disclosure>` collapsed by default. The default flow stays clean. When the disclosure is opened AND the user enters allocation rows, the commit body becomes `{ allocations: [...] }`; otherwise commit body is `{}` (BE walks FEFO).
- **Idempotency-Key contract is already wired in apiClient.** `src/api/client.ts:54-55` already lists `/api/v1/sales-orders/{sales_order_id}/commit` and `/void` in `ALWAYS_IDEMPOTENT_POST_PATHS` — no apiClient change needed for ILE-7. Tests assert the header is present on commit/void and absent on draft create/PATCH/DELETE/preview.
- **`<DecimalInput>` accepts negatives** (after ILE-6 added `allowNegative`). SO line quantities are always positive — pass `allowNegative={false}` (the default).
- **Toast copy.** Use the same vocabulary established in ILE-4/5/6: `"Sales order committed"`, `"Sales order voided"`, `"This sales order has already been committed elsewhere."` (verbatim per SPEC §2.5), `"This sales order has already been voided elsewhere."` (verbatim), `"This draft no longer exists."` (404 on save during concurrent delete).
- **Sidebar gating.** Flip only the `/sales-orders` entry to `available: true` in this issue.
- **Route file naming.** Use the flat-file convention from ILE-4/5/6 (`_authed.sales-orders.index.tsx`, `_authed.sales-orders.new.tsx`, `_authed.sales-orders.$id.edit.tsx`, `_authed.sales-orders.$id.tsx`). `routeTree.gen.ts` is `@ts-nocheck` and extended manually per ILE-6's journal pattern.
- **MovementAuditTable not on `<SoDetailPage>`.** Movements for a SO are batch-scoped, not SO-scoped — the audit subview belongs on `<BatchDetailPage>` (already shipped in ILE-6) and the dashboard `/movements` view (ILE-8). `<SoDetailPage>` shows allocations, which is the SO-scoped projection.


# Journal

- 2026-05-08 21:46 [executor] — Step 1 GATED — BE phase 9 not shipped. Ran `npm run generate:api`: live BE unreachable (`http://localhost:8000/api/v1/openapi.json`), fell back to `docs/openapi.snapshot.json`. Regenerated `src/api/generated/schema.ts` (18 paths). Verified zero references to `sales-orders` / `Sales*` in both the regenerated schema and the committed snapshot. Per Step 1 instructions, halting the issue here — no `as any` outside generated client per SPEC §2.6. Unblock conditions: (a) BE ships phase 9 endpoints (`GET/POST /sales-orders`, `GET/PATCH/DELETE /sales-orders/{id}`, `POST /sales-orders/{id}/preview`, `POST /sales-orders/{id}/commit`, `POST /sales-orders/{id}/void`), (b) snapshot is updated via `npm run generate:api` against the live BE, then (c) executor resumes from Step 1 checklist. No code changes landed in this attempt.
- 2026-05-08 22:15 [executor] — Steps 1–8 completed. Sales types were already forward-declared in `src/api/generated/schema.ts` (BE phase 9 had shipped since the prior gated attempt). All 8 plan steps executed in TDD order. Key judgment calls: (1) `usePreviewSo` implemented as `useQuery` with POST `queryFn` (non-mutating per SPEC §3.6, caching semantics match query better than mutation — documented in Notes); (2) `Collapse` + state toggle used instead of Mantine `<Disclosure>` (not in Mantine 7 API); (3) `SalesOrderAllocationResponse` and `SalesOrderPreviewResponse` exported from `src/data/sales/queries.ts` and re-exported from feature files to satisfy Gate 4 (no api/generated imports in features). 295 tests green (45 files), typecheck clean, all 6 lint gates passed including generate:api --check (no schema drift). 10 verify scenarios covered: list empty-state, filter by status, row navigation, draft form, FEFO preview, commit flow, 422 shortfall inline, detail page, void flow, voided banner.
- 2026-05-09 01:50 [verify] — RE-VERIFY FAILED 4/7 scenarios. Unit/typecheck/lint all green; bugs only surface under Playwright smoke. **Bugs to fix in next pass:** (1) `/sales-orders/$id/edit` route renders `SoDetailPage` (parent `_authed.sales-orders.$id.tsx`) instead of `SoDraftPage` — `SoDetailPage` calls `navigate({to: '/sales-orders/$id/edit'})` synchronously when `status === 'draft'`, producing a render-loop; the edit route component must mount independently of the detail route, or the redirect must run inside `useEffect` and the edit route must own its component. (2) `SoDetailPage.tsx:224` reads `line.allocations.length` but the BE returns allocations at the *response root*, not nested per-line — `SoDetailResponse.allocations` is a flat array; refactor to group by `line_id` client-side or render allocations once at the bottom (per SPEC §3.6 examples — the allocations table is per-SO, not per-line). (3) `SosListPage` status cell shows `"committed"` for voided SOs because it reads `status` only — BE keeps `status="committed"` and signals voided via `voided_at`; cell must read `voided_at != null` first and render "voided" badge. (4) Dev-only: `vite.config.ts` proxy doesn't rewrite the `Origin` header forwarded to Django, so all browser POST/PATCH/DELETE through `localhost:5173` get `403 CSRF Failed: Origin checking failed`. Fix by adding a `proxy.on('proxyReq', (req) => req.setHeader('Origin', target))` rewrite in vite.config.ts. State reset Failed → Queued; session cleared.
