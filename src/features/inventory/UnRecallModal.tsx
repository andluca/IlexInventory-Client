/**
 * src/features/inventory/UnRecallModal.tsx
 *
 * F10 — Un-recall batch modal.
 * Confirmation-only (no body fields).
 * Idempotency-Key auto-attached by middleware.
 */

import { Button, Group, Modal, Stack, Text } from '@mantine/core'
import { useUnRecallBatch } from '@/data/inventory/mutations'
import { ApiError } from '@/api/errors'
import { notifications } from '@mantine/notifications'

export type UnRecallModalProps = {
  batchId: string
  opened: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UnRecallModal({ batchId, opened, onClose, onSuccess }: UnRecallModalProps) {
  const unRecall = useUnRecallBatch()

  function handleSubmit() {
    unRecall.mutate(
      { id: batchId },
      {
        onSuccess: () => {
          onSuccess()
        },
        onError: (error) => {
          if (ApiError.is(error)) {
            notifications.show({
              color: 'red',
              title: "Couldn't un-recall — try again.",
              message: error.detail ?? error.error,
            })
          }
          onClose()
        },
      },
    )
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Reverse recall" size="sm">
      <Stack>
        <Text>Reverse the recall on this batch? Future allocations will be allowed again.</Text>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose} disabled={unRecall.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={unRecall.isPending}>
            Confirm
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
