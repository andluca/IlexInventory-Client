/**
 * src/features/sales/SoLineEditor.tsx
 *
 * Per-line form rows for the SO draft.
 * Mirrors PoLineEditor but with sell_price instead of unit_cost and no batch_code.
 * FEFO assigns batches at commit time — not selected by the user here.
 */

import { ActionIcon, Group, Select, Stack, Text } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { DecimalInput } from '@/components/DecimalInput'
import { useProductsList } from '@/data/catalog/queries'

export type DraftSoLine = {
  product_id: string
  quantity: string   // display units, string per SPEC §2.4
  sell_price: string // string per SPEC §2.4
}

export type SoLineEditorProps = {
  lines: DraftSoLine[]
  onChange: (lines: DraftSoLine[]) => void
  disabled?: boolean
}

export function SoLineEditor({ lines, onChange, disabled = false }: SoLineEditorProps) {
  const products = useProductsList({ archived: false, page: 1, limit: 200 })
  const productOptions =
    products.data?.items.map((p) => ({
      value: p.id,
      label: `${p.sku} — ${p.name}`,
    })) ?? []

  const update = (i: number, patch: Partial<DraftSoLine>) =>
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
            allowNegative={false}
          />
          <DecimalInput
            {...(i === 0 ? { label: 'Sell price' } : {})}
            value={line.sell_price}
            onChange={(v) => update(i, { sell_price: v })}
            disabled={disabled}
            allowNegative={false}
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
