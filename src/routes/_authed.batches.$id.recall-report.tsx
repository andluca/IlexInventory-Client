import { createFileRoute } from '@tanstack/react-router'
import { RecallReportPage } from '@/features/inventory/RecallReportPage'

export const Route = createFileRoute('/_authed/batches/$id/recall-report')({
  component: function RecallReportRoute() {
    const { id } = Route.useParams()
    return <RecallReportPage batchId={id} />
  },
})
