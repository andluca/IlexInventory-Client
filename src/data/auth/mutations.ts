/**
 * src/data/auth/mutations.ts
 *
 * TanStack Query mutation hooks for auth write operations.
 *
 * NOTE: The OpenAPI schema ships `requestBody?: never` for all auth POST endpoints.
 * We cast body as `never` at each call site — contained, removable when the BE
 * schema gets fixed. See src/data/auth/types.ts for details.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient, UseMutationResult } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { apiClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { clearCsrfToken, setCsrfToken } from '@/api/csrf-store'
import { authKeys } from './keys'
import type { AuthRawResponse, LoginRequest, SignupRequest } from './types'

/** Read the auth response body and stash the csrf_token. The endpoint
 * schemas ship `content?: never`, so we re-fetch the body manually here. */
async function postAuthAndStash(path: string, body: unknown): Promise<void> {
  const baseUrl = (
    import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
  ).replace(/\/api\/v1\/?$/, '')
  const response = await globalThis.fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
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
  setCsrfToken(raw.csrf_token)
}

// ---------------------------------------------------------------------------
// useLoginMutation
// ---------------------------------------------------------------------------

export function useLoginMutation(): UseMutationResult<void, ApiError, LoginRequest> {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, LoginRequest>({
    mutationFn: async ({ email, password }) => {
      // Bypass apiClient here so we can read the response body and stash
      // the csrf_token immediately — needed cross-origin where the cookie
      // is invisible to JS.
      await postAuthAndStash('/api/v1/auth/login', { email, password })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.me() })
    },
  })
}

// ---------------------------------------------------------------------------
// useSignupMutation
// ---------------------------------------------------------------------------

export function useSignupMutation(): UseMutationResult<void, ApiError, SignupRequest> {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, SignupRequest>({
    mutationFn: async ({ email, password }) => {
      await postAuthAndStash('/api/v1/auth/signup', { email, password })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.me() })
    },
  })
}

// ---------------------------------------------------------------------------
// useLogoutMutation
// ---------------------------------------------------------------------------

/**
 * useLogoutMutation
 *
 * Accepts an optional queryClient for testing (allows injecting a test QC
 * without relying on the Provider). In production callers pass nothing —
 * the hook reads it via useQueryClient().
 *
 * Navigation after logout is handled by the component via onSettled/onSuccess
 * callbacks passed to mutate(). The hook clears the cache in onSettled.
 */
export function useLogoutMutation(
  injectedQueryClient?: QueryClient,
): UseMutationResult<void, ApiError, void> {
  const contextQueryClient = useQueryClient()
  const qc = injectedQueryClient ?? contextQueryClient

  return useMutation<void, ApiError, void>({
    mutationFn: async () => {
      // body cast to never: BE schema ships requestBody?: never for /auth/logout.
      await apiClient.POST('/api/v1/auth/logout', { body: undefined as never })
    },
    onSettled: (_data, error) => {
      // Treat 401 (already logged out) as success — idempotent cleanup.
      // For any other error we only clear cache if not a transient 5xx.
      const is401 = ApiError.is(error) && error.status === 401
      const isOtherError = error !== null && error !== undefined && !is401

      if (!isOtherError) {
        qc.clear()
        clearCsrfToken()
      }
    },
    onError: (error) => {
      // 401 is treated as success (already logged out) — don't toast.
      if (ApiError.is(error) && error.status === 401) {
        return
      }
      // Non-401 errors: surface a toast and stay put (do NOT clear cache on 5xx).
      notifications.show({
        color: 'red',
        title: 'Logout failed',
        message: "Couldn't log out — try again.",
      })
    },
  })
}
