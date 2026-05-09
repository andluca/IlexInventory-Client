/**
 * src/features/shell/cmdk-items/useCmdkContext.ts
 *
 * Route-aware hook returning context for the CmdkPalette Act group.
 * Reads useMatches() from TanStack Router to determine the current route shape,
 * then fetches the relevant data via existing query hooks (piggybacks on cached results).
 *
 * Per ILE-9 Step 6.
 */

import { useMatches } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useBatchesByProduct } from '@/data/inventory/queries'
import { apiClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import { inventoryKeys } from '@/data/inventory/keys'
import { salesKeys } from '@/data/sales/keys'
import { catalogKeys } from '@/data/catalog/keys'
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
  const batchQuery = useQuery<BatchResponse, ApiError>({
    queryKey: inventoryKeys.detail(batchId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/batches/{batch_id}', {
        params: { path: { batch_id: batchId } },
      })
      return data as BatchResponse
    },
    enabled: isBatchDetail && Boolean(batchId),
    staleTime: 30_000,
  })

  const soQuery = useQuery<SalesOrderResponse, ApiError>({
    queryKey: salesKeys.detail(soId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/sales-orders/{so_id}', {
        params: { path: { so_id: soId } },
      })
      return data as SalesOrderResponse
    },
    enabled: (isSoEdit || isSoDetail) && Boolean(soId),
    staleTime: 30_000,
  })

  const productQuery = useQuery<ProductResponse, ApiError>({
    queryKey: catalogKeys.detail(productId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/products/{product_id}', {
        params: { path: { product_id: productId } },
      })
      return data as ProductResponse
    },
    enabled: isProductDetail && Boolean(productId),
    staleTime: 30_000,
  })

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
