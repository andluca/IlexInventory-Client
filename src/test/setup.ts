import '@testing-library/jest-dom'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'
import Decimal from 'decimal.js'

// Configure Decimal.js globally — same config as src/main.tsx
// This ensures tests use the same precision/rounding as the production app.
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN })

// jsdom doesn't implement window.matchMedia — Mantine's MantineProvider requires it.
// Provide a minimal mock so MantineProvider mounts in tests.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Start the MSW server before all tests (with zero handlers — issue 002+ adds them)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Reset any request handlers added in individual tests
afterEach(() => server.resetHandlers())

// Close the MSW server after all tests
afterAll(() => server.close())
