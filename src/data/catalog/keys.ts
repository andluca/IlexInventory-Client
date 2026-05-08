/**
 * src/data/catalog/keys.ts
 *
 * Stable TanStack Query key factory for catalog (products) queries.
 */

export const catalogKeys = {
  all: ['catalog'] as const,
  lists: () => [...catalogKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...catalogKeys.lists(), filters ?? {}] as const,
  details: () => [...catalogKeys.all, 'detail'] as const,
  detail: (id: string) => [...catalogKeys.details(), id] as const,
}
