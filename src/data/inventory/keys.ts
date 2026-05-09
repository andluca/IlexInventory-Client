/**
 * src/data/inventory/keys.ts
 *
 * Stable TanStack Query key factory for inventory queries.
 */

export const inventoryKeys = {
  all: ['inventory'] as const,
  movements: (filters?: Record<string, unknown>) =>
    [...inventoryKeys.all, 'movements', filters ?? {}] as const,
  batchesByProduct: (productId: string, opts?: Record<string, unknown>) =>
    [...inventoryKeys.all, 'batchesByProduct', productId, opts ?? {}] as const,
  batchesByPo: (poId: string) =>
    [...inventoryKeys.all, 'batchesByPo', poId] as const,
  detail: (id: string) => [...inventoryKeys.all, 'detail', id] as const,
  lists: () => [...inventoryKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...inventoryKeys.lists(), filters ?? {}] as const,
  recallReport: (batchId: string, opts?: Record<string, unknown>) =>
    [...inventoryKeys.all, 'recallReport', batchId, opts ?? {}] as const,
}
