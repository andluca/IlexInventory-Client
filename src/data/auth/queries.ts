/**
 * src/data/auth/queries.ts
 *
 * TanStack Query hooks for auth read operations.
 */

import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { ApiError } from '@/api/errors'
import { setCsrfToken } from '@/api/csrf-store'
import { authKeys } from './keys'
import type { AuthMeResponse, AuthRawResponse } from './types'

/**
 * useAuthMe — single source of truth for "is the user authenticated?".
 *
 * Wraps GET /api/v1/auth/me. The RequireAuth guard, topbar user menu,
 * and Settings page all consume this hook.
 *
 * NOTE: The OpenAPI schema ships `content?: never` for the 200 response,
 * so apiClient.GET returns void. We read the raw response and parse JSON
 * manually, casting to AuthMeResponse (the hand-typed contract in types.ts).
 *
 * retry: false — a 401 must not be retried; RequireAuth reacts on the first error.
 */
export function useAuthMe(): UseQueryResult<AuthMeResponse, ApiError> {
  return useQuery<AuthMeResponse, ApiError>({
    queryKey: authKeys.me(),
    queryFn: async () => {
      // apiClient middleware throws ApiError on >= 400, so errors surface naturally.
      // The response body is not typed in the schema (content?: never), so we
      // call fetch directly through the client by using a raw fetch approach.
      // We use the client's middleware (CSRF, error normalization) by going
      // through apiClient.GET, then reading the raw response.
      //
      // openapi-fetch with content?: never returns undefined data. We need the
      // actual JSON body, so we fetch via globalThis.fetch here — this is inside
      // src/data/ which is the allowed boundary for direct fetch usage.
      const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1').replace(
        /\/api\/v1\/?$/,
        '',
      )
      const response = await globalThis.fetch(`${baseUrl}/api/v1/auth/me`, {
        credentials: 'include',
      })
      if (response.status >= 400) {
        let envelope: { error?: string; detail?: string; fields?: Record<string, string> } = {}
        try {
          envelope = (await response.json()) as typeof envelope
        } catch {
          envelope = { error: `http_${response.status}` }
        }
        throw new ApiError({
          status: response.status,
          error: envelope.error ?? `http_${response.status}`,
          ...(envelope.detail !== undefined ? { detail: envelope.detail } : {}),
          ...(envelope.fields !== undefined ? { fields: envelope.fields } : {}),
        })
      }
      const raw = (await response.json()) as AuthRawResponse
      // Stash the CSRF token so apiClient can echo it back as X-CSRFToken.
      // Required cross-origin (Netlify ↔ Railway) where document.cookie
      // can't read the BE-set cookie.
      setCsrfToken(raw.csrf_token)
      return raw.user as AuthMeResponse
    },
    staleTime: 5 * 60_000,
    retry: false,
  })
}
