/**
 * src/features/sales/utils.test.ts
 *
 * Pure-function unit tests for sales feature utils.
 */

import { describe, it, expect } from 'vitest'
import { buildSosListUrl, statusBadgeColor, effectiveStatus } from './utils'

describe('buildSosListUrl', () => {
  it('drops status when "all"', () => {
    const result = buildSosListUrl({ status: 'all' })
    expect(result).not.toHaveProperty('status')
  })

  it('keeps status when "committed"', () => {
    const result = buildSosListUrl({ status: 'committed' })
    expect(result.status).toBe('committed')
  })

  it('drops empty search', () => {
    const result = buildSosListUrl({ search: '' })
    expect(result).not.toHaveProperty('search')
  })

  it('keeps non-empty search', () => {
    const result = buildSosListUrl({ search: 'Acme' })
    expect(result.search).toBe('Acme')
  })
})

describe('statusBadgeColor', () => {
  it('returns red for voided', () => {
    expect(statusBadgeColor('voided')).toBe('red')
  })

  it('returns green for committed', () => {
    expect(statusBadgeColor('committed')).toBe('green')
  })

  it('returns gray for draft', () => {
    expect(statusBadgeColor('draft')).toBe('gray')
  })
})

describe('effectiveStatus', () => {
  it('returns "voided" when voided_at is set', () => {
    expect(effectiveStatus({ status: 'committed', voided_at: '2024-01-01T00:00:00Z' })).toBe('voided')
  })

  it('returns status passthrough when voided_at is null', () => {
    expect(effectiveStatus({ status: 'draft', voided_at: null })).toBe('draft')
  })
})
