/**
 * SoDetailPage.test.tsx
 *
 * TDD for ILE-7 Step 3 — SO detail page (committed + voided read view).
 */

import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
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
import { SoDetailPage } from '../SoDetailPage'

const LINE_1 = {
  id: 'line-1',
  sales_order_id: 'so-1',
  product_id: 'prod-1',
  quantity: '10.0000',
  sell_price: '5.0000',
  created_at: '2026-01-10T00:00:00Z',
}

const LINE_2 = {
  id: 'line-2',
  sales_order_id: 'so-1',
  product_id: 'prod-2',
  quantity: '3.0000',
  sell_price: '12.0000',
  created_at: '2026-01-10T00:00:00Z',
}

const ALLOCATIONS = [
  {
    id: 'alloc-1',
    sales_order_line_id: 'line-1',
    batch_id: 'batch-1',
    allocated_quantity: '5.0000',
    unit_cost: '2.0000',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'alloc-2',
    sales_order_line_id: 'line-1',
    batch_id: 'batch-2',
    allocated_quantity: '5.0000',
    unit_cost: '2.5000',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'alloc-3',
    sales_order_line_id: 'line-2',
    batch_id: 'batch-3',
    allocated_quantity: '3.0000',
    unit_cost: '8.0000',
    created_at: '2026-01-15T10:00:00Z',
  },
]

const SO_COMMITTED = {
  id: 'so-1',
  customer_name: 'Acme Corp',
  customer_contact: 'orders@acme.example',
  status: 'committed',
  committed_at: '2026-01-15T10:00:00Z',
  voided_at: null,
  created_at: '2026-01-10T00:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  lines: [LINE_1, LINE_2],
  allocations: ALLOCATIONS,
}

const SO_VOIDED = {
  ...SO_COMMITTED,
  status: 'voided',
  voided_at: '2026-01-20T10:00:00Z',
}

const SO_DRAFT = {
  id: 'so-draft',
  customer_name: 'Draft Corp',
  customer_contact: null,
  status: 'draft',
  committed_at: null,
  voided_at: null,
  created_at: '2026-01-10T00:00:00Z',
  updated_at: '2026-01-10T00:00:00Z',
  lines: [],
}

async function makeRouter(soId: string, initialUrl?: string) {
  const rootRoute = createRootRoute({ component: Outlet })

  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders/$id',
    component: function DetailRoute() {
      const { id } = detailRoute.useParams()
      return <SoDetailPage soId={id} />
    },
  })

  const editRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders/$id/edit',
    component: () => <div>Edit page</div>,
  })

  const listRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders',
    component: () => <div>List page</div>,
  })

  const routeTree = rootRoute.addChildren([detailRoute, editRoute, listRoute])
  const history = createMemoryHistory({
    initialEntries: [initialUrl ?? `/sales-orders/${soId}`],
  })
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

describe('SoDetailPage', () => {
  it('happy committed: header, status badge, lines table, allocations table, Void button', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders/so-1', () =>
        HttpResponse.json(SO_COMMITTED),
      ),
    )

    const router = await makeRouter('so-1')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    // Status badge
    expect(screen.getByText('committed')).toBeInTheDocument()
    // Lines table — 2 rows
    expect(screen.getAllByText(/prod-/).length).toBeGreaterThanOrEqual(2)
    // Allocations table — 3 alloc rows (batch_id mono links)
    expect(screen.getAllByRole('link').filter((a) => /batch-/.test(a.getAttribute('href') ?? '')).length).toBeGreaterThanOrEqual(3)
    // Void button visible
    expect(screen.getByRole('button', { name: /void/i })).toBeInTheDocument()
  })

  it('voided-state UI disabling: voided banner shown, Void button absent, allocations visible', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders/so-1', () =>
        HttpResponse.json(SO_VOIDED),
      ),
    )

    const router = await makeRouter('so-1')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    // Voided banner
    expect(screen.getByText(/Voided at/)).toBeInTheDocument()
    // No Void button when already voided
    expect(screen.queryByRole('button', { name: /^void$/i })).not.toBeInTheDocument()
    // Allocations still visible (batch links rendered)
    expect(screen.getAllByRole('link').filter((a) => /batch-/.test(a.getAttribute('href') ?? '')).length).toBeGreaterThanOrEqual(1)
  })

  it('404 cross-owner: renders Not found + Back to sales orders link', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders/so-missing', () =>
        HttpResponse.json({ error: 'not_found' }, { status: 404 }),
      ),
    )

    const router = await makeRouter('so-missing')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Not found')).toBeInTheDocument()
    })
    expect(screen.getByText(/doesn.*t exist or you don.*t have access/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to sales orders/i })).toBeInTheDocument()
  })

  it('draft redirect: SO with status=draft → router navigates to /sales-orders/$id/edit', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders/so-draft', () =>
        HttpResponse.json(SO_DRAFT),
      ),
    )

    const router = await makeRouter('so-draft')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/sales-orders/so-draft/edit')
    })
  })
})
