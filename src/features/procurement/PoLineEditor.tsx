import { ActionIcon, Group, Select, Stack, Text } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { DecimalInput } from '@/components/DecimalInput'
import { useProductsList } from '@/data/catalog/queries'

/**
 * PoLineEditor — repeatable row: product picker + quantity (DecimalInput) + unit_cost (DecimalInput).
 * Uses string form state so DecimalInput's strings-end-to-end contract holds.
 * The parent page converts strings → numbers at submit (BE schema uses Format: double here).
 */
export type DraftLine = { product_id: string; quantity: string; unit_cost: string }

export function PoLineEditor({
  lines,
  onChange,
  disabled = false,
}: {
  lines: DraftLine[]
  onChange: (lines: DraftLine[]) => void
  disabled?: boolean
}) {
  const products = useProductsList({ archived: false, page: 1, limit: 200 })
  const productOptions =
    products.data?.items.map((p) => ({
      value: p.id,
      label: `${p.sku} — ${p.name}`,
    })) ?? []

  const update = (i: number, patch: Partial<DraftLine>) =>
    onChange(lines.map((line, idx) => (idx === i ? { ...line, ...patch } : line)))
  const remove = (i: number) => onChange(lines.filter((_, idx) => idx !== i))

  return (
    <Stack gap="xs">
      {lines.map((line, i) => (
        <Group key={i} align="flex-end" wrap="nowrap">
          <Select
            {...(i === 0 ? { label: 'Product' } : {})}
            placeholder="Pick a product"
            data={productOptions}
            value={line.product_id}
            onChange={(v) => update(i, { product_id: v ?? '' })}
            searchable
            disabled={disabled}
            style={{ flex: 2 }}
          />
          <DecimalInput
            {...(i === 0 ? { label: 'Quantity' } : {})}
            value={line.quantity}
            onChange={(v) => update(i, { quantity: v })}
            disabled={disabled}
          />
          <DecimalInput
            {...(i === 0 ? { label: 'Unit cost' } : {})}
            value={line.unit_cost}
            onChange={(v) => update(i, { unit_cost: v })}
            disabled={disabled}
          />
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => remove(i)}
            disabled={disabled}
            aria-label="Remove line"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}
      {lines.length === 0 && (
        <Text c="dimmed" size="sm">
          No lines yet — click &ldquo;Add line&rdquo; to start.
        </Text>
      )}
    </Stack>
  )
}
