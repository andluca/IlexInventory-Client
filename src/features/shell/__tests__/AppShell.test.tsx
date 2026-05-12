/**
 * src/features/shell/__tests__/AppShell.test.tsx
 *
 * TDD for ILE-12 — AppShell overflow boundary.
 *
 * Behavioural test: the outer Box must cap the layout to the viewport
 * (overflow: hidden + height: 100vh) so <main> becomes the sole vertical
 * scroll surface (overflowY: auto). No snapshots, no implementation internals.
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
  // useAuthMe (Topbar), useProductsList limit=200 (ManualBatchModal).
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
  it('main column is the scroll surface (overflow-y: auto); outer container is overflow: hidden', async () => {
    renderAppShell()

    // Wait for the page content to appear (router has resolved)
    await waitFor(() => {
      expect(screen.getByTestId('page-content')).toBeInTheDocument()
    })

    const main = screen.getByRole('main')

    // <main> must be the scroll surface — check its inline style attribute.
    // jsdom doesn't cascade CSS so we read elem.style which reflects the
    // React-injected inline style prop.
    expect(main.style.overflowY).toBe('auto')

    // The outer Box must cap the layout — overflow: hidden.
    // Walk up from <main> to find the container that carries overflow:hidden.
    const outerColumn = main.parentElement // the flex column wrapper
    const outerBox = outerColumn?.parentElement // the outermost Box

    expect(outerBox?.style.overflow).toBe('hidden')
  })

  it('sidebar and topbar carry bg-surface-elevated chrome class', async () => {
    renderAppShell()

    await waitFor(() => {
      expect(screen.getByTestId('page-content')).toBeInTheDocument()
    })

    // Topbar: <header>
    const header = document.querySelector('header')

    // Chrome surfaces must carry both Tailwind utility classes
    expect(header?.className).toContain('bg-surface-elevated')
    expect(header?.className).toContain('backdrop-blur-elevated')

    // Sidebar aside — select by role
    const sidebar = document.querySelector('aside')
    expect(sidebar?.className).toContain('bg-surface-elevated')
    expect(sidebar?.className).toContain('backdrop-blur-elevated')
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
