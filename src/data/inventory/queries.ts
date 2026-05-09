/**
 * src/data/inventory/queries.ts
 *
 * TanStack Query hooks for inventory (movements + batches) read operations.
 *
 * useMovements — cursor-paginated useInfiniteQuery for the movement audit log.
 * useBatchesByProduct — existence helper for the archive-vs-delete branching
 *   on the product detail page.
 * useBatch — single batch detail (ILE-6).
 * useBatchesList — paginated list with filters (ILE-6).
 */

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { inventoryKeys } from './keys'
import { procurementKeys } from '@/data/procurement/keys'
import type { components } from '@/api/generated/schema'

export type MovementListResponse = components['schemas']['MovementListResponse']
export type BatchListResponse = components['schemas']['BatchListResponse']
export type BatchResponse = components['schemas']['BatchResponse']
export type RecallReportResponse = components['schemas']['RecallReportResponse']
export type RecallReportItemResponse = components['schemas']['RecallReportItemResponse']

// ---------------------------------------------------------------------------
// useMovements
// ---------------------------------------------------------------------------

export interface MovementsParams {
  product_id?: string
  batch_id?: string
  from?: string
  to?: string
  kind?: string
}

export function useMovements(
  params: MovementsParams = {},
): UseInfiniteQueryResult<InfiniteData<MovementListResponse>, ApiError> {
  const { product_id, batch_id, from, to, kind } = params

  return useInfiniteQuery<MovementListResponse, ApiError, InfiniteData<MovementListResponse>>({
    queryKey: inventoryKeys.movements({ product_id, batch_id, from, to, kind }),
    queryFn: async ({ pageParam }) => {
      // Build query params — omit undefined to satisfy exactOptionalPropertyTypes
      const query: {
        product_id?: string
        batch_id?: string
        from?: string
        to?: string
        kind?: string
        cursor?: string
      } = {}
      if (product_id) query.product_id = product_id
      if (batch_id) query.batch_id = batch_id
      if (from) query.from = from
      if (to) query.to = to
      if (kind) query.kind = kind
      if (pageParam) query.cursor = pageParam as string

      const { data } = await apiClient.GET('/api/v1/movements', {
        params: { query },
      })
      return data as MovementListResponse
    },
    initialPageParam: undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 10_000,
  })
}

// ---------------------------------------------------------------------------
// useBatchesByProduct
// ---------------------------------------------------------------------------

export interface BatchesByProductOpts {
  limit?: number
  enabled?: boolean
}

export function useBatchesByProduct(
  productId: string,
  opts: BatchesByProductOpts = {},
): UseQueryResult<BatchListResponse, ApiError> {
  const { limit = 1, enabled = true } = opts

  return useQuery<BatchListResponse, ApiError>({
    queryKey: inventoryKeys.batchesByProduct(productId, { limit }),
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/batches', {
        params: {
          query: {
            product_id: productId,
            limit,
            offset: 0,
          },
        },
      })
      return data as BatchListResponse
    },
    staleTime: 30_000,
  })
}

// ---------------------------------------------------------------------------
// useBatch
// ---------------------------------------------------------------------------

export function useBatch(id: string): UseQueryResult<BatchResponse, ApiError> {
  return useQuery<BatchResponse, ApiError>({
    queryKey: inventoryKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/batches/{batch_id}', {
        params: { path: { batch_id: id } },
      })
      return data as BatchResponse
    },
    staleTime: 30_000,
    retry: (failureCount, error) => {
      if (ApiError.is(error) && error.status === 404) return false
      return failureCount < 3
    },
  })
}

// ---------------------------------------------------------------------------
// useBatchesList
// ---------------------------------------------------------------------------

export interface BatchesListParams {
  product_id?: string
  is_recalled?: boolean
  expiring_within?: number
  page?: number
  limit?: number
}

