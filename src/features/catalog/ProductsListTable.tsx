/**
 * src/features/catalog/ProductsListTable.tsx
 *
 * Presentational table + pagination footer for the Products list page.
 * Controlled: receives items, pagination params, and navigation callbacks.
 */

import { Table, Text, Badge, Group, Button } from '@mantine/core'
import type { ProductResponse } from '@/data/catalog/queries'

const LIMIT = 50

interface ProductsListTableProps {
  items: ProductResponse[]
  total: number
  pageParam: number
  onRowClick: (id: string) => void
  onPagePrev: () => void
  onPageNext: () => void
}

export function ProductsListTable({
  items,
  total,
  pageParam,
  onRowClick,
  onPagePrev,
  onPageNext,
}: ProductsListTableProps) {
  const offset = (pageParam - 1) * LIMIT
  return (
    <>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>SKU</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Base unit</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Status</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((product) => (
            <Table.Tr
              key={product.id}
              style={{ cursor: 'pointer' }}
              onClick={() => onRowClick(product.id)}
            >
              <Table.Td>
                <Text size="sm" ff="monospace">
                  {product.sku}
                </Text>
              </Table.Td>
              <Table.Td>{product.name}</Table.Td>
              <Table.Td>{product.base_unit}</Table.Td>
              <Table.Td>{product.description}</Table.Td>
              <Table.Td>
                {product.archived_at && (
                  <Badge color="gray" size="sm">
                    Archived
                  </Badge>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Group justify="space-between" align="center">
        <Text size="sm" c="dimmed">
          Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
        </Text>
        <Group gap="xs">
          <Button variant="default" size="xs" onClick={onPagePrev} disabled={pageParam <= 1}>
            Previous
          </Button>
          <Button variant="default" size="xs" onClick={onPageNext} disabled={offset + LIMIT >= total}>
            Next
          </Button>
        </Group>
      </Group>
    </>
  )
}
