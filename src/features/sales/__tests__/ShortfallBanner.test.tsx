/**
 * ShortfallBanner.test.tsx
 *
 * TDD for ILE-7 Step 5 — ShortfallBanner component.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { createElement } from 'react'
import { mantineTheme } from '@/theme/mantine'
import { ShortfallBanner } from '../ShortfallBanner'

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

describe('ShortfallBanner', () => {
  it('renders the shortfall message with product name, required, and available', () => {
    render(
      <ShortfallBanner
        productName="Yerba Premium"
        required="10.0000"
        available="8.0000"
        baseUnit="unit"
        onDismiss={vi.fn()}
      />,
      { wrapper: makeWrapper() },
    )

    expect(
      screen.getByText(/Cannot commit — Product 'Yerba Premium' requires.*but only.*on hand/),
    ).toBeInTheDocument()
  })

  it('dismiss button calls onDismiss', () => {
    const onDismiss = vi.fn()
    render(
      <ShortfallBanner
        productName="Coffee"
        required="5.0000"
        available="3.0000"
        baseUnit="g"
        onDismiss={onDismiss}
      />,
      { wrapper: makeWrapper() },
    )

    // Mantine Alert close button
    const closeBtn = screen.getByRole('button')
    fireEvent.click(closeBtn)

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
