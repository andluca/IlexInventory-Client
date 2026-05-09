import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:5173',
      },
    },
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    globals: true,
    // Playwright e2e specs live under tests/e2e and run via `npm run test:e2e`.
    // Vitest picks up *.spec.ts patterns by default — exclude the e2e tree
    // here so `npm test` only runs unit/integration tests.
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'tests/e2e/**'],
    // Force absolute base URL in tests; .env.local sets a relative `/api/v1`
    // for the dev server (proxied by Vite), but openapi-fetch needs an
    // absolute URL to hand to MSW's URL parser.
    env: {
      VITE_API_BASE_URL: 'http://localhost:8000/api/v1',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
