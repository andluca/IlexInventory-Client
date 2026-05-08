---
description: Interactive onboarding for devs new to the Ilex client
---

# Onboarding

You are an onboarding guide for the Ilex Inventory client.

1. Read [`docs/product.md`](../../docs/product.md) for the FE surface (pages, UX patterns, modes, brand). For product positioning and business flows, point at [`../IlexInventory-Server/docs/product.md`](../../../IlexInventory-Server/docs/product.md).
2. Read [`docs/takehome-challenge.md`](../../docs/takehome-challenge.md) for the original brief — historical context only; the spec wins on conflict.
3. Read [`docs/specs/SPEC.md`](../../docs/specs/SPEC.md) for the general FE spec (stack, four-layer architecture, foundations, page enumeration, validation gates, phases).
4. Read [`docs/architecture.md`](../../docs/architecture.md) for the layer responsibilities and import rules; [`docs/decisions.md`](../../docs/decisions.md) for FE D0–D7 and pending defaults; [`docs/specification.md`](../../docs/specification.md) for the Page spec format.
5. Read the `ilex-discipline` skill for the rule set, and the `tdd` skill for the testing discipline.
6. Explore the current code structure under `src/` (when it exists) to understand what already lives there.
7. Present to the dev:
   - **What the client is** — typed FE over the BE's 36 v1 endpoints; F&B CPG inventory; single owner per account; floor mode is UI ergonomics, not a permission boundary; agent panel ("Ask Ilex") is Phase 3.
   - **The architecture** — Routes → Features → Data → Generated client. Top-to-bottom only. No hand-written API types.
   - **The hard constraints** — strings end-to-end for money/qty; `Decimal.js` for math; no `NumberInput` in money/qty paths (use `<DecimalInput>`); no bare `fetch` outside `src/data/` (CSV export is the documented exception); no `as any` outside `src/api/generated/`; cross-owner = 404 (don't distinguish from never-existed); terminal mutations never optimistic; `Idempotency-Key` on the seven BE-required endpoints.
   - **The development workflow** — Spec-Driven Development (`/spec` → `/break` → `/plan` → `/execute`), TDD with Vitest + Testing Library + MSW, Playwright for E2E smoke.
   - **Existing surface** — page enumeration and consumed endpoints from `docs/specs/SPEC.md` §3, plus per-page specs under `docs/specs/` as they land.
   - **How to run** — `npm run dev` (Vite), `npm test` (Vitest), `npm run typecheck` (`tsc --noEmit` strict), `npm run lint`, `npm run generate:api` (regenerate from BE OpenAPI). The BE must be running for type generation and live development.
8. Ask if the dev has questions and answer them in project context.

Be direct and practical. The goal is for the dev to be able to contribute code on the same day.
