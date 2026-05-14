/**
 * src/features/procurement/PoDetailPage.tsx
 *
 * PO detail (R5 + F3 post-receive). Archetype A4 (Detail with action bar).
 * Draft state: shows Edit / Delete / Receive action bar.
 * Received state: read-only with batches table; no PATCH/DELETE/Receive affordances.
 * 409 stale-state → refetch + toast.
 */

import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Stack,
  Table,
  Text,
  Title,
  Modal,
} from '@mantine/core'
import { IconEdit, IconTrash, IconChecklist, IconArrowLeft } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { usePo } from '@/data/procurement/queries'
import { useDeletePo } from '@/data/procurement/mutations'
import { ApiError } from '@/api/errors'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState } from '@/components/ErrorState'
import { ReceiveModal } from './ReceiveModal'

export function PoDetailPage({ poId }: { poId: string }) {
  const navigate = useNavigate()
  const po = usePo(poId)
  const deletePo = useDeletePo()
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (po.isLoading) {
    return (
      <Stack p="xl">
        <LoadingSkeleton rows={5} />
      </Stack>
    )
  }

  if (po.error && ApiError.is(po.error) && po.error.status === 404) {
    return (
      <Stack p="xl">
        <Title order={2}>Not found</Title>
        <Text c="dimmed">This purchase order doesn&apos;t exist.</Text>
        <Button component={Link} to="/purchase-orders" variant="subtle" leftSection={<IconArrowLeft size={14} />}>
          Back to all POs
        </Button>
      </Stack>
    )
  }

  if (po.error) {
    return (
      <Stack p="xl">
        <ErrorState error={po.error} />
      </Stack>
    )
  }

  if (!po.data) return null

  const isReceived = po.data.status === 'received'

  function handleDelete() {
    deletePo.mutate(
      { id: poId },
      {
        onSuccess: () => {
          notifications.show({ color: 'green', title: 'Deleted', message: 'Draft PO removed.' })
          void navigate({ to: '/purchase-orders', replace: true })
        },
        onError: (error) => {
          if (ApiError.is(error) && error.status === 409) {
            notifications.show({
              color: 'red',
              title: 'Already received',
              message: 'This PO has already been received elsewhere.',
            })
            void po.refetch()
            setConfirmDelete(false)
          } else if (ApiError.is(error)) {
            notifications.show({ color: 'red', title: 'Delete failed', message: error.detail ?? error.error })
          }
        },
      },
    )
  }

  return (
    <Stack p="xl" gap="lg" maw={1100}>
      <Group>
        <Button component={Link} to="/purchase-orders" variant="subtle" leftSection={<IconArrowLeft size={14} />}>
          All purchase orders
        </Button>
      </Group>

      <PageHeader
        contextTag={`PO-${poId}`}
        title={po.data.supplier_name}
        subtitle={po.data.supplier_contact ?? undefined}
        actions={
          !isReceived ? (
            <Group>
              <Button
                variant="subtle"
                leftSection={<IconEdit size={14} />}
                onClick={() =>
                  void navigate({ to: '/purchase-orders/$id/edit', params: { id: poId } })
                }
              >
                Edit
              </Button>
              <Button
                variant="subtle"
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
              <Button
                color="green"
                leftSection={<IconChecklist size={14} />}
                onClick={() => setReceiveOpen(true)}
              >
                Receive
              </Button>
            </Group>
          ) : undefined
        }
      />
      <Group gap="xs">
        <Badge color={isReceived ? 'green' : 'gray'} variant="light">
          {po.data.status}
        </Badge>
        <Text size="sm" c="dimmed">
          Created {new Date(po.data.created_at).toLocaleString()}
        </Text>
        {po.data.received_at && (
          <Text size="sm" c="dimmed">
            · Received {new Date(po.data.received_at).toLocaleString()}
          </Text>
        )}
      </Group>

      <Card withBorder p="lg">
        <Stack>
          <Title order={3}>Lines</Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Product</Table.Th>
                <Table.Th>Quantity</Table.Th>
                <Table.Th>Unit cost</Table.Th>
                <Table.Th>Line total</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {po.data.lines.map((line) => (
                <Table.Tr key={line.id}>
                  <Table.Td>
                    <Text ff="monospace" size="sm">
                      {line.product_id.slice(0, 8)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text ff="monospace" size="sm">{line.quantity}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text ff="monospace" size="sm">${line.unit_cost}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text ff="monospace" size="sm">
                      ${(Number(line.quantity) * Number(line.unit_cost)).toFixed(2)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>

      {isReceived && (
        <Box>
          <Text c="dimmed" size="sm">
            This PO is received and read-only. Receipted batches are visible from the Stock view.
          </Text>
        </Box>
      )}

      {!isReceived && (
        <ReceiveModal
          po={po.data}
          opened={receiveOpen}
          onClose={() => setReceiveOpen(false)}
          onReceived={() => {
            void po.refetch()
          }}
        />
      )}

      <Modal opened={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete draft?" size="md">
        <Stack>
          <Text>This permanently deletes the draft PO. Cannot be undone.</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setConfirmDelete(false)} disabled={deletePo.isPending}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} loading={deletePo.isPending}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
