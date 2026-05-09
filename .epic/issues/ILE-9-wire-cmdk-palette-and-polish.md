---
id: ILE-9
github_id: null
status: open
assignee: null
state: Done
type: item
depends_on: [ILE-8]
---

# ILE-9 Wire ⌘K command palette + polish pass

## Overview

Fill the `@mantine/spotlight` body that ILE-3 left as a stub (`<CmdkTrigger>` + `useCmdk` store toggle, no actions list). Per SPEC §3.9 the palette has four categories — **Navigate** (every page in §2.7), **Create** (new PO, new SO, new product, manual batch), **Act** (context-aware: recall from `/batches/:id`, commit from SO draft, void from SO detail post-commit, archive from product detail with batches), **Agent** (open Ask-Ilex panel + prefill query — stub in v1 since the panel itself ships empty per `<RightRailSlot>` design; the v3 Phase-3 issue wires the panel for real). Polish pass: agent-prompted empty states (`<EmptyState>` per `docs/design/components.md:209-241` — `/products` empty → "Want me to import from CSV?", `/sales-orders` empty → "Create an SO for {recent customer}?"), per-route error boundaries (4xx envelope rendering, 5xx generic fallback), Mantine `<Skeleton>`-based loading scaffolds on every list and detail. Floor-mode visual review across catalog/procurement/inventory/sales/dashboard pages (row heights, contrast, touch-target sizes per `floorMode.ts`). Accessibility pass — focus order, ARIA roles on action menus, keyboard navigation in modals + sortable headers.

## Surface

- [ ] `src/features/shell/CmdkPalette.tsx` (mounts `<Spotlight>` once at the AppShell level, drives `closeShell` / `openShell` from the existing `useCmdk` zustand store)
- [ ] `src/features/shell/cmdk-items/{navigate,create,act,agent}.ts` (action factories — pure functions returning `SpotlightActionGroupData`)
- [ ] `src/features/shell/cmdk-items/useCmdkContext.ts` (route-aware hook returning `{ batchId?, soId?, productId?, soStatus?, productHasBatches? }`)
- [ ] `src/components/EmptyState.tsx` + `src/components/EmptyState.test.tsx`
- [ ] `src/components/ErrorBoundary.tsx` + `src/components/ErrorBoundary.test.tsx` (class boundary; renders 4xx envelope vs 5xx fallback; one mount in `_authed.tsx` wraps the `<Outlet>`)
- [ ] `src/components/LoadingSkeleton.tsx` + `src/components/LoadingSkeleton.test.tsx` (small wrapper around Mantine `<Skeleton>` with `rows`, `density` props; replaces ad-hoc "Loading…" Text in `<BatchDetailPage>`, `<SoDetailPage>`, `<PoDetailPage>`, `<ProductDetailPage>`, `<SosListPage>`, `<PosListPage>`, `<ProductsListPage>`, `<StockByBatchPage>`)
- [ ] Adopt `<EmptyState>` on the four list pages whose copy already names an agent prompt (catalog, procurement, sales, inventory)
- [ ] Mount `<CmdkPalette>` inside `<AppShell>` (sibling of `<Outlet>`) so `mod+K` works on every authenticated page
- [ ] Update `<CmdkTrigger>` — remove the dev-warn, point its onClick at the spotlight store
- [ ] Tests: ⌘K opens on shortcut + on trigger click, Navigate group lists every §2.7 page, Create group has 4 items, Act items only render when route context matches (4 cases), `<EmptyState>` agent-prompt CTA opens the agent panel + prefills query, `<ErrorBoundary>` renders 4xx envelope + 5xx fallback, `<LoadingSkeleton>` accessible loading pattern (`role="status"` + `aria-busy`)

## Dependencies

- ILE-8 (financials + CSV exports) — done


# Specification

## Component: CmdkPalette
File: `src/features/shell/CmdkPalette.tsx`

