/**
 * src/features/sales/VoidConfirmModal.tsx
 *
 * F8 — Void a committed sales order.
 * Idempotency-Key auto-attached by middleware.
 * 409 → caller maps to refetch + toast.
 * retry: false (terminal mutation).
 */

import { Button, Group, Modal, Stack, Text } from '@mantine/core'
import { useVoidSo } from '@/data/sales/mutations'
import { ApiError } from '@/api/errors'

export type VoidConfirmModalProps = {
  soId: string
  opened: boolean
  onClose: () => void
  onSuccess: () => void
  onError: (error: ApiError) => void
}

export function VoidConfirmModal({
  soId,
  opened,
  onClose,
  onSuccess,
  onError,
}: VoidConfirmModalProps) {
  const voidSo = useVoidSo()

  function handleConfirm() {
    voidSo.mutate(
      { id: soId },
      {
        onSuccess: () => {
          onSuccess()
        },
        onError: (error) => {
          onError(error)
        },
      },
    )
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Void sales order?" size="md">
      <Stack>
        <Text>
          Voiding writes reversal movements and stamps <code>voided_at</code>. Allocations stay on
          the record. Past sales reported in recall reports for the affected batches will be hidden
          after void.
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose} disabled={voidSo.isPending}>
            Cancel
          </Button>
          <Button color="red" onClick={handleConfirm} loading={voidSo.isPending}>
            Void
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
