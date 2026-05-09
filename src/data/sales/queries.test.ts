/**
 * src/data/sales/queries.test.ts
 *
 * TDD for ILE-7 Step 1 — sales data layer (queries).
 */

import { describe, it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { createElement } from 'react'
import { server } from '@/test/server'
import { useSosList, useSo, usePreviewSo } from './queries'
import { ApiError } from '@/api/errors'

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const SO_DRAFT = {
  id: 'so-1',
  customer_name: 'Acme Corp',
  customer_contact: null,
  status: 'draft',
  committed_at: null,
  voided_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  lines: [],
}

const SO_COMMITTED = {
  id: 'so-2',
  customer_name: 'Beta Ltd',
  customer_contact: 'orders@beta.example',
  status: 'committed',
  committed_at: '2026-01-15T10:00:00Z',
  voided_at: null,
  created_at: '2026-01-10T00:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  lines: [],
}

const PREVIEW_RESPONSE = {
  allocations: [
    {
      line_id: 'line-1',
      batch_id: 'b-1',
      batch_code: 'BCH-A',
      quantity: '10.0000',
      unit_cost: '3.0000',
      expiration_date: '2026-06-01',
    },
  ],
}

// ---------------------------------------------------------------------------
// useSosList
// ---------------------------------------------------------------------------

describe('useSosList', () => {
  it('cursor pagination: page 1 returns next_cursor; fetchNextPage issues ?cursor=c1', async () => {
    const PAGE_1 = { items: [SO_DRAFT], next_cursor: 'c1' }
    const PAGE_2 = { items: [SO_COMMITTED], next_cursor: null }

    let requestCount = 0
    let capturedCursor: string | null = null

    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders', ({ request }) => {
        requestCount++
        const url = new URL(request.url)
        capturedCursor = url.searchParams.get('cursor')
        return HttpResponse.json(capturedCursor ? PAGE_2 : PAGE_1)
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useSosList(), { wrapper: makeWrapper(qc) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)
    expect(result.current.data?.pages[0]?.items).toHaveLength(1)

    act(() => {
      void result.current.fetchNextPage()
    })

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    expect(capturedCursor).toBe('c1')
    expect(result.current.data?.pages[1]?.items[0]?.id).toBe('so-2')
    expect(result.current.hasNextPage).toBe(false)
    expect(requestCount).toBe(2)
  })

  it('forwards status, voided, search, from, to to query string', async () => {
    let captured: Record<string, string | null> = {}

    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders', ({ request }) => {
        const url = new URL(request.url)
        captured = {
          status: url.searchParams.get('status'),
          voided: url.searchParams.get('voided'),
          search: url.searchParams.get('search'),
          from: url.searchParams.get('from'),
          to: url.searchParams.get('to'),
        }
        return HttpResponse.json({ items: [], next_cursor: null })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(
      () =>
        useSosList({
          status: 'committed',
          voided: false,
          search: 'acme',
          from: '2026-01-01',
          to: '2026-12-31',
        }),
      { wrapper: makeWrapper(qc) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(captured.status).toBe('committed')
    expect(captured.voided).toBe('false')
    expect(captured.search).toBe('acme')
    expect(captured.from).toBe('2026-01-01')
    expect(captured.to).toBe('2026-12-31')
  })
})

// ---------------------------------------------------------------------------
// useSo
// ---------------------------------------------------------------------------

describe('useSo', () => {
  it('resolves with SO on 200', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders/so-1', () =>
        HttpResponse.json(SO_DRAFT),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useSo('so-1'), { wrapper: makeWrapper(qc) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe('so-1')
    expect(result.current.data?.customer_name).toBe('Acme Corp')
  })

  it('surfaces 404 as ApiError(status=404) and does NOT retry', async () => {
    let hitCount = 0
    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders/so-missing', () => {
        hitCount++
        return HttpResponse.json({ error: 'not_found' }, { status: 404 })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useSo('so-missing'), { wrapper: makeWrapper(qc) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(404)
    // retry: false on 404 — exactly one hit
    expect(hitCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// usePreviewSo
// ---------------------------------------------------------------------------

describe('usePreviewSo', () => {
  it('does NOT fire a request when enabled=false', async () => {
    let hitCount = 0
    server.use(
      http.post('http://localhost:8000/api/v1/sales-orders/so-1/preview', () => {
        hitCount++
        return HttpResponse.json(PREVIEW_RESPONSE)
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => usePreviewSo('so-1', { enabled: false }), {
      wrapper: makeWrapper(qc),
    })

    // Give it a tick to fire (it shouldn't)
    await new Promise((r) => setTimeout(r, 50))

    expect(result.current.fetchStatus).toBe('idle')
    expect(hitCount).toBe(0)
  })

  it('fires a request when enabled=true', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/sales-orders/so-1/preview', () =>
        HttpResponse.json(PREVIEW_RESPONSE),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => usePreviewSo('so-1', { enabled: true }), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.allocations).toHaveLength(1)
  })

  it('does NOT carry an Idempotency-Key header (preview is non-mutating)', async () => {
    let capturedIdempotencyKey: string | null | undefined = undefined

    server.use(
      http.post('http://localhost:8000/api/v1/sales-orders/so-1/preview', ({ request }) => {
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json(PREVIEW_RESPONSE)
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => usePreviewSo('so-1', { enabled: true }), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // No Idempotency-Key on preview (non-mutating)
    expect(capturedIdempotencyKey).toBeNull()
  })
})
