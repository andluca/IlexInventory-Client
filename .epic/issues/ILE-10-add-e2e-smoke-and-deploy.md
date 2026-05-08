---
id: ILE-10
github_id: null
status: open
assignee: null
state: Queued
type: item
depends_on: [ILE-9]
---

# ILE-10 Add Playwright E2E smoke + production deploy

## Overview

Land Playwright E2E smoke covering the critical flow per SPEC §5 phase 12: signup → create product → receive PO → commit SO → recall batch → view recall report → CSV export. Tests run against a real BE in dev mode (not MSW) to catch contract drift the unit/integration suite can't see. Production build (`npm run build`) verified; static asset hosting target picked (Vercel / Netlify / Render — TBD on cost + region); `VITE_API_BASE_URL` configurable per environment via the deploy provider; CI pipeline (build + typecheck + lint + unit tests + generated-client `--check` on every PR; deploy on merge to `main`); README runbook.

## Surface

- [ ] `tests/e2e/critical-flow.spec.ts` (signup → product → PO receive → SO commit → recall → recall-report → CSV)
- [ ] `playwright.config.ts`
- [ ] `.github/workflows/ci.yml` (lint + test + typecheck + generate-check)
- [ ] `.github/workflows/deploy.yml` (or provider equivalent)
- [ ] `Dockerfile` (only if container deploy is chosen)
- [ ] README deploy + runbook section

## Dependencies

- ILE-9 (⌘K + polish)
