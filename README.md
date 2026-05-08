# Ilex Inventory — Client

React + TypeScript frontend for the Ilex Inventory Server. Pairs with [`../IlexInventory-Server`](../IlexInventory-Server).

## Stack

- **React 18 + TypeScript (strict)** — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- **Mantine v7** — components (Table, Modal, Spotlight ⌘K, DatePicker, TextInput)
- **Tailwind** — one-off styling + `floor:` variant for warehouse/tablet ergonomics
- **TanStack Query v5** — server state, cache, invalidation
- **TanStack Router** — file-based type-safe routing
- **Zustand** — lightweight client-only state (floor mode, etc.)
- **Decimal.js** — all money and quantity arithmetic (no JS `number` on those paths)
- **Vite** — dev server + production build
- **Vitest + Testing Library** — unit and component tests
- **MSW** — HTTP mock server for tests

## Setup

### Prerequisites

- Node 20+
- npm 10+

### Install

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Edit .env.local — set VITE_API_BASE_URL to your server origin
# Example: VITE_API_BASE_URL=http://localhost:8000/api/v1

# 3. Install dependencies
npm install

# 4. Start dev server
npm run dev
```

The app starts at `http://localhost:5173`. It will throw an error on startup if `VITE_API_BASE_URL` is missing (fail-fast per SPEC §2.10).

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server on port 5173 |
| `npm run build` | Type-check + production bundle → `dist/` |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (flat config, ESLint 9) |
| `npm run format` | Prettier write |
| `npm test` | Vitest (all tests, run once) |
| `npm run test:watch` | Vitest (watch mode) |
| `npm run preview` | Preview production build |

## Architecture

Four-layer: Routes → Features → Data → Generated API client.

No layer may import from a layer above it. Features call data hooks; data hooks call the generated client; routes never call the API directly.

See [`docs/architecture.md`](docs/architecture.md) for the full contract.

## Docs

- [`docs/product.md`](docs/product.md) — pages, flows, UX patterns, brand
- [`docs/architecture.md`](docs/architecture.md) — layers, data flow, conventions
- [`docs/decisions.md`](docs/decisions.md) — FE-specific technical decisions (D0–D7 locked; D8+ pending)
- [`docs/specs/SPEC.md`](docs/specs/SPEC.md) — full frontend spec
- [`docs/specification.md`](docs/specification.md) — spec format definitions

For product positioning, business flows, and backend constraints, see [`../IlexInventory-Server/docs/`](../IlexInventory-Server/docs/).
