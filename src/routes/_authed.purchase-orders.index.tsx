import { createFileRoute } from '@tanstack/react-router'
import { PosListPage } from '@/features/procurement/PosListPage'

type PosSearch = {
  status?: 'all' | 'draft' | 'received'
  search?: string
  page?: number
}

export const Route = createFileRoute('/_authed/purchase-orders/')({
  component: PosListPage,
  validateSearch: (s: Record<string, unknown>): PosSearch => {
    const status = s['status']
    const search = s['search']
    const page = s['page']
    return {
      ...(status === 'all' || status === 'draft' || status === 'received' ? { status } : {}),
      ...(typeof search === 'string' && search.length > 0 ? { search } : {}),
      ...(typeof page === 'number' && page > 0 ? { page } : {}),
    }
  },
})
