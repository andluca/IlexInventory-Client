import { createFileRoute } from '@tanstack/react-router'
import { SoDraftPage } from '@/features/sales/SoDraftPage'

export const Route = createFileRoute('/_authed/sales-orders/new')({
  component: function SalesOrderNewRoute() {
    return <SoDraftPage />
  },
})
