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

import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconArrowLeft, IconPlus, IconAlertOctagon } from '@tabler/icons-react'
import { useBatch } from '@/data/inventory/queries'
import { useProduct } from '@/data/catalog/queries'
import { ApiError } from '@/api/errors'
import { formatMoney } from '@/utils/money'
import { formatQty } from '@/utils/qty'
import type { BaseUnit } from '@/utils/qty'
import { MovementAuditTable } from '@/components/MovementAuditTable'
import { CsvExportButton } from '@/components/CsvExportButton'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState } from '@/components/ErrorState'
import { StatusBanner } from '@/components/StatusBanner'
import { useActModalBus } from '@/stores/act-modal-bus'
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

  // Act modal bus — opened from CmdkPalette (ILE-9 Step 8)
  const busRequest = useActModalBus((s) => s.request)
  const clearBus = useActModalBus((s) => s.clear)

  useEffect(() => {
    if (busRequest?.kind === 'recall' && busRequest.batchId === batchId) {
      setRecallOpen(true)
      clearBus()
    } else if (busRequest?.kind === 'unrecall' && busRequest.batchId === batchId) {
      setUnRecallOpen(true)
      clearBus()
    }
  }, [busRequest, batchId, clearBus])

  if (batch.isLoading) {
    return (
      <Stack p="xl">
        <LoadingSkeleton rows={5} />
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
        <ErrorState error={batch.error} />
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
        <StatusBanner tone="clay" icon={<IconAlertOctagon size={16} />}>
          This batch was recalled on {b.recalled_at ? new Date(b.recalled_at).toLocaleString() : '—'}.
        </StatusBanner>
      )}

      {/* Header */}
      <PageHeader
        contextTag={b.batch_code}
        title={product.data?.name ?? b.product_id.slice(0, 8)}
      />
      <Card withBorder p="lg">
        <Stack gap="sm">
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
        <Button
          component={Link}
          to="/batches/$id/recall-report"
          params={{ id: batchId } as never}
          variant="light"
          color="blue"
        >
          View recall report
        </Button>
      </Group>

      {/* Movement audit */}
      <Card withBorder p="lg">
        <Stack>
          <Group justify="space-between" align="center">
            <Title order={3}>Movement audit</Title>
            <CsvExportButton
              path="/movements"
              params={{ batch_id: batchId }}
              label="Download audit CSV"
            />
          </Group>
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
