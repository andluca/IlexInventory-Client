/**
 * src/features/inventory/utils.ts
 *
 * Shared pure helpers for the inventory feature.
 */

export type StockSearch = {
  product_id?: string
  is_recalled?: boolean
  expiring_within?: number
  page?: number
}

/**
 * Build the URL search object for the /stock list page.
 * Drops undefined values.
 */
export function buildStockListUrl(params: {
  product_id?: string | undefined
  is_recalled?: boolean | undefined
  expiring_within?: number | undefined
  page?: number | undefined
}): StockSearch {
  const result: StockSearch = {}
  if (params.product_id !== undefined) {
    result.product_id = params.product_id
  }
  if (params.is_recalled !== undefined) {
    result.is_recalled = params.is_recalled
  }
  if (params.expiring_within !== undefined) {
    result.expiring_within = params.expiring_within
  }
  if (params.page !== undefined) {
    result.page = params.page
  }
  return result
}
