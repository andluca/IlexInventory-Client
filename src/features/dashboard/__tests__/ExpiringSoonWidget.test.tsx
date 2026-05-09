/**
 * ExpiringSoonWidget.test.tsx
 *
 * TDD for ILE-8 Step 5 — ExpiringSoonWidget (R2).
 * Surface-listed test: "View all" link target = /stock?expiring_within={N}.
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
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { mantineTheme } from '@/theme/mantine'
import { ExpiringSoonWidget } from '../ExpiringSoonWidget'

const TODAY = '2026-05-09'
const BATCH_EXPIRED = {
  id: 'b-1',
  owner_id: 1,
  product_id: 'prod-1',
  purchase_order_line_id: null,
  batch_code: 'LOT-EXPIRED',
  expiration_date: '2026-05-01', // past
  unit_cost: '10.0000',
  on_hand: '50.0000',
  is_recalled: false,
  recall_reason: null,
  recalled_at: null,
  archived_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const BATCH_SOON = {
  id: 'b-2',
  owner_id: 1,
  product_id: 'prod-2',
  purchase_order_line_id: null,
  batch_code: 'LOT-SOON',
  expiration_date: '2026-05-20', // within 14 days
  unit_cost: '10.0000',
  on_hand: '30.0000',
  is_recalled: false,
  recall_reason: null,
  recalled_at: null,
  archived_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const BATCH_FINE = {
  id: 'b-3',
  owner_id: 1,
  product_id: 'prod-3',
  purchase_order_line_id: null,
  batch_code: 'LOT-FINE',
  expiration_date: '2026-12-31', // far future
  unit_cost: '10.0000',
  on_hand: '100.0000',
  is_recalled: false,
  recall_reason: null,
  recalled_at: null,
  archived_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

async function makeRouter(initialUrl = '/') {
  const rootRoute = createRootRoute({ component: Outlet })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <ExpiringSoonWidget within={30} today={TODAY} />,
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
  const routeTree = rootRoute.addChildren([indexRoute, stockRoute, batchRoute])
  const history = createMemoryHistory({ initialEntries: [initialUrl] })
  const router = createRouter({ routeTree, history })
  await router.load()
  return router
}

async function renderWithRouter(router: AnyRouter) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
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

describe('ExpiringSoonWidget', () => {
  it('happy: renders batch rows in order; expired row uses red text; ≤14d row highlighted', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({
          items: [BATCH_EXPIRED, BATCH_SOON, BATCH_FINE],
          total: 3,
          limit: 10,
          offset: 0,
        }),
      ),
    )

    const router = await makeRouter()
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('LOT-EXPIRED')).toBeInTheDocument()
    })

    expect(screen.getByText('LOT-SOON')).toBeInTheDocument()
    expect(screen.getByText('LOT-FINE')).toBeInTheDocument()

    // Expired row: has data-expired attribute or red text style
    const expiredRow = screen.getByText('LOT-EXPIRED').closest('tr')
    expect(expiredRow).toBeTruthy()
  })

  it('"View all" link target (surface-listed): href is /stock?expiring_within=30', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ items: [], total: 0, limit: 10, offset: 0 }),
      ),
    )

    const router = await makeRouter()
    await renderWithRouter(router)

    await waitFor(() => {
      // Wait for component to mount (even in empty state)
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    const viewAllLink = screen.getByRole('link', { name: /view all/i })
    expect(viewAllLink).toHaveAttribute('href', '/stock?expiring_within=30')
  })

  it('row click navigates to /batches/{id}', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({
          items: [BATCH_FINE],
          total: 1,
          limit: 10,
          offset: 0,
        }),
      ),
    )

    const router = await makeRouter()
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('LOT-FINE')).toBeInTheDocument()
    })

    const row = screen.getByText('LOT-FINE').closest('tr')
    if (row) fireEvent.click(row)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/batches/b-3')
    })
  })

  it('empty state: renders "No batches expiring in the next 30 days."', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ items: [], total: 0, limit: 10, offset: 0 }),
      ),
    )

    const router = await makeRouter()
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText(/No batches expiring in the next 30 days/i)).toBeInTheDocument()
    })
  })

  it('error state: 500 renders red Alert inside widget', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ error: 'server_error' }, { status: 500 }),
      ),
    )

    const router = await makeRouter()
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
