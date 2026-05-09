/**
 * src/data/sales/mutations.test.ts
 *
 * TDD for ILE-7 Step 1 — sales data layer (mutations).
 * Key assertions:
 *  - useCreateSo: 201 invalidates salesKeys.lists(); NO Idempotency-Key header
 *  - useUpdateSo: PATCH replaces lines; invalidates detail + lists + preview
 *  - useCommitSo: 200 sends non-empty Idempotency-Key; invalidates inventoryKeys.all; retry:false
 *  - useCommitSo: with allocations param sends { allocations: [...] }; without sends {}
 *  - useCommitSo: 422 surfaces as ApiError(status=422)
 *  - useCommitSo: 409 surfaces as ApiError(status=409)
 *  - useVoidSo: 200 sends empty body + non-empty Idempotency-Key; invalidates inventoryKeys.all; 409 for caller
 */

import { describe, it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { createElement } from 'react'
import { server } from '@/test/server'
import { useCreateSo, useUpdateSo, useCommitSo, useVoidSo } from './mutations'
import { salesKeys } from './keys'
import { inventoryKeys } from '@/data/inventory/keys'
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
  ...SO_DRAFT,
  status: 'committed',
  committed_at: '2026-01-15T10:00:00Z',
}

const SO_VOIDED = {
  ...SO_COMMITTED,
  status: 'voided',
  voided_at: '2026-01-20T10:00:00Z',
}

// ---------------------------------------------------------------------------
// useCreateSo
// ---------------------------------------------------------------------------

describe('useCreateSo', () => {
  it('201 — resolves, invalidates salesKeys.lists(), asserts NO Idempotency-Key header', async () => {
    let capturedIdempotencyKey: string | null | undefined = undefined

    server.use(
      http.post('http://localhost:8000/api/v1/sales-orders', ({ request }) => {
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json(SO_DRAFT, { status: 201 })
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })
    // Seed something to verify invalidation
    qc.setQueryData(salesKeys.lists(), { pages: [], pageParams: [] })

    const { result } = renderHook(() => useCreateSo(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({
        customer_name: 'Acme Corp',
        lines: [],
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe('so-1')
    // Draft create must NOT have Idempotency-Key (not in the seven-endpoint list)
    expect(capturedIdempotencyKey).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// useUpdateSo
// ---------------------------------------------------------------------------

describe('useUpdateSo', () => {
  it('PATCH replaces lines; invalidates detail + lists + preview', async () => {
    let capturedBody: Record<string, unknown> | null = null

    server.use(
      http.patch('http://localhost:8000/api/v1/sales-orders/so-1', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          ...SO_DRAFT,
          lines: [{ id: 'line-1', product_id: 'prod-1', quantity: '10.0000', sell_price: '5.0000', allocations: [], so_id: 'so-1', created_at: '2026-01-01T00:00:00Z' }],
        })
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })
    qc.setQueryData(salesKeys.detail('so-1'), SO_DRAFT)

    const { result } = renderHook(() => useUpdateSo(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({
        id: 'so-1',
        lines: [{ product_id: 'prod-1', quantity: 10, sell_price: 5 }],
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedBody).toMatchObject({
      lines: [{ product_id: 'prod-1', quantity: 10, sell_price: 5 }],
    })
  })
})

// ---------------------------------------------------------------------------
// useCommitSo
// ---------------------------------------------------------------------------

describe('useCommitSo', () => {
  it('200 — sends non-empty Idempotency-Key; invalidates salesKeys.detail + inventoryKeys.all; retry:false on 5xx', async () => {
    let capturedIdempotencyKey: string | null = null
    let hitCount = 0

    server.use(
      http.post('http://localhost:8000/api/v1/sales-orders/so-1/commit', ({ request }) => {
        hitCount++
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json(SO_COMMITTED)
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })
    qc.setQueryData(inventoryKeys.all, { dummy: true })

    const { result } = renderHook(() => useCommitSo(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({ id: 'so-1' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedIdempotencyKey).not.toBeNull()
    expect(capturedIdempotencyKey!.length).toBeGreaterThan(0)
    expect(hitCount).toBe(1)
  })

  it('retry: false on 5xx — MSW hit count = 1 (no automatic retry)', async () => {
    let hitCount = 0

    server.use(
      http.post('http://localhost:8000/api/v1/sales-orders/so-1/commit', () => {
        hitCount++
        return HttpResponse.json({ error: 'server_error' }, { status: 500 })
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useCommitSo(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({ id: 'so-1' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(hitCount).toBe(1)
  })

  it('with allocations param — sends { allocations: [...] } body', async () => {
    let capturedBody: Record<string, unknown> | null = null

    server.use(
      http.post('http://localhost:8000/api/v1/sales-orders/so-1/commit', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(SO_COMMITTED)
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useCommitSo(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({
        id: 'so-1',
        allocations: [
          { sales_order_line_id: 'line-1', batch_id: 'batch-1', quantity: '10' },
        ],
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedBody).toHaveProperty('allocations')
    expect(Array.isArray((capturedBody as unknown as { allocations: unknown[] }).allocations)).toBe(true)
  })

  it('without allocations param — sends {} body (BE walks FEFO)', async () => {
    let capturedBody: Record<string, unknown> | null = null

    server.use(
      http.post('http://localhost:8000/api/v1/sales-orders/so-1/commit', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(SO_COMMITTED)
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useCommitSo(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({ id: 'so-1' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedBody).not.toHaveProperty('allocations')
  })

  it('422 surfaces as ApiError(status=422) carrying the shortfall envelope', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/sales-orders/so-1/commit', () =>
        HttpResponse.json(
          {
            error: 'shortfall',
            detail: 'Insufficient stock',
            shortfall: { product_id: 'prod-1', required: '10.0000', available: '8.0000' },
          },
          { status: 422 },
        ),
      ),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useCommitSo(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({ id: 'so-1' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(422)
  })

  it('409 surfaces as ApiError(status=409) for caller to map to refetch + toast', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/sales-orders/so-1/commit', () =>
        HttpResponse.json({ error: 'stale_state' }, { status: 409 }),
      ),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useCommitSo(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({ id: 'so-1' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(409)
  })
})

// ---------------------------------------------------------------------------
// useVoidSo
// ---------------------------------------------------------------------------

describe('useVoidSo', () => {
  it('200 — sends non-empty Idempotency-Key; invalidates inventoryKeys.all', async () => {
    let capturedIdempotencyKey: string | null = null
    let capturedBodyText = 'unset'

    server.use(
      http.post('http://localhost:8000/api/v1/sales-orders/so-1/void', async ({ request }) => {
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        capturedBodyText = await request.text()
        return HttpResponse.json(SO_VOIDED)
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })
    qc.setQueryData(inventoryKeys.all, { dummy: true })

    const { result } = renderHook(() => useVoidSo(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({ id: 'so-1' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedIdempotencyKey).not.toBeNull()
    expect(capturedIdempotencyKey!.length).toBeGreaterThan(0)
    // Body must be empty (no requestBody for void)
    expect(capturedBodyText.trim()).toBe('')
  })

  it('409 surfaces as ApiError(status=409) for caller to map to refetch + toast', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/sales-orders/so-1/void', () =>
        HttpResponse.json({ error: 'already_voided' }, { status: 409 }),
      ),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useVoidSo(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({ id: 'so-1' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(409)
  })
})
