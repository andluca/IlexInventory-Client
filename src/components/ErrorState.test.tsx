/**
 * src/components/ErrorState.test.tsx
 *
 * TDD for ILE-20 — ErrorState shared component.
 * 4 behavioural tests per plan:
 *  1. Renders ApiError.detail when present
 *  2. Falls back to ApiError.error when detail is null
 *  3. Generic message for non-ApiError input
 *  4. onRetry button fires the callback when clicked
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '@/theme/mantine'
import { ApiError } from '@/api/errors'
import { ErrorState } from './ErrorState'

function renderErrorState(props: React.ComponentProps<typeof ErrorState>) {
  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <ErrorState {...props} />
    </MantineProvider>,
  )
}

describe('ErrorState', () => {
  it('renders ApiError.detail when present', () => {
    const error = new ApiError({
      status: 400,
      error: 'validation_error',
      detail: 'Quantity must be positive',
    })
    renderErrorState({ error })
    expect(screen.getByText(/quantity must be positive/i)).toBeInTheDocument()
  })

  it('falls back to ApiError.error when detail is null', () => {
    const error = new ApiError({
      status: 409,
      error: 'duplicate_lot_code',
    })
    renderErrorState({ error })
    expect(screen.getByText(/duplicate_lot_code/i)).toBeInTheDocument()
  })

  it('renders a generic message for non-ApiError input', () => {
    renderErrorState({ error: new Error('Network failure') })
    expect(screen.getByText(/an error occurred/i)).toBeInTheDocument()
  })

  it('calls onRetry when the retry button is clicked', () => {
    const onRetry = vi.fn()
    const error = new ApiError({ status: 500, error: 'server_error', detail: 'Try again' })
    renderErrorState({ error, onRetry })

    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()
    fireEvent.click(retryButton)
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
