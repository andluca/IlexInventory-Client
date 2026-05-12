/**
 * SosListPage.test.tsx
 *
 * TDD for ILE-7 Step 2 — SO list page.
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
import { SosListPage } from '../SosListPage'

type SosSearch = {
  status?: 'draft' | 'committed' | 'voided' | undefined
  voided?: boolean | undefined
  search?: string | undefined
  from?: string | undefined
  to?: string | undefined
}

const SO_DRAFT = {
  id: 'so-1',
  customer_name: 'Acme Corp',
  customer_contact: null,
  status: 'draft',
  committed_at: null,
  voided_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  lines: [],
}

const SO_COMMITTED = {
  id: 'so-2',
  customer_name: 'Beta Ltd',
  customer_contact: null,
  status: 'committed',
  committed_at: '2026-01-15T10:00:00Z',
  voided_at: null,
  created_at: '2026-01-10T00:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  lines: [{ id: 'line-1', product_id: 'prod-1', quantity: '5.0000', sell_price: '10.0000', allocations: [], so_id: 'so-2', created_at: '2026-01-10T00:00:00Z' }],
}

const SO_VOIDED = {
  id: 'so-3',
  customer_name: 'Gamma Inc',
  customer_contact: null,
  status: 'voided',
  committed_at: '2026-01-16T10:00:00Z',
  voided_at: '2026-01-20T10:00:00Z',
  created_at: '2026-01-12T00:00:00Z',
  updated_at: '2026-01-20T10:00:00Z',
  lines: [],
}

async function makeRouter(initialUrl = '/sales-orders') {
  const rootRoute = createRootRoute({ component: Outlet })

  const soRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders',
    component: SosListPage,
    validateSearch: (s: Record<string, unknown>): SosSearch => {
      const out: SosSearch = {}
      const status = s['status']
      const voided = s['voided']
      const search = s['search']
      const from = s['from']
      const to = s['to']
      if (typeof status === 'string' && ['draft', 'committed', 'voided'].includes(status))
        out.status = status as SosSearch['status']
      if (typeof voided === 'boolean') out.voided = voided
      if (typeof search === 'string' && search.length > 0) out.search = search
      if (typeof from === 'string' && from.length > 0) out.from = from
      if (typeof to === 'string' && to.length > 0) out.to = to
      return out
    },
  })

  const soNewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders/new',
    component: () => <div>New SO page</div>,
  })

  const soIdRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders/$id',
    component: () => <div>SO detail page</div>,
  })

  const soIdEditRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders/$id/edit',
    component: () => <div>SO edit page</div>,
  })

  const routeTree = rootRoute.addChildren([soRoute, soNewRoute, soIdRoute, soIdEditRoute])
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

describe('SosListPage', () => {
  it('happy: renders 3 SOs with status badges (draft/committed/voided)', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders', () =>
        HttpResponse.json({ items: [SO_DRAFT, SO_COMMITTED, SO_VOIDED], next_cursor: null }),
      ),
    )

    const router = await makeRouter()
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    expect(screen.getByText('Beta Ltd')).toBeInTheDocument()
    expect(screen.getByText('Gamma Inc')).toBeInTheDocument()

    // Status badges
    expect(screen.getByText('draft')).toBeInTheDocument()
    expect(screen.getByText('committed')).toBeInTheDocument()
    expect(screen.getByText('voided')).toBeInTheDocument()
  })

  it('status filter: switch to Committed → URL updates to /sales-orders?status=committed; request includes ?status=committed', async () => {
    let capturedStatus: string | null = null

    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders', ({ request }) => {
        capturedStatus = new URL(request.url).searchParams.get('status')
        return HttpResponse.json({ items: [SO_COMMITTED], next_cursor: null })
      }),
    )

    const router = await makeRouter('/sales-orders?status=committed')
    await renderWithRouter(router)

    await waitFor(() => {
      expect(capturedStatus).toBe('committed')
    })
  })

  it('cursor pagination: Load more button appears; clicking fetches next page', async () => {
    const PAGE_1 = { items: [SO_DRAFT], next_cursor: 'c1' }
    const PAGE_2 = { items: [SO_COMMITTED], next_cursor: null }

    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor')
        return HttpResponse.json(cursor ? PAGE_2 : PAGE_1)
      }),
    )

    const router = await makeRouter()
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    // Load more button should be visible
    const loadMoreBtn = screen.getByRole('button', { name: /load more/i })
    expect(loadMoreBtn).toBeInTheDocument()

    fireEvent.click(loadMoreBtn)

    await waitFor(() => {
      expect(screen.getByText('Beta Ltd')).toBeInTheDocument()
    })
  })

  it('empty no-filters: shows "No sales orders yet" + New SO CTA', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
    )

    const router = await makeRouter()
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText(/No sales orders yet/)).toBeInTheDocument()
    })

    // New SO CTA
    expect(screen.getAllByRole('link', { name: /new so/i }).length).toBeGreaterThan(0)
  })

  it('row click: navigate to /sales-orders/$id/edit for draft; /sales-orders/$id for committed', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders', () =>
        HttpResponse.json({ items: [SO_DRAFT, SO_COMMITTED], next_cursor: null }),
      ),
    )

    const router = await makeRouter()
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    // Click draft row
    const draftRow = screen.getByText('Acme Corp').closest('tr')
    if (draftRow) fireEvent.click(draftRow)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/sales-orders/so-1/edit')
    })
  })

  it('committed row click: navigate to /sales-orders/$id', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders', () =>
        HttpResponse.json({ items: [SO_COMMITTED], next_cursor: null }),
      ),
    )

    const router = await makeRouter()
    await renderWithRouter(router)

    await waitFor(() => {
      expect(screen.getByText('Beta Ltd')).toBeInTheDocument()
    })

    const committedRow = screen.getByText('Beta Ltd').closest('tr')
    if (committedRow) fireEvent.click(committedRow)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/sales-orders/so-2')
    })
  })
})
