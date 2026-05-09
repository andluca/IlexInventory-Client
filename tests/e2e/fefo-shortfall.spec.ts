/**
 * tests/e2e/fefo-shortfall.spec.ts
 *
 * SPEC §3.6 — SO commit blocked when requested qty exceeds available (FEFO shortfall).
 *
 * Flow: signup → create product → receive PO qty=10 → attempt SO qty=50 →
 *       assert shortfall message + commit button gated.
 *
 * Prerequisites:
 *   - BE running on localhost:8000 (or VITE_API_PROXY_TARGET)
 *   - Vite dev server running on localhost:5173 (auto-started by playwright.config.ts)
 *
 * NOTE: This test cannot run without a live BE. It is verified via
 * `npx playwright test --list` in CI; actual execution is local/pre-deploy.
 */

import { test, expect, request as playwrightRequest } from '@playwright/test'
import { uuidv7 } from 'uuidv7'
import {
  API_BASE,
  signupViaApi,
  createProduct,
  createAndReceivePO,
} from './fixtures/api'

test('FEFO shortfall: commit blocked when requested qty > available', async ({ page }) => {
  // ---------------------------------------------------------------------------
  // Seed: unique identifiers
  // ---------------------------------------------------------------------------
  const uuid = uuidv7()
  const email = `e2e-${uuid}@ilex.test`
  const password = 'TestPass!1'
  const sku = `SFL-${uuid.slice(0, 8).toUpperCase()}`
  const batchCode = `BATCH-SFL-${uuid.slice(0, 8).toUpperCase()}`

  const exp = new Date()
  exp.setMonth(exp.getMonth() + 6)
  const expirationDate = exp.toISOString().split('T')[0]

  // ---------------------------------------------------------------------------
  // Seed via API: signup + product + PO with qty=10
  // ---------------------------------------------------------------------------
  const apiCtx = await playwrightRequest.newContext({ baseURL: API_BASE })
  await signupViaApi(apiCtx, email, password)
  const productId = await createProduct(apiCtx, {
    sku,
    name: `Shortfall Product ${sku}`,
    base_unit: 'kg',
  })
  await createAndReceivePO(apiCtx, {
    productId,
    qty: 10,
    unit_cost: 5.0,
    batch_code: batchCode,
    expiration_date: expirationDate,
  })
  await apiCtx.dispose()

  // ---------------------------------------------------------------------------
  // Sign in via UI
  // ---------------------------------------------------------------------------
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await expect(page).toHaveURL('/', { timeout: 15_000 })

  // ---------------------------------------------------------------------------
  // Navigate to new SO — request qty=50 against available=10
  // ---------------------------------------------------------------------------
  await page.goto('/sales-orders/new')

  await page.getByLabel(/customer name/i).fill(`Shortfall Customer ${uuid.slice(0, 8)}`)

  const productInput = page.getByLabel(/product/i).first()
  await productInput.click()
  await productInput.fill(sku)
  await page.getByRole('option', { name: new RegExp(sku, 'i') }).first().click()

  const qtyInput = page.getByLabel(/quantity/i).first()
  await qtyInput.fill('50')

  const priceInput = page.getByLabel(/sell price|price/i).first()
  await priceInput.fill('10.00')

  // ---------------------------------------------------------------------------
  // Assert FEFO preview shows shortfall (SPEC §3.6)
  // ---------------------------------------------------------------------------
  // The FEFO preview should surface that available < required
  await expect(
    page.getByText(/required.*50|available.*10|shortfall|insufficient/i),
  ).toBeVisible({ timeout: 10_000 })

  // ---------------------------------------------------------------------------
  // Assert Commit button is disabled or clicking does not navigate away
  // ---------------------------------------------------------------------------
  const commitButton = page.getByRole('button', { name: /commit/i })

  // Either the button is disabled...
  const isDisabled = await commitButton.isDisabled()
  if (!isDisabled) {
    // ...or clicking it shows an inline error and does NOT navigate to /sales-orders/:id
    await commitButton.click()
    // Give it a moment to react
    await page.waitForTimeout(500)
    // Should still be on the new SO page (not redirected)
    expect(page.url()).toMatch(/\/sales-orders\/new/)
  }
})
