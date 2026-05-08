/**
 * src/data/catalog/mutations.ts
 *
 * TanStack Query mutation hooks for catalog (products) write operations.
 *
 * NOTE: POST /products/import ships requestBody?: never in the generated schema.
 * We cast `body as never` at the call site — same contained-cast pattern as auth.
 * BE follow-up: express the multipart schema in OpenAPI so this cast is removable.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { apiClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { catalogKeys } from './keys'
import type { components } from '@/api/generated/schema'

export type ProductCreateRequest = components['schemas']['ProductCreateRequest']
export type ProductResponse = components['schemas']['ProductResponse']
export type ProductImportResponse = components['schemas']['ProductImportResponse']
export type FailedRowResponse = components['schemas']['FailedRowResponse']

// ---------------------------------------------------------------------------
// useCreateProduct
// ---------------------------------------------------------------------------

export function useCreateProduct(): UseMutationResult<ProductResponse, ApiError, ProductCreateRequest> {
  const queryClient = useQueryClient()

  return useMutation<ProductResponse, ApiError, ProductCreateRequest>({
    mutationFn: async ({ sku, name, description, base_unit }) => {
      const { data } = await apiClient.POST('/api/v1/products', {
        body: { sku, name, description: description ?? '', base_unit },
      })
      return data as ProductResponse
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.lists() })
      notifications.show({
        color: 'teal',
        title: 'Product created',
        message: 'The product has been created.',
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateProduct
// ---------------------------------------------------------------------------

export interface UpdateProductVars {
  id: string
  name?: string
  description?: string
}

export function useUpdateProduct(): UseMutationResult<ProductResponse, ApiError, UpdateProductVars> {
  const queryClient = useQueryClient()

  return useMutation<ProductResponse, ApiError, UpdateProductVars>({
    mutationFn: async ({ id, name, description }) => {
      const body: { name?: string; description?: string } = {}
      if (name !== undefined) body.name = name
      if (description !== undefined) body.description = description
      const { data } = await apiClient.PATCH('/api/v1/products/{product_id}', {
        params: { path: { product_id: id } },
        body,
      })
      return data as ProductResponse
    },
    onMutate: async ({ id, name, description }) => {
      // Cancel outstanding queries for this product
      await queryClient.cancelQueries({ queryKey: catalogKeys.detail(id) })

      // Snapshot the previous value
      const previous = queryClient.getQueryData<ProductResponse>(catalogKeys.detail(id))

      // Apply optimistic update
      if (previous) {
        queryClient.setQueryData<ProductResponse>(catalogKeys.detail(id), {
          ...previous,
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
        })
      }

      return { previous, id }
    },
    onError: (_error, { id }, context) => {
      // Roll back optimistic update
      const ctx = context as { previous?: ProductResponse; id: string } | undefined
      if (ctx?.previous) {
        queryClient.setQueryData<ProductResponse>(catalogKeys.detail(id), ctx.previous)
      }
    },
    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: catalogKeys.lists() })
    },
    onSuccess: () => {
      notifications.show({
        color: 'teal',
        title: 'Saved',
        message: 'Product updated.',
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useArchiveProduct
// ---------------------------------------------------------------------------

export interface ArchiveProductVars {
  id: string
}

export function useArchiveProduct(): UseMutationResult<ProductResponse, ApiError, ArchiveProductVars> {
  const queryClient = useQueryClient()

  return useMutation<ProductResponse, ApiError, ArchiveProductVars>({
    mutationFn: async ({ id }) => {
      const { data } = await apiClient.POST('/api/v1/products/{product_id}/archive', {
        params: { path: { product_id: id } },
      })
      return data as ProductResponse
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: catalogKeys.lists() })
    },
  })
}

// ---------------------------------------------------------------------------
// useDeleteProduct
// ---------------------------------------------------------------------------

export interface DeleteProductVars {
  id: string
}

export function useDeleteProduct(): UseMutationResult<void, ApiError, DeleteProductVars> {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, DeleteProductVars>({
    mutationFn: async ({ id }) => {
      await apiClient.DELETE('/api/v1/products/{product_id}', {
        params: { path: { product_id: id } },
      })
    },
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: catalogKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: catalogKeys.lists() })
    },
  })
}

// ---------------------------------------------------------------------------
// useImportProducts
// ---------------------------------------------------------------------------

export function useImportProducts(): UseMutationResult<ProductImportResponse, ApiError, FormData> {
  return useMutation<ProductImportResponse, ApiError, FormData>({
    mutationFn: async (formData) => {
      // requestBody?: never for /products/import in the generated schema.
      // We cast body as never — contained cast, same pattern as auth mutations.
      // The apiClient middleware attaches Idempotency-Key automatically
      // (ALWAYS_IDEMPOTENT_POST_PATHS includes '/api/v1/products/import').
      const { data } = await apiClient.POST('/api/v1/products/import', {
        body: formData as never,
      })
      return data as ProductImportResponse
    },
    retry: false,
  })
}
