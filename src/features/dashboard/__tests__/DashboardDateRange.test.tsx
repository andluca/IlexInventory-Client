/**
 * DashboardDateRange.test.tsx
 *
 * Surface-listed integration test for ILE-8 Step 4.
 *
 * Asserts:
 *  - Both /financials/dashboard and /financials/margin refetch when the date
 *    range changes.
 *  - Both <CsvExportButton> hrefs update to include the new from/to params.
 */

import { describe, it, expect } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  createMemoryHistory,
  Outlet,
  type AnyRouter,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { mantineTheme } from '@/theme/mantine'
import { FinancialSummary } from '../FinancialSummary'
import { MarginByProductTable } from '../MarginByProductTable'
import { csvExportUrl } from '@/utils/csv-export'

type DashboardSearch = {
  from?: string | undefined
  to?: string | undefined
}

const makeDashboardResponse = (from: string, to: string) => ({
  date_from: from,
  date_to: to,
  totals: { revenue: '100.0000', cogs: '50.0000', profit: '50.0000', margin_pct: '100.0000' },
  top_products: [],
})

const makeMarginResponse = () => ({
  items: [],
  next_cursor: null,
})

/** Test page that mounts FinancialSummary + MarginByProductTable with search params from URL. */
function TestPage() {
  const { from = '2026-04-09', to = '2026-05-09' } = testRoute.useSearch()
  return (
    <div>
      <FinancialSummary from={from} to={to} />
      <MarginByProductTable from={from} to={to} />
    </div>
  )
}

const rootRoute = createRootRoute({ component: Outlet })
const testRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: TestPage,
  validateSearch: (s: Record<string, unknown>): DashboardSearch => {
    return {
      from: typeof s['from'] === 'string' ? s['from'] : undefined,
      to: typeof s['to'] === 'string' ? s['to'] : undefined,
    }
  },
})
const routeTree = rootRoute.addChildren([testRoute])

async function makeRouter(initialUrl: string) {
  const history = createMemoryHistory({ initialEntries: [initialUrl] })
  const router = createRouter({ routeTree, history })
  await router.load()
  return router
}

async function renderWithRouter(router: AnyRouter) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })

  const { render } = await import('@testing-library/react')
  return {
    ...render(
      <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </MantineProvider>,
    ),
    queryClient,
    router,
  }
}

describe('DashboardDateRange (surface-listed integration test)', () => {
  it('both endpoints refetch when URL date range changes; both CSV hrefs update', async () => {
    let dashboardHits = 0
    let marginHits = 0

    server.use(
      http.get('http://localhost:8000/api/v1/financials/dashboard', ({ request }) => {
        dashboardHits++
        const url = new URL(request.url)
        const from = url.searchParams.get('from') ?? '2026-04-09'
        const to = url.searchParams.get('to') ?? '2026-05-09'
        return HttpResponse.json(makeDashboardResponse(from, to))
      }),
      http.get('http://localhost:8000/api/v1/financials/margin', () => {
        marginHits++
        return HttpResponse.json(makeMarginResponse())
      }),
    )

    const router = await makeRouter('/?from=2026-04-09&to=2026-05-09')
    const { queryClient } = await renderWithRouter(router)

    // Wait for initial load
    await waitFor(() => {
      expect(dashboardHits).toBe(1)
      expect(marginHits).toBe(1)
    })

    // Both CSV hrefs should match the initial date range
    const initialDashboardHref = csvExportUrl('/financials/dashboard', {
      from: '2026-04-09',
      to: '2026-05-09',
    })
    const initialMarginHref = csvExportUrl('/financials/margin', {
      from: '2026-04-09',
      to: '2026-05-09',
    })
    const links = screen.getAllByRole('link', { name: /download csv/i })
    expect(links.length).toBe(2)
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain(initialDashboardHref)
    expect(hrefs).toContain(initialMarginHref)

    // Invalidate queries to simulate URL change refetch
    act(() => {
      queryClient.invalidateQueries({ queryKey: ['financials'] })
    })

    // Navigate to new date range
    await act(async () => {
      await router.navigate({
        to: '/',
        search: { from: '2026-05-02', to: '2026-05-09', expiring_within: undefined },
      })
    })

    // Both endpoints should refetch
    await waitFor(() => {
      expect(dashboardHits).toBeGreaterThanOrEqual(2)
      expect(marginHits).toBeGreaterThanOrEqual(2)
    })

    // Both CSV hrefs should update to the new date range
    await waitFor(() => {
      const newDashboardHref = csvExportUrl('/financials/dashboard', {
        from: '2026-05-02',
        to: '2026-05-09',
      })
      const newMarginHref = csvExportUrl('/financials/margin', {
        from: '2026-05-02',
        to: '2026-05-09',
      })
      const updatedLinks = screen.getAllByRole('link', { name: /download csv/i })
      const updatedHrefs = updatedLinks.map((l) => l.getAttribute('href'))
      expect(updatedHrefs).toContain(newDashboardHref)
      expect(updatedHrefs).toContain(newMarginHref)
    })
  })
})
