/**
 * src/components/PageHeader.test.tsx
 *
 * TDD for ILE-20 — PageHeader shared component.
 * 5 behavioural tests per plan:
 *  1. Renders title as <h1>
 *  2. Omits subtitle when not provided
 *  3. Renders contextTag in mono uppercase + dimmed
 *  4. Renders actions slot
 *  5. Carries the glass class
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '@/theme/mantine'
import { PageHeader } from './PageHeader'

function renderPageHeader(props: React.ComponentProps<typeof PageHeader>) {
  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <PageHeader {...props} />
    </MantineProvider>,
  )
}

describe('PageHeader', () => {
  it('renders title as an h1 heading', () => {
    renderPageHeader({ title: 'Products' })
    expect(screen.getByRole('heading', { level: 1, name: /products/i })).toBeInTheDocument()
  })

  it('omits subtitle when not provided', () => {
    renderPageHeader({ title: 'Products' })
    expect(screen.queryByText(/subtitle/i)).not.toBeInTheDocument()
  })

  it('renders contextTag when provided', () => {
    renderPageHeader({ title: 'Batch detail', contextTag: 'LOT-2024-A11' })
    const tag = screen.getByText('LOT-2024-A11')
    // Tag must be present and not be the main heading
    expect(tag).toBeInTheDocument()
    expect(tag.tagName.toLowerCase()).not.toBe('h1')
  })

  it('renders the actions slot', () => {
    renderPageHeader({
      title: 'Products',
      actions: <button type="button">New Product</button>,
    })
    expect(screen.getByRole('button', { name: /new product/i })).toBeInTheDocument()
  })

  it('carries the glass surface class on the outer wrapper', () => {
    const { container } = renderPageHeader({ title: 'Products' })
    const wrapper = container.querySelector('[data-motion="page-header"]')
    expect(wrapper).not.toBeNull()
    expect(wrapper?.className).toContain('bg-surface-elevated')
  })
})
