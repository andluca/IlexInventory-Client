/**
 * src/features/sales/CommitConfirmModal.tsx
 *
 * F7 commit action-confirmation modal.
 * Idempotency-Key auto-attached by middleware.
 * retry: false (terminal mutation).
 * On 422 shortfall: closes modal, parent renders ShortfallBanner inline.
 * On 409: closes modal, parent toasts + refetches.
 */

import { Button, Group, Modal, Stack, Text } from '@mantine/core'
import { useCommitSo, type AllocationOverride } from '@/data/sales/mutations'
import { ApiError } from '@/api/errors'

type ShortfallData = {
  product_id: string
  required: string
  available: string
}

export type CommitConfirmModalProps = {
  soId: string
  allocations?: AllocationOverride[] | undefined
  opened: boolean
  onClose: () => void
  onSuccess: () => void
  onShortfall: (shortfall: ShortfallData) => void
  onStaleState: () => void
}

export function CommitConfirmModal({
  soId,
  allocations,
  opened,
  onClose,
  onSuccess,
  onShortfall,
  onStaleState,
}: CommitConfirmModalProps) {
  const commitSo = useCommitSo()

  function handleConfirm() {
    commitSo.mutate(
      { id: soId, allocations },
      {
        onSuccess: () => {
          onSuccess()
        },
        onError: (error) => {
          if (ApiError.is(error) && error.status === 422) {
            // Extract shortfall envelope from error
            const raw = error.fields as Record<string, unknown> | undefined
            const shortfallData = (raw?.shortfall ?? error.detail) as ShortfallData | undefined
            onClose()
            if (shortfallData && typeof shortfallData === 'object' && 'product_id' in shortfallData) {
              onShortfall(shortfallData as ShortfallData)
            } else {
              // Fallback: extract from top-level error body if structured differently
              onShortfall({
                product_id: 'unknown',
                required: '0',
                available: '0',
              })
            }
          } else if (ApiError.is(error) && error.status === 409) {
            onClose()
            onStaleState()
          } else {
            onClose()
          }
        },
      },
    )
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Commit sales order?" size="md">
      <Stack>
        <Text>
          This consumes stock from the batches above. Sales orders are immutable after commit —
          you&apos;d have to void to reverse.
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose} disabled={commitSo.isPending}>
            Cancel
          </Button>
          <Button color="teal" onClick={handleConfirm} loading={commitSo.isPending}>
            Commit
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
