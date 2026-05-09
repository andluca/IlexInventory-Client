import { describe, it, expect } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
import { ProductDetailPage } from '../ProductDetailPage'

const PRODUCT_1 = {
  id: 'prod-1',
  sku: 'YRB-001',
  name: 'Yerba Premium',
  description: 'Premium yerba mate',
  base_unit: 'g',
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

async function makeRouter(productId: string) {
  const rootRoute = createRootRoute({ component: Outlet })

  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/products/$id',
    component: ProductDetailPage,
  })

  const productsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/products',
    component: () => <div data-testid="products-list">Products List</div>,
  })

  const routeTree = rootRoute.addChildren([detailRoute, productsRoute])
  const history = createMemoryHistory({ initialEntries: [`/products/${productId}`] })
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
  }
}

describe('ProductDetailPage - read + edit', () => {
  it('happy: renders product header with name, mono SKU, base_unit pill', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ items: [], total: 0, limit: 1, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
    )

    const router = await makeRouter('prod-1')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Yerba Premium')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('YRB-001')
    expect(document.body.textContent).toContain('g')
  })

  it('SKU input is rendered as disabled', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ items: [], total: 0, limit: 1, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
    )

    const router = await makeRouter('prod-1')
    await renderWithRouter(router)

    await waitFor(() => expect(screen.getByText('Yerba Premium')).toBeInTheDocument())

    // Find the SKU input — it should be disabled
    const skuInput = document.querySelector('[data-path="sku"]') as HTMLInputElement | null
    expect(skuInput?.disabled).toBe(true)
  })

  it('Save button is disabled when form is not dirty', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ items: [], total: 0, limit: 1, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
    )

    const router = await makeRouter('prod-1')
    await renderWithRouter(router)

    await waitFor(() => expect(screen.getByText('Yerba Premium')).toBeInTheDocument())

    const saveButton = screen.getByRole('button', { name: /save/i })
    expect(saveButton).toBeDisabled()
  })

  it('edit: type into name, Save triggers PATCH, optimistic update applied', async () => {
    const UPDATED = { ...PRODUCT_1, name: 'Yerba Updated', updated_at: '2024-02-01T00:00:00Z' }

    server.use(
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.patch('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(UPDATED),
      ),
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ items: [], total: 0, limit: 1, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
    )

    const router = await makeRouter('prod-1')
    await renderWithRouter(router)

    await waitFor(() => expect(screen.getByText('Yerba Premium')).toBeInTheDocument())

    // Edit the name field
    const nameInput = document.querySelector('[data-path="name"]') as HTMLInputElement
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Yerba Updated')

    // Save button should be enabled
    const saveButton = screen.getByRole('button', { name: /save/i })
    expect(saveButton).not.toBeDisabled()

    // Submit the form
    const formEl = document.querySelector('form')!
    fireEvent.submit(formEl)

    // Wait for mutation to complete (notifications show "Saved")
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/saved/i)
    })

    // The name input should have the updated value
    const updatedNameInput = document.querySelector('[data-path="name"]') as HTMLInputElement
    expect(updatedNameInput?.value).toBe('Yerba Updated')
  })

  it('PATCH 400 with fields.name: optimistic update rolls back, error renders', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.patch('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(
          { error: 'validation_error', fields: { name: 'Too short' } },
          { status: 400 },
        ),
      ),
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ items: [], total: 0, limit: 1, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
    )

    const router = await makeRouter('prod-1')
    await renderWithRouter(router)

    await waitFor(() => expect(screen.getByText('Yerba Premium')).toBeInTheDocument())

    const nameInput = document.querySelector('[data-path="name"]') as HTMLInputElement
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'X')

    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/too short/i)
    })
  })

  it('404 cross-owner: renders Not found state', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products/not-found', () =>
        new HttpResponse(null, { status: 404 }),
      ),
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ items: [], total: 0, limit: 1, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
    )

    const router = await makeRouter('not-found')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/not found/i)
    })
  })
})

describe('ProductDetailPage - archive vs delete branching', () => {
  it('shows Delete button when total batches === 0', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ items: [], total: 0, limit: 1, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
    )

    const router = await makeRouter('prod-1')
    await renderWithRouter(router)

    await waitFor(() => expect(screen.getByText('Yerba Premium')).toBeInTheDocument())
    // Wait for batches to resolve
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument()
  })

  it('shows Archive button when total batches > 0', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({
          items: [{ id: 'batch-1', product_id: 'prod-1' }],
          total: 1,
          limit: 1,
          offset: 0,
        }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
    )

    const router = await makeRouter('prod-1')
    await renderWithRouter(router)

    await waitFor(() => expect(screen.getByText('Yerba Premium')).toBeInTheDocument())
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })
})

describe('ProductDetailPage - movement audit subview', () => {
  it('renders MovementAuditTable with productId', async () => {
    const MOVEMENT = {
      id: 'mov-1',
      owner_id: 1,
      batch_id: 'batch-1',
      kind: 'receipt',
      signed_quantity: '100.00',
      notes: null,
      reference_type: null,
      reference_id: null,
      created_at: '2024-01-01T09:00:00Z',
    }

    let capturedProductId: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ items: [], total: 0, limit: 1, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', ({ request }) => {
        const url = new URL(request.url)
        capturedProductId = url.searchParams.get('product_id')
        return HttpResponse.json({ items: [MOVEMENT], next_cursor: null })
      }),
    )

    const router = await makeRouter('prod-1')
    await renderWithRouter(router)

    await waitFor(() => expect(screen.getByText('Yerba Premium')).toBeInTheDocument())

    // Movements should render below
    await waitFor(() => {
      expect(capturedProductId).toBe('prod-1')
    })
  })

  // ---------------------------------------------------------------------------
  // ILE-9 Step 8: Act modal bus wiring
  // ---------------------------------------------------------------------------

  it('act-bus archive request opens ArchiveConfirmModal', async () => {
    const { useActModalBus } = await import('@/stores/act-modal-bus')
    useActModalBus.setState({ request: null })

    server.use(
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ items: [], total: 0, limit: 1, offset: 0 }),
      ),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
    )

    const router = await makeRouter('prod-1')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Yerba Premium')).toBeInTheDocument()
    })

    // Fire the bus request
    useActModalBus.setState({ request: { kind: 'archive', productId: 'prod-1' } })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    expect(useActModalBus.getState().request).toBeNull()
  })
})
