# Component specs — design-system primitives

Shared primitives that compose the archetypes. Each spec lists: prop signature, visual states, dependencies, and polish targets vs the prototype.

These live under `src/components/` and are consumed by `src/features/*`. Domain-specific feature components (e.g., `<FefoPreview>`, `<RecallModal>`) live under `src/features/{domain}/components/` even when listed here.

---

## `<DataTable>`

**File:** `src/components/DataTable.tsx`
**Used in:** A2 (dashboard widgets), A3 (list pages), A4 (movement audit).

### Props

```ts
type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  rowActions?: (row: T) => React.ReactNode
  collapsibleContent?: (row: T) => React.ReactNode
  density?: 'default' | 'compact'
  empty?: React.ReactNode
  loading?: boolean
}

type DataTableColumn<T> = {
  key: keyof T | string
  header: string
  align?: 'left' | 'right'
  width?: string
  mono?: boolean
  sortable?: boolean
  render?: (row: T) => React.ReactNode
}
```

### Visual states

- **Default** — 36px row height. Hover row tint at 10% opacity surface-2.
- **Compact** — 28px row height (used in nested collapsible rows only).
- **Loading** — render `loading * 8` skeleton rows matching column widths.
- **Empty** — render the `empty` slot (typically `<EmptyState>`).
- **Mono columns** — `font-mono`, `text-text-muted`, `text-xs` on cell text. Right-align if numeric.
- **Row action menu** — hover-revealed kebab on the right; `opacity-0 group-hover:opacity-100`.

### Polish targets vs prototype

- **Tabular numerics on every numeric column.** Add `tabular-nums` to the column class. Prototype is inconsistent.
- **Sortable headers must be focusable.** Wrap header content in a `<button>` with visible focus ring.
- **Sticky header** when the table is taller than the viewport. Prototype tables don't scroll independently.

---

## `<DetailHeader>`

**File:** `src/components/DetailHeader.tsx`
**Used in:** A4 (every detail page).

### Props

```ts
type DetailHeaderProps = {
  backTo?: { label: string; href: string }
  title: string
  subtitle?: string
  subtitleMono?: boolean
  pills?: Array<{ label: string; tone?: 'default' | 'amber' | 'clay' | 'tereré' }>
  status?: { label: string; tone: 'default' | 'amber' | 'clay' | 'tereré' }
}
```

### Visual states

- **Title row**: `← Back to {parent}` link (left), status badge (right).
- **Title**: `h1` Inter 600. **Subtitle**: optional, `mono-lg` if it's an identifier (e.g. lot code).
- **Pill row** below title: small `<StatusBadge>` instances rendering pills.

### Polish targets

- The recall-state toggle in the prototype's header is **wrong** — it's a free-flipping `Switch`. Replace with a status badge here; the action lives in `<ActionBar>` and opens `<ConfirmModal>`.
- `← Back` should preserve list-page filters / pagination via TanStack Router's history-aware nav.

---

## `<ActionBar>`

**File:** `src/components/ActionBar.tsx`
**Used in:** A4 (detail pages with terminal mutations).

### Props

```ts
type ActionBarProps = {
  actions: Array<{
    label: string
    icon?: React.ComponentType
    intent?: 'default' | 'destructive'
    onClick: () => void
    disabled?: boolean
    disabledReason?: string
  }>
}
```

### Visual states

- Horizontal row, gap `md`. Each action a Mantine `<Button variant="default">` for `default` intent, `<Button color="clay">` for destructive.
- Disabled state: button is dimmed + tooltip shows `disabledReason` on hover (e.g. "Already received" on Edit after PO receive).

### Polish targets

- **Disabled with reason** — prototype just disables silently, no tooltip explanation. Always show why an action is unavailable.
- Buttons should be 36px height matching form inputs. Prototype uses Mantine default which is taller.

---

## `<KpiTile>`

**File:** `src/components/KpiTile.tsx`
**Used in:** A2 (Last 30 days widget).

### Props

```ts
type KpiTileProps = {
  label: string
  value: string                        // formatted by caller (formatMoney, formatPercent)
  trend?: { value: string; direction: 'up' | 'down' | 'flat' }
}
```

### Visual states

