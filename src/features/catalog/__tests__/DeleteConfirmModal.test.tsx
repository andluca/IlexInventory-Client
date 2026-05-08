import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  createMemoryHistory,
  Outlet,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { DeleteConfirmModal } from '../DeleteConfirmModal'
import { mantineTheme } from '@/theme/mantine'
import { createElement } from 'react'

async function renderWithRouter(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })

  const rootRoute = createRootRoute({ component: Outlet })
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/products/$id',
    component: () => createElement('div', { 'data-testid': 'detail-page' }, ui),
  })
  const listRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/products',
    component: () => createElement('div', { 'data-testid': 'products-list' }, 'Products List'),
  })
  const routeTree = rootRoute.addChildren([detailRoute, listRoute])
  const history = createMemoryHistory({ initialEntries: ['/products/prod-1'] })
  const router = createRouter({ routeTree, history })
  await router.load()

  const { render } = await import('@testing-library/react')
  return {
    ...render(
      createElement(
        MantineProvider,
        { theme: mantineTheme, defaultColorScheme: 'dark' },
        createElement(
          QueryClientProvider,
          { client: qc },
          createElement(Notifications),
          createElement(RouterProvider, { router }),
        ),
      ),
    ),
    queryClient: qc,
    router,
  }
}

describe('DeleteConfirmModal', () => {
  it('on success: navigates to /products', async () => {
    server.use(
      http.delete('http://localhost:8000/api/v1/products/prod-1', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )

    const onClose = vi.fn()
    const onRefetchBatches = vi.fn()

    const { router } = await renderWithRouter(
      <DeleteConfirmModal
        productId="prod-1"
        opened
        onClose={onClose}
        onRefetchBatches={onRefetchBatches}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(screen.getByTestId('products-list')).toBeInTheDocument()
    })

    expect(router.state.location.pathname).toBe('/products')
    expect(onClose).toHaveBeenCalled()
  })

  it('on 409: shows "archive instead" toast, calls onRefetchBatches, closes modal', async () => {
    server.use(
      http.delete('http://localhost:8000/api/v1/products/prod-1', () =>
        new HttpResponse(null, { status: 409 }),
      ),
    )

    const onClose = vi.fn()
    const onRefetchBatches = vi.fn()

    await renderWithRouter(
      <DeleteConfirmModal
        productId="prod-1"
        opened
        onClose={onClose}
        onRefetchBatches={onRefetchBatches}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/archive it instead/i)
    })

    expect(onRefetchBatches).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('Cancel closes modal without deleting', async () => {
    const onClose = vi.fn()
    const onRefetchBatches = vi.fn()

    await renderWithRouter(
      <DeleteConfirmModal
        productId="prod-1"
        opened
        onClose={onClose}
        onRefetchBatches={onRefetchBatches}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
