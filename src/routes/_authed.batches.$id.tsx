import { createFileRoute } from '@tanstack/react-router'
import { BatchDetailPage } from '@/features/inventory/BatchDetailPage'

export const Route = createFileRoute('/_authed/batches/$id')({
  component: function BatchDetailRoute() {
    const { id } = Route.useParams()
    return <BatchDetailPage batchId={id} />
  },
})
