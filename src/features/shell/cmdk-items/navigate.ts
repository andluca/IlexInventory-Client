/**
 * src/features/shell/cmdk-items/navigate.ts
 *
 * Pure function returning SpotlightActionGroupData for the Navigate group.
 * One action per top-level page in SPEC §2.7 (6 pages).
 * Mirrors Sidebar.tsx NAV_ITEMS but kept local so hotkey concerns can drift independently.
 *
 * Per ILE-9 Step 6.
 */

export type NavigateFn = (opts: { to: string }) => void

type SpotlightAction = {
  id: string
  label: string
  description: string
  keywords: string[]
  onClick: () => void
}

export type SpotlightActionGroup = {
  group: string
  actions: SpotlightAction[]
}

const NAV_PAGES = [
  {
    id: 'nav-dashboard',
    to: '/',
    label: 'Dashboard',
    description: 'Overview, financials, and expiring batches',
    keywords: ['home', 'overview', 'summary'],
  },
  {
    id: 'nav-products',
    to: '/products',
    label: 'Products',
    description: 'Browse products and import CSV',
    keywords: ['catalog', 'sku', 'items'],
  },
  {
    id: 'nav-purchase-orders',
    to: '/purchase-orders',
    label: 'Purchase orders',
    description: 'Receive POs and create batches',
    keywords: ['PO', 'procurement', 'receive', 'supplier'],
  },
  {
    id: 'nav-sales-orders',
    to: '/sales-orders',
    label: 'Sales orders',
    description: 'FEFO sales orders',
    keywords: ['SO', 'sales', 'orders', 'customer'],
  },
  {
    id: 'nav-stock',
    to: '/stock',
    label: 'Stock',
    description: 'View stock by batch, recalls, and expirations',
    keywords: ['inventory', 'batches', 'stock', 'expiring'],
  },
  {
    id: 'nav-settings',
    to: '/settings',
    label: 'Settings',
    description: 'Account and workspace settings',
    keywords: ['preferences', 'account', 'config'],
  },
]

export function buildNavigateActions(navigate: NavigateFn): SpotlightActionGroup {
  return {
    group: 'Navigate',
    actions: NAV_PAGES.map(({ id, to, label, description, keywords }) => ({
      id,
      label,
      description,
      keywords,
      onClick: () => navigate({ to }),
    })),
  }
}
