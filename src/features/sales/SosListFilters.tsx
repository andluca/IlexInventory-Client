/**
 * src/features/sales/SosListFilters.tsx
 *
 * Presentational filter row for the Sales Orders list page.
 * Controlled: receives current values + onChange callbacks.
 * No URL / navigation knowledge.
 */

import { TextInput, SegmentedControl, Group } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'

type StatusFilter = 'all' | 'draft' | 'committed' | 'voided'

interface SosListFiltersProps {
  localSearch: string
  status: StatusFilter
  onSearchChange: (value: string) => void
  onStatusChange: (value: StatusFilter) => void
}

export function SosListFilters({
  localSearch,
  status,
  onSearchChange,
  onStatusChange,
}: SosListFiltersProps) {
  return (
    <Group gap="sm">
      <TextInput
        placeholder="Search customer"
        value={localSearch}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
        leftSection={<IconSearch size={14} />}
        w={240}
      />
      <SegmentedControl
        value={status}
        onChange={(v) => onStatusChange(v as StatusFilter)}
        data={[
          { label: 'All', value: 'all' },
          { label: 'Draft', value: 'draft' },
          { label: 'Committed', value: 'committed' },
          { label: 'Voided', value: 'voided' },
        ]}
      />
    </Group>
  )
}
