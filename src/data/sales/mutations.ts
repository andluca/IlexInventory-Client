/**
 * src/data/sales/mutations.ts
 *
 * TanStack Query mutation hooks for sales orders write operations.
 *
 * Notes:
 * - No optimistic updates on commit/void — both are terminal multi-row writes the
 *   client cannot honestly mirror (SPEC §2.5 + ILE-7 Notes).
 * - Idempotency-Key is auto-attached by apiClient middleware on:
 *     POST /api/v1/sales-orders/{id}/commit   — always (ALWAYS_IDEMPOTENT_POST_PATHS)
 *     POST /api/v1/sales-orders/{id}/void     — always (ALWAYS_IDEMPOTENT_POST_PATHS)
 *   Draft create/PATCH/DELETE/preview are NOT in the seven-endpoint list.
 * - retry: false on all terminal mutations (commit, void).
 * - Caller maps 409 to refetch + toast per SPEC §2.5.
 * - Caller maps 422 shortfall on commit to inline ShortfallBanner.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { salesKeys } from './keys'
import { inventoryKeys } from '@/data/inventory/keys'
import type { components } from '@/api/generated/schema'

export type SalesOrderResponse = components['schemas']['SalesOrderResponse']
export type SalesOrderCreateRequest = components['schemas']['SalesOrderCreateRequestRequest']
export type SalesOrderLineCreateRequest = components['schemas']['SalesOrderLineRequestRequest']

// ---------------------------------------------------------------------------
// useCreateSo
// ---------------------------------------------------------------------------

export function useCreateSo(): UseMutationResult<
  SalesOrderResponse,
  ApiError,
  SalesOrderCreateRequest
> {
  const queryClient = useQueryClient()

  return useMutation<SalesOrderResponse, ApiError, SalesOrderCreateRequest>({
    mutationFn: async (body) => {
      const { data } = await apiClient.POST('/api/v1/sales-orders', { body })
      return data as SalesOrderResponse
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
    },
    // Caller handles navigation to /:id/edit
    // No Idempotency-Key — draft create is not in the seven-endpoint list (SPEC §2.5)
  })
}

// ---------------------------------------------------------------------------
// useUpdateSo
// ---------------------------------------------------------------------------

export interface UpdateSoVars {
  id: string
  customer_name?: string
  customer_contact?: string | null
  lines?: SalesOrderLineCreateRequest[]
}

export function useUpdateSo(): UseMutationResult<SalesOrderResponse, ApiError, UpdateSoVars> {
  const queryClient = useQueryClient()

  return useMutation<SalesOrderResponse, ApiError, UpdateSoVars>({
    mutationFn: async ({ id, ...body }) => {
      const { data } = await apiClient.PATCH('/api/v1/sales-orders/{so_id}', {
        params: { path: { so_id: id } },
        body,
      })
      return data as SalesOrderResponse
    },
    // No optimistic update — multi-row replace-style (SPEC §2.5)
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: salesKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: salesKeys.preview(id) })
    },
    // Caller maps 409 to refetch + toast
  })
}

// ---------------------------------------------------------------------------
// useDeleteSo
// ---------------------------------------------------------------------------

export interface DeleteSoVars {
  id: string
}

export function useDeleteSo(): UseMutationResult<void, ApiError, DeleteSoVars> {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, DeleteSoVars>({
    mutationFn: async ({ id }) => {
      await apiClient.DELETE('/api/v1/sales-orders/{so_id}', {
        params: { path: { so_id: id } },
      })
    },
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: salesKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
    },
    // Caller maps 409 (already committed) → refetch + toast
  })
}

// ---------------------------------------------------------------------------
// useCommitSo
// ---------------------------------------------------------------------------

export interface AllocationOverride {
  sales_order_line_id: string
  batch_id: string
  quantity: string
}

export interface CommitSoVars {
  id: string
  allocations?: AllocationOverride[] | undefined
}

export function useCommitSo(): UseMutationResult<SalesOrderResponse, ApiError, CommitSoVars> {
  const queryClient = useQueryClient()

  return useMutation<SalesOrderResponse, ApiError, CommitSoVars>({
    mutationFn: async ({ id, allocations }) => {
      const body = allocations
        ? {
            allocations: allocations.map((a) => ({
              line_id: a.sales_order_line_id,
              batch_id: a.batch_id,
              quantity: Number(a.quantity),
            })),
          }
        : {}
      const { data } = await apiClient.POST('/api/v1/sales-orders/{so_id}/commit', {
        params: { path: { so_id: id } },
        body,
      })
      return data as SalesOrderResponse
    },
    retry: false, // terminal mutation — user retries manually
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: salesKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.all })
      // Commit moves stock — affects every batches/movements view
    },
    // Caller maps 422 shortfall → ShortfallBanner inline
    // Caller maps 409 → refetch + toast
  })
}

// ---------------------------------------------------------------------------
// useVoidSo
// ---------------------------------------------------------------------------

export interface VoidSoVars {
  id: string
}

export function useVoidSo(): UseMutationResult<SalesOrderResponse, ApiError, VoidSoVars> {
  const queryClient = useQueryClient()

  return useMutation<SalesOrderResponse, ApiError, VoidSoVars>({
    mutationFn: async ({ id }) => {
      const { data } = await apiClient.POST('/api/v1/sales-orders/{so_id}/void', {
        params: { path: { so_id: id } },
      })
      return data as SalesOrderResponse
    },
    retry: false, // terminal mutation
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: salesKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.all })
      // Void writes reversal movements — affects every batches/movements view
    },
    // Caller maps 409 → refetch + toast
  })
}
