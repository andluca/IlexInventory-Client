/**
 * src/features/catalog/NewProductModal.tsx
 *
 * "New product" modal (F2 flow). Mantine Modal + useForm.
 * Fields: name (required), SKU (required, mono), description (optional), base_unit (Select, required).
 * On success: closes modal (via onClose); useCreateProduct invalidates list and shows toast.
 * On 409 duplicate_sku: maps field error under SKU; modal stays open.
 */

import { Modal, TextInput, Textarea, Select, Button, Stack, Group } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useCreateProduct } from '@/data/catalog/mutations'
import { ApiError } from '@/api/errors'

interface NewProductModalProps {
  opened: boolean
  onClose: () => void
}

const BASE_UNIT_OPTIONS = [
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
  { value: 'unit', label: 'unit' },
]

export function NewProductModal({ opened, onClose }: NewProductModalProps) {
  const createProduct = useCreateProduct()

  const form = useForm({
    initialValues: {
      name: '',
      sku: '',
      description: '',
      base_unit: '' as 'g' | 'ml' | 'unit' | '',
    },
    validate: {
      name: (v) => (v.trim().length === 0 ? 'Name is required' : null),
      sku: (v) => (v.trim().length === 0 ? 'SKU is required' : null),
      base_unit: (v) => (!v ? 'Base unit is required' : null),
    },
  })

  function handleClose() {
    form.reset()
    createProduct.reset()
    onClose()
  }

  function handleSubmit(values: typeof form.values) {
    if (!values.base_unit) return

    createProduct.mutate(
      {
        name: values.name,
        sku: values.sku,
        description: values.description,
        base_unit: values.base_unit as 'g' | 'ml' | 'unit',
      },
      {
        onSuccess: () => {
          handleClose()
        },
        onError: (error) => {
          if (ApiError.is(error)) {
            if (error.fields && Object.keys(error.fields).length > 0) {
              form.setErrors(error.fields)
            }
          }
        },
      },
    )
  }

  return (
    <Modal opened={opened} onClose={handleClose} title="New product" centered>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Name"
            placeholder="Product name"
            required
            {...form.getInputProps('name')}
          />

          <TextInput
            label="SKU"
            placeholder="YRB-001"
            required
            ff="monospace"
            {...form.getInputProps('sku')}
          />

          <Textarea
            label="Description"
            placeholder="Optional description"
            {...form.getInputProps('description')}
          />

          <Select
            label="Base unit"
            placeholder="Select unit"
            data={BASE_UNIT_OPTIONS}
            required
            {...form.getInputProps('base_unit')}
          />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={handleClose} disabled={createProduct.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={createProduct.isPending}>
              Create
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
