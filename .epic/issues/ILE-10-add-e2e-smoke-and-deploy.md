---
id: ILE-10
github_id: null
status: open
assignee: null
state: Executing
type: item
depends_on: [ILE-9]
---

# ILE-10 Add Playwright E2E smoke + production deploy

## Overview

Land Playwright E2E smoke covering the critical flow per SPEC §5 phase 12: signup → create product → receive PO → commit SO → recall batch → view recall report → CSV export. Tests run against a real BE in dev mode (not MSW) to catch contract drift the unit/integration suite can't see. Production build (`npm run build`) verified; static asset hosting target picked (Vercel — see Notes); `VITE_API_BASE_URL` configurable per environment via the deploy provider; CI pipeline (build + typecheck + lint + unit tests + generated-client `--check` on every PR; deploy on merge to `main`); README runbook.

## Surface

- [ ] `src/features/inventory/RecallReportPage.tsx` + `__tests__/RecallReportPage.test.tsx` (R7 — table of customer/SO/qty rows; CSV export anchor; deferred from ILE-6 because BE phase 8 hadn't shipped — schema now exposes `/batches/{id}/recall-report`)
- [ ] `src/data/inventory/queries.ts` — add `useRecallReport(batchId)` hook (offset-paginated per SPEC §2.6)
- [ ] `src/routes/_authed.batches.$id.recall-report.tsx` — new file route mounting `<RecallReportPage>`
- [ ] `tests/e2e/critical-flow.spec.ts` (signup → product → PO receive → SO commit → recall → recall-report → CSV)
- [ ] `tests/e2e/fefo-shortfall.spec.ts` (SO commit blocked when requested qty exceeds available — SPEC §3.6 differentiator)
- [ ] `tests/e2e/fixtures/api.ts` (helper to seed/reset BE state via direct API calls before each test — see Notes)
- [ ] `playwright.config.ts` (single chromium project, baseURL from env, dev server reused)
- [ ] `package.json` — add `test:e2e` + `test:e2e:ui` scripts; add `@playwright/test` devDep
- [ ] `.github/workflows/ci.yml` (typecheck + lint + unit tests + `generate:api --check` + `npm run build` on every PR; runs on push to main)
- [ ] `.github/workflows/deploy.yml` (Vercel deploy on push to main; preview deploy on PR — see Notes for provider rationale)
- [ ] `vercel.json` (SPA fallback rewrite — Vite SPAs need every unknown route to serve `index.html`; without this, deep links 404)
- [ ] `.env.example` — add `VITE_E2E_BASE_URL` (default `http://localhost:5173`) + document `VITE_API_PROXY_TARGET` already used by `vite.config.ts`
- [ ] `.gitignore` — add `playwright-report/`, `test-results/`, `.vercel/`
- [ ] `README.md` — Deploy section, E2E section, runbook (start BE → seed → run e2e → ship)
- [ ] **No `Dockerfile`** — Vercel handles Vite static hosting natively; container deploy is the rejected alternative (see Notes)

## Dependencies

- ILE-9 (⌘K + polish) — done


# Specification

## Page: RecallReportPage (R7)
File: `src/features/inventory/RecallReportPage.tsx`

Realizes SPEC §3.5 R7 / F11. Renders the read-view of "customers who received units from this batch via committed, non-voided SOs." Reached from `<BatchDetailPage>` via the existing "Recall report" link (verify the link exists; if not, add one in the action bar). Empty state is the legitimate normal state — a non-recalled or freshly-recalled batch may have zero shipments, and the page surfaces that as `<EmptyState>` (no agent prompt — recall is a destructive ops action, not a creation moment).

### Preconditions

* User is authenticated; route is `/_authed/batches/$id/recall-report`
* `batchId` route param resolves to an existing batch (404 from `useBatch` falls through to `<ErrorBoundary>`'s 4xx envelope)

### Primary Use Case — view shipments to recall

#### Workflow
* User navigates from `<BatchDetailPage>` → "View recall report" link → URL changes to `/batches/:id/recall-report`
* Page calls `useRecallReport(batchId)` (TanStack Query) — endpoint is offset-paginated per SPEC §2.6
* Header: batch code (mono), product name, recall reason + recall date (if recalled)
* Body: `<DataTable>` rows of `{ customer_name, sales_order_id (link to /sales-orders/:id), committed_at, allocated_quantity, unit_cost }`
* CSV export button (`<CsvExportButton>` from ILE-8) — anchors to `/api/v1/batches/{id}/recall-report?format=csv`

#### Output
```
[Header] Recall report — Batch RG-2025-0042 — Roasted Guarana Powder 250g
[StatusBadge] Recalled · 2026-05-09 · "FDA labeling defect"
[Table] Acme Co · SO-2025-1188 · 2026-04-28 · 12.0000 kg · 18.5000 USD
        Beta Foods · SO-2025-1192 · 2026-05-01 · 6.0000 kg · 18.5000 USD
[Footer] Export CSV
```

### Empty Case — non-recalled batch with zero shipments

#### Workflow
* User opens recall report for a batch that has not been allocated to any committed SO
* `<EmptyState>` renders title "No shipments to recall", body "This batch has not been sold or has only been allocated to voided SOs."

### Examples

* Visit `/batches/abc-123/recall-report` for a recalled batch with 2 SO allocations; See: 2 rows, customer names ascending by `committed_at`
* Visit `/batches/abc-123/recall-report` for a non-recalled empty batch; See: `<EmptyState>` with no rows
* Click "Export CSV"; See: anchor download fires to `/api/v1/batches/abc-123/recall-report?format=csv`
* Click an SO link; See: navigate to `/sales-orders/{soId}`

## Hook: useRecallReport
File: `src/data/inventory/queries.ts`
Input: `(batchId: string, params?: { page?: number; limit?: number }) → UseQueryResult<RecallReportResponse>`

Wraps the generated `batches_recall_report_retrieve` operation. Query key `['batches', batchId, 'recall-report', params]`. `enabled: Boolean(batchId)`. Uses offset pagination per SPEC §2.6 — page/limit pattern matches `useMargin` from ILE-8.

### Implementation

* Reads from `apiClient.GET('/batches/{batch_id}/recall-report', { params: { path: { batch_id }, query: params } })`
* Returns the typed `RecallReportResponse` (`{ items: RecallReportItemResponse[], total, page, limit }`)
* `staleTime: 0` — recall reports must reflect current allocations (a fresh void changes the table immediately)

## E2E Test: critical-flow
File: `tests/e2e/critical-flow.spec.ts`

Realizes SPEC §5 phase 12. One Playwright test that drives the full happy-path through real BE endpoints. Uses `request` fixture to seed test data (unique email + product/PO/SO names) so the test is hermetic against repeated runs against the same BE.

### Preconditions

* BE running on `localhost:8000` (or `VITE_API_PROXY_TARGET`)
* Vite dev server running on `localhost:5173` (Playwright `webServer` config auto-starts via `npm run dev`)
* No prior account with the test's generated email exists

### Workflow

* `signup`: visit `/signup`; fill email `e2e-{uuid}@ilex.test` + password; submit; assert URL becomes `/`
* `create product`: visit `/products`; click "New product"; fill SKU + name + base unit; submit; assert toast + redirect to `/products/:id`
* `receive PO`: visit `/purchase-orders/new`; pick supplier + the just-created product, qty 100, unit_cost 5.00; save draft; click "Receive"; in modal fill `batch_code=BATCH-E2E-{n}`, expiration 6 months out; confirm; assert URL becomes `/purchase-orders/:id` and a batch row is rendered
* `commit SO`: click batch link → `/batches/:id` → note batch ID; visit `/sales-orders/new`; pick customer + the same product, qty 50, sell_price 10.00; assert FEFO preview shows the batch we just received; click "Commit"; confirm in modal; assert URL becomes `/sales-orders/:id` and status badge reads "Committed"
* `recall batch`: visit `/batches/:id`; click "Recall"; fill reason "E2E recall test"; confirm; assert recall banner renders + StatusBadge flips
* `view recall report`: click "View recall report" link → `/batches/:id/recall-report`; assert the customer name from the SO above appears in the row; assert allocated_quantity = 50
* `CSV export`: click "Export CSV"; intercept the anchor's `download` (or assert the `href` resolves to `/api/v1/batches/:id/recall-report?format=csv`); fetch the URL with the auth cookie; assert response status 200, content-type `text/csv`, body contains the customer name

### Examples (mirroring SPEC examples)

* Signup → land on `/`; assert `<DashboardPage>` greeting visible (e.g. role=heading "Dashboard")
* SO commit with a single batch → FEFO preview shows 1 line, batch code matches, `available >= required`
* Recall a batch with 1 commit → recall report renders 1 row (the SO from above), CSV download contains that row

## E2E Test: fefo-shortfall
File: `tests/e2e/fefo-shortfall.spec.ts`

Realizes SPEC §3.6 SO commit shortfall. Verifies the FEFO preview surfaces a shortfall and the commit button is gated.

### Workflow

* Reuse signup helper from `fixtures/api.ts` (or call API directly — faster)
* Create product, receive PO with qty 10
* Visit `/sales-orders/new`; line: same product, qty 50 (5x available)
* Assert FEFO preview renders shortfall message: `"Required: 50, Available: 10"` (matches SPEC §3.6 422 envelope)
* Assert "Commit" button is disabled OR shows the inline error and click does not navigate to detail

## Lib: tests/e2e/fixtures/api.ts (new)
File: `tests/e2e/fixtures/api.ts`

Test helpers that hit the real BE directly to seed state without going through the UI. Uses Playwright's built-in `request` API (carries cookies between calls). Avoids cross-test contamination by minting a fresh email per `test()` and namespacing all created entities with the test's UUID.

### Functions

* `signupViaApi(request, email, password)`: `POST /auth/signup`; returns the cookie-bearing context
* `createProduct(request, { sku, name, base_unit })`: `POST /products`; returns `productId`
* `createAndReceivePO(request, { productId, qty, unit_cost, batch_code, expiration_date })`: `POST /purchase-orders` → `POST /purchase-orders/:id/receive`; returns `{ poId, batchId }`
* `createSO(request, { productId, qty, sell_price })`: `POST /sales-orders`; returns `soId`

### Implementation

* Each helper throws on non-2xx with the response body — Playwright surfaces this in the failure trace
* Uses `expect(response.status()).toBe(N)` rather than `response.ok()` so the assertion message identifies which seed call broke
* `request.newContext({ baseURL: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000' })` to bypass the Vite proxy and hit the BE directly — proxying through 5173 works but doubles the failure-mode surface

## Config: playwright.config.ts (new)

Single project (chromium), `baseURL` from `VITE_E2E_BASE_URL` (defaults to `http://localhost:5173`), `webServer` config that runs `npm run dev` and reuses if already running. `retries: 0` locally, `retries: 2` in CI (set via `process.env.CI`). `trace: 'on-first-retry'` for debug ergonomics. `testDir: './tests/e2e'`. Browsers limited to chromium — Firefox/Safari are not free smoke-test budget here.

## CI: .github/workflows/ci.yml (new)

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run generate:api -- --check
        env:
          VITE_OPENAPI_URL: ''  # forces snapshot fallback (no live BE in CI)
      - run: npm run build
        env:
          VITE_API_BASE_URL: 'https://placeholder.example.com/api/v1'
```

### Implementation notes

* `generate:api --check` falls back to the committed `docs/openapi.snapshot.json` when no live BE is reachable (per `scripts/generate-api.mjs`); CI sets `VITE_OPENAPI_URL=''` to force the snapshot path. The snapshot is the source of truth in CI; drift is caught when a new snapshot is committed alongside generated client changes.
* `VITE_API_BASE_URL` is required by `src/main.tsx` even at build time (because of the runtime check); the placeholder URL satisfies the build without leaking a real prod URL into CI logs. The deploy workflow injects the real URL via Vercel env config — not via build-time substitution.
* No e2e job — Playwright tests need a real BE which CI doesn't have access to. E2E is a local pre-deploy gate (documented in README).

## CI: .github/workflows/deploy.yml (new)

Triggers Vercel deploy on push to `main`. Preview deploy on every PR (so reviewers can click through the change before merge). Uses the `amondnet/vercel-action` action; secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` are set in the GitHub repo's Actions secrets. The action handles env-var injection from Vercel's project settings (where `VITE_API_BASE_URL=https://api.ilex.example.com/api/v1` is configured).

### Implementation

* Two jobs: `deploy-preview` (PR), `deploy-production` (main). Both reuse the same checkout + node setup; only the `--prod` flag differs.
* No `npm test` step inside `deploy.yml` — the `ci.yml` workflow's required check handles that. Branch protection on `main` requires `validate` to pass before merge, so deploy never fires on a red build.

## Lib: vercel.json (new)

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Vite SPA fallback. Without this rule a request to `/products/abc-123` returns 404 because Vercel's static host has no file at that path. The rewrite serves `index.html` for every route; TanStack Router takes over client-side. This is the standard SPA pattern — Netlify equivalent is `_redirects`; we picked Vercel.

## External Dependencies

### @playwright/test
Used for: E2E test runner, browser automation, fixtures
Commands: `npx playwright install chromium` (first-run browser download)

* Installed via `npm i -D @playwright/test`
* `playwright.config.ts` is the single source of truth for browser projects + reporters
* Locally, the developer runs `npx playwright install` once after `npm ci` so the chromium binary lands in `~/.cache/ms-playwright/`

### Vercel
Used for: static asset hosting, env-var management per environment, preview deploys per PR
Commands: `vercel --prod` (production), `vercel` (preview) — invoked via the `amondnet/vercel-action` GitHub Action; never run from the dev workstation in this workflow

* Vercel auto-detects Vite (`vite build` → `dist/`); no `vercel.json` build config needed beyond the rewrite
* Per-environment `VITE_API_BASE_URL` is set in Vercel's project dashboard, NOT in `.env.example` (which documents only the dev value)
* Vercel free tier covers: unlimited bandwidth on hobby projects, automatic HTTPS, custom domain, preview deploys per PR. Cost gate: $0 for this scope. Region: vercel auto-routes through their edge network (closest to the request); no manual region pick required for a static SPA


# Plan

Each step is independently shippable. Within a step, write the failing test first, then the implementation, then green (per `tdd` skill). Steps are ordered so a partial ship still lands user value: prerequisite (R7 page) first, then the test infrastructure (Playwright config + tests), then deployment scaffolding (CI + deploy + README).

1. **Land `<RecallReportPage>` (R7) — close the gap deferred from ILE-6**
   - Why: the e2e flow's "view recall report" step requires the page to exist. ILE-6 deferred R7 because BE phase 8 hadn't shipped; the schema now exposes `/batches/{id}/recall-report` (verified — see `src/api/generated/schema.ts:192`). This is the natural place to close that loop because step 3 below cannot pass without it.
   - [ ] Add `useRecallReport(batchId, params?)` to `src/data/inventory/queries.ts`
   - [ ] Write `src/features/inventory/__tests__/RecallReportPage.test.tsx` — 3 tests: renders rows from MSW handler returning 2 items; renders `<EmptyState>` when items=[]; CSV button anchor `href` ends with `/recall-report?format=csv`
   - [ ] Implement `src/features/inventory/RecallReportPage.tsx`
   - [ ] Create `src/routes/_authed.batches.$id.recall-report.tsx` mounting the page
   - [ ] Verify the existing `<BatchDetailPage>` action bar links to `/batches/:id/recall-report` (add a `<Button component={Link}>` if missing — see Notes)
   - [ ] `npm test && npm run typecheck && npm run lint` green

2. **Install Playwright + scaffold `playwright.config.ts` + add npm scripts**
   - Why: the test runner has to be wired up before any test can run. Drop-in install, no production code touched. Re-runnable in any order with later steps.
   - [ ] `npm i -D @playwright/test`
   - [ ] `npx playwright install chromium` (local; CI doesn't run e2e)
   - [ ] Write `playwright.config.ts` (chromium only, baseURL from env, webServer auto-start)
   - [ ] Add `package.json` scripts: `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`
   - [ ] Update `.gitignore` — add `playwright-report/`, `test-results/`
   - [ ] Smoke: `npm run test:e2e -- --list` should show 0 tests; the runner itself works

3. **Land `tests/e2e/fixtures/api.ts` + critical-flow happy-path test**
   - Why: this is the SPEC §5 phase 12 deliverable. Once green, the v1 critical-path is verifiably live. Step 1's RecallReportPage is the last UI piece this depends on.
   - [ ] Implement `tests/e2e/fixtures/api.ts` with the 4 helper functions (signup, createProduct, createAndReceivePO, createSO)
   - [ ] Write `tests/e2e/critical-flow.spec.ts` — single `test()` that drives signup → product → PO receive → SO commit → recall → recall-report → CSV. Use page interactions for the parts that *must* exercise UI (commit modal, FEFO preview render, recall reason input); use API helpers for setup-only steps (signup) where UI exercise is redundant
   - [ ] Run locally: BE on :8000 + `npm run test:e2e` → green
   - [ ] No CI step added — see Notes

4. **Land `tests/e2e/fefo-shortfall.spec.ts`**
   - Why: SPEC §3.6 names FEFO shortfall as the SO-commit differentiator. A separate file isolates the failure case so the happy-path test stays narrative; if the shortfall handling regresses, the diagnostic is unambiguous.
   - [ ] Reuse `fixtures/api.ts` for setup
   - [ ] Drive UI: visit /sales-orders/new with a line `qty > available` → assert shortfall copy renders + commit gated
   - [ ] `npm run test:e2e` → both files green

5. **Land `.github/workflows/ci.yml` — validation pipeline on every PR**
   - Why: turns the local `/build` validation gates into an enforceable PR check. Runs independently of the e2e suite and the deploy pipeline; failing CI blocks merge.
   - [ ] Author the workflow with the 5 steps (typecheck, lint, test, generate:api --check, build)
   - [ ] Push to a branch + open a draft PR to verify the workflow triggers + all 5 steps go green
   - [ ] Add a branch protection rule on `main` requiring `validate` to pass (manual GitHub repo step — flag in Journal if not doable from the CLI)

6. **Land `.github/workflows/deploy.yml` + `vercel.json` + Vercel project setup**
   - Why: the actual ship step. Once green, every push to `main` lands on the production URL. Independent of CI (the workflow assumes CI passed via branch protection).
   - [ ] Create the Vercel project + link the repo (manual; the executor flags this as a user step + provides the exact UI walkthrough in the Journal)
   - [ ] Set `VITE_API_BASE_URL` in Vercel's project env-vars (Production + Preview scopes — same value if BE is shared, distinct if a staging BE exists)
   - [ ] Author `.github/workflows/deploy.yml` with `deploy-preview` (on PR) + `deploy-production` (on push to main) jobs
   - [ ] Author `vercel.json` with the SPA rewrite
   - [ ] Add `.vercel/` to `.gitignore`
   - [ ] Push to main → assert the deploy fires + the production URL serves a 200 on `/` and on `/products/anything` (SPA fallback verified)

7. **Update `.env.example` + `README.md`**
   - Why: humans and future agents need a runbook. Without docs, the deploy pipeline is opaque (where do env vars live? how do I run e2e?). Drop-in change, no code paths touched.
   - [ ] Add `VITE_E2E_BASE_URL` documentation to `.env.example`
   - [ ] README: add "E2E tests" section (prereqs: BE running; commands: `npm run test:e2e`, `npm run test:e2e:ui`)
   - [ ] README: add "Deployment" section (host: Vercel; trigger: push to main; env-vars: where to set them; preview URLs: per-PR comments by Vercel bot)
   - [ ] README: add "Runbook" subsection — incident contact, how to redeploy a previous version (Vercel dashboard → Deployments → Promote), how to roll back env-var changes

8. **Validation pass: regenerate, typecheck, test, drift, lint, smoke**
   - Why: the `/build` pipeline gate. Confirms the issue lands cleanly before flipping the issue to Done.
   - [ ] `npm run generate:api -- --check` — no schema drift
   - [ ] `npm run typecheck && npm test && npm run lint` green
   - [ ] SPEC §4 grep gates — clean (no bare fetch outside data layer; no `as any`; no api/generated import in features/routes)
   - [ ] `npm run build` — production bundle generates clean (no warnings beyond Vite's standard chunk-size advisory)
   - [ ] `npm run test:e2e` — both Playwright spec files green against a local BE
   - [ ] Manual smoke (executor defers to user): visit the deployed Vercel URL, sign up with a fresh email, walk the same 7-step flow; verify the CSV download contains the seeded customer name
   - [ ] Surface checkboxes updated
   - [ ] Journal entry appended


# Notes

- **Why ship `<RecallReportPage>` here and not in a follow-up.** ILE-6 explicitly deferred R7 with the note "follow-up required once BE phase 8 ships the endpoint." The schema now has it, and ILE-10's e2e flow names "view recall report" as a step. Two equally valid moves: (a) build the page here, (b) drop "view recall report" from the e2e and just hit the CSV endpoint. Option (a) is preferred because R7 is a v1 page in SPEC §3.5 and ILE-10 is the last issue before deploy — punting it again means it ships only via a follow-up that has no natural home.
- **BatchDetailPage already links to recall-report?** Verify in step 1. If `<BatchDetailPage>` doesn't have a "View recall report" link in its action bar, add one (`<Button component={Link} to={`/batches/${batchId}/recall-report`}>`). The link's existence is part of the e2e flow — without it, the test must drive the URL directly which would mask a missing-affordance regression.
- **Why Vercel and not Netlify, Render, or a Dockerized self-host.** Vite SPAs are a near-zero-config deploy on Vercel; the repo's existing setup (file-based routing, env-var-only build, no SSR) maps 1:1 to Vercel's static-output flow. Netlify is functionally equivalent but adds a `_redirects` file (vs `vercel.json`) and a slightly more bespoke action; tie-breaks on (a) Vercel's per-PR preview deploys are a free win, (b) the Vercel CLI auth flow is well-documented for one-off contributors. Render is heavier (paid tier kicks in for the same SLA). A self-hosted Docker container is rejected because (a) v1 has no SSR or backend logic in the FE, (b) container deploys add a registry + runtime concern with no upside. The Dockerfile listed in the original surface is dropped.
- **CI does not run E2E.** Playwright tests need a real BE on the same network. CI doesn't have access to the BE repo (it's a separate Git project, possibly with separate auth/secrets). Standing up the BE in CI (via `docker-compose` or a sibling job) doubles the surface and is rejected for v1 — the gate is the local pre-deploy run, documented in README. If CI-side e2e becomes a need later, the path is: publish a Docker image of the BE, pull it in a `services:` block of the e2e workflow, point `VITE_API_PROXY_TARGET` at it.
- **Why two e2e files instead of one giant test.** Playwright tests are sequential within a file; failures bubble fast in a small focused test but a 200-line happy-path test that fails at step 6 wastes 5 setup steps' worth of debug time. Splitting the shortfall case into its own file keeps each test focused on one assertion-cluster. More tests are not free — each one needs a fresh seed of the BE — but two is the minimum to cover the SPEC's named happy + sad paths.
- **Test data uniqueness.** Each test mints a fresh UUID and namespaces all entities (`e2e-{uuid}@ilex.test`, `BATCH-E2E-{uuid}`, etc.). This is the simplest path to hermetic tests against a real BE — the alternative (resetting the BE database between tests) requires a teardown endpoint the BE doesn't expose. The downside: long-lived BE accumulates test garbage. Mitigation: a future `/api/v1/_test/reset` endpoint (BE follow-up) lets the e2e suite call it in `beforeAll`. Out of scope for this issue.
- **Generated client `--check` in CI.** `scripts/generate-api.mjs` already falls back to `docs/openapi.snapshot.json` when no live BE is reachable. CI sets `VITE_OPENAPI_URL=''` to force the snapshot path. This means CI catches client-vs-snapshot drift; it does NOT catch snapshot-vs-live-BE drift (that's a developer-side check before commit). The split is fine — drift between client and the snapshot is the contract that matters in CI; drift between snapshot and live BE is what `npm run generate:api` regenerates against.
- **Vercel env-vars are per-environment.** Production gets the prod BE URL; Preview gets the prod BE URL too unless a staging BE exists (it doesn't in v1). Future split: a staging Vercel env tied to a staging BE would let preview deploys exercise destructive flows without touching prod data. Out of scope here.
- **The deploy workflow's secrets.** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` are set in the GitHub repo's Actions secrets (Settings → Secrets and variables → Actions). The first deploy creates the Vercel project; the IDs are emitted in `vercel link`. The executor flags this as a user-only step in step 6 because it requires a Vercel account + GitHub repo admin access.
- **What the e2e tests do NOT cover.** Logout (already unit-tested), settings page (no business logic), CSV import (separate feature, named in F11 — could land in a follow-up e2e), per-product margin table (financial reporting accuracy is unit-tested already), agent panel (out of v1 scope). The two e2e files cover the shortest path to "every named differentiator works end-to-end."
- **Branch protection on main.** Step 5's last item — adding a required check — is a GitHub repo settings change, not a code change. The executor flags it explicitly because forgetting it means deploy-on-main fires even when CI is red. If the repo is single-developer for v1, branch protection is optional but cheap; recommend turning it on regardless.
- **No floor-mode visual review automation.** Floor-mode rendering is a Mantine theme-class toggle; e2e visual diffs are out of scope for v1. SPEC's accessibility pass is covered by the unit tests' `getByRole` queries — Playwright reuses those queries via `getByRole`, so a missing label is caught at e2e time too.


# Journal

Append-only log of agent actions. Each entry: `- YYYY-MM-DD HH:MM [agent] — message`. Newest at the bottom; existing entries are never edited.
