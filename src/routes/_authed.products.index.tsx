import { createFileRoute } from '@tanstack/react-router'
import { ProductsListPage } from '@/features/catalog/ProductsListPage'

/**
 * Route: /products (index)
 *
 * Search params validated by TanStack Router:
 *   search: string | undefined
 *   archived: true | false | undefined (All)
 *   page: positive integer (1-indexed)
 */
export const Route = createFileRoute('/_authed/products/')({
  validateSearch: (search: Record<string, unknown>) => ({
    search: typeof search.search === 'string' ? search.search : undefined,
    archived:
      search.archived === true || search.archived === 'true'
        ? true
        : search.archived === false || search.archived === 'false'
          ? false
          : undefined,
    page:
      typeof search.page === 'number' && search.page > 0
        ? Math.floor(search.page)
        : 1,
  }),
  component: ProductsListPage,
})
