/**
 * src/features/procurement/__tests__/utils.test.ts
 *
 * Pure-function unit tests for procurement feature utils.
 */

import { describe, it, expect } from 'vitest'
import { buildPosListUrl } from '../utils'

describe('buildPosListUrl', () => {
  it('drops status="all" → no status key in result', () => {
    const result = buildPosListUrl({ status: 'all' })
    expect(result).not.toHaveProperty('status')
  })

  it('keeps status="draft"', () => {
    const result = buildPosListUrl({ status: 'draft' })
    expect(result.status).toBe('draft')
  })

  it('drops empty search', () => {
    const result = buildPosListUrl({ search: '' })
    expect(result).not.toHaveProperty('search')
  })

  it('keeps non-empty search', () => {
    const result = buildPosListUrl({ search: 'Acme' })
    expect(result.search).toBe('Acme')
  })

  it('keeps page when supplied', () => {
    const result = buildPosListUrl({ page: 3 })
    expect(result.page).toBe(3)
  })
})
