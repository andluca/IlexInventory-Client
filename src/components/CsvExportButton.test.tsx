/**
 * src/components/CsvExportButton.test.tsx
 *
 * TDD for ILE-8 Step 2 — CsvExportButton shared component.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '@/theme/mantine'
import { CsvExportButton } from './CsvExportButton'
import { csvExportUrl } from '@/utils/csv-export'

function renderButton(props: React.ComponentProps<typeof CsvExportButton>) {
  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <CsvExportButton {...props} />
    </MantineProvider>,
  )
}

// ---------------------------------------------------------------------------
// 4-endpoint surface test (surface-listed)
// ---------------------------------------------------------------------------

const CSV_ENDPOINT_CASES = [
  {
    label: '/financials/dashboard',
    path: '/financials/dashboard' as const,
    params: { from: '2026-04-09', to: '2026-05-09' },
  },
  {
    label: '/financials/margin',
    path: '/financials/margin' as const,
    params: { from: '2026-04-09', to: '2026-05-09' },
  },
  {
    label: '/movements',
    path: '/movements' as const,
    params: { batch_id: 'b-1' },
  },
  {
    label: '/batches/b-abc/recall-report',
    path: '/batches/b-abc/recall-report' as const,
    params: undefined,
  },
]

describe('CsvExportButton', () => {
  it.each(CSV_ENDPOINT_CASES)(
    '4-endpoint surface test: href matches csvExportUrl for $label',
    ({ path, params }) => {
      renderButton({ path, params })
      const anchor = screen.getByRole('link')
      const expectedHref = csvExportUrl(path, params)
      expect(anchor).toHaveAttribute('href', expectedHref)
    },
  )

  it('renders download attribute on the anchor', () => {
    renderButton({ path: '/financials/dashboard' })
    const anchor = screen.getByRole('link')
    expect(anchor).toHaveAttribute('download')
  })

  it('default label is "Download CSV"', () => {
    renderButton({ path: '/financials/dashboard' })
    expect(screen.getByRole('link', { name: /download csv/i })).toBeInTheDocument()
  })

  it('custom label prop overrides default', () => {
    renderButton({ path: '/financials/dashboard', label: 'Export data' })
    expect(screen.getByRole('link', { name: /export data/i })).toBeInTheDocument()
    expect(screen.queryByText(/download csv/i)).not.toBeInTheDocument()
  })

  it('throws when path is not in allowlist (e.g. /products)', () => {
    expect(() => renderButton({ path: '/products' as never })).toThrow()
  })
})
