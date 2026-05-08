/**
 * src/data/procurement/keys.ts
 *
 * Stable TanStack Query key factory for procurement (purchase orders) queries.
 */

export const procurementKeys = {
  all: ['procurement'] as const,
  lists: () => [...procurementKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...procurementKeys.lists(), filters ?? {}] as const,
  details: () => [...procurementKeys.all, 'detail'] as const,
  detail: (id: string) => [...procurementKeys.details(), id] as const,
}
