/**
 * src/features/shell/__tests__/AppShell.test.tsx
 *
 * TDD for ILE-12 (overflow boundary) + ILE-21 (column layout restructure).
 *
 * Behavioural tests:
 * - Outer container caps layout to viewport (overflow:hidden + height:100vh).
 * - <main> is the sole scroll surface (overflowY:auto).
 * - New column layout: header is first child of outer flex column; sidebar is
 *   inside inner row alongside main.
 * - ILE-12 scroll contract preserved.
 */

import { describe, it, expect, beforeEach } from 'vitest'
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
import { AppShell } from '../AppShell'

function buildRouter() {
  const rootRoute = createRootRoute({ component: Outlet })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <AppShell>
        <div data-testid="page-content" />
      </AppShell>
    ),
  })
  const routeTree = rootRoute.addChildren([indexRoute])
  const history = createMemoryHistory({ initialEntries: ['/'] })
  return createRouter({ routeTree, history })
}

function renderAppShell() {
  // Mock all requests that AppShell's composed components fire on mount.
  // useAuthMe (Header), useProductsList limit=200 (ManualBatchModal).
  server.use(
    http.get('http://localhost:8000/api/v1/auth/me', () =>
      HttpResponse.json({ user: null, csrf_token: 'test-csrf' }),
    ),
    http.get('http://localhost:8000/api/v1/products', () =>
      HttpResponse.json({ items: [], total: 0, limit: 200, offset: 0 }),
    ),
  )

  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const router = buildRouter()

  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>,
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    // reset any handlers between tests
  })

  it('main column is the scroll surface (overflow-y: auto); outer container is overflow: hidden', async () => {
    renderAppShell()

    await waitFor(() => {
      expect(screen.getByTestId('page-content')).toBeInTheDocument()
    })

    const main = screen.getByRole('main')

    // <main> must be the scroll surface — check its inline style attribute.
    expect(main.style.overflowY).toBe('auto')

    // Walk up from <main>: parent is inner flex row, grandparent is outermost column Box.
    const innerRow = main.parentElement
    const outerBox = innerRow?.parentElement

    expect(outerBox?.style.overflow).toBe('hidden')
  })

  it('sidebar and topbar carry bg-surface-elevated chrome class', async () => {
    renderAppShell()

    await waitFor(() => {
      expect(screen.getByTestId('page-content')).toBeInTheDocument()
    })

    const header = document.querySelector('header')
    const sidebar = document.querySelector('aside')

    // Both chrome surfaces must carry the Tailwind utility classes
    expect(header?.className).toContain('bg-surface-elevated')
    expect(header?.className).toContain('backdrop-blur-elevated')

    expect(sidebar?.className).toContain('bg-surface-elevated')
    expect(sidebar?.className).toContain('backdrop-blur-elevated')
  })

  it('column layout: header is first child of outer flex, sidebar is inside inner row', async () => {
    renderAppShell()

    await waitFor(() => {
      expect(screen.getByTestId('page-content')).toBeInTheDocument()
    })

    const main = screen.getByRole('main')

    // Inner row: parent of <main>
    const innerRow = main.parentElement
    // Outer column: grandparent of <main>
    const outerBox = innerRow?.parentElement

    // Header must be a direct child of the outer column Box
    expect(outerBox?.firstElementChild?.tagName.toLowerCase()).toBe('header')

    // Sidebar must be inside the inner row (sibling of main)
    const sidebar = document.querySelector('aside')
    expect(sidebar?.parentElement).toBe(innerRow)
  })

  it('topbar no longer sets inline backgroundColor on its outer box', async () => {
    renderAppShell()

    await waitFor(() => {
      expect(screen.getByTestId('page-content')).toBeInTheDocument()
    })

    const header = document.querySelector('header')
    // Regression guard: inline backgroundColor must be removed in favour of Tailwind class.
    expect(header?.style.backgroundColor).toBe('')
  })
})
