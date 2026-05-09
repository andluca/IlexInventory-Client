import { createFileRoute } from '@tanstack/react-router'
import { SoDetailPage } from '@/features/sales/SoDetailPage'

export const Route = createFileRoute('/_authed/sales-orders/$id/')({
  component: function SalesOrderDetailRoute() {
    const { id } = Route.useParams()
    return <SoDetailPage soId={id} />
  },
})
