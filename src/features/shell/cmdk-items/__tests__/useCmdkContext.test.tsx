/**
 * useCmdkContext.test.tsx
 *
 * TDD for ILE-9 Step 6 — useCmdkContext route-aware hook.
 * 4 tests:
 *  1. /batches/:id → kind=batch + batchId
 *  2. /sales-orders/:id → kind=so-detail + soId
 *  3. /products/:id → kind=product-detail + productId + productHasBatches flag
 *  4. /stock → kind=other
 *
 * Uses a component spy pattern since useCmdkContext requires TanStack Router context.
 */

import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { mantineTheme } from '@/theme/mantine'
import { useCmdkContext } from '../useCmdkContext'
import type { CmdkContext } from '../useCmdkContext'

// Component spy: renders the context as JSON in a testid for assertions
function ContextSpy() {
  const ctx = useCmdkContext()
  return <div data-testid="ctx">{JSON.stringify(ctx)}</div>
}

function getCtx(): CmdkContext {
  const el = screen.getByTestId('ctx')
  return JSON.parse(el.textContent ?? '{}') as CmdkContext
}

const BATCH_ACTIVE = {
  id: 'batch-1',
  owner_id: 1,
  product_id: 'prod-1',
  purchase_order_line_id: null,
  batch_code: 'LOT-A',
  expiration_date: null,
  unit_cost: '10.0000',
  on_hand: '95.0000',
  is_recalled: false,
  recall_reason: null,
  recalled_at: null,
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const SO_COMMITTED = {
  id: 'so-1',
  customer_name: 'Acme',
  customer_contact: '',
  status: 'committed',
  committed_at: '2026-01-15T00:00:00Z',
  voided_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  lines: [],
  allocations: [],
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

async function renderAtPath(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  const rootRoute = createRootRoute({ component: Outlet })

  const batchRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/batches/$id',
    component: ContextSpy,
  })
  const soDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders/$id/',
    component: ContextSpy,
  })
  const soEditRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders/$id/edit',
    component: ContextSpy,
  })
  const soNewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders/new',
    component: ContextSpy,
  })
  const productRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/products/$id',
    component: ContextSpy,
  })
  const stockRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/stock',
    component: ContextSpy,
  })

  const routeTree = rootRoute.addChildren([
    batchRoute,
    soDetailRoute,
    soEditRoute,
    soNewRoute,
    productRoute,
    stockRoute,
  ])
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = createRouter({ routeTree, history })
  await router.load()

  render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>,
  )

  // Wait for context spy to render
  await waitFor(() => screen.getByTestId('ctx'))
}

describe('useCmdkContext', () => {
  it('/batches/:id → kind=batch + batchId from route', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches/batch-1', () =>
        HttpResponse.json(BATCH_ACTIVE),
      ),
    )

    await renderAtPath('/batches/batch-1')

    await waitFor(() => {
      expect(getCtx().kind).toBe('batch')
    })
    const ctx = getCtx()
    expect(ctx.kind === 'batch' && ctx.batchId).toBe('batch-1')
  })

  it('/sales-orders/:id → kind=so-detail + soId', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/sales-orders/so-1', () =>
        HttpResponse.json(SO_COMMITTED),
      ),
    )

    await renderAtPath('/sales-orders/so-1/')

    await waitFor(() => {
      expect(getCtx().kind).toBe('so-detail')
    })
    const ctx = getCtx()
    expect(ctx.kind === 'so-detail' && ctx.soId).toBe('so-1')
  })

  it('/products/:id → kind=product-detail + productId + productHasBatches flag', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products/prod-1', () =>
        HttpResponse.json(PRODUCT_1),
      ),
      http.get('http://localhost:8000/api/v1/batches', () =>
        HttpResponse.json({ items: [BATCH_ACTIVE], total: 1, limit: 1, offset: 0 }),
      ),
    )

    await renderAtPath('/products/prod-1')

    await waitFor(() => {
      expect(getCtx().kind).toBe('product-detail')
    })
    await waitFor(() => {
      const ctx = getCtx()
      expect(ctx.kind === 'product-detail' && ctx.productId).toBe('prod-1')
      expect(ctx.kind === 'product-detail' && ctx.productHasBatches).toBe(true)
    })
  })

  it('/stock → kind=other', async () => {
    await renderAtPath('/stock')
    await waitFor(() => {
      expect(getCtx().kind).toBe('other')
    })
  })
})
