/**
 * src/features/catalog/ArchiveConfirmModal.tsx
 *
 * Confirmation modal for archiving a product.
 * On success: invalidates detail + list, closes modal, shows toast.
 * On 409: toasts "no batches — delete it instead", refetches batches, flips affordance.
 */

import { Modal, Text, Button, Group, Stack } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQueryClient } from '@tanstack/react-query'
import { useArchiveProduct } from '@/data/catalog/mutations'
import { catalogKeys } from '@/data/catalog/keys'
import { ApiError } from '@/api/errors'

interface ArchiveConfirmModalProps {
  productId: string
  opened: boolean
  onClose: () => void
  onRefetchBatches: () => void
}

export function ArchiveConfirmModal({
  productId,
  opened,
  onClose,
  onRefetchBatches,
}: ArchiveConfirmModalProps) {
  const queryClient = useQueryClient()
  const archiveProduct = useArchiveProduct()

  function handleConfirm() {
    archiveProduct.mutate(
      { id: productId },
      {
        onSuccess: () => {
          notifications.show({
            color: 'teal',
            title: 'Archived',
            message: 'Product archived.',
          })
          void queryClient.invalidateQueries({ queryKey: catalogKeys.detail(productId) })
          void queryClient.invalidateQueries({ queryKey: catalogKeys.lists() })
          onClose()
        },
        onError: (error) => {
          if (ApiError.is(error) && error.status === 409) {
            notifications.show({
              color: 'orange',
              title: 'Archive failed',
              message: 'This product has no batches — delete it instead.',
            })
            onRefetchBatches()
            onClose()
          } else {
            notifications.show({
              color: 'red',
              title: 'Archive failed',
              message: error.detail ?? error.error,
            })
          }
        },
      },
    )
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Archive product?" centered>
      <Stack gap="md">
        <Text size="sm">
          Archiving will hide this product from active lists. You can still view it with the
          &ldquo;Archived&rdquo; filter.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose} disabled={archiveProduct.isPending}>
            Cancel
          </Button>
          <Button
            color="orange"
            onClick={handleConfirm}
            loading={archiveProduct.isPending}
          >
            Archive
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
