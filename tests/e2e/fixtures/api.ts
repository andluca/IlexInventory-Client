/**
 * tests/e2e/fixtures/api.ts
 *
 * Test helpers that seed BE state via direct API calls — bypassing the Vite
 * proxy and hitting the BE directly. Each helper throws on non-2xx so
 * Playwright surfaces the seed failure with a clear assertion message.
 *
 * Usage:
 *   const apiCtx = await request.newContext({ baseURL: API_BASE })
 *   await signupViaApi(apiCtx, 'e2e-xxx@ilex.test', 'password')
 *   const productId = await createProduct(apiCtx, { sku, name, base_unit })
 *   const { batchId } = await createAndReceivePO(apiCtx, { productId, ... })
 *   const soId = await createSO(apiCtx, { productId, ... })
 */

import type { APIRequestContext } from '@playwright/test'
import { expect } from '@playwright/test'

/** BE origin — bypasses the Vite proxy to reduce failure-mode surface */
export const API_BASE =
  process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000'

// ---------------------------------------------------------------------------
// signupViaApi
// ---------------------------------------------------------------------------

/**
 * POST /auth/signup — registers a new user and returns the session context
 * (the cookie is stored in apiCtx). Throws if the status != 201.
 */
export async function signupViaApi(
  apiCtx: APIRequestContext,
  email: string,
  password: string,
): Promise<void> {
  const response = await apiCtx.post(`${API_BASE}/api/v1/auth/signup`, {
    data: { email, password },
  })
  expect(response.status()).toBe(201)
}

// ---------------------------------------------------------------------------
// createProduct
// ---------------------------------------------------------------------------

export interface CreateProductInput {
  sku: string
  name: string
  base_unit: string
}

/**
 * POST /products — creates a product and returns its id.
 * Throws if status != 201.
 */
export async function createProduct(
  apiCtx: APIRequestContext,
  input: CreateProductInput,
): Promise<string> {
  const response = await apiCtx.post(`${API_BASE}/api/v1/products`, {
    data: input,
  })
  expect(response.status()).toBe(201)
  const body = await response.json()
  return body.id as string
}

// ---------------------------------------------------------------------------
// createAndReceivePO
// ---------------------------------------------------------------------------

export interface CreateAndReceivePOInput {
  productId: string
  qty: number
  unit_cost: number
  batch_code: string
  expiration_date?: string
}

export interface CreateAndReceivePOResult {
  poId: string
  batchId: string
}

/**
 * POST /purchase-orders → POST /purchase-orders/:id/receive
 * Returns { poId, batchId }. Throws on any non-2xx step.
 */
export async function createAndReceivePO(
  apiCtx: APIRequestContext,
  input: CreateAndReceivePOInput,
): Promise<CreateAndReceivePOResult> {
  // 1. Create PO draft
  const createResp = await apiCtx.post(`${API_BASE}/api/v1/purchase-orders`, {
    data: {
      lines: [
        {
          product_id: input.productId,
          quantity: input.qty,
          unit_cost: input.unit_cost,
        },
      ],
    },
  })
  expect(createResp.status()).toBe(201)
  const po = await createResp.json()
  const poId: string = po.id
  const lineId: string = po.lines[0].id

  // 2. Receive PO
  const receiveResp = await apiCtx.post(
    `${API_BASE}/api/v1/purchase-orders/${poId}/receive`,
    {
      data: {
        lines: [
          {
            line_id: lineId,
            batch_code: input.batch_code,
            expiration_date: input.expiration_date ?? null,
          },
        ],
      },
    },
  )
  expect(receiveResp.status()).toBe(200)
  const received = await receiveResp.json()

  // Extract batch from the created batches list
  const batchResp = await apiCtx.get(`${API_BASE}/api/v1/batches`, {
    params: { product_id: input.productId, limit: 10, offset: 0 },
  })
  expect(batchResp.status()).toBe(200)
  const batchList = await batchResp.json()

  // Find the batch matching our batch_code
  const batch = batchList.items.find(
    (b: { batch_code: string }) => b.batch_code === input.batch_code,
  )

  if (!batch) {
    throw new Error(
      `createAndReceivePO: batch with code ${input.batch_code} not found after receive. PO receive response: ${JSON.stringify(received)}`,
    )
  }

  return { poId, batchId: batch.id as string }
}

// ---------------------------------------------------------------------------
// createSO
// ---------------------------------------------------------------------------

export interface CreateSOInput {
  customerName: string
  productId: string
  qty: number
  sell_price: number
}

/**
 * POST /sales-orders — creates an SO draft. Returns soId.
 * Throws if status != 201.
 */
export async function createSO(
  apiCtx: APIRequestContext,
  input: CreateSOInput,
): Promise<string> {
  const response = await apiCtx.post(`${API_BASE}/api/v1/sales-orders`, {
    data: {
      customer_name: input.customerName,
      lines: [
        {
          product_id: input.productId,
          quantity: input.qty,
          sell_price: input.sell_price,
        },
      ],
    },
  })
  expect(response.status()).toBe(201)
  const body = await response.json()
  return body.id as string
}
