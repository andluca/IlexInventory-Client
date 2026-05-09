/**
 * SoLineEditor.test.tsx
 *
 * TDD for ILE-7 Step 4 — SO line editor component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { mantineTheme } from '@/theme/mantine'
import { SoLineEditor, type DraftSoLine } from '../SoLineEditor'
import { createElement } from 'react'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      MantineProvider,
      { theme: mantineTheme, defaultColorScheme: 'dark' as const },
      createElement(QueryClientProvider, { client: qc }, children),
    )
  }
  return Wrapper
}

const PRODUCTS_LIST = {
  items: [
    {
      id: 'prod-1',
      sku: 'YRB-001',
      name: 'Yerba Premium',
      description: '',
      base_unit: 'g',
      archived_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  total: 1,
  limit: 200,
  offset: 0,
}

describe('SoLineEditor', () => {
  beforeEach(() => {
    server.use(
      http.get('http://localhost:8000/api/v1/products', () =>
        HttpResponse.json(PRODUCTS_LIST),
      ),
    )
  })

  it('renders empty state when no lines', () => {
    const onChange = vi.fn()
    render(
      <SoLineEditor lines={[]} onChange={onChange} />,
      { wrapper: makeWrapper() },
    )

    expect(screen.getByText(/no lines yet/i)).toBeInTheDocument()
  })

  it('trash icon removes the row and calls onChange with updated array', async () => {
    const onChange = vi.fn()
    const lines: DraftSoLine[] = [
      { product_id: 'prod-1', quantity: '5', sell_price: '10' },
      { product_id: 'prod-1', quantity: '3', sell_price: '8' },
    ]

    render(
      <SoLineEditor lines={lines} onChange={onChange} />,
      { wrapper: makeWrapper() },
    )

    const removeButtons = screen.getAllByRole('button', { name: /remove line/i })
    fireEvent.click(removeButtons[0]!)

    expect(onChange).toHaveBeenCalledWith([
      { product_id: 'prod-1', quantity: '3', sell_price: '8' },
    ])
  })

  it('renders a row for each line', () => {
    const onChange = vi.fn()
    const lines: DraftSoLine[] = [
      { product_id: 'prod-1', quantity: '5', sell_price: '10' },
      { product_id: '', quantity: '0', sell_price: '0' },
    ]

    render(
      <SoLineEditor lines={lines} onChange={onChange} />,
      { wrapper: makeWrapper() },
    )

    const removeButtons = screen.getAllByRole('button', { name: /remove line/i })
    expect(removeButtons).toHaveLength(2)
  })
})
