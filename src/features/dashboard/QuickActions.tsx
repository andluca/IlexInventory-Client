/**
 * src/features/dashboard/QuickActions.tsx
 *
 * Three quick-action buttons above the dashboard widget grid (no card chrome).
 *
 * Buttons:
 *   "New PO"          → /purchase-orders/new (Link)
 *   "New SO"          → /sales-orders/new (Link)
 *   "Import products" → calls onImportClick (opens ImportCsvModal in DashboardPage)
 */

import { Button, Group } from '@mantine/core'
import { Link } from '@tanstack/react-router'

export interface QuickActionsProps {
  onImportClick: () => void
}

export function QuickActions({ onImportClick }: QuickActionsProps) {
  return (
    <Group gap="sm">
      <Button component={Link} to="/purchase-orders/new" variant="light" size="sm">
        New PO
      </Button>
      <Button component={Link} to="/sales-orders/new" variant="light" size="sm">
        New SO
      </Button>
      <Button variant="light" size="sm" onClick={onImportClick}>
        Import products
      </Button>
    </Group>
  )
}
