import { setupServer } from 'msw/node'

/**
 * MSW server with zero handlers.
 * Issue 002+ adds handlers via server.use(...) in individual test files.
 *
 * Initialized in src/test/setup.ts with onUnhandledRequest: 'error'
 * so any unexpected network call fails loudly in tests.
 */
export const server = setupServer()
