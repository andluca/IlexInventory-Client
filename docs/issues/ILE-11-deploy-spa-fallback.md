# ILE-11 — Fullstack deploy hardening: SPA fallback + cross-origin env wiring

## Overview

Three orthogonal deploy gaps that present as the same symptom — a broken page on the deployed FE — but have separate fixes on FE and BE.

### A. Netlify SPA fallback missing

Reproduced at `https://ilexinventory.netlify.app/products`: Netlify's platform 404 ("Page not found / broken link") renders instead of the SPA shell. Root cause: SPA fallback is configured for Vercel only via `vercel.json` (`/(.*) → /index.html`); the repo has no `public/_redirects` and no `netlify.toml`. Whoever first deployed to Netlify got the platform 404 on every direct nav / refresh / share.

**This is *not* an architecture problem.** The take-home brief (`docs/takehome-challenge.md`) says "React UI with TanStack Query for data fetching" — neither SPA nor MPA is mandated; both satisfy the brief. The current SPA choice (TanStack Router file-based + 383 tests + 19 routes) is appropriate scope for a single-tenant inventory app, and the only thing standing between deployed routes working and not-working is a one-line redirect rule per host.

### B. BE CORS / SameSite already correct in `settings/prod.py` — but only when wired

`settings/prod.py` is correct out of the box for cross-origin Netlify ↔ Railway:

```
CORS_ALLOWED_ORIGINS = env_csv("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SAMESITE = "None"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
```

(Verified at `IlexInventory-Server/backend/settings/prod.py`.)

But `settings/base.py` defaults `SESSION_COOKIE_SAMESITE` and `CSRF_COOKIE_SAMESITE` to `"Lax"`, so if Railway is started without `DJANGO_SETTINGS_MODULE=settings.prod` (or equivalent for the entrypoint), or if `CORS_ALLOWED_ORIGINS` is unset / set to a value that doesn't include the *exact* deployed FE origin (scheme + host, no path, no trailing slash), the browser silently drops the cookie or the preflight 403s — and the user calls it a "CORS hit."

### C. FE side already correct

`apiClient` middleware uses `credentials: 'include'`, stashes the `csrf_token` from the body of `/auth/{me,login,signup}` (because cross-origin JS cannot read the BE-set `csrftoken` cookie), and echoes it back as `X-CSRFToken` on POST/PATCH/DELETE. Vite dev proxy rewrites the `Origin` header so Django's CSRF Origin check passes locally. (`src/api/client.ts`, `src/api/csrf-store.ts`, `src/data/auth/{queries,mutations}.ts`, `vite.config.ts`.) No FE-side fix needed.

## Surface

- [x] `/home/andluca/Documents/Github/IlexInventory-Client/public/_redirects` (new) — Netlify SPA fallback rewrite
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/netlify.toml` (optional, new) — config-as-code mirror of the same rewrite
- [x] `/home/andluca/Documents/Github/IlexInventory-Client/docs/issues/status.md` — flip ILE-11 to `planned`, append Execution Log entry on completion
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/vercel.json` — **leave untouched**; existing rewrite already correct

Out of FE planner/executor scope (operator surface only):

- BE `IlexInventory-Server` Railway dashboard env vars (`DJANGO_SETTINGS_MODULE`, `CORS_ALLOWED_ORIGINS`, `ALLOWED_HOSTS`)
- Hosting decision (Vercel vs Netvol canonical)
- Post-deploy DevTools smoke checks

## Dependencies

- None. This is a leaf config change with no FE code dependency, no BE endpoint dependency, no test framework changes.
- Independent of ILE-17 (BE CORS allow-headers fix) — ILE-11 closes the static-asset 404; ILE-17 closes the preflight blocking. Either can ship first.

## Context

### What already exists

