---
id: ILE-3
github_id: null
status: open
assignee: null
state: Queued
type: item
depends_on: [ILE-2]
---

# ILE-3 Build app shell + auth (login, sign-up, logout)

## Overview

Implement the public Auth pages (`/login`, `/signup`) and the App Shell that wraps every authenticated page (per SPEC §2.8 + §3.1): sidebar nav, topbar with floor-mode toggle and ⌘K trigger (shell only — categories filled in ILE-9), and the **empty right-rail agent slot** reserved for Phase 3 (per SPEC §2.9 — content lands in a follow-up; v1 ships the layout slot with a placeholder so adding the panel later is a content swap, not a layout migration). Land `RequireAuth` route guard against `GET /auth/me` (401 → redirect to `/login`), the floor-mode Zustand store (`<html class="floor">` toggle persisted in `localStorage`, per SPEC §2.8 and D4), and the logout action surfaced in the topbar + Settings page. Form errors render inline (400 missing fields, 401 bad credentials, 409 duplicate email). No email verification, no password reset.

## Surface

- [ ] `src/routes/__root.tsx`, `login.tsx`, `signup.tsx`, `settings.tsx`
- [ ] `src/features/auth/LoginPage.tsx`, `SignupPage.tsx`
- [ ] `src/features/shell/AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `FloorModeToggle.tsx`, `RequireAuth.tsx`, `AgentSlotPlaceholder.tsx`, `CmdkTrigger.tsx`
- [ ] `src/features/settings/SettingsPage.tsx`
- [ ] `src/data/auth/queries.ts`, `mutations.ts`, `keys.ts`
- [ ] `src/stores/floor-mode.ts`, `src/stores/cmdk.ts` (state shell only; categories in ILE-9)
- [ ] Hook + page tests with MSW: signup flow, login flow, logout, 401 redirect, 409 duplicate email, floor-mode persistence

## Dependencies

- ILE-2 (API client)
- BE phase 5 (auth endpoints live) — already done per BE status (ILEX-003 completed).
