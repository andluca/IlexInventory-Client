/**
 * ManualBatchModal.test.tsx
 *
 * TDD for ILE-6 Step 6: F4 manual batch creation modal.
 * Key: Idempotency-Key IS attached (covered by mutations.test.ts useCreateBatch suite).
 */

import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/render'
import { ManualBatchModal } from '../ManualBatchModal'

const PRODUCT_1 = {
  id: 'prod-1',
  sku: 'YRB-001',
  name: 'Yerba Premium',
  description: '',
  base_unit: 'g',
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('ManualBatchModal', () => {
  it('validation: missing required fields block submit and show inline errors', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 200, offset: 0 }),
      ),
    )

    renderWithProviders(<ManualBatchModal opened onClose={() => {}} />)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Click Continue without filling anything
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText(/product is required/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/batch code is required/i)).toBeInTheDocument()
  })

  it('form renders product select, batch_code, unit_cost, initial_quantity inputs', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 200, offset: 0 }),
      ),
    )

    renderWithProviders(<ManualBatchModal opened onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Form fields present
    expect(screen.getByLabelText(/batch code/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/unit cost/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/initial quantity/i)).toBeInTheDocument()
    // Product select is present
    expect(screen.getByPlaceholderText(/select a product/i)).toBeInTheDocument()
  })

  it('opened from batch detail with defaultProductId: product picker pre-selects that product', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 200, offset: 0 }),
      ),
    )

    renderWithProviders(
      <ManualBatchModal opened onClose={() => {}} defaultProductId="prod-1" />,
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // The select input should show the pre-selected product name once products load
    await waitFor(() => {
      const selectInput = screen.getByPlaceholderText(/select a product/i)
      expect(selectInput).toHaveValue('Yerba Premium')
    })
  })

  it('opened from stock (no defaultProductId): product picker starts empty', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json({ items: [PRODUCT_1], total: 1, limit: 200, offset: 0 }),
      ),
    )

    renderWithProviders(<ManualBatchModal opened onClose={() => {}} />)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Product input starts empty
    const selectInput = screen.getByPlaceholderText(/select a product/i)
    expect(selectInput).toHaveValue('')
  })
})