- `/home/andluca/Documents/Github/IlexInventory-Client/vercel.json` — already ships the Vercel SPA fallback rewrite (`/(.*) → /index.html`). Do not modify.
- `/home/andluca/Documents/Github/IlexInventory-Client/public/` — Vite copies everything in here verbatim into `dist/` during `npm run build`. Currently holds only `ilex_logo_v4.svg`. Adding `_redirects` puts it at `dist/_redirects`, which Netlify reads from the publish directory.
- `/home/andluca/Documents/Github/IlexInventory-Client/.github/workflows/deploy.yml` — wires Vercel push-to-main + PR previews. Untouched by this issue.
- `/home/andluca/Documents/Github/IlexInventory-Client/docs/issues/status.md` — tracker; ILE-11 currently `pending`.

### Spec reference

Not a spec-bearing change. `docs/specs/SPEC.md` §2 is silent on hosting redirects — they are below the architecture layer. The take-home brief (`docs/takehome-challenge.md`) allows both SPA and MPA; SPA is the locked decision per `docs/issues/status.md` Notes ("Locked architectural decisions").

### Decisions already made that affect this issue

- SPA architecture is locked (`docs/issues/status.md` → Notes → Locked architectural decisions). The 19-route TanStack file-based router stays; the fix is config-only.
- Vercel deploy pipeline already shipped (ILE-10). `vercel.json` is the source of truth for Vercel; `_redirects` (and optional `netlify.toml`) is the source of truth for Netlify. Two-host parity is intentional until the canonical-host decision lands.

## Plan

### Generated types (when applicable)

N/A. No BE schema interaction. `npm run generate:api -- --check` should remain clean.

### Data layer (where applicable)

N/A. No data layer touched.

### Components & features (where applicable)

N/A. No components touched.

### Routes (where applicable)

N/A. No router files touched. The SPA fallback rewrites the static-asset 404 *before* TanStack Router even loads — once `index.html` ships, the existing TanStack route tree resolves `/products`, `/sales-orders/:id`, `/batches/:id/recall-report` etc. as it already does on Vercel today.

### Tests (write FIRST)

There is no behavioural test for a hosting-side redirect rule:

- Cannot be unit-tested — the file is a Netlify build-output convention, not JS.
- Cannot be integration-tested via Vitest + MSW — the test runner doesn't go through Netlify's edge layer.
- Cannot be Playwright-tested locally — the dev server (Vite) and CI E2E target (`tests/e2e/critical-flow.spec.ts`) hit the SPA directly without a 404 fallback layer in front.

The only meaningful verification is post-deploy and is operator-side (see Manual ops follow-up). The existing 383 unit tests + Playwright smoke must remain green; that is the only programmatic gate.

### Implementation

Two steps, in order:

1. **Create `/home/andluca/Documents/Github/IlexInventory-Client/public/_redirects`** (Layer: deploy config / static asset). Single line:
   ```
   /* /index.html 200
   ```
   No trailing newline policy required (Netlify tolerates either). The `200` status — not `301` / `302` — is load-bearing: it makes the redirect a *rewrite* (URL stays as `/products`, content served from `/index.html`), which is what the SPA router needs to read `window.location.pathname`. Vite copies `public/*` into `dist/` verbatim, so the file lands at `dist/_redirects` post-build with no plugin/config wiring needed.

