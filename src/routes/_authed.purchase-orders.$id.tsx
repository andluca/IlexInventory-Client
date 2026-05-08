import { createFileRoute } from '@tanstack/react-router'
import { PoDetailPage } from '@/features/procurement/PoDetailPage'

export const Route = createFileRoute('/_authed/purchase-orders/$id')({
  component: PoDetailRoute,
})

function PoDetailRoute() {
  const { id } = Route.useParams()
  return <PoDetailPage poId={id} />
}
