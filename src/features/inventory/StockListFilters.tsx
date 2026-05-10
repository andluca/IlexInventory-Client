/**
 * src/features/inventory/StockListFilters.tsx
 *
 * Presentational filter row for the Stock by Batch page.
 * Controlled: receives current values + onChange callbacks.
 * NumberInput here is integer-only (expiring_within filter) — allowlisted per SPEC §4.
 */

import { NumberInput, SegmentedControl, Group, Select } from '@mantine/core'

type RecallFilter = 'all' | 'active' | 'recalled'

interface ProductOption {
  value: string
  label: string
}

interface StockListFiltersProps {
  productId: string | undefined
  recallFilter: RecallFilter
  localExpiring: string
  productOptions: ProductOption[]
  onProductChange: (value: string | null) => void
  onRecallChange: (value: string) => void
  onExpiringChange: (value: string) => void
}

export function StockListFilters({
  productId,
  recallFilter,
  localExpiring,
  productOptions,
  onProductChange,
  onRecallChange,
  onExpiringChange,
}: StockListFiltersProps) {
  return (
    <Group gap="sm">
      <Select
        data={productOptions}
        value={productId ?? ''}
        onChange={onProductChange}
        placeholder="All products"
        clearable
        w={240}
        aria-label="Product filter"
      />
      <SegmentedControl
        value={recallFilter}
        onChange={onRecallChange}
        data={[
          { label: 'All', value: 'all' },
          { label: 'Active', value: 'active' },
          { label: 'Recalled', value: 'recalled' },
        ]}
      />
      <NumberInput
        value={localExpiring !== '' ? Number(localExpiring) : ''}
        onChange={(v) => onExpiringChange(v !== '' ? String(v) : '')}
        placeholder="Expiring within (days)"
        min={1}
        w={200}
        aria-label="Expiring within days"
      />
    </Group>
  )
}
