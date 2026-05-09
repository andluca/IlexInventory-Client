/**
 * src/data/inventory/mutations.ts
 *
 * TanStack Query mutation hooks for inventory (batches + movements) write operations.
 *
 * Notes:
 * - No optimistic updates on any mutation here — every write either is terminal
 *   (batch create, write-off, recall, un-recall) or writes a server-derived audit
 *   movement (metadata PATCH creates metadata_correction, adjust creates adjustment).
 * - Idempotency-Key is auto-attached by apiClient middleware on:
 *     POST /api/v1/batches                        — always
 *     POST /api/v1/batches/{id}/recall            — always
 *     POST /api/v1/batches/{id}/un-recall         — always
 *     POST /api/v1/batches/{id}/movements         — only when kind === 'write_off'
 *   Adjust skips the header (BE-D7 / SPEC §2.5).
 * - retry: false on all terminal mutations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { inventoryKeys } from './keys'
import type { components } from '@/api/generated/schema'

export type BatchResponse = components['schemas']['BatchResponse']
export type BatchCreateRequest = components['schemas']['BatchCreateRequestRequest']
export type MovementResponse = components['schemas']['MovementResponse']
export type MovementCreateRequest = components['schemas']['MovementCreateRequestRequest']
export type PatchedBatchPatchMetadataRequest = components['schemas']['PatchedBatchPatchMetadataRequestRequest']

// ---------------------------------------------------------------------------
// useCreateBatch
// ---------------------------------------------------------------------------

export function useCreateBatch(): UseMutationResult<BatchResponse, ApiError, BatchCreateRequest> {
  const queryClient = useQueryClient()

  return useMutation<BatchResponse, ApiError, BatchCreateRequest>({
    mutationFn: async (body) => {
      const { data } = await apiClient.POST('/api/v1/batches', { body })
      return data as BatchResponse
    },
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

// ---------------------------------------------------------------------------
// usePatchBatch
// ---------------------------------------------------------------------------

export interface PatchBatchVars {
  id: string
  batch_code?: string
  expiration_date?: string | null
  clear_expiration?: boolean
}

export function usePatchBatch(): UseMutationResult<BatchResponse, ApiError, PatchBatchVars> {
  const queryClient = useQueryClient()

  return useMutation<BatchResponse, ApiError, PatchBatchVars>({
    mutationFn: async ({ id, batch_code, expiration_date, clear_expiration }) => {
      const body: PatchedBatchPatchMetadataRequest = {
        clear_expiration: clear_expiration ?? false,
      }
      if (batch_code !== undefined) body.batch_code = batch_code
      if (expiration_date !== undefined) body.expiration_date = expiration_date

      const { data } = await apiClient.PATCH('/api/v1/batches/{batch_id}', {
        params: { path: { batch_id: id } },
        body,
      })
      return data as BatchResponse
    },
    // No optimistic update — BE writes a metadata_correction movement we want to fetch back
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() })
      void queryClient.invalidateQueries({
        queryKey: inventoryKeys.movements({ batch_id: id }),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useCreateMovement
// ---------------------------------------------------------------------------

export interface CreateMovementVars {
  batchId: string
  body: MovementCreateRequest
}

export function useCreateMovement(): UseMutationResult<
  MovementResponse,
  ApiError,
  CreateMovementVars
> {
  const queryClient = useQueryClient()

  return useMutation<MovementResponse, ApiError, CreateMovementVars>({
    mutationFn: async ({ batchId, body }) => {
      const { data } = await apiClient.POST('/api/v1/batches/{batch_id}/movements', {
        params: { path: { batch_id: batchId } },
        body,
      })
      return data as MovementResponse
    },
    retry: false,
    onSuccess: (_data, { batchId }) => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(batchId) })
      void queryClient.invalidateQueries({
        queryKey: inventoryKeys.movements({ batch_id: batchId }),
      })
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() })
    },
  })
}

// ---------------------------------------------------------------------------
// useRecallBatch
// ---------------------------------------------------------------------------

export interface RecallBatchVars {
  id: string
  reason: string
}

export function useRecallBatch(): UseMutationResult<BatchResponse, ApiError, RecallBatchVars> {
  const queryClient = useQueryClient()

  return useMutation<BatchResponse, ApiError, RecallBatchVars>({
    mutationFn: async ({ id, reason }) => {
      const { data } = await apiClient.POST('/api/v1/batches/{batch_id}/recall', {
        params: { path: { batch_id: id } },
        body: { reason },
      })
      return data as BatchResponse
    },
    retry: false,
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() })
      void queryClient.invalidateQueries({
        queryKey: inventoryKeys.movements({ batch_id: id }),
      })
    },
    // Caller maps 409 to refetch + toast
  })
}

// ---------------------------------------------------------------------------
// useUnRecallBatch
// ---------------------------------------------------------------------------

export interface UnRecallBatchVars {
  id: string
}

export function useUnRecallBatch(): UseMutationResult<BatchResponse, ApiError, UnRecallBatchVars> {
  const queryClient = useQueryClient()

  return useMutation<BatchResponse, ApiError, UnRecallBatchVars>({
    mutationFn: async ({ id }) => {
      const { data } = await apiClient.POST('/api/v1/batches/{batch_id}/un-recall', {
        params: { path: { batch_id: id } },
      })
      return data as BatchResponse
    },
    retry: false,
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() })
      void queryClient.invalidateQueries({
        queryKey: inventoryKeys.movements({ batch_id: id }),
      })
    },
  })
}