export function useBatchesList(
  params: BatchesListParams = {},
): UseQueryResult<BatchListResponse, ApiError> {
  const { product_id, is_recalled, expiring_within, page = 1, limit = 50 } = params

  return useQuery<BatchListResponse, ApiError>({
    queryKey: inventoryKeys.list({ product_id, is_recalled, expiring_within, page, limit }),
    queryFn: async () => {
      const query: {
        product_id?: string
        is_recalled?: boolean
        expiring_within?: number
        limit?: number
        offset?: number
      } = { limit, offset: (page - 1) * limit }
      if (product_id !== undefined) query.product_id = product_id
      if (is_recalled !== undefined) query.is_recalled = is_recalled
      if (expiring_within !== undefined) query.expiring_within = expiring_within

      const { data } = await apiClient.GET('/api/v1/batches', {
        params: { query },
      })
      return data as BatchListResponse
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  })
}

// ---------------------------------------------------------------------------
// useBatchesByPoId
// ---------------------------------------------------------------------------
//
// Fan-out workaround: GET /batches doesn't accept ?purchase_order_id=.
// Strategy: read the cached PO (via procurementKeys.detail(poId)) for its
// line list, unique the product_ids, fan-out GET /batches?product_id=X per
// product, then filter the union by purchase_order_line_id ∈ po.lines[].id.
//
// BE follow-up: add ?purchase_order_id= to GET /batches — makes this a
// one-line client change (noted in ILE-5 journal).

export type PurchaseOrderResponse = components['schemas']['PurchaseOrderResponse']

export function useBatchesByPoId(poId: string): UseQueryResult<BatchListResponse, ApiError> {
  const queryClient = useQueryClient()

  return useQuery<BatchListResponse, ApiError>({
    queryKey: inventoryKeys.batchesByPo(poId),
    queryFn: async () => {
      // Read the PO from cache — it's always seeded by the time we render this hook
      const po = queryClient.getQueryData<PurchaseOrderResponse>(procurementKeys.detail(poId))

      if (!po || po.lines.length === 0) {
        return { items: [], total: 0, limit: 200, offset: 0 }
      }

      // Collect the line IDs and unique product IDs
      const lineIds = new Set(po.lines.map((l) => l.id))
      const uniqueProductIds = [...new Set(po.lines.map((l) => l.product_id))]

      // Fan-out: one request per unique product
      const responses = await Promise.all(
        uniqueProductIds.map(async (productId) => {
          const { data } = await apiClient.GET('/api/v1/batches', {
            params: {
              query: {
                product_id: productId,
                limit: 200,
                offset: 0,
              },
            },
          })
          return (data as BatchListResponse).items
        }),
      )

      // Flatten and filter to only the batches linked to this PO's lines
      const allBatches = responses.flat()
      const linked = allBatches.filter(
        (b) => b.purchase_order_line_id !== null && lineIds.has(b.purchase_order_line_id),
      )

      return {
        items: linked,
        total: linked.length,
        limit: 200,
        offset: 0,
      }
    },
    staleTime: 30_000,
  })
}

// ---------------------------------------------------------------------------
// useRecallReport
// ---------------------------------------------------------------------------
//
// Offset-paginated query for the recall report of a batch.
// Endpoint: GET /batches/{batch_id}/recall-report
// staleTime: 0 — recall reports must reflect current allocations.

export interface RecallReportParams {
  page?: number
  limit?: number
}

export function useRecallReport(
  batchId: string,
  params: RecallReportParams = {},
): UseQueryResult<RecallReportResponse, ApiError> {
  const { page = 1, limit = 50 } = params
  const offset = (page - 1) * limit

  return useQuery<RecallReportResponse, ApiError>({
    queryKey: inventoryKeys.recallReport(batchId, { page, limit }),
    enabled: Boolean(batchId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/batches/{batch_id}/recall-report', {
        params: {
          path: { batch_id: batchId },
          query: { limit, offset },
        },
      })
      return data as RecallReportResponse
    },
    staleTime: 0,
  })
}
