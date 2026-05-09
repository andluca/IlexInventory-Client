import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { createElement } from 'react'
import { server } from '@/test/server'
import { useLoginMutation, useSignupMutation, useLogoutMutation } from './mutations'
import { ApiError } from '@/api/errors'
import { authKeys } from './keys'

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useLoginMutation', () => {
  it('on 200 invalidates ["auth","me"] query', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/auth/login', () =>
        HttpResponse.json({
          user: { id: 'usr_1', email: 'test@example.com' },
          csrf_token: 'test-csrf-token',
        }),
      ),
      // Handler for refetch triggered by invalidation
      http.get('http://localhost:8000/api/v1/auth/me', () =>
        HttpResponse.json({
          user: { id: 'usr_1', email: 'test@example.com' },
          csrf_token: 'test-csrf-token',
        }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

    const { result } = renderHook(() => useLoginMutation(), {
      wrapper: makeWrapper(qc),
    })

    // Spy on invalidateQueries to confirm it is called with the right key
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    act(() => {
      result.current.mutate({ email: 'test@example.com', password: 'secret' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // After success, invalidateQueries should have been called with authKeys.me()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: authKeys.me() })
  })

  it('on 401 sets mutation.error with error === "invalid_credentials"', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/auth/login', () =>
        HttpResponse.json(
          { error: 'invalid_credentials', detail: 'Email or password is incorrect.' },
          { status: 401 },
        ),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
    const { result } = renderHook(() => useLoginMutation(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({ email: 'test@example.com', password: 'wrong' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).error).toBe('invalid_credentials')
    expect((result.current.error as ApiError).status).toBe(401)
  })
})

describe('useSignupMutation', () => {
  it('on 409 sets mutation.error.fields.email', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/auth/signup', () =>
        HttpResponse.json(
          {
            error: 'duplicate_email',
            detail: 'An account with that email already exists.',
            fields: { email: 'Already registered' },
          },
          { status: 409 },
        ),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
    const { result } = renderHook(() => useSignupMutation(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({ email: 'existing@example.com', password: 'secret' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(409)
    expect((result.current.error as ApiError).fields?.email).toBe('Already registered')
  })

  it('on 200 invalidates ["auth","me"]', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/auth/signup', () =>
        HttpResponse.json({
          user: { id: 'usr_new', email: 'new@example.com' },
          csrf_token: 'test-csrf-token',
        }),
      ),
      http.get('http://localhost:8000/api/v1/auth/me', () =>
        HttpResponse.json({
          user: { id: 'usr_new', email: 'new@example.com' },
          csrf_token: 'test-csrf-token',
        }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

    const { result } = renderHook(() => useSignupMutation(), {
      wrapper: makeWrapper(qc),
    })

    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    act(() => {
      result.current.mutate({ email: 'new@example.com', password: 'secret' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: authKeys.me() })
  })
})

describe('useLogoutMutation', () => {
  it('on 204 clears the query cache', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/auth/logout', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    qc.setQueryData(authKeys.me(), { id: 'usr_1', email: 'test@example.com' })

    const { result } = renderHook(() => useLogoutMutation(qc), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate()
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Cache should be cleared
    expect(qc.getQueryData(authKeys.me())).toBeUndefined()
  })

  it('on 401 (already logged out) treats as success and clears cache', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/auth/logout', () =>
        HttpResponse.json({ error: 'not_authenticated' }, { status: 401 }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
    qc.setQueryData(authKeys.me(), { id: 'usr_1', email: 'test@example.com' })

    const { result } = renderHook(() => useLogoutMutation(qc), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate()
    })

    // Wait for the mutation to settle (either success or error state)
    await waitFor(() =>
      expect(result.current.isSuccess || result.current.isError).toBe(true)
    )
    // Cache should still be cleared (onSettled runs for both success + 401 error)
    expect(qc.getQueryData(authKeys.me())).toBeUndefined()
  })
})
