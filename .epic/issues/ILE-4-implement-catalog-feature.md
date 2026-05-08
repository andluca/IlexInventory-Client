---
id: ILE-4
github_id: null
status: completed
assignee: null
state: Done
type: item
depends_on: [ILE-3]
completed_at: "2026-05-08"
---

# ILE-4 Implement Catalog (products) feature

## Overview

Land the Products list (`/products`) and Product detail (`/products/:id`) pages with full CRUD per SPEC §3.3: dense sortable Mantine table with name/SKU search and `archived={true,false}` filter, inline "New product" modal (name, SKU, description, base_unit ∈ `g`/`ml`/`unit`), and Product detail with editable name/description, SKU read-only (the BE `PatchedProductUpdateRequest` accepts only `name`/`description` — see Notes), archive vs. hard-delete affordances respecting the BE 409 contract (archive when batches exist; hard delete when none), and the Movement audit (R6) subview filtered by `product_id` with date-range (`from`/`to`) + `kind` filters per SPEC §3.5. Implement the cross-cutting CSV import modal (`POST /products/import` with `Idempotency-Key`, per-row error rendering in a dismissible panel).

## Surface

- [x] `src/routes/_authed.products.index.tsx`, `_authed.products.$id.tsx`
- [x] `src/features/catalog/ProductsListPage.tsx`, `ProductDetailPage.tsx`, `NewProductModal.tsx`, `ImportCsvModal.tsx`, `ArchiveConfirmModal.tsx`, `DeleteConfirmModal.tsx`
- [x] `src/components/MovementAuditTable.tsx` (shared — also consumed by ILE-6)
- [x] `src/data/catalog/queries.ts`, `mutations.ts`, `keys.ts`
- [x] `src/data/inventory/queries.ts` (movements query + batches-by-product existence helper — both shared with ILE-6; land here first)
- [x] Sidebar: flip the `/products` entry from "Coming soon" disabled to enabled (in `src/features/shell/Sidebar.tsx`)
- [x] Tests: list pagination + filter, SKU read-only UX, archive vs delete branching, CSV import with Idempotency-Key + per-row errors, 404 on cross-owner detail, optimistic update on name/description PATCH only, MovementAuditTable filter wiring

## Dependencies

- ILE-3 (app shell + auth)
- BE phase 6 (catalog endpoints live) — already done per BE status (ILEX-004 completed).


# Specification

## Page: Products list
File: `src/routes/_authed.products.index.tsx` (route) + `src/features/catalog/ProductsListPage.tsx` (component)

Lists every product owned by the current user (single-tenant per BE-D4). Realizes R1 (read view) per SPEC §3.3. Layout archetype A3 (List with filters): page header (H1 "Products", search input, "Import CSV" secondary button, "New product" primary button), segmented archived filter (`Active / Archived / All`), dense Mantine `<Table>`, offset pagination footer ("Showing N–M of T · Previous · Next").

### Preconditions

* User is authenticated (the route is under `_authed`)
* BE catalog endpoints reachable at `${VITE_API_BASE_URL}/products`

### Primary Use Case — list, filter, search, paginate

#### Workflow
* User visits `/products`
* `useProductsList({ search, archived, page, limit })` reads from URL search params (TanStack Router `Route.useSearch()`); defaults: `search=''`, `archived=false` (active only), `page=1`, `limit=50`
* Mantine table renders columns: `SKU` (JetBrains Mono), `Name`, `Base unit`, `Description`, `Archived` (badge when truthy)
* Row click → `navigate({ to: '/products/$id', params: { id: row.id } })`
* Search input is debounced 250 ms; updates `?search=` in URL search
* Archived `SegmentedControl` updates `?archived=` in URL search (`'false' | 'true' | undefined` for All)
* Pagination footer updates `?page=` in URL search

#### Output
* URL is `/products?search=foo&archived=false&page=2`
* Table shows rows from `data.items`; footer shows `Showing 51–80 of 132`

### Edge Case — empty list

* When `total === 0` and there are no active filters: render `<EmptyState>` with copy "No products yet. Create one or import from CSV." and the two primary actions ("New product", "Import CSV")
* When `total === 0` but a `search` or `archived` filter is active: render `<EmptyState>` with copy "No products match these filters. Clear filters?" + a "Clear filters" link

### Edge Case — server error

* On any non-2xx, render `<Alert color="red">` above the table with `error.detail ?? error.error`
* Pagination + filters remain interactive so the user can adjust and retry; the underlying `useProductsList` retries per TanStack defaults

### "New product" modal — F2

