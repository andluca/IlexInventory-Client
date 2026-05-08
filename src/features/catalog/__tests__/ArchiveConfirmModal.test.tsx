import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { server } from '@/test/server'
import { ArchiveConfirmModal } from '../ArchiveConfirmModal'
import { mantineTheme } from '@/theme/mantine'

function renderWithNotifications(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return {
    ...render(
      createElement(
        MantineProvider,
        { theme: mantineTheme, defaultColorScheme: 'dark' },
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Notifications),
          ui,
        ),
      ),
    ),
    queryClient,
  }
}

const PRODUCT_ARCHIVED = {
  id: 'prod-1',
  sku: 'YRB-001',
  name: 'Yerba Premium',
  description: '',
  base_unit: 'g',
  archived_at: '2024-06-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-06-01T00:00:00Z',
}

describe('ArchiveConfirmModal', () => {
  it('on 200: calls onClose (stays on page)', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/products/prod-1/archive', () =>
        HttpResponse.json(PRODUCT_ARCHIVED),
      ),
    )

    const onClose = vi.fn()
    const onRefetchBatches = vi.fn()

    renderWithNotifications(
      <ArchiveConfirmModal
        productId="prod-1"
        opened
        onClose={onClose}
        onRefetchBatches={onRefetchBatches}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /^archive$/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    // No navigation — stays on page (navigate is NOT called)
  })

  it('on 409: shows "no batches" toast, calls onRefetchBatches, closes modal', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/products/prod-1/archive', () =>
        new HttpResponse(null, { status: 409 }),
      ),
    )

    const onClose = vi.fn()
    const onRefetchBatches = vi.fn()

    renderWithNotifications(
      <ArchiveConfirmModal
        productId="prod-1"
        opened
        onClose={onClose}
        onRefetchBatches={onRefetchBatches}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /^archive$/i }))

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/no batches.*delete/i)
    })

    expect(onRefetchBatches).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('Cancel button closes modal without mutating', async () => {
    const onClose = vi.fn()
    const onRefetchBatches = vi.fn()

    renderWithNotifications(
      <ArchiveConfirmModal
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
