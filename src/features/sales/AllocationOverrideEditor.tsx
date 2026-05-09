/**
 * src/features/sales/AllocationOverrideEditor.tsx
 *
 * BE-D11 admin override. Collapsed behind a Disclosure on SoDraftPage.
 * When expanded and populated, the commit body becomes { allocations: [...] }.
 * When collapsed or empty, commit body is {} (BE walks FEFO).
 */

import { Stack, Text } from '@mantine/core'
import type { DraftSoLine } from './SoLineEditor'

export type AllocationOverride = {
  sales_order_line_id: string
  batch_id: string
  quantity: string
}

export type AllocationOverrideEditorProps = {
  lines: DraftSoLine[]
  allocations: AllocationOverride[]
  onChange: (allocations: AllocationOverride[]) => void
}

export function AllocationOverrideEditor({
  lines,
  allocations: _allocations,
  onChange: _onChange,
}: AllocationOverrideEditorProps) {
  // Minimal implementation: shows the lines and a placeholder for batch overrides.
  // Full batch picker UX would be implemented in a follow-up if needed.
  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Override FEFO allocation per line. Leave empty to let the BE walk FEFO automatically.
      </Text>
      {lines.length === 0 && (
        <Text size="sm" c="dimmed">
          No lines to override.
        </Text>
      )}
      {lines.length > 0 && (
        <Text size="sm" c="dimmed">
          Override UI not yet active — allocations will be auto-assigned by FEFO.
        </Text>
      )}
    </Stack>
  )
}
