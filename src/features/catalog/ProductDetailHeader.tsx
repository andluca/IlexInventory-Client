/**
 * src/features/catalog/ProductDetailHeader.tsx
 *
 * Presentational header for the Product Detail page.
 * Shows: title, mono SKU, base_unit pill, archived badge.
 */

import { Title, Group, Text, Badge, Stack } from '@mantine/core'
import type { ProductResponse } from '@/data/catalog/queries'

interface ProductDetailHeaderProps {
  product: ProductResponse
}

export function ProductDetailHeader({ product }: ProductDetailHeaderProps) {
  return (
    <Stack gap="xs">
      <Title order={2}>{product.name}</Title>
      <Group gap="sm">
        <Text ff="monospace" size="sm" c="dimmed">
          {product.sku}
        </Text>
        <Badge variant="outline" size="sm">
          Base unit: {product.base_unit}
        </Badge>
        {product.archived_at && (
          <Badge color="gray" size="sm">
            Archived
          </Badge>
        )}
      </Group>
    </Stack>
  )
}
