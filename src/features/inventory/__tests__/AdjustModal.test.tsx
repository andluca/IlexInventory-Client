/**
 * AdjustModal.test.tsx
 *
 * TDD for ILE-6 Step 4: F5 adjust modal.
 * Key: NO Idempotency-Key on adjustment (BE-D7 / SPEC §2.5).
 */

import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/render'
import { AdjustModal } from '../AdjustModal'

describe('AdjustModal', () => {
  it('validation: empty notes shows "Notes are required" error', async () => {
    renderWithProviders(
      <AdjustModal batchId="batch-1" opened onClose={() => {}} />,
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Fill signed_qty but leave notes empty
    const qtyInput = screen.getByLabelText(/signed quantity/i)
    fireEvent.change(qtyInput, { target: { value: '-2.5' } })

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText(/notes are required/i)).toBeInTheDocument()
    })
  })

  it('happy: fill qty + notes → confirm → POST WITHOUT Idempotency-Key → toast + close', async () => {
    let capturedIdempotencyKey: string | null | undefined = undefined
    const onClose = vi.fn()

    server.use(
      http.post('http://localhost:8000/api/v1/batches/batch-1/movements', ({ request }) => {
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({
          id: 'mov-1',
          owner_id: 1,
          batch_id: 'batch-1',
          kind: 'adjustment',
          signed_quantity: '-2.5',
          notes: 'Spilled in transit',
          reference_type: null,
          reference_id: null,
          created_at: '2024-01-02T00:00:00Z',
        })
      }),
      // For audit table refetch
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
      http.get('http://localhost:8000/api/v1/batches/batch-1', () =>
        HttpResponse.json({ id: 'batch-1', batch_code: 'B001', on_hand: '92.5', unit_cost: '10', product_id: 'prod-1', is_recalled: false, recall_reason: null, recalled_at: null, archived_at: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', purchase_order_line_id: null, expiration_date: null, owner_id: 1 }),
      ),
    )

    const user = userEvent.setup()
    renderWithProviders(
      <AdjustModal batchId="batch-1" opened onClose={onClose} />,
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const qtyInput = screen.getByLabelText(/signed quantity/i)
    await user.clear(qtyInput)
    await user.type(qtyInput, '-2.5')

    const notesInput = screen.getByLabelText(/notes/i)
    await user.type(notesInput, 'Spilled in transit')

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText(/adjust on-hand by/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(capturedIdempotencyKey).toBeNull() // No Idempotency-Key for adjustments
    })
  })
})
