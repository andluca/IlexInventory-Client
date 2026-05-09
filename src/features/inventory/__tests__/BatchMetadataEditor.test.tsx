/**
 * BatchMetadataEditor.test.tsx
 *
 * TDD for ILE-6 Step 3: F12 PATCH allowlist + metadata editor behavior.
 * Surface-listed test: F12 PATCH allowlist (other fields disabled in UI).
 */

import { describe, it, expect } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/render'
import { BatchMetadataEditor } from '../BatchMetadataEditor'

const BATCH_1 = {
  id: 'batch-1',
  owner_id: 1,
  product_id: 'prod-1',
  purchase_order_line_id: null,
  batch_code: 'LOT-A',
  expiration_date: '2026-12-31',
  unit_cost: '10.0000',
  on_hand: '95.0000',
  is_recalled: false,
  recall_reason: null,
  recalled_at: null,
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('BatchMetadataEditor', () => {
  it('shows display mode by default with batch_code and expiration_date', () => {
    renderWithProviders(<BatchMetadataEditor batch={BATCH_1} />)

    expect(screen.getByText('LOT-A')).toBeInTheDocument()
    expect(screen.getByText(/2026-12-31/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit metadata/i })).toBeInTheDocument()
  })

  it('clicking "Edit metadata" reveals batch_code + expiration_date inputs and NOTHING else', async () => {
    renderWithProviders(<BatchMetadataEditor batch={BATCH_1} />)

    fireEvent.click(screen.getByRole('button', { name: /edit metadata/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/batch code/i)).toBeInTheDocument()
    })

    // expiration_date input
    expect(screen.getByLabelText(/expiration date/i)).toBeInTheDocument()

    // PATCH allowlist test: no unit_cost / on_hand / is_recalled inputs
    expect(screen.queryByLabelText(/unit cost/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/on.?hand/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/recalled/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/recall reason/i)).not.toBeInTheDocument()
  })

  it('changing batch_code then Save sends only { batch_code, clear_expiration: false } in PATCH body', async () => {
    let capturedBody: Record<string, unknown> | null = null

    server.use(
      http.patch('http://localhost:8000/api/v1/batches/batch-1', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...BATCH_1, batch_code: 'LOT-A-CORR' })
      }),
    )

    const user = userEvent.setup()
    renderWithProviders(<BatchMetadataEditor batch={BATCH_1} />)

    fireEvent.click(screen.getByRole('button', { name: /edit metadata/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/batch code/i)).toBeInTheDocument()
    })

    const batchCodeInput = screen.getByLabelText(/batch code/i)
    await user.clear(batchCodeInput)
    await user.type(batchCodeInput, 'LOT-A-CORR')

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(capturedBody).not.toBeNull()
    })

    expect(capturedBody).toMatchObject({ batch_code: 'LOT-A-CORR' })
    // Must NOT include on_hand, unit_cost, or is_recalled
    expect(capturedBody).not.toHaveProperty('on_hand')
    expect(capturedBody).not.toHaveProperty('unit_cost')
    expect(capturedBody).not.toHaveProperty('is_recalled')
  })

  it('clearing expiration_date sends { expiration_date: null, clear_expiration: true }', async () => {
    let capturedBody: Record<string, unknown> | null = null

    server.use(
      http.patch('http://localhost:8000/api/v1/batches/batch-1', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...BATCH_1, expiration_date: null })
      }),
    )

    const user = userEvent.setup()
    renderWithProviders(<BatchMetadataEditor batch={BATCH_1} />)

    fireEvent.click(screen.getByRole('button', { name: /edit metadata/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/expiration date/i)).toBeInTheDocument()
    })

    const expInput = screen.getByLabelText(/expiration date/i) as HTMLInputElement
    await user.clear(expInput)
    // Verify field is cleared
    expect(expInput.value).toBe('')

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(capturedBody).not.toBeNull()
    })

    expect(capturedBody).toMatchObject({ expiration_date: null, clear_expiration: true })
  })
})
