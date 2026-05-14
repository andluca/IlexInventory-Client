/**
 * src/features/procurement/PoDraftPage.tsx
 *
 * PO draft page — handles both /new and /:id/edit.
 * Form: supplier_name (required), supplier_contact (optional), lines[]
 * On submit: useCreatePo or useUpdatePo. Both invalidate the lists; mutation returns id.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Alert,
  Button,
  Group,
  Stack,
  TextInput,
  Title,
  Text,
} from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { usePo } from '@/data/procurement/queries'
import { useCreatePo, useUpdatePo } from '@/data/procurement/mutations'
import { ApiError } from '@/api/errors'
import { PageHeader } from '@/components/PageHeader'
import { PoLineEditor, type DraftLine } from './PoLineEditor'

interface PoDraftPageProps {
  poId?: string
}

export function PoDraftPage({ poId }: PoDraftPageProps) {
  const navigate = useNavigate()
  const isEdit = !!poId
  const existing = usePo(poId ?? '')
  const createPo = useCreatePo()
  const updatePo = useUpdatePo()

  const form = useForm<{
    supplier_name: string
    supplier_contact: string
    lines: DraftLine[]
  }>({
    initialValues: { supplier_name: '', supplier_contact: '', lines: [] },
    validate: {
      supplier_name: (v) => (v.trim().length === 0 ? 'Supplier name is required' : null),
      lines: (v) => (v.length === 0 ? 'Add at least one line' : null),
    },
  })

  // Hydrate the form when editing an existing draft
  useEffect(() => {
    if (!isEdit || !existing.data) return
    if (existing.data.status === 'received') {
      // Edit not allowed post-receive — kick to detail
      void navigate({ to: '/purchase-orders/$id', params: { id: poId! }, replace: true })
      return
    }
    form.setValues({
      supplier_name: existing.data.supplier_name,
      supplier_contact: existing.data.supplier_contact ?? '',
      lines: existing.data.lines.map((l) => ({
        product_id: l.product_id,
        quantity: l.quantity,
        unit_cost: l.unit_cost,
      })),
    })
    form.resetDirty()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing.data, isEdit, poId])

  const [alertMsg, setAlertMsg] = useState<string | null>(null)

  function handleSubmit(values: typeof form.values) {
    setAlertMsg(null)
    const body = {
      supplier_name: values.supplier_name,
      ...(values.supplier_contact ? { supplier_contact: values.supplier_contact } : {}),
      lines: values.lines.map((l) => ({
        product_id: l.product_id,
        quantity: Number(l.quantity),
        unit_cost: Number(l.unit_cost),
      })),
    }

    if (isEdit && poId) {
      updatePo.mutate(
        { id: poId, ...body },
        {
          onSuccess: () => {
            void navigate({ to: '/purchase-orders/$id', params: { id: poId }, replace: true })
          },
          onError: (error) => {
            if (ApiError.is(error) && error.status === 409) {
              setAlertMsg('This PO has already been received elsewhere.')
              void existing.refetch()
            } else if (ApiError.is(error)) {
              setAlertMsg(error.detail ?? error.error)
            }
          },
        },
      )
    } else {
      createPo.mutate(body, {
        onSuccess: (po) => {
          void navigate({ to: '/purchase-orders/$id', params: { id: po.id }, replace: true })
        },
        onError: (error) => {
          if (ApiError.is(error)) setAlertMsg(error.detail ?? error.error)
        },
      })
    }
  }

  if (isEdit && existing.isLoading) {
    return (
      <Stack p="xl">
        <Text c="dimmed">Loading draft…</Text>
      </Stack>
    )
  }

  if (isEdit && existing.error && ApiError.is(existing.error) && existing.error.status === 404) {
    return (
      <Stack p="xl">
        <Title order={2}>Not found</Title>
        <Text c="dimmed">This purchase order doesn&apos;t exist or has been deleted.</Text>
      </Stack>
    )
  }

  const submitting = createPo.isPending || updatePo.isPending

  return (
    <Stack p="xl" gap="lg" maw={960}>
      <PageHeader title={isEdit ? 'Edit purchase order' : 'New purchase order'} />

      {alertMsg && <Alert color="red">{alertMsg}</Alert>}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="Supplier name"
              placeholder="Acme Coffee Roasters"
              {...form.getInputProps('supplier_name')}
              required
            />
            <TextInput
              label="Supplier contact (optional)"
              placeholder="orders@acme.example"
              {...form.getInputProps('supplier_contact')}
            />
          </Group>

          <Stack gap="xs">
            <Text fw={500}>Lines</Text>
            <PoLineEditor
              lines={form.values.lines}
              onChange={(lines) => form.setFieldValue('lines', lines)}
              disabled={submitting}
            />
            <Group>
              <Button
                variant="subtle"
                leftSection={<IconPlus size={14} />}
                onClick={() =>
                  form.setFieldValue('lines', [
                    ...form.values.lines,
                    { product_id: '', quantity: '0', unit_cost: '0' },
                  ])
                }
                disabled={submitting}
              >
                Add line
              </Button>
            </Group>
            {form.errors.lines && (
              <Text c="red" size="sm">
                {form.errors.lines}
              </Text>
            )}
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => void navigate({ to: '/purchase-orders' })} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Save draft' : 'Create draft'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  )
}
