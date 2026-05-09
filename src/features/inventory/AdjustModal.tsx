/**
 * src/features/inventory/AdjustModal.tsx
 *
 * F5 — Adjust modal (kind=adjustment).
 * signed_quantity: DecimalInput (negatives allowed).
 * notes: required Textarea.
 * No Idempotency-Key (BE-D7 / SPEC §2.5 — adjust is not idempotent).
 */

import { useState, useEffect } from 'react'
import {
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { DecimalInput } from '@/components/DecimalInput'
import { useCreateMovement } from '@/data/inventory/mutations'
import { ApiError } from '@/api/errors'

export type AdjustModalProps = {
  batchId: string
  opened: boolean
  onClose: () => void
}

export function AdjustModal({ batchId, opened, onClose }: AdjustModalProps) {
  const [confirming, setConfirming] = useState(false)
  const [signedQty, setSignedQty] = useState('')
  const [notes, setNotes] = useState('')
  const [notesError, setNotesError] = useState('')
  const [alertMsg, setAlertMsg] = useState<string | null>(null)

  const createMovement = useCreateMovement()

  useEffect(() => {
    if (opened) {
      setSignedQty('')
      setNotes('')
      setNotesError('')
      setAlertMsg(null)
      setConfirming(false)
    }
  }, [opened])

  function handleContinue() {
    if (!notes.trim()) {
      setNotesError('Notes are required')
      return
    }
    if (!signedQty || signedQty === '0' || signedQty === '-') {
      return
    }
    setNotesError('')
    setConfirming(true)
  }

  function handleSubmit() {
    setAlertMsg(null)
    createMovement.mutate(
      {
        batchId,
        body: { kind: 'adjustment', signed_quantity: Number(signedQty), notes: notes.trim() },
      },
      {
        onSuccess: () => {
          notifications.show({ color: 'green', title: 'Adjustment recorded', message: '' })
          onClose()
        },
        onError: (error) => {
          if (ApiError.is(error)) {
            setAlertMsg(error.detail ?? error.error)
            setConfirming(false)
          }
        },
      },
    )
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Adjust on-hand" size="md">
      <Stack>
        {alertMsg && <Alert color="red">{alertMsg}</Alert>}

        {!confirming ? (
          <>
            <DecimalInput
              label="Signed quantity (negative for loss, positive for gain)"
              value={signedQty}
              onChange={setSignedQty}
              placeholder="e.g. -2.5"
              precision={4}
              allowNegative
            />
            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              required
              error={notesError}
              placeholder="Reason for adjustment"
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleContinue}>Continue to confirmation</Button>
            </Group>
          </>
        ) : (
          <>
            <Text>
              Adjust on-hand by <strong>{signedQty}</strong>? Reason: <em>{notes}</em>
            </Text>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setConfirming(false)} disabled={createMovement.isPending}>
                Back
              </Button>
              <Button onClick={handleSubmit} loading={createMovement.isPending}>
                Confirm
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  )
}
