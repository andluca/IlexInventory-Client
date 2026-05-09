import { createFileRoute, Outlet } from '@tanstack/react-router'
import { RequireAuth } from '@/features/shell/RequireAuth'
import { AppShell } from '@/features/shell/AppShell'
import { ErrorBoundary } from '@/components/ErrorBoundary'

/**
 * _authed — pathless layout route.
 *
 * Wraps every authenticated page with RequireAuth + AppShell chrome.
 * (Sidebar + Topbar + RightRailSlot mount inside AppShell.)
 */
export const Route = createFileRoute('/_authed')({
  component: AuthedLayout,
})

function AuthedLayout() {
  return (
    <RequireAuth>
      <AppShell>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </AppShell>
    </RequireAuth>
  )
}
