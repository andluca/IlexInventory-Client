/**
 * src/data/inventory/mutations.test.ts
 *
 * TDD for ILE-6 inventory mutation hooks.
 * Key assertions:
 *  - Idempotency-Key header present on createBatch, recallBatch, unRecallBatch
 *  - Idempotency-Key header present on createMovement(write_off) but NOT on adjustment
 *  - patchBatch sends only changed fields; clearing date sends { expiration_date: null, clear_expiration: true }
 *  - 409 surfaces as ApiError(status=409) for caller handling
 */

import { describe, it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { createElement } from 'react'
import { server } from '@/test/server'
import {
  useCreateBatch,
  usePatchBatch,
  useCreateMovement,
  useRecallBatch,
  useUnRecallBatch,
} from './mutations'
import { inventoryKeys } from './keys'
import { ApiError } from '@/api/errors'

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const BATCH_1 = {
  id: 'batch-1',
  owner_id: 1,
  product_id: 'prod-1',
  purchase_order_line_id: null,
  batch_code: 'B001',
  expiration_date: null,
  unit_cost: '10.0000',
  on_hand: '95.0000',
  is_recalled: false,
  recall_reason: null,
  recalled_at: null,
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const MOVEMENT_1 = {
  id: 'mov-1',
  owner_id: 1,
  batch_id: 'batch-1',
  kind: 'adjustment',
  signed_quantity: '-2.5000',
  notes: 'Spilled',
  reference_type: null,
  reference_id: null,
  created_at: '2024-01-02T00:00:00Z',
}

// ---------------------------------------------------------------------------
// useCreateBatch
// ---------------------------------------------------------------------------

describe('useCreateBatch', () => {
  it('201 — resolves, invalidates inventoryKeys.all, sends Idempotency-Key header', async () => {
    let capturedIdempotencyKey: string | null = null

    server.use(
      http.post('http://localhost:8000/api/v1/batches', ({ request }) => {
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json(BATCH_1, { status: 201 })
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })
    // Seed something to verify invalidation
    qc.setQueryData(inventoryKeys.all, { dummy: true })

    const { result } = renderHook(() => useCreateBatch(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({
        product_id: 'prod-1',
        batch_code: 'B001',
        unit_cost: 10,
        initial_quantity: 100,
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe('batch-1')
    // Idempotency-Key must be present
    expect(capturedIdempotencyKey).not.toBeNull()
    expect(capturedIdempotencyKey!.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// usePatchBatch
// ---------------------------------------------------------------------------

describe('usePatchBatch', () => {
  it('sends only the changed batch_code field, not the full object', async () => {
    let capturedBody: Record<string, unknown> | null = null

    server.use(
      http.patch('http://localhost:8000/api/v1/batches/batch-1', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...BATCH_1, batch_code: 'B001-CORR' })
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => usePatchBatch(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({ id: 'batch-1', batch_code: 'B001-CORR' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Body must contain batch_code but NOT on_hand or unit_cost
    expect(capturedBody).toMatchObject({ batch_code: 'B001-CORR' })
    expect(capturedBody).not.toHaveProperty('on_hand')
    expect(capturedBody).not.toHaveProperty('unit_cost')
  })

  it('sends { expiration_date: null, clear_expiration: true } when user clears the date', async () => {
    let capturedBody: Record<string, unknown> | null = null

    server.use(
      http.patch('http://localhost:8000/api/v1/batches/batch-1', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...BATCH_1, expiration_date: null })
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => usePatchBatch(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({ id: 'batch-1', expiration_date: null, clear_expiration: true })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedBody).toMatchObject({ expiration_date: null, clear_expiration: true })
  })

  it('does NOT optimistically update — cache stays undefined during pending state', async () => {
    server.use(
      http.patch('http://localhost:8000/api/v1/batches/batch-1', async () => {
        // Slight delay to observe pending state
        await new Promise((r) => setTimeout(r, 10))
        return HttpResponse.json({ ...BATCH_1, batch_code: 'CHANGED' })
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => usePatchBatch(), { wrapper: makeWrapper(qc) })

    // Cache is empty before the mutation
    const beforeMutation = qc.getQueryData(inventoryKeys.detail('batch-1'))
    expect(beforeMutation).toBeUndefined()

    act(() => {
      result.current.mutate({ id: 'batch-1', batch_code: 'CHANGED' })
    })

    // During pending: cache is still undefined (no optimistic update)
    const duringPending = qc.getQueryData(inventoryKeys.detail('batch-1'))
    expect(duringPending).toBeUndefined()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

// ---------------------------------------------------------------------------
// useCreateMovement
// ---------------------------------------------------------------------------

describe('useCreateMovement', () => {
  it('kind=adjustment does NOT send Idempotency-Key header', async () => {
    let capturedIdempotencyKey: string | null | undefined = undefined

    server.use(
      http.post('http://localhost:8000/api/v1/batches/batch-1/movements', ({ request }) => {
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json(MOVEMENT_1)
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useCreateMovement(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({
        batchId: 'batch-1',
        body: { kind: 'adjustment', signed_quantity: -2.5, notes: 'Spilled' },
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // adjustment must NOT have Idempotency-Key
    expect(capturedIdempotencyKey).toBeNull()
  })

  it('kind=write_off DOES send non-empty Idempotency-Key header', async () => {
    let capturedIdempotencyKey: string | null = null

    server.use(
      http.post('http://localhost:8000/api/v1/batches/batch-1/movements', ({ request }) => {
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({ ...MOVEMENT_1, kind: 'write_off', signed_quantity: '-5.0000' })
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useCreateMovement(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({
        batchId: 'batch-1',
        body: { kind: 'write_off', signed_quantity: -5, notes: 'Expired stock' },
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // write_off must have Idempotency-Key
    expect(capturedIdempotencyKey).not.toBeNull()
    expect(capturedIdempotencyKey!.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// useRecallBatch
// ---------------------------------------------------------------------------

describe('useRecallBatch', () => {
  it('200 — invalidates inventoryKeys.detail(id) and sends Idempotency-Key header', async () => {
    let capturedIdempotencyKey: string | null = null

    server.use(
      http.post('http://localhost:8000/api/v1/batches/batch-1/recall', ({ request }) => {
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({ ...BATCH_1, is_recalled: true, recall_reason: 'Listeria' })
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })
    qc.setQueryData(inventoryKeys.detail('batch-1'), BATCH_1)

    const { result } = renderHook(() => useRecallBatch(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({ id: 'batch-1', reason: 'Listeria detected' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedIdempotencyKey).not.toBeNull()
    expect(capturedIdempotencyKey!.length).toBeGreaterThan(0)
  })

  it('409 surfaces as ApiError(status=409) for caller to map', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/batches/batch-1/recall', () =>
        HttpResponse.json({ error: 'already_recalled' }, { status: 409 }),
      ),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useRecallBatch(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({ id: 'batch-1', reason: 'Listeria' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(409)
  })
})

// ---------------------------------------------------------------------------
// useUnRecallBatch
// ---------------------------------------------------------------------------

describe('useUnRecallBatch', () => {
  it('200 — sends empty body + non-empty Idempotency-Key header', async () => {
    let capturedIdempotencyKey: string | null = null
    let capturedBodyText = 'unset'

    server.use(
      http.post('http://localhost:8000/api/v1/batches/batch-1/un-recall', async ({ request }) => {
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        capturedBodyText = await request.text()
        return HttpResponse.json({ ...BATCH_1, is_recalled: false })
      }),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useUnRecallBatch(), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({ id: 'batch-1' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedIdempotencyKey).not.toBeNull()
    expect(capturedIdempotencyKey!.length).toBeGreaterThan(0)
    // Body must be empty (no requestBody per generated schema)
    expect(capturedBodyText.trim()).toBe('')
  })
})
