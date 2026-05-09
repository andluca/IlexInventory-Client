/**
 * src/data/financials/keys.ts
 *
 * Stable TanStack Query key factory for financials queries.
 */

export const financialsKeys = {
  all: ['financials'] as const,
  dashboard: (filters?: Record<string, unknown>) =>
    [...financialsKeys.all, 'dashboard', filters ?? {}] as const,
  marginLists: () => [...financialsKeys.all, 'margin'] as const,
  marginList: (filters?: Record<string, unknown>) =>
    [...financialsKeys.marginLists(), filters ?? {}] as const,
}
