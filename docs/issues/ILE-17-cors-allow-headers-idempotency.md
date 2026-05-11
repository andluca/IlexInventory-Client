# ILE-17 — Cross-repo: BE must allow `Idempotency-Key` in CORS preflight

Status: completed (BE-side, `IlexInventory-Server` commit `09df7b1`)

## Overview

This is a **BE-side fix** (`IlexInventory-Server/backend/settings/prod.py`) that the FE depends on. Tracked here so the FE issue surface stays the single source of truth for "what's still broken in deploy"; the actual code change happens in the BE repo.

### Symptom

Every terminal mutation (commit SO, void SO, receive PO, recall, un-recall, manual batch, write-off, products import) **fails in cross-origin production** at the browser preflight, *not* at the actual request. The user sees console errors like:

```
Access to fetch at 'https://<be>/api/v1/sales-orders/<id>/commit'
from origin 'https://<fe>' has been blocked by CORS policy:
Request header field idempotency-key is not allowed by Access-Control-Allow-Headers in preflight response.
```

This matches the user-reported "lots of endpoints hitting error on prod web" — and explains why functionality looks fine in dev (Vite proxy makes it same-origin, so no preflight).

### Root cause

`django-cors-headers` ships a default `CORS_ALLOW_HEADERS` of:

```py
("accept", "authorization", "content-type", "user-agent", "x-csrftoken", "x-requested-with")
```

(Verified from `corsheaders/defaults.py` in the BE's `.venv`.)

**`idempotency-key` is not in the default list.** Neither `backend/settings/base.py` nor `backend/settings/prod.py` overrides `CORS_ALLOW_HEADERS`, so the package default applies.

The FE always attaches `Idempotency-Key: <uuidv7>` on the seven SPEC §2.5 BE-required terminal endpoints (plus `/batches/{id}/movements` when `kind === 'write_off'`). The BE itself reads it via `request.META.get("HTTP_IDEMPOTENCY_KEY")` in `apps/core/idempotency.py:52` and **requires it** for those endpoints (`Idempotency-Key header required` 400 on miss). So the contract is: "FE must send it; BE must process it." The contract is broken cross-origin because the *browser* never lets the request through.

### Why GETs and login still work

- GET requests don't send `Idempotency-Key`, so they're CORS-simple (only safelisted headers).
- `/auth/login` and `/auth/signup` are CSRF-exempt and the FE doesn't add `Idempotency-Key` on them.
- `/auth/logout` sends `X-CSRFToken` (which **is** in the default header list) but no `Idempotency-Key`.
- `useUpdateProduct` (PATCH) and similar non-terminal mutations send `X-CSRFToken` but no `Idempotency-Key` — those work.

So the failure surface is exactly: terminal mutations + the conditional `write_off` movement. That's also where most of the user-reported "errors" cluster — committing a sales order, receiving a PO, recalling a batch.

## Acceptance criteria (BE repo)

In `IlexInventory-Server/backend/settings/base.py` or `prod.py`, add:

```py
from corsheaders.defaults import default_headers

CORS_ALLOW_HEADERS = (
    *default_headers,
    "idempotency-key",
)
```

Lowercase is correct — CORS header matching is case-insensitive, but the `corsheaders` package compares lowercased strings.

- [ ] Setting added once in `base.py` (so dev and prod both honour it; dev's `CORS_ALLOW_ALL_ORIGINS = True` doesn't override the headers list, only the origins list).
- [ ] BE smoke test asserting an `OPTIONS` preflight to `/api/v1/sales-orders/{id}/commit` with `Access-Control-Request-Headers: idempotency-key, x-csrftoken, content-type` returns 200 with `idempotency-key` listed in `Access-Control-Allow-Headers`. (A two-line test in `apps/core/tests/api/test_cors.py` is sufficient.)
- [ ] Deploy → from a production FE origin, hit a terminal endpoint and confirm the network panel shows preflight 200 + actual POST 200/201/204.

## Acceptance criteria (FE side — none, but verification)

- [ ] After the BE ships the fix, run the existing Playwright critical-flow E2E (`tests/e2e/critical-flow.spec.ts`) against the production deploy. It exercises every terminal mutation; if it passes, this is closed.

## Related FE issues

- **ILE-11** (deploy fallback + env wiring) — separately addresses the Netlify direct-nav 404 and the `VITE_API_BASE_URL` injection. ILE-17 is the third leg of "endpoints don't work in prod"; together they should clear the user-reported failures.
- **ILE-13** (`useImportProducts` invalidation) — independent: even with CORS fixed, the import-flow cache stays stale until reload.

## Out of scope

- Adding *other* custom headers. The FE only sends `Idempotency-Key` and `X-CSRFToken` (already allowlisted). If a future endpoint requires another, this same pattern applies.
- Switching `corsheaders` to `CORS_ALLOW_ALL_HEADERS = True`. Don't — explicit allowlist is the correct posture.
