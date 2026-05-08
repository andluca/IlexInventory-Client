/**
 * src/features/catalog/DeleteConfirmModal.tsx
 *
 * Confirmation modal for hard-deleting a product (only when no batches exist).
 * On success: removes from cache, invalidates list, navigates to /products.
 * On 409: toasts "batches exist — archive it instead", refetches batches, flips affordance.
 */

import { Modal, Text, Button, Group, Stack } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useNavigate } from '@tanstack/react-router'
import { useDeleteProduct } from '@/data/catalog/mutations'
import { ApiError } from '@/api/errors'

interface DeleteConfirmModalProps {
  productId: string
  opened: boolean
  onClose: () => void
  onRefetchBatches: () => void
}

export function DeleteConfirmModal({
  productId,
  opened,
  onClose,
  onRefetchBatches,
}: DeleteConfirmModalProps) {
  const navigate = useNavigate()
  const deleteProduct = useDeleteProduct()

  function handleConfirm() {
    deleteProduct.mutate(
      { id: productId },
      {
        onSuccess: () => {
          notifications.show({
            color: 'teal',
            title: 'Deleted',
            message: 'Product deleted.',
          })
          onClose()
          void navigate({
            to: '/products',
            search: { page: 1, search: undefined, archived: undefined },
          })
        },
        onError: (error) => {
          if (ApiError.is(error) && error.status === 409) {
            notifications.show({
              color: 'orange',
              title: 'Delete failed',
              message: 'This product already has batches — archive it instead.',
            })
            onRefetchBatches()
            onClose()
          } else {
            notifications.show({
              color: 'red',
              title: 'Delete failed',
              message: error.detail ?? error.error,
            })
          }
        },
      },
    )
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Delete product?" centered>
      <Stack gap="md">
        <Text size="sm">
          This will permanently delete the product. This action cannot be undone.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose} disabled={deleteProduct.isPending}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleConfirm}
            loading={deleteProduct.isPending}
          >
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
