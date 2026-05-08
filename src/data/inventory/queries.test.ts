import { describe, it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { createElement } from 'react'
import { server } from '@/test/server'
import { useMovements, useBatchesByProduct } from './queries'
import { ApiError } from '@/api/errors'

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const MOVEMENT_1 = {
  id: 'mov-1',
  owner_id: 1,
  batch_id: 'batch-1',
  kind: 'receipt',
  signed_quantity: '100.00',
  notes: null,
  reference_type: null,
  reference_id: null,
  created_at: '2024-01-01T00:00:00Z',
}

const MOVEMENT_2 = {
  id: 'mov-2',
  owner_id: 1,
  batch_id: 'batch-1',
  kind: 'adjustment',
  signed_quantity: '-5.00',
  notes: 'Spilled',
  reference_type: null,
  reference_id: null,
  created_at: '2024-01-02T00:00:00Z',
}

const BATCH_1 = {
  id: 'batch-1',
  owner_id: 1,
  product_id: 'prod-1',
  purchase_order_line_id: null,
  batch_code: 'B001',
  expiration_date: null,
  unit_cost: '10.00',
  on_hand: '95.00',
  is_recalled: false,
  recall_reason: null,
  recalled_at: null,
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('useMovements', () => {
  it('resolves with initial page on 200', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({
          items: [MOVEMENT_1, MOVEMENT_2],
          next_cursor: null,
        }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useMovements(), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.pages.at(0)?.items).toHaveLength(2)
    expect(result.current.data?.pages.at(0)?.items.at(0)?.id).toBe('mov-1')
    expect(result.current.hasNextPage).toBe(false)
  })

  it('paginates via next_cursor', async () => {
    const PAGE_1 = { items: [MOVEMENT_1], next_cursor: 'cursor-abc' }
    const PAGE_2 = { items: [MOVEMENT_2], next_cursor: null }

    let requestCount = 0
    server.use(
      http.get('http://localhost:8000/api/v1/movements', ({ request }) => {
        requestCount++
        const url = new URL(request.url)
        const cursor = url.searchParams.get('cursor')
        return HttpResponse.json(cursor ? PAGE_2 : PAGE_1)
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useMovements(), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)

    act(() => {
      void result.current.fetchNextPage()
    })

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    expect(result.current.data?.pages.at(1)?.items.at(0)?.id).toBe('mov-2')
    expect(result.current.hasNextPage).toBe(false)
    expect(requestCount).toBe(2)
  })

  it('passes product_id filter to query string', async () => {
    let capturedProductId: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/movements', ({ request }) => {
        const url = new URL(request.url)
        capturedProductId = url.searchParams.get('product_id')
        return HttpResponse.json({ items: [MOVEMENT_1], next_cursor: null })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useMovements({ product_id: 'prod-1' }), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedProductId).toBe('prod-1')
  })

  it('passes from/to/kind filters to query string', async () => {
    let capturedFrom: string | null = null
    let capturedTo: string | null = null
    let capturedKind: string | null = null

    server.use(
      http.get('http://localhost:8000/api/v1/movements', ({ request }) => {
        const url = new URL(request.url)
        capturedFrom = url.searchParams.get('from')
        capturedTo = url.searchParams.get('to')
        capturedKind = url.searchParams.get('kind')
        return HttpResponse.json({ items: [], next_cursor: null })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(
      () => useMovements({ from: '2024-01-01', to: '2024-12-31', kind: 'adjustment' }),
      { wrapper: makeWrapper(qc) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedFrom).toBe('2024-01-01')
    expect(capturedTo).toBe('2024-12-31')
    expect(capturedKind).toBe('adjustment')
  })

  it('normalizes errors to ApiError', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ error: 'not_authenticated' }, { status: 401 }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useMovements(), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(401)
  })
})

describe('useBatchesByProduct', () => {
  it('returns total from the BE response', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({
          items: [BATCH_1],
          total: 3,
          limit: 1,
          offset: 0,
        }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useBatchesByProduct('prod-1', { limit: 1 }), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.total).toBe(3)
    expect(result.current.data?.items).toHaveLength(1)
  })

  it('returns total=0 when no batches exist', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({
          items: [],
          total: 0,
          limit: 1,
          offset: 0,
        }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useBatchesByProduct('prod-no-batches', { limit: 1 }), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.total).toBe(0)
  })

  it('passes product_id and limit to query string', async () => {
    let capturedProductId: string | null = null
    let capturedLimit: string | null = null

    server.use(
      http.get('http://localhost:8000/api/v1/batches', ({ request }) => {
        const url = new URL(request.url)
        capturedProductId = url.searchParams.get('product_id')
        capturedLimit = url.searchParams.get('limit')
        return HttpResponse.json({ items: [], total: 0, limit: 1, offset: 0 })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useBatchesByProduct('prod-abc', { limit: 1 }), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedProductId).toBe('prod-abc')
    expect(capturedLimit).toBe('1')
  })

  it('normalizes errors to ApiError', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ error: 'not_authenticated' }, { status: 401 }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useBatchesByProduct('prod-1'), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(401)
  })
})
