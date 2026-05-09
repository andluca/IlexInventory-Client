/**
 * src/data/financials/queries.ts
 *
 * TanStack Query hooks for financials read operations.
 *
 * useDashboard   — single useQuery for dashboard totals + top products
 * useMarginList  — cursor useInfiniteQuery for per-product margin rows
 *
 * Note: SPEC §3.7 + endpoints.md:91 describe /financials/margin as offset-paginated,
 * but the regenerated schema (src/api/generated/schema.ts:1285-1314) accepts cursor + limit
 * and returns { items, next_cursor }. Schema is truth — implemented as cursor pagination.
 * SPEC + endpoints.md follow-up flagged in ILE-8 journal.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { financialsKeys } from './keys'
import type { components } from '@/api/generated/schema'

// ---------------------------------------------------------------------------
// Re-exported type aliases so feature files don't import from api/generated
// (Gate 4: no generated-client imports from features/routes)
// ---------------------------------------------------------------------------

export type DashboardResponse = components['schemas']['DashboardResponse']
export type DashboardTotalsResponse = components['schemas']['DashboardTotalsResponse']
export type MarginListResponse = components['schemas']['MarginListResponse']
export type MarginRowResponse = components['schemas']['MarginRowResponse']

// ---------------------------------------------------------------------------
// useDashboard
// ---------------------------------------------------------------------------

export interface DashboardParams {
  from?: string
  to?: string
  top?: number
}

export function useDashboard(
  params: DashboardParams,
): UseQueryResult<DashboardResponse, ApiError> {
  const { from, to, top } = params

  return useQuery<DashboardResponse, ApiError>({
    queryKey: financialsKeys.dashboard({ from, to, top }),
    queryFn: async () => {
      // Drop undefined values — exactOptionalPropertyTypes discipline
      const query: {
        from?: string
        to?: string
        top?: number
      } = {}
      if (from) query.from = from
      if (to) query.to = to
      if (top !== undefined) query.top = top

      const { data } = await apiClient.GET('/api/v1/financials/dashboard', {
        params: { query },
      })
      return data as DashboardResponse
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

// ---------------------------------------------------------------------------
// useMarginList
// ---------------------------------------------------------------------------

export interface MarginListParams {
  from?: string
  to?: string
  limit?: number
}

export function useMarginList(
  params: MarginListParams,
): UseInfiniteQueryResult<InfiniteData<MarginListResponse>, ApiError> {
  const { from, to, limit } = params

  return useInfiniteQuery<
    MarginListResponse,
    ApiError,
    InfiniteData<MarginListResponse>
  >({
    queryKey: financialsKeys.marginList({ from, to, limit }),
    queryFn: async ({ pageParam }) => {
      // Drop undefined values — exactOptionalPropertyTypes discipline
      const query: {
        from?: string
        to?: string
        limit?: number
        cursor?: string
      } = {}
      if (from) query.from = from
      if (to) query.to = to
      if (limit !== undefined) query.limit = limit
      if (pageParam) query.cursor = pageParam as string

      const { data } = await apiClient.GET('/api/v1/financials/margin', {
        params: { query },
      })
      return data as MarginListResponse
    },
    initialPageParam: undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 30_000,
  })
}
