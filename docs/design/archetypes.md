# Layout archetypes

Six reusable page layouts. Per-page specs in `docs/specs/` cite an archetype by name; the executor renders against the archetype contract instead of inventing layout per page.

Each archetype names: its **screenshot reference**, the **page set** that uses it, the **structural skeleton**, and the **components** it composes (cross-references to [`components.md`](components.md)).

---

## A1 — Landing

**Screenshot:** [`screenshots/lp.png`](screenshots/lp.png), [`screenshots/lp2.png`](screenshots/lp2.png)
**Used by:** `/`, the public marketing surface (rendered when not authenticated; redirects to `/dashboard` when authenticated).

### Skeleton

```
┌──────────────────────────────────────────────────────┐
│ Top nav: logo | Product · How it works · Pricing · Sign in | Start free CTA │
├──────────────────────────────────────────────────────┤
│ Hero (60/40 columns)                                 │
│  ┌────────────────────────┐  ┌──────────────────────┐ │
│  │ H1 (display)           │  │ Mock dashboard card  │ │
│  │ Subhead (body)         │  │ — 3 batch rows in    │ │
│  │ [Start free] [See it]  │  │   mono table         │ │
│  └────────────────────────┘  └──────────────────────┘ │
├──────────────────────────────────────────────────────┤
│ Differentiators — 4-column grid (icon · label · 1-line) │
├──────────────────────────────────────────────────────┤
│ "Query, draft, explain" — Ask Ilex band              │
│ Left: H2 + body. Right: chat mock.                   │
├──────────────────────────────────────────────────────┤
│ "How it works" — 3-step numbered grid                │
├──────────────────────────────────────────────────────┤
│ Footer — minimal                                     │
└──────────────────────────────────────────────────────┘
```

### Composition

