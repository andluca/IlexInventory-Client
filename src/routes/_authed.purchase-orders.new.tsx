import { createFileRoute } from '@tanstack/react-router'
import { PoDraftPage } from '@/features/procurement/PoDraftPage'

export const Route = createFileRoute('/_authed/purchase-orders/new')({
  component: () => <PoDraftPage />,
})
