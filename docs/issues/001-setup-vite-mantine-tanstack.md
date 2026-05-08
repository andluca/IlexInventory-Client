# Setup project tooling

## Overview

Bootstrap the Vite + React 18 + TypeScript (strict) project with Mantine v7, Tailwind, TanStack Router, TanStack Query v5, Zustand, ESLint, Prettier, Vitest + Testing Library, and MSW. Land the `<DecimalInput>` shared component (the invariant-bearing alternative to Mantine `NumberInput` for money/qty fields per SPEC §2.4) plus the `money.ts` / `qty.ts` formatters with unit tests. Configure path aliases, env handling (fail-fast on `VITE_API_BASE_URL` per SPEC §2.10), the Mantine charcoal theme, and the npm scripts (`dev`, `test`, `typecheck`, `lint`, `build`).

## Surface

- [ ] `src/components/DecimalInput.tsx` (+ `.test.tsx`)
- [ ] `src/utils/money.ts`, `src/utils/qty.ts` (+ unit tests, including precision-sensitive values like `"0.0001"`)
- [ ] `src/test/render.tsx` providers helper (Mantine + QueryClient + Router memory history)
- [ ] `src/theme/` Mantine theme (charcoal, tereré green) + Tailwind config (`floor:` variant)
- [ ] `vite.config.ts`, `tsconfig.json` (strict), `tailwind.config.ts`, `eslint.config.js`, `vitest.config.ts`
- [ ] `package.json` scripts: `dev`, `test`, `typecheck`, `lint`, `build`
- [ ] `.env.example`, README setup section

## Dependencies

None — independent of BE per SPEC §5 phase 1.

## Context

### What already exists

- `docs/specs/SPEC.md` — full FE spec; §2.1 (framework), §2.4 (money/qty + DecimalInput), §2.10 (config), §4 (validation gates), §5 phase 1.
- `docs/architecture.md` — four-layer architecture and import rules.
- `docs/decisions.md` — D0–D7 (Mantine + Tailwind, TanStack Query, OpenAPI types, Decimal strings, floor mode, ⌘K, cookie auth, agent OAuth) plus open defaults (TanStack Router, Vite, Mantine `useForm` + Zod, Zustand, Vitest, Playwright, Papa Parse, Sentry).
- `docs/design/tokens.md` — canonical token surface to port into `src/theme/tokens.ts` (OKLCH + hex + 5-step neutral scale + type scale + density + radius + focus). Specifies Mantine theme mapping (`terere` / `clay` / `amber` / `dark` overrides), tabular-nums numerics, density (36px default / 48px floor row, 36px / 44px input).
- `docs/design/README.md` — 7 prototype deviations: margin formula 900%, PO lifecycle `draft|received` only, no partial receipts, drop PO `Duplicate/Export PDF/Cancel`, charcoal-only (drop `:root` light), Inter + JetBrains Mono fonts (NOT Geist), recall = modal not switch.
- `docs/design/components.md` §`<DecimalInput>` — full prop signature, behavior, precision default 4, regex validation, string-only contract, tabular-nums.
- `docs/issues/status.md` — issue ledger; status currently `pending`.
- `public/ilex_logo_v4.svg` — brand mark to surface in the `/login` placeholder.
- `src/` is empty — true greenfield. No existing files conflict.

### Spec reference

- SPEC §2.1 — React 18 + TS strict + Vite + TanStack Router + TanStack Query v5 + Mantine v7 + Tailwind + Vitest + Testing Library; Playwright deferred to issue 010.
- SPEC §2.4 — strings end-to-end for money / qty, `Decimal.js` arithmetic, `<DecimalInput>` is the only allowed input for money/qty paths, grep gate on `NumberInput` in `src/features/`.
- SPEC §2.10 — fail-fast on missing `VITE_API_BASE_URL`. `VITE_OPENAPI_URL` and `VITE_SENTRY_DSN` documented but not consumed in this issue.
- SPEC §4 — universal validation gates. No `as any`, no bare `fetch` outside data layer, generated client check (deferred until issue 002 lands the script).
- SPEC §5 phase 1 — explicitly enumerates this issue's deliverables: Vite + TS strict, Mantine + Tailwind config, TanStack Router + Query, ESLint + Prettier, Vitest, env template, `<DecimalInput>` shared component.

