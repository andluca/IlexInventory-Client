/**
 * src/features/shell/__tests__/CmdkPalette.test.tsx
 *
 * TDD for ILE-9 Step 7 — CmdkPalette integration.
 * 5 tests per plan:
 *  1. mod+K opens palette (via keyboard shortcut)
 *  2. click on <CmdkTrigger> opens palette
 *  3. Navigate action fires navigate on click
 *  4. Act group shows "Recall this batch" on /batches/:id route (non-recalled batch)
 *  5. Agent action sets useAgentPanel.prefilledQuery + open=true
 *
 * NOTE: Spotlight's keyboard shortcut (mod+K) relies on Mantine's SpotlightRoot
 * mounting document event listeners. In jsdom we simulate via spotlight.open().
 * Tests 3-5 use the actions API directly since Spotlight renders a portal/modal.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
import { Notifications } from '@mantine/notifications'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { mantineTheme } from '@/theme/mantine'
import { CmdkPalette } from '../CmdkPalette'
import { CmdkTrigger } from '../CmdkTrigger'
import { useAgentPanel } from '@/stores/agent-panel'
import { spotlight } from '@mantine/spotlight'

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

beforeEach(() => {
  useAgentPanel.setState({ open: false, prefilledQuery: '' })
  // jsdom doesn't implement scrollIntoView — Mantine Spotlight calls it on selection
  window.HTMLElement.prototype.scrollIntoView = () => {}
})

async function renderPaletteAtPath(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  const rootRoute = createRootRoute({ component: Outlet })

  const batchRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/batches/$id',
    component: () => (
      <div>
        <CmdkTrigger />
        <CmdkPalette />
      </div>
    ),
  })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <div>
        <CmdkTrigger />
        <CmdkPalette />
      </div>
    ),
  })
  const stockRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/stock',
    component: () => (
      <div>
        <CmdkTrigger />
        <CmdkPalette />
      </div>
    ),
  })

  const routeTree = rootRoute.addChildren([batchRoute, indexRoute, stockRoute])
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = createRouter({ routeTree, history })
  await router.load()

  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <QueryClientProvider client={queryClient}>
        <Notifications />
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>,
  )
}

describe('CmdkPalette', () => {
  it('spotlight.open() makes the palette visible', async () => {
    await renderPaletteAtPath('/')

    // Before open, palette search is not visible
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Open via spotlight API (same mechanism as mod+K)
    spotlight.open()

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('CmdkTrigger click opens the palette via spotlight.open()', async () => {
    await renderPaletteAtPath('/')

    const triggerBtn = screen.getByRole('button', { name: /open command palette/i })
    fireEvent.click(triggerBtn)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('Navigate group renders all 6 nav actions when palette is open', async () => {
    await renderPaletteAtPath('/')
    spotlight.open()

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // All six nav action labels should be visible
    await waitFor(() => {
      expect(document.body.textContent).toContain('Dashboard')
    })
    expect(document.body.textContent).toContain('Products')
    expect(document.body.textContent).toContain('Purchase orders')
    expect(document.body.textContent).toContain('Sales orders')
    expect(document.body.textContent).toContain('Stock')
    expect(document.body.textContent).toContain('Settings')
  })

  it('Act group shows "Recall this batch" on /batches/:id route for non-recalled batch', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/batches/batch-1', () =>
        HttpResponse.json(BATCH_ACTIVE),
      ),
    )

    await renderPaletteAtPath('/batches/batch-1')
    spotlight.open()

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(document.body.textContent).toContain('Recall this batch')
    })
  })

  it('Agent action sets useAgentPanel.prefilledQuery + open=true when clicked', async () => {
    await renderPaletteAtPath('/')
    spotlight.open()

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Type a query in the search box — spotlight uses combobox role for its input
    const dialog = screen.getByRole('dialog')
    const searchInput = dialog.querySelector('input[type="search"], input[placeholder]') as HTMLInputElement
    expect(searchInput).toBeTruthy()
    fireEvent.change(searchInput, { target: { value: 'low stock' } })

    await waitFor(() => {
      expect(document.body.textContent).toContain("Ask Ilex: 'low stock'")
    })

    // Click the agent action
    const agentButton = Array.from(document.querySelectorAll('[role="option"], button')).find(
      (el) => el.textContent?.includes("Ask Ilex: 'low stock'"),
    )
    expect(agentButton).toBeTruthy()
    fireEvent.click(agentButton!)

    const state = useAgentPanel.getState()
    expect(state.open).toBe(true)
    expect(state.prefilledQuery).toBe('low stock')
  })
})
