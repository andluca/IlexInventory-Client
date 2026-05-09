/**
 * QuickActions.test.tsx
 *
 * TDD for ILE-8 Step 6 — QuickActions component.
 */

import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  createMemoryHistory,
  Outlet,
  type AnyRouter,
} from '@tanstack/react-router'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '@/theme/mantine'
import { QuickActions } from '../QuickActions'

async function makeRouter(onImportClick = vi.fn()) {
  const rootRoute = createRootRoute({ component: Outlet })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <QuickActions onImportClick={onImportClick} />,
  })
  const poNewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/purchase-orders/new',
    component: () => <div>New PO page</div>,
  })
  const soNewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sales-orders/new',
    component: () => <div>New SO page</div>,
  })
  const routeTree = rootRoute.addChildren([indexRoute, poNewRoute, soNewRoute])
  const history = createMemoryHistory({ initialEntries: ['/'] })
  const router = createRouter({ routeTree, history })
  await router.load()
  return { router, onImportClick }
}

async function renderWithRouter(router: AnyRouter) {
  const { render } = await import('@testing-library/react')
  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <RouterProvider router={router} />
    </MantineProvider>,
  )
}

describe('QuickActions', () => {
  it('renders 3 buttons with correct labels', async () => {
    const { router } = await makeRouter()
    await renderWithRouter(router)

    expect(screen.getByRole('link', { name: /new po/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /new so/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import products/i })).toBeInTheDocument()
  })

  it('"New PO" link href is /purchase-orders/new', async () => {
    const { router } = await makeRouter()
    await renderWithRouter(router)

    const link = screen.getByRole('link', { name: /new po/i })
    expect(link).toHaveAttribute('href', '/purchase-orders/new')
  })

  it('"New SO" link href is /sales-orders/new', async () => {
    const { router } = await makeRouter()
    await renderWithRouter(router)

    const link = screen.getByRole('link', { name: /new so/i })
    expect(link).toHaveAttribute('href', '/sales-orders/new')
  })

  it('"Import products" calls onImportClick prop on click', async () => {
    const onImportClick = vi.fn()
    const { router } = await makeRouter(onImportClick)
    await renderWithRouter(router)

    fireEvent.click(screen.getByRole('button', { name: /import products/i }))
    expect(onImportClick).toHaveBeenCalledOnce()
  })
})
