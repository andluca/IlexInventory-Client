/**
 * src/features/sales/SoDraftPage.tsx
 *
 * SO draft page — handles both /sales-orders/new and /sales-orders/:id/edit.
 * Layout archetype A5 (Draft with side preview) — 60/40 two-column layout.
 * Left: customer form + line editor + admin-override disclosure.
 * Right: FefoPreview.
 *
 * On /new: empty form. On first save, URL replaces to /:id/edit.
 * On /:id/edit: loads existing draft; if status !== 'draft', redirects to detail.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Alert,
  Button,
  Collapse,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useSo } from '@/data/sales/queries'
import { usePreviewSo } from '@/data/sales/queries'
import { useCreateSo, useUpdateSo } from '@/data/sales/mutations'
import { ApiError } from '@/api/errors'
import { SoLineEditor, type DraftSoLine } from './SoLineEditor'
import { FefoPreview } from './FefoPreview'
import { CommitConfirmModal } from './CommitConfirmModal'
import { AllocationOverrideEditor, type AllocationOverride } from './AllocationOverrideEditor'
import type { SalesOrderResponse } from '@/data/sales/queries'

type ShortfallEnvelope = {
  product_id: string
  required: string
  available: string
}

interface SoDraftPageProps {
  soId?: string
}

export function SoDraftPage({ soId }: SoDraftPageProps) {
  const navigate = useNavigate()
  const isEdit = !!soId
  const existing = useSo(soId ?? '')
  const createSo = useCreateSo()
  const updateSo = useUpdateSo()

  const [savedId, setSavedId] = useState<string | null>(soId ?? null)
  const [commitOpen, setCommitOpen] = useState(false)
  const [shortfall, setShortfall] = useState<ShortfallEnvelope | null>(null)
  const [overrides, setOverrides] = useState<AllocationOverride[]>([])
  const [alertMsg, setAlertMsg] = useState<string | null>(null)
  const [overrideOpen, setOverrideOpen] = useState(false)

  const preview = usePreviewSo(savedId ?? '', { enabled: !!savedId })

  const form = useForm<{
    customer_name: string
    customer_contact: string
    lines: DraftSoLine[]
  }>({
    initialValues: { customer_name: '', customer_contact: '', lines: [] },
    validate: {
      customer_name: (v) => (v.trim().length === 0 ? 'Customer name is required' : null),
      lines: (v) => (v.length === 0 ? 'Add at least one line' : null),
    },
  })

  // Hydrate form from existing SO
  useEffect(() => {
    if (!isEdit || !existing.data) return
    if (existing.data.status !== 'draft') {
      void navigate({ to: '/sales-orders/$id', params: { id: soId! }, replace: true })
      return
    }
    form.setValues({
      customer_name: existing.data.customer_name,
      customer_contact: existing.data.customer_contact ?? '',
      lines: existing.data.lines.map((l) => ({
        product_id: l.product_id,
        quantity: l.quantity,
        sell_price: l.sell_price,
      })),
    })
    form.resetDirty()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing.data, isEdit, soId])

  // Debounce preview refresh on form changes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!savedId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void preview.refetch()
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values, savedId])

  function handleSubmit(values: typeof form.values) {
    setAlertMsg(null)
    const body = {
      customer_name: values.customer_name,
      ...(values.customer_contact ? { customer_contact: values.customer_contact } : {}),
      lines: values.lines.map((l) => ({
        product_id: l.product_id,
        quantity: Number(l.quantity),
        sell_price: Number(l.sell_price),
      })),
    }

    if (isEdit && soId) {
      updateSo.mutate(
        { id: soId, ...body },
        {
          onSuccess: () => {
            void preview.refetch()
          },
          onError: (error) => {
            if (ApiError.is(error) && error.status === 409) {
              setAlertMsg('This sales order has already been committed elsewhere.')
              void existing.refetch()
            } else if (ApiError.is(error) && error.status === 404) {
              notifications.show({
                color: 'red',
                title: 'Not found',
                message: 'This draft no longer exists.',
              })
              void navigate({ to: '/sales-orders' })
            } else if (ApiError.is(error)) {
              setAlertMsg(error.detail ?? error.error)
            }
          },
        },
      )
    } else {
      createSo.mutate(body, {
        onSuccess: (so: SalesOrderResponse) => {
          setSavedId(so.id)
          void navigate({
            to: '/sales-orders/$id/edit',
            params: { id: so.id },
            replace: true,
          })
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
        <Text c="dimmed">This sales order doesn&apos;t exist or has been deleted.</Text>
      </Stack>
    )
  }

  const submitting = createSo.isPending || updateSo.isPending

  return (
    <Stack p="xl" gap="lg">
      <Title order={1}>{isEdit ? 'Edit sales order' : 'New sales order'}</Title>

      {alertMsg && <Alert color="red">{alertMsg}</Alert>}

      <SimpleGrid cols={2} spacing="xl">
        {/* Left column: form */}
        <Stack gap="md">
          <form onSubmit={form.onSubmit(handleSubmit)} id="so-draft-form">
            <Stack gap="md">
              <Group grow>
                <TextInput
                  label="Customer name"
                  placeholder="Acme Corp"
                  {...form.getInputProps('customer_name')}
                  required
                />
                <TextInput
                  label="Customer contact (optional)"
                  placeholder="orders@acme.example"
                  {...form.getInputProps('customer_contact')}
                />
              </Group>

              <Stack gap="xs">
                <Text fw={500}>Lines</Text>
                <SoLineEditor
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
                        { product_id: '', quantity: '0', sell_price: '0' },
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
                <Button
                  variant="subtle"
                  onClick={() => void navigate({ to: '/sales-orders' })}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" form="so-draft-form" loading={submitting}>
                  Save draft
                </Button>
              </Group>
            </Stack>
          </form>

          {/* Admin override disclosure (BE-D11) — collapsed by default */}
          {savedId && (
            <Stack gap="xs">
              <Button
                variant="subtle"
                size="xs"
                onClick={() => setOverrideOpen((v) => !v)}
              >
                {overrideOpen ? 'Hide allocation overrides' : 'Edit allocations (admin override)'}
              </Button>
              <Collapse in={overrideOpen}>
                <AllocationOverrideEditor
                  lines={form.values.lines}
                  allocations={overrides}
                  onChange={setOverrides}
                />
              </Collapse>
            </Stack>
          )}
        </Stack>

        {/* Right column: FEFO preview */}
        <FefoPreview
          preview={preview.data ?? null}
          loading={preview.isFetching}
          error={preview.error}
          shortfall={shortfall}
          onRefresh={() => void preview.refetch()}
          onCommit={() => setCommitOpen(true)}
          commitDisabled={!savedId || preview.isFetching || !preview.data}
          onDismissShortfall={() => setShortfall(null)}
        />
      </SimpleGrid>

      {savedId && (
        <CommitConfirmModal
          soId={savedId}
          allocations={overrides.length > 0 ? overrides : undefined}
          opened={commitOpen}
          onClose={() => setCommitOpen(false)}
          onSuccess={() => {
            setCommitOpen(false)
            void navigate({ to: '/sales-orders/$id', params: { id: savedId } })
          }}
          onShortfall={(sf) => {
            setCommitOpen(false)
            setShortfall(sf)
          }}
          onStaleState={() => {
            setCommitOpen(false)
            notifications.show({
              color: 'orange',
              title: 'Already committed',
              message: 'This sales order has already been committed elsewhere.',
            })
            void existing.refetch()
          }}
        />
      )}
    </Stack>
  )
}
