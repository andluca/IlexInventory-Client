# Landing-page copy + voice

Verbatim strings worth keeping from the v0 prototype, plus voice notes so we don't drift when writing in-app empty states, error messages, and modal consequences.

---

## Voice

- **Direct, F&B-fluent.** Talk like an ops manager talking to ops managers. No "delight," "seamless," "powerful," "unleash." Prefer concrete words: batch, lot code, FEFO, recall, shrinkage, expiration, commit, void.
- **Show consequence.** When asking the user to confirm an action, state what will happen *and* what won't. (See `<ConfirmModal>` copy library in [`components.md`](components.md).)
- **The agent is a tool, not a persona.** "Ask Ilex" is a verb — never anthropomorphize ("Ilex thinks…", "Ilex is happy to help…"). Render its responses as data, not chat-buddy prose.
- **Numbers are facts.** Don't qualify them ("approximately," "around"). The dashboard says `$900`, not `~$900`.
- **No exclamation marks** anywhere in the product UI. Exception: hero CTAs where one is allowed if it earns its keep.

---

## Landing page — verbatim strings

### Top nav

```
Logo (left)        Product   How it works   Pricing   Sign in        [Start free]
```

### Hero

**H1 (display):**
```
Inventory built
for F&B brands,
not retail.
```

**Subhead (single sentence):**
```
Track every batch, every lot code, every expiration.
Sell first-expiring-first-out. Recall in one click.
```

**CTAs:**
- Primary: `Start free`
- Secondary: `See how it works`

**Hero card mock (right column):**
- Header: `Batch Inventory` (left), `3 batches` (right, text-muted)
- Three rows in dense mono table:
  - `Cold Brew 12oz` · `LOT-2024-A11` · `Mar 15` · pill `248`
  - `Oat Latte 16oz` · `LOT-2024-B07` · `Mar 22` · pill `156`
  - `Matcha Concentrate` · `LOT-2024-C03` · `Apr 01` · pill `89`

Pills use tereré-green at 15% alpha background, tereré text — matches `<StatusBadge tone="tereré">`.

### Differentiators row (4 columns)

| Icon | Label | Body |
|---|---|---|
| `Layers` | **Batch-aware stock** | Every receipt creates a discrete batch tied to a supplier lot code and expiration date. |
| `ArrowDownUp` | **FEFO routing** | See exactly which batches will fulfill an order before you commit. First-expiring-first-out. |
| `AlertTriangle` | **One-click recall** | Toggle a batch to recalled and instantly see every customer who received units from that lot. |
| `Receipt` | **FIFO cost layers** | Profit margins calculate from the actual cost of the batch sold, not a blended average. |

### "Query, draft, explain" band

**H2 (left column):**
```
Query, draft, explain.
```

**Body:**
```
Ask Ilex what batches expire next week.
Draft a PO from a text prompt.
Ask why margin dropped last month.
```

**Chat mock (right column):**

User bubble: `What's expiring next week?`

Ilex response, rendered as a real `<DataTable>` with three rows:
```
Product           Lot              Expires    Units
Oat Latte 16oz    LOT-2024-B07     Mar 20     156
Cold Brew 12oz    LOT-2024-A11     Mar 24     48
Espresso Shots 8pk LOT-2024-D19    Mar 28     72
```

Above the response, a small assistant marker: `→ 3 batches expiring in the next 7 days:`

### "How it works" — 3-step grid

| # | Title | Body |
|---|---|---|
| 1 | **Receive a PO** | Log incoming stock with lot codes, expiration dates, and supplier info. Each receipt creates a traceable batch. |
| 2 | **Sell with FEFO** | When you draft a sales order, Ilex routes to first-expiring batches automatically. No manual picking logic. |
| 3 | **Recall when you need to** | One toggle blocks a lot from future sales and generates a customer impact report instantly. |

### Footer

```
Logo  ·  Made for F&B CPG brands  ·  © 2026 Ilex
```

Minimal. No social links, no testimonials, no newsletter signup.

---

## In-app copy patterns

### Empty states (per archetype A3)

| Surface | Title | Body | Agent prompt |
|---|---|---|---|
| `/products` | `No products yet` | `Add your first product, or import from a CSV.` | `Want me to import from CSV?` |
| `/purchase-orders` | `No purchase orders yet` | `Draft a PO to start tracking incoming stock.` | `Draft a PO for {top supplier}?` (when a supplier is recently used) |
| `/sales-orders` | `No sales orders yet` | `Create an SO to start logging sales.` | `Create an SO for {recent customer}?` |
| `/stock` | `No batches yet` | `Receive a PO or add a batch manually.` | (none — actionable buttons are enough) |
| `/batches/:id/recall-report` (no recipients) | `No customers received this batch` | `No committed sales orders include this batch.` | (none) |

### Loading states

Use Mantine `<Skeleton>` rows that match the table density. Header row stays visible; body rows are skeletons. Don't use a centered spinner for tabular content.

### Error toasts

The data layer normalizes the BE 4xx envelope. For non-form errors:

| Code | Toast |
|---|---|
| 401 | `Session expired. Redirecting to sign in.` (then redirect) |
| 403 | (impossible per BE-D4 — log + treat as 500) |
| 404 | `Not found.` (or render the page-level Not found state) |
| 409 | (terminal-mutation specific; see below) |
| 422 | `{detail}` — usually a domain-specific reason like "Insufficient stock for {product}" |
| 500 | `Something broke on our end. Try again in a moment.` |

### 409 stale-state toasts (per SPEC §2.5)

| Mutation | Toast on 409 |
|---|---|
| PO receive | `This PO has already been received elsewhere.` |
| PO PATCH/DELETE post-receive | `This PO has already been received and can't be edited.` |
| SO commit | `This sales order has already been committed elsewhere.` |
| SO PATCH/DELETE post-commit | `This sales order has already been committed and can't be edited.` |
| SO void | `This sales order has already been voided.` |
| Batch recall | `This batch has already been recalled.` |

In all cases, the data layer also refetches the affected detail so the UI catches up to server state.
