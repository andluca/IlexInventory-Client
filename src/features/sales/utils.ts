/**
 * src/features/sales/utils.ts
 *
 * Shared pure helpers for the sales feature.
 * Extracted per ilex-discipline §14 (same-feature DRY) from SosListPage + SoDetailPage.
 */

export type SosSearch = {
  status?: 'draft' | 'committed' | 'voided'
  search?: string
}

/**
 * Build the URL search object for the /sales-orders list page.
 * Drops `status` when it is `'all'` (the BE default) and drops empty search.
 */
export function buildSosListUrl(params: {
  status?: 'all' | 'draft' | 'committed' | 'voided'
  search?: string
}): SosSearch {
  const result: SosSearch = {}
  if (params.status && params.status !== 'all') {
    result.status = params.status
  }
  if (params.search && params.search.trim() !== '') {
    result.search = params.search
  }
  return result
}

/**
 * Maps a sales order status string to its Mantine badge colour.
 * Verbatim copy from SosListPage / SoDetailPage (was duplicated — BE-D6 / SPEC §3.6).
 */
export function statusBadgeColor(status: string): string {
  if (status === 'voided') return 'red'
  if (status === 'committed') return 'green'
  return 'gray'
}

/**
 * Returns the display status of a sales order.
 * BE quirk (BE-D6 / SPEC §3.6): a voided SO keeps `status='committed'` and
 * signals the void via `voided_at`. Surface "voided" whenever voided_at is set.
 */
export function effectiveStatus(so: { status: string; voided_at: string | null }): string {
  if (so.voided_at) return 'voided'
  return so.status
}
