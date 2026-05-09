import { defineConfig, devices } from '@playwright/test'

/**
 * playwright.config.ts
 *
 * Single chromium project. baseURL from VITE_E2E_BASE_URL (default :5173).
 * webServer auto-starts `npm run dev` and reuses if already running.
 * retries: 0 locally, 2 in CI. trace: on-first-retry.
 * testDir: ./tests/e2e
 *
 * See https://playwright.dev/docs/test-configuration.
 */

export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel within the project */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* No parallel workers for e2e (sequential to avoid BE state collisions) */
  workers: 1,
  /* Reporter */
  reporter: 'html',
  /* Shared settings for all projects */
  use: {
    /* Base URL to use in actions such as `await page.goto('/')` */
    baseURL: process.env.VITE_E2E_BASE_URL ?? 'http://localhost:5173',
    /* Collect trace when retrying the failed test — debug ergonomics */
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* Auto-start the Vite dev server; reuse if already running on port 5173 */
  webServer: {
    command: 'npm run dev',
    url: process.env.VITE_E2E_BASE_URL ?? 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
