# ILE-13 — useImportProducts: add onSuccess invalidation

Status: completed

## Overview

`useImportProducts` is one of the seven SPEC §2.5 terminal mutations (BE-required Idempotency-Key). Today its hook returns `ProductImportResponse` and exits without invalidating any TanStack Query cache. Result: after a successful CSV import, the products list shown by `useProductsList` does not refresh until a manual reload or until the cache's natural staleness window elapses. (`src/data/catalog/mutations.ts:165-179`)

This is the only one of the seven terminal mutations missing post-success invalidation — `useReceivePo`, `useCommitSo`, `useVoidSo`, `useCreateBatch`, `useRecallBatch`, `useUnRecallBatch` all invalidate correctly. The skill explicitly flags this pattern as critical / auto-fixable: YES.

## Surface

- [x] `src/data/` — add `onSuccess` callback to `useImportProducts` invalidating `catalogKeys.lists()`.
- [x] `src/data/` — extend colocated test file with a new `useImportProducts` invalidation test.
- [ ] `src/features/` — no change; `ImportCsvModal` already consumes the hook and renders the response.
- [ ] `src/routes/` — no change.
- [ ] `src/components/` — no change.
- [ ] `src/api/` — no change; `ALWAYS_IDEMPOTENT_POST_PATHS` already includes `/api/v1/products/import`.
- [ ] `src/utils/` / `src/stores/` / `src/theme/` — no change.
- [ ] `docs/` — no spec changes; only `docs/issues/status.md` flip + Execution Log entry.

Absolute paths touched:
- `/home/andluca/Documents/Github/IlexInventory-Client/src/data/catalog/mutations.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/data/catalog/mutations.test.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/docs/issues/status.md`
- `/home/andluca/Documents/Github/IlexInventory-Client/docs/issues/ILE-13-import-products-invalidation.md` (this file, after planning)

## Dependencies

None. No BE work required (BE already returns `ProductImportResponse`; Idempotency-Key plumbing already in `apiClient`). No other FE issues block this; this issue does not block ILE-12/14/15/16 (they touch different surfaces).

## Context

### What already exists

- `src/data/catalog/mutations.ts` — exports `useCreateProduct`, `useUpdateProduct`, `useArchiveProduct`, `useDeleteProduct`, `useImportProducts`. The first four invalidate `catalogKeys.lists()` (and `detail(id)` where applicable) on success. The fifth (`useImportProducts`, lines 165-179) is the gap.
- `src/data/catalog/keys.ts` — `catalogKeys.lists()` returns `['catalog','list'] as const`. Matching this prefix invalidates every `catalogKeys.list({...filters})` derived key — the desired behavior.
- `src/data/catalog/mutations.test.ts` — colocated test file (no `__tests__/` subfolder in this domain). Has 8 tests across the 5 hooks, 3 of which already cover `useImportProducts` (200 happy path, Idempotency-Key header captured, 400 ApiError). All use `renderHook` + a real `QueryClient` + MSW handlers via `server.use(...)`. The closest pattern to what we need is `useArchiveProduct → 'on 200 invalidates detail + lists'` (lines 168-191): spy on `qc.invalidateQueries`, fire the mutation, await `isSuccess`, assert `expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: catalogKeys.lists() })`.
- `src/features/catalog/ImportCsvModal.tsx` — sole consumer of `useImportProducts`. Renders `imported` / `failed` rows from the response. Closes itself on success but does not currently trigger any cache refresh — relies entirely on the hook.
- `src/api/client.ts` — `ALWAYS_IDEMPOTENT_POST_PATHS` (line 48-50) already includes `/api/v1/products/import`. Idempotency-Key auto-attachment happens in middleware; the hook does not need to mint or pass a key.

### Spec reference

- `docs/specs/SPEC.md` §2.5 — Idempotency / terminal mutations: products import is one of seven endpoints requiring Idempotency-Key. Same section describes the post-success invariant: "Invalidate + refetch on success" (no optimistic write). Today the hook satisfies the Idempotency-Key half but not the invalidation half.

