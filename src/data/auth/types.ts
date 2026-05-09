/**
 * src/data/auth/types.ts
 *
 * Hand-typed request/response shapes for auth endpoints.
 *
 * NOTE: The BE's drf-spectacular output ships `requestBody?: never` and
 * content-less 200 responses for all four auth endpoints (verified in
 * docs/openapi.snapshot.json). These types are the ONLY hand-written
 * API shapes in the codebase — they exist because the OpenAPI schema is
 * genuinely missing the contract. Everywhere else, use generated types.
 *
 * BE follow-up: add OpenApiTypes.OBJECT schemas to the auth views so a
 * future `npm run generate:api` makes these hand-types redundant.
 */

export type LoginRequest = { email: string; password: string }
export type SignupRequest = { email: string; password: string }
export type AuthMeResponse = { id: string; email: string }

/** Raw /auth/{me,login,signup} response body. The user object is
 * unwrapped into AuthMeResponse by callers; csrf_token is stashed into
 * the in-memory store for cross-origin X-CSRFToken use. */
export type AuthRawResponse = {
  user: { id: string; email: string }
  csrf_token: string
}
