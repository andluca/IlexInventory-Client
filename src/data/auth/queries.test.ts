import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { createElement } from 'react'
import { server } from '@/test/server'
import { useAuthMe } from './queries'
import { ApiError } from '@/api/errors'

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useAuthMe', () => {
  it('resolves with { id, email } on 200', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/auth/me', () =>
        HttpResponse.json({ id: 'usr_1', email: 'test@example.com' }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useAuthMe(), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ id: 'usr_1', email: 'test@example.com' })
  })

  it('lands in error state with ApiError(status=401) on 401', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/auth/me', () =>
        HttpResponse.json({ error: 'not_authenticated', detail: 'Not authenticated.' }, { status: 401 }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useAuthMe(), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(401)
  })

  it('does not retry on 401 (retry: false)', async () => {
    let hitCount = 0
    server.use(
      http.get('http://localhost:8000/api/v1/auth/me', () => {
        hitCount++
        return HttpResponse.json({ error: 'not_authenticated' }, { status: 401 })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useAuthMe(), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    // Only one hit — no retry
    expect(hitCount).toBe(1)
  })
})