### Decisions already made that affect this issue

- Terminal mutations are no-optimistic (D-pending in `docs/decisions.md`, codified in SPEC §2.5). On success: invalidate the affected list keys; let TanStack refetch. Do not write to the cache directly from the response body. We follow this rule.
- The `ProductImportResponse` shape is summary-only (`imported: number`, `failed: FailedRowResponse[]`) — it does not enumerate the IDs of products that were created/updated. Therefore `catalogKeys.detail(id)` cannot be invalidated per-product without inferring IDs. List-level invalidation is sufficient and matches the user-visible surface (the products list under `/products`).
- Test discipline (`tdd` skill): use MSW + a real `QueryClient`, not mocks of TanStack internals. Existing tests in this file follow that rule — we model the new test on `useArchiveProduct → on 200 invalidates detail + lists`, which uses `vi.spyOn(qc, 'invalidateQueries')` (legitimate — it spies on the public client method, not on internals).

## Plan

### Generated types

No regeneration. `ProductImportResponse` already exists in `src/api/generated/schema.d.ts`; the hook re-exports it via `mutations.ts`. `npm run generate:api -- --check` should remain clean.

### Data layer

Single file edit. In `src/data/catalog/mutations.ts`:

1. Inside `useImportProducts`, call `useQueryClient()` (matches the pattern of the other four hooks in the same file).
2. Add `onSuccess: () => { void queryClient.invalidateQueries({ queryKey: catalogKeys.lists() }) }`.
3. Keep `retry: false` in place (current behavior — imports are large, retries waste BE work; Idempotency-Key would dedupe on the BE but client-side retry is still inappropriate for this UX).
4. Do not add a `notifications.show(...)` call inside the hook — `ImportCsvModal` already renders a richer success summary (imported count + failed rows table). A toast would double-up the feedback. (Out of scope confirms this.)
5. Do not invalidate `catalogKeys.detail(id)` — the response shape does not enumerate product IDs. Acceptance criteria document the conditional follow-up if the BE shape evolves.

Cache keys: no new keys. `catalogKeys.lists()` already exists. Invalidation target is the same prefix used by `useProductsList` consumers.

Idempotency-Key: already auto-attached by `apiClient` middleware (`ALWAYS_IDEMPOTENT_POST_PATHS`). No hook change.

409 stale-state: not applicable — products import is not subject to a 409 stale-state window in the BE (CSV import is idempotent at the record level; the BE does not return 409 for "list changed under you"). Existing 400 ApiError path already covered.

Pagination: not applicable.

### Components & features

No new components. `ImportCsvModal` continues to consume the hook unchanged. After this fix lands, when the modal closes, the `/products` list view auto-refetches because `useProductsList` is mounted on the same page and TanStack will see the invalidation event.

### Routes

No route changes.

### Tests (write FIRST)

Single new test in `src/data/catalog/mutations.test.ts`, inside the existing `describe('useImportProducts', ...)` block. Modeled on `useArchiveProduct → 'on 200 invalidates detail + lists'` (lines 168-191).

- `it('on 200 invalidates catalogKeys.lists()')` — given a successful import response (`{ imported: 3, failed: [] }`), spy on `qc.invalidateQueries`, fire the mutation, await `isSuccess`, assert `expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: catalogKeys.lists() })`.

No need for additional 404 / 409 / Idempotency-Key tests — those are already covered for this hook (lines 270-359). No need for a money/qty round-trip test — this hook handles CSV bytes only.

### Implementation

Order:

1. Edit `src/data/catalog/mutations.test.ts` — add the new `it('on 200 invalidates catalogKeys.lists()')` case inside `describe('useImportProducts')`. Run `npm test -- src/data/catalog/mutations.test.ts` and watch it fail (red bar — invalidation not happening yet). [Data layer / test]
2. Edit `src/data/catalog/mutations.ts`:
   - Inside `useImportProducts`, add `const queryClient = useQueryClient()` at the top of the function body.
   - Add `onSuccess: () => { void queryClient.invalidateQueries({ queryKey: catalogKeys.lists() }) }` to the `useMutation` config.
   - Keep `retry: false`. [Data layer / source]
