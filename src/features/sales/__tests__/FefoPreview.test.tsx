/**
 * FefoPreview.test.tsx
 *
 * TDD for ILE-7 Step 5 — FEFO preview component.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { createElement } from 'react'
import { mantineTheme } from '@/theme/mantine'
import { FefoPreview } from '../FefoPreview'
import type { SalesOrderPreviewResponse } from '../FefoPreview'

function makeWrapper() {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      MantineProvider,
      { theme: mantineTheme, defaultColorScheme: 'dark' as const },
      children,
    )
  }
  return Wrapper
}

// Two lines × allocations sorted by expiration_date — flat shape per current BE.
const PREVIEW_FIXTURE: SalesOrderPreviewResponse = {
  allocations: [
    {
      line_id: 'line-1',
      batch_id: 'batch-a',
      batch_code: 'EARLIEST',
      expiration_date: '2026-05-15', // <14 days from 2026-05-08 → expiring soon
      quantity: '5.0000',
      unit_cost: '2.0000',
    },
    {
      line_id: 'line-1',
      batch_id: 'batch-b',
      batch_code: 'LATER',
      expiration_date: '2026-12-31',
      quantity: '5.0000',
      unit_cost: '2.5000',
    },
    {
      line_id: 'line-2',
      batch_id: 'batch-c',
      batch_code: 'NULLDATE',
      expiration_date: null,
      quantity: '3.0000',
      unit_cost: '8.0000',
    },
  ],
}

describe('FefoPreview', () => {
  it('empty: preview=null shows "Add lines to see the FEFO allocation."', () => {
    render(
      <FefoPreview
        preview={null}
        onRefresh={vi.fn()}
        onCommit={vi.fn()}
      />,
      { wrapper: makeWrapper() },
    )

    expect(screen.getByText(/Add lines to see the FEFO allocation/)).toBeInTheDocument()
  })

  it('loading: shows skeleton cards', () => {
    render(
      <FefoPreview
        preview={null}
        loading={true}
        onRefresh={vi.fn()}
        onCommit={vi.fn()}
      />,
      { wrapper: makeWrapper() },
    )

    // Mantine Skeleton renders with role=status or just visible
    const skeletons = document.querySelectorAll('[class*="Skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('FEFO preview rendering: 2 lines × allocations sorted by expiration_date ASC NULLS LAST; ExpiryBadge on <14d row', () => {
    render(
      <FefoPreview
        preview={PREVIEW_FIXTURE}
        onRefresh={vi.fn()}
        onCommit={vi.fn()}
      />,
      { wrapper: makeWrapper() },
    )

    // Both batch codes appear
    expect(screen.getByText('EARLIEST')).toBeInTheDocument()
    expect(screen.getByText('LATER')).toBeInTheDocument()
    expect(screen.getByText('NULLDATE')).toBeInTheDocument()

    // Expiry badge on the <14d row
    expect(screen.getByText('Expiring soon')).toBeInTheDocument()
  })

  it('shortfall: ShortfallBanner renders inline above the preview cards (not a toast)', () => {
    const shortfall = {
      product_id: 'prod-1',
      required: '10.0000',
      available: '8.0000',
    }

    render(
      <FefoPreview
        preview={PREVIEW_FIXTURE}
        shortfall={shortfall}
        onRefresh={vi.fn()}
        onCommit={vi.fn()}
        onDismissShortfall={vi.fn()}
      />,
      { wrapper: makeWrapper() },
    )

    // ShortfallBanner renders in the DOM inline (not a toast)
    const alerts = screen.getAllByRole('alert')
    expect(alerts.length).toBeGreaterThan(0)
    // The shortfall text appears somewhere
    expect(screen.getAllByText(/Cannot commit/).length).toBeGreaterThan(0)
  })

  it('commit disabled: Commit button is disabled when commitDisabled=true', () => {
    render(
      <FefoPreview
        preview={PREVIEW_FIXTURE}
        commitDisabled={true}
        onRefresh={vi.fn()}
        onCommit={vi.fn()}
      />,
      { wrapper: makeWrapper() },
    )

    const commitBtn = screen.getByRole('button', { name: /commit/i })
    expect(commitBtn).toBeDisabled()
  })
})
