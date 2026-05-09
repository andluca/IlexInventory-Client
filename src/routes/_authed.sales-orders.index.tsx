import { createFileRoute } from '@tanstack/react-router'
import { SosListPage } from '@/features/sales/SosListPage'

type SosSearch = {
  status?: 'draft' | 'committed' | 'voided'
  voided?: boolean
  search?: string
  from?: string
  to?: string
}

export const Route = createFileRoute('/_authed/sales-orders/')({
  component: SosListPage,
  validateSearch: (s: Record<string, unknown>): SosSearch => {
    const status = s['status']
    const voided = s['voided']
    const search = s['search']
    const from = s['from']
    const to = s['to']
    return {
      ...(typeof status === 'string' && ['draft', 'committed', 'voided'].includes(status)
        ? { status: status as 'draft' | 'committed' | 'voided' }
        : {}),
      ...(typeof voided === 'boolean' ? { voided } : {}),
      ...(typeof search === 'string' && search.length > 0 ? { search } : {}),
      ...(typeof from === 'string' && from.length > 0 ? { from } : {}),
      ...(typeof to === 'string' && to.length > 0 ? { to } : {}),
    }
  },
})
