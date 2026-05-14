/**
 * src/features/shell/__tests__/Sidebar.spine.test.tsx
 *
 * TDD for ILE-21 — Sidebar spine accent bar.
 *
 * Asserts that the `.spine` element is rendered for the active nav item
 * and absent for inactive items, across multiple routes.
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
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '@/theme/mantine'
import { Sidebar } from '../Sidebar'

function buildSidebarRouter(initialPath: string) {
  const rootRoute = createRootRoute({ component: Outlet })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <Sidebar />,
  })
  const productsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/products',
    component: () => <Sidebar />,
  })
  const stockRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/stock',
    component: () => <Sidebar />,
  })
  const routeTree = rootRoute.addChildren([indexRoute, productsRoute, stockRoute])
  const history = createMemoryHistory({ initialEntries: [initialPath] })
  return createRouter({ routeTree, history })
}

function renderSidebar(initialPath: string) {
  const router = buildSidebarRouter(initialPath)
  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <RouterProvider router={router} />
    </MantineProvider>,
  )
}

describe('Sidebar spine', () => {
  it('renders a single .spine element for the active route (/)', async () => {
    const { container } = renderSidebar('/')

    await waitFor(() => {
      expect(container.querySelectorAll('.spine')).toHaveLength(1)
    })
  })

  it('renders .spine adjacent to the Products nav link when on /products', async () => {
    renderSidebar('/products')

    const spine = await screen.findByTestId('spine')
    expect(spine).toBeInTheDocument()

    // The spine's parent Box contains the active NavLink (Products)
    const parentBox = spine.parentElement
    expect(parentBox?.textContent).toContain('Products')
  })

  it('renders .spine adjacent to the Stock nav link when on /stock', async () => {
    renderSidebar('/stock')

    const spine = await screen.findByTestId('spine')
    expect(spine).toBeInTheDocument()

    const parentBox = spine.parentElement
    expect(parentBox?.textContent).toContain('Stock')
  })
})
