import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
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
import { ProductsListPage } from '../ProductsListPage'

const PRODUCT_1 = {
  id: 'prod-1',
  sku: 'YRB-001',
  name: 'Yerba Premium',
  description: 'Premium yerba',
  base_unit: 'g',
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const PRODUCT_2 = {
  id: 'prod-2',
  sku: 'TEA-001',
  name: 'Green Tea',
  description: '',
  base_unit: 'g',
  archived_at: '2024-06-01T00:00:00Z',
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
}

async function makeRouter(initialPath = '/products') {
  const rootRoute = createRootRoute({ component: Outlet })

  const productsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/products',
    component: ProductsListPage,
    validateSearch: (search: Record<string, unknown>) => ({
      search: typeof search.search === 'string' ? search.search : undefined,
      archived:
        search.archived === 'true' ? true : search.archived === 'false' ? false : undefined,
      page: typeof search.page === 'number' ? search.page : 1,
    }),
  })

  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/products/$id',
    component: () => <div data-testid="product-detail">Detail</div>,
  })

  const routeTree = rootRoute.addChildren([productsRoute, detailRoute])
  const history = createMemoryHistory({ initialEntries: [initialPath] })
  const router = createRouter({ routeTree, history })
  await router.load()
  return router
}

async function renderWithRouter(router: AnyRouter, qc?: QueryClient) {
  const queryClient = qc ?? new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })

  const { render } = await import('@testing-library/react')
  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <QueryClientProvider client={queryClient}>
        <Notifications />
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>,
  )
}

describe('ProductsListPage', () => {
  it('happy: renders product rows from MSW response', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({
          items: [PRODUCT_1, PRODUCT_2],
          total: 2,
          limit: 50,
          offset: 0,
        }),
      ),
    )

    const router = await makeRouter('/products')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('YRB-001')).toBeInTheDocument()
      expect(screen.getByText('Yerba Premium')).toBeInTheDocument()
    })

    expect(screen.getByText('TEA-001')).toBeInTheDocument()
  })

  it('empty no-filters: renders empty state with CTAs + agent-prompt button', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [], total: 0, limit: 50, offset: 0 }),
      ),
    )

    const router = await makeRouter('/products')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText(/no products yet/i)).toBeInTheDocument()
    })

    expect(screen.getAllByRole('button', { name: /new product/i }).length).toBeGreaterThan(0)
    // Agent prompt button
    expect(screen.getByRole('button', { name: /ask ilex/i })).toBeInTheDocument()
  })

  it('empty with search filter: renders filter empty state', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [], total: 0, limit: 50, offset: 0 }),
      ),
    )

    const router = await makeRouter('/products?search=yrb')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText(/no products match/i)).toBeInTheDocument()
    })
  })

  it('search: search input updates the request query string', async () => {
    let capturedSearch: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/products', ({ request }) => {
        const url = new URL(request.url)
        const s = url.searchParams.get('search')
        if (s) capturedSearch = s
        return HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 50, offset: 0 })
      }),
    )

    const router = await makeRouter('/products')
    await renderWithRouter(router)

    // Wait for initial load
    await waitFor(() => expect(screen.getByText('YRB-001')).toBeInTheDocument())

    const searchInput = screen.getByPlaceholderText(/search/i)
    await userEvent.type(searchInput, 'yrb')

    // Debounced 250ms — wait for the request
    await waitFor(
      () => {
        expect(capturedSearch).toBe('yrb')
      },
      { timeout: 2000 },
    )
  })

  it('pagination: shows Showing N-M of T footer', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({
          items: Array.from({ length: 50 }, (_, i) => ({
            ...PRODUCT_1,
            id: `prod-${i}`,
            sku: `SKU-${i}`,
            name: `Product ${i}`,
          })),
          total: 80,
          limit: 50,
          offset: 0,
        }),
      ),
    )

    const router = await makeRouter('/products')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText(/showing/i)).toBeInTheDocument()
    })

    expect(document.body.textContent).toMatch(/1.+50.+80/)
  })

  it('server error: renders error alert above table', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ error: 'server_error', detail: 'Internal server error' }, { status: 500 }),
      ),
    )

    const router = await makeRouter('/products')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument()
    })
  })
})
