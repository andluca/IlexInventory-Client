/**
 * src/features/sales/SosListPage.tsx — A3 orchestrator (≤60 non-blank LOC)
 * Cursor-paginated SO list with status + debounced-search filters.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearch, Link } from '@tanstack/react-router'
import { Group, Button, Stack, Box, Text } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useSosList } from '@/data/sales/queries'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState } from '@/components/ErrorState'
import { SosListFilters } from './SosListFilters'
import { SosListTable } from './SosListTable'
import { buildSosListUrl } from './utils'

type SF = 'all' | 'draft' | 'committed' | 'voided'

export function SosListPage() {
  const navigate = useNavigate()
  const raw = useSearch({ strict: false }) as { status?: Exclude<SF, 'all'>; search?: string }
  const status: SF = raw.status ?? 'all'
  const search = raw.search ?? ''
  const [localSearch, setLocalSearch] = useState(search)
  useEffect(() => setLocalSearch(search), [search])
  useEffect(() => {
    const t = setTimeout(() => {
      if (localSearch !== search)
        void navigate({ to: '/sales-orders', search: buildSosListUrl({ status, search: localSearch }) })
    }, 250)
    return () => clearTimeout(t)
  }, [localSearch, search, status, navigate])
  const list = useSosList({
    ...(status !== 'all' ? { status } : {}),
    ...(search ? { search } : {}),
  })
  const items = list.data?.pages.flatMap((p) => p.items) ?? []
  const hasFilters = status !== 'all' || search.length > 0
  const nav = (s: SF) => void navigate({ to: '/sales-orders', search: buildSosListUrl({ status: s, search }) })
  return (
    <Stack p="xl" gap="md">
      <PageHeader
        title="Sales Orders"
        actions={
          <Button component={Link} to="/sales-orders/new" leftSection={<IconPlus size={14} />}>New SO</Button>
        }
      />
      <SosListFilters localSearch={localSearch} status={status} onSearchChange={setLocalSearch} onStatusChange={nav} />
      {list.error && <ErrorState error={list.error} />}
      {list.isLoading && <LoadingSkeleton rows={5} />}
      {list.isSuccess && items.length === 0 && !hasFilters && (
        <EmptyState title="No sales orders yet" body="Draft your first SO to see FEFO in action."
          actions={[{ label: 'New SO', href: '/sales-orders/new', primary: true }]} />
      )}
      {list.isSuccess && items.length === 0 && hasFilters && (
        <Box ta="center" py="xl">
          <Text c="dimmed">No sales orders match these filters.</Text>
          <Button mt="md" variant="subtle" onClick={() => void navigate({ to: '/sales-orders', search: {} })}>Clear filters</Button>
        </Box>
      )}
      {list.isSuccess && items.length > 0 && (
        <>
          <SosListTable items={items} onRowClick={(id, s) =>
            void navigate(s === 'draft'
              ? { to: '/sales-orders/$id/edit', params: { id } }
              : { to: '/sales-orders/$id', params: { id } })} />
          {list.hasNextPage && <Group justify="center">
            <Button variant="subtle" onClick={() => void list.fetchNextPage()} loading={list.isFetchingNextPage}>Load more</Button>
          </Group>}
        </>
      )}
    </Stack>
  )
}
