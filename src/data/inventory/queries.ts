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

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { inventoryKeys } from './keys'
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