### Decisions already made that affect this issue

- D0: Mantine + Tailwind, no raw CSS modules outside `src/theme/`.
- D1: TanStack Query v5 owns server state — provider wired now even though no queries ship yet.
- D3: money / qty as strings, `Decimal.js`, `g`/`ml`/`unit` base units, kg/L conversion at the formatter boundary.
- D4: floor mode toggles a class on `<html>`. Tailwind `floor:` variant + Mantine theme variant must compile from day one.
- D5: ⌘K via Mantine Spotlight — package installed now, wired in issue 009.
- Pending defaults from `docs/decisions.md` consumed here: TanStack Router, Vite, Mantine `useForm` + Zod, Zustand, Vitest, Papa Parse (installed but not used yet), Sentry (DSN env documented, SDK not installed yet).
- Charcoal-only (no light mode); Inter + JetBrains Mono via Fontsource (not Geist); recall is modal-confirmed (not relevant here, but the `<ConfirmModal>` contract influences theme button hierarchy).

## Plan

### Generated types (when applicable)

Not applicable. Issue 002 owns `npm run generate:api`, `src/api/generated/`, `src/api/client.ts`, and the openapi-typescript wiring. This issue must NOT create `src/api/`.

### Data layer (where applicable)

Not applicable for this issue's domain hooks. The TanStack Query `QueryClient` provider IS wired in `src/test/render.tsx` and the (eventual) app entry, but no `src/data/` hooks land here.

### Components & features (where applicable)

- `src/components/DecimalInput.tsx` — Mantine `<TextInput>` wrapped with regex validation. Props match `docs/design/components.md`: `value: string`, `onChange: (next: string) => void`, optional `precision` (default `4`), `min`, `max`, `unit`, `placeholder`, `disabled`, `error`. Regex built dynamically from `precision`: `^\d*(\.\d{0,${precision}})?$` (matches the design spec verbatim). On blur: trim trailing `.`, do NOT pad zeros (preserves user-entered precision; matches `<DecimalInput>` spec "normalizes trailing decimal `5.` → `5`"). When `unit` is set, render the unit suffix as a Mantine `rightSection` styled `text-muted` and apply `tabular-nums` + right-align via Tailwind (`tabular-nums text-right`).
  - **Defensive note:** the design spec also says "strips leading zeros on blur"; the literal interpretation breaks `"0.5"` (would become `".5"`). Implement as: collapse multi-leading zeros on integers (`"007"` → `"7"`), but keep a single leading zero before a decimal point (`"0.5"` stays). Document this in a code comment + test cases.
  - Imports `Decimal.js` only when needed for `min`/`max` comparison on blur — keep the dependency graph small.
  - No state owned beyond the controlled input — caller owns the string.

No feature components in this issue. Auth `/login` page is owned by issue 003 (App shell + auth). This issue ships only a **placeholder** route component (see Routes below).

### Routes (where applicable)

- `src/routes/__root.tsx` — TanStack Router root route. Mounts `MantineProvider` (with the charcoal theme), `QueryClientProvider`, `<Outlet />`, and Mantine's `<Notifications />` host. Wraps in `React.StrictMode` at the entry, not the root route.
- `src/routes/index.tsx` — minimal placeholder rendering "Ilex Inventory" + a link to `/login` (so `npm run dev` proves the router works).
- `src/routes/login.tsx` — placeholder rendering the brand mark (`/ilex_logo_v4.svg`) and the text "Login coming in issue 003." Acceptance criterion `npm run dev` boots → `/login` renders is satisfied.
- `src/routeTree.gen.ts` — generated by `@tanstack/router-vite-plugin`; committed (TanStack Router convention) so first run isn't dependent on plugin codegen.
- `src/main.tsx` — entry: env validation (fail-fast on `VITE_API_BASE_URL`), `Decimal.js` global config (`Decimal.set({ precision: 28 })`), font imports (`@fontsource/inter`, `@fontsource/jetbrains-mono`), Tailwind CSS import, Mantine CSS import, then mounts the router into `#root`.

### Tests (write FIRST)

