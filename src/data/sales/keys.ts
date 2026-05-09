/**
 * src/data/sales/keys.ts
 *
 * Stable TanStack Query key factory for sales orders queries.
 */

export const salesKeys = {
  all: ['sales'] as const,
  lists: () => [...salesKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...salesKeys.lists(), filters ?? {}] as const,
  details: () => [...salesKeys.all, 'detail'] as const,
  detail: (id: string) => [...salesKeys.details(), id] as const,
  preview: (id: string) => [...salesKeys.all, 'preview', id] as const,
}
