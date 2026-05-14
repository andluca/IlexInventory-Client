/**
 * BatchDetailPage.test.tsx
 *
 * TDD for ILE-6 Step 3 (shell + F12) and Steps 4–5 (modals + recall banner).
 * Surface-listed tests:
 *  - recall flag UI flip + reason banner integration test
 *  - metadata_correction row in audit after F12 save
 *  - F12 PATCH allowlist (no unit_cost / on_hand / is_recalled inputs on detail page)
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
import { BatchDetailPage } from '../BatchDetailPage'
import { csvExportUrl } from '@/utils/csv-export'

const BATCH_ACTIVE = {
  id: 'batch-1',
  owner_id: 1,
  product_id: 'prod-1',
  purchase_order_line_id: null,
  batch_code: 'LOT-A',
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
  ...BATCH_ACTIVE,
  is_recalled: true,
  recall_reason: 'Listeria detected',
  recalled_at: '2024-06-01T12:00:00Z',
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

const EMPTY_MOVEMENTS = { items: [], next_cursor: null }

const MOVEMENT_METADATA = {
  id: 'mov-meta-1',
  owner_id: 1,
  batch_id: 'batch-1',
  kind: 'metadata_correction',
  signed_quantity: '0.0000',
  notes: null,
  reference_type: null,
  reference_id: null,
  created_at: '2024-06-02T00:00:00Z',
}

async function makeRouter(batchId: string) {
  const rootRoute = createRootRoute({ component: Outlet })

  const stockRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/stock',
    component: () => <div>Stock</div>,
  })

  const batchRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/batches/$id',
    component: () => {
      const { id } = batchRoute.useParams()
      return <BatchDetailPage batchId={id} />
    },
  })

  const routeTree = rootRoute.addChildren([batchRoute, stockRoute])
  const history = createMemoryHistory({ initialEntries: [`/batches/${batchId}`] })
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

describe('BatchDetailPage', () => {
  it('happy active batch: header shows product name, batch_code, action bar with 5 buttons', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches/batch-1', () =>
        HttpResponse.json(BATCH_ACTIVE),
      ),
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 200, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json(EMPTY_MOVEMENTS),
      ),
    )

    const router = await makeRouter('batch-1')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Yerba Premium')).toBeInTheDocument()
    })

    // batch_code appears in header and in BatchMetadataEditor display mode — use getAllByText
    expect(screen.getAllByText('LOT-A').length).toBeGreaterThan(0)
    // Action bar: Adjust, Write off, Recall, New batch, Edit metadata
    expect(screen.getByRole('button', { name: /adjust/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /write off/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /recall/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /new batch/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /edit metadata/i })).toBeInTheDocument()
  })

  it('404 cross-owner: renders Not found + back link', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches/batch-missing', () =>
        HttpResponse.json({ error: 'not_found' }, { status: 404 }),
      ),
    )

    const router = await makeRouter('batch-missing')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /back to stock/i })).toBeInTheDocument()
  })

  it('recalled batch: shows clay StatusBanner, Un-recall button, action bar disabled', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches/batch-1', () =>
        HttpResponse.json(BATCH_RECALLED),
      ),
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 200, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json(EMPTY_MOVEMENTS),
      ),
    )

    const router = await makeRouter('batch-1')
    await renderWithRouter(router)

    // StatusBanner (role="status") shows the recalled-on text
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
    expect(screen.getByRole('status').textContent).toMatch(/this batch was recalled on/i)

    // Un-recall button visible in action bar
    expect(screen.getAllByRole('button', { name: /un-recall/i }).length).toBeGreaterThan(0)

    // Adjust and Write off should be disabled
    expect(screen.getByRole('button', { name: /adjust/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /write off/i })).toBeDisabled()
  })

  it('movements audit CSV button: href matches csvExportUrl for /movements?batch_id=batch-1', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches/batch-1', () =>
        HttpResponse.json(BATCH_ACTIVE),
      ),
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 200, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json(EMPTY_MOVEMENTS),
      ),
    )

    const router = await makeRouter('batch-1')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Yerba Premium')).toBeInTheDocument()
    })

    const expectedHref = csvExportUrl('/movements', { batch_id: 'batch-1' })
    const auditCsvLink = screen.getByRole('link', { name: /download audit csv/i })
    expect(auditCsvLink).toHaveAttribute('href', expectedHref)
  })

  it('metadata_correction row appears in audit timeline after F12 save (surface-listed)', async () => {
    let movementCallCount = 0

    server.use(
      http.get('http://localhost:8000/api/v1/batches/batch-1', () =>
        HttpResponse.json(BATCH_ACTIVE),
      ),
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 200, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () => {
        movementCallCount++
        if (movementCallCount >= 2) {
          // Second call returns movements with metadata_correction after invalidation
          return HttpResponse.json({
            items: [MOVEMENT_METADATA],
            next_cursor: null,
          })
        }
        return HttpResponse.json(EMPTY_MOVEMENTS)
      }),
      http.patch('http://localhost:8000/api/v1/batches/batch-1', () =>
        HttpResponse.json({ ...BATCH_ACTIVE, batch_code: 'LOT-A-CORR' }),
      ),
    )

    const router = await makeRouter('batch-1')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getAllByText('LOT-A').length).toBeGreaterThan(0)
    })

    // Click Edit metadata to open editor
    fireEvent.click(screen.getByRole('button', { name: /edit metadata/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/batch code/i)).toBeInTheDocument()
    })

    // Save
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    // After invalidation, movements reload and metadata_correction appears
    await waitFor(() => {
      expect(screen.getByText('metadata_correction')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // ILE-10 Step 1: "View recall report" link in action bar
  // ---------------------------------------------------------------------------

  it('action bar contains "View recall report" link pointing to /batches/:id/recall-report', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches/batch-1', () =>
        HttpResponse.json(BATCH_ACTIVE),
      ),
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 200, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json(EMPTY_MOVEMENTS),
      ),
    )

    const router = await makeRouter('batch-1')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Yerba Premium')).toBeInTheDocument()
    })

    const link = screen.getByRole('link', { name: /view recall report/i })
    expect(link).toHaveAttribute('href', '/batches/batch-1/recall-report')
  })

  // ---------------------------------------------------------------------------
  // ILE-9 Step 8: Act modal bus wiring
  // ---------------------------------------------------------------------------

  it('act-bus recall request opens RecallModal', async () => {
    const { useActModalBus } = await import('@/stores/act-modal-bus')
    useActModalBus.setState({ request: null })

    server.use(
      http.get('http://localhost:8000/api/v1/batches/batch-1', () =>
        HttpResponse.json(BATCH_ACTIVE),
      ),
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 200, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json(EMPTY_MOVEMENTS),
      ),
    )

    const router = await makeRouter('batch-1')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Yerba Premium')).toBeInTheDocument()
    })

    // Fire the bus request — should open the RecallModal
    useActModalBus.setState({ request: { kind: 'recall', batchId: 'batch-1' } })

    await waitFor(() => {
      // RecallModal should be open — look for a modal dialog with recall-related content
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // After opening, the bus should be cleared
    expect(useActModalBus.getState().request).toBeNull()
  })

  it('act-bus unrecall request opens UnRecallModal', async () => {
    const { useActModalBus } = await import('@/stores/act-modal-bus')
    useActModalBus.setState({ request: null })

    server.use(
      http.get('http://localhost:8000/api/v1/batches/batch-1', () =>
        HttpResponse.json(BATCH_RECALLED),
      ),
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 200, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json(EMPTY_MOVEMENTS),
      ),
    )

    const router = await makeRouter('batch-1')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    // Fire the bus request — should open the UnRecallModal
    useActModalBus.setState({ request: { kind: 'unrecall', batchId: 'batch-1' } })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    expect(useActModalBus.getState().request).toBeNull()
  })
})
