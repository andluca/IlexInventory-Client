/**
 * src/features/sales/AllocationsTable.tsx
 *
 * Read-only allocations table for SoDetailPage post-commit.
 * Each row: batch_id (mono link to /batches/{batch_id}), allocated qty, unit_cost.
 *
 * Note: AllocationResponse from the BE returns batch_id only (no batch_code or
 * expiration_date). Click through to the batch detail page for that metadata.
 */

import { Link } from '@tanstack/react-router'
import { Table, Text, Anchor } from '@mantine/core'
import { formatMoney } from '@/utils/money'
import { formatQty } from '@/utils/qty'
import type { BaseUnit } from '@/utils/qty'
import type { AllocationResponse } from '@/data/sales/queries'

export type SalesOrderAllocation = AllocationResponse

export type AllocationsTableProps = {
  allocations: AllocationResponse[]
  baseUnit: BaseUnit
}

export function AllocationsTable({ allocations, baseUnit }: AllocationsTableProps) {
  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Batch</Table.Th>
          <Table.Th>Quantity</Table.Th>
          <Table.Th>Unit cost</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {allocations.map((alloc) => (
          <Table.Tr key={alloc.id}>
            <Table.Td>
              <Anchor
                component={Link}
                to="/batches/$id"
                params={{ id: alloc.batch_id } as never}
                ff="monospace"
                size="sm"
              >
                {alloc.batch_id.slice(0, 8)}
              </Anchor>
            </Table.Td>
            <Table.Td>
              <Text ff="monospace" size="sm">
                {formatQty(alloc.allocated_quantity, baseUnit)}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text ff="monospace" size="sm">
                {formatMoney(alloc.unit_cost)}
              </Text>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )
}
