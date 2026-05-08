/**
 * src/features/procurement/ReceiveModal.tsx
 *
 * F3 terminal action — receive a draft PO.
 * For each line: batch_code (required, supplier-stamped) + expiration_date (optional).
 * Submit → useReceivePo with Idempotency-Key (auto-attached by apiClient).
 * 409 → refetch + toast "This PO has already been received elsewhere." (per SPEC §2.5).
 */

import { useState, useEffect } from 'react'
import {
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useReceivePo, type ReceiveLineRequest } from '@/data/procurement/mutations'
import { ApiError } from '@/api/errors'
import type { PurchaseOrderResponse } from '@/data/procurement/queries'

export function ReceiveModal({
  po,
  opened,
  onClose,
  onReceived,
}: {
  po: PurchaseOrderResponse
  opened: boolean
  onClose: () => void
  onReceived: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [lines, setLines] = useState<ReceiveLineRequest[]>([])
  const [alertMsg, setAlertMsg] = useState<string | null>(null)
  const receive = useReceivePo()

  useEffect(() => {
    if (opened) {
      setLines(po.lines.map((l) => ({ line_id: l.id, batch_code: '' })))
      setAlertMsg(null)
      setConfirming(false)
    }
  }, [opened, po.lines])

  const allBatchCodesFilled = lines.every((l) => l.batch_code.trim().length > 0)

  function update(idx: number, patch: Partial<ReceiveLineRequest>) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  function handleSubmit() {
    setAlertMsg(null)
    receive.mutate(
      { id: po.id, lines },
      {
        onSuccess: () => {
          notifications.show({
            color: 'green',
            title: 'Received',
            message: `${po.lines.length} line(s) received — batches created.`,
          })
          onReceived()
          onClose()
        },
        onError: (error) => {
          if (ApiError.is(error) && error.status === 409) {
            setAlertMsg('This PO has already been received elsewhere.')
            onReceived() // refetch from caller
          } else if (ApiError.is(error)) {
            setAlertMsg(error.detail ?? error.error)
          }
        },
      },
    )
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Receive purchase order" size="lg">
      <Stack>
        {alertMsg && <Alert color="red">{alertMsg}</Alert>}

        <Text size="sm" c="dimmed">
          Receiving creates one batch per line and locks this PO from further edits. Atomic — partial receipts are not supported.
        </Text>

        <Table withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Line</Table.Th>
              <Table.Th>Quantity</Table.Th>
              <Table.Th>Batch code</Table.Th>
              <Table.Th>Expiration (optional)</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {po.lines.map((line, idx) => (
              <Table.Tr key={line.id}>
                <Table.Td>
                  <Text ff="monospace" size="xs">
                    {line.id.slice(0, 8)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text ff="monospace" size="sm">
                    {line.quantity}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <TextInput
                    placeholder="LOT-2026-A11"
                    value={lines[idx]?.batch_code ?? ''}
                    onChange={(e) => update(idx, { batch_code: e.currentTarget.value })}
                    required
                  />
                </Table.Td>
                <Table.Td>
                  <TextInput
                    type="date"
                    value={lines[idx]?.expiration_date ?? ''}
                    onChange={(e) =>
                      update(idx, {
                        expiration_date: e.currentTarget.value || null,
                      })
                    }
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {!confirming ? (
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => setConfirming(true)} disabled={!allBatchCodesFilled}>
              Continue
            </Button>
          </Group>
        ) : (
          <>
            <Alert color="yellow" variant="light">
              Confirm receive — this can&apos;t be undone.
            </Alert>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setConfirming(false)} disabled={receive.isPending}>
                Back
              </Button>
              <Button color="green" onClick={handleSubmit} loading={receive.isPending}>
                Confirm receive
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  )
}
