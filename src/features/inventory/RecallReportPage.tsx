/**
 * src/features/inventory/RecallReportPage.tsx
 *
 * R7 — Recall Report (SPEC §3.5 R7 / F11).
 *
 * Renders the read-view of "customers who received units from this batch via
 * committed, non-voided SOs." Reached from BatchDetailPage via "View recall report".
 *
 * - Header: batch code (mono), product name, recall reason + date (if recalled)
 * - Body: DataTable rows of { customer_name, sale_order_id (link), committed_at,
 *         allocated_quantity }
 * - Footer: CsvExportButton → /batches/{id}/recall-report?format=csv
 * - Empty state: <EmptyState> when items=[]
 * - Loading state: <LoadingSkeleton>
 */

import { Link } from '@tanstack/react-router'
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { useBatch } from '@/data/inventory/queries'
import { useRecallReport } from '@/data/inventory/queries'
import { useProduct } from '@/data/catalog/queries'
import { ApiError } from '@/api/errors'
import { CsvExportButton } from '@/components/CsvExportButton'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'

export function RecallReportPage({ batchId }: { batchId: string }) {
  const batch = useBatch(batchId)
  const productId = batch.data?.product_id ?? ''
  const product = useProduct(productId, { enabled: Boolean(productId) })
  const recallReport = useRecallReport(batchId)

  // Loading
  if (batch.isLoading || recallReport.isLoading) {
    return (
      <Stack p="xl">
        <LoadingSkeleton rows={5} />
      </Stack>
    )
  }

  // Error (404 falls through to ErrorBoundary — handle generic errors only)
  if (batch.error) {
    return (
      <Stack p="xl">
        <Alert color="red">
          {ApiError.is(batch.error) ? (batch.error.detail ?? batch.error.error) : 'Failed to load'}
        </Alert>
      </Stack>
    )
  }

  if (recallReport.error) {
    return (
      <Stack p="xl">
        <Alert color="red">
          {ApiError.is(recallReport.error)
            ? (recallReport.error.detail ?? recallReport.error.error)
            : 'Failed to load recall report'}
        </Alert>
      </Stack>
    )
  }

  if (!batch.data) return null

  const b = batch.data
  const items = recallReport.data?.items ?? []

  return (
    <Stack p="xl" gap="lg" maw={1100}>
      {/* Back link */}
      <Group>
        <Button
          component={Link}
          to="/batches/$id"
          params={{ id: batchId } as never}
          variant="subtle"
          leftSection={<IconArrowLeft size={14} />}
        >
          Back to batch
        </Button>
      </Group>

      {/* Header */}
      <Card withBorder p="lg">
        <Stack gap="sm">
          <Title order={2}>
            Recall report — Batch{' '}
            <Text component="span" ff="monospace" fw={700} inherit>
              {b.batch_code}
            </Text>
          </Title>

          {product.data && (
            <Text size="lg" fw={500}>
              {product.data.name}
            </Text>
          )}

          {b.is_recalled && (
            <Group gap="sm">
              <Badge color="red" variant="filled">
                Recalled
              </Badge>
              {b.recalled_at && (
                <Text size="sm" c="dimmed">
                  {new Date(b.recalled_at).toLocaleDateString()}
                </Text>
              )}
              {b.recall_reason && (
                <Text size="sm" c="dimmed">
                  &quot;{b.recall_reason}&quot;
                </Text>
              )}
            </Group>
          )}
        </Stack>
      </Card>

      {/* Body */}
      {items.length === 0 ? (
        <EmptyState
          title="No shipments to recall"
          body="This batch has not been sold or has only been allocated to voided SOs."
        />
      ) : (
        <Card withBorder p="lg">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Title order={3}>Shipments</Title>
              <CsvExportButton
                path={`/batches/${batchId}/recall-report`}
                label="Export CSV"
              />
            </Group>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Customer</Table.Th>
                  <Table.Th>Sales order</Table.Th>
                  <Table.Th>Committed at</Table.Th>
                  <Table.Th>Qty allocated</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((item) => (
                  <Table.Tr key={item.sale_order_id}>
                    <Table.Td>{item.customer_name}</Table.Td>
                    <Table.Td>
                      <Text
                        component={Link}
                        to="/sales-orders/$id"
                        params={{ id: item.sale_order_id } as never}
                        size="sm"
                        c="blue"
                        ff="monospace"
                        style={{ cursor: 'pointer' }}
                      >
                        {item.sale_order_id}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {new Date(item.sale_committed_at).toLocaleDateString()}
                    </Table.Td>
                    <Table.Td ff="monospace">{item.quantity_received}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Card>
      )}
    </Stack>
  )
}
