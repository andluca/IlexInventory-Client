/**
 * src/features/catalog/ProductDetailActions.tsx
 *
 * Action bar for the Product Detail page.
 * Shows Archive or Delete button depending on whether the product has batches.
 */

import { Button, Group } from '@mantine/core'
import type { ProductResponse } from '@/data/catalog/queries'

interface ProductDetailActionsProps {
  product: ProductResponse
  hasBatches: boolean
  batchesLoading: boolean
  onArchive: () => void
  onDelete: () => void
}

export function ProductDetailActions({
  product,
  hasBatches,
  batchesLoading,
  onArchive,
  onDelete,
}: ProductDetailActionsProps) {
  if (batchesLoading) {
    return (
      <Group gap="sm">
        <Button color="red" variant="outline" size="sm" disabled>
          Delete
        </Button>
      </Group>
    )
  }
  return (
    <Group gap="sm">
      {hasBatches ? (
        <Button
          color="orange"
          variant="outline"
          size="sm"
          onClick={onArchive}
          disabled={!!product.archived_at}
        >
          Archive
        </Button>
      ) : (
        <Button color="red" variant="outline" size="sm" onClick={onDelete}>
          Delete
        </Button>
      )}
    </Group>
  )
}
