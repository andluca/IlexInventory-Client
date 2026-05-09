/**
 * create.test.ts
 *
 * TDD for ILE-9 Step 6 — buildCreateActions factory.
 * 1 test: returns 4 actions, "Manual batch" calls openManualBatch.
 */

import { describe, it, expect, vi } from 'vitest'
import { buildCreateActions } from '../create'

describe('buildCreateActions', () => {
  it('returns 4 actions, "Manual batch" calls openManualBatch', () => {
    const navigate = vi.fn()
    const openManualBatch = vi.fn()
    const group = buildCreateActions(navigate, openManualBatch)

    expect(group.group).toBe('Create')
    expect(group.actions).toHaveLength(4)

    const ids = group.actions.map((a) => a.id)
    expect(ids).toContain('create-purchase-order')
    expect(ids).toContain('create-sales-order')
    expect(ids).toContain('create-product')
    expect(ids).toContain('create-manual-batch')

    // Click the manual batch action — should call openManualBatch
    const manualBatchAction = group.actions.find((a) => a.id === 'create-manual-batch')!
    manualBatchAction.onClick()
    expect(openManualBatch).toHaveBeenCalledOnce()
  })
})
