---
id: ILE-2
github_id: null
status: open
assignee: null
state: Queued
type: item
depends_on: [ILE-1]
---

# ILE-2 Setup API client + OpenAPI type generation

## Overview

Wire `openapi-typescript` to regenerate `src/api/generated/` from the BE OpenAPI 3.1 schema (per SPEC §2.6). Implement `src/api/client.ts` as the thin wrapper that adds `credentials: 'include'`, CSRF (`X-CSRFToken` from `csrftoken` cookie), `Idempotency-Key` plumbing (UUIDv7 per attempt; same key on retry), and 4xx error envelope normalization to a typed `ApiError` (per SPEC §2.5). Land `src/utils/csv-export.ts` as the only allowed builder for CSV-download anchor URLs (the documented exception to the no-bare-fetch rule). Land the `npm run generate:api` script with a `--check` mode for CI drift detection.

## Surface

- [ ] `src/api/generated/` (regenerated; committed)
- [ ] `src/api/client.ts` (credentials, CSRF, Idempotency-Key, 4xx normalization)
- [ ] `src/api/errors.ts` (`ApiError` typed envelope)
- [ ] `src/utils/csv-export.ts` (+ unit test for URL building)
- [ ] `src/utils/uuidv7.ts` (or pinned dependency)
- [ ] `package.json` `generate:api` script (with `--check` mode)
- [ ] CI grep gates wired in `package.json` lint task (the seven checks from SPEC §4)

## Dependencies

- ILE-1 (project tooling)
- BE OpenAPI available — BE phase 13 emits the schema; per BE status, `/api/v1/openapi.json` is live now. Acceptable fallback per SPEC §5 phase 2: an interim hand-published snapshot at `docs/openapi.snapshot.json` to unblock parallel work.
