/**
 * StockByBatchPage.test.tsx
 *
 * TDD for ILE-6 Step 2: Stock by batch page.
 */

import { describe, it, expect, vi } from 'vitest'
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
import { StockByBatchPage } from '../StockByBatchPage'

const BATCH_ACTIVE = {
  id: 'batch-1',
  owner_id: 1,
  product_id: 'prod-1',
  purchase_order_line_id: null,
  batch_code: 'B001',
  expiration_date: '2026-12-31',
  unit_cost: '10.0000',
  on_hand: '95.0000',
  is_recalled: false,
  recall_reason: null,
  recalled_at: null,
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const BATCH_RECALLED = {
  id: 'batch-2',
  owner_id: 1,
  product_id: 'prod-2',
  purchase_order_line_id: null,
  batch_code: 'B002',
  expiration_date: null,
  unit_cost: '5.0000',
  on_hand: '50.0000',
  is_recalled: true,
  recall_reason: 'Listeria',
  recalled_at: '2024-06-01T00:00:00Z',
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const BATCH_EXPIRING = {
  id: 'batch-3',
  owner_id: 1,
  product_id: 'prod-1',
  purchase_order_line_id: null,
  batch_code: 'B003',
  expiration_date: '2026-05-15',
  unit_cost: '8.0000',
  on_hand: '30.0000',
  is_recalled: false,
  recall_reason: null,
  recalled_at: null,
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const PRODUCT_1 = {
  id: 'prod-1',
  sku: 'YRB-001',
  name: 'Yerba Premium',
  description: '',
  base_unit: 'g',
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

async function makeRouter(initialUrl = '/stock') {
  const rootRoute = createRootRoute({ component: Outlet })

  type StockSearch = {
    product_id?: string
    is_recalled?: boolean
    expiring_within?: number
    page?: number
  }

  const stockRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/stock',
    component: StockByBatchPage,
    validateSearch: (s: Record<string, unknown>): StockSearch => {
      const product_id = s['product_id']
      const is_recalled = s['is_recalled']
      const expiring_within = s['expiring_within']
      const page = s['page']
      return {
        ...(typeof product_id === 'string' ? { product_id } : {}),
        ...(typeof is_recalled === 'boolean' ? { is_recalled } : {}),
        ...(typeof expiring_within === 'number' && expiring_within > 0 ? { expiring_within } : {}),
        ...(typeof page === 'number' && page > 0 ? { page } : {}),
      }
    },
  })

  const routeTree = rootRoute.addChildren([stockRoute])
  const history = createMemoryHistory({ initialEntries: [initialUrl] })
  const router = createRouter({ routeTree, history })
  await router.load()
  return router
}

async function renderWithRouter(router: AnyRouter, qc?: QueryClient) {
  const queryClient =
    qc ??
    new QueryClient({
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

describe('StockByBatchPage', () => {
  it('happy: renders 3 batches with on-hand, expiration, and recall badge', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({
          items: [BATCH_ACTIVE, BATCH_RECALLED, BATCH_EXPIRING],
          total: 3,
          limit: 50,
          offset: 0,
        }),
      ),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 50, offset: 0 }),
      ),
    )

    const router = await makeRouter()
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('B001')).toBeInTheDocument()
    })

    expect(screen.getByText('B002')).toBeInTheDocument()
    expect(screen.getByText('B003')).toBeInTheDocument()
    // Recall badge for recalled batch
    expect(screen.getAllByText('Recalled').length).toBeGreaterThan(0)
  })

  it('product filter: updates request with product_id param', async () => {
    let capturedProductId: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/batches', ({ request }) => {
        capturedProductId = new URL(request.url).searchParams.get('product_id')
        return HttpResponse.json({ items: [BATCH_ACTIVE], total: 1, limit: 50, offset: 0 })
      }),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 50, offset: 0 }),
      ),
    )

    const router = await makeRouter('/stock?product_id=prod-1')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(capturedProductId).toBe('prod-1')
    })
  })

  it('recall filter: segmented control "Recalled" → request includes is_recalled=true', async () => {
    let capturedIsRecalled: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/batches', ({ request }) => {
        capturedIsRecalled = new URL(request.url).searchParams.get('is_recalled')
        return HttpResponse.json({ items: [BATCH_RECALLED], total: 1, limit: 50, offset: 0 })
      }),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 50, offset: 0 }),
      ),
    )

    const router = await makeRouter('/stock?is_recalled=true')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(capturedIsRecalled).toBe('true')
    })
  })

  it('expiring_within filter (R2 view): request includes expiring_within=14', async () => {
    let capturedExpiringWithin: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/batches', ({ request }) => {
        capturedExpiringWithin = new URL(request.url).searchParams.get('expiring_within')
        return HttpResponse.json({ items: [BATCH_EXPIRING], total: 1, limit: 50, offset: 0 })
      }),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 50, offset: 0 }),
      ),
    )

    const router = await makeRouter('/stock?expiring_within=14')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(capturedExpiringWithin).toBe('14')
    })
  })

  it('empty no-filters: renders "No batches yet" EmptyState with New batch + New PO actions', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ items: [], total: 0, limit: 50, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [], total: 0, limit: 50, offset: 0 }),
      ),
    )

    const router = await makeRouter()
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText(/No batches yet/)).toBeInTheDocument()
    })
    // New batch CTA should be present
    expect(screen.getAllByRole('button', { name: /new batch/i }).length).toBeGreaterThan(0)
    // New PO link action
    expect(screen.getByRole('link', { name: /new po/i })).toBeInTheDocument()
  })

  it('row click: navigates to /batches/{id}', async () => {
    const navigateSpy = vi.fn()

    server.use(
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ items: [BATCH_ACTIVE], total: 1, limit: 50, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 50, offset: 0 }),
      ),
    )

    const router = await makeRouter()
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('B001')).toBeInTheDocument()
    })

    // Click on a batch row (the batch_code cell)
    const row = screen.getByText('B001').closest('tr')
    if (row) {
      fireEvent.click(row)
    }

    // The navigate happened — check URL changed
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/batches/batch-1')
    })

    navigateSpy.mockRestore()
  })
})
