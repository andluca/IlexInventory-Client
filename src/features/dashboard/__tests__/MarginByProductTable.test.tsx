/**
 * MarginByProductTable.test.tsx
 *
 * TDD for ILE-8 Step 4 — MarginByProductTable widget.
 */

import { describe, it, expect } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/render'
import { MarginByProductTable } from '../MarginByProductTable'
import { csvExportUrl } from '@/utils/csv-export'

const ROW_A = {
  product_id: 'prod-1',
  product_name: 'Yerba A',
  units_sold: '100.0000',
  revenue: '500.0000',
  cogs: '300.0000',
  profit: '200.0000',
  margin_pct: '66.6667',
}

const ROW_B = {
  product_id: 'prod-2',
  product_name: 'Yerba B',
  units_sold: '50.0000',
  revenue: '250.0000',
  cogs: '150.0000',
  profit: '100.0000',
  margin_pct: '66.6667',
}

describe('MarginByProductTable', () => {
  it('happy: renders rows with formatMoney/formatPercent values; column header reads "Profit Margin" (BE-D13)', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/financials/margin', () =>
        HttpResponse.json({ items: [ROW_A, ROW_B], next_cursor: null }),
      ),
    )

    renderWithProviders(<MarginByProductTable from="2026-04-09" to="2026-05-09" />)

    await waitFor(() => {
      expect(screen.getByText('Yerba A')).toBeInTheDocument()
    })

    // Column header verbatim per BE-D13
    expect(screen.getByRole('columnheader', { name: /profit margin/i })).toBeInTheDocument()

    expect(screen.getByText('Yerba B')).toBeInTheDocument()
    // Money formatting
    expect(screen.getAllByText('$500.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$300.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$200.00').length).toBeGreaterThan(0)
    // Percent formatting (66.6667 → "66.7%")
    expect(screen.getAllByText('66.7%').length).toBeGreaterThan(0)
  })

  it('cursor pagination: Load more appears; click fetches ?cursor=c1; page 2 rows append', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/financials/margin', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor')
        return HttpResponse.json(
          cursor
            ? { items: [ROW_B], next_cursor: null }
            : { items: [ROW_A], next_cursor: 'c1' },
        )
      }),
    )

    renderWithProviders(<MarginByProductTable from="2026-04-09" to="2026-05-09" />)

    await waitFor(() => {
      expect(screen.getByText('Yerba A')).toBeInTheDocument()
    })

    const loadMoreBtn = screen.getByRole('button', { name: /load more/i })
    expect(loadMoreBtn).toBeInTheDocument()

    fireEvent.click(loadMoreBtn)

    await waitFor(() => {
      expect(screen.getByText('Yerba B')).toBeInTheDocument()
    })

    // Load more should disappear once next_cursor is null
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })

  it('empty state: items=[] renders "No products with sales in this range."', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/financials/margin', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
    )

    renderWithProviders(<MarginByProductTable from="2026-04-09" to="2026-05-09" />)

    await waitFor(() => {
      expect(screen.getByText(/No products with sales in this range/i)).toBeInTheDocument()
    })
  })

  it('CSV anchor href matches csvExportUrl for /financials/margin', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/financials/margin', () =>
        HttpResponse.json({ items: [], next_cursor: null }),
      ),
    )

    renderWithProviders(<MarginByProductTable from="2026-04-09" to="2026-05-09" />)

    // Wait for the component to render (even empty state)
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    const expectedHref = csvExportUrl('/financials/margin', {
      from: '2026-04-09',
      to: '2026-05-09',
    })
    const anchor = screen.getByRole('link', { name: /download csv/i })
    expect(anchor).toHaveAttribute('href', expectedHref)
  })
})
