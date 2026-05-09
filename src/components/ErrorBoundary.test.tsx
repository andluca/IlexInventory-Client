/**
 * src/components/ErrorBoundary.test.tsx
 *
 * TDD for ILE-9 Step 3 — ErrorBoundary shared component.
 * 3 tests per plan:
 *  1. renders children when no error
 *  2. renders 4xx envelope (Alert with error.detail) when child throws ApiError with status 400
 *  3. renders generic fallback + Reload button on plain Error
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '@/theme/mantine'
import { ErrorBoundary } from './ErrorBoundary'
import { ApiError } from '@/api/errors'

function renderBoundary(children: React.ReactNode) {
  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <ErrorBoundary>{children}</ErrorBoundary>
    </MantineProvider>,
  )
}

// Component that throws on render for test purposes
function ThrowApiError({ status }: { status: number }): React.ReactElement {
  throw new ApiError({
    status,
    error: 'test_error',
    detail: 'Human-readable error detail',
  })
}

function ThrowPlainError(): React.ReactElement {
  throw new Error('Something crashed')
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    renderBoundary(<div data-testid="child">Hello world</div>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renders 4xx envelope with error.detail when child throws ApiError status 400', () => {
    // Suppress the expected console.error output from React error boundary
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderBoundary(<ThrowApiError status={400} />)
    spy.mockRestore()

    expect(screen.getByText(/human-readable error detail/i)).toBeInTheDocument()
    // Should NOT show the generic fallback
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument()
  })

  it('renders generic fallback with Reload button on plain Error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderBoundary(<ThrowPlainError />)
    spy.mockRestore()

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
  })
})
