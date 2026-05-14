/**
 * src/features/inventory/StockByBatchPage.tsx — A3 orchestrator (≤60 non-blank LOC)
 * Offset-paginated stock-by-batch list with product / recall / expiring-within filters.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Button, Stack, Box, Text } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useBatchesList } from '@/data/inventory/queries'
import { useProductsList } from '@/data/catalog/queries'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState } from '@/components/ErrorState'
import { ManualBatchModal } from './ManualBatchModal'
import { StockListFilters } from './StockListFilters'
import { StockListTable } from './StockListTable'
import { buildStockListUrl } from './utils'
import type { BaseUnit } from '@/utils/qty'

export function StockByBatchPage() {
  const navigate = useNavigate()
  const { product_id: productId, is_recalled: isRecalled, expiring_within: expiring, page: rawPage } =
    useSearch({ strict: false }) as { product_id?: string; is_recalled?: boolean; expiring_within?: number; page?: number }
  const page = rawPage ?? 1
  const [localExpiring, setLocalExpiring] = useState(expiring !== undefined ? String(expiring) : '')
  const [manualBatchOpen, setManualBatchOpen] = useState(false)
  useEffect(() => setLocalExpiring(expiring !== undefined ? String(expiring) : ''), [expiring])
  useEffect(() => {
    const parsed = localExpiring !== '' ? Number(localExpiring) : undefined
    if (parsed === expiring) return
    const t = setTimeout(() => void navigate({ to: '/stock', search: buildStockListUrl({ product_id: productId, is_recalled: isRecalled, expiring_within: parsed, page: 1 }) }), 300)
    return () => clearTimeout(t)
  }, [localExpiring, expiring, productId, isRecalled, navigate])
  const recallFilter = isRecalled === true ? 'recalled' : isRecalled === false ? 'active' : 'all'
  const limit = 50
  const batchList = useBatchesList({ page, limit, ...(productId !== undefined ? { product_id: productId } : {}), ...(isRecalled !== undefined ? { is_recalled: isRecalled } : {}), ...(expiring !== undefined ? { expiring_within: expiring } : {}) })
  const products = useProductsList({ limit: 200 })
  const total = batchList.data?.total ?? 0
  const items = batchList.data?.items ?? []
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const hasFilters = productId !== undefined || isRecalled !== undefined || expiring !== undefined
  const productOptions = [{ value: '', label: 'All products' }, ...(products.data?.items.map((p) => ({ value: p.id, label: p.name })) ?? [])]
  const productNameById = new Map(products.data?.items.map((p) => [p.id, p.name]) ?? [])
  // BE schema types base_unit as plain string but only emits 'g'|'ml'|'unit' (SPEC §2.4); narrow at the boundary.
  const baseUnitByProductId = new Map<string, BaseUnit>(products.data?.items.map((p) => [p.id, p.base_unit as BaseUnit]) ?? [])
  const go = (p: Parameters<typeof buildStockListUrl>[0]) => void navigate({ to: '/stock', search: buildStockListUrl(p) })
  return (
    <Stack p="xl" gap="md">
      <PageHeader
        title="Stock"
        actions={
          <Button leftSection={<IconPlus size={14} />} onClick={() => setManualBatchOpen(true)}>New batch</Button>
        }
      />
      <StockListFilters productId={productId} recallFilter={recallFilter as 'all' | 'active' | 'recalled'} localExpiring={localExpiring}
        productOptions={productOptions} onProductChange={(v) => go({ product_id: v && v !== '' ? v : undefined, is_recalled: isRecalled, expiring_within: expiring, page: 1 })}
        onRecallChange={(v) => go({ product_id: productId, is_recalled: v === 'recalled' ? true : v === 'active' ? false : undefined, expiring_within: expiring, page: 1 })}
        onExpiringChange={setLocalExpiring} />
      {batchList.error && <ErrorState error={batchList.error} />}
      {batchList.isLoading && <LoadingSkeleton rows={5} />}
      {batchList.isSuccess && items.length === 0 && !hasFilters && (
        <EmptyState title="No batches yet" body="Receive a PO or create a batch manually to see stock here."
          actions={[{ label: 'New batch', onClick: () => setManualBatchOpen(true), primary: true }, { label: 'New PO', href: '/purchase-orders/new' }]} />
      )}
      {batchList.isSuccess && items.length === 0 && hasFilters && (
        <Box ta="center" py="xl">
          <Text c="dimmed">No batches match these filters.</Text>
          <Button variant="subtle" mt="sm" onClick={() => void navigate({ to: '/stock', search: {} })}>Clear filters</Button>
        </Box>
      )}
      {batchList.isSuccess && items.length > 0 && (
        <StockListTable items={items} productNameById={productNameById} baseUnitByProductId={baseUnitByProductId} total={total} pageParam={page} limit={limit} totalPages={totalPages}
          onRowClick={(id) => void navigate({ to: '/batches/$id', params: { id } })}
          onPagePrev={() => go({ product_id: productId, is_recalled: isRecalled, expiring_within: expiring, page: page - 1 })}
          onPageNext={() => go({ product_id: productId, is_recalled: isRecalled, expiring_within: expiring, page: page + 1 })} />
      )}
      <ManualBatchModal opened={manualBatchOpen} onClose={() => setManualBatchOpen(false)} />
    </Stack>
  )
}
