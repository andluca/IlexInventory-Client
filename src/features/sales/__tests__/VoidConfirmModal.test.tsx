/**
 * VoidConfirmModal.test.tsx
 *
 * TDD for ILE-7 Step 7 — Void action confirmation modal.
 * Key assertions:
 *  - Body copy matches verbatim from docs/design/components.md:283
 *  - Happy: empty body + non-empty Idempotency-Key; onSuccess called
 *  - 409 stale-state: onError called with ApiError(status=409)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { mantineTheme } from '@/theme/mantine'
import { VoidConfirmModal } from '../VoidConfirmModal'
import { ApiError } from '@/api/errors'
import { createElement } from 'react'

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      MantineProvider,
      { theme: mantineTheme, defaultColorScheme: 'dark' as const },
      createElement(
        QueryClientProvider,
        { client: qc },
        createElement(Notifications, {}),
        children,
      ),
    )
  }
  return Wrapper
}

const SO_VOIDED = {
  id: 'so-1',
  customer_name: 'Acme',
  customer_contact: null,
  status: 'voided',
  committed_at: '2026-01-15T10:00:00Z',
  voided_at: '2026-01-20T10:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-20T10:00:00Z',
  lines: [],
}

describe('VoidConfirmModal', () => {
  it('body copy matches verbatim consequence-library text', () => {
    render(
      <VoidConfirmModal
        soId="so-1"
        opened={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />,
      { wrapper: makeWrapper() },
    )

    expect(screen.getByText(/Voiding writes reversal movements and stamps/)).toBeInTheDocument()
    expect(screen.getByText(/Allocations stay on the record/)).toBeInTheDocument()
  })

  it('happy: Confirm → empty body + non-empty Idempotency-Key; onSuccess called', async () => {
    let capturedIdempotencyKey: string | null = null
    let capturedBodyText = 'unset'

    server.use(
      http.post('http://localhost:8000/api/v1/sales-orders/so-1/void', async ({ request }) => {
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        capturedBodyText = await request.text()
        return HttpResponse.json(SO_VOIDED)
      }),
    )

    const onSuccess = vi.fn()
    render(
      <VoidConfirmModal
        soId="so-1"
        opened={true}
        onClose={vi.fn()}
        onSuccess={onSuccess}
        onError={vi.fn()}
      />,
      { wrapper: makeWrapper() },
    )

    fireEvent.click(screen.getByRole('button', { name: /^void$/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })

    expect(capturedIdempotencyKey).not.toBeNull()
    expect(capturedIdempotencyKey!.length).toBeGreaterThan(0)
    expect(capturedBodyText.trim()).toBe('')
  })

  it('409 stale-state on void: onError called with ApiError(status=409)', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/sales-orders/so-1/void', () =>
        HttpResponse.json({ error: 'already_voided' }, { status: 409 }),
      ),
    )

    const onError = vi.fn()
    render(
      <VoidConfirmModal
        soId="so-1"
        opened={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onError={onError}
      />,
      { wrapper: makeWrapper() },
    )

    fireEvent.click(screen.getByRole('button', { name: /^void$/i }))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1)
    })

    const errorArg = onError.mock.calls[0]?.[0]
    expect(ApiError.is(errorArg)).toBe(true)
    expect((errorArg as ApiError).status).toBe(409)
  })
})
