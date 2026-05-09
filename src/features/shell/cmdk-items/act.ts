/**
 * src/features/shell/cmdk-items/act.ts
 *
 * Pure function returning SpotlightActionGroupData for the Act group.
 * Context-aware: returns up to one action based on the current route shape.
 *
 * Per ILE-9 Step 6.
 */

import type { CmdkContext } from './useCmdkContext'
import type { SpotlightActionGroup } from './navigate'

export type ActHandlers = {
  openRecall: (batchId: string) => void
  openUnRecall: (batchId: string) => void
  openCommit: () => void
  openVoid: (soId: string) => void
  openArchive: (productId: string) => void
}

export function buildActActions(
  ctx: CmdkContext,
  handlers: ActHandlers,
): SpotlightActionGroup {
  const actions: SpotlightActionGroup['actions'] = []

  if (ctx.kind === 'batch' && ctx.batchId) {
    const isRecalled = ctx.batch?.is_recalled ?? false
    if (!isRecalled) {
      actions.push({
        id: 'act-recall',
        label: 'Recall this batch',
        description: 'Mark this batch as recalled',
        keywords: ['recall', 'safety', 'batch'],
        onClick: () => handlers.openRecall(ctx.batchId),
      })
    } else {
      actions.push({
        id: 'act-unrecall',
        label: 'Un-recall this batch',
        description: 'Reverse the recall on this batch',
        keywords: ['unrecall', 'recall', 'reverse', 'batch'],
        onClick: () => handlers.openUnRecall(ctx.batchId),
      })
    }
  }

  if (ctx.kind === 'so-draft' && ctx.soId) {
    const lines = ctx.so?.lines ?? []
    if (lines.length > 0) {
      actions.push({
        id: 'act-commit',
        label: 'Commit this sales order',
        description: 'Confirm and commit the draft sales order',
        keywords: ['commit', 'confirm', 'sales', 'order'],
        onClick: () => handlers.openCommit(),
      })
    }
  }

  if (ctx.kind === 'so-detail' && ctx.soId) {
    const isCommitted = ctx.so?.status === 'committed'
    const isVoided = Boolean(ctx.so?.voided_at)
    if (isCommitted && !isVoided) {
      actions.push({
        id: 'act-void',
        label: 'Void this sales order',
        description: 'Void a committed sales order',
        keywords: ['void', 'cancel', 'sales', 'order'],
        onClick: () => handlers.openVoid(ctx.soId),
      })
    }
  }

  if (ctx.kind === 'product-detail' && ctx.productId) {
    const hasBatches = ctx.productHasBatches
    const isArchived = Boolean(ctx.product?.archived_at)
    if (hasBatches && !isArchived) {
      actions.push({
        id: 'act-archive',
        label: 'Archive this product',
        description: 'Archive the product (has existing batches)',
        keywords: ['archive', 'product'],
        onClick: () => handlers.openArchive(ctx.productId),
      })
    }
  }

  return {
    group: 'Act',
    actions,
  }
}
