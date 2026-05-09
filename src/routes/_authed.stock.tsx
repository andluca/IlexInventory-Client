import { createFileRoute } from '@tanstack/react-router'
import { StockByBatchPage } from '@/features/inventory/StockByBatchPage'

type StockSearch = {
  product_id?: string
  is_recalled?: boolean
  expiring_within?: number
  page?: number
}

export const Route = createFileRoute('/_authed/stock')({
  component: StockByBatchPage,
  validateSearch: (s: Record<string, unknown>): StockSearch => {
    const product_id = s['product_id']
    const is_recalled = s['is_recalled']
    const expiring_within = s['expiring_within']
    const page = s['page']
    return {
      ...(typeof product_id === 'string' && product_id.length > 0 ? { product_id } : {}),
      ...(typeof is_recalled === 'boolean' ? { is_recalled } : {}),
      ...(typeof expiring_within === 'number' && expiring_within > 0 ? { expiring_within } : {}),
      ...(typeof page === 'number' && page > 0 ? { page } : {}),
    }
  },
})
