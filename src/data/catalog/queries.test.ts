import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { createElement } from 'react'
import { server } from '@/test/server'
import { useProductsList, useProduct } from './queries'
import { ApiError } from '@/api/errors'

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const PRODUCT_1 = {
  id: 'prod-1',
  sku: 'YRB-001',
  name: 'Yerba Premium',
  description: 'Premium yerba',
  base_unit: 'g',
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const PRODUCT_2 = {
  id: 'prod-2',
  sku: 'TEA-001',
  name: 'Green Tea',
  description: '',
  base_unit: 'g',
  archived_at: null,
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
}

describe('useProductsList', () => {
  it('resolves with paginated body on 200', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({
          items: [PRODUCT_1, PRODUCT_2],
          total: 2,
          limit: 50,
          offset: 0,
        }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useProductsList(), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.items).toHaveLength(2)
    expect(result.current.data?.items.at(0)?.sku).toBe('YRB-001')
    expect(result.current.data?.total).toBe(2)
  })

  it('passes search param through to the query string', async () => {
    let capturedSearch: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/products', ({ request }) => {
        const url = new URL(request.url)
        capturedSearch = url.searchParams.get('search')
        return HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 50, offset: 0 })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useProductsList({ search: 'yrb' }), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedSearch).toBe('yrb')
  })

  it('passes archived=true param through to the query string', async () => {
    let capturedArchived: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/products', ({ request }) => {
        const url = new URL(request.url)
        capturedArchived = url.searchParams.get('archived')
        return HttpResponse.json({ items: [], total: 0, limit: 50, offset: 0 })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useProductsList({ archived: true }), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedArchived).toBe('true')
  })

  it('calculates correct offset for page 2', async () => {
    let capturedOffset: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/products', ({ request }) => {
        const url = new URL(request.url)
        capturedOffset = url.searchParams.get('offset')
        return HttpResponse.json({ items: [], total: 100, limit: 50, offset: 50 })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useProductsList({ page: 2, limit: 50 }), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedOffset).toBe('50')
  })

  it('lands in error state with ApiError on 500', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ error: 'server_error', detail: 'Internal server error' }, { status: 500 }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useProductsList(), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(500)
  })
})

describe('useProduct', () => {
  it('resolves with product on 200', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useProduct('prod-1'), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe('prod-1')
    expect(result.current.data?.sku).toBe('YRB-001')
  })

  it('lands in error state with ApiError(status=404) on 404', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products/not-found', () =>
        new HttpResponse(null, { status: 404 }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useProduct('not-found'), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(404)
  })

  it('does not retry on 404 (MSW hit once)', async () => {
    let hitCount = 0
    server.use(
      http.get('http://localhost:8000/api/v1/products/cross-owner', () => {
        hitCount++
        return new HttpResponse(null, { status: 404 })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useProduct('cross-owner'), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    // Only one hit — no retry on 404
    expect(hitCount).toBe(1)
  })
})
