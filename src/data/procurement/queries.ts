/**
 * src/data/procurement/queries.ts
 *
 * TanStack Query hooks for procurement (purchase orders) read operations.
 */

import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { procurementKeys } from './keys'
import type { components } from '@/api/generated/schema'

export type PurchaseOrderListResponse = components['schemas']['PurchaseOrderListResponse']
export type PurchaseOrderResponse = components['schemas']['PurchaseOrderResponse']

// ---------------------------------------------------------------------------
// usePosList
// ---------------------------------------------------------------------------

export interface PosListParams {
  status?: 'draft' | 'received'
  search?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export function usePosList(
  params: PosListParams = {},
): UseQueryResult<PurchaseOrderListResponse, ApiError> {
  const { status, search, from, to, page = 1, limit = 50 } = params

  return useQuery<PurchaseOrderListResponse, ApiError>({
    queryKey: procurementKeys.list({ status, search, from, to, page, limit }),
    queryFn: async () => {
      const query: {
        status?: string
        search?: string
        from?: string
        to?: string
        limit?: number
        offset?: number
      } = { limit, offset: (page - 1) * limit }
      if (status) query.status = status
      if (search) query.search = search
      if (from) query.from = from
      if (to) query.to = to

      const { data } = await apiClient.GET('/api/v1/purchase-orders', {
        params: { query },
      })
      return data as PurchaseOrderListResponse
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  })
}

// ---------------------------------------------------------------------------
// usePo
// ---------------------------------------------------------------------------

export function usePo(id: string): UseQueryResult<PurchaseOrderResponse, ApiError> {
  return useQuery<PurchaseOrderResponse, ApiError>({
    queryKey: procurementKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/purchase-orders/{po_id}', {
        params: { path: { po_id: id } },
      })
      return data as PurchaseOrderResponse
    },
    staleTime: 30_000,
    retry: (failureCount, error) => {
      // Don't retry on 404 — masked cross-owner case per BE-D4
      if (ApiError.is(error) && error.status === 404) return false
      return failureCount < 3
    },
  })
}