All tests are colocated `*.test.ts(x)` next to the unit they cover (architecture.md convention). Tests use Vitest's `jsdom` environment.

- `src/utils/money.test.ts` — `describe("formatMoney")`:
  - `it("formats a 4-decimal numeric string at currency precision")` — `formatMoney("1000.0000")` → `"$1,000.00"`.
  - `it("preserves precision on sub-cent inputs")` — `formatMoney("0.0001")` round-trips through `Decimal` without `1e-4` exponent leakage in the output.
  - `it("renders the brief example")` — `formatMoney("900.0000")` → `"$900.00"` (the BE-D13 margin example).
  - `it("handles negative values")` — `formatMoney("-100.5000")` → `"-$100.50"`.
  - `it("throws on a non-decimal string")` — guards against accidental `"abc"` / `""` inputs.
  - `it("does NOT use Number()")` — assertion via spy that `Number` / `parseFloat` are never invoked on the input (catches accidental float coercion). Optional, but cheap.
- `src/utils/money.test.ts` — `describe("parseMoneyString")` (helper for forms): round-trip a user-typed string through `Decimal` and back, asserting `parseMoneyString("1000.0000")` is a `Decimal` whose `toFixed(4)` equals `"1000.0000"`.
- `src/utils/qty.test.ts` — `describe("formatQty")`:
  - `it("renders g unchanged below 1000")` — `formatQty("500.0000", "g")` → `"500 g"`.
  - `it("converts g → kg above the threshold")` — `formatQty("1500.0000", "g")` → `"1.5 kg"`.
  - `it("converts ml → L above 1000")` — `formatQty("2500.0000", "ml")` → `"2.5 L"`.
  - `it("preserves precision on sub-gram amounts")` — `formatQty("0.0001", "g")` → `"0.0001 g"` (no exponent leakage).
  - `it("renders unit base as-is")` — `formatQty("12.0000", "unit")` → `"12 units"` (or `"12 unit"` — finalize at impl time, but lock in test).
- `src/utils/qty.test.ts` — `describe("toBaseUnit")` / `describe("fromBaseUnit")` for the form-layer kg→g and L→ml conversion. `toBaseUnit("1.5", "kg")` → `"1500.0000"`. Round-trip identity test for sub-gram values.
- `src/components/DecimalInput.test.tsx` — `describe("<DecimalInput>")`:
  - `it("renders with the supplied value")` — passes `"100.0000"`, asserts the input displays it.
  - `it("emits string on change")` — user types `"50.5"`, `onChange` is called with `"50.5"` (string, never number).
  - `it("rejects characters that violate the regex")` — typing `"abc"` does NOT call `onChange` (or calls with the previous-valid value).
  - `it("respects custom precision")` — with `precision={2}`, typing `"5.123"` is rejected (or truncated — match the regex spec).
  - `it("normalizes trailing dot on blur")` — `"5."` → `"5"` on blur.
  - `it("preserves a single leading zero before decimal")` — `"0.5"` survives blur as `"0.5"` (not `".5"`).
  - `it("renders the unit suffix when supplied")` — `unit="kg"` shows "kg" in `rightSection`.
  - `it("uses tabular-nums and right-aligns when unit is set")` — DOM class assertion.
  - `it("surfaces the error prop")` — error message renders.
  - `it("round-trips a precision-sensitive value")` — `value="0.0001"` renders, change event re-emits `"0.0001"` exactly (no `1e-4`).
- `src/test/render.test.tsx` — sanity test: a trivial component rendered through `renderWithProviders` sees a Mantine theme color and a `QueryClient`. Catches provider regressions early.

