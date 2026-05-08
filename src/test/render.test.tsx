import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from './render'
import { useMantineTheme } from '@mantine/core'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Sanity tests for the renderWithProviders helper.
 * Catches provider regressions early so every feature test doesn't silently fail.
 */

function ThemeInspector() {
  const theme = useMantineTheme()
  return (
    <div>
      <span data-testid="primary-color">{theme.primaryColor}</span>
    </div>
  )
}

function QueryClientInspector() {
  const client = useQueryClient()
  return (
    <div>
      <span data-testid="has-query-client">{client ? 'yes' : 'no'}</span>
    </div>
  )
}

describe('renderWithProviders', () => {
  it('provides the Mantine charcoal theme', () => {
    renderWithProviders(<ThemeInspector />)
    expect(screen.getByTestId('primary-color')).toHaveTextContent('terere')
  })

  it('provides a QueryClient', () => {
    renderWithProviders(<QueryClientInspector />)
    expect(screen.getByTestId('has-query-client')).toHaveTextContent('yes')
  })

  it('exposes the queryClient in the return value', () => {
    const { queryClient } = renderWithProviders(<div />)
    expect(queryClient).toBeDefined()
    expect(typeof queryClient.getQueryData).toBe('function')
  })

  it('creates a fresh QueryClient per test call', () => {
    const { queryClient: client1 } = renderWithProviders(<div />)
    const { queryClient: client2 } = renderWithProviders(<div />)
    expect(client1).not.toBe(client2)
  })
})
