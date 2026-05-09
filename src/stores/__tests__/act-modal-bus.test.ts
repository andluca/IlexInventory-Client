/**
 * src/stores/__tests__/act-modal-bus.test.ts
 *
 * TDD for ILE-9 Step 4 — act-modal-bus store.
 * 2 tests: request_ sets; clear nulls.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useActModalBus } from '../act-modal-bus'

beforeEach(() => {
  useActModalBus.setState({ request: null })
})

describe('useActModalBus', () => {
  it('request_ sets the request', () => {
    useActModalBus.getState().request_({ kind: 'recall', batchId: 'b-1' })
    expect(useActModalBus.getState().request).toEqual({ kind: 'recall', batchId: 'b-1' })
  })

  it('clear nulls the request', () => {
    useActModalBus.getState().request_({ kind: 'void', soId: 'so-1' })
    expect(useActModalBus.getState().request).not.toBeNull()
    useActModalBus.getState().clear()
    expect(useActModalBus.getState().request).toBeNull()
  })
})
