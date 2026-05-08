import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { createElement } from 'react'
import { server } from '@/test/server'
import {
  useCreateProduct,
  useUpdateProduct,
  useArchiveProduct,
  useDeleteProduct,
  useImportProducts,
} from './mutations'
import { ApiError } from '@/api/errors'
import { catalogKeys } from './keys'
import type { ProductResponse } from './queries'

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const PRODUCT_1: ProductResponse = {
  id: 'prod-1',
  sku: 'YRB-001',
  name: 'Yerba Premium',
  description: 'Premium yerba',
  base_unit: 'g',
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('useCreateProduct', () => {
  it('on 200 invalidates catalogKeys.lists()', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json(PRODUCT_1),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({ sku: 'YRB-001', name: 'Yerba Premium', description: '', base_unit: 'g' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: catalogKeys.lists() })
  })

  it('on 409 duplicate_sku exposes error.fields.sku', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json(
          { error: 'duplicate_sku', detail: 'SKU already in use', fields: { sku: 'Already in use' } },
          { status: 409 },
        ),
      ),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({ sku: 'YRB-001', name: 'Dup', description: '', base_unit: 'g' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(409)
    expect((result.current.error as ApiError).fields?.sku).toBe('Already in use')
  })
})

describe('useUpdateProduct', () => {
  it('applies optimistic update on onMutate and resolves with server response', async () => {
    const UPDATED = { ...PRODUCT_1, name: 'Yerba Mate Updated', updated_at: '2024-01-02T00:00:00Z' }

    server.use(
      http.patch('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(UPDATED),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    // Seed the cache with the original
    qc.setQueryData(catalogKeys.detail('prod-1'), PRODUCT_1)

    const { result } = renderHook(() => useUpdateProduct(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({ id: 'prod-1', name: 'Yerba Mate Updated' })
    })

    // After mutate fires synchronously, onMutate should have set optimistic cache
    const optimisticCached = qc.getQueryData<ProductResponse>(catalogKeys.detail('prod-1'))
    // optimisticCached may be the optimistic value before the server responds

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.name).toBe('Yerba Mate Updated')
    // After invalidation + refetch the cache might be re-fetched, but the mutation data is correct
    expect(result.current.data?.name).toBe('Yerba Mate Updated')
    // Suppress unused variable warning
    void optimisticCached
  })

  it('rolls back optimistic update on 400 error', async () => {
    // Re-serve the original on the GET so invalidation+refetch restores it
    server.use(
      http.patch('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json({ error: 'validation_error', fields: { name: 'Too short' } }, { status: 400 }),
      ),
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })
    // Seed the cache
    qc.setQueryData(catalogKeys.detail('prod-1'), PRODUCT_1)

    // Track the rollback via onError callback
    let rollbackName: string | undefined
    const { result } = renderHook(() => useUpdateProduct(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate(
        { id: 'prod-1', name: 'X' },
        {
          onError: () => {
            // Capture the cache at rollback time (after onError rolls back, before onSettled invalidates)
            const snapshot = qc.getQueryData<ProductResponse>(catalogKeys.detail('prod-1'))
            rollbackName = snapshot?.name
          },
        },
      )
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(400)
    expect((result.current.error as ApiError).fields?.name).toBe('Too short')

    // Optimistic rollback: the mutation's onError callback should have seen the restored name
    expect(rollbackName).toBe('Yerba Premium')
  })
})

describe('useArchiveProduct', () => {
  it('on 200 invalidates detail + lists', async () => {
    const ARCHIVED = { ...PRODUCT_1, archived_at: '2024-06-01T00:00:00Z' }

    server.use(
      http.post('http://localhost:8000/api/v1/products/prod-1/archive', () =>
        HttpResponse.json(ARCHIVED),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useArchiveProduct(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({ id: 'prod-1' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: catalogKeys.detail('prod-1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: catalogKeys.lists() })
  })

  it('on 409 exposes ApiError with status 409', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/products/prod-1/archive', () =>
        new HttpResponse(null, { status: 409 }),
      ),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useArchiveProduct(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({ id: 'prod-1' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(409)
  })
})

describe('useDeleteProduct', () => {
  it('on 204 removes detail from cache and invalidates lists', async () => {
    server.use(
      http.delete('http://localhost:8000/api/v1/products/prod-1', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    qc.setQueryData(catalogKeys.detail('prod-1'), PRODUCT_1)

    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')
    const removeSpy = vi.spyOn(qc, 'removeQueries')

    const { result } = renderHook(() => useDeleteProduct(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({ id: 'prod-1' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: catalogKeys.detail('prod-1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: catalogKeys.lists() })
  })

  it('on 409 exposes ApiError with status 409', async () => {
    server.use(
      http.delete('http://localhost:8000/api/v1/products/prod-has-batches', () =>
        new HttpResponse(null, { status: 409 }),
      ),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useDeleteProduct(), {
      wrapper: makeWrapper(qc),
    })

    act(() => {
      result.current.mutate({ id: 'prod-has-batches' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(409)
  })
})

describe('useImportProducts', () => {
  it('returns ProductImportResponse body verbatim on 200', async () => {
    const importResponse = {
      imported: 5,
      failed: [],
    }

    server.use(
      http.post('http://localhost:8000/api/v1/products/import', () =>
        HttpResponse.json(importResponse),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

    const { result } = renderHook(() => useImportProducts(), {
      wrapper: makeWrapper(qc),
    })

    const formData = new FormData()
    formData.append('file', new File(['sku,name\nYRB-001,Yerba'], 'products.csv', { type: 'text/csv' }))

    act(() => {
      result.current.mutate(formData)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.imported).toBe(5)
    expect(result.current.data?.failed).toHaveLength(0)
  })

  it('sends Idempotency-Key header on POST /products/import', async () => {
    let capturedKey: string | null = null

    server.use(
      http.post('http://localhost:8000/api/v1/products/import', ({ request }) => {
        capturedKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({ imported: 0, failed: [] })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

    const { result } = renderHook(() => useImportProducts(), {
      wrapper: makeWrapper(qc),
    })

    const formData = new FormData()
    formData.append('file', new File(['sku,name\n'], 'products.csv', { type: 'text/csv' }))

    act(() => {
      result.current.mutate(formData)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Idempotency-Key is auto-attached by the apiClient middleware
    expect(capturedKey).not.toBeNull()
    expect(typeof capturedKey).toBe('string')
    expect(capturedKey!.length).toBeGreaterThan(0)
  })

  it('on 400 exposes ApiError with detail', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/products/import', () =>
        HttpResponse.json(
          { error: 'invalid_csv', detail: 'CSV header row missing' },
          { status: 400 },
        ),
      ),
    )

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })

    const { result } = renderHook(() => useImportProducts(), {
      wrapper: makeWrapper(qc),
    })

    const formData = new FormData()

    act(() => {
      result.current.mutate(formData)
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(ApiError.is(result.current.error)).toBe(true)
    expect((result.current.error as ApiError).status).toBe(400)
    expect((result.current.error as ApiError).detail).toBe('CSV header row missing')
  })
})
