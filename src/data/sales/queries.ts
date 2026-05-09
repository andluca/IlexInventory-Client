/**
 * src/data/sales/queries.ts
 *
 * TanStack Query hooks for sales orders read operations.
 *
 * useSosList  — cursor-paginated useInfiniteQuery (the only A3 page in v1 using cursor pagination)
 * useSo       — single SO detail
 * usePreviewSo — POST-as-query (non-mutating FEFO preview)
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { salesKeys } from './keys'
import type { components } from '@/api/generated/schema'

export type SalesOrderResponse = components['schemas']['SalesOrderResponse']
export type SalesOrderListResponse = components['schemas']['SalesOrderListResponse']
export type SalesOrderPreviewResponse = components['schemas']['SalesOrderPreviewResponse']
export type AllocationResponse = components['schemas']['AllocationResponse']

// ---------------------------------------------------------------------------
// useSosList
// ---------------------------------------------------------------------------

export interface SosListParams {
  status?: 'draft' | 'committed' | 'voided'
  voided?: boolean
  search?: string
  from?: string
  to?: string
}

export function useSosList(
  params: SosListParams = {},
): UseInfiniteQueryResult<InfiniteData<SalesOrderListResponse>, ApiError> {
  const { status, voided, search, from, to } = params

  return useInfiniteQuery<
    SalesOrderListResponse,
    ApiError,
    InfiniteData<SalesOrderListResponse>
  >({
    queryKey: salesKeys.list({ status, voided, search, from, to }),
    queryFn: async ({ pageParam }) => {
      const query: {
        status?: 'draft' | 'committed' | 'voided'
        voided?: boolean
        search?: string
        from?: string
        to?: string
        cursor?: string
      } = {}
      if (status) query.status = status
      if (voided !== undefined) query.voided = voided
      if (search) query.search = search
      if (from) query.from = from
      if (to) query.to = to
      if (pageParam) query.cursor = pageParam as string

      const { data } = await apiClient.GET('/api/v1/sales-orders', {
        params: { query },
      })
      return data as SalesOrderListResponse
    },
    initialPageParam: undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 10_000,
  })
}

// ---------------------------------------------------------------------------
// useSo
// ---------------------------------------------------------------------------

export function useSo(id: string): UseQueryResult<SalesOrderResponse, ApiError> {
  return useQuery<SalesOrderResponse, ApiError>({
    queryKey: salesKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/sales-orders/{so_id}', {
        params: { path: { so_id: id } },
      })
      return data as SalesOrderResponse
    },
    staleTime: 30_000,
    retry: (failureCount, error) => {
      if (ApiError.is(error) && error.status === 404) return false
      return failureCount < 3
    },
  })
}

// ---------------------------------------------------------------------------
// usePreviewSo
//
// Judgment call (ILE-7 Notes): Preview is a POST endpoint, but it is non-mutating
// (BE walks FEFO without writing). Implemented as useQuery with a POST queryFn so
// that TanStack Query's caching + invalidate-on-form-change semantics work cleanly.
// Idempotency-Key is NOT attached — /preview is not in ALWAYS_IDEMPOTENT_POST_PATHS.
// ---------------------------------------------------------------------------

export function usePreviewSo(
  id: string,
  options?: { enabled?: boolean },
): UseQueryResult<SalesOrderPreviewResponse, ApiError> {
  return useQuery<SalesOrderPreviewResponse, ApiError>({
    queryKey: salesKeys.preview(id),
    queryFn: async () => {
      const { data } = await apiClient.POST('/api/v1/sales-orders/{so_id}/preview', {
        params: { path: { so_id: id } },
      })
      return data as SalesOrderPreviewResponse
    },
    enabled: options?.enabled ?? true,
    staleTime: 0,
    retry: false,
  })
}
