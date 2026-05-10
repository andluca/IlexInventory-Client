/**
 * src/features/catalog/ProductDetailForm.tsx
 *
 * Details form for the Product Detail page.
 * Receives the `form` return value from `useForm` (owned by the orchestrator)
 * so the orchestrator can call `form.setErrors` from the mutation's onError handler.
 */

import { Button, Group, Stack, Textarea, TextInput } from '@mantine/core'
import type { UseFormReturnType } from '@mantine/form'

type FormValues = { name: string; sku: string; description: string }

interface ProductDetailFormProps {
  form: UseFormReturnType<FormValues>
  onSubmit: (values: FormValues) => void
  pending: boolean
}

export function ProductDetailForm({ form, onSubmit, pending }: ProductDetailFormProps) {
  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="sm">
        <TextInput label="Name" {...form.getInputProps('name')} />
        <TextInput label="SKU" ff="monospace" disabled {...form.getInputProps('sku')} />
        <Textarea label="Description" {...form.getInputProps('description')} />
        <Group justify="flex-end">
          <Button type="submit" loading={pending} disabled={!form.isDirty()}>
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
