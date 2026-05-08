import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/render'
import { ImportCsvModal } from '../ImportCsvModal'
import { catalogKeys } from '@/data/catalog/keys'

describe('ImportCsvModal', () => {
  it('happy: imports 5 products, shows success summary, Done closes modal', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/products/import', () =>
        HttpResponse.json({ imported: 5, failed: [] }),
      ),
    )

    const onClose = vi.fn()
    const { queryClient } = renderWithProviders(<ImportCsvModal opened onClose={onClose} />)
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    // Pick a file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['sku,name\nYRB-001,Yerba'], 'products.csv', { type: 'text/csv' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // Submit
    await userEvent.click(screen.getByRole('button', { name: /import/i }))

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/imported 5 products/i)
    })

    // Click Done
    await userEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(onClose).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: catalogKeys.lists() })
  })

  it('per-row errors: renders failed rows panel with Copy errors button', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/products/import', () =>
        HttpResponse.json({
          imported: 3,
          failed: [
            {
              row_index: 4,
              error: 'duplicate_sku',
              detail: 'SKU YRB-001 already exists',
              fields: { sku: ['Already in use'] },
            },
            {
              row_index: 7,
              error: 'validation_error',
              detail: 'Missing name',
              fields: null,
            },
          ],
        }),
      ),
    )

    // Mock clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
    })

    const onClose = vi.fn()
    renderWithProviders(<ImportCsvModal opened onClose={onClose} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['sku,name\nYRB-001,Yerba'], 'products.csv', { type: 'text/csv' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await userEvent.click(screen.getByRole('button', { name: /import/i }))

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/imported 3 products/i)
    })

    // Failed rows panel
    expect(document.body.textContent).toMatch(/row 4/i)
    expect(document.body.textContent).toMatch(/duplicate_sku/i)
    expect(document.body.textContent).toMatch(/row 7/i)

    // Copy errors button
    const copyBtn = screen.getByRole('button', { name: /copy errors/i })
    expect(copyBtn).toBeInTheDocument()
    await userEvent.click(copyBtn)
    expect(writeTextMock).toHaveBeenCalled()
  })

  it('400: renders error alert, modal stays open', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/products/import', () =>
        HttpResponse.json(
          { error: 'invalid_csv', detail: 'CSV header row missing' },
          { status: 400 },
        ),
      ),
    )

    const onClose = vi.fn()
    renderWithProviders(<ImportCsvModal opened onClose={onClose} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['bad,csv'], 'products.csv', { type: 'text/csv' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await userEvent.click(screen.getByRole('button', { name: /import/i }))

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/csv header row missing/i)
    })

    // Modal stays open - Done button shouldn't be visible
    expect(screen.queryByRole('button', { name: /done/i })).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('Idempotency-Key header is present on POST /products/import', async () => {
    let capturedKey: string | null = null

    server.use(
      http.post('http://localhost:8000/api/v1/products/import', ({ request }) => {
        capturedKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({ imported: 0, failed: [] })
      }),
    )

    renderWithProviders(<ImportCsvModal opened onClose={() => {}} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['sku,name\n'], 'products.csv', { type: 'text/csv' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await userEvent.click(screen.getByRole('button', { name: /import/i }))

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/imported 0 products/i)
    })

    expect(capturedKey).not.toBeNull()
    expect(typeof capturedKey).toBe('string')
    expect(capturedKey!.length).toBeGreaterThan(0)
  })
})
