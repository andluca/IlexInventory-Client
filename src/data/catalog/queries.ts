/**
 * src/data/catalog/queries.ts
 *
 * TanStack Query hooks for catalog (products) read operations.
 */

import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { catalogKeys } from './keys'
import type { components } from '@/api/generated/schema'

export type ProductListResponse = components['schemas']['ProductListResponse']
export type ProductResponse = components['schemas']['ProductResponse']

// ---------------------------------------------------------------------------
// useProductsList
// ---------------------------------------------------------------------------

export interface ProductsListParams {
  search?: string
  archived?: boolean
  page?: number
  limit?: number
}

export function useProductsList(
  params: ProductsListParams = {},
): UseQueryResult<ProductListResponse, ApiError> {
  const { search, archived, page = 1, limit = 50 } = params

  return useQuery<ProductListResponse, ApiError>({
    queryKey: catalogKeys.list({ search, archived, page, limit }),
    queryFn: async () => {
      const query: {
        search?: string
        archived?: boolean
        limit?: number
        offset?: number
      } = { limit, offset: (page - 1) * limit }
      if (search) query.search = search
      if (archived !== undefined) query.archived = archived

      const { data } = await apiClient.GET('/api/v1/products', {
        params: { query },
      })
      return data as ProductListResponse
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  })
}

// ---------------------------------------------------------------------------
// useProduct
// ---------------------------------------------------------------------------

export function useProduct(id: string): UseQueryResult<ProductResponse, ApiError> {
  return useQuery<ProductResponse, ApiError>({
    queryKey: catalogKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/products/{product_id}', {
        params: { path: { product_id: id } },
      })
      return data as ProductResponse
    },
    staleTime: 30_000,
    retry: (failureCount, error) => {
      // Don't retry on 404 — masked cross-owner case per BE-D4
      if (ApiError.is(error) && error.status === 404) return false
      return failureCount < 3
    },
  })
}