#### Workflow
* User clicks **New product** → `<NewProductModal>` opens with an empty `useForm({ name, sku, description, base_unit })`
* Fields: `name` (required, ≥1 char), `sku` (required, ≥1 char, displayed in mono), `description` (optional), `base_unit` (Mantine `<Select>` with options `g / ml / unit` — required)
* Submit → `useCreateProduct` calls `POST /api/v1/products`
* On 200: invalidate `catalogKeys.list()`; close modal; toast "Product created"
* On 409 `duplicate_sku` (or `fields.sku`): map onto `form.setErrors({ sku: 'Already in use' })`; modal stays open
* On 400 `validation_error`: map `error.fields` onto `form.setErrors(...)`

### "Import CSV" modal — F2 + F11

#### Workflow
* User clicks **Import CSV** → `<ImportCsvModal>` opens
* Body: drop-zone or `<FileInput accept=".csv">` + brief copy ("CSV columns: sku, name, description, base_unit. Existing SKUs are skipped.")
* On submit, the FE builds a `FormData` and calls `useImportProducts(formData)` which POSTs to `/api/v1/products/import` (multipart). The `Idempotency-Key` header is auto-attached by the API client middleware (already wired in ILE-2 — `/api/v1/products/import` is in `ALWAYS_IDEMPOTENT_POST_PATHS`)
* On 200: render the response (`ProductImportResponse`):
  - Top: green summary "Imported {imported} products"
  - If `failed.length > 0`: a dismissible `<Alert color="amber">` panel listing each `FailedRowResponse` as `Row {row_index}: {error} — {detail}` (and any `fields` summarized inline). Panel has a "Copy errors" button so the owner can paste them into a CSV editor
  - "Done" button closes the modal; on close, invalidate `catalogKeys.list()`
* On 400: render `<Alert color="red">` with `error.detail` and stay open

### Modes

* **Floor mode** — table row height switches via the existing Tailwind `floor:h-row-floor` token; no other catalog-specific changes

### Examples

* Visit `/products`; See: `<EmptyState>` "No products yet"; Click "New product"; Submit `{ name: "Yerba Premium", sku: "YRB-001", base_unit: "g" }`; See: row `YRB-001 · Yerba Premium · g`; URL still `/products`
* Visit `/products?search=yrb`; See: filtered rows; Clear search; See: full list
* Visit `/products` with 132 active products; Click `Next`; See: URL `?page=2`, rows 51–100

## Page: Product detail
File: `src/routes/_authed.products.$id.tsx` + `src/features/catalog/ProductDetailPage.tsx`

Realizes R1 (single-product view) + R6 (movement audit filtered by product). Archetype A4 (Detail with action bar). Composed of `<DetailHeader>`-style title + meta pill row, `<ActionBar>`-style row with Edit / Archive / Delete, an editable "Details" form (name + description), and the Movement audit subview.

### Preconditions

* `:id` route param is a UUID
* User is authenticated and owns the product (else 404 → "Not found", per BE-D4 cross-owner contract)

### Primary Use Case — view + edit

#### Workflow
* User visits `/products/{id}`
* `useProduct(id)` resolves the product
* `useBatchesByProduct(id, { limit: 1 })` resolves whether any batch exists (drives archive vs. delete affordance — see Edge Cases)
* Header: `<Title order={2}>{name}</Title>`, mono SKU subtitle, pill row `Base unit: g` + (if archived) `<Badge color="gray">Archived</Badge>`
* "Details" card: `<TextInput value={name}>` (editable), `<TextInput value={sku} disabled>` (always read-only — see Notes), `<Textarea value={description}>` (editable). Save button (only enabled when `form.isDirty()`) → `useUpdateProduct({ id, name, description })`
* On 200: optimistic update is applied at submit time (single-row PATCH on display fields only, per SPEC §2.5 — name + description are the only patchable fields; nothing derived depends on them); on success the cache is overwritten with the server response so any clock skew on `updated_at` is reconciled
* On 400: roll back the optimistic update; map `error.fields` onto `form.setErrors`
* Movement audit subview at the bottom — `<MovementAuditTable productId={id}>` (see Component spec below)

### Edge Case — archive vs delete branching (BE 409 contract)

#### Workflow
* `useBatchesByProduct(id, { limit: 1 })` decides which destructive button renders
  - `data.total === 0` → render **Delete** (primary destructive) → `<DeleteConfirmModal>` → `useDeleteProduct(id)` → on 200/204 invalidate `catalogKeys.all` and `navigate({ to: '/products' })` with success toast
  - `data.total > 0` → render **Archive** → `<ArchiveConfirmModal>` → `useArchiveProduct(id)` → on 200 invalidate `catalogKeys.detail(id)` + `catalogKeys.list()`; product detail re-renders with the `Archived` badge
