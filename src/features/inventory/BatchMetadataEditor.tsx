/**
 * src/features/inventory/BatchMetadataEditor.tsx
 *
 * F12 — Inline metadata correction for batch_code and expiration_date.
 * PATCH allowlist: only batch_code + expiration_date are editable in the UI.
 * All other fields (unit_cost, on_hand, is_recalled, etc.) are read-only here.
 * No optimistic update — BE writes a metadata_correction movement; we refetch.
 */

import { useState } from 'react'
import { Button, Group, Stack, Text, TextInput } from '@mantine/core'
import { IconEdit } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { usePatchBatch } from '@/data/inventory/mutations'
import type { BatchResponse } from '@/data/inventory/mutations'
import { ApiError } from '@/api/errors'

export type BatchMetadataEditorProps = {
  batch: BatchResponse
  onSaved?: () => void
}

export function BatchMetadataEditor({ batch, onSaved }: BatchMetadataEditorProps) {
  const [editing, setEditing] = useState(false)
  const [batchCode, setBatchCode] = useState(batch.batch_code)
  const [expirationDate, setExpirationDate] = useState(batch.expiration_date ?? '')

  const patchBatch = usePatchBatch()

  function handleEdit() {
    setBatchCode(batch.batch_code)
    setExpirationDate(batch.expiration_date ?? '')
    setEditing(true)
  }

  function handleCancel() {
    setEditing(false)
    setBatchCode(batch.batch_code)
    setExpirationDate(batch.expiration_date ?? '')
  }

  function handleSave() {
    const vars: {
      id: string
      batch_code?: string
      expiration_date?: string | null
      clear_expiration?: boolean
    } = { id: batch.id }

    // Only send changed fields
    if (batchCode !== batch.batch_code) {
      vars.batch_code = batchCode
    }

    const originalExpiration = batch.expiration_date ?? ''
    if (expirationDate !== originalExpiration) {
      if (expirationDate === '') {
        vars.expiration_date = null
        vars.clear_expiration = true
      } else {
        vars.expiration_date = expirationDate
      }
    }

    // Always include clear_expiration (required field with default false)
    if (vars.clear_expiration === undefined) {
      vars.clear_expiration = false
    }

    patchBatch.mutate(vars, {
      onSuccess: () => {
        notifications.show({ color: 'green', title: 'Metadata updated', message: 'Batch metadata saved.' })
        setEditing(false)
        onSaved?.()
      },
      onError: (error) => {
        if (ApiError.is(error)) {
          notifications.show({
            color: 'red',
            title: "Couldn't save — try again.",
            message: error.detail ?? error.error,
          })
        }
      },
    })
  }

  if (!editing) {
    return (
      <Group gap="md" align="center">
        <Stack gap={2}>
          <Text ff="monospace" size="sm" fw={600}>
            {batch.batch_code}
          </Text>
          {batch.expiration_date && (
            <Text size="sm" c="dimmed">
              Expires: {batch.expiration_date}
            </Text>
          )}
        </Stack>
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconEdit size={12} />}
          onClick={handleEdit}
        >
          Edit metadata
        </Button>
      </Group>
    )
  }

  return (
    <Stack gap="sm">
      <TextInput
        label="Batch code"
        value={batchCode}
        onChange={(e) => setBatchCode(e.currentTarget.value)}
        aria-label="Batch code"
      />
      <TextInput
        label="Expiration date"
        type="date"
        value={expirationDate}
        onChange={(e) => setExpirationDate(e.currentTarget.value)}
        aria-label="Expiration date"
      />
      <Group gap="xs">
        <Button
          size="xs"
          onClick={handleSave}
          loading={patchBatch.isPending}
        >
          Save
        </Button>
        <Button
          size="xs"
          variant="subtle"
          onClick={handleCancel}
          disabled={patchBatch.isPending}
        >
          Cancel
        </Button>
      </Group>
    </Stack>
  )
}
