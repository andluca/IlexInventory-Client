---
id: ILE-3
github_id: null
status: completed
assignee: null
state: Done
type: item
depends_on: [ILE-2]
completed_at: "2026-05-08"
---

# ILE-3 Build app shell + auth (login, sign-up, logout)

## Overview

Implement the public Auth pages (`/login`, `/signup`) and the App Shell that wraps every authenticated page (per SPEC §2.8 + §3.1): sidebar nav, topbar with floor-mode toggle and ⌘K trigger (shell only — categories filled in ILE-9), and the **empty right-rail agent slot** reserved for Phase 3 (per SPEC §2.9 — content lands in a follow-up; v1 ships the layout slot with a placeholder so adding the panel later is a content swap, not a layout migration). Land `RequireAuth` route guard against `GET /auth/me` (401 → redirect to `/login`), the floor-mode Zustand store (`<html class="floor">` toggle persisted in `localStorage`, per SPEC §2.8 and D4), and the logout action surfaced in the topbar + Settings page. Form errors render inline (400 missing fields, 401 bad credentials, 409 duplicate email). No email verification, no password reset.

## Surface

- [x] `src/routes/__root.tsx`, `src/routes/login.tsx`, `signup.tsx`
- [x] `src/routes/_authed.tsx` (pathless layout: `RequireAuth` + `<AppShell>`)
- [x] `src/routes/_authed.index.tsx`, `_authed.settings.tsx`
- [x] `src/features/auth/LoginPage.tsx`, `SignupPage.tsx`, `sanitizeNext.ts`
- [x] `src/features/shell/AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `FloorModeToggle.tsx`, `RequireAuth.tsx`, `RightRailSlot.tsx`, `CmdkTrigger.tsx`
- [x] `src/features/settings/SettingsPage.tsx`
- [x] `src/data/auth/queries.ts`, `mutations.ts`, `keys.ts`, `types.ts`
- [x] `src/stores/cmdk.ts`, `src/features/shell/floorMode.ts` (DOM side-effect helper)
- [x] Hook + page tests with MSW (119/119 green)

## Dependencies

- ILE-2 (API client)
- BE phase 5 (auth endpoints live) — already done per BE status (ILEX-003 completed).


# Specification

## Page: Login
File: `src/routes/login.tsx` (route) + `src/features/auth/LoginPage.tsx` (component)

The first authenticated entry point. Realizes flow X1 per SPEC §3.1. Public route — does **not** mount the App Shell. Layout is the custom narrow centered card on charcoal called out in SPEC §3.1: brand mark + `<Title order={2}>Ilex Inventory</Title>` + email/password form + `<Anchor>` link to `/signup`.

### Preconditions

* User is unauthenticated (no session cookie, or `GET /auth/me` returns 401)
* BE auth endpoints reachable at `${VITE_API_BASE_URL}/auth/login` and `${VITE_API_BASE_URL}/auth/me`

### Primary Use Case — successful login

#### Workflow
* User visits `/login`
* User types `email` + `password` and clicks **Log in**
* `useLoginMutation` calls `apiClient.POST('/api/v1/auth/login', { body: { email, password } })`
* On 200: BE has set the session cookie; the mutation invalidates `['auth', 'me']`; `useAuthMe` refetches and resolves with the user; the route effect navigates to `/`
* App Shell mounts at `/`

#### Output
* `<html class="">` (no floor class unless persisted true), session cookie set by BE, URL is `/`

### Edge Case — 401 bad credentials

#### Workflow
* User submits with wrong password
* BE returns `401 { error: "invalid_credentials", detail: "Email or password is incorrect." }`
* `apiClient` throws `ApiError(status=401, error='invalid_credentials')`
* Form renders inline alert: "Email or password is incorrect." Form re-enables, password field cleared, focus returns to password input
* No redirect

### Edge Case — 400 missing fields

#### Workflow
* User submits with empty email
* Client-side `useForm` validation rejects before HTTP — Mantine field error `"Email is required"` shown
* On a 400 from the BE (`{ error: 'validation_error', fields: { email: 'Email is required' } }`), `ApiError.fields` is mapped onto `form.setErrors(fields)` so per-field messages render under each input

## Page: Signup
File: `src/routes/signup.tsx` + `src/features/auth/SignupPage.tsx`

Realizes flow X2. Same shell-less layout as `/login`. Single-step form — email + password — no email verification, no password confirmation field (SPEC §3.1: "simplest possible").

### Primary Use Case — successful signup

#### Workflow
* User visits `/signup` (link from `/login`)
* User submits `{ email, password }`
* `useSignupMutation` calls `apiClient.POST('/api/v1/auth/signup', { body })`
* On 200: BE has created the account and set the session cookie; mutation invalidates `['auth', 'me']`; `useAuthMe` resolves; effect navigates to `/`

### Edge Case — 409 duplicate email

#### Workflow
* User submits an email already on file
* BE returns `409 { error: "duplicate_email", detail: "An account with that email already exists.", fields: { email: "Already registered" } }`
* `ApiError(status=409, error='duplicate_email', fields: {email: 'Already registered'})` thrown
* Signup form maps `fields` onto `form.setErrors` — inline error under the email input
* Below the form: link "Already have an account? Log in" remains visible (kept in the layout so 409 → user pivots to login without losing context)

## Page: App Shell
File: `src/routes/_authed.tsx` (route, pathless layout) + `src/features/shell/AppShell.tsx`

The layout that wraps every authenticated page (per SPEC §2.8). Composed of `<Sidebar>`, `<Topbar>`, the page `<Outlet/>` as the main column, and the `<RightRailSlot>` placeholder (empty in v1; Phase 3 fills with `<AgentPanel>`).

### Preconditions

* User is authenticated (`useAuthMe` resolved with a user)
* `RequireAuth` has cleared the gate — anyone reaching this component has a session

### Primary Use Case — render shell

#### Workflow
* `<RequireAuth>` calls `useAuthMe`
  * Loading: render full-page Mantine `<Loader/>` (centered, no shell chrome) — flicker-prevention; skip when query is in cache
  * Resolved: render `<AppShell>` with the current page in the main column
  * 401 error: navigate replace to `/login`, propagating `?next=<currentPath>` so post-login lands back where the user came from
* `<AppShell>` lays out:
  * `<Sidebar>` — fixed-width left column (240px), brand mark + nav links to top-level pages (`/`, `/products`, `/purchase-orders`, `/sales-orders`, `/stock`, `/settings`). Routes that don't exist yet (catalog/PO/SO/stock land in ILE-4–8) render as disabled `<NavLink>` items with a "Coming soon" tooltip — the sidebar surface is fully present from day one
  * `<Topbar>` — top row with current user email (right-aligned), `<FloorModeToggle>`, `<CmdkTrigger>` (button rendering `⌘K` chip — opens nothing yet; `useCmdk.openShell()` flips a boolean store the ILE-9 spotlight wires up), and a `Logout` menu item under a user `<Menu>`
  * Main column scrolls; sidebar + topbar are sticky
  * `<RightRailSlot>` — 320px right column with the v1 placeholder body ("What can I help with?", agent icon, mock disabled input). Collapsible via a topbar button (state in `useRightRail` zustand or local — simplest: local `useState` for now since nothing else reads it; promote to a store only if ILE-13 needs it from outside)

### Edge Case — floor-mode side effect

#### Workflow
* On mount and on every change of `useFloorMode().enabled`, an effect toggles `document.documentElement.classList.toggle('floor', enabled)`
* The effect lives in `<AppShell>` (the only authenticated entry point) — not in the store, since stores stay side-effect-free
* On the public `/login` and `/signup` pages, the class is **not** applied (kept off so charcoal looks identical for everyone pre-auth) — `AppShell` is the sole owner of the `<html>` class

### Edge Case — logout

#### Workflow
* User clicks `Logout` in the topbar user menu (and the same action exists on `/settings`)
* `useLogoutMutation` calls `apiClient.POST('/api/v1/auth/logout')` — BE clears the session cookie (returns 204)
* `queryClient.removeQueries({ queryKey: ['auth', 'me'] })` (and `queryClient.clear()` for safety — every cached resource was per-session)
* `router.navigate({ to: '/login', replace: true })`
* On a 401 returned by `/auth/logout` (already logged out elsewhere): treat as success — same client-side cleanup + redirect (idempotent)

## Page: Settings
File: `src/routes/_authed.settings.tsx` + `src/features/settings/SettingsPage.tsx`

Account-level settings page. v1 surface is intentionally thin per SPEC §2.7: the current user email (from `useAuthMe`) and a `Logout` button. Agent OAuth status (per SPEC row §3.x) is reserved for ILE-9 / Phase 13 and is not in this issue.

### Primary Use Case

* Renders `<Card>` with `<Title>Account</Title>`, the user's email (mono), and a destructive-intent `Logout` button.
* Logout button reuses `useLogoutMutation` — same flow as the topbar action.

## Function: useAuthMe
File: `src/data/auth/queries.ts`
Input: `()`
Returns: `UseQueryResult<{ id: string; email: string }, ApiError>`

Single source of truth for "is the user authenticated, and who are they?". Wraps `apiClient.GET('/api/v1/auth/me')`. The `RequireAuth` guard, the topbar user menu, and the Settings page all consume this hook.

### Implementation

* `queryKey: authKeys.me()` from `src/data/auth/keys.ts`
* `queryFn`: `apiClient.GET('/api/v1/auth/me')` — returns the user JSON `{ id, email }` (typed via `src/data/auth/types.ts` since the OpenAPI snapshot ships these endpoints with no body schema)
* `staleTime: 5 * 60_000` (5 min — the session rarely changes mid-app-life; we revalidate on focus implicitly via TanStack defaults)
* `retry: false` — a 401 must not be retried into another 401; `RequireAuth` reacts on the first error
* The query is **enabled by default**; pages mounted under `_authed.tsx` always need it. Public pages (`/login`, `/signup`) do not call this hook — they use `useLoginMutation` / `useSignupMutation` which invalidate the key on success so the first visit to a `_authed` route after login finds the cache warm

## Function: useLoginMutation
File: `src/data/auth/mutations.ts`
Input: `()`
Returns: `UseMutationResult<void, ApiError, { email: string; password: string }>`

### Implementation

* `mutationFn`: `apiClient.POST('/api/v1/auth/login', { body: { email, password } })`
* `onSuccess`: `queryClient.invalidateQueries({ queryKey: authKeys.me() })`
* No `onError` here — the form component reads `mutation.error` and renders inline (`ApiError.fields` → `form.setErrors`, otherwise `error.detail` as a top-of-form alert)
* No idempotency-key — `/auth/login` is not in the seven idempotent endpoints (re-submitting login is harmless and not retried by us)

## Function: useSignupMutation
File: `src/data/auth/mutations.ts`
Input: `()`
Returns: `UseMutationResult<void, ApiError, { email: string; password: string }>`

### Implementation

Mirror of `useLoginMutation` against `POST /api/v1/auth/signup`. Same invalidation + error contract. The 409 `duplicate_email` envelope is the only signup-specific code the form branches on.

## Function: useLogoutMutation
File: `src/data/auth/mutations.ts`
Input: `()`
Returns: `UseMutationResult<void, ApiError, void>`

### Implementation

* `mutationFn`: `apiClient.POST('/api/v1/auth/logout')` — 204 expected
* `onSettled` (success **or** 401 — already-logged-out): `queryClient.clear()` + `router.navigate({ to: '/login', replace: true })`
* `onError` for non-401 errors: surface via `<Notifications>` ("Couldn't log out — try again.") and stay put — do **not** clear caches on a transient 5xx (avoids silently logging users out on a network blip)

## Component: RequireAuth
File: `src/features/shell/RequireAuth.tsx`
Input: `({ children: ReactNode })`
Returns: `ReactElement`

Route guard. Reads `useAuthMe`. Used inside `_authed.tsx` to wrap the App Shell.

### Implementation

* `isLoading` → `<Center mih="100vh"><Loader /></Center>` (no shell — keeps the load state minimal)
* `error && ApiError.is(error) && error.status === 401` → `<Navigate to="/login" search={{ next: location.pathname }} replace />`
* `data` → `{children}`
* Any other error (5xx) bubbles to the root error boundary — do **not** redirect on transient backend failures; that would log users out on a flaky deploy

## Component: FloorModeToggle
File: `src/features/shell/FloorModeToggle.tsx`

Mantine `<Switch>` in the topbar. Reads `useFloorMode().enabled`, calls `useFloorMode().toggle` on change. Persistence is handled by the existing `persist` middleware on the store (ILE-1). The DOM side effect (`<html class="floor">`) is wired in `<AppShell>`'s `useEffect`, **not** here — the toggle is a pure store consumer.

## Store: cmdk
File: `src/stores/cmdk.ts`

Stub Zustand store (no persistence) with `{ open: boolean, openShell: () => void, closeShell: () => void }`. Exists in this issue solely so `<CmdkTrigger>` has something to call; the spotlight body lands in ILE-9. Keeps ILE-9's surface clean — it imports an existing store rather than introducing one.

## Component: CmdkTrigger
File: `src/features/shell/CmdkTrigger.tsx`

Mantine `<Button variant="subtle">⌘K</Button>` in the topbar. `onClick={() => useCmdk.getState().openShell()}`. In v1 nothing is wired downstream; the click toggles the boolean and the spotlight is hidden behind a feature gate that lights up in ILE-9. Dev convenience: console-warn once per session that the palette is not yet implemented (gated by `import.meta.env.DEV`) so the empty click is debuggable but not noisy in production.

## Component: RightRailSlot
File: `src/features/shell/RightRailSlot.tsx`

Per `docs/design/components.md#rightrailslot`. v1 body: centered "What can I help with?" + agent icon + a non-functional mock input at the bottom. Collapsed/expanded state held in local `useState` for now (no cross-component coupling in v1; promote to a store when ILE-13 wires the panel).

