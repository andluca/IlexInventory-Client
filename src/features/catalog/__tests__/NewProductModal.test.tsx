import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/render'
import { NewProductModal } from '../NewProductModal'
import { catalogKeys } from '@/data/catalog/keys'

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

describe('NewProductModal', () => {
  it('happy: fill fields, submit, modal closes, list invalidated', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json(PRODUCT_1),
      ),
    )

    const onClose = vi.fn()
    const { queryClient } = renderWithProviders(
      <NewProductModal opened onClose={onClose} />,
    )

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    // Fill in the form
    await userEvent.type(screen.getByLabelText(/name/i), 'Yerba Premium')
    await userEvent.type(screen.getByLabelText(/sku/i), 'YRB-001')

    // Select base_unit via Mantine Select (pick the visible input element)
    const baseUnitInputs = screen.getAllByLabelText(/base unit/i)
    const baseUnitInput: HTMLElement = baseUnitInputs.find((el) => el.tagName === 'INPUT') ?? baseUnitInputs.at(0) ?? baseUnitInputs[0]!
    await userEvent.click(baseUnitInput)
    await waitFor(() => expect(screen.getAllByText('g').length).toBeGreaterThan(0))
    // Click the 'g' option in the dropdown
    const gOptions = screen.getAllByText('g')
    await userEvent.click(gOptions.at(-1)!)

    // Submit via form (Portal + jsdom: fireEvent.submit is needed)
    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: catalogKeys.lists() })
  })

  it('validation: empty form shows required errors', async () => {
    renderWithProviders(<NewProductModal opened onClose={() => {}} />)

    // Submit via form (Portal + jsdom: fireEvent.submit is needed)
    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/name is required/i)
    })
    expect(document.body.textContent).toMatch(/sku is required/i)
    expect(document.body.textContent).toMatch(/base unit is required/i)
  })

  it('409 duplicate_sku: maps field-level error under SKU', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json(
          { error: 'duplicate_sku', detail: 'SKU already in use', fields: { sku: 'Already in use' } },
          { status: 409 },
        ),
      ),
    )

    const onClose = vi.fn()
    renderWithProviders(<NewProductModal opened onClose={onClose} />)

    await userEvent.type(screen.getByLabelText(/name/i), 'Dup Product')
    await userEvent.type(screen.getByLabelText(/sku/i), 'YRB-001')

    // Select base_unit via Mantine Select (pick the visible input element)
    const baseUnitInputs = screen.getAllByLabelText(/base unit/i)
    const baseUnitInput: HTMLElement = baseUnitInputs.find((el) => el.tagName === 'INPUT') ?? baseUnitInputs.at(0) ?? baseUnitInputs[0]!
    await userEvent.click(baseUnitInput)
    await waitFor(() => expect(screen.getAllByText('g').length).toBeGreaterThan(0))
    const gOptions = screen.getAllByText('g')
    await userEvent.click(gOptions.at(-1)!)

    // Submit via form (Portal + jsdom: fireEvent.submit is needed)
    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/already in use/i)
    })

    // Modal should stay open
    expect(onClose).not.toHaveBeenCalled()
  })
})
