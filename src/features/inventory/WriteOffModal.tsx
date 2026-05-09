/**
 * src/features/inventory/WriteOffModal.tsx
 *
 * F6 — Write off modal (kind=write_off).
 * signed_quantity: must be negative (losses only).
 * notes: optional.
 * Idempotency-Key IS attached (apiClient conditional middleware for write_off).
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
import { notifications } from '@mantine/notifications'
import Decimal from 'decimal.js'
import { DecimalInput } from '@/components/DecimalInput'
import { useCreateMovement } from '@/data/inventory/mutations'
import { formatQty } from '@/utils/qty'
import type { BaseUnit } from '@/utils/qty'
import { ApiError } from '@/api/errors'

export type WriteOffModalProps = {
  batchId: string
  baseUnit: BaseUnit
  opened: boolean
  onClose: () => void
}

export function WriteOffModal({ batchId, baseUnit, opened, onClose }: WriteOffModalProps) {
  const [confirming, setConfirming] = useState(false)
  const [signedQty, setSignedQty] = useState('')
  const [qtyError, setQtyError] = useState('')
  const [notes, setNotes] = useState('')
  const [alertMsg, setAlertMsg] = useState<string | null>(null)

  const createMovement = useCreateMovement()

  useEffect(() => {
    if (opened) {
      setSignedQty('')
      setQtyError('')
      setNotes('')
      setAlertMsg(null)
      setConfirming(false)
    }
  }, [opened])

  function handleQtyChange(v: string) {
    setSignedQty(v)
    setQtyError('')
  }

  function handleContinue() {
    if (!signedQty || signedQty === '0') {
      setQtyError('Quantity is required')
      return
    }
    try {
      const d = new Decimal(signedQty)
      if (d.gte(0)) {
        setQtyError('Write-offs must be negative')
        return
      }
    } catch {
      setQtyError('Invalid quantity')
      return
    }
    setQtyError('')
    setConfirming(true)
  }

  function handleSubmit() {
    setAlertMsg(null)
    const absQty = new Decimal(signedQty).abs()
    createMovement.mutate(
      {
        batchId,
        body: { kind: 'write_off', signed_quantity: Number(signedQty), notes: notes.trim() || null },
      },
      {
        onSuccess: () => {
          notifications.show({
            color: 'green',
            title: `Wrote off ${formatQty(absQty.toFixed(4), baseUnit)}`,
            message: '',
          })
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
    <Modal opened={opened} onClose={onClose} title="Write off stock" size="md">
      <Stack>
        {alertMsg && <Alert color="red">{alertMsg}</Alert>}

        {!confirming ? (
          <>
            <DecimalInput
              label="Quantity (must be negative)"
              value={signedQty}
              onChange={handleQtyChange}
              placeholder="-5.0"
              precision={4}
              allowNegative
              {...(qtyError ? { error: qtyError } : {})}
            />
            <Textarea
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              placeholder="Reason for write-off"
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
              Write off{' '}
              <strong>
                {formatQty(new Decimal(signedQty).abs().toFixed(4), baseUnit)}
              </strong>{' '}
              from this batch? This is a permanent loss.
            </Alert>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setConfirming(false)} disabled={createMovement.isPending}>
                Back
              </Button>
              <Button color="red" onClick={handleSubmit} loading={createMovement.isPending}>
                Confirm write-off
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  )
}
