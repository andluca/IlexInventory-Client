/**
 * src/data/inventory/queries.ts
 *
 * TanStack Query hooks for inventory (movements + batches) read operations.
 *
 * useMovements — cursor-paginated useInfiniteQuery for the movement audit log.
 * useBatchesByProduct — existence helper for the archive-vs-delete branching
 *   on the product detail page. ILE-6 will extend this file with a full
 *   batches list hook; v1 just needs total > 0.
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
}

export function useBatchesByProduct(
  productId: string,
  opts: BatchesByProductOpts = {},
): UseQueryResult<BatchListResponse, ApiError> {
  const { limit = 1 } = opts

  return useQuery<BatchListResponse, ApiError>({
    queryKey: inventoryKeys.batchesByProduct(productId, { limit }),
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
