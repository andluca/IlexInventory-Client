/**
 * navigate.test.ts
 *
 * TDD for ILE-9 Step 6 — buildNavigateActions factory.
 * 1 test: returns 6 actions matching SPEC §2.7 pages.
 */

import { describe, it, expect, vi } from 'vitest'
import { buildNavigateActions } from '../navigate'

describe('buildNavigateActions', () => {
  it('returns 6 actions matching SPEC §2.7 pages', () => {
    const navigate = vi.fn()
    const group = buildNavigateActions(navigate)

    expect(group.group).toBe('Navigate')
    expect(group.actions).toHaveLength(6)

    const ids = group.actions.map((a) => a.id)
    expect(ids).toContain('nav-dashboard')
    expect(ids).toContain('nav-products')
    expect(ids).toContain('nav-purchase-orders')
    expect(ids).toContain('nav-sales-orders')
    expect(ids).toContain('nav-stock')
    expect(ids).toContain('nav-settings')
  })
})