`vitest.config.ts` runs with `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, `globals: false` (explicit imports), `css: true` (so Mantine styles don't crash). MSW server is initialized in `src/test/setup.ts` (`server.listen({ onUnhandledRequest: 'error' })`) even though zero handlers ship — this proves the wiring works and is ready for issue 002.

### Implementation

Each step lists path + layer.

1. **Init `package.json`** at repo root. Pin: `react@^18.3`, `react-dom@^18.3`, `typescript@^5.5` (strict), `vite@^5`, `@vitejs/plugin-react@^4`. Scripts: `dev` (`vite`), `build` (`tsc && vite build`), `typecheck` (`tsc --noEmit`), `lint` (`eslint .`), `format` (`prettier --write .`), `test` (`vitest run`), `test:watch` (`vitest`), `preview` (`vite preview`). Layer: Root config.
2. **`tsconfig.json` + `tsconfig.node.json`**. `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: true`, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, `paths: { "@/*": ["src/*"] }`. Layer: Root config.
3. **`vite.config.ts`** — `@vitejs/plugin-react`, `@tanstack/router-vite-plugin`, alias `@` → `src`, `define` for `import.meta.env` typing, `server.port: 5173`. Layer: Root config.
4. **`vite-env.d.ts`** — `interface ImportMetaEnv { VITE_API_BASE_URL: string; VITE_OPENAPI_URL?: string; VITE_SENTRY_DSN?: string }`. Layer: Root config.
5. **`.env.example`** — documents the three env vars from SPEC §2.10. `.env.local.example` deferred — keep one example. Add `.env.local` to `.gitignore` (already ignored? confirm).
6. **`.eslintrc` / `eslint.config.js`** (flat config, ESLint 9). React, TypeScript, JSX-a11y, react-hooks, import-order, no-restricted-imports rule banning `axios` from `src/features/` and `src/routes/`. Layer: Root config.
7. **`.prettierrc`** — minimal: `singleQuote: true`, `semi: false`, `printWidth: 100`. Layer: Root config.
8. **Tailwind: `tailwind.config.ts` + `postcss.config.js` + `src/theme/global.css`**. Tailwind dark-only (no `media` strategy). Custom `floor:` variant via `addVariant('floor', '&.floor, .floor &')` so any element under `<html class="floor">` can opt into floor styles. Theme `extend.colors` reads from `src/theme/tokens.ts`. Type scale + spacing + radius mirror tokens. Tabular-nums utility class baked in. Layer: Theme.
9. **`src/theme/tokens.ts`** — port every value from `docs/design/tokens.md`: brand colors (charcoal, surface, surface-2, border, text, text-muted, tereré, tereré-fg, amber, amber-fg, clay, clay-fg), 5-step gray scale, type scale (display/h1/h2/body/body-sm/caption/mono/mono-lg/kpi), spacing (xs..2xl), density (rowHeightDefault/Floor, inputHeightDefault/Floor), radius (sm..xl), shadows, focus ring values. Export as a typed const so Tailwind config + Mantine theme both consume from one place. Comment header: "Generated from docs/design/tokens.md. Update both together." Layer: Theme.
10. **`src/theme/mantine.ts`** — Mantine theme builder. `colors.terere` via `colorsTuple('#00C16A')`, indexed at 6. `colors.clay` `#DC2626` indexed at 6. `colors.amber` `#F59E0B` indexed at 5. Override `dark[5..7]` to `#2A2A2A / #1B1B1B / #121212`. `primaryColor: 'terere'`, `primaryShade: { dark: 6 }`. `defaultRadius: 'md'`. `fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'`. `fontFamilyMonospace: '"JetBrains Mono", ui-monospace, monospace'`. `focusRing: 'auto'`. `components.Button.defaultProps.size: 'sm'` (36px to match design density). Layer: Theme.
11. **`src/theme/global.css`** — `@tailwind base; @tailwind components; @tailwind utilities;`. Body: `bg-charcoal text-text font-sans tabular-nums`. Sets `<html>` to dark unconditionally. Adds `:root { --radius: 0.5rem; }` (no light variant per design deviation #5). Layer: Theme.
12. **Fonts** — `@fontsource/inter` (400/500/700) + `@fontsource/jetbrains-mono` (400/500). Imported once from `src/main.tsx`. Layer: Theme.
13. **`src/main.tsx`** — entry. Validates `import.meta.env.VITE_API_BASE_URL` is non-empty (throws with a helpful message if missing — fail-fast per SPEC §2.10). Configures `Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN })`. Mounts the TanStack Router `RouterProvider`. Wrapped in `React.StrictMode`. Layer: Entry.
14. **`src/router.ts`** — TanStack Router setup. Imports `routeTree.gen.ts`. `createRouter({ routeTree, defaultPreload: 'intent' })`. Layer: Routes.
15. **Routes (placeholders)** — `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/login.tsx` per the Routes section above. Layer: Routes.
16. **`src/components/DecimalInput.tsx`** — implementation per the Components section. Layer: Component.
17. **`src/utils/money.ts`** — `formatMoney(value: string, opts?: { currency?: string; locale?: string }): string` using `Decimal` + `Intl.NumberFormat` (`currency: 'USD'`, `locale: 'en-US'`). Helper `parseMoneyString(value: string): Decimal`. Sub-cent values are rounded by `Intl.NumberFormat`'s `maximumFractionDigits: 2` for display, but `parseMoneyString` preserves full precision for arithmetic. Layer: Util.
18. **`src/utils/qty.ts`** — `formatQty(value: string, baseUnit: 'g' | 'ml' | 'unit'): string` with conversion threshold (1000 g → kg, 1000 ml → L). `toBaseUnit(displayValue: string, displayUnit: 'kg' | 'L' | 'g' | 'ml' | 'unit'): string` and `fromBaseUnit`. All math via `Decimal`. Layer: Util.
19. **`src/test/setup.ts`** — Vitest setup. `import '@testing-library/jest-dom'`. Initializes the MSW node `server` from `src/test/server.ts` with `onUnhandledRequest: 'error'`. `afterEach(server.resetHandlers)`. Layer: Test infra.
20. **`src/test/server.ts`** — `setupServer()` with **zero handlers** (no BE yet). Exported so issue 002 onward can `server.use(...)` in individual tests. Layer: Test infra.
21. **`src/test/render.tsx`** — `renderWithProviders` wrapping children in `MantineProvider` (charcoal theme), `QueryClientProvider` (per-test fresh `QueryClient` with `retry: false`), and TanStack Router `RouterProvider` with a memory history when a route is supplied (skip the router wrapper for non-route units). Re-exports from Testing Library so feature tests have one import. Layer: Test infra.
22. **`vitest.config.ts`** — `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, `css: true`, alias `@` → `src`. Layer: Root config.
23. **`README.md`** — replace the "Bootstrap not yet committed" stub with the real setup section: prerequisites (Node 20+, npm 10+), `cp .env.example .env.local`, `npm install`, `npm run dev`, `npm test`, `npm run typecheck`. Cross-link to `docs/specs/SPEC.md` and `docs/architecture.md`. Layer: Docs.
24. **`.gitignore`** — already exists; append `node_modules/`, `dist/`, `.env.local`, `.vite/`, `coverage/`, `*.log`. Layer: Root config.

### Integration / wiring

- Router registration: `routeTree.gen.ts` is committed (regenerated by the Vite plugin on dev). Routes file convention is `src/routes/*.tsx` per `docs/architecture.md`.
- ⌘K Spotlight: package installed (`@mantine/spotlight`), provider NOT yet mounted (issue 009 owns wiring). Note in code comment: "Spotlight provider mounted in issue 009."
- Floor-mode: Tailwind `floor:` variant is compiled and ready; the toggle UI lands in issue 003. No store needed yet.
- Stores: `src/stores/` directory created with a placeholder `floor-mode.ts` that exports a Zustand store (`useFloorMode` with `enabled: boolean`, `toggle()`, persisted to `localStorage` under key `ilex.floorMode`). The toggle button is added in issue 003, but landing the store now keeps issue 003 small.
- Theme tokens: Tailwind config and Mantine theme both import from `src/theme/tokens.ts` — single source of truth.

### Documentation to update

- `README.md` — replace Setup section (per implementation step 23).
- `docs/decisions.md` — **do not** graduate pending defaults yet. They're still defaults; numbered decisions accrue when they prove load-bearing through a real issue. Note in the issue's Notes section if any pending default needs to graduate later.
- `docs/specs/SPEC.md` — no change; this issue implements §5 phase 1 verbatim.
- `docs/issues/status.md` — mark issue 001 `planned`, log entry.

## Files involved

Created:
- `package.json`
- `package-lock.json` (generated by `npm install`)
- `tsconfig.json`, `tsconfig.node.json`
- `vite.config.ts`
- `vite-env.d.ts`
- `vitest.config.ts`
- `tailwind.config.ts`
- `postcss.config.js`
- `eslint.config.js`
- `.prettierrc`
- `.env.example`
- `index.html` (Vite entry)
- `src/main.tsx`
- `src/router.ts`
- `src/routeTree.gen.ts` (generated, committed)
- `src/routes/__root.tsx`
- `src/routes/index.tsx`
- `src/routes/login.tsx`
- `src/theme/tokens.ts`
- `src/theme/mantine.ts`
- `src/theme/global.css`
- `src/components/DecimalInput.tsx`
- `src/components/DecimalInput.test.tsx`
- `src/utils/money.ts`
- `src/utils/money.test.ts`
- `src/utils/qty.ts`
- `src/utils/qty.test.ts`
- `src/stores/floor-mode.ts`
- `src/test/setup.ts`
- `src/test/server.ts`
- `src/test/render.tsx`
- `src/test/render.test.tsx`

Modified:
- `README.md` (real Setup section)
- `.gitignore` (extend)

Untouched:
- `public/ilex_logo_v4.svg` (referenced by the `/login` placeholder)
- `docs/**` (no spec changes needed)

## Acceptance criteria

Issue-specific:
- `npm run dev` boots cleanly; `/` and `/login` render. `/login` shows the brand mark.
- `npm run dev` exits with a clear error when `VITE_API_BASE_URL` is unset (fail-fast verified).
- `npm test` runs and reports the unit tests for `money.ts`, `qty.ts`, `<DecimalInput>`, and `renderWithProviders` — all green.
- `npm run typecheck` passes under `strict: true` with `noUncheckedIndexedAccess`.
- `npm run lint` passes with zero warnings.
- `npm run build` produces a static bundle in `dist/`.
- `formatMoney("1000.0000")` returns `"$1,000.00"` (BE-D13 brief example assertion).
- `<DecimalInput>` round-trips `"0.0001"` through value → onChange → value with no `1e-4` exponent leakage (precision-sensitive assertion).
- Tailwind `floor:` variant compiles without error (tested via a smoke class on the placeholder route).
- Mantine `<MantineProvider>` mounts with the charcoal theme; the `<html>` is dark unconditionally.

Universal gates (per SPEC §4):
- `grep -RE "(fetch|axios)\(" src/ --include='*.ts' --include='*.tsx' | grep -vE "src/data/|src/api/|src/utils/csv-export\.ts"` → 0 results (this issue creates none of those paths, but the grep should still pass since no bare HTTP exists).
- `grep -RE "as any" src/ --include='*.ts' --include='*.tsx' | grep -v "src/api/generated"` → 0 results.
- `grep -RE "from ['\"].*api/generated" src/features/ src/routes/` → 0 results (no `src/features/` exists yet; passes vacuously).
- `grep -RE "\bNumberInput\b" src/features/` → 0 results (no `src/features/` exists yet; passes vacuously).
- `npm run generate:api -- --check` is **deferred** to issue 002 — it cannot run yet because `src/api/generated/` doesn't exist. Note this in the issue 002 acceptance.

## Notes

- **Pending decisions consumed but not yet graduated.** This issue commits to TanStack Router, Vite, Zustand, Vitest. The `pending` table in `docs/decisions.md` should graduate D8+ entries during issue 010 (or earlier if a refactor stress-tests the choice) — not now. Noted here so a future planner sees the breadcrumb.
- **Charcoal-only deviation (design README #5).** Tailwind config does NOT define a light palette. Tokens.ts has no `light` block. If a future issue surfaces a light-mode requirement, it's a spec change, not a token tweak.
- **Font swap deviation (design README #6).** Inter + JetBrains Mono via Fontsource. The prototype's Geist references must NOT leak into `tokens.ts` or Tailwind config.
- **Idempotency-Key, 409 handling, CSV export, MSW handlers** are all out of scope here — they land in issue 002 (API client) or per-domain issues.
- **Playwright** is deferred to issue 010 per status.md. Do not install `@playwright/test` here.
- **`Decimal.js` global config** lives in `src/main.tsx` so all formatters and `<DecimalInput>` consumers get the same precision/rounding. Tests import `Decimal` directly and rely on the same module instance, so the config applies in tests too.
- **No human input required before `/execute`.** Greenfield bootstrap, all decisions covered by D0–D7 + design docs.
