import { createFileRoute } from '@tanstack/react-router'
import { PoDraftPage } from '@/features/procurement/PoDraftPage'

export const Route = createFileRoute('/_authed/purchase-orders/$id/edit')({
  component: PoEditRoute,
})

function PoEditRoute() {
  const { id } = Route.useParams()
  return <PoDraftPage poId={id} />
}
