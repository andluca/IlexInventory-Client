/**
 * src/features/inventory/utils.test.ts
 *
 * Pure-function unit tests for inventory feature utils.
 */

import { describe, it, expect } from 'vitest'
import { buildStockListUrl } from './utils'

describe('buildStockListUrl', () => {
  it('drops product_id, is_recalled, expiring_within when undefined', () => {
    const result = buildStockListUrl({})
    expect(result).not.toHaveProperty('product_id')
    expect(result).not.toHaveProperty('is_recalled')
    expect(result).not.toHaveProperty('expiring_within')
  })

  it('keeps page when supplied', () => {
    const result = buildStockListUrl({ page: 3 })
    expect(result.page).toBe(3)
  })

  it('preserves all three filters when set', () => {
    const result = buildStockListUrl({ product_id: 'abc', is_recalled: true, expiring_within: 30 })
    expect(result.product_id).toBe('abc')
    expect(result.is_recalled).toBe(true)
    expect(result.expiring_within).toBe(30)
  })
})
