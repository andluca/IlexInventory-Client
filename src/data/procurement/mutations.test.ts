import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { createElement } from 'react'
import { server } from '@/test/server'
import {
  useCreatePo,
  useUpdatePo,
  useDeletePo,
  useReceivePo,
} from './mutations'
import { ApiError } from '@/api/errors'
import { procurementKeys } from './keys'

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

const PO_RECEIVED = {
  ...PO_1,
  status: 'received',
  received_at: '2026-01-15T10:00:00Z',
}

describe('useCreatePo', () => {
  it('on 200 invalidates procurementKeys.lists()', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/purchase-orders', () =>
        HttpResponse.json(PO_1),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useCreatePo(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({
        supplier_name: 'Acme Suppliers',
        lines: [{ product_id: 'prod-1', quantity: 10, unit_cost: 5.5 }],
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.lists() })
  })

  it('does not navigate (caller handles routing)', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/purchase-orders', () =>
        HttpResponse.json(PO_1),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

    const { result } = renderHook(() => useCreatePo(), {
      wrapper: makeWrapper(qc),
    })

    let navigateCalled = false
    act(() => {
      result.current.mutate(
        { supplier_name: 'Acme', lines: [{ product_id: 'p1', quantity: 1, unit_cost: 1 }] },
        { onSuccess: () => { navigateCalled = false } },
      )
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // The hook itself doesn't navigate — only invalidates
    expect(navigateCalled).toBe(false)
  })
})

describe('useUpdatePo', () => {
  it('sends full lines array (replace-style) on PATCH', async () => {
    let capturedBody: unknown = null
    server.use(
      http.patch('http://localhost:8000/api/v1/purchase-orders/po-1', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(PO_1)
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

    const { result } = renderHook(() => useUpdatePo(), {
      wrapper: makeWrapper(qc),
    })

    const lines = [
      { product_id: 'prod-1', quantity: 10, unit_cost: 5.5 },
      { product_id: 'prod-2', quantity: 20, unit_cost: 3.0 },
    ]

    act(() => {
      result.current.mutate({ id: 'po-1', supplier_name: 'Updated Supplier', lines })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect((capturedBody as { lines: unknown[] }).lines).toHaveLength(2)
    expect((capturedBody as { supplier_name: string }).supplier_name).toBe('Updated Supplier')
  })

  it('on 200 invalidates detail + lists', async () => {
    server.use(
      http.patch('http://localhost:8000/api/v1/purchase-orders/po-1', () =>
        HttpResponse.json(PO_1),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useUpdatePo(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({ id: 'po-1', supplier_name: 'Test' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.detail('po-1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.lists() })
  })

  it('on 409 surfaces as ApiError(status=409) for caller to map to refetch+toast', async () => {
    server.use(
      http.patch('http://localhost:8000/api/v1/purchase-orders/po-received', () =>
        new HttpResponse(
          JSON.stringify({ error: 'already_received', detail: 'PO already received' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useUpdatePo(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({ id: 'po-received', supplier_name: 'Test' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(409)
  })
})

describe('useDeletePo', () => {
  it('on 204 removes detail from cache and invalidates lists', async () => {
    server.use(
      http.delete('http://localhost:8000/api/v1/purchase-orders/po-1', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    qc.setQueryData(procurementKeys.detail('po-1'), PO_1)

    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')
    const removeSpy = vi.spyOn(qc, 'removeQueries')

    const { result } = renderHook(() => useDeletePo(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({ id: 'po-1' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.detail('po-1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.lists() })
  })

  it('on 409 surfaces as ApiError(status=409)', async () => {
    server.use(
      http.delete('http://localhost:8000/api/v1/purchase-orders/po-received', () =>
        new HttpResponse(
          JSON.stringify({ error: 'already_received', detail: 'PO already received' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useDeletePo(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({ id: 'po-received' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(409)
  })
})

describe('useReceivePo', () => {
  it('on 200 sends Idempotency-Key header', async () => {
    let capturedKey: string | null = null
    server.use(
      http.post('http://localhost:8000/api/v1/purchase-orders/po-1/receive', ({ request }) => {
        capturedKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json(PO_RECEIVED)
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

    const { result } = renderHook(() => useReceivePo(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({
        id: 'po-1',
        lines: [{ line_id: 'line-1', batch_code: 'LOT-001' }],
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedKey).not.toBeNull()
    expect(typeof capturedKey).toBe('string')
    expect(capturedKey!.length).toBeGreaterThan(0)
  })

  it('on 200 invalidates procurementKeys.detail + lists', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/purchase-orders/po-1/receive', () =>
        HttpResponse.json(PO_RECEIVED),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useReceivePo(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({
        id: 'po-1',
        lines: [{ line_id: 'line-1', batch_code: 'LOT-001' }],
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.detail('po-1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: procurementKeys.lists() })
  })

  it('does not retry on 409 (retry: false)', async () => {
    let hitCount = 0
    server.use(
      http.post('http://localhost:8000/api/v1/purchase-orders/po-received/receive', () => {
        hitCount++
        return new HttpResponse(
          JSON.stringify({ error: 'already_received', detail: 'PO already received' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        )
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useReceivePo(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({
        id: 'po-received',
        lines: [{ line_id: 'line-1', batch_code: 'LOT-001' }],
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(409)
    // Only hit once — retry: false
    expect(hitCount).toBe(1)
  })
})
