import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/features/dashboard/DashboardPage'

/**
 * Dashboard route — `/` (authenticated).
 *
 * Realizes R2 + R3 + F11 per SPEC §3.2 + §3.7.
 * URL search params: from (ISO date), to (ISO date), expiring_within (positive int).
 * Defaults: to=today, from=today-30d, expiring_within=30.
 *
 * ILE-8: replaced placeholder with full DashboardPage.
 */
export const Route = createFileRoute('/_authed/')({
  validateSearch: (s: Record<string, unknown>) => {
    return {
      from: typeof s['from'] === 'string' ? s['from'] : undefined,
      to: typeof s['to'] === 'string' ? s['to'] : undefined,
      expiring_within:
        typeof s['expiring_within'] === 'number'
          ? s['expiring_within']
          : typeof s['expiring_within'] === 'string'
            ? Number(s['expiring_within'])
            : undefined,
    }
  },
  component: DashboardPageRoute,
})

function DashboardPageRoute() {
  return <DashboardPage />
}
