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
import { SignupPage } from '../SignupPage'
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

function buildTestRouter(initialPath: string = '/signup') {
  const rootRoute = createRootRoute({ component: Outlet })

  const signupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/signup',
    component: SignupPage,
  })

  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div data-testid="home-page">Home</div>,
  })

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => <div data-testid="login-page">Login</div>,
  })

  const routeTree = rootRoute.addChildren([signupRoute, homeRoute, loginRoute])
  const history = createMemoryHistory({ initialEntries: [initialPath] })
  const router = createRouter({ routeTree, history })
  return router
}

describe('SignupPage', () => {
  it('renders email, password fields and a Sign up button', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const router = buildTestRouter('/signup')
    await makeProviders(qc, router)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('happy path: 200 signup → navigates to /', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/auth/signup', () =>
        HttpResponse.json({
          user: { id: 'u1', email: 'new@example.com' },
          csrf_token: 'test-csrf-token',
        }),
      ),
      http.get('http://localhost:8000/api/v1/auth/me', () =>
        HttpResponse.json({
          user: { id: 'u1', email: 'new@example.com' },
          csrf_token: 'test-csrf-token',
        }),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const router = buildTestRouter('/signup')
    await makeProviders(qc, router)

    await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    })
  })

  it('409 duplicate_email: shows inline error under email field', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/auth/signup', () =>
        HttpResponse.json(
          {
            error: 'duplicate_email',
            detail: 'An account with that email already exists.',
            fields: { email: 'Already registered' },
          },
          { status: 409 },
        ),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
    const router = buildTestRouter('/signup')
    await makeProviders(qc, router)

    await userEvent.type(screen.getByLabelText(/email/i), 'existing@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText(/already registered/i)).toBeInTheDocument()
    })

    // Still on signup page
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument()
  })

  it('409: "Already have an account? Log in" link remains visible', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/auth/signup', () =>
        HttpResponse.json(
          {
            error: 'duplicate_email',
            detail: 'An account with that email already exists.',
            fields: { email: 'Already registered' },
          },
          { status: 409 },
        ),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
    const router = buildTestRouter('/signup')
    await makeProviders(qc, router)

    await userEvent.type(screen.getByLabelText(/email/i), 'existing@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText(/already registered/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument()
  })
})
