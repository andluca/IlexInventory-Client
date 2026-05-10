/**
 * src/features/procurement/utils.ts
 *
 * Shared pure helpers for the procurement feature.
 */

type StatusFilter = 'draft' | 'received' | 'all'

export type PosSearch = {
  status?: StatusFilter
  search?: string
  page?: number
}

/**
 * Build the URL search object for the /purchase-orders list page.
 * Drops `status` when it is `'all'`, drops empty search.
 */
export function buildPosListUrl(params: {
  status?: StatusFilter
  search?: string
  page?: number
}): PosSearch {
  const result: PosSearch = {}
  if (params.status && params.status !== 'all') {
    result.status = params.status
  }
  if (params.search && params.search.trim() !== '') {
    result.search = params.search
  }
  if (params.page !== undefined) {
    result.page = params.page
  }
  return result
}
