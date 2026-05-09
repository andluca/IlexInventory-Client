/**
 * src/data/financials/queries.test.ts
 *
 * TDD for ILE-8 Step 1 — financials data layer (queries).
 */

import { describe, it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { createElement } from 'react'
import { server } from '@/test/server'
import { useDashboard, useMarginList } from './queries'

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const DASHBOARD_RESPONSE = {
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

const MARGIN_PAGE_1 = {
  items: [
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
  next_cursor: 'c1',
}

const MARGIN_PAGE_2 = {
  items: [
    {
      product_id: 'prod-2',
      product_name: 'Yerba B',
      units_sold: '50.0000',
      revenue: '250.0000',
      cogs: '150.0000',
      profit: '100.0000',
      margin_pct: '66.6667',
    },
  ],
  next_cursor: null,
}

// ---------------------------------------------------------------------------
// useDashboard
// ---------------------------------------------------------------------------

describe('useDashboard', () => {
  it('resolves the brief worked-example fixture with exact string values', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/financials/dashboard', () =>
        HttpResponse.json(DASHBOARD_RESPONSE),
      ),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useDashboard({}), { wrapper: makeWrapper(qc) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.totals.revenue).toBe('1000.0000')
    expect(result.current.data?.totals.cogs).toBe('100.0000')
    expect(result.current.data?.totals.profit).toBe('900.0000')
    expect(result.current.data?.totals.margin_pct).toBe('900.0000')
  })

  it('forwards from, to, top to query string; drops undefined values', async () => {
    let captured: Record<string, string | null> = {}

    server.use(
      http.get('http://localhost:8000/api/v1/financials/dashboard', ({ request }) => {
        const url = new URL(request.url)
        captured = {
          from: url.searchParams.get('from'),
          to: url.searchParams.get('to'),
          top: url.searchParams.get('top'),
          format: url.searchParams.get('format'),
        }
        return HttpResponse.json(DASHBOARD_RESPONSE)
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(
      () => useDashboard({ from: '2026-04-09', to: '2026-05-09', top: 5 }),
      { wrapper: makeWrapper(qc) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(captured.from).toBe('2026-04-09')
    expect(captured.to).toBe('2026-05-09')
    expect(captured.top).toBe('5')
    // format should NOT be in the JSON request
    expect(captured.format).toBeNull()
  })

  it('does not include undefined params in query string', async () => {
    let capturedSearch = ''

    server.use(
      http.get('http://localhost:8000/api/v1/financials/dashboard', ({ request }) => {
        capturedSearch = new URL(request.url).search
        return HttpResponse.json(DASHBOARD_RESPONSE)
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useDashboard({}), { wrapper: makeWrapper(qc) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // No params should be appended when all are undefined
    expect(capturedSearch).toBe('')
  })
})

// ---------------------------------------------------------------------------
// useMarginList
// ---------------------------------------------------------------------------

describe('useMarginList', () => {
  it('cursor pagination: page 1 returns next_cursor; fetchNextPage issues ?cursor=c1', async () => {
    let requestCount = 0
    let capturedCursor: string | null = null

    server.use(
      http.get('http://localhost:8000/api/v1/financials/margin', ({ request }) => {
        requestCount++
        const url = new URL(request.url)
        capturedCursor = url.searchParams.get('cursor')
        return HttpResponse.json(capturedCursor ? MARGIN_PAGE_2 : MARGIN_PAGE_1)
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(() => useMarginList({}), { wrapper: makeWrapper(qc) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)
    expect(result.current.data?.pages[0]?.items).toHaveLength(1)

    act(() => {
      void result.current.fetchNextPage()
    })

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    expect(capturedCursor).toBe('c1')
    expect(result.current.data?.pages[1]?.items[0]?.product_name).toBe('Yerba B')
    expect(result.current.hasNextPage).toBe(false)
    expect(requestCount).toBe(2)
  })

  it('forwards from, to, limit to query string', async () => {
    let captured: Record<string, string | null> = {}

    server.use(
      http.get('http://localhost:8000/api/v1/financials/margin', ({ request }) => {
        const url = new URL(request.url)
        captured = {
          from: url.searchParams.get('from'),
          to: url.searchParams.get('to'),
          limit: url.searchParams.get('limit'),
        }
        return HttpResponse.json({ items: [], next_cursor: null })
      }),
    )

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { result } = renderHook(
      () => useMarginList({ from: '2026-04-09', to: '2026-05-09', limit: 20 }),
      { wrapper: makeWrapper(qc) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(captured.from).toBe('2026-04-09')
    expect(captured.to).toBe('2026-05-09')
    expect(captured.limit).toBe('20')
  })
})
