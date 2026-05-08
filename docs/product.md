# Ilex Inventory — Client Surface

This document covers the **frontend surface**: pages, UX patterns, modes, brand. Product positioning, business flows, and backend constraints live in [`../../IlexInventory-Server/docs/product.md`](../../IlexInventory-Server/docs/product.md).

---

## Users

Single human actor per account: the **owner**. Wears two hats inside one account:

- **Buyer / ops manager** — dashboards, financial views, recall ops, PO creation
- **Warehouse coordinator** — receiving, fulfillment, manual stock adjustments

Floor mode is a **UI mode toggle**, not a separate role.

The **agent** ("Ask Ilex") is a tool the owner invokes — not a separate user.

---

## Pages

### Public

| Page | Path | Purpose |
|---|---|---|
| Login | `/login` | Cookie session login |
| Sign up | `/signup` | Simplest possible — email + password |

### Authenticated

App shell wraps every page below: sidebar nav + topbar + persistent agent panel + ⌘K command palette + floor-mode toggle.

| Page | Path | Realizes |
|---|---|---|
| Dashboard | `/` | R2 expiring widget, R3 financial summary, F11 export |
| Products list | `/products` | R1 (by product) |
| Product detail | `/products/:id` | R1, R6 movement audit (filtered) |
| POs list | `/purchase-orders` | R5 |
| PO new / draft | `/purchase-orders/new`, `/purchase-orders/:id/edit` | F3 (draft phase) |
| PO detail | `/purchase-orders/:id` | F3 (post-receive: read-only + batches) |
| SOs list | `/sales-orders` | R4 |
| SO new / draft | `/sales-orders/new`, `/sales-orders/:id/edit` | F7 (draft, FEFO preview) |
| SO detail | `/sales-orders/:id` | F7 (post-commit), F8 void |
| Stock by batch | `/stock` | R1 (alternative view) |
| Batch detail | `/batches/:id` | R6 audit, F5 adjust, F6 write-off, F9/F10 recall, F4 manual entry |
| Recall report | `/batches/:id/recall-report` | R7, F11 export |
| Settings | `/settings` | Account info, agent OAuth status |

### Cross-cutting modals

- **CSV import** — products (catalog), manual stock entry, optionally POs
- **Agent chat panel** — persistent, contextual; carries `{route, filters, selected_ids}` to the agent

Flow IDs (F1–F11) and read view IDs (R1–R7) are documented in [`../../IlexInventory-Server/docs/scratch-requirements.md`](../../IlexInventory-Server/docs/scratch-requirements.md) until they're formalized as flow specs.

---

## UX patterns

| Pattern | Behavior |
|---|---|
| ⌘K command palette | Keyboard-first nav, primary actions (new PO, new SO, recall, agent invoke) |
| Dense sortable tables | No big graphics; SKUs and IDs in monospace; sort + filter inline |
| Floor mode | High contrast, larger row heights, larger touch targets; persists in localStorage |
| Agent panel | Persistent right side; receives route + filters + selection context |
| Empty states | Agent prompts contextually ("Want me to import from CSV?") |
| Action confirmation | Mutating ops confirm in modal: PO receive, SO commit, recall, void, write-off |

---

## Modes

| Mode | Trigger | Effect |
|---|---|---|
| Standard | Default | Default density, hover states, full data |
| Floor | Toggle in nav | Higher contrast, larger touch targets, simplified row actions |

Floor mode is purely client-side. The API has no awareness of mode.

---

## Brand

Inherits from BE [`product.md §Brand`](../../IlexInventory-Server/docs/product.md#brand).

| | |
|---|---|
| Background | Charcoal `#121212` |
| Primary accent | Tereré green `#00C16A` |
| Warning (expiring soon) | Amber |
| Warning (expired / recalled) | Clay red |
| UI font | Inter |
| Data font | JetBrains Mono (SKUs, batch IDs, timestamps, prices) |

Logo: stylized mate-leaf icon + two-tone wordmark — `ilex` green, `inventory` white — on charcoal. The mark stands alone for favicon and app icon.

---

## Out of scope (FE v1)

- Native mobile apps (responsive web only; floor mode covers tablet)
- Barcode scanning / camera integration
- Push notifications, email alerts (the dashboard widget IS the channel)
- i18n / l10n (English; USD; UTC + browser-local display)
- Theme switcher (charcoal only)
- Invoice OCR (CSV import only)
