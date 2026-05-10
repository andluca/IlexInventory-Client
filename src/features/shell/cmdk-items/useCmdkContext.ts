/**
 * src/features/shell/cmdk-items/useCmdkContext.ts
 *
 * Route-aware hook returning context for the CmdkPalette Act group.
 * Reads useMatches() from TanStack Router to determine the current route shape,
 * then fetches the relevant data via existing query hooks (piggybacks on cached results).
 *
 * Per ILE-9 Step 6. Refactored in ILE-14: replaced three inline useQuery blocks
 * (which called apiClient directly) with useBatch / useSo / useProduct data-layer
 * hooks so the 404-no-retry policy (BE-D4) is inherited automatically.
 */

import { useMatches } from '@tanstack/react-router'
import { useBatch, useBatchesByProduct } from '@/data/inventory/queries'
import { useSo } from '@/data/sales/queries'
import { useProduct } from '@/data/catalog/queries'
import type { BatchResponse } from '@/data/inventory/queries'
import type { SalesOrderResponse } from '@/data/sales/queries'
import type { ProductResponse } from '@/data/catalog/queries'

export type CmdkContext =
  | { kind: 'batch'; batchId: string; batch: BatchResponse | undefined }
  | { kind: 'so-draft'; soId: string; so: SalesOrderResponse | undefined }
  | { kind: 'so-detail'; soId: string; so: SalesOrderResponse | undefined }
  | { kind: 'product-detail'; productId: string; product: ProductResponse | undefined; productHasBatches: boolean }
  | { kind: 'other' }

export function useCmdkContext(): CmdkContext {
  const matches = useMatches()

  // Determine which route we're on based on route path patterns
  const routeIds = matches.map((m) => m.routeId)

  const isBatchDetail = routeIds.some((id) => /batches\/\$id/.test(id) || /batches\.\$id/.test(id))
  const isSoEdit = routeIds.some((id) => /sales-orders\/\$id\/edit/.test(id) || /sales-orders\.new/.test(id) || /sales-orders\/new/.test(id))
  const isSoDetail = !isSoEdit && routeIds.some((id) => /sales-orders\/\$id/.test(id) || /sales-orders\.\$id/.test(id))
  const isProductDetail = routeIds.some((id) => /products\/\$id/.test(id) || /products\.\$id/.test(id))

  // Extract params from matches
  const batchMatch = isBatchDetail
    ? matches.find((m) => /batches/.test(m.routeId) && (m.params as Record<string, string>).id)
    : null
  const batchId = batchMatch ? ((batchMatch.params as Record<string, string>).id ?? '') : ''

  const soMatch = (isSoEdit || isSoDetail)
    ? matches.find((m) => /sales-orders/.test(m.routeId) && (m.params as Record<string, string>).id)
    : null
  const soId = soMatch ? ((soMatch.params as Record<string, string>).id ?? '') : ''

  const productMatch = isProductDetail
    ? matches.find((m) => /products/.test(m.routeId) && (m.params as Record<string, string>).id)
    : null
  const productId = productMatch ? ((productMatch.params as Record<string, string>).id ?? '') : ''

  // Data queries — enabled only when on the matching route
  const batchQuery = useBatch(batchId, { enabled: isBatchDetail && Boolean(batchId) })
  const soQuery = useSo(soId, { enabled: (isSoEdit || isSoDetail) && Boolean(soId) })
  const productQuery = useProduct(productId, { enabled: isProductDetail && Boolean(productId) })

  const batchesByProductQuery = useBatchesByProduct(productId || 'x', {
    limit: 1,
    enabled: isProductDetail && Boolean(productId),
  })

  if (isBatchDetail && batchId) {
    return {
      kind: 'batch',
      batchId,
      batch: batchQuery.data,
    }
  }

  if (isSoEdit && soId) {
    return {
      kind: 'so-draft',
      soId,
      so: soQuery.data,
    }
  }

  if (isSoDetail && soId) {
    return {
      kind: 'so-detail',
      soId,
      so: soQuery.data,
    }
  }

  if (isProductDetail && productId) {
    return {
      kind: 'product-detail',
      productId,
      product: productQuery.data,
      productHasBatches: (batchesByProductQuery.data?.items?.length ?? 0) > 0,
    }
  }

  return { kind: 'other' }
}
