/**
 * act.test.ts
 *
 * TDD for ILE-9 Step 6 — buildActActions factory.
 * 6 tests per plan:
 *  1. recall: !is_recalled → "Recall this batch"
 *  2. unrecall: is_recalled → "Un-recall this batch"
 *  3. commit-draft: so-draft with lines → "Commit this sales order"
 *  4. void-detail: committed, no voided_at → "Void this sales order"
 *  5. archive-product: hasBatches + !archived_at → "Archive this product"
 *  6. no actions on /stock (kind=other)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildActActions } from '../act'
import type { CmdkContext } from '../useCmdkContext'

const handlers = {
  openRecall: vi.fn(),
  openUnRecall: vi.fn(),
  openCommit: vi.fn(),
  openVoid: vi.fn(),
  openArchive: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buildActActions', () => {
  it('returns "Recall this batch" when on batch route and !is_recalled', () => {
    const ctx: CmdkContext = {
      kind: 'batch',
      batchId: 'b-1',
      batch: { is_recalled: false } as never,
    }
    const group = buildActActions(ctx, handlers)
    expect(group.actions).toHaveLength(1)
    const action = group.actions[0]!
    expect(action.label).toBe('Recall this batch')
    action.onClick()
    expect(handlers.openRecall).toHaveBeenCalledWith('b-1')
  })

  it('returns "Un-recall this batch" when on batch route and is_recalled', () => {
    const ctx: CmdkContext = {
      kind: 'batch',
      batchId: 'b-1',
      batch: { is_recalled: true } as never,
    }
    const group = buildActActions(ctx, handlers)
    expect(group.actions).toHaveLength(1)
    const action = group.actions[0]!
    expect(action.label).toBe('Un-recall this batch')
    action.onClick()
    expect(handlers.openUnRecall).toHaveBeenCalledWith('b-1')
  })

  it('returns "Commit this sales order" on so-draft context with lines', () => {
    const ctx: CmdkContext = {
      kind: 'so-draft',
      soId: 'so-1',
      so: { status: 'draft', voided_at: null, lines: [{ id: 'line-1' }] } as never,
    }
    const group = buildActActions(ctx, handlers)
    expect(group.actions).toHaveLength(1)
    const action = group.actions[0]!
    expect(action.label).toBe('Commit this sales order')
    action.onClick()
    expect(handlers.openCommit).toHaveBeenCalledOnce()
  })

  it('returns "Void this sales order" on so-detail context with status=committed, no voided_at', () => {
    const ctx: CmdkContext = {
      kind: 'so-detail',
      soId: 'so-1',
      so: { status: 'committed', voided_at: null } as never,
    }
    const group = buildActActions(ctx, handlers)
    expect(group.actions).toHaveLength(1)
    const action = group.actions[0]!
    expect(action.label).toBe('Void this sales order')
    action.onClick()
    expect(handlers.openVoid).toHaveBeenCalledWith('so-1')
  })

  it('returns "Archive this product" on product-detail with hasBatches + !archived_at', () => {
    const ctx: CmdkContext = {
      kind: 'product-detail',
      productId: 'p-1',
      productHasBatches: true,
      product: { archived_at: null } as never,
    }
    const group = buildActActions(ctx, handlers)
    expect(group.actions).toHaveLength(1)
    const action = group.actions[0]!
    expect(action.label).toBe('Archive this product')
    action.onClick()
    expect(handlers.openArchive).toHaveBeenCalledWith('p-1')
  })

  it('returns empty actions on kind=other (e.g. /stock)', () => {
    const ctx: CmdkContext = { kind: 'other' }
    const group = buildActActions(ctx, handlers)
    expect(group.actions).toHaveLength(0)
  })
})
