import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/sales-orders/$id')({
  component: function SalesOrderLayout() {
    return <Outlet />
  },
})
