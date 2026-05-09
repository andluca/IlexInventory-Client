import { describe, it, expect } from 'vitest'
import { screen, waitFor, render } from '@testing-library/react'
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
import { LoginPage } from '../LoginPage'
import { mantineTheme } from '@/theme/mantine'

async function makeProviders(qc: QueryClient, router: AnyRouter) {
  // TanStack Router v1.45+ requires an explicit load before render in tests.
  await router.load()
  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <QueryClientProvider client={qc}>
        <Notifications />
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>,
  )
}

function buildTestRouter(initialPath: string = '/login') {
  const rootRoute = createRootRoute({ component: Outlet })

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: LoginPage,
  })

  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div data-testid="home-page">Home</div>,
  })

  const routeTree = rootRoute.addChildren([loginRoute, homeRoute])
  const history = createMemoryHistory({ initialEntries: [initialPath] })
  const router = createRouter({ routeTree, history })
  return router
}

describe('LoginPage', () => {
  it('renders email, password fields and a Log in button', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const router = buildTestRouter('/login')
    await makeProviders(qc, router)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('happy path: 200 login → navigates to /', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/auth/login', () =>
        HttpResponse.json({
          user: { id: 'u1', email: 'user@example.com' },
          csrf_token: 'test-csrf-token',
        }),
      ),
      http.get('http://localhost:8000/api/v1/auth/me', () =>
        HttpResponse.json({
          user: { id: 'u1', email: 'user@example.com' },
          csrf_token: 'test-csrf-token',
        }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const router = buildTestRouter('/login')
    await makeProviders(qc, router)

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    })
  })

  it('401 bad credentials: shows inline alert with the error message', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/auth/login', () =>
        HttpResponse.json(
          { error: 'invalid_credentials', detail: 'Email or password is incorrect.' },
          { status: 401 },
        ),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
    const router = buildTestRouter('/login')
    await makeProviders(qc, router)

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByText(/email or password is incorrect/i)).toBeInTheDocument()
    })

    // Still on login page
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument()
  })

  it('client-side validation: empty email shows "Email is required"', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const router = buildTestRouter('/login')
    await makeProviders(qc, router)

    // Submit without filling in email
    await userEvent.type(screen.getByLabelText(/password/i), 'somepassword')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
  })

  it('has a link to /signup', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const router = buildTestRouter('/login')
    await makeProviders(qc, router)

    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
  })
})
