/**
 * FinancialSummary.test.tsx
 *
 * TDD for ILE-8 Step 3 — FinancialSummary widget.
 * Surface-listed test: brief's worked example ($900 / 900%).
 */

import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/render'
import { FinancialSummary } from '../FinancialSummary'
import { csvExportUrl } from '@/utils/csv-export'

const DASHBOARD_WORKED_EXAMPLE = {
  date_from: '2026-04-09',
  date_to: '2026-05-09',
  totals: {
    revenue: '1000.0000',
    cogs: '100.0000',
    profit: '900.0000',
    margin_pct: '900.0000',
  },
  top_products: [],
}

const DASHBOARD_WITH_PRODUCTS = {
  date_from: '2026-04-09',
  date_to: '2026-05-09',
  totals: {
    revenue: '500.0000',
    cogs: '300.0000',
    profit: '200.0000',
    margin_pct: '66.6667',
  },
  top_products: [
    {
      product_id: 'prod-1',
      product_name: 'Yerba A',
      units_sold: '100.0000',
      revenue: '500.0000',
      cogs: '300.0000',
      profit: '200.0000',
      margin_pct: '66.6667',
    },
  ],
}

describe('FinancialSummary', () => {
  it('brief worked example (surface-listed): renders $1,000.00 / $100.00 / $900.00 / 900% NOT 90%', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/financials/dashboard', () =>
        HttpResponse.json(DASHBOARD_WORKED_EXAMPLE),
      ),
    )

    renderWithProviders(<FinancialSummary from="2026-04-09" to="2026-05-09" />)

    await waitFor(() => {
      expect(screen.getByText('$1,000.00')).toBeInTheDocument()
    })

    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText('$900.00')).toBeInTheDocument()
    // Surface-listed guard: must be 900% NOT 90%
    expect(screen.getByText('900%')).toBeInTheDocument()
    expect(screen.queryByText('90%')).not.toBeInTheDocument()
  })

  it('empty state: top_products=[] renders "No sales in this range"', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/financials/dashboard', () =>
        HttpResponse.json(DASHBOARD_WORKED_EXAMPLE),
      ),
    )

    renderWithProviders(<FinancialSummary from="2026-04-09" to="2026-05-09" />)

    await waitFor(() => {
      expect(screen.getByText(/No sales in this range/i)).toBeInTheDocument()
    })
  })

  it('top products renders product names when present', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/financials/dashboard', () =>
        HttpResponse.json(DASHBOARD_WITH_PRODUCTS),
      ),
    )

    renderWithProviders(<FinancialSummary from="2026-04-09" to="2026-05-09" />)

    await waitFor(() => {
      expect(screen.getByText('Yerba A')).toBeInTheDocument()
    })
  })

  it('error state: 500 response renders red Alert; KPI tiles do not render', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/financials/dashboard', () =>
        HttpResponse.json({ error: 'internal_error', detail: 'Server error' }, { status: 500 }),
      ),
    )

    renderWithProviders(<FinancialSummary from="2026-04-09" to="2026-05-09" />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // KPI tiles should not render money values
    expect(screen.queryByText('$1,000.00')).not.toBeInTheDocument()
  })

  it('CSV anchor href matches csvExportUrl for /financials/dashboard', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/financials/dashboard', () =>
        HttpResponse.json(DASHBOARD_WORKED_EXAMPLE),
      ),
    )

    renderWithProviders(<FinancialSummary from="2026-04-09" to="2026-05-09" />)

    await waitFor(() => {
      expect(screen.getByText('$900.00')).toBeInTheDocument()
    })

    const expectedHref = csvExportUrl('/financials/dashboard', {
      from: '2026-04-09',
      to: '2026-05-09',
    })
    const anchor = screen.getByRole('link', { name: /download csv/i })
    expect(anchor).toHaveAttribute('href', expectedHref)
  })
})
