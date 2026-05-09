/**
 * tests/e2e/critical-flow.spec.ts
 *
 * SPEC §5 phase 12 — critical happy-path E2E test.
 *
 * Flow: signup → create product → receive PO (batch) → commit SO →
 *       recall batch → view recall report → CSV export
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
import { API_BASE, signupViaApi, createProduct, createAndReceivePO } from './fixtures/api'

test('critical flow: signup → product → PO receive → SO commit → recall → recall report → CSV', async ({
  page,
}) => {
  // ---------------------------------------------------------------------------
  // Seed: unique identifiers for this test run
  // ---------------------------------------------------------------------------
  const uuid = uuidv7()
  const email = `e2e-${uuid}@ilex.test`
  const password = 'TestPass!1'
  const sku = `E2E-${uuid.slice(0, 8).toUpperCase()}`
  const batchCode = `BATCH-E2E-${uuid.slice(0, 8).toUpperCase()}`
  const customerName = `E2E Customer ${uuid.slice(0, 8)}`

  // Expiration 6 months out
  const exp = new Date()
  exp.setMonth(exp.getMonth() + 6)
  const expirationDate = exp.toISOString().split('T')[0]

  // ---------------------------------------------------------------------------
  // Step 1: Signup via API (faster than driving the signup form for auth seed)
  // ---------------------------------------------------------------------------
  const apiCtx = await playwrightRequest.newContext({ baseURL: API_BASE })
  await signupViaApi(apiCtx, email, password)

  // ---------------------------------------------------------------------------
  // Step 2: Create product via API
  // ---------------------------------------------------------------------------
  const productId = await createProduct(apiCtx, {
    sku,
    name: `E2E Product ${sku}`,
    base_unit: 'kg',
  })

  // ---------------------------------------------------------------------------
  // Step 3: Receive PO (batch) via API
  // ---------------------------------------------------------------------------
  const { batchId } = await createAndReceivePO(apiCtx, {
    productId,
    qty: 100,
    unit_cost: 5.0,
    batch_code: batchCode,
    expiration_date: expirationDate,
  })

  // ---------------------------------------------------------------------------
  // Step 4: Sign in via UI (the app requires authenticated session)
  // ---------------------------------------------------------------------------
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await expect(page).toHaveURL('/', { timeout: 15_000 })

  // Dashboard heading visible
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()

  // ---------------------------------------------------------------------------
  // Step 5: Create SO and commit via UI (exercises FEFO preview + commit modal)
  // ---------------------------------------------------------------------------
  await page.goto('/sales-orders/new')

  // Fill customer name
  await page.getByLabel(/customer name/i).fill(customerName)

  // Select product (assuming a searchable product select)
  const productInput = page.getByLabel(/product/i).first()
  await productInput.click()
  await productInput.fill(sku)
  await page.getByRole('option', { name: new RegExp(sku, 'i') }).first().click()

  // Fill quantity and sell price
  const qtyInput = page.getByLabel(/quantity/i).first()
  await qtyInput.fill('50')

  const priceInput = page.getByLabel(/sell price|price/i).first()
  await priceInput.fill('10.00')

  // Assert FEFO preview shows the batch
  await expect(page.getByText(new RegExp(batchCode, 'i'))).toBeVisible({ timeout: 10_000 })

  // Click Commit
  await page.getByRole('button', { name: /commit/i }).click()

  // Confirm in modal
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: /confirm|commit/i }).last().click()

  // Assert committed status
  await expect(page.getByText(/committed/i)).toBeVisible({ timeout: 15_000 })

  // Capture the SO URL
  const soUrl = page.url()
  expect(soUrl).toMatch(/\/sales-orders\//)

  // ---------------------------------------------------------------------------
  // Step 6: Recall the batch via UI
  // ---------------------------------------------------------------------------
  await page.goto(`/batches/${batchId}`)

  // Click Recall button
  await page.getByRole('button', { name: /^recall$/i }).click()

  // Fill reason
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByLabel(/reason/i).fill('E2E recall test')

  // Confirm recall
  await page.getByRole('button', { name: /confirm|submit|recall/i }).last().click()

  // Assert recall banner renders
  await expect(page.getByText(/recalled/i)).toBeVisible({ timeout: 10_000 })

  // ---------------------------------------------------------------------------
  // Step 7: View recall report via UI link
  // ---------------------------------------------------------------------------
  await page.getByRole('link', { name: /view recall report/i }).click()

  // URL should change to /batches/:id/recall-report
  await expect(page).toHaveURL(new RegExp(`/batches/${batchId}/recall-report`))

  // The committed SO's customer name should appear in the report
  await expect(page.getByText(new RegExp(customerName, 'i'))).toBeVisible({ timeout: 10_000 })

  // Allocated quantity = 50 (as committed)
  await expect(page.getByText('50.0000')).toBeVisible()

  // ---------------------------------------------------------------------------
  // Step 8: CSV export link href verification
  // ---------------------------------------------------------------------------
  const csvLink = page.getByRole('link', { name: /export csv/i })
  const href = await csvLink.getAttribute('href')
  expect(href).toMatch(new RegExp(`/batches/${batchId}/recall-report`))
  expect(href).toContain('format=csv')

  // Fetch the CSV via the API context (carries the session cookie)
  const csvResp = await apiCtx.get(`${API_BASE}/api/v1/batches/${batchId}/recall-report?format=csv`)
  expect(csvResp.status()).toBe(200)
  const contentType = csvResp.headers()['content-type']
  expect(contentType).toContain('text/csv')
  const csvBody = await csvResp.text()
  expect(csvBody).toContain(customerName)

  await apiCtx.dispose()
})
