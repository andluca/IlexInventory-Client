/**
 * src/features/procurement/PosListFilters.tsx
 *
 * Presentational filter row for the Purchase Orders list page.
 * Controlled: receives current values + onChange callbacks.
 */

import { TextInput, SegmentedControl, Group } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'

type StatusFilter = 'draft' | 'received' | 'all'

interface PosListFiltersProps {
  localSearch: string
  status: StatusFilter
  onSearchChange: (value: string) => void
  onStatusChange: (value: StatusFilter) => void
}

export function PosListFilters({
  localSearch,
  status,
  onSearchChange,
  onStatusChange,
}: PosListFiltersProps) {
  return (
    <Group gap="sm">
      <TextInput
        placeholder="Search supplier"
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
          { label: 'Received', value: 'received' },
        ]}
      />
    </Group>
  )
}
