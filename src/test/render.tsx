import { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mantineTheme } from '@/theme/mantine'

// Re-export everything from Testing Library so feature tests have one import
export * from '@testing-library/react'
export { userEvent } from '@testing-library/user-event'

/**
 * Creates a fresh QueryClient per test with retry disabled.
 * Never share a QueryClient across tests — it leaks state.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

type RenderWithProvidersOptions = Omit<RenderOptions, 'wrapper'>

/**
 * Wraps children in the full provider stack:
 * - MantineProvider (charcoal theme)
 * - QueryClientProvider (fresh per-test QueryClient, retry: false)
 *
 * For route-level tests, use TanStack Router's createMemoryHistory + RouterProvider
 * directly in the test (route tests are rare in this issue; they land in issue 003+).
 *
 * Re-exports Testing Library utilities so tests only need one import:
 *   import { render, screen, fireEvent } from '@/test/render'
 */
export function renderWithProviders(ui: ReactElement, options?: RenderWithProvidersOptions) {
  const queryClient = createTestQueryClient()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </MantineProvider>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  }
}
