import { describe, it, expect } from 'vitest'
import { screen, waitFor, render } from '@testing-library/react'
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
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { RequireAuth } from '../RequireAuth'
import { mantineTheme } from '@/theme/mantine'

function makeProviders(qc: QueryClient, router: AnyRouter) {
  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>,
  )
}

function buildTestRouter(initialPath: string = '/protected') {
  const rootRoute = createRootRoute({
    component: Outlet,
  })

  const protectedRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/protected',
    component: () => (
      <RequireAuth>
        <div data-testid="protected-content">Protected</div>
      </RequireAuth>
    ),
  })

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => <div data-testid="login-page">Login Page</div>,
  })

  const routeTree = rootRoute.addChildren([protectedRoute, loginRoute])
  const history = createMemoryHistory({ initialEntries: [initialPath] })
  const router = createRouter({ routeTree, history })
  return router
}

describe('RequireAuth', () => {
  it('renders a Loader while auth query is loading', async () => {
    let resolve!: (value: Response) => void
    server.use(
      http.get('http://localhost:8000/api/v1/auth/me', () =>
        new Promise<Response>((res) => {
          resolve = res
        }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const router = buildTestRouter('/protected')
    makeProviders(qc, router)

    // Protected content should not appear during loading
    await waitFor(() => {
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    // Clean up pending request
    resolve(HttpResponse.json({ id: 'u1', email: 'a@b.com' }))
  })

  it('renders children when auth query resolves with user data', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/auth/me', () =>
        HttpResponse.json({ id: 'u1', email: 'user@example.com' }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const router = buildTestRouter('/protected')
    makeProviders(qc, router)

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })
  })

  it('navigates to /login when auth query returns 401', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/auth/me', () =>
        HttpResponse.json({ error: 'not_authenticated' }, { status: 401 }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const router = buildTestRouter('/protected')
    makeProviders(qc, router)

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })
})