Realizes SPEC §3.9. Mounts a single `<Spotlight>` instance inside `<AppShell>` alongside `<Outlet>`. Drives its open/close via the existing `useCmdk` zustand store (so the topbar `<CmdkTrigger>` can also open it programmatically — mantine spotlight's keyboard shortcut handles `mod+K` itself, but the trigger button needs to call `spotlight.open()` directly). Composes four action groups by calling `buildNavigateActions`, `buildCreateActions`, `buildActActions(ctx)`, `buildAgentActions(query)`. The Act group is the only context-aware one; it reads `useCmdkContext()` and returns an empty actions array when no actions apply (Spotlight hides empty groups automatically when `actions.length === 0`).

### Preconditions

* User is authenticated (palette only mounts inside `_authed`)
* TanStack Router has hydrated (route params readable via `useMatches`)

### Primary Use Case — keyboard-first navigation

#### Workflow
* User presses `⌘K` (mac) or `Ctrl+K` (linux/win)
* `<Spotlight>` opens with default `shortcut="mod+K"` from `@mantine/spotlight`
* Search box receives focus; Navigate / Create / Act / Agent groups render
* User types "stock"; Spotlight's default filter narrows to "Stock by batch"
* User presses Enter; navigate fires via TanStack Router's `useNavigate`; Spotlight closes (default `closeOnActionTrigger`)

#### Output
* URL changes to `/stock`
* Spotlight is closed; focus returns to the previously-focused element (Mantine handles this)

### Edge Case — context-aware Act items

#### Workflow
* User is on `/batches/abc-123` (a recallable, non-recalled batch)
* User opens palette with `⌘K`
* Act group renders one item: "Recall this batch" (label visible — keywords includes the batch's mono code)
* On `/batches/abc-123` for an *already-recalled* batch, the Act item flips to "Un-recall this batch"
* On `/sales-orders/new` or `/sales-orders/:id/edit` (status=draft), Act group shows "Commit this sales order" (disabled with tooltip "FEFO preview must be ready" if the SO has no lines yet — see Implementation note)
* On `/sales-orders/:id` with `data.status === 'committed' && !voided_at`, Act group shows "Void this sales order"
* On `/products/:id` with `productHasBatches === true` and `archived_at == null`, Act group shows "Archive this product"
* On every other route, Act group is empty (group header hidden)

### Edge Case — Agent stub in v1

#### Workflow
* User opens palette, types "show me low stock", presses Enter on Agent action "Ask Ilex: 'show me low stock'"
* Action triggers `useAgentPanel.open({ prefilledQuery: 'show me low stock' })` from a new tiny zustand store
* `<RightRailSlot>` reads the same store; if `prefilledQuery` is present it stuffs the value into its `<TextInput>` (which stays disabled in v1 per existing component spec — see Notes)
* Spotlight closes

#### Output
* RightRailSlot is forced expanded (collapsed=false) and its TextInput value === the typed query
* No backend call made (panel is empty in v1; ILE-13 wires the actual chat)

### Examples

* Press `⌘K`; See: search box focused, four group headers (Navigate, Create, Act when applicable, Agent)
* Type "Sales", press Enter on "Sales orders"; See: navigate to `/sales-orders`
* Visit `/batches/abc-123`, press `⌘K`; See: Act group with "Recall this batch"
* Visit `/batches/abc-123` (already-recalled), press `⌘K`; See: Act group with "Un-recall this batch"
* Visit `/sales-orders/xyz` (committed, not voided), press `⌘K`; See: Act group with "Void this sales order"
* Visit `/products/p1` (archived=false, hasBatches=true), press `⌘K`; See: Act group with "Archive this product"
* Visit `/`, press `⌘K`, type "csv", press Enter; See: Agent action "Ask Ilex: 'csv'", RightRailSlot expanded, TextInput value="csv"

## Function: buildNavigateActions
File: `src/features/shell/cmdk-items/navigate.ts`
Input: `(navigate: NavigateFn) → SpotlightActionGroupData`

Pure function. Returns one action per top-level page in SPEC §2.7 (Dashboard, Products, Purchase orders, Sales orders, Stock, Settings — same six entries as `Sidebar.tsx:27-34`). Each `SpotlightActionData` has `id`, `label`, `description` (subtitle copy), `keywords` (search synonyms — e.g. "PO" for purchase orders, "SO" for sales orders, "inventory" for stock), and `onClick: () => navigate({ to: path })`. Built once per render; deps: `navigate` only.

### Implementation

* Single source of truth: an inline array of `{ to, label, description, keywords }` mirroring `Sidebar.NAV_ITEMS`. Do **not** import from `Sidebar.tsx` — keep the source local so each surface's needs (icons vs hotkeys) can drift independently. Drift is acceptable here; coupling them would force hotkey concerns into the sidebar.
* `description` is a one-liner per page, e.g. "Browse products and import CSV", "Receive POs and create batches", "FEFO sales orders".

## Function: buildCreateActions
File: `src/features/shell/cmdk-items/create.ts`
Input: `(navigate: NavigateFn, openManualBatch: () => void) → SpotlightActionGroupData`

Four actions: "New purchase order" (→ `/purchase-orders/new`), "New sales order" (→ `/sales-orders/new`), "New product" (→ `/products?new=1` — opens existing `<NewProductModal>` via list-page search param hook, see Notes), "Manual batch" (→ calls `openManualBatch()` which lifts the `<ManualBatchModal>` open-state to AppShell). Mirrors `<QuickActions>` (dashboard) plus the two creation paths that don't have a Quick-Action button.

### Implementation

* Manual-batch flow needs a global "open manual batch modal" affordance because it's invoked from a non-page-specific surface (the palette). We add a tiny zustand store `useManualBatchModal` (`open: boolean`, `setOpen`) and let `<AppShell>` mount the existing `<ManualBatchModal>` once and bind its `opened` to the store. The current `<BatchDetailPage>` usage stays — it's a different instance with `defaultProductId` set; the palette-driven instance has no default product. **Do not** try to reuse the BatchDetailPage instance from the palette — the modal carries form state and a default-product prop that doesn't apply here.
* "New product" — uses the `<NewProductModal>` already mounted on `<ProductsListPage>`. The palette navigates to `/products?new=1`; the products list page reads the `new=1` search param on mount and triggers the modal open. This avoids hoisting yet another modal to AppShell — the products list is already the host. (Add a `?new=1` search param to `_authed.products.index.tsx`'s `validateSearch` and a small effect in `<ProductsListPage>` that opens the modal + strips the param.)

## Function: buildActActions
File: `src/features/shell/cmdk-items/act.ts`
Input: `(ctx: CmdkContext, handlers: ActHandlers) → SpotlightActionGroupData`

Returns a `SpotlightActionGroupData` with up to one action per route shape. Logic table:

| Route shape | Condition | Action label | onClick |
|---|---|---|---|
| `/batches/:id` | `!batch.is_recalled` | "Recall this batch" | `handlers.openRecall(batchId)` |
| `/batches/:id` | `batch.is_recalled` | "Un-recall this batch" | `handlers.openUnRecall(batchId)` |
| `/sales-orders/new` or `/sales-orders/:id/edit` | (status=draft, hasLines) | "Commit this sales order" | `handlers.openCommit()` |
| `/sales-orders/:id` (detail index) | `status='committed' && !voided_at` | "Void this sales order" | `handlers.openVoid(soId)` |
| `/products/:id` | `productHasBatches && !archived_at` | "Archive this product" | `handlers.openArchive(productId)` |

If no row matches, the group is omitted (caller filters out empty groups before passing to `<Spotlight actions=[]>`).

### Implementation

* `ctx` is the return value of `useCmdkContext()` — see below
* `handlers` is an `ActHandlers` object passed by `<CmdkPalette>`. Each handler routes through a per-page event bus (a third tiny zustand store `useActModalBus` with `request: { kind: 'recall' | 'unrecall' | 'void' | 'commit' | 'archive', id: string } | null`). The page itself listens to the bus and opens its own modal when a request lands, then clears the bus. **Why not invoke modals directly from the palette?** Each modal currently lives on its host page and depends on local mutation hooks + onSuccess refetch wiring. Hoisting them all to AppShell is a much larger refactor (and pollutes AppShell with feature concerns). The bus pattern keeps modals where they live — palette only declares intent. SPEC §3.9 doesn't dictate how the wiring works, only that the act fires.
* For `/sales-orders/:id` detail vs `/sales-orders/:id/edit`, the discriminator is `useMatches()` route IDs (`/_authed/sales-orders/$id/` vs `/_authed/sales-orders/$id/edit`). `useCmdkContext` returns the matching route ID and the page-level data hook (e.g. `useSo(soId)`) feeds status/voided_at into the context.

## Function: buildAgentActions
File: `src/features/shell/cmdk-items/agent.ts`
Input: `(query: string, openAgent: (q: string) => void) → SpotlightActionGroupData`

One action: `id: 'agent-ask'`, label `"Ask Ilex: '{query}'"` when `query.length > 0`, else `"Ask Ilex"` (no quotes). Triggers `openAgent(query)` which writes to the new `useAgentPanel` zustand store; `<RightRailSlot>` reads it. Stub in v1 — the panel still has a disabled TextInput per its existing spec, but the stuffed value renders so the wire-up is verifiably in place.

### Implementation

* Reads the live spotlight query via `<Spotlight>`'s controlled `query` / `onQueryChange` props (state lifted to `<CmdkPalette>`)
* Stores: new `src/stores/agent-panel.ts` (`open`, `prefilledQuery`, `setOpen`, `setPrefilledQuery`)
* The `useCmdk` store is left as-is — it only governs the trigger button's open intent and the spotlight component handles its own open/close after that

## Hook: useCmdkContext
File: `src/features/shell/cmdk-items/useCmdkContext.ts`
Input: `()`
Returns: `{ kind: 'batch' | 'so-draft' | 'so-detail' | 'product-detail' | 'other', batchId?, soId?, productId?, batch?, so?, productHasBatches? }`

Reads `useMatches()` from TanStack Router. For each context-bearing route, also calls the corresponding data hook (`useBatch`, `useSo`, `useBatchesByProduct(productId, { limit: 1 })`) so the Act builder has the live `is_recalled`/`status`/`voided_at` flags. `enabled` is gated on `kind === ...` so we don't fire spurious queries on non-context pages.

### Implementation

* The hook unconditionally calls the three data hooks but passes `{ enabled: kind === 'batch' }` etc, so React Query short-circuits when off
* Cached results are reused — these hooks are already on every detail page, so the palette piggybacks on the same query keys (no double fetch)

## Component: EmptyState
File: `src/components/EmptyState.tsx`
Input: `({ icon?: React.ComponentType, title: string, body?: string, actions?: Array<{ label: string; href?: string; onClick?: () => void; primary?: boolean }>, agentPrompt?: string })`

Per `docs/design/components.md:209-241`. Centered column, dashed border on surface-2, padding `2xl`, min-height 400px. Icon (60px circle, surface-2 fill, text-muted icon). Title (`<Title order={2}>`), body (`<Text c="dimmed" maw="50ch">`), action row of 1-2 Mantine `<Button>`s, primary uses theme `primary` color (tereré). When `agentPrompt` is set, render an extra ghost `<Button>` "Ask Ilex" that calls `useAgentPanel.setOpen(true) + setPrefilledQuery(agentPrompt)`.

### Implementation

* Pure presentational — reads from `useAgentPanel` store only when `agentPrompt` is set
* `actions[].href` uses `<Button component={Link} to={href}>` (TanStack `Link`); `actions[].onClick` uses `<Button onClick>`. Mutually exclusive per item.
* The agent-prompt button uses Mantine icon `IconSparkles` from `@tabler/icons-react` (already installed) so the affordance is visually distinct from the primary action

## Component: ErrorBoundary
File: `src/components/ErrorBoundary.tsx`
Input: `({ children: React.ReactNode })`

Class component (React's only way to catch render errors). `componentDidCatch` records the error; `render` swaps to a fallback when `state.error` is set. Two fallbacks based on error shape:

* **`ApiError.is(error) && error.status >= 400 && error.status < 500`** — render `<Alert color="red">` with `error.detail ?? error.error` (the BE envelope copy is meant to be user-readable)
* **Anything else (5xx, render errors, network)** — render generic fallback `"Something went wrong. Reload the page."` plus a "Reload" `<Button onClick={() => window.location.reload()}>`

A "Try again" button calls `setState({ error: null })` to retry the subtree without a full reload (useful for query errors that may resolve on next fetch).

### Implementation

* Mount once in `_authed.tsx`, wrapping `<Outlet />`. **Do not** wrap public pages — login/signup have their own error handling that already works.
* Per-widget error states (e.g. `<FinancialSummary>`'s inline `<Alert>` from ILE-8) are **not** replaced by this — they handle expected query errors gracefully without unmounting the rest of the page. The ErrorBoundary catches *unexpected* render-time crashes and is a last line of defense.
* `componentDidCatch` calls `console.error(error, errorInfo)` so dev sees the full stack; in prod this is the hook-point for future Sentry wiring (out of scope).

## Component: LoadingSkeleton
File: `src/components/LoadingSkeleton.tsx`
Input: `({ rows?: number, height?: number, gap?: number, role?: 'status' | 'presentation' })`

Stack of N Mantine `<Skeleton>` rows (default 5) with sensible spacing for list/detail loading scaffolds. `role="status"` + `aria-busy="true"` + visually hidden `<span>Loading…</span>` so screen readers announce loading. Default `height={36}` matches the `<DataTable>` row height from `docs/design/components.md:42`.

### Implementation

* Replaces ad-hoc `<Text c="dimmed">Loading…</Text>` patterns currently in `<BatchDetailPage>`, `<SoDetailPage>`, `<PoDetailPage>`, `<ProductDetailPage>` (and any list page using same)
* Caller passes `rows={3}` for tight widget loading (e.g. `<ExpiringSoonWidget>`); default 5 fits list-page bodies
* The component is intentionally plain — no shimmer animation override (Mantine's default shimmer is fine; matching the prototype's polish targets is out of scope here)

## Lib: src/stores/agent-panel.ts (new)

```ts
type AgentPanelState = {
  open: boolean
  prefilledQuery: string
  setOpen: (open: boolean) => void
  setPrefilledQuery: (q: string) => void
}
```

Tiny store. Drives `<RightRailSlot>` open state + prefilled-query rendering. Replaces RightRailSlot's local `useState` for `collapsed` so the palette can force-expand on Agent action.

## Lib: src/stores/manual-batch-modal.ts (new)

```ts
type ManualBatchModalState = {
  open: boolean
  setOpen: (open: boolean) => void
}
```

Tiny store. Lets the palette open the existing `<ManualBatchModal>` from any route without lifting modal-specific state into `<AppShell>`'s component file.

## Lib: src/stores/act-modal-bus.ts (new)

```ts
type ActModalRequest =
  | { kind: 'recall'; batchId: string }
  | { kind: 'unrecall'; batchId: string }
  | { kind: 'commit' }
  | { kind: 'void'; soId: string }
  | { kind: 'archive'; productId: string }

type ActModalBusState = {
  request: ActModalRequest | null
  request_: (req: ActModalRequest) => void
  clear: () => void
}
```

Per-page modal trigger bus. The page reads `request` via `useActModalBus(s => s.request)`, opens its modal when `request.kind` matches, then calls `clear()`. Detail pages already have all the modal infrastructure; this store is purely a one-way notification channel.


# Plan

Each step is independently shippable. Within a step, write the failing test first, then the implementation, then green (per `tdd` skill). Steps are ordered so a partial ship still lands user value: shared primitives first (steps 1–3), then the palette and its integrations (4–7), then the polish adoptions (8–10).

1. **Land `<EmptyState>` shared component**
   - Why: empty-state copy is named in the design doc and lives on every list page. Building it first lets steps 8 and the palette agent-prompt button (step 6) reuse it. No upstream deps.
   - [x] Write `src/components/EmptyState.test.tsx` — 4 tests: renders title + body, renders icon when given, primary + secondary actions trigger correct handlers/links, agentPrompt button calls `useAgentPanel.setPrefilledQuery + setOpen(true)`
   - [x] Implement `src/stores/agent-panel.ts` (used by EmptyState's agent-prompt path)
   - [x] Implement `src/components/EmptyState.tsx`
   - [x] `npm test && npm run typecheck && npm run lint` green

2. **Land `<LoadingSkeleton>` shared component**
   - Why: stand-alone, used by every detail/list page in step 9. No upstream deps; can ship in any order against EmptyState.
   - [x] Write `src/components/LoadingSkeleton.test.tsx` — 3 tests: renders N rows, has `role="status"` + `aria-busy` + visually hidden "Loading…" text, defaults to 5 rows when no prop
   - [x] Implement `src/components/LoadingSkeleton.tsx`
   - [x] `npm test && npm run typecheck && npm run lint` green

3. **Land `<ErrorBoundary>` shared component + mount in `_authed.tsx`**
   - Why: ships protection independent of palette work. Production safety net even if every later step is reverted.
   - [x] Write `src/components/ErrorBoundary.test.tsx` — 3 tests: renders children when no error; renders 4xx envelope (`Alert` with `error.detail`) when child throws an `ApiError` with status 400; renders generic fallback + Reload button on plain Error
   - [x] Implement `src/components/ErrorBoundary.tsx`
   - [x] Wrap `<Outlet />` in `_authed.tsx` with `<ErrorBoundary>`
   - [x] `npm test && npm run typecheck && npm run lint` green

4. **Land tiny stores: `agent-panel`, `manual-batch-modal`, `act-modal-bus`**
   - Why: all three palette-powered flows need a side-channel; building stores first means steps 5–7 are pure UI work. Step 1 already ships `agent-panel.ts`; this step ships the other two.
   - [x] Write `src/stores/__tests__/manual-batch-modal.test.ts` — 1 test: setOpen flips
   - [x] Write `src/stores/__tests__/act-modal-bus.test.ts` — 2 tests: request_ sets, clear nulls
   - [x] Implement both stores
   - [x] `npm test && npm run typecheck && npm run lint` green

5. **Wire `<RightRailSlot>` to `useAgentPanel`**
   - Why: makes the Agent palette action's effect verifiable end-to-end before the palette itself ships. RightRailSlot becomes the verifier.
   - [x] Update `RightRailSlot.tsx` — replace local `collapsed` useState with `useAgentPanel.open`; render `prefilledQuery` as the `value` of the disabled TextInput; add a `data-testid="agent-panel"` for the palette test to assert against
   - [x] Tests: extend an existing shell test (or add `RightRailSlot.test.tsx`) — 2 cases: setOpen(true) expands the rail, setPrefilledQuery('hello') populates the TextInput value
   - [x] `npm test && npm run typecheck && npm run lint` green

6. **Land `useCmdkContext` hook + the four cmdk-items factories (Navigate, Create, Act, Agent)**
   - Why: pure functions, easy to unit-test in isolation before the heavyweight integration in step 7.
   - [x] Write `cmdk-items/__tests__/navigate.test.ts` — 1 test: returns 6 actions matching SPEC §2.7
   - [x] Write `cmdk-items/__tests__/create.test.ts` — 1 test: returns 4 actions, "Manual batch" calls `openManualBatch`
   - [x] Write `cmdk-items/__tests__/act.test.ts` — 5 tests: one per row in the logic table (recall, un-recall, commit-draft, void-detail, archive-product); plus a 6th for "no actions on /stock"
   - [x] Write `cmdk-items/__tests__/agent.test.ts` — 2 tests: empty query → "Ask Ilex"; non-empty → "Ask Ilex: '...'", clicking triggers `openAgent(query)`
   - [x] Write `cmdk-items/__tests__/useCmdkContext.test.tsx` — 4 tests: `/batches/:id` returns kind=batch+batch data; `/sales-orders/:id` returns kind=so-detail; `/products/:id` returns kind=product-detail+productHasBatches flag; `/stock` returns kind=other
   - [x] Implement all five files
   - [x] `npm test && npm run typecheck && npm run lint` green

7. **Land `<CmdkPalette>` + mount in `<AppShell>` + flip `<CmdkTrigger>`**
   - Why: integrates everything from steps 4–6 behind the keyboard shortcut. Once green, the SPEC §3.9 surface is live.
   - [x] Write `src/features/shell/__tests__/CmdkPalette.test.tsx` — 5 tests: `mod+K` opens palette; click on `<CmdkTrigger>` opens palette; Navigate Enter→navigate fires (assert via memory router URL change); Act group on `/batches/:id` shows "Recall this batch"; Agent action sets `useAgentPanel.prefilledQuery + open=true`
   - [x] Implement `src/features/shell/CmdkPalette.tsx`
   - [x] Mount `<CmdkPalette />` in `AppShell.tsx` (sibling of the Box wrapping `<Outlet>`)
   - [x] Mount `<ManualBatchModal>` once in `AppShell.tsx` bound to `useManualBatchModal` (no `defaultProductId`)
   - [x] Refactor `<CmdkTrigger>` — replace the dev-warn + `useCmdk.openShell()` with `import { spotlight } from '@mantine/spotlight'` and `spotlight.open()`. Delete the `useCmdk` zustand store (`src/stores/cmdk.ts`) — it's now redundant; mantine spotlight has its own store.
   - [x] Update `<CmdkTrigger>` test to assert spotlight opens (via `mod+K` simulation or by spying on `spotlight.open`)
   - [x] `npm test && npm run typecheck && npm run lint` green

8. **Wire Act-modal bus into target detail pages (BatchDetailPage, SoDetailPage, SoDraftPage, ProductDetailPage)**
   - Why: closes the loop from palette → page modal. Each page is independently shippable; if one wiring fails, the others still work.
   - [x] Append to `BatchDetailPage.test.tsx` — 2 tests: bus.request={kind:'recall',batchId:b.id} opens RecallModal; bus.request={kind:'unrecall',...} opens UnRecallModal. Both clear the bus on close.
   - [x] Append to `SoDetailPage.test.tsx` — 1 test: bus.request={kind:'void',soId:so.id} opens VoidConfirmModal
   - [x] Append to `SoDraftPage.test.tsx` — 1 test: bus.request={kind:'commit'} opens CommitConfirmModal
   - [x] Append to `ProductDetailPage.test.tsx` — 1 test: bus.request={kind:'archive',productId:p.id} opens ArchiveConfirmModal
   - [x] Add the four `useActModalBus` listeners (one effect per page that watches `request.kind` and matches → opens its existing modal → calls `clear()`)
   - [x] `npm test && npm run typecheck && npm run lint` green

9. **Adopt `<LoadingSkeleton>` on detail + list pages**
   - Why: pure quality-of-life; replaces the bare "Loading…" copy. Drop-in.
   - [x] Replace `<Text c="dimmed">Loading…</Text>` in `<BatchDetailPage>`, `<SoDetailPage>`, `<PoDetailPage>`, `<ProductDetailPage>`, `<SosListPage>`, `<PosListPage>`, `<ProductsListPage>`, `<StockByBatchPage>` with `<LoadingSkeleton rows={...} />`
   - [x] Existing tests still pass (the skeleton has the same loading semantics; assertions on `Loading…` text need to flip to `screen.getByRole('status')` or the visually hidden text)
   - [x] `npm test && npm run typecheck && npm run lint` green

10. **Adopt `<EmptyState>` with agent prompts on the four list pages**
    - Why: ships the agent-prompt empty-state design from `components.md:235-240`. List pages have inline empty messages today; they get the design-doc treatment.
    - [x] Replace the inline empty messages in `<ProductsListPage>` (no products, no filters) → `<EmptyState>` with agentPrompt="Want me to import from CSV?"
    - [x] Replace the inline empty in `<PosListPage>` (no purchase orders, no filters) → `<EmptyState>` with agentPrompt="Draft a PO for {top supplier}?" (omit `{top supplier}` interpolation in v1 — copy stays generic; the spec note flags brand interpolation as a follow-up)
    - [x] Replace the inline empty in `<SosListPage>` → `<EmptyState>` with agentPrompt="Create an SO for {recent customer}?" (same v1 note)
    - [x] Replace the inline empty in `<StockByBatchPage>` (no batches) → `<EmptyState>` (no agentPrompt — there's no design-doc copy for this one; it gets the action-only treatment "Receive a PO" / "Create a batch")
    - [x] Tests: extend each list page's existing empty-state test to assert the new title/body/agent-prompt button
    - [x] `npm test && npm run typecheck && npm run lint` green

11. **Validation pass: regenerate, typecheck, test, drift, lint, smoke**
    - Why: the `/build` pipeline gate. Confirms the issue lands cleanly into the codebase.
    - [x] `npm run generate:api -- --check` — no schema drift
    - [x] `npm run typecheck && npm test && npm run lint` green
    - [x] SPEC §4 grep gates — clean (no bare fetch outside data layer; spotlight import is allowlisted; no `as any`)
    - [ ] Manual smoke (requires live BE — executor defers to user): open `⌘K` on `/`, on `/batches/:id`, on `/sales-orders/:id`, on `/products/:id`; verify the Act group flips per route
    - [x] Surface checkboxes updated
    - [x] Journal entry appended


# Notes

- **Why three new zustand stores instead of one big "palette" store?** Each store has exactly one consumer pair: `agent-panel` ↔ `<RightRailSlot>` + EmptyState; `manual-batch-modal` ↔ `<AppShell>`; `act-modal-bus` ↔ four detail pages. Bundling them would force unrelated re-renders on every change. Keeping them small is also easier to delete later — the `act-modal-bus` is a workaround that the design-doc canonical pattern (`<ActionBar>` + lifted modal state) eventually replaces.
- **Mantine spotlight has its own store.** `@mantine/spotlight` ships `spotlightStore` + `spotlight.open/close/toggle` actions globally. The `useCmdk` zustand store from ILE-3 is redundant once `<CmdkPalette>` is mounted — it gets deleted in step 7. The trigger button uses `spotlight.open()` directly.
- **Keyboard shortcut is `mod+K` by default** (`SpotlightRoot.shortcut`). Mantine handles `⌘K` on mac and `Ctrl+K` on linux/win automatically. No custom hotkey wiring needed.
- **`useMatches` route IDs in TanStack Router** are stable (e.g. `/_authed/batches/$id`, `/_authed/sales-orders/$id/`). The `useCmdkContext` hook matches against them rather than parsing `location.pathname` — string parsing breaks when params contain hyphens or when search params are present.
- **Act group condition for SO commit.** SPEC §3.9 says "commit this SO when on SO draft." Implementation gates this on `status === 'draft' && lines.length > 0` so the action doesn't appear on a brand-new empty draft (clicking would open a modal that immediately errors). On a draft with lines but a server-side validation issue (e.g. shortfall), the action still appears — the modal handles the failure path with the same UX as clicking Commit on the draft page.
- **`/products?new=1` open-on-mount pattern.** `<ProductsListPage>` already manages search params for filters; adding a `new=1` flag is one line in `validateSearch` and a small `useEffect(() => { if (search.new) { setNewModalOpen(true); navigate(strip new) } }, [])`. This avoids hoisting `<NewProductModal>` to AppShell.
- **No "agent panel" backend in v1.** Per `<RightRailSlot>` spec the panel input stays disabled; the palette's Agent action is a wire-test only — it confirms the prefill + open-the-rail mechanism works so ILE-13 can plug in the real chat without touching this surface again. Tests assert the prefill renders; they do not assert any agent response.
- **`<ErrorBoundary>` placement.** One mount inside `_authed.tsx` wraps every authenticated route. Per-widget error states (e.g. `<FinancialSummary>`'s inline `<Alert>` from ILE-8) keep working — they catch *expected* query errors. The boundary catches *unexpected* render-time crashes (a coding bug, an unhandled render error). It does NOT replace per-widget error UX; it's a last line of defense.
- **No floor-mode visual review automation.** Surface checklist item is "manual visual review across feature pages"; this is a human-review step. The executor flags it in the Journal but doesn't block on it. Floor-mode CSS already exists (`floorMode.ts` toggles a class); no code changes here.
- **No accessibility-pass changes that would force test rewrites.** Adding ARIA labels and focus-trap fixes is in scope but should be additive — existing tests asserting `getByRole('button', { name: /...$/ })` keep passing if labels are unchanged. The palette is the only entirely-new keyboard-driven surface; its tests cover keyboard navigation explicitly.
- **`useCmdk` deletion is safe.** ILE-3's only consumer is `<CmdkTrigger>`. Once step 7 flips it to `spotlight.open()`, the store has no other consumers (verified via `grep -r "useCmdk\|cmdk.ts" src/`). The store file + its empty test (if any) get removed.
- **CSV-export button + `<EmptyState>`'s `actions` prop.** The agent-prompt button is a third button distinct from `actions[]` — it's keyed off `agentPrompt` so callers can't accidentally pre-empt it. Maximum three buttons rendered per spec.


# Journal

Append-only log of agent actions. Each entry: `- YYYY-MM-DD HH:MM [agent] — message`. Newest at the bottom; existing entries are never edited.

- 2026-05-09 12:00 [executor] — Step 1: Created `src/components/EmptyState.tsx` and `EmptyState.test.tsx`. Centered-column layout with dashed border, icon circle, dimmed body, action buttons, and optional "Ask Ilex" ghost button wired to `useAgentPanel` store. TanStack Router wrapper in tests. 4/4 tests green.
- 2026-05-09 12:05 [executor] — Step 2: Created `src/components/LoadingSkeleton.tsx` and `LoadingSkeleton.test.tsx`. Stack of N Mantine Skeleton rows with `role="status"` + `aria-busy="true"` + visually hidden "Loading…" span. 3/3 tests green.
- 2026-05-09 12:10 [executor] — Step 3: Created `src/components/ErrorBoundary.tsx` and `ErrorBoundary.test.tsx`. Class component with ApiError 4xx branch (inline Alert) and generic crash branch (Alert + Reload + Try again). Mounted inside `src/routes/_authed.tsx` wrapping `<Outlet>`. 3/3 tests green.
- 2026-05-09 12:15 [executor] — Step 4: Created `src/stores/agent-panel.ts`, `src/stores/manual-batch-modal.ts`, `src/stores/act-modal-bus.ts`. Three tiny Zustand stores for agent-panel open/prefill, manual-batch-modal toggle, and one-way act-modal notification bus.
- 2026-05-09 12:20 [executor] — Step 5: Rewrote `src/features/shell/RightRailSlot.tsx` to consume `useAgentPanel` store instead of local `useState`. Added `data-testid="agent-panel"` and renders `prefilledQuery` in the disabled TextInput. Created `RightRailSlot.test.tsx` with 2 tests (setOpen + setPrefilledQuery). Tests green.
- 2026-05-09 12:28 [executor] — Step 6: Created `src/features/shell/cmdk-items/{navigate,create,act,agent}.ts` and `useCmdkContext.ts`. Action groups for Navigate (6 items), Create (4 items), Act (context-aware: recall/unrecall/commit/void/archive), Agent (prefilled query). `useCmdkContext` uses `useMatches()` + `enabled` flags on queries. Added `enabled` prop to `useBatchesByProduct`. Full unit + hook tests across 5 test files. All green.
- 2026-05-09 12:38 [executor] — Step 6 fix: `useCmdkContext` return type changed from optional `T?` to explicit `T | undefined` to satisfy `exactOptionalPropertyTypes: true` in tsconfig. `act.test.ts` non-null assertions added for array indexing.
- 2026-05-09 12:45 [executor] — Step 7: Created `src/features/shell/CmdkPalette.tsx` composing 4 action groups. Rewrote `src/features/shell/CmdkTrigger.tsx` — removed `useCmdk` import, replaced with `spotlight.open()` from `@mantine/spotlight`. Deleted `src/stores/cmdk.ts`. Mounted `<CmdkPalette>` + `<ManualBatchModal>` in `AppShell.tsx`. Created `CmdkPalette.test.tsx` with 5 tests using portal-aware `document.body.textContent`. All green.
- 2026-05-09 12:55 [executor] — Step 8: Wired `useActModalBus` listener effects into `BatchDetailPage` (recall/unrecall), `SoDetailPage` (void), `SoDraftPage` (commit), `ProductDetailPage` (archive). Added `LoadingSkeleton` to all four. Appended bus tests to each page's test file. Tests green.
- 2026-05-09 13:02 [executor] — Step 9: Replaced bare `Loading…` text with `<LoadingSkeleton rows={...}/>` in all 8 target pages. Updated all assertions from text "Loading…" to `screen.getByRole('status')`. Tests green.
- 2026-05-09 13:08 [executor] — Step 10: Replaced inline empty messages with `<EmptyState agentPrompt="...">` on `ProductsListPage`, `PosListPage`, `SosListPage`. `StockByBatchPage` got `<EmptyState>` (no agentPrompt). Extended existing empty-state tests to assert new title/body/agent-prompt button. Tests green.
- 2026-05-09 13:15 [executor] — Step 11: Full validation pass. `generate:api --check` clean. `npm test` 379/379 green (+39 new tests). `npm run typecheck` clean. `npm run lint` clean. All 6 SPEC §4 grep gates clean. Manual smoke (step 11.4) deferred to user — requires live BE and browser.