## Lib: src/data/auth/keys.ts

Stable query-key factory:

* `authKeys.all = ['auth'] as const`
* `authKeys.me = () => [...authKeys.all, 'me'] as const`

## Lib: src/data/auth/types.ts

Hand-typed request/response shapes for auth (the OpenAPI snapshot ships `requestBody?: never` for these endpoints — see Notes):

```ts
export type LoginRequest = { email: string; password: string }
export type SignupRequest = { email: string; password: string }
export type AuthMeResponse = { id: string; email: string }
```

Imported by the data layer only — features never see these types directly (they consume `useAuthMe().data`, which is already typed).

## External Dependencies

### BE auth endpoints
Used for: session lifecycle.
Commands: `POST /api/v1/auth/{login,signup,logout}`, `GET /api/v1/auth/me`.

* Session cookie set by BE on login/signup, cleared on logout
* CSRF token attached by `apiClient` middleware on POST/PATCH/DELETE (no-op pre-login since the cookie isn't present yet — ILE-2 handles)
* 4xx envelope `{ error, detail?, fields? }` normalized by `apiClient` to `ApiError`


# Plan

Each step is independently shippable. Within a step, a failing test goes first, then the implementation, then the green run (per `tdd` skill).

1. **Land the auth data layer (`src/data/auth/`)**
   - Why: every UI surface in this issue depends on `useAuthMe` / `useLoginMutation` / `useSignupMutation` / `useLogoutMutation`. Building the data hooks first means the page tests assert against a real hook — no mocks of our own code. Picking this as step 1 keeps the four downstream UI steps pure-component.
   - [ ] Create `src/data/auth/{keys,types,queries,mutations}.ts` per Specification
   - [ ] Write `queries.test.ts`: MSW handler for `GET /auth/me` 200 → `useAuthMe` resolves with `{id,email}`; MSW 401 → query lands in `error` state with `ApiError(status=401)`; `retry: false` confirmed (no extra MSW hits on 401)
   - [ ] Write `mutations.test.ts`: login 200 invalidates `['auth','me']`; login 401 sets `mutation.error.error === 'invalid_credentials'`; signup 409 sets `mutation.error.fields.email`; logout 204 clears the cache and is callable a second time without state
   - [ ] `npm test` green; `npm run typecheck` green

2. **Add the floor-mode `<html>` class side effect + tests**
   - Why: the store landed in ILE-1 but the DOM wiring did not. Doing this before AppShell means the AppShell test can assert "rendering with `enabled=true` writes the class" without re-implementing the side effect.
   - [ ] Write `src/stores/floor-mode.test.ts`: store starts at `enabled=false`; `toggle()` flips; persistence under `ilex.floorMode` key (mock localStorage); a small `applyFloorClass(enabled: boolean)` helper exported from `src/features/shell/floorMode.ts` toggles `document.documentElement.classList`
   - [ ] Implement `src/features/shell/floorMode.ts` (single function — keeps stores side-effect-free)
   - [ ] `npm test` green

3. **Land `RequireAuth` and the `_authed.tsx` pathless layout**
   - Why: the gate must exist before any authenticated route can mount. Splitting it from AppShell keeps the redirect logic testable in isolation without rendering sidebar/topbar chrome.
   - [ ] Write `RequireAuth.test.tsx`: loading state renders `<Loader>`; 401 from MSW renders nothing and triggers a `<Navigate>` to `/login` (assert via memory router landing on `/login`); 200 renders `children`
   - [ ] Implement `src/features/shell/RequireAuth.tsx`
   - [ ] Create `src/routes/_authed.tsx` mounting `<RequireAuth><AppShellPlaceholder>{children}</AppShellPlaceholder></RequireAuth>` — the AppShell body is a stub div in this step so the route tree compiles; full chrome lands in step 5
   - [ ] Move `src/routes/index.tsx` → `src/routes/_authed.index.tsx` (root dashboard placeholder is now under the auth gate); regenerate `routeTree.gen.ts` via `npm run dev` (or the router-plugin invocation our setup uses)
   - [ ] `npm test && npm run typecheck` green

4. **Land `LoginPage` + `SignupPage` (public routes)**
   - Why: with the data hooks live (step 1), the forms can ship as thin shells over `useForm` + the mutation hooks. Doing both in one step is justified — they share 90% of layout (centered card on charcoal) and the only divergence is the 409 duplicate-email branch on signup.
   - [ ] Write `LoginPage.test.tsx`:
     - happy path: type email + password, submit, MSW returns 200 on `/auth/login` and 200 on `/auth/me`, asserts navigation to `/` (memory router)
     - 401 bad credentials: MSW returns `ApiError(invalid_credentials)`, inline alert renders "Email or password is incorrect.", password field is cleared and refocused
     - 400 missing fields: empty submit blocked client-side (`Email is required`); a contrived 400 with `fields.email` from MSW maps to inline field error
   - [ ] Write `SignupPage.test.tsx`:
     - happy path: 200 → invalidates `auth/me` → navigates to `/`
     - 409 duplicate_email: `fields.email` rendered inline; "Already have an account? Log in" link still visible and navigates to `/login`
   - [ ] Implement `LoginPage` + `SignupPage` using Mantine `useForm` (from `@mantine/form` — add to deps if not already there) with Zod-style validators inline. Layout: centered `<Stack mih="100vh">` with logo + `<Title>` + `<Paper p="xl" w={420}>` + form
   - [ ] Replace placeholder `src/routes/login.tsx` to mount `<LoginPage>`; create `src/routes/signup.tsx` to mount `<SignupPage>`
   - [ ] `npm test && npm run typecheck && npm run lint` green

5. **Land `<AppShell>` chrome (Sidebar + Topbar + RightRailSlot placeholder)**
   - Why: the gate works (step 3) but `_authed.tsx` is rendering a stub. Filling in the chrome here delivers the entire shell surface in one reviewable step. This is the largest step but cohesive — every component is shell-only, none of them work without the others.
   - [ ] Write `AppShell.test.tsx`:
     - renders `<Sidebar>` with the brand mark + nav links (assert `/products` etc. visible and disabled-with-tooltip)
     - renders `<Topbar>` with the user's email (from MSW-seeded `auth/me`)
     - renders the empty `<RightRailSlot>` body ("What can I help with?")
     - on mount with `useFloorMode.enabled=true` (set via store before render), `document.documentElement` has class `floor`; on toggle from store, class is removed
   - [ ] Write `Topbar.test.tsx`: floor-mode switch toggles store + DOM class; `⌘K` button calls `useCmdk.getState().openShell()` (assert via store snapshot); user menu shows email + `Logout`
   - [ ] Write `Sidebar.test.tsx`: links present, current route highlighted, future routes (`/products`, `/purchase-orders`, …) render as disabled `<NavLink>` items
   - [ ] Implement `Sidebar`, `Topbar`, `FloorModeToggle`, `CmdkTrigger`, `RightRailSlot`, then compose into `AppShell`. Wire the floor-mode side effect (step 2's `applyFloorClass`) inside an `AppShell` `useEffect`. Replace the stub in `_authed.tsx` with `<AppShell><Outlet/></AppShell>`
   - [ ] Add `src/stores/cmdk.ts` (the open/close-only store)
   - [ ] `npm test && npm run typecheck && npm run lint` green

6. **Land logout flow + Settings page**
   - Why: closing the loop. With shell chrome live (step 5), wiring the logout menu item and the Settings page is the shortest path to "user can leave the authenticated surface cleanly". Settings is one more `_authed.*` route consuming `useAuthMe`, no new infra.
   - [ ] Write `useLogoutMutation` integration test: from inside the topbar menu, click `Logout` → MSW returns 204 → `queryClient` is cleared → router lands on `/login`
   - [ ] Write `SettingsPage.test.tsx`: renders email + a `Logout` button; clicking the button does the same thing as the topbar `Logout` (use the same mutation hook)
   - [ ] Implement `SettingsPage`; create `src/routes/_authed.settings.tsx`; wire the topbar user menu's `Logout` item to call `useLogoutMutation`
   - [ ] Edge: 401 on `POST /auth/logout` → treat as success (already logged out elsewhere); confirm with an MSW test
   - [ ] `npm test && npm run typecheck && npm run lint` green

7. **Wire the post-login redirect (`?next=<path>`)**
   - Why: small UX completeness — without it, someone deep-linked to `/products/abc` while logged out lands on `/` after login. Cheap to add, easy to drop if scope tightens. Lives in its own step so it can be cut without rolling back the rest.
   - [ ] Extend `RequireAuth.test.tsx`: when redirecting to `/login` from `/products/abc`, URL search becomes `?next=/products/abc`
   - [ ] Extend `LoginPage.test.tsx` + `SignupPage.test.tsx`: when `?next=/products/abc` is present, post-success navigation goes to `/products/abc`, not `/`. Defaults to `/` when absent. Disallow off-origin or non-`/`-prefixed `next` values (sanitize) — write a unit test asserting `next=https://evil.example/x` falls back to `/`
   - [ ] Implement: `RequireAuth` reads `useLocation` and passes `search`; `LoginPage`/`SignupPage` read `Route.useSearch().next` and call `router.navigate({ to: sanitizedNext })` on success
   - [ ] `npm test` green

8. **Validation pass: regenerate, typecheck, test, drift, lint, smoke**
   - Why: confirms the auth + shell surface is coherent before unblocking ILE-4. Mirrors ILE-2's step 10 — run the full gate so any module-resolution or grep-gate violation is caught here, not in ILE-4's first PR.
   - [ ] `npm run generate:api -- --check` (no schema drift)
   - [ ] `npm run typecheck && npm test && npm run lint` (all green)
   - [ ] `npm run dev` smoke: visit `/login` → log in (MSW won't be live; use the running BE per ILE-1's setup) → land on `/` → toggle floor mode (table heights change) → click ⌘K trigger (no error) → click Logout → land on `/login`. If BE is not available, run the same flow with a temporary MSW worker in `main.tsx` (commit nothing) just to confirm the form behavior end-to-end
   - [ ] Update Surface checkboxes to reflect what landed
   - [ ] Append a Journal entry summarizing what shipped and any judgment calls (e.g., whether `_authed.*` flat-file convention was used vs a nested `_authed/` directory — TanStack supports both; pick whichever the project's existing route plugin config emits cleanly)


# Notes

- **OpenAPI auth bodies are empty.** The BE's `drf-spectacular` output ships `requestBody?: never` and content-less 200 responses for all four auth endpoints (verified in `docs/openapi.snapshot.json`). The data layer hand-types `LoginRequest` / `SignupRequest` / `AuthMeResponse` in `src/data/auth/types.ts`. This is the **only** place we add hand-written request/response shapes for the BE — the rule "no hand-written API types" (SPEC §2.6) is bent for auth because the BE schema is genuinely missing the contract; everywhere else, regenerate. File a BE follow-up to add `OpenApiTypes.OBJECT` schemas to the auth views so a future regen makes our hand-types redundant.
- **`apiClient.POST` typing on auth.** With `requestBody?: never` in the generated paths, `apiClient.POST('/api/v1/auth/login', { body })` will fail TS strict. Two options: (a) cast `body as never` in the data-layer call site (one cast, contained, justified by the comment above); (b) drop to `globalThis.fetch` inside `src/data/auth/queries.ts` with our own URL-building (the grep gate exempts `src/data/`). Prefer (a) — keeps the cookie/CSRF/4xx middleware path, single cast, removable when the BE schema gets fixed.
- **Pathless layout naming.** TanStack file-router supports both `_authed.tsx` (flat) and `_authed/__root.tsx` (directory) for pathless layouts. Pick whichever the existing `@tanstack/router-plugin` config emits without complaints — the executor confirms during step 3. Keep the choice consistent with future ILE-4–8 issues.
- **Floor-mode side effect lives in `AppShell`, not the store.** Stores stay pure; DOM mutations belong in components. This means `<html class="floor">` is **never** applied on `/login` or `/signup` (those don't render `AppShell`) — by design, per Specification.
- **Logout idempotence.** Treating 401 on `POST /auth/logout` as success (rather than as an error) avoids a UX dead-end where a stale tab can't navigate to `/login` because the BE already cleared the session. The cleanup is the same in both branches (`queryClient.clear()` + redirect).
- **`?next=<path>` sanitization.** Only allow paths starting with `/` and not `//` (the latter is a protocol-relative URL — open-redirect vector). On any other shape, fall back to `/`.
- **Mantine `useForm` vs raw refs.** Use `@mantine/form` for both auth pages — it handles per-field error setting (`form.setErrors({ email: 'taken' })`) which maps 1:1 onto `ApiError.fields`. Add `@mantine/form` to deps in step 4 if not already present.
- **Cmdk store is intentionally a stub.** ILE-9 fills the spotlight; landing the store now keeps ILE-9's diff small (it just adds the spotlight provider + categories). Avoid building any spotlight UI here — out of scope.


# Journal

- 2026-05-08 18:26 — ILE-3 completed (Epic stalled mid-step-4 on credit limit; finished manually). Shipped: data layer (`useAuthMe`, `useLoginMutation`, `useSignupMutation`, `useLogoutMutation`), `RequireAuth` guard with `?next=<path>` sanitization (`sanitizeNext.ts`), `<LoginPage>` + `<SignupPage>` (Mantine `useForm`, inline 401/409 + per-field errors), `<AppShell>` chrome (`<Sidebar>` with disabled "Coming soon" links for ILE-4–8 routes, `<Topbar>` with floor-mode toggle + ⌘K stub + user menu logout, `<RightRailSlot>` collapsible placeholder), floor-mode `<html>` class side effect via `applyFloorClass` helper, `<SettingsPage>` (email + Logout). Added `@tabler/icons-react` (UI iconography). Two test infra fixes: localStorage mock in `src/test/setup.ts` (Zustand persist needs it in jsdom), and `await router.load()` in auth-page test helpers (TanStack Router v1.45+ requires async hydration before sync assertions). 119/119 tests pass; typecheck strict + lint + 6 grep gates + drift check all clean.
