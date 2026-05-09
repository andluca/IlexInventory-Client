import { describe, it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { createElement } from 'react'
import { server } from '@/test/server'
import { useMovements, useBatchesByProduct, useBatchesByPoId, useBatch, useBatchesList } from './queries'
import { ApiError } from '@/api/errors'
import { procurementKeys } from '@/data/procurement/keys'

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

describe('useBatchesByPoId', () => {
  const PO_WITH_2_LINES = {
    id: 'po-1',
    supplier_name: 'Acme',
    supplier_contact: null,
    status: 'received',
    received_at: '2026-01-15T10:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    lines: [
      {
        id: 'line-1',
        purchase_order_id: 'po-1',
        product_id: 'prod-1',
        quantity: '10.0000',
        unit_cost: '5.0000',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'line-2',
        purchase_order_id: 'po-1',
        product_id: 'prod-2',
        quantity: '20.0000',
        unit_cost: '3.0000',
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
  }

  const makeBatch = (id: string, productId: string, lineId: string | null) => ({
    id,
    owner_id: 1,
    product_id: productId,
    purchase_order_line_id: lineId,
    batch_code: `LOT-${id}`,
    expiration_date: null,
    unit_cost: '5.0000',
    on_hand: '10.0000',
    is_recalled: false,
    recall_reason: null,
    recalled_at: null,
    archived_at: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  })

  it('returns only the 2 PO-linked batches (one per PO line) out of 3 total per product', async () => {
    // For prod-1: 3 batches — 1 linked to line-1, 2 others unlinked
    const prod1Batches = [
      makeBatch('batch-a', 'prod-1', 'line-1'), // PO-linked
      makeBatch('batch-b', 'prod-1', null),       // not linked
      makeBatch('batch-c', 'prod-1', null),       // not linked
    ]
    // For prod-2: 3 batches — 1 linked to line-2, 2 others unlinked
    const prod2Batches = [
      makeBatch('batch-d', 'prod-2', 'line-2'), // PO-linked
      makeBatch('batch-e', 'prod-2', null),       // not linked
      makeBatch('batch-f', 'prod-2', null),       // not linked
    ]

    server.use(
      http.get('http://localhost:8000/api/v1/batches', ({ request }) => {
        const url = new URL(request.url)
        const productId = url.searchParams.get('product_id')
        if (productId === 'prod-1') {
          return HttpResponse.json({ items: prod1Batches, total: 3, limit: 200, offset: 0 })
        }
        if (productId === 'prod-2') {
          return HttpResponse.json({ items: prod2Batches, total: 3, limit: 200, offset: 0 })
        }
        return HttpResponse.json({ items: [], total: 0, limit: 200, offset: 0 })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    // Seed the PO in the cache so useBatchesByPoId can read it
    qc.setQueryData(procurementKeys.detail('po-1'), PO_WITH_2_LINES)

    const { result } = renderHook(() => useBatchesByPoId('po-1'), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Should return exactly 2 batches — one per PO line
    expect(result.current.data?.items).toHaveLength(2)
    const batchIds = result.current.data?.items.map((b) => b.id)
    expect(batchIds).toContain('batch-a')
    expect(batchIds).toContain('batch-d')
  })
})

describe('useBatch', () => {
  it('resolves with batch on 200', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches/batch-1', () =>
        HttpResponse.json(BATCH_1),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useBatch('batch-1'), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe('batch-1')
    expect(result.current.data?.batch_code).toBe('B001')
  })

  it('surfaces 404 as error with status===404 and does NOT retry', async () => {
    let hitCount = 0
    server.use(
      http.get('http://localhost:8000/api/v1/batches/batch-missing', () => {
        hitCount++
        return HttpResponse.json({ error: 'not_found' }, { status: 404 })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useBatch('batch-missing'), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(404)
    // retry: false on 404 means exactly one hit
    expect(hitCount).toBe(1)
  })
})

describe('useBatchesList', () => {
  it('forwards product_id, is_recalled, expiring_within, offset, limit to query string', async () => {
    let captured: Record<string, string | null> = {}
    server.use(
      http.get('http://localhost:8000/api/v1/batches', ({ request }) => {
        const url = new URL(request.url)
        captured = {
          product_id: url.searchParams.get('product_id'),
          is_recalled: url.searchParams.get('is_recalled'),
          expiring_within: url.searchParams.get('expiring_within'),
          limit: url.searchParams.get('limit'),
          offset: url.searchParams.get('offset'),
        }
        return HttpResponse.json({ items: [], total: 0, limit: 50, offset: 0 })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(
      () =>
        useBatchesList({
          product_id: 'prod-1',
          is_recalled: false,
          expiring_within: 14,
          page: 2,
          limit: 25,
        }),
      { wrapper: makeWrapper(qc) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(captured.product_id).toBe('prod-1')
    expect(captured.is_recalled).toBe('false')
    expect(captured.expiring_within).toBe('14')
    expect(captured.limit).toBe('25')
    expect(captured.offset).toBe('25') // page 2, limit 25 → offset 25
  })

  it('resolves with items on 200', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ items: [BATCH_1], total: 1, limit: 50, offset: 0 }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useBatchesList(), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.items).toHaveLength(1)
    expect(result.current.data?.total).toBe(1)
  })
})
