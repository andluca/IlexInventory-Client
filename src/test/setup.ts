import '@testing-library/jest-dom'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'
import Decimal from 'decimal.js'

// ---------------------------------------------------------------------------
// localStorage mock
// Zustand persist middleware uses window.localStorage. jsdom's localStorage
// requires a proper origin URL; to keep tests hermetic and avoid the
// `--localstorage-file` vitest flag, we provide a simple in-memory mock.
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

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
