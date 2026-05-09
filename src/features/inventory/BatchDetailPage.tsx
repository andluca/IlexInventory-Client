/**
 * src/features/inventory/BatchDetailPage.tsx
 *
 * Batch detail (R6, F4, F5, F6, F9, F10, F12 per SPEC §3.5). Archetype A4.
 *
 * - useBatch(id) resolves batch
 * - useProduct(batch.product_id) resolves product name + base_unit
 * - Recall banner when is_recalled
 * - Action bar: Adjust, Write off, Recall, New batch, Edit metadata
 * - MovementAuditTable for R6 movement audit
 */

import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconArrowLeft, IconPlus } from '@tabler/icons-react'
import { useBatch } from '@/data/inventory/queries'
import { useProduct } from '@/data/catalog/queries'
import { ApiError } from '@/api/errors'
import { formatMoney } from '@/utils/money'
import { formatQty } from '@/utils/qty'
import type { BaseUnit } from '@/utils/qty'
import { MovementAuditTable } from '@/components/MovementAuditTable'
import { BatchMetadataEditor } from './BatchMetadataEditor'
import { AdjustModal } from './AdjustModal'
import { WriteOffModal } from './WriteOffModal'
import { RecallModal } from './RecallModal'
import { UnRecallModal } from './UnRecallModal'
import { ManualBatchModal } from './ManualBatchModal'

export function BatchDetailPage({ batchId }: { batchId: string }) {
  const batch = useBatch(batchId)
  const productId = batch.data?.product_id ?? ''
  const product = useProduct(productId, { enabled: Boolean(productId) })

  const [adjustOpen, setAdjustOpen] = useState(false)
  const [writeOffOpen, setWriteOffOpen] = useState(false)
  const [recallOpen, setRecallOpen] = useState(false)
  const [unRecallOpen, setUnRecallOpen] = useState(false)
  const [manualBatchOpen, setManualBatchOpen] = useState(false)

  if (batch.isLoading) {
    return (
      <Stack p="xl">
        <Text c="dimmed">Loading…</Text>
      </Stack>
    )
  }

  if (batch.error && ApiError.is(batch.error) && batch.error.status === 404) {
    return (
      <Stack p="xl">
        <Title order={2}>Not found</Title>
        <Text c="dimmed">This batch doesn&apos;t exist or you don&apos;t have access.</Text>
        <Button
          component={Link}
          to="/stock"
          variant="subtle"
          leftSection={<IconArrowLeft size={14} />}
          aria-label="Back to stock"
        >
          Back to stock
        </Button>
      </Stack>
    )
  }

  if (batch.error) {
    return (
      <Stack p="xl">
        <Alert color="red">
          {ApiError.is(batch.error) ? (batch.error.detail ?? batch.error.error) : 'Failed to load'}
        </Alert>
      </Stack>
    )
  }

  if (!batch.data) return null

  const b = batch.data
  const baseUnit = (product.data?.base_unit ?? 'unit') as BaseUnit
  const isRecalled = b.is_recalled

  function handleRecallSuccess() {
    void batch.refetch()
    notifications.show({ color: 'green', title: 'Batch recalled', message: '' })
    setRecallOpen(false)
  }

  function handleRecallError(error: ApiError) {
    if (error.status === 409) {
      notifications.show({
        color: 'red',
        title: 'Already recalled',
        message: 'This batch has already been recalled elsewhere.',
      })
      void batch.refetch()
    } else {
      notifications.show({
        color: 'red',
        title: "Couldn't recall — try again.",
        message: error.detail ?? error.error,
      })
    }
    setRecallOpen(false)
  }

  return (
    <Stack p="xl" gap="lg" maw={1100}>
      <Group>
        <Button
          component={Link}
          to="/stock"
          variant="subtle"
          leftSection={<IconArrowLeft size={14} />}
        >
          All stock
        </Button>
      </Group>

      {/* Recall banner */}
      {isRecalled && (
        <Alert color="red" title="Recalled">
          Recalled — {b.recall_reason}. Recalled at {b.recalled_at ? new Date(b.recalled_at).toLocaleString() : '—'}.
          <Button
            variant="subtle"
            color="red"
            size="xs"
            mt="xs"
            onClick={() => setUnRecallOpen(true)}
          >
            Un-recall
          </Button>
        </Alert>
      )}

      {/* Header */}
      <Card withBorder p="lg">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Title order={2}>{product.data?.name ?? b.product_id.slice(0, 8)}</Title>
              <Text ff="monospace" fw={600}>
                {b.batch_code}
              </Text>
              {b.expiration_date && (
                <Badge color="orange" variant="light">
                  Expires: {b.expiration_date}
                </Badge>
              )}
              <Group gap="md">
                <Text size="sm">
                  On hand: <strong>{formatQty(b.on_hand, baseUnit)}</strong>
                </Text>
                <Text size="sm">
                  Unit cost: <strong>{formatMoney(b.unit_cost)}</strong>
                </Text>
              </Group>
            </Stack>
          </Group>

          {/* Metadata editor */}
          <BatchMetadataEditor batch={b} />
        </Stack>
      </Card>

      {/* Action bar */}
      <Group gap="sm">
        <Button
          onClick={() => setAdjustOpen(true)}
          disabled={isRecalled}
          variant="light"
        >
          Adjust
        </Button>
        <Button
          onClick={() => setWriteOffOpen(true)}
          disabled={isRecalled}
          variant="light"
          color="orange"
        >
          Write off
        </Button>
        <Button
          onClick={() => setRecallOpen(true)}
          disabled={isRecalled}
          variant="light"
          color="red"
        >
          Recall
        </Button>
        <Button
          onClick={() => setManualBatchOpen(true)}
          disabled={isRecalled}
          variant="light"
          leftSection={<IconPlus size={14} />}
        >
          New batch
        </Button>
        {isRecalled && (
          <Button
            onClick={() => setUnRecallOpen(true)}
            variant="light"
            color="gray"
          >
            Un-recall
          </Button>
        )}
      </Group>

      {/* Movement audit */}
      <Card withBorder p="lg">
        <Stack>
          <Title order={3}>Movement audit</Title>
          <MovementAuditTable batchId={batchId} />
        </Stack>
      </Card>

      {/* Modals */}
      <AdjustModal
        batchId={batchId}
        opened={adjustOpen}
        onClose={() => setAdjustOpen(false)}
      />
      <WriteOffModal
        batchId={batchId}
        baseUnit={baseUnit}
        opened={writeOffOpen}
        onClose={() => setWriteOffOpen(false)}
      />
      <RecallModal
        batchId={batchId}
        opened={recallOpen}
        onClose={() => setRecallOpen(false)}
        onSuccess={handleRecallSuccess}
        onError={handleRecallError}
      />
      <UnRecallModal
        batchId={batchId}
        opened={unRecallOpen}
        onClose={() => setUnRecallOpen(false)}
        onSuccess={() => {
          void batch.refetch()
          notifications.show({ color: 'green', title: 'Recall reversed', message: '' })
          setUnRecallOpen(false)
        }}
      />
      <ManualBatchModal
        opened={manualBatchOpen}
        onClose={() => setManualBatchOpen(false)}
        defaultProductId={b.product_id}
      />
    </Stack>
  )
}
