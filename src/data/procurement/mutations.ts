/**
 * src/data/procurement/mutations.ts
 *
 * TanStack Query mutation hooks for procurement (purchase orders) write operations.
 *
 * Notes:
 * - No optimistic updates on any PO mutation (SPEC §2.5):
 *   PATCH replaces the full lines array (multi-row, order-sensitive).
 *   Receive is a terminal mutation that atomically creates batches + movements.
 * - useReceivePo has retry: false — the user retries manually.
 *   Idempotency-Key is auto-attached by apiClient middleware.
 * - 409 on PATCH/DELETE/Receive surfaces as ApiError for the caller to map
 *   to refetch + toast "This PO has already been received elsewhere." per SPEC §2.5.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { procurementKeys } from './keys'
import { inventoryKeys } from '@/data/inventory/keys'
import type { components } from '@/api/generated/schema'

export type PurchaseOrderResponse = components['schemas']['PurchaseOrderResponse']
export type PurchaseOrderCreateRequest = components['schemas']['PurchaseOrderCreateRequestRequest']
export type LineCreateRequest = components['schemas']['LineCreateRequestRequest']
export type ReceiveLineRequest = components['schemas']['ReceiveLineRequestRequest']

// ---------------------------------------------------------------------------
// useCreatePo
// ---------------------------------------------------------------------------

export function useCreatePo(): UseMutationResult<PurchaseOrderResponse, ApiError, PurchaseOrderCreateRequest> {
  const queryClient = useQueryClient()

  return useMutation<PurchaseOrderResponse, ApiError, PurchaseOrderCreateRequest>({
    mutationFn: async (body) => {
      const { data } = await apiClient.POST('/api/v1/purchase-orders', { body })
      return data as PurchaseOrderResponse
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.lists() })
      // Caller handles navigation
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdatePo
// ---------------------------------------------------------------------------

export interface UpdatePoVars {
  id: string
  supplier_name?: string
  supplier_contact?: string | null
  lines?: LineCreateRequest[]
}

export function useUpdatePo(): UseMutationResult<PurchaseOrderResponse, ApiError, UpdatePoVars> {
  const queryClient = useQueryClient()

  return useMutation<PurchaseOrderResponse, ApiError, UpdatePoVars>({
    mutationFn: async ({ id, supplier_name, supplier_contact, lines }) => {
      const body: components['schemas']['PatchedPurchaseOrderUpdateRequestRequest'] = {}
      if (supplier_name !== undefined) body.supplier_name = supplier_name
      if (supplier_contact !== undefined) body.supplier_contact = supplier_contact
      if (lines !== undefined) body.lines = lines

      const { data } = await apiClient.PATCH('/api/v1/purchase-orders/{po_id}', {
        params: { path: { po_id: id } },
        body,
      })
      return data as PurchaseOrderResponse
    },
    // No optimistic update — lines is multi-row replace-style (SPEC §2.5)
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: procurementKeys.lists() })
    },
    // Caller maps 409 to refetch + toast
  })
}

// ---------------------------------------------------------------------------
// useDeletePo
// ---------------------------------------------------------------------------

export interface DeletePoVars {
  id: string
}

export function useDeletePo(): UseMutationResult<void, ApiError, DeletePoVars> {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, DeletePoVars>({
    mutationFn: async ({ id }) => {
      await apiClient.DELETE('/api/v1/purchase-orders/{po_id}', {
        params: { path: { po_id: id } },
      })
    },
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: procurementKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: procurementKeys.lists() })
    },
    // Caller maps 409 to refetch + toast "This PO has already been received elsewhere."
  })
}

// ---------------------------------------------------------------------------
// useReceivePo
// ---------------------------------------------------------------------------

export interface ReceivePoVars {
  id: string
  lines: ReceiveLineRequest[]
}

export function useReceivePo(): UseMutationResult<PurchaseOrderResponse, ApiError, ReceivePoVars> {
  const queryClient = useQueryClient()

  return useMutation<PurchaseOrderResponse, ApiError, ReceivePoVars>({
    mutationFn: async ({ id, lines }) => {
      const { data } = await apiClient.POST('/api/v1/purchase-orders/{po_id}/receive', {
        params: { path: { po_id: id } },
        body: { lines },
      })
      return data as PurchaseOrderResponse
    },
    retry: false, // Terminal mutation — user retries manually; Idempotency-Key is minted per call
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: procurementKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: procurementKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.batchesByPo(id) })
    },
    // Caller maps 409 to refetch + toast
  })
}
