/**
 * src/features/dashboard/FinancialSummary.tsx
 *
 * Realizes R3 (totals) per SPEC §3.7.
 *
 * - 4 KPI tiles: Revenue, COGS, Profit, Profit Margin
 * - "Top products" mini-table (from dashboard.top_products)
 * - CSV download anchor for /financials/dashboard
 *
 * Props:
 *   from: ISO date string (YYYY-MM-DD)
 *   to:   ISO date string (YYYY-MM-DD)
 *
 * The page-level DateRangePicker lives in the parent (DashboardPage) and
 * passes from/to as props so this widget stays prop-driven (no URL reading here).
 */

import { Alert, Card, Group, Stack, Table, Text, Title } from '@mantine/core'
import { useDashboard } from '@/data/financials/queries'
import { ApiError } from '@/api/errors'
import { formatMoney } from '@/utils/money'
import { formatPercent } from '@/utils/money'
import { CsvExportButton } from '@/components/CsvExportButton'
import type { MarginRowResponse } from '@/data/financials/queries'

// ---------------------------------------------------------------------------
// Private KPI tile sub-component — local to this feature (not a shared primitive)
// ---------------------------------------------------------------------------

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card withBorder p="sm" flex={1} style={{ minWidth: 130 }}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb={4}>
        {label}
      </Text>
      <Text size="lg" fw={700} ff="monospace">
        {value}
      </Text>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// FinancialSummary
// ---------------------------------------------------------------------------

export interface FinancialSummaryProps {
  from: string
  to: string
}

export function FinancialSummary({ from, to }: FinancialSummaryProps) {
  const { data, isLoading, error } = useDashboard({ from, to, top: 5 })

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
          {ApiError.is(error) ? (error.detail ?? error.error) : 'Failed to load financial data'}
        </Alert>
      </Card>
    )
  }

  if (!data) return null

  const { totals, top_products } = data

  return (
    <Card withBorder p="lg">
      <Stack gap="md">
        <Title order={3}>Financial Summary</Title>

        {/* KPI tiles */}
        <Group grow align="stretch">
          <Tile label="Revenue" value={formatMoney(totals.revenue)} />
          <Tile label="COGS" value={formatMoney(totals.cogs)} />
          <Tile label="Profit" value={formatMoney(totals.profit)} />
          <Tile label="Profit Margin" value={formatPercent(totals.margin_pct)} />
        </Group>

        {/* Top products mini-table */}
        <Stack gap={4}>
          <Text size="sm" fw={600}>
            Top products
          </Text>
          {top_products.length === 0 ? (
            <Text size="sm" c="dimmed">
              No sales in this range
            </Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product</Table.Th>
                  <Table.Th ta="right">Revenue</Table.Th>
                  <Table.Th ta="right">Profit</Table.Th>
                  <Table.Th ta="right">Profit Margin</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {top_products.map((row: MarginRowResponse) => (
                  <Table.Tr key={row.product_id}>
                    <Table.Td>{row.product_name}</Table.Td>
                    <Table.Td ta="right">{formatMoney(row.revenue)}</Table.Td>
                    <Table.Td ta="right">{formatMoney(row.profit)}</Table.Td>
                    <Table.Td ta="right">{formatPercent(row.margin_pct)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>

        {/* CSV export */}
        <Group justify="flex-end">
          <CsvExportButton path="/financials/dashboard" params={{ from, to }} />
        </Group>
      </Stack>
    </Card>
  )
}
