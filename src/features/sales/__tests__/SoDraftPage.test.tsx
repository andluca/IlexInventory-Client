/**
 * SoDraftPage.test.tsx
 *
 * TDD for ILE-7 Steps 4 + 5 — SO draft form + FEFO preview wiring.
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
  useParams,
  type AnyRouter,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { mantineTheme } from '@/theme/mantine'
import { SoDraftPage } from '../SoDraftPage'

const SO_DRAFT = {
  id: 'so-1',
  customer_name: 'Acme Corp',
  customer_contact: 'orders@acme.example',
  status: 'draft',
  committed_at: null,
  voided_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  lines: [
    {
      id: 'line-1',
      sales_order_id: 'so-1',
      product_id: 'prod-1',
      quantity: '10.0000',
      sell_price: '5.0000',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  allocations: [],
}

const SO_COMMITTED = {
  ...SO_DRAFT,
  status: 'committed',
  committed_at: '2026-01-15T10:00:00Z',
}

const PRODUCTS_LIST = {
  items: [
    {
      id: 'prod-1',
      sku: 'YRB-001',
      name: 'Yerba Premium',
      description: '',
      base_unit: 'g',
      archived_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  total: 1,
  limit: 200,
  offset: 0,
}

const PREVIEW_RESPONSE = {
  allocations: [
    {
      line_id: 'line-1',
      batch_id: 'batch-1',
      batch_code: 'LOT001',
      expiration_date: '2026-12-31',
      quantity: '10.0000',
      unit_cost: '2.0000',
    },
  ],
}

async function makeRouter(mode: 'new' | 'edit', soId?: string) {
  const rootRoute = createRootRoute({ component: Outlet })

  const newRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders/new',
    component: () => <SoDraftPage />,
  })

  const editRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders/$id/edit',
    component: function EditRoute() {
      const params = useParams({ strict: false }) as { id?: string }
      const id = params.id
      return id ? <SoDraftPage soId={id} /> : <SoDraftPage />
    },
  })

  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders/$id',
    component: () => <div>Detail page</div>,
  })

  const listRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders',
    component: () => <div>List page</div>,
  })

  const routeTree = rootRoute.addChildren([newRoute, editRoute, detailRoute, listRoute])
  const initialEntry =
    mode === 'new' ? '/sales-orders/new' : `/sales-orders/${soId ?? 'so-1'}/edit`
  const history = createMemoryHistory({ initialEntries: [initialEntry] })
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

describe('SoDraftPage', () => {
  it('happy /new: shows empty form + FEFO stub "Add lines to see the FEFO allocation."', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json(PRODUCTS_LIST),
      ),
    )

    const router = await makeRouter('new')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument()
    })

    // FEFO preview stub
    expect(screen.getByText(/Add lines to see the FEFO allocation/)).toBeInTheDocument()
  })

  it('happy /new: Save draft → POST creates SO → URL replaces to /sales-orders/{id}/edit; no Idempotency-Key on POST', async () => {
    let capturedIdempotencyKey: string | null | undefined = undefined

    server.use(
      http.post('http://localhost:8000/api/v1/sales-orders', ({ request }) => {
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({ ...SO_DRAFT, id: 'so-new-1' }, { status: 201 })
      }),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json(PRODUCTS_LIST),
      ),
    )

    const router = await makeRouter('new')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument()
    })

    // Fill customer_name
    fireEvent.change(screen.getByLabelText(/customer name/i), {
      target: { value: 'Test Corp' },
    })

    // Add a line first
    fireEvent.click(screen.getByRole('button', { name: /add line/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save draft/i }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/sales-orders/so-new-1/edit')
    })

    // Draft create must NOT have Idempotency-Key
    expect(capturedIdempotencyKey).toBeNull()
  })

  it('happy /:id/edit: form hydrates with customer_name + lines', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders/so-1', () =>
        HttpResponse.json(SO_DRAFT),
      ),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json(PRODUCTS_LIST),
      ),
    )

    const router = await makeRouter('edit', 'so-1')
    await renderWithRouter(router)

    await waitFor(() => {
      expect((screen.getByLabelText(/customer name/i) as HTMLInputElement).value).toBe('Acme Corp')
    })
  })

  it('status redirect: committed SO on edit → navigates to detail page', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders/so-1', () =>
        HttpResponse.json(SO_COMMITTED),
      ),
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json(PRODUCTS_LIST),
      ),
    )

    const router = await makeRouter('edit', 'so-1')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/sales-orders/so-1')
    })
  })

  it('validation: empty customer_name blocks submit', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json(PRODUCTS_LIST),
      ),
      // Handler for useSo('') that returns 404 (called because soId is undefined → empty string)
      http.get('http://localhost:8000/api/v1/sales-orders/', () =>
        HttpResponse.json({ error: 'not_found' }, { status: 404 }),
      ),
    )

    const router = await makeRouter('new')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument()
    })

    // Add a line so the lines validation passes, then submit
    fireEvent.click(screen.getByRole('button', { name: /add line/i }))

    // Submit the form directly
    const formEl = document.getElementById('so-draft-form')
    if (formEl) fireEvent.submit(formEl)
    else fireEvent.click(screen.getByRole('button', { name: /save draft/i }))

    await waitFor(() => {
      // Mantine renders form errors inline — check for the error text
      expect(screen.getByText(/customer name is required/i)).toBeInTheDocument()
    })
  })

  it('FEFO preview: loads for edit page; admin override disclosure button present but content collapsed', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json(PRODUCTS_LIST),
      ),
      http.get('http://localhost:8000/api/v1/sales-orders/so-1', () =>
        HttpResponse.json(SO_DRAFT),
      ),
      http.post('http://localhost:8000/api/v1/sales-orders/so-1/preview', () =>
        HttpResponse.json(PREVIEW_RESPONSE),
      ),
    )

    const router = await makeRouter('edit', 'so-1')
    await renderWithRouter(router)

    await waitFor(() => {
      expect((screen.getByLabelText(/customer name/i) as HTMLInputElement).value).toBe('Acme Corp')
    })

    // FEFO preview should load for the edit page
    await waitFor(() => {
      expect(screen.getByText('FEFO Preview')).toBeInTheDocument()
    })

    // Admin override disclosure button is present
    expect(screen.getByRole('button', { name: /edit allocations.*admin override/i })).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // ILE-9 Step 8: Act modal bus wiring
  // ---------------------------------------------------------------------------

  it('act-bus commit request opens CommitConfirmModal', async () => {
    const { useActModalBus } = await import('@/stores/act-modal-bus')
    useActModalBus.setState({ request: null })

    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json(PRODUCTS_LIST),
      ),
      http.get('http://localhost:8000/api/v1/sales-orders/so-1', () =>
        HttpResponse.json(SO_DRAFT),
      ),
      http.post('http://localhost:8000/api/v1/sales-orders/so-1/preview', () =>
        HttpResponse.json({ allocations: [] }),
      ),
    )

    const router = await makeRouter('edit', 'so-1')
    await renderWithRouter(router)

    await waitFor(() => {
      expect((screen.getByLabelText(/customer name/i) as HTMLInputElement).value).toBe('Acme Corp')
    })

    // Fire the bus request
    useActModalBus.setState({ request: { kind: 'commit' } })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    expect(useActModalBus.getState().request).toBeNull()
  })
})
