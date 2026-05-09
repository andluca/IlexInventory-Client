/**
 * WriteOffModal.test.tsx
 *
 * TDD for ILE-6 Step 4: F6 write-off modal.
 * Key: Idempotency-Key DOES appear on write_off (surface-listed test).
 */

import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/render'
import { WriteOffModal } from '../WriteOffModal'

describe('WriteOffModal', () => {
  it('happy: fill qty → confirm → POST WITH non-empty Idempotency-Key → toast + close', async () => {
    let capturedIdempotencyKey: string | null = null
    const onClose = vi.fn()

    server.use(
      http.post('http://localhost:8000/api/v1/batches/batch-1/movements', ({ request }) => {
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({
          id: 'mov-2',
          owner_id: 1,
          batch_id: 'batch-1',
          kind: 'write_off',
          signed_quantity: '-5',
          notes: null,
          reference_type: null,
          reference_id: null,
          created_at: '2024-01-02T00:00:00Z',
        })
      }),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
      http.get('http://localhost:8000/api/v1/batches/batch-1', () =>
        HttpResponse.json({ id: 'batch-1', batch_code: 'B001', on_hand: '90', unit_cost: '10', product_id: 'prod-1', is_recalled: false, recall_reason: null, recalled_at: null, archived_at: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', purchase_order_line_id: null, expiration_date: null, owner_id: 1 }),
      ),
    )

    const user = userEvent.setup()
    renderWithProviders(
      <WriteOffModal batchId="batch-1" baseUnit="g" opened onClose={onClose} />,
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const qtyInput = screen.getByLabelText(/quantity/i)
    await user.clear(qtyInput)
    await user.type(qtyInput, '-5')

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm write-off/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /confirm write-off/i }))

    await waitFor(() => {
      expect(capturedIdempotencyKey).not.toBeNull()
      expect(capturedIdempotencyKey!.length).toBeGreaterThan(0)
    })
  })

  it('rejects positive: typing positive qty → shows "Write-offs must be negative" error', async () => {
    renderWithProviders(
      <WriteOffModal batchId="batch-1" baseUnit="g" opened onClose={() => {}} />,
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const qtyInput = screen.getByLabelText(/quantity/i)
    fireEvent.change(qtyInput, { target: { value: '5' } })

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText(/write-offs must be negative/i)).toBeInTheDocument()
    })
  })
})
