/**
 * src/features/procurement/PosListPage.tsx — A3 orchestrator (≤60 non-blank LOC)
 * Offset-paginated PO list with status + debounced-search filters.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearch, Link } from '@tanstack/react-router'
import { Group, Button, Stack, Box, Text } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { usePosList } from '@/data/procurement/queries'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState } from '@/components/ErrorState'
import { PosListFilters } from './PosListFilters'
import { PosListTable } from './PosListTable'
import { buildPosListUrl } from './utils'

type SF = 'draft' | 'received' | 'all'

export function PosListPage() {
  const navigate = useNavigate()
  const raw = useSearch({ strict: false }) as { status?: SF; search?: string; page?: number }
  const status: SF = raw.status ?? 'all'
  const search = raw.search ?? ''
  const page = raw.page ?? 1
  const [localSearch, setLocalSearch] = useState(search)
  useEffect(() => setLocalSearch(search), [search])
  useEffect(() => {
    const t = setTimeout(() => {
      if (localSearch !== search)
        void navigate({ to: '/purchase-orders', search: buildPosListUrl({ status, search: localSearch, page: 1 }) })
    }, 250)
    return () => clearTimeout(t)
  }, [localSearch, search, status, navigate])
  const hasFilters = status !== 'all' || Boolean(search)
  const limit = 50
  const list = usePosList({
    ...(status !== 'all' ? { status } : {}),
    ...(search ? { search } : {}),
    page, limit,
  })
  const total = list.data?.total ?? 0
  const items = list.data?.items ?? []
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const navStatus = (s: SF) => void navigate({ to: '/purchase-orders', search: buildPosListUrl({ status: s, search, page: 1 }) })
  const navPage = (p: number) => void navigate({ to: '/purchase-orders', search: buildPosListUrl({ status, search, page: p }) })
  return (
    <Stack p="xl" gap="md">
      <PageHeader
        title="Purchase Orders"
        actions={
          <Button component={Link} to="/purchase-orders/new" leftSection={<IconPlus size={14} />}>New PO</Button>
        }
      />
      <PosListFilters localSearch={localSearch} status={status} onSearchChange={setLocalSearch} onStatusChange={navStatus} />
      {list.error && <ErrorState error={list.error} />}
      {list.isLoading && <LoadingSkeleton rows={5} />}
      {list.isSuccess && items.length === 0 && !hasFilters && (
        <EmptyState title="No purchase orders yet" body="Create your first PO to start receiving inventory."
          actions={[{ label: 'New purchase order', href: '/purchase-orders/new', primary: true }]} />
      )}
      {list.isSuccess && items.length === 0 && hasFilters && (
        <Box ta="center" py="xl">
          <Text c="dimmed">No purchase orders match these filters.</Text>
          <Button mt="md" variant="subtle" onClick={() => void navigate({ to: '/purchase-orders', search: {} })}>Clear filters</Button>
        </Box>
      )}
      {list.isSuccess && items.length > 0 && (
        <PosListTable items={items} total={total} pageParam={page} limit={limit} totalPages={totalPages}
          onRowClick={(id) => void navigate({ to: '/purchase-orders/$id', params: { id } })}
          onPagePrev={() => navPage(page - 1)} onPageNext={() => navPage(page + 1)} />
      )}
    </Stack>
  )
}
