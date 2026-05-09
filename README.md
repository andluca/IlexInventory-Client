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
| `npm run lint` | ESLint (flat config, ESLint 9) + grep gates |
| `npm run format` | Prettier write |
| `npm test` | Vitest (all tests, run once) |
| `npm run test:watch` | Vitest (watch mode) |
| `npm run test:e2e` | Playwright E2E (requires live BE + dev server) |
| `npm run test:e2e:ui` | Playwright E2E in UI/debug mode |
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

## E2E Tests

Playwright tests live in `tests/e2e/`. They drive a real browser against a running BE — MSW is not involved.

### Prerequisites

1. The BE (`IlexInventory-Server`) must be running on `http://localhost:8000` (or the value of `VITE_API_PROXY_TARGET`).
2. Install Playwright browsers once: `npx playwright install chromium`

### Commands

```bash
# Run all E2E tests (Playwright auto-starts the Vite dev server)
npm run test:e2e

# Open Playwright UI for interactive debugging
npm run test:e2e:ui
```

### Test files

| File | Coverage |
|---|---|
| `tests/e2e/critical-flow.spec.ts` | Full happy path: signup → product → PO receive → SO commit → recall → recall report → CSV |
| `tests/e2e/fefo-shortfall.spec.ts` | FEFO shortfall: commit blocked when requested qty > available |
| `tests/e2e/fixtures/api.ts` | Seed helpers: `signupViaApi`, `createProduct`, `createAndReceivePO`, `createSO` |

### Configuration

- Base URL: `VITE_E2E_BASE_URL` (default `http://localhost:5173`)
- BE origin: `VITE_API_PROXY_TARGET` (default `http://localhost:8000`)
- Browser: Chromium only (Firefox/Safari out of scope for v1)
- Retries: 0 locally, 2 in CI

## Deployment

The app is deployed to **Vercel** as a Vite SPA. Every push to `main` triggers a production deploy; every PR gets a preview deploy with its own URL.

### First-time setup (user-only steps)

1. Install the Vercel CLI: `npm i -g vercel`
2. Link the repo: `vercel link` (follow the prompts; this creates `.vercel/project.json`)
3. Copy the IDs from `.vercel/project.json` into GitHub repo secrets:
   - `VERCEL_TOKEN` — your Vercel personal access token (Account Settings → Tokens)
   - `VERCEL_ORG_ID` — value of `orgId` from `.vercel/project.json`
   - `VERCEL_PROJECT_ID` — value of `projectId` from `.vercel/project.json`
4. In the Vercel dashboard, set env vars for **Production** and **Preview** scopes:
   - `VITE_API_BASE_URL` = `https://api.yourbackend.example.com/api/v1`

### CI pipeline (`.github/workflows/ci.yml`)

Runs on every PR and push to `main`. Steps:

1. `npm run typecheck`
2. `npm run lint` (ESLint + grep gates)
3. `npm test` (Vitest unit + integration tests)
4. `npm run generate:api -- --check` (generated client drift vs committed snapshot)
5. `npm run build` (production bundle)

**Note:** E2E tests do not run in CI — they require a live BE which is a separate service. Run `npm run test:e2e` locally before deploying.

### SPA routing

`vercel.json` contains a catch-all rewrite so every path (e.g. `/products/abc-123`) serves `index.html`. TanStack Router handles client-side routing from there.

## Runbook

### Redeploy a previous version

1. Open the Vercel dashboard → Deployments
2. Find the deployment you want to promote
3. Click "..." → "Promote to Production"

### Roll back an env-var change

1. Vercel dashboard → Settings → Environment Variables
2. Edit the variable and save
3. Trigger a new deployment (push an empty commit or redeploy from the dashboard)

### Incident contact

Raise a GitHub issue on this repo. For BE incidents, contact the server team directly.