* Defensive race: if the batches existence query is stale and the user clicks the wrong action, the BE returns 409
  - `archive` 409 → toast "This product has no batches — delete it instead." + refetch `useBatchesByProduct` + flip the affordance
  - `delete` 409 → toast "This product already has batches — archive it instead." + refetch + flip the affordance

### Edge Case — 404 cross-owner

#### Workflow
* User pastes another owner's product URL
* `useProduct(id)` errors with `ApiError(status=404)`
* Page renders `<EmptyState title="Not found" description="This product doesn't exist or you don't have access." />` with a "Back to products" link. Do not distinguish between never-existed and cross-owner (BE-D4)

### Edge Case — already archived

* If `archived_at !== null`: hide the archive button; show a "Restore" affordance only if BE supports it (it does **not** in v1 — out of scope, per `endpoints.md`). Render `<Badge color="gray">Archived</Badge>` and the description/name remain editable (PATCH still works on archived rows per BE schema)

### Examples

* Visit `/products/abc`; See: header with name, mono SKU, base_unit pill; the "Save" button is disabled (form not dirty)
* Click "Edit name" → type → click "Save"; See: optimistic update flashes; toast "Saved"
* Click **Delete** (when no batches); confirm modal; See: redirect to `/products`, toast "Deleted"
* Click **Archive** (when batches exist); confirm modal; See: page re-renders with `Archived` badge

## Component: MovementAuditTable
File: `src/components/MovementAuditTable.tsx`

Shared subview for R6 (movement audit). Used here filtered by `product_id`; consumed by ILE-6's batch detail page filtered by `batch_id`. Pagination via `useInfiniteQuery` (cursor-paginated `/movements`).

### Props

```ts
type MovementAuditTableProps = {
  productId?: string  // exactly one of productId/batchId is required
  batchId?: string
}
```

### Visual states

* Filter row: date-range picker (`from`/`to`, two `<DateInput>`s), `kind` `<Select>` with `All / receipt / sale / adjustment / write_off / recall_block / recall_unblock / metadata_correction`
* Table columns: `Created at` (ISO `2024-12-15 09:23:41`, sortable display only — server orders desc by `created_at`), `Kind` (colored: receipt = tereré, sale = text, adjustment = amber, write_off = clay, recall_* = clay outline, metadata_correction = gray), `Quantity` (signed mono), `Notes`, `Reference`
* Empty: `<EmptyState>` "No movements in this range."
* Error: `<Alert color="red">` with `error.detail`
* "Load more" button at the bottom while `hasNextPage` (cursor-paginated)

### Behavior

