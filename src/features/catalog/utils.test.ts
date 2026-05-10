/**
 * src/features/catalog/utils.test.ts
 *
 * Pure-function unit tests for catalog feature utils.
 */

import { describe, it, expect } from 'vitest'
import { buildProductsListUrl } from './utils'

describe('buildProductsListUrl', () => {
  it('maps empty search to undefined', () => {
    const result = buildProductsListUrl({ search: '' })
    expect(result.search).toBeUndefined()
  })

  it('leaves archived as undefined when not supplied', () => {
    const result = buildProductsListUrl({})
    expect(result.archived).toBeUndefined()
  })

  it('preserves page', () => {
    const result = buildProductsListUrl({ page: 4 })
    expect(result.page).toBe(4)
  })

  it('keeps non-empty search', () => {
    const result = buildProductsListUrl({ search: 'Milk' })
    expect(result.search).toBe('Milk')
  })

  it('keeps archived boolean when supplied', () => {
    const resultTrue = buildProductsListUrl({ archived: true })
    expect(resultTrue.archived).toBe(true)
    const resultFalse = buildProductsListUrl({ archived: false })
    expect(resultFalse.archived).toBe(false)
  })
})
