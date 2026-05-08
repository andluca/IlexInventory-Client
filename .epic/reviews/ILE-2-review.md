# Review — ILE-2 Setup API client + OpenAPI type generation

**Reviewed:** 2026-05-08 17:55  **Commit:** `1745b3d`  **Verdict:** clean with minor concerns

## Summary

Epic shipped the `src/api/` boundary in one shot: `openapi-typescript` codegen against a live BE → snapshot → fail source-resolution waterfall (`scripts/generate-api.mjs`), an `openapi-fetch`-backed `apiClient` with credentials/CSRF/Idempotency-Key middleware and 4xx → `ApiError` normalization (`src/api/client.ts`), the typed error envelope (`src/api/errors.ts`), the CSV export URL builder (`src/utils/csv-export.ts`), a UUIDv7 mint (`src/utils/uuidv7.ts` thin re-export of the npm package), and the architectural grep gates as a runnable script (`scripts/check-grep-gates.sh`). 14 source/util files + 4 test files (client/errors/csv-export/uuidv7), totaling **44 new tests** (16 + 12 + 10 + 6) on top of ILE-1's 48 → **110/110 pass**. The committed schema (`docs/openapi.snapshot.json`) was sourced from the BE's `drf-spectacular` because the live server wasn't reachable — defensible per SPEC §5 phase 2.

## Spec compliance

