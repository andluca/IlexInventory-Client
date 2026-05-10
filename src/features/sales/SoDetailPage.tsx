/**
 * src/features/sales/SoDetailPage.tsx
 *
 * Sales order detail page (R4 + F7 post-commit + F8 per SPEC §3.6).
 * Archetype A4 (Detail with action bar).
 * Shows committed/voided SO with lines table, allocations table, and Void affordance.
 */

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useSo } from '@/data/sales/queries'
import { ApiError } from '@/api/errors'
import { useActModalBus } from '@/stores/act-modal-bus'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { AllocationsTable } from './AllocationsTable'
import { VoidConfirmModal } from './VoidConfirmModal'
import { formatMoney } from '@/utils/money'
import Decimal from 'decimal.js'
import { statusBadgeColor, effectiveStatus } from './utils'

export function SoDetailPage({ soId }: { soId: string }) {
  const navigate = useNavigate()
  const so = useSo(soId)
  const [voidOpen, setVoidOpen] = useState(false)

  // Redirect drafts to the edit route. Must run in an effect — calling
  // navigate() during render produces a render-loop and the React
  // "Cannot update component while rendering" warning.
  useEffect(() => {
    if (so.data?.status === 'draft') {
      void navigate({
        to: '/sales-orders/$id/edit',
        params: { id: soId },
        replace: true,
      })
    }
  }, [so.data?.status, soId, navigate])

  // Act modal bus — opened from CmdkPalette (ILE-9 Step 8)
  const busRequest = useActModalBus((s) => s.request)
  const clearBus = useActModalBus((s) => s.clear)
  const prevBusRef = useRef(busRequest)

  useEffect(() => {
    if (busRequest !== prevBusRef.current) {
      prevBusRef.current = busRequest
    }
    if (busRequest?.kind === 'void' && busRequest.soId === soId) {
      setVoidOpen(true)
      clearBus()
    }
  }, [busRequest, soId, clearBus])

  if (so.isLoading) {
    return (
      <Stack p="xl">
        <LoadingSkeleton rows={5} />
      </Stack>
    )
  }

  if (so.error && ApiError.is(so.error) && so.error.status === 404) {
    return (
      <Stack p="xl">
        <Title order={2}>Not found</Title>
        <Text c="dimmed">
          This sales order doesn&apos;t exist or you don&apos;t have access.
        </Text>
        <Button
          component={Link}
          to="/sales-orders"
          variant="subtle"
          leftSection={<IconArrowLeft size={14} />}
        >
          Back to sales orders
        </Button>
      </Stack>
    )
  }

  if (so.error) {
    return (
      <Stack p="xl">
        <Alert color="red">
          {ApiError.is(so.error) ? (so.error.detail ?? so.error.error) : 'Failed to load'}
        </Alert>
      </Stack>
    )
  }

  if (!so.data) return null

  const data = so.data

  // Drafts are redirected by the effect above; render null while it kicks in.
  if (data.status === 'draft') return null

  const status = effectiveStatus(data)
  const isVoided = status === 'voided'
  // Only committed-and-not-yet-voided gets the Void affordance.
  const isCommitted = data.status === 'committed' && !data.voided_at

  // Compute totals
  const totalQty = data.lines.reduce(
    (acc, l) => acc.plus(new Decimal(l.quantity)),
    new Decimal(0),
  )
  const revenue = data.lines.reduce(
    (acc, l) => acc.plus(new Decimal(l.quantity).times(new Decimal(l.sell_price))),
    new Decimal(0),
  )

  return (
    <Stack p="xl" gap="lg" maw={1100}>
      <Group>
        <Button
          component={Link}
          to="/sales-orders"
          variant="subtle"
          leftSection={<IconArrowLeft size={14} />}
        >
          All sales orders
        </Button>
      </Group>

      {/* Voided banner */}
      {isVoided && (
        <Alert color="red" title="Voided">
          Voided at {data.voided_at ? new Date(data.voided_at).toLocaleString() : '—'}.
        </Alert>
      )}

      {/* Header */}
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{data.customer_name}</Title>
          {data.customer_contact && (
            <Text c="dimmed">{data.customer_contact}</Text>
          )}
          <Text ff="monospace" size="sm" c="dimmed">
            {data.id.slice(0, 8)}
          </Text>
          <Group gap="xs" mt="xs">
            <Badge color={statusBadgeColor(status)} variant="light">
              {status}
            </Badge>
            {data.committed_at && (
              <Text size="sm" c="dimmed">
                Committed {new Date(data.committed_at).toLocaleString()}
              </Text>
            )}
            {data.voided_at && (
              <Text size="sm" c="dimmed">
                · Voided {new Date(data.voided_at).toLocaleString()}
              </Text>
            )}
          </Group>
        </Stack>

        {/* Action bar */}
        {isCommitted && (
          <Group>
            <Button
              color="red"
              variant="light"
              onClick={() => setVoidOpen(true)}
            >
              Void
            </Button>
          </Group>
        )}
      </Group>

      {/* Lines table */}
      <Card withBorder p="lg">
        <Stack>
          <Title order={3}>Lines</Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Product</Table.Th>
                <Table.Th>Quantity</Table.Th>
                <Table.Th>Sell price</Table.Th>
                <Table.Th>Line revenue</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.lines.map((line) => (
                <Table.Tr key={line.id}>
                  <Table.Td>
                    <Text ff="monospace" size="sm">
                      {line.product_id.slice(0, 8)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text ff="monospace" size="sm">
                      {line.quantity}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text ff="monospace" size="sm">
                      {formatMoney(line.sell_price)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text ff="monospace" size="sm">
                      {formatMoney(
                        new Decimal(line.quantity)
                          .times(new Decimal(line.sell_price))
                          .toFixed(4),
                      )}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {/* Totals footer */}
          <Box>
            <Group gap="xl">
              <Text size="sm">
                Total qty: <strong>{totalQty.toFixed(4)}</strong>
              </Text>
              <Text size="sm">
                Revenue: <strong>{formatMoney(revenue.toFixed(4))}</strong>
              </Text>
            </Group>
          </Box>
        </Stack>
      </Card>

      {/* Allocations table — BE returns a flat list at SO root, not per-line.
          Render once for the whole SO (committed and voided SOs both keep
          the historical allocations). */}
      {data.allocations.length > 0 && (
        <Card withBorder p="lg">
          <Stack>
            <Title order={3}>Allocations</Title>
            <AllocationsTable allocations={data.allocations} baseUnit="unit" />
          </Stack>
        </Card>
      )}

      <VoidConfirmModal
        soId={soId}
        opened={voidOpen}
        onClose={() => setVoidOpen(false)}
        onSuccess={() => {
          void so.refetch()
          notifications.show({
            color: 'green',
            title: 'Sales order voided',
            message: '',
          })
          setVoidOpen(false)
        }}
        onError={(error) => {
          if (ApiError.is(error) && error.status === 409) {
            notifications.show({
              color: 'orange',
              title: 'Already voided',
              message: 'This sales order has already been voided elsewhere.',
            })
            void so.refetch()
          } else if (ApiError.is(error)) {
            notifications.show({
              color: 'red',
              title: 'Void failed',
              message: error.detail ?? error.error,
            })
          }
          setVoidOpen(false)
        }}
      />
    </Stack>
  )
}
