/**
 * src/features/inventory/RecallModal.tsx
 *
 * F9 — Recall batch modal.
 * reason: required Textarea.
 * Idempotency-Key auto-attached by middleware.
 * 409 → caller maps to refetch + toast.
 */

import { useState, useEffect } from 'react'
import {
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Textarea,
} from '@mantine/core'
import { useRecallBatch } from '@/data/inventory/mutations'
import { ApiError } from '@/api/errors'

export type RecallModalProps = {
  batchId: string
  opened: boolean
  onClose: () => void
  onSuccess: () => void
  onError: (error: ApiError) => void
}

export function RecallModal({ batchId, opened, onClose, onSuccess, onError }: RecallModalProps) {
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [alertMsg, setAlertMsg] = useState<string | null>(null)

  const recallBatch = useRecallBatch()

  useEffect(() => {
    if (opened) {
      setReason('')
      setReasonError('')
      setAlertMsg(null)
      setConfirming(false)
    }
  }, [opened])

  function handleContinue() {
    if (!reason.trim()) {
      setReasonError('Reason is required')
      return
    }
    setReasonError('')
    setConfirming(true)
  }

  function handleSubmit() {
    setAlertMsg(null)
    recallBatch.mutate(
      { id: batchId, reason: reason.trim() },
      {
        onSuccess: () => {
          onSuccess()
        },
        onError: (error) => {
          onError(error)
        },
      },
    )
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Recall batch" size="md">
      <Stack>
        {alertMsg && <Alert color="red">{alertMsg}</Alert>}

        {!confirming ? (
          <>
            <Textarea
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.currentTarget.value)}
              required
              error={reasonError}
              placeholder="e.g. Listeria detected"
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={onClose}>
                Cancel
              </Button>
              <Button color="red" onClick={handleContinue}>
                Continue to confirmation
              </Button>
            </Group>
          </>
        ) : (
          <>
            <Alert color="red" variant="light">
              Recall this batch? Reason: <em>{reason}</em>. This blocks all future allocations.
            </Alert>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setConfirming(false)} disabled={recallBatch.isPending}>
                Back
              </Button>
              <Button color="red" onClick={handleSubmit} loading={recallBatch.isPending}>
                Confirm recall
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  )
}
