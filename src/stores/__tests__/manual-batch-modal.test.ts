/**
 * src/stores/__tests__/manual-batch-modal.test.ts
 *
 * TDD for ILE-9 Step 4 — manual-batch-modal store.
 * 1 test: setOpen flips the boolean.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useManualBatchModal } from '../manual-batch-modal'

beforeEach(() => {
  useManualBatchModal.setState({ open: false })
})

describe('useManualBatchModal', () => {
  it('setOpen flips the open flag', () => {
    expect(useManualBatchModal.getState().open).toBe(false)
    useManualBatchModal.getState().setOpen(true)
    expect(useManualBatchModal.getState().open).toBe(true)
    useManualBatchModal.getState().setOpen(false)
    expect(useManualBatchModal.getState().open).toBe(false)
  })
})
