/**
 * src/features/auth/sanitizeNext.ts
 *
 * Open-redirect guard for the post-login `?next=<path>` parameter.
 * Only allows internal paths (starting with `/`, not `//`).
 * Anything else (off-origin URLs, protocol-relative, missing) falls back to `/`.
 */
export function sanitizeNext(next: string | undefined): string {
  if (typeof next !== 'string' || next.length === 0) return '/'
  if (!next.startsWith('/')) return '/'
  if (next.startsWith('//')) return '/' // protocol-relative — open-redirect vector
  return next
}
