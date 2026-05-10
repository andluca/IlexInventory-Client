/**
 * src/features/inventory/StockListTable.tsx
 *
 * Presentational table + pagination footer for the Stock by Batch page.
 * Receives items, productNameById lookup, pagination params, and navigation callbacks.
 */

import { Table, Text, Badge, Group, Button } from '@mantine/core'
import type { BatchResponse } from '@/data/inventory/queries'
import { formatMoney } from '@/utils/money'
import { formatQty, type BaseUnit } from '@/utils/qty'

interface StockListTableProps {
  items: BatchResponse[]
  productNameById: Map<string, string>
  baseUnitByProductId: Map<string, BaseUnit>
  total: number
  pageParam: number
  limit: number
  totalPages: number
  onRowClick: (id: string) => void
  onPagePrev: () => void
  onPageNext: () => void
}

export function StockListTable({
  items,
  productNameById,
  baseUnitByProductId,
  total,
  pageParam,
  limit,
  totalPages,
  onRowClick,
  onPagePrev,
  onPageNext,
}: StockListTableProps) {
  return (
    <>
      <Table highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Batch code</Table.Th>
            <Table.Th>Product</Table.Th>
            <Table.Th>Expiration</Table.Th>
            <Table.Th>On hand</Table.Th>
            <Table.Th>Unit cost</Table.Th>
            <Table.Th>Status</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((batch) => {
            const productName = productNameById.get(batch.product_id) ?? batch.product_id.slice(0, 8)
            return (
              <Table.Tr
                key={batch.id}
                style={{ cursor: 'pointer' }}
                onClick={() => onRowClick(batch.id)}
              >
                <Table.Td>
                  <Text ff="monospace" size="sm">
                    {batch.batch_code}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{productName}</Text>
                </Table.Td>
                <Table.Td>
                  {batch.expiration_date ? (
                    <Text size="sm">{batch.expiration_date}</Text>
                  ) : (
                    <Text size="sm" c="dimmed">—</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text ff="monospace" size="sm">
                    {formatQty(batch.on_hand, baseUnitByProductId.get(batch.product_id) ?? 'unit')}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text ff="monospace" size="sm">
                    {formatMoney(batch.unit_cost)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {batch.is_recalled && (
                    <Badge color="red" variant="light">
                      Recalled
                    </Badge>
                  )}
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>

      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Showing {(pageParam - 1) * limit + 1}–{Math.min(pageParam * limit, total)} of {total}
        </Text>
        <Group gap="xs">
          <Button variant="subtle" disabled={pageParam <= 1} onClick={onPagePrev}>
            Previous
          </Button>
          <Text size="sm">
            Page {pageParam} of {totalPages}
          </Text>
          <Button variant="subtle" disabled={pageParam >= totalPages} onClick={onPageNext}>
            Next
          </Button>
        </Group>
      </Group>
    </>
  )
}
