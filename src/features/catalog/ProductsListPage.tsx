/**
 * src/features/catalog/ProductsListPage.tsx — A3 orchestrator (≤60 non-blank LOC)
 * Offset-paginated product list with search + archived filters.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Title, Group, Button, Alert, Stack, Text, Box } from '@mantine/core'
import { useProductsList } from '@/data/catalog/queries'
import { ApiError } from '@/api/errors'
import { EmptyState } from '@/components/EmptyState'
import { NewProductModal } from './NewProductModal'
import { ImportCsvModal } from './ImportCsvModal'
import { ProductsListFilters } from './ProductsListFilters'
import { ProductsListTable } from './ProductsListTable'
import { buildProductsListUrl } from './utils'

export function ProductsListPage() {
  const navigate = useNavigate()
  const raw = useSearch({ strict: false }) as { search?: string; archived?: boolean; page?: number }
  const search = raw.search ?? ''
  const archived = raw.archived
  const page = raw.page ?? 1
  const [localSearch, setLocalSearch] = useState(search)
  const [newProductOpened, setNewProductOpened] = useState(false)
  const [importCsvOpened, setImportCsvOpened] = useState(false)
  useEffect(() => setLocalSearch(search), [search])
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search)
        void navigate({ to: '/products', search: buildProductsListUrl({ search: localSearch, archived, page: 1 }), replace: true })
    }, 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch, search])
  const LIMIT = 50
  const { data, isError, error } = useProductsList({ page, limit: LIMIT, ...(search ? { search } : {}), ...(archived !== undefined ? { archived } : {}) })
  const total = data?.total ?? 0
  const items = data?.items ?? []
  const hasFilters = !!search || archived !== undefined
  const seg = archived === true ? 'archived' : archived === false ? 'active' : 'all'
  const go = (p: Partial<{ search: string | undefined; archived: boolean | undefined; page: number }>) =>
    void navigate({ to: '/products', search: buildProductsListUrl({ search, archived, page, ...p }), replace: true })
  const handleArchivedChange = (v: string) =>
    go({ archived: v === 'archived' ? true : v === 'active' ? false : undefined, page: 1 })
  return (
    <Box p="md">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={1}>Products</Title>
          <Group gap="sm"><Button variant="default" onClick={() => setImportCsvOpened(true)}>Import CSV</Button><Button onClick={() => setNewProductOpened(true)}>New product</Button></Group>
        </Group>
        <ProductsListFilters localSearch={localSearch} archivedSegValue={seg as 'active' | 'all' | 'archived'}
          onSearchChange={setLocalSearch} onArchivedChange={handleArchivedChange} />
        {isError && <Alert color="red">{ApiError.is(error) ? (error.detail ?? error.error) : 'An error occurred'}</Alert>}
        {!isError && total === 0 && !hasFilters && (
          <EmptyState title="No products yet" body="Create your first product or import from CSV."
            actions={[{ label: 'New product', onClick: () => setNewProductOpened(true), primary: true }, { label: 'Import CSV', onClick: () => setImportCsvOpened(true) }]}
            />
        )}
        {!isError && total === 0 && hasFilters && (
          <Stack align="center" py="xl" gap="sm">
            <Text c="dimmed">No products match these filters. Clear filters?</Text>
            <Button variant="subtle" onClick={() => go({ search: undefined, archived: undefined, page: 1 })}>Clear filters</Button>
          </Stack>
        )}
        {total > 0 && (
          <ProductsListTable items={items} total={total} pageParam={page}
            onRowClick={(id) => void navigate({ to: '/products/$id' as const, params: { id } })}
            onPagePrev={() => go({ page: Math.max(1, page - 1) })} onPageNext={() => go({ page: page + 1 })} />
        )}
      </Stack>
      <NewProductModal opened={newProductOpened} onClose={() => setNewProductOpened(false)} />
      <ImportCsvModal opened={importCsvOpened} onClose={() => setImportCsvOpened(false)} />
    </Box>
  )
}