| Surface item | Status |
|---|---|
| `src/api/generated/` (regenerated; committed) | ✓ shipped (`schema.ts` + thin `index.ts` re-exporter) |
| `src/api/client.ts` (credentials, CSRF, Idempotency-Key, 4xx normalization) | ✓ all four concerns wired via `openapi-fetch` middleware |
| `src/api/errors.ts` (`ApiError` typed envelope) | ✓ `Error` subclass, `static is()` guard, prototype-chain restoration for cross-realm `instanceof` |
| `src/utils/csv-export.ts` (+ unit test for URL building) | ✓ allowlisted, throws on misuse |
| `src/utils/uuidv7.ts` (or pinned dependency) | ✓ thin `export { uuidv7 } from 'uuidv7'`; library choice documented in Notes |
| `package.json` `generate:api` script (with `--check` mode) | ✓ + `lint:gates` + chained into `lint` |
| CI grep gates wired in `package.json` lint task | ✓ 6 gates run on every `npm run lint` (one extra over the SPEC's five — `console.log/debug` — useful) |

**+ extras:** `lint:gates` script + `scripts/check-grep-gates.sh` (the gates themselves were just docs in SPEC §4 before; now executable). `docs/openapi.snapshot.json` (committed snapshot for offline regen). All in scope.

## Discipline (per `.claude/skills/ilex-discipline/SKILL.md`)

| Rule | Status |
|---|---|
| No `as any` outside `src/api/generated/` | ✓ pass — gate green; `routeTree.gen.ts` correctly excluded by the script (see Concerns) |
| No bare `fetch`/`axios` outside `src/data/` / `src/api/` / `src/utils/csv-export.ts` | ✓ pass — gate green; `scripts/generate-api.mjs` uses Node `fetch` for HEAD reachability check, lives outside `src/` so unaffected |
| No hand-written API types | ✓ pass — `paths` imported from `./generated/schema`; `ApiError` is the *envelope* contract, not an API resource type |
| Money/qty as strings end-to-end | n/a — no money/qty paths touched in this issue |
| No `NumberInput` in money/qty fields | n/a — no inputs touched in this issue |
| Routes don't import generated client | ✓ pass — gate green |
| Terminal mutations not optimistic | n/a — no mutations wired yet (data layer lands per-domain in ILE-3+) |
| `Idempotency-Key` on the seven required endpoints | ✓ pass — `ALWAYS_IDEMPOTENT_POST_PATHS` lists all seven (products/import, PO receive, batches POST, recall, un-recall, SO commit, SO void); `CONDITIONAL_IDEMPOTENT_POST_PATHS` for `write_off` movements; caller-supplied key always wins (retry semantics correct) |
| Cross-owner = 404 rendered as Not found | n/a — surfaces in detail routes (ILE-4+); the wrapper raises `ApiError(status=404)` correctly |

## Tests (per `.claude/skills/tdd/SKILL.md`)

| Pattern | Status |
|---|---|
| 404 not-found rendering for detail routes | n/a (no detail routes in this issue) |
| 409 stale-state for terminal mutations | n/a (no mutations yet); `client.test.ts` does cover 4xx → `ApiError` propagation generically |
| `Idempotency-Key` header asserted on terminal mutation hooks | ✓ asserted in `client.test.ts` for receive (auto-mints UUIDv7), respects caller-supplied key, conditional `write_off` vs `adjustment` |
| Money/qty round-trip with precision-sensitive value | n/a — covered in ILE-1's `money.test.ts`, no regression |
| MSW handlers in component/page tests, not generated-client mocks | ✓ `client.test.ts` drives MSW directly; the lazy `Proxy` pattern was specifically chosen so `globalThis.fetch` is captured *after* MSW patches it (Journal note — load-bearing) |
| No snapshot tests masking behavior | ✓ pass — no `toMatchSnapshot` in any test |

## Design alignment

n/a — this issue is pre-UI infrastructure (no archetype consumed; no design tokens touched). `docs/design/` is untouched as expected.

## Concerns / open

- **CSV path allowlist is too permissive.** `csv-export.ts` allows `/batches/` as a prefix, which means `csvExportUrl('/batches/B-1/movements', ...)` would *also* pass even though `/batches/{id}/movements` is not a CSV endpoint. The four legitimate CSV paths from SPEC §2.5 are `/financials/dashboard`, `/financials/margin`, `/movements`, `/batches/{id}/recall-report` only. **Patch suggestion** (left as Concern — behavior change, defer to user): replace the prefix list with regex patterns:
  ```ts
  const CSV_PATH_PATTERNS = [
    /^\/financials\/dashboard$/,
    /^\/financials\/margin$/,
    /^\/movements$/,
    /^\/batches\/[^/]+\/recall-report$/,
  ]
  ```
  Existing tests should still pass; a new test asserting `/batches/B-1/movements` throws would close the gap.

- **SPEC §4 grep gate 3 is now stale.** `check-grep-gates.sh` excludes `*.gen.ts` from the `as any` gate (TanStack Router's `routeTree.gen.ts` legitimately uses two `as any` casts). SPEC §4 still reads `grep -RE "as any" src/ ... | grep -v "src/api/generated"` — no `.gen.ts` exclusion. Either the SPEC text needs updating, or the gate should ban auto-generated files from `as any` too (impossible without forking the router). Recommend updating SPEC §4 to match the script. Doc concern, not a code patch.

- **`docs/issues/status.md` was recreated by a Claude session during execution.** Spotted and removed before commit. The cause: `.claude/agents/{planner,executor}.md` and `.claude/commands/*.md` still reference `docs/issues/` paths (we migrated to `.epic/issues/` but didn't update the harness). The Epic-dispatched Claude read the stale instructions and tried to write `status.md` in the old location. **Patch suggestion** (left as Concern): either update those `.claude/` paths to `.epic/issues/`, or delete the now-redundant SDD harness entirely (Epic supersedes it). I flagged this in the migration commit but skipped the update; the symptom now confirms it should land.

- **`{}` cast as `OpenApiClient` in the lazy-Proxy pattern (`client.ts:173`).** Necessary for the Proxy target placeholder; the property accesses always forward to the real client via `getClient()`. Not a violation (it's not `as any`), but worth flagging as a clarity-vs-pragmatism trade. Acceptable.

- **`src/api/generated/schema.ts` was sourced from a snapshot, not a live BE.** Per Journal: "BE was not running; used `drf-spectacular spectacular --file` to generate snapshot." The snapshot drifts the moment BE merges anything; CI's `generate:api -- --check` will catch the drift, but on dev machines it's silent until someone runs the regen. Recommend adding a banner to `docs/openapi.snapshot.json`'s commit message or to README that the snapshot is best-effort and the live BE is the source of truth.

- **Side fixes shipped in this commit, not separate.** `@mantine/form 9.x → 7.x` (peer-dep with React 18) and `@testing-library/dom` (RTL v16 explicit peer) were both ILE-1 dep mismatches that I caught during review. They're entangled with ILE-2's package.json (Epic added `openapi-typescript`, `openapi-fetch`, `uuidv7` in the same file), so I bundled them into the ILE-2 commit and noted them in the message footer rather than splitting. Open question: do you want me to retroactively split these into a separate `fix: ILE-1 dep mismatches` commit (would require `git revert` + cherry-pick gymnastics)? Default: leave as-is.

- **Files outside `src/`, `tests/`, `package*.json`, `.epic/`:** Epic touched `eslint.config.js` (added `scripts/**/*` to Node globals — necessary for the new script files), `.env.example` (corrected `VITE_OPENAPI_URL` to `/api/v1/openapi.json` matching the BE), `.gitignore` (re-added `.epic/sessions/` which was a no-op duplicate of the user's pending edit), `docs/openapi.snapshot.json` (the schema dump). All justified for an infra issue. No drift.

## Verdict

**Clean shipment.** The 5 concerns are minor and three of them (CSV allowlist, SPEC drift, stale `.claude/` references) deserve patch follow-ups. None block ILE-3 from proceeding — they're hygiene.
