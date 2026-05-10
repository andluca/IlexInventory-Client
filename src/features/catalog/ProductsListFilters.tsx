/**
 * src/features/catalog/ProductsListFilters.tsx
 *
 * Presentational filter row for the Products list page.
 * Controlled: receives current values + onChange callbacks.
 */

import { TextInput, SegmentedControl, Group } from '@mantine/core'

type ArchivedSegValue = 'active' | 'all' | 'archived'

interface ProductsListFiltersProps {
  localSearch: string
  archivedSegValue: ArchivedSegValue
  onSearchChange: (value: string) => void
  onArchivedChange: (value: string) => void
}

export function ProductsListFilters({
  localSearch,
  archivedSegValue,
  onSearchChange,
  onArchivedChange,
}: ProductsListFiltersProps) {
  return (
    <Group gap="sm" align="center">
      <TextInput
        placeholder="Search by name or SKU…"
        value={localSearch}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
        w={280}
      />
      <SegmentedControl
        value={archivedSegValue}
        onChange={onArchivedChange}
        data={[
          { value: 'active', label: 'Active' },
          { value: 'all', label: 'All' },
          { value: 'archived', label: 'Archived' },
        ]}
      />
    </Group>
  )
}
