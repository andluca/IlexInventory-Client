/**
 * src/components/LoadingSkeleton.test.tsx
 *
 * TDD for ILE-9 Step 2 — LoadingSkeleton shared component.
 * 3 tests per plan:
 *  1. renders N rows when rows prop given
 *  2. has role="status" + aria-busy + visually hidden "Loading…" text
 *  3. defaults to 5 rows when no prop
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '@/theme/mantine'
import { LoadingSkeleton } from './LoadingSkeleton'

function renderSkeleton(props?: React.ComponentProps<typeof LoadingSkeleton>) {
  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <LoadingSkeleton {...props} />
    </MantineProvider>,
  )
}

describe('LoadingSkeleton', () => {
  it('renders the specified number of rows', () => {
    const { container } = renderSkeleton({ rows: 3 })
    // Each Skeleton row is a div with Mantine's skeleton class
    const skeletonRows = container.querySelectorAll('.mantine-Skeleton-root')
    expect(skeletonRows).toHaveLength(3)
  })

  it('has role="status", aria-busy="true", and visually hidden "Loading…" text', () => {
    renderSkeleton()

    const container = screen.getByRole('status')
    expect(container).toHaveAttribute('aria-busy', 'true')
    // Visually hidden text for screen readers
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('defaults to 5 rows when no rows prop given', () => {
    const { container } = renderSkeleton()
    const skeletonRows = container.querySelectorAll('.mantine-Skeleton-root')
    expect(skeletonRows).toHaveLength(5)
  })
})
