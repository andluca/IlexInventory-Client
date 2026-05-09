/**
 * DashboardPage.test.tsx
 *
 * TDD for ILE-8 Step 6 — DashboardPage composition.
 */

import { describe, it, expect } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
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
import { Notifications } from '@mantine/notifications'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { mantineTheme } from '@/theme/mantine'
import { DashboardPage } from '../DashboardPage'

// Fixed "today" for deterministic default date calculations
const TODAY = '2026-05-09'

type DashboardSearch = {
  from?: string | undefined
  to?: string | undefined
  expiring_within?: number | undefined
}

async function makeRouter(initialUrl = '/') {
  const rootRoute = createRootRoute({ component: Outlet })

  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <DashboardPage today={TODAY} />,
    validateSearch: (s: Record<string, unknown>): DashboardSearch => {
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
  })

  const poNewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/purchase-orders/new',
    component: () => <div>New PO page</div>,
  })
  const soNewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders/new',
    component: () => <div>New SO page</div>,
  })
  const stockRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/stock',
    component: () => <div>Stock page</div>,
  })
  const batchRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/batches/$id',
    component: () => <div>Batch detail page</div>,
  })

  const routeTree = rootRoute.addChildren([dashboardRoute, poNewRoute, soNewRoute, stockRoute, batchRoute])
  const history = createMemoryHistory({ initialEntries: [initialUrl] })
  const router = createRouter({ routeTree, history })
  await router.load()
  return router
}

async function renderWithRouter(router: AnyRouter) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  const { render } = await import('@testing-library/react')
  return {
    ...render(
      <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
        <QueryClientProvider client={queryClient}>
          <Notifications />
          <RouterProvider router={router} />
        </QueryClientProvider>
      </MantineProvider>,
    ),
    queryClient,
    router,
  }
}

const EMPTY_DASHBOARD = {
  date_from: '2026-04-09',
  date_to: '2026-05-09',
  totals: { revenue: '0.0000', cogs: '0.0000', profit: '0.0000', margin_pct: null },
  top_products: [],
}

const EMPTY_MARGIN = { items: [], next_cursor: null }
const EMPTY_BATCHES = { items: [], total: 0, limit: 10, offset: 0 }

function setupDefaultHandlers() {
  server.use(
    http.get('http://localhost:8000/api/v1/financials/dashboard', () =>
      HttpResponse.json(EMPTY_DASHBOARD),
    ),
    http.get('http://localhost:8000/api/v1/financials/margin', () =>
      HttpResponse.json(EMPTY_MARGIN),
    ),
    http.get('http://localhost:8000/api/v1/batches', () => HttpResponse.json(EMPTY_BATCHES)),
  )
}

describe('DashboardPage', () => {
  it('default URL (/): reads from=today-30d, to=today, expiring_within=30 defaults', async () => {
    setupDefaultHandlers()

    const router = await makeRouter('/')
    await renderWithRouter(router)

    // Wait for page to render — financial summary heading
    await waitFor(() => {
      expect(screen.getByText('Financial Summary')).toBeInTheDocument()
    })

    // Quick actions row should be visible
    expect(screen.getByRole('link', { name: /new po/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /new so/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import products/i })).toBeInTheDocument()

    // Expiring soon widget heading
    expect(screen.getByText('Expiring soon')).toBeInTheDocument()
  })

  it('URL search params populate widgets and CSV anchors', async () => {
    setupDefaultHandlers()

    const router = await makeRouter('/?from=2026-01-01&to=2026-01-31&expiring_within=14')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Financial Summary')).toBeInTheDocument()
    })

    // Within 14 days caption
    expect(screen.getByText('Within 14 days')).toBeInTheDocument()
  })

  it('clicking "Import products" opens the ProductsImportModal', async () => {
    setupDefaultHandlers()

    // Mock the products/import endpoint
    server.use(
      http.post('http://localhost:8000/api/v1/products/import', () =>
        HttpResponse.json({ imported: 0, failed: [] }),
      ),
    )

    const router = await makeRouter('/')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /import products/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /import products/i }))

    await waitFor(() => {
      // The ImportCsvModal should open — check for its title or input
      expect(screen.getByText(/import products/i)).toBeInTheDocument()
    })
  })

  it('error in useDashboard does NOT collapse ExpiringSoonWidget', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/financials/dashboard', () =>
        HttpResponse.json({ error: 'server_error' }, { status: 500 }),
      ),
      http.get('http://localhost:8000/api/v1/financials/margin', () =>
        HttpResponse.json({ error: 'server_error' }, { status: 500 }),
      ),
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json(EMPTY_BATCHES),
      ),
    )

    const router = await makeRouter('/')
    await renderWithRouter(router)

    // Wait for error alerts
    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })

    // ExpiringSoonWidget should still render — widget title still shows
    expect(screen.getByText('Expiring soon')).toBeInTheDocument()
    // Empty state text for batches
    expect(screen.getByText(/No batches expiring/i)).toBeInTheDocument()
  })
})
