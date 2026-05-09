/**
 * RecallReportPage.test.tsx
 *
 * TDD for ILE-10 Step 1 (R7 — RecallReportPage).
 * Surface-listed tests:
 *  - renders rows from MSW handler returning 2 items
 *  - renders <EmptyState> when items=[]
 *  - CSV button anchor href ends with /recall-report?format=csv
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
import { RecallReportPage } from '../RecallReportPage'

const BATCH_ID = 'batch-abc'

const BATCH = {
  id: BATCH_ID,
  owner_id: 1,
  product_id: 'prod-1',
  purchase_order_line_id: null,
  batch_code: 'RG-2025-0042',
  expiration_date: '2026-12-31',
  unit_cost: '18.5000',
  on_hand: '50.0000',
  is_recalled: true,
  recall_reason: 'FDA labeling defect',
  recalled_at: '2026-05-09T10:00:00Z',
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const PRODUCT = {
  id: 'prod-1',
  sku: 'RGP-250',
  name: 'Roasted Guarana Powder 250g',
  description: '',
  base_unit: 'kg',
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const RECALL_REPORT_2_ITEMS = {
  items: [
    {
      sale_order_id: 'so-1',
      customer_name: 'Acme Co',
      customer_contact: 'john@acme.com',
      quantity_received: '12.0000',
      sale_committed_at: '2026-04-28T00:00:00Z',
    },
    {
      sale_order_id: 'so-2',
      customer_name: 'Beta Foods',
      customer_contact: null,
      quantity_received: '6.0000',
      sale_committed_at: '2026-05-01T00:00:00Z',
    },
  ],
  total: 2,
  limit: 50,
  offset: 0,
}

const RECALL_REPORT_EMPTY = {
  items: [],
  total: 0,
  limit: 50,
  offset: 0,
}

async function makeRouter(batchId: string) {
  const rootRoute = createRootRoute({ component: Outlet })

  const salesOrderRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders/$id',
    component: () => <div>SalesOrder</div>,
  })

  const recallReportRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/batches/$id/recall-report',
    component: () => {
      const { id } = recallReportRoute.useParams()
      return <RecallReportPage batchId={id} />
    },
  })

  const routeTree = rootRoute.addChildren([recallReportRoute, salesOrderRoute])
  const history = createMemoryHistory({
    initialEntries: [`/batches/${batchId}/recall-report`],
  })
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

describe('RecallReportPage', () => {
  it('renders 2 rows when MSW returns 2 items', async () => {
    server.use(
      http.get(`http://localhost:8000/api/v1/batches/${BATCH_ID}`, () =>
        HttpResponse.json(BATCH),
      ),
      http.get(`http://localhost:8000/api/v1/products/prod-1`, () =>
        HttpResponse.json(PRODUCT),
      ),
      http.get(`http://localhost:8000/api/v1/batches/${BATCH_ID}/recall-report`, () =>
        HttpResponse.json(RECALL_REPORT_2_ITEMS),
      ),
    )

    const router = await makeRouter(BATCH_ID)
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Acme Co')).toBeInTheDocument()
    })

    expect(screen.getByText('Beta Foods')).toBeInTheDocument()
    // Allocated quantities displayed
    expect(screen.getByText('12.0000')).toBeInTheDocument()
    expect(screen.getByText('6.0000')).toBeInTheDocument()
    // SO links rendered
    expect(screen.getByRole('link', { name: /so-1/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /so-2/i })).toBeInTheDocument()
  })

  it('renders EmptyState when items=[]', async () => {
    server.use(
      http.get(`http://localhost:8000/api/v1/batches/${BATCH_ID}`, () =>
        HttpResponse.json(BATCH),
      ),
      http.get(`http://localhost:8000/api/v1/products/prod-1`, () =>
        HttpResponse.json(PRODUCT),
      ),
      http.get(`http://localhost:8000/api/v1/batches/${BATCH_ID}/recall-report`, () =>
        HttpResponse.json(RECALL_REPORT_EMPTY),
      ),
    )

    const router = await makeRouter(BATCH_ID)
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText(/no shipments to recall/i)).toBeInTheDocument()
    })

    expect(
      screen.getByText(/this batch has not been sold or has only been allocated to voided sos/i),
    ).toBeInTheDocument()
  })

  it('CSV button anchor href ends with /batches/{id}/recall-report?format=csv', async () => {
    server.use(
      http.get(`http://localhost:8000/api/v1/batches/${BATCH_ID}`, () =>
        HttpResponse.json(BATCH),
      ),
      http.get(`http://localhost:8000/api/v1/products/prod-1`, () =>
        HttpResponse.json(PRODUCT),
      ),
      http.get(`http://localhost:8000/api/v1/batches/${BATCH_ID}/recall-report`, () =>
        HttpResponse.json(RECALL_REPORT_2_ITEMS),
      ),
    )

    const router = await makeRouter(BATCH_ID)
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Acme Co')).toBeInTheDocument()
    })

    const csvLink = screen.getByRole('link', { name: /export csv/i })
    expect(csvLink).toHaveAttribute(
      'href',
      expect.stringContaining(`/batches/${BATCH_ID}/recall-report?format=csv`),
    )
  })
})
