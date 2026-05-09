/**
 * src/features/catalog/ProductDetailPage.tsx
 *
 * Product detail page. Archetype A4 (Detail with action bar).
 * - Header: name, mono SKU, base_unit pill, archived badge
 * - Action bar: Save (PATCH name+description only), Archive/Delete (driven by batches existence)
 * - Details form: name (editable), SKU (always disabled — BE rejects it), description (editable)
 * - Movement audit subview at the bottom
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useForm } from '@mantine/form'
import {
  Title,
  Group,
  Button,
  TextInput,
  Textarea,
  Badge,
  Text,
  Stack,
  Box,
  Alert,
  Divider,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useProduct } from '@/data/catalog/queries'
import { useUpdateProduct } from '@/data/catalog/mutations'
import { useBatchesByProduct } from '@/data/inventory/queries'
import { ApiError } from '@/api/errors'
import { useActModalBus } from '@/stores/act-modal-bus'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { MovementAuditTable } from '@/components/MovementAuditTable'
import { ArchiveConfirmModal } from './ArchiveConfirmModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'

export function ProductDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()

  const { data: product, isLoading, isError, error } = useProduct(id)
  const {
    data: batchesData,
    isLoading: batchesLoading,
    refetch: refetchBatches,
  } = useBatchesByProduct(id, { limit: 1 })

  const updateProduct = useUpdateProduct()

  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  // Act modal bus — opened from CmdkPalette (ILE-9 Step 8)
  const busRequest = useActModalBus((s) => s.request)
  const clearBus = useActModalBus((s) => s.clear)
  useEffect(() => {
    if (busRequest?.kind === 'archive' && busRequest.productId === id) {
      setArchiveModalOpen(true)
      clearBus()
    }
  }, [busRequest, id, clearBus])

  const form = useForm({
    initialValues: {
      name: '',
      sku: '',
      description: '',
    },
    validate: {
      name: (v) => (v.trim().length === 0 ? 'Name is required' : null),
    },
  })

  // Sync form values when product loads
  useEffect(() => {
    if (product) {
      form.setValues({
        name: product.name,
        sku: product.sku,
        description: product.description,
      })
      form.resetDirty({
        name: product.name,
        sku: product.sku,
        description: product.description,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, product?.name, product?.description, product?.sku])

  // 404 cross-owner — render Not found
  if (isError && ApiError.is(error) && error.status === 404) {
    return (
      <Box p="md">
        <Stack align="center" py="xl" gap="sm">
          <Title order={3}>Not found</Title>
          <Text c="dimmed">This product doesn&apos;t exist or you don&apos;t have access.</Text>
          <Button
            variant="subtle"
            onClick={() =>
              void navigate({
                to: '/products',
                search: { page: 1, search: undefined, archived: undefined },
              })
            }
          >
            Back to products
          </Button>
        </Stack>
      </Box>
    )
  }

  if (isError) {
    return (
      <Box p="md">
        <Alert color="red">
          {ApiError.is(error) ? (error.detail ?? error.error) : 'An error occurred'}
        </Alert>
      </Box>
    )
  }

  if (isLoading || !product) {
    return (
      <Box p="md">
        <LoadingSkeleton rows={5} />
      </Box>
    )
  }

  const hasBatches = (batchesData?.total ?? 0) > 0

  function handleSave(values: typeof form.values) {
    updateProduct.mutate(
      { id, name: values.name, description: values.description },
      {
        onError: (err) => {
          if (ApiError.is(err) && err.fields) {
            form.setErrors(err.fields)
          } else {
            notifications.show({
              color: 'red',
              title: 'Couldn\'t save',
              message: "Couldn't save — try again.",
            })
          }
        },
      },
    )
  }

  return (
    <Box p="md">
      <Stack gap="lg">
        {/* Header */}
        <Stack gap="xs">
          <Title order={2}>{product.name}</Title>
          <Group gap="sm">
            <Text ff="monospace" size="sm" c="dimmed">
              {product.sku}
            </Text>
            <Badge variant="outline" size="sm">
              Base unit: {product.base_unit}
            </Badge>
            {product.archived_at && (
              <Badge color="gray" size="sm">
                Archived
              </Badge>
            )}
          </Group>
        </Stack>

        {/* Action bar */}
        <Group gap="sm">
          {batchesLoading ? (
            <>
              <Button color="red" variant="outline" size="sm" disabled>
                Delete
              </Button>
            </>
          ) : hasBatches ? (
            <Button
              color="orange"
              variant="outline"
              size="sm"
              onClick={() => setArchiveModalOpen(true)}
              disabled={!!product.archived_at}
            >
              Archive
            </Button>
          ) : (
            <Button
              color="red"
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
            >
              Delete
            </Button>
          )}
        </Group>

        <Divider />

        {/* Details form */}
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack gap="sm">
            <TextInput
              label="Name"
              {...form.getInputProps('name')}
            />

            <TextInput
              label="SKU"
              ff="monospace"
              disabled
              {...form.getInputProps('sku')}
            />

            <Textarea
              label="Description"
              {...form.getInputProps('description')}
            />

            <Group justify="flex-end">
              <Button
                type="submit"
                loading={updateProduct.isPending}
                disabled={!form.isDirty()}
              >
                Save
              </Button>
            </Group>
          </Stack>
        </form>

        <Divider />

        {/* Movement audit subview */}
        <Stack gap="sm">
          <Title order={4}>Movement history</Title>
          <MovementAuditTable productId={id} />
        </Stack>
      </Stack>

      {/* Modals */}
      <ArchiveConfirmModal
        productId={id}
        opened={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        onRefetchBatches={() => void refetchBatches()}
      />

      <DeleteConfirmModal
        productId={id}
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onRefetchBatches={() => void refetchBatches()}
      />
    </Box>
  )
}
