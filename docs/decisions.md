# Decisions — Ilex Client

Why the FE looks the way it does. One entry per load-bearing technical decision. Numbers are stable: a decision keeps its number even if superseded.

Cross-repo references use `BE-D{N}` for [`../../IlexInventory-Server/docs/decisions.md`](../../IlexInventory-Server/docs/decisions.md).

## D0 — UI library: Mantine + Tailwind

Mantine for components (forms, tables, modals, Spotlight ⌘K, Dates for expirations). Tailwind for one-off styling. No raw CSS modules outside `src/theme/`.

Rejected: pure Tailwind + headless UI (more boilerplate for tables/modals); MUI (Material aesthetic clashes with charcoal/F&B brand); Chakra (less momentum than Mantine).

## D1 — Server state: TanStack Query

All HTTP-bound state goes through TanStack Query. Cache keys centralized per domain in `src/data/{domain}/keys.ts`. No Redux, no global stores for server data.

Rejected: SWR (smaller community, weaker mutation ergonomics); Redux Toolkit Query (more boilerplate, redundant).

## D2 — Type generation from OpenAPI

`drf-spectacular` (server) emits OpenAPI 3.1 → `openapi-typescript` (or `orval`) generates `src/api/generated/`. Hand-written request/response types are forbidden. Regen is a `package.json` script; CI fails on drift.

Rejected: hand-written types (drift inevitable); GraphQL (server is REST); tRPC (incompatible with Django).

## D3 — Money / quantity precision

Storage and transit: strings (matching server's `numeric(14, 4)`, BE-D? on money column type). Display: formatter utils in `src/utils/`. Arithmetic: `Decimal.js`. Quantity stored in base units (g, ml, unit) per BE; display layer converts to kg, L on output.

Rejected: JS `number` (precision loss); BigInt (no decimal support).

## D4 — Floor mode

UI toggle in nav, persists in `localStorage`. Sets a class on `<html>`; theme tokens switch via Mantine theme variants + Tailwind variants. No API awareness.

## D5 — ⌘K command palette

Mantine Spotlight. Triggers cross-page nav, primary actions (new PO, new SO, recall batch), and agent invoke. Keyboard-first.

## D6 — Auth: cookie session

Session cookie set by server on login. CSRF token via DRF middleware. The agent uses a separate auth path (D7).

Rejected: JWT (token rotation overhead, no benefit at single-user scale); OAuth provider for users (overkill v1).

## D7 — Agent: Claude Max OAuth token

The agent uses the user's Claude Max OAuth token. Server-side proxy injects context `{route, filters, selected_ids}` per request. No service identity beyond the user's token.

Rejected: separate API key per user (key management overhead); fully server-mediated agent (loses Claude Max billing benefit).

---

## Pending / open

These default to the listed choice but are not yet locked. Each promotes to a numbered decision when committed.

| Topic | Default | Status |
|---|---|---|
| Routing library | TanStack Router (file-based) | open |
| Build tool | Vite + plugin-react | open |
| Form library | Mantine `useForm` + Zod for complex validation | open |
| State management (UI-only) | `zustand` for floor mode, agent panel, ⌘K state | open |
| Unit / component testing | Vitest + Testing Library | open |
| E2E testing | Playwright | open |
| CSV parsing | Papa Parse | open |
| Observability | Sentry | open |