3. Re-run `npm test -- src/data/catalog/mutations.test.ts` — green. [Verification]
4. Run the universal gates: `npm test`, `npm run typecheck`, `npm run lint`, the 6 grep gates from SPEC §4. [Verification]
5. Update `docs/issues/status.md` — mark ILE-13 completed (the executor does this; planner only flips to `planned`). [Docs]

### Integration / wiring

- No ⌘K Spotlight changes; the import action surface (`ImportCsvModal`) is reached from the products list, not the palette.
- No floor-mode or theme changes.
- No store changes.

### Documentation to update

- `docs/issues/status.md` — flip ILE-13 from `pending` to `planned` now (during planning); flip to `completed` and append Execution Log entry after `/execute`.
- No changes to `docs/specs/SPEC.md`, `docs/decisions.md`, `README.md` — this is a pure bug fix, no contract drift, no new public surface.

## Files involved

To create:
- (none)

To modify:
- `/home/andluca/Documents/Github/IlexInventory-Client/src/data/catalog/mutations.ts` — add `useQueryClient()` + `onSuccess` invalidation in `useImportProducts`.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/data/catalog/mutations.test.ts` — append new invalidation test inside the existing `describe('useImportProducts', ...)`.
- `/home/andluca/Documents/Github/IlexInventory-Client/docs/issues/status.md` — flip ILE-13 status; bump counts; Execution Log entry on completion.

## Acceptance criteria

- [ ] `useImportProducts` adds `onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKeys.lists() })`.
- [ ] If the import response shape evolves to include the affected product IDs, additionally invalidate `catalogKeys.detail(id)` for each. (Current shape is summary-only — list invalidation is sufficient for v1; this remains a documented follow-up, not a blocker.)
- [ ] New test in `src/data/catalog/mutations.test.ts` (inside the existing `describe('useImportProducts')` block) asserting that on success the products list query is invalidated. Uses MSW + a real `QueryClient` + `vi.spyOn(qc, 'invalidateQueries')` — does not mock TanStack Query internals.
- [ ] Existing 383-test suite stays green; new total expected 384/384.
- [ ] `npm run typecheck` passes (strict).
- [ ] `npm run lint` passes.
- [ ] `npm run generate:api -- --check` returns no diff (no schema touched).
- [ ] All 6 SPEC §4 grep gates clean:
  - `grep -RE "(fetch|axios)\(" src/ --include='*.ts' --include='*.tsx' | grep -vE "src/data/|src/api/|src/utils/csv-export\.ts"` returns nothing
  - `grep -RE "as any" src/ --include='*.ts' --include='*.tsx' | grep -v "src/api/generated"` returns nothing
  - `grep -RE "from ['\"].*api/generated" src/features/ src/routes/` returns nothing
  - `grep -RE "\bNumberInput\b" src/features/` returns nothing outside the integer-only allowlist
  - (other two gates from SPEC §4 also clean)
- [ ] Idempotency-Key behavior unchanged (existing test at line 301-329 still green).
- [ ] No optimistic write to the cache from the import response body (terminal-mutation rule respected).

## Rollback notes

The change is one hook in one file plus one test. If a regression surfaces:

1. Revert the `onSuccess` block in `useImportProducts` (delete the added `onSuccess` and the `useQueryClient()` line). Hook returns to the pre-fix shape — products list goes back to not refreshing post-import, but no other surface is affected.
2. Revert the new test case in `mutations.test.ts`. The existing 8 tests for the file remain unaffected.
3. Flip status.md back to `pending`.

No database, no schema, no generated client, no route, no store — rollback is a two-line revert, isolated to `src/data/catalog/`.

## Out of scope

- Reworking the import flow's UI feedback (success rate, failed rows). The current `ImportCsvModal` already renders the response.
- Adding a toast notification on success (would duplicate the modal's success UI).
- Per-product `catalogKeys.detail(id)` invalidation — gated on a future BE shape change.