- Top nav uses the same logo SVG as the app shell.
- Hero card mock is **not** a static image — render real Mantine `<Table>` with hardcoded data (`Cold Brew 12oz · LOT-2024-A11 · Mar 15 · 248`). It sells the "we know F&B" angle harder than a screenshot.
- Differentiator icons: `Layers`, `ArrowDownUp` (FEFO), `AlertTriangle` (recall), `Receipt` (FIFO cost). All from `@tabler/icons-react` (Mantine's default icon set).

### Polish targets vs prototype

- Hero: tighten subhead to **one sentence** (prototype is on-target). Avoid SaaS clichés.
- Differentiator copy is verbatim from [`copy.md`](copy.md) — don't paraphrase.
- The "Query, draft, explain" chat mock is the strongest section; lean into it. The chat input at the bottom of the band is non-functional but should look native.
- Add a small "Built for the take-home brief — see the brief →" footer link to `/about` or open the brief in a modal. Demonstrates self-awareness of the context.

---

## A2 — Dashboard (composed widgets)

**Screenshot:** [`screenshots/1.png`](screenshots/1.png)
**Used by:** `/dashboard` only. The only page that breaks the "single primary surface" rule — composes multiple widgets in a grid.

### Skeleton

```
┌─ App shell ──────────────────────────────────────────┐
│ ┌── Quick actions row ──────────────────────────────┐│
│ │ [+ New PO] [+ New SO] [Import products]           ││
│ └───────────────────────────────────────────────────┘│
│ ┌── Main grid (2 cols on lg, stacked on md/sm) ────┐│
│ │ ┌─ Expiring widget ──┐ ┌─ Last 30 days ────────┐ ││
│ │ │ Header + range     │ │ Header + range        │ ││
│ │ │ Dense table        │ │ KPI tiles (4)         │ ││
│ │ │ View all →         │ │ Top products table    │ ││
│ │ └────────────────────┘ └───────────────────────┘ ││
│ └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

### Composition

- `<QuickActions>` row sits above the grid (not inside a card).
- Both widgets use `<Card>` with `<CardHeader>` carrying title + range picker on the right.
- Expiring widget body: `<DataTable>` with `<ExpiryBadge>` per row + "View all" footer link → `/stock?expiring_within=N`.
- Last 30 days body: 4-tile `<KpiTile>` grid (`Revenue / COGS / Profit / Profit Margin`) + `<DataTable>` of top products by margin.

### Polish targets vs prototype

- **Margin tile shows `90%` in the prototype — wrong.** BE-D13 is markup: `(rev − cogs) / cogs × 100%`. Brief example: $1,000 revenue + $100 COGS → **900%**. Fix on the tile and the per-product margin column.
- Trend pill (`+1.8%`) currently always tereré green. Should render in tereré if positive, clay if negative, gray if zero. Prototype is single-color.
- Expiring widget should support an empty state (`<EmptyState>` body slot inside the card) that the prototype skips.

---

## A3 — List with filters

**Screenshot:** [`screenshots/2.png`](screenshots/2.png) (products), [`screenshots/3.png`](screenshots/3.png) (POs)
**Used by:** `/products`, `/purchase-orders`, `/sales-orders`, `/stock`.

### Skeleton

```
┌─ App shell ──────────────────────────────────────────┐
│ ┌── Page header ─────────────────────────────────┐  │
│ │ H1 (left) | search + secondary + primary CTA   │  │
│ └────────────────────────────────────────────────┘  │
│ ┌── Filter row ───────────────────────────────────┐ │
│ │ Segmented toggle / chip filters                 │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌── DataTable ────────────────────────────────────┐ │
│ │ Sortable header row                             │ │
│ │ Dense rows (36px), mono ID column               │ │
│ │ Hover-revealed row action menu                  │ │
│ │ (Optional collapsible row for nested detail)    │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌── Pagination footer ─────────────────────────── │ │
│ │ "Showing N-M of T"   Previous · 1 · 2 · Next    │ │
│ └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Composition

- `<DataTable>` is the workhorse component. See [`components.md`](components.md) for the contract.
- Filter row is either:
  - **Segmented toggle** (products: `false / true / all` for archived) — best when filter has 2-4 mutually exclusive values
  - **Chip array** (POs: `All / Draft / Received` — drop `Sent / Partial / Cancelled` per BE-D6)
- Search input is right-aligned in the page header next to action buttons.
- Pagination strategy depends on the endpoint: offset (Previous · numbered · Next) for products / POs / batches; cursor (Load more) for `/sales-orders` and `/movements`.

### Polish targets vs prototype

- **PO filter chips: drop `Sent / Partial / Cancelled`** — BE only has `draft / received` (BE-D6). Prototype invents states the backend can't produce.
- **Drop the partial-receipt UI** in PO collapsible rows (`Ordered / Received` columns). v1 PO receive is all-or-nothing per BE SPEC §1.3. The collapsible row should show: `SKU / Product / Quantity / Unit cost / Line total` only.
- **Drop dropdown actions** that aren't in scope: `Duplicate`, `Export PDF`, `Cancel PO`. Keep: `View details`, `Edit` (draft only), `Receive goods` (draft only), `Delete` (draft only).
- **Empty state** (`<POEmptyState>` from prototype is the right shape, but its copy is generic) — replace with the agent-prompt empty state from `product.md` UX patterns.
- **Loading state** — Mantine `Skeleton` rows matching exact column widths during fetch. Prototype has no loading state at all.

---

## A4 — Detail with action bar

**Screenshot:** [`screenshots/4.png`](screenshots/4.png) (batch detail)
**Used by:** `/products/:id`, `/purchase-orders/:id`, `/sales-orders/:id`, `/batches/:id`.

### Skeleton

```
┌─ App shell ──────────────────────────────────────────┐
│ ← Back to {parent}                          [Toggle] │
│ ┌── Detail header ────────────────────────────────┐ │
│ │ H1 (mono lot code as subtitle / large mono)     │ │
│ │ Pill row: expiry · on-hand · source · status    │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌── Action bar ───────────────────────────────────┐ │
│ │ [Adjust] [Write off] [Recall] [Edit metadata]   │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌── (Conditional) Recalled banner ────────────────┐ │
│ │ Clay-red. Reason. Link to recall report.        │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌── Primary detail surface ───────────────────────┐ │
│ │ Movement audit table (R6) / Allocations / Lines │ │
│ └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Composition

- `<DetailHeader>` carries title + status + recall toggle (visual only — clicking opens the modal, doesn't flip state directly).
- `<ActionBar>` — horizontal row of buttons. Each opens a `<ConfirmModal>` wired to a mutation. Buttons disabled when post-terminal (e.g., post-receive PO has no Adjust/Write-off; voided SO has no Void).
- Pill row uses small `<StatusBadge>` and inline mono spans for facts.
- Primary detail surface is one of: movement audit table (batch detail, product detail), allocations table (SO detail), batches table (PO detail), nested line items (PO/SO detail).

### Polish targets vs prototype

- **Recall is not a free-flipping switch.** Prototype puts a `Switch` in the header that visually toggles state. Real flow: header shows current state as a `<StatusBadge>` (`OK` / `Recalled`); action bar's "Recall" button opens the modal with required reason; submit hits BE; refetch updates the badge. No optimistic UI.
- **Recalled-state variant is missing in prototype.** When `is_recalled=true`, render a clay-red banner ("This batch is recalled. Reason: …. Customer recall report →") above the action bar. Prototype only shows the OK state.
- **Movement audit colors** — Receipt (tereré green), Sale (text), Adjustment (amber), Write-off (clay), Recall block (clay outline), Metadata correction (gray) — colors come from kind, not from quantity sign.
- **Action button styling** — write-off and recall buttons should have a clay-red destructive variant; metadata edit is ghost; adjust is default. Prototype renders all four identically.
- **Date / time format** — `2024-12-15 09:23:41` in the prototype is good; keep ISO-like with space separator, not full localized format.

---

## A5 — Draft with side preview

**Screenshot:** *(not in prototype handoff — describe verbatim from SPEC §3.6)*
**Used by:** `/sales-orders/new`, `/sales-orders/:id/edit`. **The differentiator screen.**

### Skeleton

```
┌─ App shell ──────────────────────────────────────────┐
│ ┌── Page header ──────────────────────────────────┐ │
│ │ H1 "New sales order" | Save draft · Commit      │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌──── 60/40 columns ──────────────────────────────┐ │
│ │ ┌── Left: form ──────┐  ┌── Right: preview ──┐ │ │
│ │ │ Customer fields    │  │ "FEFO allocation   │ │ │
│ │ │ Lines editor       │  │  preview" · [↻]    │ │ │
│ │ │  · product picker  │  │ Per-line cards:    │ │ │
│ │ │  · qty (mono)      │  │  Line label        │ │ │
│ │ │  · sell price      │  │  Allocations table │ │ │
│ │ │  + Add line        │  │  (lot · expires ·  │ │ │
│ │ │                    │  │   qty)             │ │ │
│ │ │ Disclosure:        │  │ ─── Totals ───     │ │ │
│ │ │  Edit allocations  │  │ Qty · Revenue ·    │ │ │
│ │ │  manually          │  │ COGS · Margin      │ │ │
│ │ └────────────────────┘  │ [Commit]           │ │ │
│ │                          └────────────────────┘ │ │
│ └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

### Composition

- Left column: standard form layout, `<DecimalInput>` for qty + sell price (never `NumberInput`).
- Right column: `<FefoPreview>` consumes the `POST /preview` response. Cards per order line, each with a nested allocation table showing lot codes (mono), expiration dates, qty allocated. Earliest-expiring batch's expiration cell carries an `<ExpiryBadge>` if <14 days.
- Sticky footer in the right column: total qty, revenue, **estimated COGS**, **estimated profit margin** in tereré green; `Commit` button below.
- Admin override disclosure (BE-D11) sits below the form, collapsed by default. When expanded, renders an editable allocation table that becomes the request body for commit.

### Polish targets vs prototype

- **This archetype isn't in the v0 handoff.** Build it from scratch in Mantine with extra care — it is the single screen that distinguishes Ilex from generic inventory tools.
- The `↻ Refresh preview` link should debounce on form changes (300ms) so the preview updates as the user edits without spamming the BE.
- 422 shortfall: render `{ shortfall: { product_id, required, available } }` as a clay-red banner inline in the right column (not a toast). The user needs to see *which* line shorted.
- Commit confirmation modal copy: state the immutability and the FEFO walk explicitly. "This consumes stock from the batches above. Sales orders are immutable after commit — you'd have to void to reverse." 

---

## A6 — Modal / confirmation

**Used by:** PO receive, SO commit, SO void, batch recall, batch un-recall, batch write-off, product archive, product hard delete, batch metadata correction.

### Skeleton

```
┌── Modal ─────────────────────────────────────────────┐
│ ┌── Header ──────────────────────────────────────┐  │
│ │ Title: action + subject                        │  │
│ │ Subtitle (optional, mono): subject identifier  │  │
│ └────────────────────────────────────────────────┘  │
│ ┌── Body ────────────────────────────────────────┐  │
│ │ Consequence statement (1-2 sentences)          │  │
│ │ (Optional) Required input (e.g. recall reason) │  │
│ │ (Optional) Affected items list                 │  │
│ └────────────────────────────────────────────────┘  │
│ ┌── Footer ──────────────────────────────────────┐  │
│ │              [Cancel]  [Confirm action]        │  │
│ └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Composition

- `<ConfirmModal>` from [`components.md`](components.md). Title + body + actions, with `intent: 'default' | 'destructive'`.
- Required inputs (recall reason, adjustment notes) are inline in the body, validated before the confirm button enables.
- Confirm button intent: tereré for receive/commit, clay for recall/write-off/void/delete.

### Polish targets vs prototype

- **Modal copy must state the consequence**, not just rephrase the action. Examples in [`components.md → ConfirmModal`](components.md#confirmmodal).
- **Focus trap** — first focusable element is the cancel button (so Enter doesn't accidentally confirm); confirm button is disabled until any required input is filled.
- **Animation** — Mantine `Transition` with `pop`, 150ms.
