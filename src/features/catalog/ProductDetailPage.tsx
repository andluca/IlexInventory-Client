/**
 * src/features/catalog/ProductDetailPage.tsx — A4 orchestrator (≤60 non-blank LOC)
 * Orchestrates: param read, data hooks, modal state, act-modal-bus, 404/error/loading branches,
 * form ownership (passed to ProductDetailForm), MovementAuditTable.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useForm } from '@mantine/form'
import { Badge, Button, Text, Stack, Box, Divider, Group } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useProduct } from '@/data/catalog/queries'
import { useUpdateProduct } from '@/data/catalog/mutations'
import { useBatchesByProduct } from '@/data/inventory/queries'
import { ApiError } from '@/api/errors'
import { useActModalBus } from '@/stores/act-modal-bus'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { MovementAuditTable } from '@/components/MovementAuditTable'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState } from '@/components/ErrorState'
import { ArchiveConfirmModal } from './ArchiveConfirmModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { ProductDetailActions } from './ProductDetailActions'
import { ProductDetailForm } from './ProductDetailForm'

export function ProductDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const { data: product, isLoading, isError, error } = useProduct(id)
  const { data: batchesData, isLoading: batchesLoading, refetch: refetchBatches } = useBatchesByProduct(id, { limit: 1 })
  const updateProduct = useUpdateProduct()
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const busRequest = useActModalBus((s) => s.request)
  const clearBus = useActModalBus((s) => s.clear)
  useEffect(() => {
    if (busRequest?.kind === 'archive' && busRequest.productId === id) { setArchiveOpen(true); clearBus() }
  }, [busRequest, id, clearBus])
  const form = useForm({
    initialValues: { name: '', sku: '', description: '' },
    validate: { name: (v) => (v.trim().length === 0 ? 'Name is required' : null) },
  })
  useEffect(() => {
    if (product) {
      form.setValues({ name: product.name, sku: product.sku, description: product.description })
      form.resetDirty({ name: product.name, sku: product.sku, description: product.description })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, product?.name, product?.description, product?.sku])
  if (isError && ApiError.is(error) && error.status === 404) {
    return <Box p="md"><Stack align="center" py="xl" gap="sm">
      <Text fw={700}>Not found</Text>
      <Text c="dimmed">This product doesn&apos;t exist or you don&apos;t have access.</Text>
      <Button variant="subtle" onClick={() => void navigate({ to: '/products', search: { page: 1, search: undefined, archived: undefined } })}>Back to products</Button>
    </Stack></Box>
  }
  if (isError) return <Box p="md"><ErrorState error={error} /></Box>
  if (isLoading || !product) return <Box p="md"><LoadingSkeleton rows={5} /></Box>
  function handleSave(values: typeof form.values) {
    updateProduct.mutate({ id, name: values.name, description: values.description }, {
      onError: (err) => {
        if (ApiError.is(err) && err.fields) form.setErrors(err.fields)
        else notifications.show({ color: 'red', title: "Couldn't save", message: "Couldn't save — try again." })
      },
    })
  }
  return (
    <Box p="md"><Stack gap="lg">
      <PageHeader
        contextTag={product.sku}
        title={product.name}
        subtitle={product.archived_at ? 'Archived' : undefined}
        actions={
          <ProductDetailActions
            product={product}
            hasBatches={(batchesData?.total ?? 0) > 0}
            batchesLoading={batchesLoading}
            onArchive={() => setArchiveOpen(true)}
            onDelete={() => setDeleteOpen(true)}
          />
        }
      />
      <Group gap="sm">
        <Badge variant="outline" size="sm">Base unit: {product.base_unit}</Badge>
      </Group>
      <Divider />
      <ProductDetailForm form={form} onSubmit={handleSave} pending={updateProduct.isPending} />
      <Divider />
      <MovementAuditTable productId={id} />
    </Stack>
    <ArchiveConfirmModal productId={id} opened={archiveOpen} onClose={() => setArchiveOpen(false)} onRefetchBatches={() => void refetchBatches()} />
    <DeleteConfirmModal productId={id} opened={deleteOpen} onClose={() => setDeleteOpen(false)} onRefetchBatches={() => void refetchBatches()} />
    </Box>
  )
}
