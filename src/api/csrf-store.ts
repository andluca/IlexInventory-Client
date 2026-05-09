/**
 * src/api/csrf-store.ts
 *
 * In-memory store for the CSRF token across the SPA lifetime.
 *
 * Why memory and not document.cookie: when the FE and BE are on different
 * registrable domains (Netlify ↔ Railway) the browser sends the csrftoken
 * cookie back to the BE on every request (credentials: include + SameSite=
 * None) but JS at the FE origin cannot READ it. The BE returns the token
 * in the body of /auth/me, /auth/login, /auth/signup; we stash it here so
 * apiClient can echo it back as the X-CSRFToken header on mutations.
 */

let token: string | null = null

export function setCsrfToken(value: string | null | undefined): void {
  token = value ?? null
}

export function getCsrfToken(): string | null {
  return token
}

export function clearCsrfToken(): void {
  token = null
}