2. **(Optional) Create `/home/andluca/Documents/Github/IlexInventory-Client/netlify.toml`** (Layer: deploy config). Config-as-code mirror of the same rewrite, plus build hints so a fresh Netlify connection picks the right command/output:
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```
   Only add this if the operator wants Netlify's build settings versioned. If `_redirects` alone is enough, skip — both files serving the same rewrite is harmless but redundant. Recommend **shipping both**: `_redirects` is the failsafe (works even if `netlify.toml` is malformed), `netlify.toml` documents the build command without relying on the dashboard UI.

### Integration / wiring

- No route registration. No ⌘K Spotlight items. No floor-mode density change. No store / theme / Tailwind change.
- `vercel.json` left untouched. Vercel ignores `_redirects` (and `netlify.toml`); Netlify ignores `vercel.json`. Two-host parity is a no-op for both.

### Manual ops follow-up (operator surface, not executor)

The executor should **not** attempt these — they require Railway / Netlify / Vercel dashboard access:

1. **BE Railway env vars** (`IlexInventory-Server` cross-repo):
   - `DJANGO_SETTINGS_MODULE=settings.prod` (verify via deploy entrypoint — `Dockerfile` / `Procfile` / `wsgi.py` `os.environ.setdefault`).
   - `CORS_ALLOWED_ORIGINS` set comma-separated, exact origins (no trailing slash, no path):
     ```
     https://ilexinventory.netlify.app,https://<vercel-host>,https://<custom-domain>
     ```
   - `ALLOWED_HOSTS` includes the BE host (e.g. `ilexinventory.up.railway.app`).

2. **Post-deploy smoke** from a deployed FE — open DevTools → Network → reproduce login. Confirm:
   - Direct nav to `<host>/products`, `<host>/sales-orders/<uuid>`, `<host>/batches/<uuid>/recall-report` serves the SPA shell, not the platform 404.
   - Preflight `OPTIONS /api/v1/auth/login` returns 200 with `Access-Control-Allow-Origin: <exact FE origin>` and `Access-Control-Allow-Credentials: true`.
   - Login response sets `Set-Cookie: sessionid=…; Secure; SameSite=None` and `csrftoken=…; Secure; SameSite=None`.
   - Subsequent `GET /api/v1/auth/me` returns 200 with cookies attached.

3. **Hosting canonical decision** — choose Vercel **or** Netlify as the canonical deploy target (or accept the cost of maintaining both). If Netlify is canonical, either disable the Vercel workflow at `.github/workflows/deploy.yml` or keep both with the new `_redirects` shipping to both.

### Documentation to update

None as part of this issue. `docs/decisions.md` already records the SPA architecture; no new decision graduates here. `docs/issues/status.md` gets the standard execution-log entry on completion (executor surface).

### Rollback notes

- Trivial revert: `git rm public/_redirects netlify.toml` and redeploy. Netlify falls back to its default behaviour (platform 404 on direct nav) — exactly the state before this issue.
- No state migration. No cache invalidation. No env var revert.
- Vercel deploys are unaffected by the rollback (Vercel never reads `_redirects` / `netlify.toml`).

## Files involved

- `/home/andluca/Documents/Github/IlexInventory-Client/public/_redirects` (new, 1 line)
- `/home/andluca/Documents/Github/IlexInventory-Client/netlify.toml` (new, optional, ~10 lines)
- `/home/andluca/Documents/Github/IlexInventory-Client/docs/issues/status.md` (status flip + execution-log entry on completion)

## Acceptance criteria

### FE (executor surface)

- [ ] `public/_redirects` exists with content `/* /index.html 200`.
- [ ] (Optional) `netlify.toml` exists with `[build]` + `[[redirects]]` blocks per Implementation step 2.
- [ ] `vercel.json` unchanged (`git diff vercel.json` empty).
- [ ] `npm run build` succeeds; `dist/_redirects` present in build output (`ls dist/_redirects` returns the file).
- [ ] Universal gates green:
  - `npm test` (383+/383+ pass)
  - `npm run typecheck` clean
  - `npm run lint` clean
  - `npm run generate:api -- --check` no diff
  - 6 SPEC §4 grep gates clean (no `fetch(`/`axios(` outside data/api/csv-export, no `as any` outside generated, no generated imports from features/routes, no `NumberInput` outside allowlist)

### Operator surface (out of executor scope, captured for completeness)

- [ ] Railway env vars set per Manual ops follow-up step 1.
- [ ] Post-deploy DevTools smoke per Manual ops follow-up step 2.
- [ ] Hosting canonical decision recorded per Manual ops follow-up step 3.

## Out of scope

- Migrating off TanStack Router or moving to SSR/MPA. Brief allows either; current SPA is appropriate-scope and already shipped with 383 tests.
- Per-route prerender. Not needed for v1.
- Adding a new BE endpoint. The endpoint catalog is complete (verified — every FE call maps to a real BE URL pattern + view method).
- Modifying `vercel.json` or `.github/workflows/deploy.yml`. Vercel side already correct.
- Cross-repo BE code change. ILE-17 covers the BE CORS allow-headers fix separately.
