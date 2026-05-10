/**
 * src/features/procurement/PosListTable.tsx
 *
 * Presentational table + pagination footer for the Purchase Orders list page.
 * Controlled: receives items, pagination params, and navigation callbacks.
 */

import { Table, Text, Badge, Group, Button } from '@mantine/core'
import type { PurchaseOrderResponse } from '@/data/procurement/queries'

interface PosListTableProps {
  items: PurchaseOrderResponse[]
  total: number
  pageParam: number
  limit: number
  totalPages: number
  onRowClick: (id: string) => void
  onPagePrev: () => void
  onPageNext: () => void
}

export function PosListTable({
  items,
  total,
  pageParam,
  limit,
  totalPages,
  onRowClick,
  onPagePrev,
  onPageNext,
}: PosListTableProps) {
  return (
    <>
      <Table highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Supplier</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Lines</Table.Th>
            <Table.Th>Created</Table.Th>
            <Table.Th>Received</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((po) => (
            <Table.Tr
              key={po.id}
              style={{ cursor: 'pointer' }}
              onClick={() => onRowClick(po.id)}
            >
              <Table.Td>
                <Text fw={500}>{po.supplier_name}</Text>
                {po.supplier_contact && (
                  <Text size="xs" c="dimmed">
                    {po.supplier_contact}
                  </Text>
                )}
              </Table.Td>
              <Table.Td>
                <Badge color={po.status === 'received' ? 'green' : 'gray'} variant="light">
                  {po.status}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text ff="monospace" size="sm">
                  {po.lines.length}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {new Date(po.created_at).toLocaleDateString()}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {po.received_at ? new Date(po.received_at).toLocaleDateString() : '—'}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
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
