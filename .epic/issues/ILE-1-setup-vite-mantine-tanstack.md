---
id: ILE-1
github_id: null
status: completed
assignee: null
state: Done
type: item
depends_on: []
completed_at: "2026-05-08"
---

# ILE-1 Setup project tooling

## Status

**Already implemented** — commit `b5b5aef` (`feat: scaffold Vite + React + Mantine + TS strict project (issue 001)`). Skip during `epic project build`. Listed here for dependency wiring of downstream issues.

## Overview

Bootstrap the Vite + React 18 + TypeScript (strict) project with Mantine v7, Tailwind, TanStack Router, TanStack Query v5, Zustand, ESLint, Prettier, Vitest + Testing Library, and MSW. Land the `<DecimalInput>` shared component (the invariant-bearing alternative to Mantine `NumberInput` for money/qty fields per SPEC §2.4) plus the `money.ts` / `qty.ts` formatters with unit tests. Configure path aliases, env handling (fail-fast on `VITE_API_BASE_URL` per SPEC §2.10), the Mantine charcoal theme, and the npm scripts (`dev`, `test`, `typecheck`, `lint`, `build`).

## Surface

- [x] `src/components/DecimalInput.tsx` (+ `.test.tsx`)
- [x] `src/utils/money.ts`, `src/utils/qty.ts` (+ unit tests, including precision-sensitive values like `"0.0001"`)
- [x] `src/test/render.tsx` providers helper (Mantine + QueryClient + Router memory history)
- [x] `src/theme/` Mantine theme (charcoal, tereré green) + Tailwind config (`floor:` variant)
- [x] `vite.config.ts`, `tsconfig.json` (strict), `tailwind.config.ts`, `eslint.config.js`, `vitest.config.ts`
- [x] `package.json` scripts: `dev`, `test`, `typecheck`, `lint`, `build`
- [x] `.env.example`, README setup section

## Result

48/48 tests green. Typecheck strict + lint clean. `npm run build` produces a working production bundle. Followup fix in commit `6c73d29` redirected `tsconfig.node.json`'s `outDir` to `node_modules/.cache/tsc-node` so emitted `.d.ts` files don't pollute `src/`.
