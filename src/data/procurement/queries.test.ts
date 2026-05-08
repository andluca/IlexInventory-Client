import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { createElement } from 'react'
import { server } from '@/test/server'
import { usePosList, usePo } from './queries'
import { ApiError } from '@/api/errors'

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const PO_1 = {
  id: 'po-1',
  supplier_name: 'Acme Suppliers',
  supplier_contact: 'acme@example.com',
  status: 'draft',
  received_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  lines: [],
}

const PO_2 = {
  id: 'po-2',
  supplier_name: 'Best Co',
  supplier_contact: null,
  status: 'received',
  received_at: '2026-01-15T10:00:00Z',
  created_at: '2026-01-10T00:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  lines: [],
}

describe('usePosList', () => {
  it('resolves with paginated body on 200', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/purchase-orders', () =>
        HttpResponse.json({
          items: [PO_1, PO_2],
          total: 2,
          limit: 50,
          offset: 0,
        }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => usePosList(), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.items).toHaveLength(2)
    expect(result.current.data?.items.at(0)?.supplier_name).toBe('Acme Suppliers')
    expect(result.current.data?.total).toBe(2)
  })

  it('passes status=draft param through to the query string', async () => {
    let capturedStatus: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/purchase-orders', ({ request }) => {
        const url = new URL(request.url)
        capturedStatus = url.searchParams.get('status')
        return HttpResponse.json({ items: [PO_1], total: 1, limit: 50, offset: 0 })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => usePosList({ status: 'draft' }), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedStatus).toBe('draft')
  })

  it('passes search=acme param through to the query string', async () => {
    let capturedSearch: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/purchase-orders', ({ request }) => {
        const url = new URL(request.url)
        capturedSearch = url.searchParams.get('search')
        return HttpResponse.json({ items: [PO_1], total: 1, limit: 50, offset: 0 })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => usePosList({ search: 'acme' }), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedSearch).toBe('acme')
  })

  it('passes from=2026-01-01 param through to the query string', async () => {
    let capturedFrom: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/purchase-orders', ({ request }) => {
        const url = new URL(request.url)
        capturedFrom = url.searchParams.get('from')
        return HttpResponse.json({ items: [], total: 0, limit: 50, offset: 0 })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => usePosList({ from: '2026-01-01' }), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedFrom).toBe('2026-01-01')
  })

  it('calculates correct offset for page 2', async () => {
    let capturedOffset: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/purchase-orders', ({ request }) => {
        const url = new URL(request.url)
        capturedOffset = url.searchParams.get('offset')
        return HttpResponse.json({ items: [], total: 100, limit: 50, offset: 50 })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => usePosList({ page: 2, limit: 50 }), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedOffset).toBe('50')
  })
})

describe('usePo', () => {
  it('resolves with PO on 200', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/purchase-orders/po-1', () =>
        HttpResponse.json(PO_1),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => usePo('po-1'), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe('po-1')
    expect(result.current.data?.supplier_name).toBe('Acme Suppliers')
  })

  it('lands in error state with ApiError(status=404) on 404', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/purchase-orders/not-found', () =>
        new HttpResponse(null, { status: 404 }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => usePo('not-found'), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(404)
  })

  it('does not retry on 404 (MSW hit once)', async () => {
    let hitCount = 0
    server.use(
      http.get('http://localhost:8000/api/v1/purchase-orders/cross-owner', () => {
        hitCount++
        return new HttpResponse(null, { status: 404 })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => usePo('cross-owner'), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    // Only one hit — no retry on 404
    expect(hitCount).toBe(1)
  })
})
