/**
 * RecallModal.test.tsx
 *
 * TDD for ILE-6 Step 5: F9 recall modal.
 * Key: Idempotency-Key IS attached (surface-listed test).
 * 409 stale-tab handling.
 */

import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/render'
import { RecallModal } from '../RecallModal'

describe('RecallModal', () => {
  it('validation: empty reason shows inline error', async () => {
    renderWithProviders(
      <RecallModal
        batchId="batch-1"
        opened
        onClose={() => {}}
        onSuccess={() => {}}
        onError={() => {}}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText(/reason is required/i)).toBeInTheDocument()
    })
  })

  it('happy: fill reason → confirm → POST WITH non-empty Idempotency-Key', async () => {
    let capturedIdempotencyKey: string | null = null
    const onSuccess = vi.fn()

    server.use(
      http.post('http://localhost:8000/api/v1/batches/batch-1/recall', ({ request }) => {
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({
          id: 'batch-1',
          is_recalled: true,
          recall_reason: 'Listeria detected',
          recalled_at: '2024-06-01T00:00:00Z',
          batch_code: 'B001',
          on_hand: '95',
          unit_cost: '10',
          product_id: 'prod-1',
          purchase_order_line_id: null,
          expiration_date: null,
          archived_at: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-06-01T00:00:00Z',
          owner_id: 1,
        })
      }),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
      http.get('http://localhost:8000/api/v1/batches/batch-1', () =>
        HttpResponse.json({ id: 'batch-1', is_recalled: true, batch_code: 'B001', on_hand: '95', unit_cost: '10', product_id: 'prod-1', purchase_order_line_id: null, expiration_date: null, archived_at: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-06-01T00:00:00Z', owner_id: 1, recall_reason: 'Listeria detected', recalled_at: '2024-06-01T00:00:00Z' }),
      ),
    )

    const user = userEvent.setup()
    renderWithProviders(
      <RecallModal
        batchId="batch-1"
        opened
        onClose={() => {}}
        onSuccess={onSuccess}
        onError={() => {}}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const reasonInput = screen.getByLabelText(/reason/i)
    await user.type(reasonInput, 'Listeria detected')

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm recall/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /confirm recall/i }))

    await waitFor(() => {
      expect(capturedIdempotencyKey).not.toBeNull()
      expect(capturedIdempotencyKey!.length).toBeGreaterThan(0)
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('409 stale-tab: onError called with ApiError(status=409)', async () => {
    const onError = vi.fn()

    server.use(
      http.post('http://localhost:8000/api/v1/batches/batch-1/recall', () =>
        HttpResponse.json({ error: 'already_recalled' }, { status: 409 }),
      ),
    )

    const user = userEvent.setup()
    renderWithProviders(
      <RecallModal
        batchId="batch-1"
        opened
        onClose={() => {}}
        onSuccess={() => {}}
        onError={onError}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const reasonInput = screen.getByLabelText(/reason/i)
    await user.type(reasonInput, 'Listeria')

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm recall/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /confirm recall/i }))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ status: 409 }))
    })
  })
})