- Surface-2 background, border, padding `lg`, radius `lg`.
- Label: `caption` text-muted.
- Value: `kpi` (Inter 700, tracking-tight).
- Trend pill: tereré green if `up`, clay if `down`, gray if `flat`. Inter 500, `caption`.

### Polish targets

- **Direction-aware trend color** — prototype always renders trends in tereré green; that lies when the trend is negative.
- Numbers in `value` use `tabular-nums` (caller's responsibility via formatter).

---

## `<ExpiryBadge>`

**File:** `src/components/ExpiryBadge.tsx`
**Used in:** Anywhere expiration dates render — dashboard widgets, stock list, batch detail header pill row, FEFO preview.

### Props

```ts
type ExpiryBadgeProps = {
  expirationDate: string | null   // ISO date, or null for non-perishable
  asOf?: Date                     // defaults to now
}
```

### Visual states

| Days remaining | Tone | Label |
|---|---|---|
| `< 0` | clay | `Expired` |
| `0..6` | amber | `{N}d` |
| `7..14` | default outline | `{N}d` |
| `> 14` | none rendered | (no badge) |
| `null` | none rendered | (no badge — non-perishable) |

### Polish targets

- Prototype's `>14` case still renders a badge with the day count. Drop the badge above 14 days — it's noise.
- `Expired` label is text-only in clay; `{N}d` for warnings is mono so the digit aligns.

---

## `<StatusBadge>`

**File:** `src/components/StatusBadge.tsx`

### Props

```ts
type StatusBadgeProps = {
  label: string
  tone: 'default' | 'amber' | 'clay' | 'tereré'
  icon?: React.ComponentType
}
```

### Visual states

- **default**: surface-2 background, text, border.
- **tereré** (PO received, SO committed): tereré at 15% alpha background, tereré at 100% text, tereré at 30% border.
- **amber** (warning): amber at 15% background, amber text, amber at 30% border.
- **clay** (cancelled / voided / recalled / expired): clay at 15% background, clay text, clay at 30% border.

Pill shape, radius `sm`, padding `xs xs`, caption text.

### Polish targets

- Prototype uses Mantine `<Badge>` defaults — they're too saturated for charcoal. The 15% / 30% alpha pattern from the prototype's PO `received` badge is the right level; standardize.

---

## `<EmptyState>`

**File:** `src/components/EmptyState.tsx`

### Props

```ts
type EmptyStateProps = {
  icon?: React.ComponentType
  title: string
  body?: string
  actions?: Array<{ label: string; href?: string; onClick?: () => void; primary?: boolean }>
  agentPrompt?: string                  // surfaces "Ask Ilex" CTA when provided
}
```

### Visual states

- Centered column, dashed border on surface-2, padding `2xl`, min-height 400px.
- Icon (60px circle, surface-2 fill, text-muted icon).
- Title (`h2`), body (`body`, text-muted, max-width 50ch).
- Action row: 1-2 buttons, primary = tereré.
- When `agentPrompt` is set, render an extra ghost button "Ask Ilex" that opens the agent panel pre-filled with the prompt.

### Polish targets

- **Agent-prompt empty states** — every list page's empty state should suggest an agent prompt that would help. Per `product.md` UX patterns. Prototype has no agent integration here.
- Common prompts:
  - `/products` empty → "Want me to import from CSV?"
  - `/purchase-orders` empty → "Draft a PO for {top supplier}?"
  - `/sales-orders` empty → "Create an SO for {recent customer}?"
  - `/batches/:id/recall-report` empty (no recalled customers) → no prompt; the empty state itself is the answer.

---

## `<ConfirmModal>`

**File:** `src/components/ConfirmModal.tsx`
**Used in:** A6 (every terminal mutation).

### Props

```ts
type ConfirmModalProps = {
  open: boolean
  onClose: () => void
  title: string
  consequence: string                   // 1-2 sentences. State what happens and what doesn't.
  subjectMono?: string                  // e.g. "LOT-2024-A11"
  confirmLabel: string
  intent?: 'default' | 'destructive'
  loading?: boolean
  required?: React.ReactNode            // a required input (textarea, select) inline in body
  requiredValid?: boolean               // whether the required input is filled correctly
  onConfirm: () => void
}
```

### Visual states

- Centered modal, surface background, radius `lg`, shadow-modal, max-width 480px.
- Header: title (h2), optional subject mono subtitle.
- Body: consequence paragraph, optional required input, optional affected-items list.
- Footer: `Cancel` (left, ghost) + `Confirm action` (right, tereré or clay per intent).
- `confirmLabel` button disabled while `loading` or while `requiredValid === false`.

### Copy library — consequence statements

Use these verbatim:

| Action | Consequence |
|---|---|
| **PO receive** | "Receiving creates one batch per line and locks this PO from further edits. Atomic — partial receipts are not supported." |
| **SO commit** | "Committing consumes stock from the batches in the FEFO preview above. Sales orders are immutable after commit — you'd have to void to reverse." |
| **SO void** | "Voiding writes reversal movements and stamps `voided_at`. Allocations stay on the record. Past sales reported in recall reports for the affected batches will be hidden after void." |
| **Batch recall** | "This blocks future sales of this batch and generates a customer recall report. Past sales are not reversed automatically — void them manually if needed." |
| **Batch un-recall** | "This reverses the recall block. The batch is sellable again. The recall and un-recall both stay in the audit." |
| **Batch write-off** | "This removes stock from on-hand and is permanent. Use Adjust if you want to record shrinkage with a different reason." |
| **Product archive** | "Archiving hides this product from default lists. Existing batches remain — recall and audit still work." |
| **Product hard delete** | "Permanent. Only allowed when no batches reference this product. Cannot be undone." |
| **Batch metadata correction** | "Correcting writes a `metadata_correction` row to the audit (qty=0). Use only for typos in lot code or expiration date." |

### Polish targets

- **Focus trap.** First focus on `Cancel`, not `Confirm`, so Enter doesn't fire the action.
- **Required-input gate** — confirm button stays disabled until the input validates. Prototype has no required-input pattern.
- **Loading state** — confirm button shows a spinner; cancel stays enabled (so the user can bail if the network hangs).

---

## `<DecimalInput>`

**File:** `src/components/DecimalInput.tsx`
**Used in:** Anywhere money or quantity is entered. **Replacement for Mantine `NumberInput` per SPEC §2.4.**

### Props

```ts
type DecimalInputProps = {
  value: string                          // strings end-to-end; never number
  onChange: (next: string) => void
  precision?: number                     // decimal places, default 4 (matches numeric(14, 4))
  min?: string
  max?: string
  unit?: 'g' | 'ml' | 'unit' | 'kg' | 'L' | string
  placeholder?: string
  disabled?: boolean
  error?: string
}
```

### Behavior

- Renders a Mantine `<TextInput>` with regex validation (`^\d*(\.\d{0,N})?$` where N=`precision`).
- Strips leading zeros on blur, normalizes trailing decimal (`5.` → `5`, `5.0000`).
- For quantity inputs with display units (kg, L), the form layer converts kg→g and L→ml on submit. `<DecimalInput>` doesn't know about base-units; the form does.
- Emits string only — never `number`. CI grep gate enforces no `parseFloat` / `Number(` on its `value` anywhere.

### Polish targets

- **Tabular numerics** — input text uses `font-variant-numeric: tabular-nums` so digit alignment is consistent during typing.
- **Right-aligned** when `unit` is set (the unit suffix renders in `text-muted` to the right of the input, baseline-aligned).

---

## `<RightRailSlot>`

**File:** `src/features/shell/RightRailSlot.tsx`
**Used in:** App shell — every authenticated page.

### Props

```ts
type RightRailSlotProps = {
  children?: React.ReactNode             // empty in v1 (placeholder); Phase 3 fills with <AgentPanel>
  open?: boolean
  onToggle?: (open: boolean) => void
}
```

### Visual states

- **Open** (default): 320px wide, surface background, left border, header row "Ask Ilex" with collapse arrow.
- **Collapsed**: 0px width, layout reflows main column. Trigger remains visible in the topbar (a small button) to re-open.
- **Empty placeholder body** (v1): centered "What can I help with?" text, agent icon, mock input at the bottom — none functional.

### Polish targets

- **Collapse animation** — Mantine `Transition slide-right`, 200ms. Prototype is instant.
- **Persist state in `localStorage`** so the rail's open/closed setting survives reload.

---

## `<QuickActions>`

**File:** `src/features/dashboard/QuickActions.tsx`

### Props

```ts
type QuickActionsProps = {
  actions: Array<{ label: string; icon?: React.ComponentType; href: string; primary?: boolean }>
}
```

### Visual states

- Horizontal button row, gap `md`. Default actions: `+ New PO` (primary), `+ New SO` (primary), `Import products` (ghost).
- All also surfaced in ⌘K's Create category for keyboard-first users.

### Polish targets

- The prototype's "Quick actions" sits inside a card; remove the card — it's redundant chrome on a row of three buttons.

---

## `<DateRangePicker>`

**File:** `src/components/DateRangePicker.tsx`
**Used in:** Dashboard widgets, Financial dashboard, Movement audit subviews.

### Props

```ts
type DateRangePickerProps = {
  value: { from: string; to: string }    // ISO date strings
  onChange: (next: { from: string; to: string }) => void
  presets?: Array<{ label: string; days: number }>   // default: 7 / 14 / 30 / 90
}
```

### Visual states

- Mantine `<Popover>` trigger: shows the active label (e.g. "Last 30 days") + chevron.
- Popover body: preset list (left) + custom range calendar (right) + Apply button.

### Polish targets

- **Custom range pickers** are missing in prototype. Presets only is fine for v1 dashboard, but financial dashboard should support custom ranges (BE accepts `from`/`to` params).

---

## `<FefoPreview>`

**File:** `src/features/sales/FefoPreview.tsx`
**Used in:** A5 (SO draft).

### Props

```ts
type FefoPreviewProps = {
  preview: SalesOrderPreviewResponse | null     // from generated client
  loading?: boolean
  onRefresh: () => void
  onCommit: () => void
}
```

### Visual states

- **Empty / no lines yet**: stub copy "Add lines to see the FEFO allocation."
- **Loading**: skeleton cards matching the line count.
- **Populated**: per-line cards with allocation tables. Earliest-expiring batch's row gets `<ExpiryBadge>`. Footer with totals + Commit button.
- **422 shortfall**: clay-red banner inline above the cards, naming the product + required vs available.

### Polish targets

- **This isn't in the v0 handoff.** Build it deliberately — it is the differentiator. See archetype A5 for the layout and SPEC §3.6 for the data contract.
- Debounce `onRefresh` 300ms when triggered by form-input changes.
- The estimated-margin number in the footer should render in tereré green when positive, clay when negative.

---

## `<PageHeader>`

**File:** `src/components/PageHeader.tsx`
**Used in:** Every authenticated list and detail page (adoption in ILE-22).

### Props

```ts
type PageHeaderProps = {
  title: string
  subtitle?: string
  contextTag?: string   // SKU / lot code / PO-N / SO-N — mono uppercase tracked-wide
  actions?: ReactNode
}
```

### Visual states

- Glass surface: `bg-surface-elevated backdrop-blur-elevated` (Tailwind classes from ILE-19 tokens).
- Border: `1px solid var(--mantine-color-dark-4)` with hairline meniscus top-edge via `var(--mantine-other-meniscus)`.
- `data-motion="page-header"` attribute triggers the `page-header-in` entry animation declared in `global.css` (ILE-19).
- **contextTag** — mono font (`ff="monospace"`), uppercase, `letterSpacing: 0.08em`, dimmed. Used for identifiers that scope the page (e.g., `LOT-2024-A11`, `PO-0042`). Rendered above the title.
- **actions** — ReactNode slot rendered right-aligned in the same row as the title stack. Typically one or two Mantine `<Button>` instances.

### When to use contextTag

Provide `contextTag` on every detail page where the URL contains a unique identifier that the user should see at a glance (lot codes, PO numbers, SO numbers, SKUs). Leave it empty on plain list pages.

---

## `<ErrorState>`

**File:** `src/components/ErrorState.tsx`
**Used in:** Every page's `isError` branch (adoption in ILE-22).

### Props

```ts
type ErrorStateProps = {
  error: unknown
  onRetry?: () => void
}
```

### ApiError unwrapping policy

```
ApiError.is(error)
  ? error.detail ?? error.error   // human-readable detail, or machine error code
  : 'An error occurred'           // generic fallback for plain Error / unknown
```

Renders a Mantine `<Alert color="red" variant="light" role="alert" title="Something went wrong">` with the resolved message. When `onRetry` is provided, a small `Retry` button appears below the message text.

Do not distinguish 4xx from 5xx at this layer — that is cross-owner / 404 policy (BE-D4). The page's data hook surfaces the error; `<ErrorState>` presents it uniformly.

---

## `<StatusBanner>`

**File:** `src/components/StatusBanner.tsx`
**Used in:** Recall / voided / expiring surfaces (adoption in ILE-22).

### Props

```ts
type StatusBannerProps = {
  tone: 'terere' | 'amber' | 'clay'
  icon?: ReactNode
  children: ReactNode
}
```

### Tone semantics

| Tone | Meaning | Background class | Border |
|---|---|---|---|
| `terere` | Healthy / committed | `bg-tinted-terere` | `tintedTereredBorder` |
| `amber` | Warning — expiring within 7d, near-shortfall | `bg-tinted-amber` | `tintedAmberBorder` |
| `clay` | Destructive state — recalled, voided, expired | `bg-tinted-clay` | `tintedClayBorder` |

Ultra-low alpha tints (8–10%) so the banner reads as a tint, not a fill. `role="status"` for assistive technology.

---

## Page lifecycle

Every authenticated list and detail page must follow this canonical render pattern:

```tsx
if (isError) return <ErrorState error={error} onRetry={refetch} />
if (isPending) return <LoadingSkeleton rows={8} />
if (!data || data.length === 0) return <EmptyState title="..." body="..." />
return <content />
```

The order is strict: error before loading before empty before data. This keeps the UI deterministic and prevents flashing an empty state on refetch.

Components:
- `<ErrorState>` — `src/components/ErrorState.tsx`
- `<LoadingSkeleton>` — `src/components/LoadingSkeleton.tsx`
- `<EmptyState>` — `src/components/EmptyState.tsx`

`<PageHeader>` wraps the top of the content branch (not the loading/error branches). Adopt this pattern explicitly in every list/detail page during ILE-22.
## Overlay glass policy

**Added in ILE-23. Reference: `src/theme/tokens.ts` (`surfaces`, `shadows`).**

The charcoal design uses a two-tier glass language for overlays. Glass is **never** applied to data tables, form inputs, or line editors — only to container surfaces.

### Tier 1 — Modal / Spotlight (elevatedHigh)

| Token | Value |
|---|---|
| `surfaces.elevatedHigh` | `rgb(18 18 18 / 0.85)` |
| `surfaces.elevatedHighBlur` | `16px` |
| `surfaces.meniscus` | `1px solid rgb(255 255 255 / 0.06)` |
| `shadows.modalGlass` | `0 8px 40px 0 rgb(0 0 0 / 0.6), 0 2px 8px 0 rgb(0 0 0 / 0.3)` |

Applied to: all Mantine `<Modal>` via theme component defaults (`src/theme/mantine.ts`); Spotlight command palette via per-instance `styles` prop (theme defaults do not propagate to `@mantine/spotlight`).

Transition: `pop` at 180ms (strips under `prefers-reduced-motion`).

### Tier 2 — Popover / Menu (elevated)

| Token | Value |
|---|---|
| `surfaces.elevated` | `rgb(18 18 18 / 0.72)` |
| `surfaces.elevatedBlur` | `12px` |
| `surfaces.meniscus` | (same as tier 1) |
| `shadows.popover` | `0 4px 16px 0 rgb(0 0 0 / 0.4)` |

Applied to: all Mantine `<Popover.Dropdown>` and `<Menu.Dropdown>` via theme component defaults.

### KPI dashboard widgets

`ExpiringSoonWidget` and `FinancialSummary` outer `<Card>` wrappers use `surfaces.elevated` + 12px blur (Tailwind classes `bg-surface-elevated backdrop-blur-elevated`). The meniscus top border is applied via the `style` prop. Data tables inside both widgets stay opaque — no glass on table rows, cells, or headers.

### Accessibility

All glass surfaces declare a `@media (prefers-reduced-transparency: reduce)` override (handled by Tailwind's `backdrop-filter` utility) reverting to solid charcoal. The `pop` modal transition strips under `prefers-reduced-motion: reduce` via Mantine's built-in motion hook.
