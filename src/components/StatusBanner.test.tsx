/**
 * src/components/StatusBanner.test.tsx
 *
 * TDD for ILE-20 — StatusBanner shared component.
 * 3 behavioural tests per plan — one per tone:
 *  1. terere tone: correct bg class + border CSS var
 *  2. amber tone: correct bg class + border CSS var
 *  3. clay tone: correct bg class + border CSS var
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '@/theme/mantine'
import { StatusBanner } from './StatusBanner'

function renderStatusBanner(props: React.ComponentProps<typeof StatusBanner>) {
  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <StatusBanner {...props} />
    </MantineProvider>,
  )
}

describe('StatusBanner', () => {
  it('terere tone applies bg-tinted-terere class and terere border CSS var', () => {
    renderStatusBanner({ tone: 'terere', children: 'Committed' })
    const banner = screen.getByRole('status')
    expect(banner.className).toContain('bg-tinted-terere')
    expect(banner).toHaveStyle({
      border: '1px solid var(--mantine-other-tintedTereredBorder)',
    })
    expect(screen.getByText('Committed')).toBeInTheDocument()
  })

  it('amber tone applies bg-tinted-amber class and amber border CSS var', () => {
    renderStatusBanner({ tone: 'amber', children: 'Expiring soon' })
    const banner = screen.getByRole('status')
    expect(banner.className).toContain('bg-tinted-amber')
    expect(banner).toHaveStyle({
      border: '1px solid var(--mantine-other-tintedAmberBorder)',
    })
    expect(screen.getByText('Expiring soon')).toBeInTheDocument()
  })

  it('clay tone applies bg-tinted-clay class and clay border CSS var', () => {
    renderStatusBanner({ tone: 'clay', children: 'Recalled' })
    const banner = screen.getByRole('status')
    expect(banner.className).toContain('bg-tinted-clay')
    expect(banner).toHaveStyle({
      border: '1px solid var(--mantine-other-tintedClayBorder)',
    })
    expect(screen.getByText('Recalled')).toBeInTheDocument()
  })
})
