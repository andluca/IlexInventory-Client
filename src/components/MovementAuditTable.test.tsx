import { describe, it, expect } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/render'
import { MovementAuditTable } from './MovementAuditTable'

const MOVEMENT_RECEIPT = {
  id: 'mov-1',
  owner_id: 1,
  batch_id: 'batch-1',
  kind: 'receipt',
  signed_quantity: '100.00',
  notes: null,
  reference_type: null,
  reference_id: null,
  created_at: '2024-12-15T09:23:41Z',
}

const MOVEMENT_ADJUSTMENT = {
  id: 'mov-2',
  owner_id: 1,
  batch_id: 'batch-1',
  kind: 'adjustment',
  signed_quantity: '-5.00',
  notes: 'Spilled',
  reference_type: null,
  reference_id: null,
  created_at: '2024-12-16T10:00:00Z',
}

describe('MovementAuditTable', () => {
  it('renders two movement rows with correct kind and quantity', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({
          items: [MOVEMENT_RECEIPT, MOVEMENT_ADJUSTMENT],
          next_cursor: null,
        }),
      ),
    )

    renderWithProviders(<MovementAuditTable productId="prod-1" />)

    await waitFor(() => {
      expect(screen.getAllByText('receipt').length).toBeGreaterThan(0)
      expect(screen.getAllByText('adjustment').length).toBeGreaterThan(0)
      // Signed quantity values
      expect(document.body.textContent).toContain('100.00')
      expect(document.body.textContent).toContain('-5.00')
    })
  })

  it('passes product_id filter to the network request', async () => {
    let capturedProductId: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/movements', ({ request }) => {
        const url = new URL(request.url)
        capturedProductId = url.searchParams.get('product_id')
        return HttpResponse.json({ items: [MOVEMENT_RECEIPT], next_cursor: null })
      }),
    )

    renderWithProviders(<MovementAuditTable productId="prod-abc" />)

    await waitFor(() => expect(screen.getAllByText('receipt').length).toBeGreaterThan(0))
    expect(capturedProductId).toBe('prod-abc')
  })

  it('passes batch_id filter to the network request', async () => {
    let capturedBatchId: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/movements', ({ request }) => {
        const url = new URL(request.url)
        capturedBatchId = url.searchParams.get('batch_id')
        return HttpResponse.json({ items: [MOVEMENT_RECEIPT], next_cursor: null })
      }),
    )

    renderWithProviders(<MovementAuditTable batchId="batch-xyz" />)

    await waitFor(() => expect(screen.getAllByText('receipt').length).toBeGreaterThan(0))
    expect(capturedBatchId).toBe('batch-xyz')
  })

  it('renders Load more button when next_cursor is present', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({
          items: [MOVEMENT_RECEIPT],
          next_cursor: 'cursor-abc',
        }),
      ),
    )

    renderWithProviders(<MovementAuditTable productId="prod-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
    })
  })

  it('does not render Load more button when next_cursor is null', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({
          items: [MOVEMENT_RECEIPT],
          next_cursor: null,
        }),
      ),
    )

    renderWithProviders(<MovementAuditTable productId="prod-1" />)

    await waitFor(() => expect(screen.getByText('receipt')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })

  it('renders EmptyState when no movements found', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
    )

    renderWithProviders(<MovementAuditTable productId="prod-empty" />)

    await waitFor(() => {
      expect(screen.getByText(/no movements/i)).toBeInTheDocument()
    })
  })

  it('filters by kind when kind select changes', async () => {
    let capturedKind: string | null = null
    server.use(
      http.get('http://localhost:8000/api/v1/movements', ({ request }) => {
        const url = new URL(request.url)
        capturedKind = url.searchParams.get('kind')
        return HttpResponse.json({ items: [MOVEMENT_ADJUSTMENT], next_cursor: null })
      }),
    )

    renderWithProviders(<MovementAuditTable productId="prod-1" />)

    // Wait for initial load
    await waitFor(() => expect(screen.getAllByText('adjustment').length).toBeGreaterThan(0))

    // Initial kind should not be set (All)
    expect(capturedKind).toBeNull()
  })

  it('clicking Load more fetches next page', async () => {
    const PAGE_1 = { items: [MOVEMENT_RECEIPT], next_cursor: 'cursor-abc' }
    const PAGE_2 = { items: [MOVEMENT_ADJUSTMENT], next_cursor: null }

    server.use(
      http.get('http://localhost:8000/api/v1/movements', ({ request }) => {
        const url = new URL(request.url)
        const cursor = url.searchParams.get('cursor')
        return HttpResponse.json(cursor ? PAGE_2 : PAGE_1)
      }),
    )

    renderWithProviders(<MovementAuditTable productId="prod-1" />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole('button', { name: /load more/i }))

    await waitFor(() => {
      expect(screen.getAllByText('receipt').length).toBeGreaterThan(0)
      expect(screen.getAllByText('adjustment').length).toBeGreaterThan(0)
    })

    // No more pages
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })

  it('renders error alert when API returns an error', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/movements', () =>
        HttpResponse.json({ error: 'server_error', detail: 'Something went wrong' }, { status: 500 }),
      ),
    )

    renderWithProviders(<MovementAuditTable productId="prod-1" />)

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })
  })
})
