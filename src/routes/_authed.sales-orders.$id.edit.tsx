import { createFileRoute } from '@tanstack/react-router'
import { SoDraftPage } from '@/features/sales/SoDraftPage'

export const Route = createFileRoute('/_authed/sales-orders/$id/edit')({
  component: function SalesOrderEditRoute() {
    const { id } = Route.useParams()
    return <SoDraftPage soId={id} />
  },
})
