# Ilex Inventory Client — Architecture

> A four-layer model separating routing, feature composition, data access, and the generated API contract.

For pages and UX patterns, see [`product.md`](product.md). For decisions, see [`decisions.md`](decisions.md). For server-side architecture, see [`../../IlexInventory-Server/docs/architecture.md`](../../IlexInventory-Server/docs/architecture.md).

## Architecture Overview

```
+---------------------------+
|        ROUTES LAYER       |
|     src/routes/*.tsx      |
|     (URL → page shell)    |
+---------------------------+
              |
              v
+---------------------------+
|       FEATURES LAYER      |
|   src/features/{domain}/  |
|  (page composition + UI)  |
+---------------------------+
              |
              v
+---------------------------+
|         DATA LAYER        |
|     src/data/{domain}/    |
| (TanStack Query hooks +   |
|       cache keys)         |
+---------------------------+
              |
              v
+---------------------------+
|     API CLIENT / TYPES    |
|     src/api/generated/    |
|   (from server's OpenAPI) |
+---------------------------+
```

**Critical Rule**: Data flows top to bottom only. No layer may import from layers above it.

---

## Hard Invariants

1. **No hand-written API types.** `src/api/generated/` is regenerated from the server's OpenAPI; no parallel types maintained by hand.
2. **No floats for money or quantity.** Decimal-precise display; arithmetic via `Decimal.js`. Storage and transit as strings (matching server's `numeric(14, 4)`).
3. **No bare `fetch` / `axios` outside the data layer.** All HTTP goes through TanStack Query hooks calling the generated client.
4. **No business logic in routes.** Routes assemble features; features call hooks; hooks own data.

---

## Layer Responsibilities

### Routes Layer

| Component | Responsibility |
|---|---|
| Route file | One per page; declares path + page component |
| Loader (optional) | Pre-fetch via TanStack Query before render |

**Location**: `src/routes/`

**Must only**:
- Declare routing
- Mount feature components
- Optionally pre-fetch via TanStack Query loaders

**Must NOT**:
- Call APIs directly
- Contain business logic
- Define forms inline

---

### Features Layer

| Component | Responsibility |
|---|---|
| Page components | Compose UI for a flow |
| Feature components | Domain-specific UI (PO line editor, FEFO preview, recall toggle, agent panel) |
| Forms | Validation + submission |

**Location**: `src/features/{domain}/` — `catalog/`, `procurement/`, `inventory/`, `sales/`, `financials/`, `agent/`, `auth/`.

**Must only**:
- Call data hooks
- Render Mantine + Tailwind
- Handle local UI state

**Must NOT**:
- Call the generated API client directly
- Contain HTTP retry / cache logic
- Maintain server state outside TanStack Query

---

### Data Layer

| Component | Responsibility |
|---|---|
| Query hooks | `use{Noun}Query`, `use{Noun}List` — wrap TanStack `useQuery` |
| Mutation hooks | `use{Verb}{Noun}Mutation` — wrap TanStack `useMutation` |
| Cache keys | Centralized per domain |

**Location**: `src/data/{domain}/`

**Must only**:
- Call the generated client
- Declare cache keys
- Handle invalidation on mutations

**Must NOT**:
- Render UI
- Parse responses ad-hoc (types come from the generated client)

---

### API Client / Types

| Component | Responsibility |
|---|---|
| Generated client | One typed function per server endpoint |
| Generated types | Request / response / schema shapes |

**Location**: `src/api/generated/`

**Owns**: the typed surface of the server.

**Boundaries**: regenerated from `IlexInventory-Server` OpenAPI; never hand-edited. Generated files are committed.

---

## Import Rules

| From / To | Routes | Features | Data | API |
|---|---|---|---|---|
| **Routes** | Yes | Yes | Yes (loaders) | No |
| **Features** | No | Yes | Yes | No |
| **Data** | No | No | Yes | Yes |
| **API** | No | No | No | Yes |

---

## Cross-cutting

| Concern | Location |
|---|---|
| Shared UI components | `src/components/` |
| UI-only hooks | `src/hooks/` |
| Formatters | `src/utils/` — money, qty, date |
| Stores (UI state) | `src/stores/` — floor mode, agent panel, ⌘K |
| Theme | `src/theme/` |
| Tests | colocated `*.test.tsx` |

---

## File Locations

| Item | Location | Pattern |
|---|---|---|
| Route | `src/routes/` | TanStack Router |
| Page component | `src/features/{domain}/{Page}.tsx` | one per page |
| Feature component | `src/features/{domain}/components/` | colocated |
| Query hook | `src/data/{domain}/queries.ts` | `use{Noun}Query` |
| Mutation hook | `src/data/{domain}/mutations.ts` | `use{Verb}{Noun}Mutation` |
| Cache keys | `src/data/{domain}/keys.ts` | per domain |
| Generated client | `src/api/generated/` | regenerated; never hand-edited |
| Money formatter | `src/utils/money.ts` | parses `numeric(14, 4)` strings |
| Qty formatter | `src/utils/qty.ts` | base-unit aware (g, ml, unit → kg, L on display) |

---

## Type generation

Server's `drf-spectacular` emits OpenAPI 3.1 → `openapi-typescript` (or `orval`) generates `src/api/generated/`. A `package.json` script regenerates against the running server. Generated files are committed; CI fails if regeneration produces a diff.

---

## Testing Strategy

| Type | What it tests | Tool |
|---|---|---|
| Component | Rendering + interactions | Vitest + Testing Library |
| Hook | Data fetching, cache invalidation | Vitest + TanStack Query test utils |
| Smoke / E2E | Critical flows (login → SO commit, recall) | TBD (Playwright leaning) |

CI gates:
- All tests pass
- `tsc --noEmit` passes (strict)
- Generated client up to date with server's OpenAPI
- No bare `fetch` / `axios` outside `src/data/` (grep gate)
- No `as any` outside generated client (grep gate)

---

## Adding a new page

1. Add route in `src/routes/`
2. Create page component in `src/features/{domain}/`
3. Add query / mutation hooks in `src/data/{domain}/`
4. Add the page to the table in `docs/product.md`
5. Tests: feature-level (Testing Library) + smoke (route renders)

---

## Adding a new feature component

1. Drop in `src/features/{domain}/components/`
2. Use Mantine + Tailwind (Tailwind for one-offs only)
3. Behavior tests over snapshots
