/**
 * src/features/shell/cmdk-items/create.ts
 *
 * Pure function returning SpotlightActionGroupData for the Create group.
 * 4 actions: New PO, New SO, New product, Manual batch.
 *
 * Per ILE-9 Step 6.
 */

import type { NavigateFn, SpotlightActionGroup } from './navigate'

export function buildCreateActions(
  navigate: NavigateFn,
  openManualBatch: () => void,
): SpotlightActionGroup {
  return {
    group: 'Create',
    actions: [
      {
        id: 'create-purchase-order',
        label: 'New purchase order',
        description: 'Create a new PO and receive inventory',
        keywords: ['PO', 'purchase', 'order', 'new', 'receive'],
        onClick: () => navigate({ to: '/purchase-orders/new' }),
      },
      {
        id: 'create-sales-order',
        label: 'New sales order',
        description: 'Create a new FEFO sales order',
        keywords: ['SO', 'sales', 'order', 'new', 'customer'],
        onClick: () => navigate({ to: '/sales-orders/new' }),
      },
      {
        id: 'create-product',
        label: 'New product',
        description: 'Add a new product to the catalog',
        keywords: ['product', 'catalog', 'new', 'SKU'],
        onClick: () => navigate({ to: '/products?new=1' }),
      },
      {
        id: 'create-manual-batch',
        label: 'Manual batch',
        description: 'Create a manual inventory batch',
        keywords: ['batch', 'manual', 'inventory', 'receive'],
        onClick: openManualBatch,
      },
    ],
  }
}
