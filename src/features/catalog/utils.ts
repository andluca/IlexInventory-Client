/**
 * src/features/catalog/utils.ts
 *
 * Shared pure helpers for the catalog feature.
 */

export type ProductsSearch = {
  search: string | undefined
  archived: boolean | undefined
  page: number
}

/**
 * Build the URL search object for the /products list page.
 * Returns undefined for search when empty; matches the route's validateSearch shape.
 */
export function buildProductsListUrl(params: {
  search?: string | undefined
  archived?: boolean | undefined
  page?: number | undefined
}): ProductsSearch {
  return {
    page: params.page ?? 1,
    search: params.search && params.search.trim() !== '' ? params.search : undefined,
    archived: params.archived,
  }
}
