# Design — Ilex Client

Committed design artifacts extracted from the v0 prototype handoff. Source-of-truth for tokens, layout archetypes, shared component contracts, and landing-page copy. Per-page and per-component specs cite this folder.

## Files

| File | What's in it |
|---|---|
| [`tokens.md`](tokens.md) | Canonical color / typography / spacing / radius tokens. Tailwind ↔ Mantine mapping. |
| [`archetypes.md`](archetypes.md) | Six layout archetypes (Landing, Dashboard, List-with-filters, Detail-with-action-bar, Draft-with-side-preview, Modal). Each cites its v0 screenshot. |
| [`components.md`](components.md) | Component specs for the shared primitives (`<DataTable>`, `<DetailHeader>`, `<ActionBar>`, `<KpiTile>`, `<ExpiryBadge>`, `<StatusBadge>`, `<EmptyState>`, `<ConfirmModal>`, `<DecimalInput>`, `<RightRailSlot>`, `<QuickActions>`, `<DateRangePicker>`, `<FefoPreview>`). |
| [`copy.md`](copy.md) | Landing-page voice + verbatim strings worth keeping. |
| [`prototype-source/`](prototype-source/) | Raw v0 output — reference only. Production code lives under `src/` and uses Mantine. |
| [`screenshots/`](screenshots/) | v0 captures — reference only. |

## Deviations from prototype (apply when implementing)

These are flagged across the relevant artifacts, summarized here:

1. **Margin formula** — prototype shows `90%` on the brief example. BE-D13 says **markup**: `(rev − cogs) / cogs × 100%` → on `$1,000 / $100`, the answer is **900%**. Fix on every KPI tile and margin column.
2. **PO lifecycle** — prototype renders `draft / sent / partial / received / cancelled`. BE-D6 says only **`draft` and `received`** in v1. Drop `sent`, `partial`, `cancelled` from the FE state model and from filter chips.
3. **Partial receipts** — prototype shows `Ordered / Received` split per line. **Out of v1 scope** per BE SPEC §1.3. PO receive is all-or-nothing; the line editor reads `quantity` and `unit_cost` only; received batches show full quantity, not partial.
4. **PO actions** — prototype dropdown has `Duplicate`, `Export PDF`, `Cancel PO`. Drop all three. v1 actions are: **View details / Edit (draft only) / Receive goods (draft only) / Delete (draft only)**.
5. **Light mode** — prototype `globals.css` carries a `:root` light theme. **Charcoal-only**, no light mode (matches `product.md` brand). Drop the `:root` non-dark block; only the `.dark`/charcoal palette ships.
6. **Fonts** — prototype uses Geist. SPEC §2.4 + brand: **Inter** for UI, **JetBrains Mono** for data (SKUs, lot codes, timestamps, prices, decimals).
7. **Recall toggle** — prototype puts a `Switch` in the header. SPEC says recall is a **modal-confirmed terminal action with required reason** (BE-D3); the header should be a status badge, not a free-flipping switch. Action bar's "Recall" button opens the modal; un-recall is the same path with a different button when already recalled.

## Polish targets (where the prototype is "good direction" but ships at 1×, not 10×)

- **Empty states** — replace v0's generic icon-and-headline with the agent-prompt empty state from `product.md` UX patterns ("Want me to import from CSV?"). Every list and detail gets one.
- **Loading skeletons** — Mantine `Skeleton` rows matching exact table density (36px row height, mono columns get mono-width skeletons).
- **Error rendering** — 4xx envelope renders **inline** on forms (`fields` map → field errors) and **toasts** for non-form errors. Don't fall back to a generic "something went wrong."
- **Focus rings** — visible focus state on every interactive element using `--ring` (tereré green at 50% opacity). Prototype uses default shadcn focus which is too subtle on charcoal.
- **Tabular numerics** — every number column uses `font-variant-numeric: tabular-nums` and right-aligns. Prototype gets this right on the products list, misses it in places like the dashboard top-products table.
- **Modal copy** — confirmation modals state the **consequence**, not just the action. SPEC's recall modal language ("This blocks future sales of this batch and generates a customer recall report. Past sales are not reversed automatically.") is the bar.
- **Right-rail collapse animation** — Mantine `Transition` with `slide-right`, 200ms; layout reflows the main column on collapse.
- **⌘K context-aware items** — prototype only shows the trigger pill. Real palette has Navigate / Create / Act / Agent categories that change based on the current route (per SPEC §3.9).
- **Recalled-state banner** — when a batch is recalled, render a clay-red banner across the top of the detail page citing the reason and linking to the recall report. Prototype has no recalled-state variant.
