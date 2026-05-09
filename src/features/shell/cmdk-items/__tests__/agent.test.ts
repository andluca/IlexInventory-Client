/**
 * agent.test.ts
 *
 * TDD for ILE-9 Step 6 — buildAgentActions factory.
 * 2 tests:
 *  1. empty query → label "Ask Ilex"
 *  2. non-empty query → label "Ask Ilex: '...'" and clicking calls openAgent(query)
 */

import { describe, it, expect, vi } from 'vitest'
import { buildAgentActions } from '../agent'

describe('buildAgentActions', () => {
  it('empty query returns label "Ask Ilex"', () => {
    const openAgent = vi.fn()
    const group = buildAgentActions('', openAgent)
    expect(group.actions).toHaveLength(1)
    const action = group.actions[0]!
    expect(action.label).toBe('Ask Ilex')
  })

  it('non-empty query returns label "Ask Ilex: \'query\'" and onClick triggers openAgent', () => {
    const openAgent = vi.fn()
    const group = buildAgentActions('show me low stock', openAgent)
    const action = group.actions[0]!
    expect(action.label).toBe("Ask Ilex: 'show me low stock'")
    action.onClick()
    expect(openAgent).toHaveBeenCalledWith('show me low stock')
  })
})
