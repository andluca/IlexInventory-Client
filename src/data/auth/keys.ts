/**
 * src/data/auth/keys.ts
 *
 * Stable TanStack Query key factory for auth queries.
 */

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
}
