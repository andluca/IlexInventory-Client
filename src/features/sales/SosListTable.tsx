/**
 * src/features/sales/SosListTable.tsx
 *
 * Presentational table for the Sales Orders list page.
 * Controlled: receives items + row-click handler.
 * No filter / URL / navigation knowledge.
 */

import { Table, Text, Badge } from '@mantine/core'
import { statusBadgeColor, effectiveStatus } from './utils'
import type { SalesOrderResponse } from '@/data/sales/queries'

interface SosListTableProps {
  items: SalesOrderResponse[]
  onRowClick: (id: string, status: string) => void
}

export function SosListTable({ items, onRowClick }: SosListTableProps) {
  return (
    <Table highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Customer</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th>Lines</Table.Th>
          <Table.Th>Created</Table.Th>
          <Table.Th>Committed at</Table.Th>
          <Table.Th>Voided at</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {items.map((so) => (
          <Table.Tr
            key={so.id}
            style={{ cursor: 'pointer' }}
            onClick={() => onRowClick(so.id, so.status)}
          >
            <Table.Td>
              <Text fw={500}>{so.customer_name}</Text>
              {so.customer_contact && (
                <Text size="xs" c="dimmed">
                  {so.customer_contact}
                </Text>
              )}
            </Table.Td>
            <Table.Td>
              {(() => {
                const display = effectiveStatus(so)
                return (
                  <Badge color={statusBadgeColor(display)} variant="light">
                    {display}
                  </Badge>
                )
              })()}
            </Table.Td>
            <Table.Td>
              <Text ff="monospace" size="sm">
                {so.lines.length}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" c="dimmed">
                {new Date(so.created_at).toLocaleDateString()}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" c="dimmed">
                {so.committed_at ? new Date(so.committed_at).toLocaleDateString() : '—'}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" c="dimmed">
                {so.voided_at ? new Date(so.voided_at).toLocaleDateString() : '—'}
              </Text>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )
}
