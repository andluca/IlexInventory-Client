/**
 * src/components/EmptyState.test.tsx
 *
 * TDD for EmptyState shared component.
 * 3 tests:
 *  1. renders title + body
 *  2. renders icon when given
 *  3. primary + secondary actions trigger correct handlers/links
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router'
import { mantineTheme } from '@/theme/mantine'
import { EmptyState } from './EmptyState'

async function renderEmptyState(props: React.ComponentProps<typeof EmptyState>) {
  const rootRoute = createRootRoute({ component: Outlet })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <EmptyState {...props} />,
  })
  const routeTree = rootRoute.addChildren([indexRoute])
  const history = createMemoryHistory({ initialEntries: ['/'] })
  const router = createRouter({ routeTree, history })
  await router.load()
  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <RouterProvider router={router} />
    </MantineProvider>,
  )
}

describe('EmptyState', () => {
  it('renders title and body copy', async () => {
    await renderEmptyState({ title: 'No products yet', body: 'Start by importing a CSV.' })

    expect(screen.getByRole('heading', { name: /no products yet/i })).toBeInTheDocument()
    expect(screen.getByText(/start by importing a csv/i)).toBeInTheDocument()
  })

  it('renders icon element when icon prop given', async () => {
    const TestIcon = () => <svg data-testid="test-icon" />
    await renderEmptyState({ title: 'Empty', icon: TestIcon })

    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('primary action button calls onClick handler; secondary action with href renders a link', async () => {
    const handlePrimary = vi.fn()
    await renderEmptyState({
      title: 'No orders',
      actions: [
        { label: 'Create order', onClick: handlePrimary, primary: true },
        { label: 'Learn more', href: '/docs' },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: /create order/i }))
    expect(handlePrimary).toHaveBeenCalledOnce()

    // href action renders as an anchor link
    expect(screen.getByRole('link', { name: /learn more/i })).toBeInTheDocument()
  })

})
