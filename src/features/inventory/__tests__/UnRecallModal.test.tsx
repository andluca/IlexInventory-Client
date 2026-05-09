/**
 * UnRecallModal.test.tsx
 *
 * TDD for ILE-6 Step 5: F10 un-recall modal.
 * Key: sends empty body + non-empty Idempotency-Key (surface-listed test).
 */

import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/render'
import { UnRecallModal } from '../UnRecallModal'

describe('UnRecallModal', () => {
  it('happy: confirm → POST with empty body + non-empty Idempotency-Key → onSuccess called', async () => {
    let capturedIdempotencyKey: string | null = null
    let capturedBodyText = 'unset'
    const onSuccess = vi.fn()

    server.use(
      http.post('http://localhost:8000/api/v1/batches/batch-1/un-recall', async ({ request }) => {
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        capturedBodyText = await request.text()
        return HttpResponse.json({
          id: 'batch-1',
          is_recalled: false,
          recall_reason: null,
          recalled_at: null,
          batch_code: 'B001',
          on_hand: '95',
          unit_cost: '10',
          product_id: 'prod-1',
          purchase_order_line_id: null,
          expiration_date: null,
          archived_at: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-06-02T00:00:00Z',
          owner_id: 1,
        })
      }),
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
      http.get('http://localhost:8000/api/v1/batches/batch-1', () =>
        HttpResponse.json({ id: 'batch-1', is_recalled: false, batch_code: 'B001', on_hand: '95', unit_cost: '10', product_id: 'prod-1', purchase_order_line_id: null, expiration_date: null, archived_at: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-06-02T00:00:00Z', owner_id: 1, recall_reason: null, recalled_at: null }),
      ),
    )

    renderWithProviders(
      <UnRecallModal batchId="batch-1" opened onClose={() => {}} onSuccess={onSuccess} />,
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    expect(screen.getByText(/reverse the recall/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(capturedIdempotencyKey).not.toBeNull()
      expect(capturedIdempotencyKey!.length).toBeGreaterThan(0)
      expect(capturedBodyText.trim()).toBe('')
      expect(onSuccess).toHaveBeenCalled()
    })
  })
})
