/**
 * src/features/dashboard/MarginByProductTable.tsx
 *
 * Realizes R3 (per-product detail) per SPEC §3.7.
 *
 * - Cursor-paginated table of per-product margin rows from useMarginList
 * - "Load more" footer button when hasNextPage
 * - CSV download anchor for /financials/margin
 *
 * Note: SPEC §3.7 describes this endpoint as offset-paginated, but the
 * schema (schema.ts:1285-1314) uses cursor + next_cursor. Implemented as
 * cursor pagination — SPEC discrepancy flagged in ILE-8 journal.
 */

import { Alert, Button, Card, Group, Stack, Table, Text, Title } from '@mantine/core'
import { useMarginList } from '@/data/financials/queries'
import { ApiError } from '@/api/errors'
import { formatMoney } from '@/utils/money'
import { formatPercent } from '@/utils/money'
import { CsvExportButton } from '@/components/CsvExportButton'

export interface MarginByProductTableProps {
  from: string
  to: string
}

export function MarginByProductTable({ from, to }: MarginByProductTableProps) {
  const { data, isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useMarginList({ from, to })

  const allItems = data?.pages.flatMap((p) => p.items) ?? []

  if (isLoading) {
    return (
      <Card withBorder p="lg">
        <Text c="dimmed">Loading…</Text>
      </Card>
    )
  }

  if (error) {
    return (
      <Card withBorder p="lg">
        <Alert color="red" role="alert">
          {ApiError.is(error) ? (error.detail ?? error.error) : 'Failed to load margin data'}
        </Alert>
      </Card>
    )
  }

  return (
    <Card withBorder p="lg">
      <Stack gap="md">
        <Title order={3}>Margin by Product</Title>

        {allItems.length === 0 ? (
          <Text size="sm" c="dimmed">
            No products with sales in this range.
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Product</Table.Th>
                <Table.Th ta="right">Units sold</Table.Th>
                <Table.Th ta="right">Revenue</Table.Th>
                <Table.Th ta="right">COGS</Table.Th>
                <Table.Th ta="right">Profit</Table.Th>
                <Table.Th ta="right">Profit Margin</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {allItems.map((row) => (
                <Table.Tr key={row.product_id}>
                  <Table.Td>{row.product_name}</Table.Td>
                  <Table.Td ta="right">{row.units_sold}</Table.Td>
                  <Table.Td ta="right">{formatMoney(row.revenue)}</Table.Td>
                  <Table.Td ta="right">{formatMoney(row.cogs)}</Table.Td>
                  <Table.Td ta="right">{formatMoney(row.profit)}</Table.Td>
                  <Table.Td ta="right">{formatPercent(row.margin_pct)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        {/* Load more */}
        {hasNextPage && (
          <Button
            variant="subtle"
            loading={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            Load more
          </Button>
        )}

        {/* CSV export */}
        <Group justify="flex-end">
          <CsvExportButton path="/financials/margin" params={{ from, to }} />
        </Group>
      </Stack>
    </Card>
  )
}
