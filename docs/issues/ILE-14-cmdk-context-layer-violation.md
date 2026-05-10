# ILE-14 — useCmdkContext: replace ad-hoc apiClient calls with data-layer hooks

Status: planned

## Overview

`src/features/shell/cmdk-items/useCmdkContext.ts` lives in the features layer but calls `apiClient.GET` directly for `/batches/{batch_id}`, `/sales-orders/{so_id}`, and `/products/{product_id}` rather than reusing the data-layer hooks (`useBatch`, `useSo`, `useProduct`). ([src/features/shell/cmdk-items/useCmdkContext.ts:60](../../src/features/shell/cmdk-items/useCmdkContext.ts#L60), [L72](../../src/features/shell/cmdk-items/useCmdkContext.ts#L72), [L84](../../src/features/shell/cmdk-items/useCmdkContext.ts#L84))

Why it matters even though the grep gate passes:

- It bypasses the data-layer hooks' 404-no-retry policy (BE-D4 / SPEC). A cross-owner ⌘K deep-link will retry 3× before giving up rather than failing fast on first 404.
- It re-invents the type narrowing those hooks already provide; future schema drift breaks two places instead of one.
- The hook re-uses `inventoryKeys.detail`, `salesKeys.detail`, `catalogKeys.detail` so the cache is shared — but only by accident. If a data-layer hook changes its key shape (added staleTime in queryKey, etc.), this consumer silently misses cache hits.

The fix is mechanical: call `useBatch(batchId, { enabled })`, `useSo(soId, { enabled })`, `useProduct(productId, { enabled })` instead of three inline `useQuery` blocks. `useBatchesByProduct` already takes `{ enabled }` per ILE-9 and stays untouched.

## Surface

- [x] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/cmdk-items/useCmdkContext.ts` — refactor (Feature)
- [x] `/home/andluca/Documents/Github/IlexInventory-Client/src/data/inventory/queries.ts` — additive `{ enabled? }` on `useBatch` (Data)
- [x] `/home/andluca/Documents/Github/IlexInventory-Client/src/data/sales/queries.ts` — additive `{ enabled? }` on `useSo` (Data)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/data/catalog/queries.ts` — already accepts `{ enabled? }`, no change
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/cmdk-items/__tests__/useCmdkContext.test.tsx` — already MSW-driven, expected to stay green untouched
- [ ] No new tests required (existing 4 tests cover the four discriminator branches behaviorally)

## Dependencies

- None. Self-contained refactor against existing data-layer hooks.
- No BE work, no schema regen, no `act.ts` change, no route change.

## Context

### What already exists

- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/cmdk-items/useCmdkContext.ts` — 132 LOC. Three inline `useQuery` blocks (lines 57-91) that duplicate `useBatch`/`useSo`/`useProduct` minus the 404-no-retry policy.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/data/inventory/queries.ts:112-127` — `useBatch(id)`. Has `retry: 404 → false`, `staleTime: 30_000`. **Does NOT accept `{ enabled }`.**
- `/home/andluca/Documents/Github/IlexInventory-Client/src/data/sales/queries.ts:77-92` — `useSo(id)`. Has `retry: 404 → false`, `staleTime: 30_000`. **Does NOT accept `{ enabled }`.**
- `/home/andluca/Documents/Github/IlexInventory-Client/src/data/catalog/queries.ts:63-84` — `useProduct(id, { enabled? })`. Already accepts `{ enabled }`, has `retry: 404 → false`, `staleTime: 30_000`. **Drop-in.**
- `/home/andluca/Documents/Github/IlexInventory-Client/src/data/inventory/queries.ts:83-106` — `useBatchesByProduct(id, { limit?, enabled? })`. Already used by `useCmdkContext` line 93. **Untouched.**
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/cmdk-items/__tests__/useCmdkContext.test.tsx` — 207 LOC, 4 tests, MSW-driven via `server.use(http.get(...))`. No `apiClient` mock anywhere. Already complies with the `tdd` skill rule.
- Other call-sites that must keep working with the additive change:
  - `useBatch`: `src/features/inventory/BatchDetailPage.tsx:45`, `src/features/inventory/RecallReportPage.tsx:39`, plus `src/data/inventory/queries.test.ts:361,380`. All call `useBatch(id)` positionally — backwards compatible if the new param is optional.
  - `useSo`: `src/features/sales/SoDetailPage.tsx:49`, `src/features/sales/SoDraftPage.tsx:53`, plus `src/data/sales/queries.test.ts:150,167`. Same — positional, all backwards compatible.

### Spec reference

- `docs/architecture.md` §"Layer responsibilities" — features call hooks; hooks own data. Routes/features must not call `apiClient` directly.
- `docs/specs/SPEC.md` §2 hard constraints — "No bare fetch / axios outside the data layer." `apiClient.GET` from a feature file is a sub-gate-quality smell because it sneaks under the existing `fetch|axios` grep gate while violating the layer rule.
- BE-D4 (cross-owner returns 404) — the data-layer hooks' `retry: 404 → false` honors this; the inline blocks don't.

### Decisions already made that affect this issue

- Layer rule: features → data hooks → `apiClient`. Never features → `apiClient` directly.
- 404-no-retry policy is per-hook in the data layer, not centralized. Refactor inherits it for free.
- Cache keys (`inventoryKeys.detail`, `salesKeys.detail`, `catalogKeys.detail`) are owned by the data layer. Consumer-side reuse is fine; consumer-side reconstruction (current bug) is fragile.
- `CmdkContext` discriminator shape is a public API consumed by `act.ts` via `buildActActions(ctx, handlers)` (`src/features/shell/cmdk-items/act.ts`) and by `__tests__/act.test.ts`. Must stay byte-identical.
- `useMatches()` regex matching for route-id detection (lines 35-54) is correct and stays.

## Plan

### Generated types
- None. Types come from existing data-layer re-exports (`BatchResponse`, `SalesOrderResponse`, `ProductResponse`).

### Data layer

Two minimal additive changes — each adds an `options` param mirroring `useProduct`'s shape, defaulting to `enabled: true` so all existing callers work unchanged.

1. `src/data/inventory/queries.ts` — extend `useBatch`:

   ```ts
   export interface UseBatchOptions {
     enabled?: boolean
   }

   export function useBatch(
     id: string,
     options: UseBatchOptions = {},
   ): UseQueryResult<BatchResponse, ApiError> {
     const { enabled = true } = options
     return useQuery<BatchResponse, ApiError>({
       queryKey: inventoryKeys.detail(id),
       queryFn: async () => {
         const { data } = await apiClient.GET('/api/v1/batches/{batch_id}', {
           params: { path: { batch_id: id } },
         })
         return data as BatchResponse
       },
       enabled,
       staleTime: 30_000,
       retry: (failureCount, error) => {
         if (ApiError.is(error) && error.status === 404) return false
         return failureCount < 3
       },
     })
   }
   ```

2. `src/data/sales/queries.ts` — extend `useSo` with the identical shape (`UseSoOptions { enabled?: boolean }`).

3. No cache-key changes. No invalidation changes. No new mutations.

### Components & features

- `useCmdkContext.ts` rewrite:
  - Drop imports: `useQuery` from `@tanstack/react-query`, `apiClient`, `ApiError`, `inventoryKeys`, `salesKeys`, `catalogKeys` (all become unused after refactor).
  - Add imports: `useBatch` from `@/data/inventory/queries`, `useSo` from `@/data/sales/queries`, `useProduct` from `@/data/catalog/queries`.
  - Keep imports: `useMatches` (`@tanstack/react-router`), `useBatchesByProduct` (`@/data/inventory/queries`), the three response-type re-exports (`BatchResponse`, `SalesOrderResponse`, `ProductResponse`) which `CmdkContext` references.
  - Replace each inline `useQuery({ queryKey, queryFn, enabled, staleTime })` block with a single hook call:
    - `const batchQuery = useBatch(batchId, { enabled: isBatchDetail && Boolean(batchId) })`
    - `const soQuery = useSo(soId, { enabled: (isSoEdit || isSoDetail) && Boolean(soId) })`
    - `const productQuery = useProduct(productId, { enabled: isProductDetail && Boolean(productId) })`
  - Leave `useBatchesByProduct` call untouched (line 93).
  - Leave the 4 discriminator branches and the route-id regex matching untouched.
  - Expected LOC: ~75 (down from 132); under the 60 LOC bar is unlikely without compressing the `useMatches`/regex block which is out of scope, so target is "≤80 LOC and noticeably tighter".

### Routes
- None.

### Tests (write FIRST)

Refactor is behaviour-preserving — existing tests must stay green untouched. No new tests required.

- `src/features/shell/cmdk-items/__tests__/useCmdkContext.test.tsx` (existing, 4 tests):
  - `/batches/:id → kind=batch + batchId from route` — drives `GET /api/v1/batches/batch-1` via MSW. Will now hit `useBatch` → same URL.
  - `/sales-orders/:id → kind=so-detail + soId` — drives `GET /api/v1/sales-orders/so-1`. Will now hit `useSo` → same URL.
  - `/products/:id → kind=product-detail + productId + productHasBatches` — drives `GET /api/v1/products/prod-1` and `GET /api/v1/batches?product_id=prod-1`. Will now hit `useProduct` (already MSW-friendly) → same URLs.
  - `/stock → kind=other` — no network. Untouched.
- `src/features/shell/cmdk-items/__tests__/act.test.ts` — pure unit tests over `buildActActions(ctx, handlers)`. No network. Untouched.
- `src/data/inventory/queries.test.ts` `describe('useBatch')` — both existing tests pass `useBatch('id')` positionally; remain green because the new options param is optional with `enabled = true` default.
- `src/data/sales/queries.test.ts` `describe('useSo')` — same; both existing tests are positional and remain green.

If any pre-existing test breaks under the refactor (signal of a behavioural drift, not a wiring problem), stop and report — do not patch tests to chase green.

### Implementation

Order matters: extend the two data hooks first so the feature-side rewrite has a stable target.

1. **Data — `src/data/inventory/queries.ts`**: add `UseBatchOptions` interface and the optional `options = {}` param to `useBatch`. Wire `enabled` into `useQuery` opts. (Data layer.)
2. **Data — `src/data/sales/queries.ts`**: add `UseSoOptions` interface and the optional `options = {}` param to `useSo`. Wire `enabled`. (Data layer.)
3. **Validate**: `npm test src/data/inventory/queries.test.ts src/data/sales/queries.test.ts` — both files green untouched.
4. **Feature — `src/features/shell/cmdk-items/useCmdkContext.ts`**: swap imports, replace the three inline `useQuery` blocks with `useBatch` / `useSo` / `useProduct` calls. Preserve the `CmdkContext` return shape exactly. (Feature layer.)
5. **Validate**: `npm test src/features/shell/cmdk-items/__tests__/` — `useCmdkContext.test.tsx` and `act.test.ts` green.
6. **Full validation**: `npm test`, `npm run typecheck`, `npm run lint`, plus the 6 grep gates from `ilex-discipline`.

### Integration / wiring
- None. `CmdkContext` shape is byte-identical, so `act.ts` and `CmdkPalette` consumers don't change.
- No store updates. No theme updates. No ⌘K item changes.

### Documentation to update
- `docs/issues/status.md` — flip ILE-14 from `pending` to `planned` now (this commit), and to `completed` after `/execute`.
- No spec changes. No `decisions.md` changes. No `README.md` changes.

## Files involved

Modified:
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/cmdk-items/useCmdkContext.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/data/inventory/queries.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/data/sales/queries.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/docs/issues/status.md`
- `/home/andluca/Documents/Github/IlexInventory-Client/docs/issues/ILE-14-cmdk-context-layer-violation.md` (this file — replanned)

Untouched (verified):
- `/home/andluca/Documents/Github/IlexInventory-Client/src/data/catalog/queries.ts` (already supports `{ enabled }`)
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/cmdk-items/act.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/cmdk-items/__tests__/useCmdkContext.test.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/cmdk-items/__tests__/act.test.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/data/inventory/queries.test.ts` (positional `useBatch(id)` calls remain valid)
- `/home/andluca/Documents/Github/IlexInventory-Client/src/data/sales/queries.test.ts` (positional `useSo(id)` calls remain valid)
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/inventory/BatchDetailPage.tsx`, `RecallReportPage.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/sales/SoDetailPage.tsx`, `SoDraftPage.tsx`

## Acceptance criteria

- [ ] `useCmdkContext` calls `useBatch(batchId, { enabled })`, `useSo(soId, { enabled })`, `useProduct(productId, { enabled })` in place of the three inline `useQuery` blocks.
- [ ] No `apiClient` import remains in `src/features/shell/cmdk-items/useCmdkContext.ts`. Verified by:
      `grep -n "apiClient" /home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/cmdk-items/useCmdkContext.ts` returns nothing.
- [ ] No `useQuery` import from `@tanstack/react-query` remains in that file. Verified by:
      `grep -nE "from '@tanstack/react-query'" /home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/cmdk-items/useCmdkContext.ts` returns nothing.
- [ ] `useBatch` and `useSo` accept an optional `{ enabled?: boolean }` second arg (default `true`) without breaking any existing call site.
- [ ] `useBatchesByProduct` call is unchanged.
- [ ] `CmdkContext` return type and discriminator variants are byte-identical.
- [ ] `useMatches()` route-id regex matching block (lines 35-54 in current file) is preserved verbatim modulo trivial reformatting.
- [ ] LOC of `useCmdkContext.ts` ≤ 80 (down from 132).
- [ ] Existing tests green untouched:
  - `src/features/shell/cmdk-items/__tests__/useCmdkContext.test.tsx` — all 4 cases
  - `src/features/shell/cmdk-items/__tests__/act.test.ts` — all 6 cases
  - `src/data/inventory/queries.test.ts` `describe('useBatch')` — both cases
  - `src/data/sales/queries.test.ts` `describe('useSo')` — both cases
- [ ] Universal gates (per `ilex-discipline`):
  - `npm test` green
  - `npm run typecheck` (strict) passes
  - `npm run lint` passes
  - `npm run generate:api -- --check` returns no diff
  - `grep -RE "(fetch|axios)\(" src/ --include='*.ts' --include='*.tsx' | grep -vE "src/data/|src/api/|src/utils/csv-export\.ts"` returns nothing
  - `grep -RE "as any" src/ --include='*.ts' --include='*.tsx' | grep -v "src/api/generated"` returns nothing
  - `grep -RE "from ['\"].*api/generated" src/features/ src/routes/` returns nothing
  - `grep -RE "\bNumberInput\b" src/features/` returns nothing outside the integer-only allowlist
- [ ] New layer gate (additive — does not need a project-wide rule, but verify locally):
      `grep -nE "apiClient\.(GET|POST|PUT|DELETE|PATCH)" /home/andluca/Documents/Github/IlexInventory-Client/src/features/` returns nothing.
- [ ] 404-no-retry policy now applies on cross-owner ⌘K deep-links (BE-D4): a 404 from `/batches/{id}`, `/sales-orders/{id}`, `/products/{id}` triggers exactly one network hit, not three. (Implicitly covered by the existing `useBatch` / `useSo` / `useProduct` 404 tests; ⌘K path inherits.)

## Rollback notes

- Single-feature, three-file change. Revert by `git revert` of the implementation commit.
- The two data-layer additions are strictly additive (optional second param, default preserves prior behaviour) — no migration, no consumer breakage.
- No schema, no cache-key, no route changes — nothing persistent to roll back.
- If a regression appears in cmdk Act group behaviour after merge, the failure surface is the discriminator return shape; the existing 4 `useCmdkContext` tests cover all four branches and would catch it pre-merge.

## Notes

- The `enabled` flag still drives "only fetch on the matching route" — same semantics as before, just plumbed through the data hook instead of an inline `useQuery`. There is no behavioural change for the user.
- Cache hit rate should improve, not degrade: previously two consumers of `inventoryKeys.detail(id)` could race because both hooks owned independent `queryFn` closures; after the refactor only one `queryFn` exists per detail key, so a fresh page navigation that already prefetched via ⌘K context (or vice versa) gets a guaranteed cache hit.
- LOC target ≤80 is a soft goal. Hitting <60 would require collapsing the `useMatches` regex/param-extraction block which is explicitly out of scope per the prompt; flag a follow-up issue if reviewers want it tighter.