* Filters update local state (or URL search if a query layer exists — keep local for v1; product detail's filters won't survive route navigation but that's fine for v1)
* `useMovements({ product_id?, batch_id?, from?, to?, kind? })` is called with the resolved filter set; `from`/`to` formatted as ISO date strings (`YYYY-MM-DD`); `kind` omitted on `All`

## Function: useProductsList
File: `src/data/catalog/queries.ts`
Input: `({ search?: string; archived?: boolean; page?: number; limit?: number })`
Returns: `UseQueryResult<ProductListResponse, ApiError>`

### Implementation

* `queryKey: catalogKeys.list({ search, archived, page, limit })`
* `queryFn`: `apiClient.GET('/api/v1/products', { params: { query: { search, archived, limit, offset: (page-1) * limit } } })`. The generated client is the only HTTP entry — no bare fetch
* `keepPreviousData: true` (smooth pagination)
* `staleTime: 30_000`

## Function: useProduct
File: `src/data/catalog/queries.ts`
Input: `(id: string)`
Returns: `UseQueryResult<ProductResponse, ApiError>`

### Implementation

* `queryKey: catalogKeys.detail(id)`
* `queryFn`: `apiClient.GET('/api/v1/products/{product_id}', { params: { path: { product_id: id } } })`
* `retry: false` on a 404 (don't mask the cross-owner case with retries) — wrap in a custom `retry` predicate

## Function: useCreateProduct
File: `src/data/catalog/mutations.ts`
Input: `()`
Returns: `UseMutationResult<ProductResponse, ApiError, ProductCreateRequest>`

### Implementation

* `mutationFn`: `apiClient.POST('/api/v1/products', { body: { sku, name, description, base_unit } })`
* `onSuccess`: `queryClient.invalidateQueries({ queryKey: catalogKeys.list() })`
* No idempotency key (not in the seven required endpoints)
* No optimistic update (creation reads back server-derived `id`/`created_at`)

## Function: useUpdateProduct
File: `src/data/catalog/mutations.ts`
Input: `()`
Returns: `UseMutationResult<ProductResponse, ApiError, { id: string; name?: string; description?: string }>`

### Implementation

* `mutationFn`: `apiClient.PATCH('/api/v1/products/{product_id}', { params: { path: { product_id: id } }, body: { name, description } })`
* **Optimistic update** (per SPEC §2.5 — single-row PATCH, no derived projections):
  - `onMutate`: cancel outstanding `catalogKeys.detail(id)`, snapshot prior, write merged optimistic value
  - `onError`: roll back to snapshot
  - `onSettled`: invalidate `catalogKeys.detail(id)` and `catalogKeys.list()`
* No idempotency key

## Function: useArchiveProduct
File: `src/data/catalog/mutations.ts`
Input: `()`
Returns: `UseMutationResult<ProductResponse, ApiError, { id: string }>`

### Implementation

* `mutationFn`: `apiClient.POST('/api/v1/products/{product_id}/archive', { params: { path: { product_id: id } } })`
* `onSuccess`: invalidate `catalogKeys.detail(id)` + `catalogKeys.list()`
* On 409: caller (the page) maps to a refetch of `useBatchesByProduct` + toast (see Edge Cases)
* No idempotency key (the endpoint is not in the seven required, and archive is naturally idempotent — `archived_at` set or already set)

## Function: useDeleteProduct
File: `src/data/catalog/mutations.ts`
Input: `()`
Returns: `UseMutationResult<void, ApiError, { id: string }>`

### Implementation

* `mutationFn`: `apiClient.DELETE('/api/v1/products/{product_id}', { params: { path: { product_id: id } } })` (204)
* `onSuccess`: `queryClient.removeQueries({ queryKey: catalogKeys.detail(id) })` and invalidate `catalogKeys.list()`
* On 409: caller maps to "archive instead" toast + flip affordance

## Function: useImportProducts
File: `src/data/catalog/mutations.ts`
Input: `()`
Returns: `UseMutationResult<ProductImportResponse, ApiError, FormData>`

### Implementation

* `mutationFn`: builds a `Request` with the `FormData` and lets the API client middleware attach `Idempotency-Key` automatically (the path `/api/v1/products/import` is in `ALWAYS_IDEMPOTENT_POST_PATHS`)
* TanStack Query retry behavior: keep TQ `retry: false` for this mutation since the modal lets the user manually re-submit; for client-side network blips, BE's idempotency cache returns the same body
* `onSuccess`: caller invalidates `catalogKeys.list()` after the modal is closed (so the user can read the per-row errors before the table refetches)

## Function: useMovements
File: `src/data/inventory/queries.ts`
Input: `({ product_id?: string; batch_id?: string; from?: string; to?: string; kind?: string })`
Returns: `UseInfiniteQueryResult<MovementListResponse, ApiError>`

### Implementation

* `queryKey: inventoryKeys.movements({ product_id, batch_id, from, to, kind })`
* `queryFn`: `apiClient.GET('/api/v1/movements', { params: { query: { ...filters, cursor: pageParam } } })`
* `getNextPageParam: (last) => last.next_cursor ?? undefined`
* `staleTime: 10_000`
* Caller is the `<MovementAuditTable>` component; passes through filter state

## Function: useBatchesByProduct
File: `src/data/inventory/queries.ts`
Input: `(productId: string, opts?: { limit?: number })`
Returns: `UseQueryResult<BatchListResponse, ApiError>`

### Implementation

* Existence-check helper for the archive-vs-delete branching on the product detail page. ILE-6 will replace this with a richer batches-list hook; v1 just needs to know whether `total > 0`
* `queryKey: inventoryKeys.batchesByProduct(productId, opts)`
* `queryFn`: `apiClient.GET('/api/v1/batches', { params: { query: { product_id: productId, limit: opts?.limit ?? 1, offset: 0 } } })`
* `staleTime: 30_000`
* Note: the schema's `BatchListResponse` typing lives in `src/api/generated/schema.ts`. Do **not** hand-write a parallel type

## Lib: src/data/catalog/keys.ts

```ts
export const catalogKeys = {
  all: ['catalog'] as const,
  lists: () => [...catalogKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...catalogKeys.lists(), filters ?? {}] as const,
  details: () => [...catalogKeys.all, 'detail'] as const,
  detail: (id: string) => [...catalogKeys.details(), id] as const,
}
```

## Lib: src/data/inventory/keys.ts

```ts
export const inventoryKeys = {
  all: ['inventory'] as const,
  movements: (filters?: Record<string, unknown>) => [...inventoryKeys.all, 'movements', filters ?? {}] as const,
  batchesByProduct: (productId: string, opts?: Record<string, unknown>) =>
    [...inventoryKeys.all, 'batchesByProduct', productId, opts ?? {}] as const,
}
```

## External Dependencies

### BE catalog endpoints
Used for: products CRUD + CSV import.
Endpoints: `GET/POST /products`, `GET/PATCH/DELETE /products/{id}`, `POST /products/{id}/archive`, `POST /products/import`.

* All requests carry the session cookie (apiClient `credentials: 'include'`)
* CSRF token attached on POST/PATCH/DELETE (apiClient middleware)
* `POST /products/import` carries `Idempotency-Key` (apiClient middleware)
* 4xx envelope `{ error, detail?, fields? }` normalized to `ApiError` (apiClient middleware)

### BE inventory endpoints
Used for: movement audit + batches existence check.
Endpoints: `GET /movements`, `GET /batches`.

* Cursor pagination on `/movements` (`next_cursor`)
* Offset pagination on `/batches`


# Plan

Each step is independently shippable. Within a step, a failing test goes first, then the implementation, then the green run (per `tdd` skill).

1. **Land the catalog data layer (`src/data/catalog/`)**
   - Why: every UI surface in this issue depends on `useProductsList` / `useProduct` / `useCreateProduct` / `useUpdateProduct` / `useArchiveProduct` / `useDeleteProduct` / `useImportProducts`. Building hooks first means downstream UI tests assert against real hooks, not mocks. Also confirms the generated `ProductCreateRequest` / `PatchedProductUpdateRequest` types flow through cleanly.
   - [ ] Create `src/data/catalog/keys.ts` per Specification
   - [ ] Create `src/data/catalog/queries.ts` with `useProductsList` and `useProduct`
   - [ ] Create `src/data/catalog/mutations.ts` with the five mutations
   - [ ] Write `queries.test.ts`: MSW handlers covering `GET /products` 200 with paginated body; `useProductsList({ search, archived, page })` resolves with the mapped items; `GET /products/:id` 404 lands `error.status === 404`; `retry: false` on 404 (assert MSW only hit once)
   - [ ] Write `mutations.test.ts`: `useCreateProduct` 200 invalidates `catalogKeys.list()`; `useCreateProduct` 409 `duplicate_sku` exposes `error.fields.sku`; `useUpdateProduct` applies optimistic update on `onMutate`, rolls back on error; `useArchiveProduct` 200 invalidates detail+list; `useDeleteProduct` 204 removes detail from cache; `useImportProducts` returns the `ProductImportResponse` body verbatim and the Idempotency-Key header was sent (assert via MSW request inspection)
   - [ ] `npm test && npm run typecheck` green

2. **Land the inventory data layer scaffold (`src/data/inventory/`)**
   - Why: catalog product detail needs `useBatchesByProduct` for the archive-vs-delete branch and `useMovements` for the audit subview. Land both hooks here (the surface explicitly assigns the file to this issue) so ILE-6 can extend rather than introduce.
   - [ ] Create `src/data/inventory/keys.ts` per Specification
   - [ ] Create `src/data/inventory/queries.ts` with `useMovements` (cursor `useInfiniteQuery`) and `useBatchesByProduct`
   - [ ] Write `queries.test.ts`: `useMovements` paginates via `next_cursor`; filters (`product_id`, `from`, `to`, `kind`) are passed through to the query string; `useBatchesByProduct` returns `total` from the BE response; both hooks normalize errors to `ApiError`
   - [ ] `npm test && npm run typecheck` green

3. **Land `<MovementAuditTable>` shared component**
   - Why: needed by both this issue (product detail) and ILE-6 (batch detail). Building it once, with prop-driven filter scope (`productId | batchId`), avoids duplication in ILE-6.
   - [ ] Write `MovementAuditTable.test.tsx`: mount with `productId="abc"`; MSW returns two movements (one `receipt`, one `adjustment`); rows render with kind colors and signed quantity; date-range filter writes `?from`/`?to` into the network request (assert via MSW); `kind` filter `'adjustment'` propagates; "Load more" button visible when `next_cursor !== null`, hidden when null; clicking calls `fetchNextPage`; empty list renders `<EmptyState>`
   - [ ] Implement `src/components/MovementAuditTable.tsx`. Use Mantine `<Table>`, `<DateInput>` (×2), `<Select>` for kind. Color the `Kind` column by mapping kind → Mantine color via a small inline switch (no shared `<StatusBadge>` yet; ILE-6 may extract it later)
   - [ ] `npm test && npm run typecheck && npm run lint` green

4. **Land `<ProductsListPage>` + `<NewProductModal>` + the route**
   - Why: ships the first half of SPEC §3.3. Combining list + create modal in one step is justified — the empty-state CTA is the same button as the page-header CTA; building them together avoids two passes through the layout.
   - [ ] Write `ProductsListPage.test.tsx`:
     - happy: MSW returns `{ items: [...], total: 80, limit: 50, offset: 0 }`; rows render; click row → `navigate` called with the product id
     - search: type "yrb" in search → debounced 250 ms → MSW request includes `?search=yrb`
     - archived filter: click `Archived` segment → MSW request includes `?archived=true`
     - pagination: click `Next` → URL becomes `?page=2`; MSW request includes `?offset=50`
     - empty no-filters: `total=0` and no filters → `<EmptyState>` "No products yet" + the two CTAs
     - empty with filters: `total=0` and `search=foo` → `<EmptyState>` "No products match these filters" + "Clear filters"
   - [ ] Write `NewProductModal.test.tsx`:
     - happy: fill all fields, submit, MSW 200 → modal closes + `catalogKeys.list()` invalidated (assert via spy on QC)
     - validation: submit empty form → "Name is required" / "SKU is required" / "Base unit is required" inline errors
     - 409 `duplicate_sku`: BE returns `{ error: 'duplicate_sku', fields: { sku: 'Already in use' } }` → field-level error renders under SKU; modal stays open
   - [ ] Implement `src/features/catalog/NewProductModal.tsx` (Mantine `<Modal>` + `useForm`)
   - [ ] Implement `src/features/catalog/ProductsListPage.tsx` (page header, segmented filter, debounced search, Mantine `<Table>`, pagination footer)
   - [ ] Create `src/routes/_authed.products.index.tsx` mounting `<ProductsListPage>` (use `Route.useSearch()` for `search`/`archived`/`page` params, with a `validateSearch` schema rejecting non-numeric `page` and other-than-`true|false|undefined` `archived`)
   - [ ] Flip `Sidebar.tsx`'s `/products` entry from `available: false` to `available: true` (drops the "Coming soon" tooltip)
   - [ ] `npm test && npm run typecheck && npm run lint` green

5. **Land `<ImportCsvModal>`**
   - Why: cross-cutting modal called out in SPEC §3.3 + §3.9. Carving it into its own step keeps the per-row errors UX testable in isolation and lets the executor confirm the Idempotency-Key flow end-to-end.
   - [ ] Write `ImportCsvModal.test.tsx`:
     - happy: pick a `File` (jsdom `File` mock), submit, MSW returns `{ imported: 5, failed: [] }`; success summary "Imported 5 products" renders; "Done" closes the modal
     - per-row errors: MSW returns `{ imported: 3, failed: [{ row_index: 4, error: 'duplicate_sku', detail: 'SKU YRB-001 already exists', fields: { sku: ['Already in use'] } }, ...] }`; the panel renders all failed rows; "Copy errors" copies a CSV-friendly text to clipboard (mock `navigator.clipboard.writeText`)
     - 400: MSW returns `{ error: 'invalid_csv', detail: 'CSV header row missing' }` → `<Alert color="red">` with that detail; modal stays open
     - assert via MSW request inspection that `Idempotency-Key` header is present on the `/products/import` request (the apiClient middleware injects it; the test confirms wiring)
   - [ ] Implement `src/features/catalog/ImportCsvModal.tsx`
   - [ ] Wire the "Import CSV" button in `<ProductsListPage>` to open the modal; on close after a successful import, invalidate `catalogKeys.list()`
   - [ ] `npm test && npm run typecheck && npm run lint` green

6. **Land `<ProductDetailPage>` (read + edit) + the route**
   - Why: detail-page editing is independent of the destructive flows (which depend on the batches existence query and the confirm modals). Landing the read+edit half first proves `useProduct` and `useUpdateProduct` work; step 7 layers the destructive flow on top.
   - [ ] Write `ProductDetailPage.test.tsx` (read+edit only):
     - happy: MSW returns the product; header renders name + mono SKU + base_unit pill; SKU input is rendered with `disabled` attribute (UI-disabled state per Notes); Save button disabled until form dirty
     - edit: type into name, click Save; MSW PATCH returns updated product; optimistic update flashes (assert via QC cache snapshot mid-flight); toast renders
     - PATCH 400 with `fields.name`: optimistic update rolls back; field-level error renders
     - 404 cross-owner: MSW returns 404 → `<EmptyState>` "Not found"; no edit affordance
   - [ ] Implement `src/features/catalog/ProductDetailPage.tsx` (the editable form half — leave a placeholder for the destructive action bar, e.g. an empty `<Group>`); skip the audit subview for now
   - [ ] Create `src/routes/_authed.products.$id.tsx` mounting `<ProductDetailPage>`
   - [ ] `npm test && npm run typecheck && npm run lint` green

7. **Land archive vs. delete affordances + confirm modals**
   - Why: closes the destructive-action loop on product detail. The branching depends on `useBatchesByProduct` (already built in step 2). Splitting from step 6 keeps the diff small and the BE 409 race coverage in its own test file.
   - [ ] Write `ArchiveConfirmModal.test.tsx`: mount → click "Archive" → MSW 200 → mutation invokes `useArchiveProduct`; on close, `navigate` is **not** called (archive keeps the user on the page); on 409 → toast "This product has no batches — delete it instead." (matches SPEC §3.3 + the BE 409 contract); the helper query refetches and the affordance flips
   - [ ] Write `DeleteConfirmModal.test.tsx`: similar shape; on success → `navigate` to `/products`; on 409 → toast "This product already has batches — archive it instead."
   - [ ] Extend `ProductDetailPage.test.tsx`: when `useBatchesByProduct` returns `total === 0`, the action bar shows **Delete**; when `total > 0`, shows **Archive**; when the batches query is `loading`, both buttons render disabled (avoid flashing the wrong affordance during initial load)
   - [ ] Implement `src/features/catalog/ArchiveConfirmModal.tsx` and `DeleteConfirmModal.tsx` (small wrappers over Mantine `<Modal>` + `<Button color="red">` for delete / `color="orange"` for archive)
   - [ ] Wire them into `<ProductDetailPage>` driven by `useBatchesByProduct`
   - [ ] `npm test && npm run typecheck && npm run lint` green

8. **Wire the Movement audit subview into `<ProductDetailPage>`**
   - Why: SPEC §3.3 calls for R6 audit on the product detail page filtered by `product_id`. The shared `<MovementAuditTable>` already exists (step 3); this step is just the mount + a regression test confirming the filter scope is wired correctly.
   - [ ] Extend `ProductDetailPage.test.tsx`: assert `<MovementAuditTable>` is rendered with `productId={id}`; MSW for `/movements?product_id=:id` returns two rows; assert they render below the action bar
   - [ ] Mount `<MovementAuditTable productId={id} />` at the bottom of `<ProductDetailPage>`
   - [ ] `npm test && npm run typecheck && npm run lint` green

9. **Validation pass: regenerate, typecheck, test, drift, lint, smoke**
   - Why: confirms the catalog surface is coherent before unblocking ILE-5. Mirrors ILE-3's step 8 — run the full gate so any module-resolution or grep-gate violation surfaces here, not in ILE-5's first PR.
   - [ ] `npm run generate:api -- --check` (no schema drift)
   - [ ] `npm run typecheck && npm test && npm run lint` (all green)
   - [ ] Re-run the SPEC §4 grep gates locally (bare fetch outside data, `as any` outside generated, features importing `api/generated`, `NumberInput` in features) — expect 0 hits
   - [ ] `npm run dev` smoke: log in → click "Products" in sidebar (now enabled) → `<EmptyState>` if account empty, else table → click "New product" → create one → see row → click row → land on detail → edit name → save → click destructive action (Delete since no batches yet) → land back on `/products` empty → click "Import CSV" → upload a 3-row test CSV (one row with a duplicate SKU) → see the per-row error panel → close → see the imported rows in the table
   - [ ] Update Surface checkboxes to reflect what landed
   - [ ] Append a Journal entry summarizing what shipped and any judgment calls (e.g., whether `_authed.products.*` flat-file convention or nested directory was used; whether the batches existence query stays in `inventory/queries.ts` or got promoted to a richer hook ahead of ILE-6)


# Notes

- **SKU is always read-only on detail.** SPEC §3.3 says "SKU locked once first batch exists" but the BE's `PatchedProductUpdateRequest` (verified in `src/api/generated/schema.ts`) only accepts `name` and `description` — `sku` is rejected outright by the serializer. The UI therefore renders `sku` `disabled` for **all** products, archived or not, regardless of whether batches exist. The "first batch exists" framing remains accurate as the conceptual rationale (the BE locked it because changing SKU after batches would orphan downstream references), but the UI doesn't need a runtime branch. If the BE ever opens a pre-batch SKU edit, this becomes a one-line change behind a `useBatchesByProduct().data?.total === 0` guard.
- **Archive vs delete needs an existence check.** The product schema does not ship a `has_batches` field, so the page calls `useBatchesByProduct(id, { limit: 1 })` to read `total`. This is `inventory/queries.ts` territory by domain; ILE-6 will extend the file with a full batches list hook. Keeping the existence helper minimal here means ILE-6 doesn't need to refactor — it just adds new hooks alongside.
- **Optimistic update scope.** Per SPEC §2.5, optimistic updates are reserved for trivial single-row PATCHes on display fields with no derived projections. `useUpdateProduct` is the canonical fit (only `name` + `description` patchable). Do **not** add optimistic updates to archive/delete (they're terminal) or to import (multi-row, server-derived ids).
- **CSV import multipart.** The OpenAPI schema ships `requestBody?: never` for `/products/import` (the multipart shape isn't expressed in the generated client). The data hook builds a `Request` directly from `FormData` and lets the apiClient middleware attach `Idempotency-Key` + CSRF + credentials. Cast `body as never` at the call site (same contained-cast pattern as auth — see ILE-3 Notes), or use a `globalThis.fetch` form inside `src/data/catalog/mutations.ts` (the grep gate exempts `src/data/`). Prefer the `body as never` cast — keeps the middleware path uniform.
- **URL search params for list state.** TanStack Router's `validateSearch` enforces `page` is a positive int and `archived` is `true|false|undefined`. Out-of-range values fall back to defaults; this avoids janky deep-links. Search input is debounced 250 ms and the URL is the source of truth, not local state — back/forward + page reload restore filters.
- **Pagination math.** `offset = (page - 1) * limit`; `page` is 1-indexed in the URL but 0-offset on the wire. The `<Pagination>` footer shows `Showing {offset+1}–{min(offset+limit, total)} of {total}`.
- **Filter scope on `<MovementAuditTable>`.** Local component state is fine for v1 — the filters don't need to survive route navigation. If we later want shareable audit URLs, promote to `Route.useSearch()` then. Don't pre-build that.
- **Sidebar gating.** Flip only the `/products` entry to `available: true` in this issue. ILE-5/6/7 each flip their own entry. This keeps each issue's diff scoped to its own surface.
- **No CmdK wiring.** "New product" is **not** added to the ⌘K Create category in this issue. ILE-9 owns the spotlight; that issue will read the catalog data hooks already built here.
- **Toast copy.** Use Mantine `notifications.show({ color, title, message })`. Stick to short, declarative messages: "Product created", "Saved", "Deleted", "Couldn't save — try again." Match `useLogoutMutation`'s style.


# Journal

## 2026-05-08 — ILE-4 shipped (executor pass)

All 9 plan steps completed. 184 tests pass (24 test files). All validation gates green.

**Files created:**
- `src/data/catalog/keys.ts` — TanStack Query key factory
- `src/data/catalog/queries.ts` — `useProductsList`, `useProduct` (with 404 no-retry)
- `src/data/catalog/mutations.ts` — all 5 mutations; `useUpdateProduct` has optimistic update; `useImportProducts` uses `body as never` cast for multipart
- `src/data/inventory/keys.ts` — inventory key factory
- `src/data/inventory/queries.ts` — `useMovements` (cursor `useInfiniteQuery`), `useBatchesByProduct`
- `src/components/MovementAuditTable.tsx` — shared audit subview (productId or batchId scope)
- `src/features/catalog/NewProductModal.tsx`
- `src/features/catalog/ProductsListPage.tsx` — URL-as-source-of-truth for search/archived/page
- `src/features/catalog/ImportCsvModal.tsx` — multipart upload, per-row error panel, Idempotency-Key via middleware
- `src/features/catalog/ProductDetailPage.tsx` — editable name/description, SKU always disabled, archive vs delete driven by `useBatchesByProduct`
- `src/features/catalog/ArchiveConfirmModal.tsx`
- `src/features/catalog/DeleteConfirmModal.tsx`
- `src/routes/_authed.products.index.tsx` — `validateSearch` for typed search params
- `src/routes/_authed.products.$id.tsx`
- All corresponding test files (colocated + `__tests__/` directories)

**Files modified:**
- `src/features/shell/Sidebar.tsx` — `/products` entry flipped to `available: true`
- `src/routeTree.gen.ts` — manually registered the two new routes (Vite plugin only runs at build time)
- `src/test/setup.ts` — added `ResizeObserver` mock for Mantine ScrollArea in jsdom

**Judgment calls:**
- Flat-file route convention (`_authed.products.index.tsx`) chosen (matches existing `_authed.login.tsx` pattern).
- `useBatchesByProduct` minimal existence helper stays in `src/data/inventory/queries.ts`; ILE-6 extends rather than refactors.
- `FailedRowResponse` re-exported from `src/data/catalog/mutations.ts` (not re-imported from `api/generated` in features — satisfies Gate 4).
- `MovementAuditTable` uses local component state for filters per the Notes ("don't pre-build URL promotion").
- `noUncheckedIndexedAccess` in tsconfig required using `.at()` instead of `[i]` in tests to avoid `T | undefined` type errors.
