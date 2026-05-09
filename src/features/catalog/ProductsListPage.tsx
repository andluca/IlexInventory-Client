/**
 * src/features/catalog/ProductsListPage.tsx
 *
 * Products list page (R1 flow — SPEC §3.3). Layout archetype A3.
 * URL is the source of truth for search/archived/page filter state.
 * Uses Route.useSearch() from the parent route file for typed search params.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Title,
  Group,
  Button,
  TextInput,
  SegmentedControl,
  Table,
  Text,
  Badge,
  Alert,
  Stack,
  Box,
} from '@mantine/core'
import { useProductsList } from '@/data/catalog/queries'
import { ApiError } from '@/api/errors'
import { EmptyState } from '@/components/EmptyState'
import { NewProductModal } from './NewProductModal'
import { ImportCsvModal } from './ImportCsvModal'

// Search params are injected by the route — this page reads them via props
// (the route component passes Route.useSearch() results to this component).
// For simplicity the page reads search params via useSearch(strict: false).
import { useSearch } from '@tanstack/react-router'

export function ProductsListPage() {
  const navigate = useNavigate()
  const rawSearch = useSearch({ strict: false }) as {
    search?: string
    archived?: boolean
    page?: number
  }

  const searchParam = rawSearch.search ?? ''
  const archivedParam = rawSearch.archived
  const pageParam = rawSearch.page ?? 1

  // Local debounced search state
  const [localSearch, setLocalSearch] = useState(searchParam)

  useEffect(() => {
    setLocalSearch(searchParam)
  }, [searchParam])

  // The search type for /products route (from validateSearch)
  type ProductsSearch = {
    search: string | undefined
    archived: boolean | undefined
    page: number
  }

  // Helper: navigate to /products with updated search params
  function navigateToProducts(
    updater: (prev: ProductsSearch) => ProductsSearch,
  ) {
    const prev: ProductsSearch = {
      page: pageParam,
      search: searchParam || undefined,
      archived: archivedParam,
    }
    const next = updater(prev)
    void navigate({
      to: '/products',
      search: next,
      replace: true,
    })
  }

  // Debounce: 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchParam) {
        navigateToProducts((prev) => ({
          ...prev,
          search: localSearch || undefined,
          page: 1,
        }))
      }
    }, 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch, searchParam])

  const LIMIT = 50
  const listParams: {
    search?: string
    archived?: boolean
    page: number
    limit: number
  } = { page: pageParam, limit: LIMIT }
  if (searchParam) listParams.search = searchParam
  if (archivedParam !== undefined) listParams.archived = archivedParam

  const { data, isError, error } = useProductsList(listParams)

  const [newProductOpened, setNewProductOpened] = useState(false)
  const [importCsvOpened, setImportCsvOpened] = useState(false)

  const total = data?.total ?? 0
  const offset = (pageParam - 1) * LIMIT
  const items = data?.items ?? []
  const hasFilters = !!searchParam || archivedParam !== undefined

  // Archived segment value
  const archivedSegValue =
    archivedParam === true ? 'archived' : archivedParam === false ? 'active' : 'all'

  function handleArchivedChange(v: string) {
    navigateToProducts((prev) => {
      const next: ProductsSearch = { ...prev, page: 1 }
      if (v === 'archived') {
        next.archived = true
      } else if (v === 'active') {
        next.archived = false
      } else {
        next.archived = undefined
      }
      return next
    })
  }

  function handlePageNext() {
    navigateToProducts((prev) => ({ ...prev, page: prev.page + 1 }))
  }

  function handlePagePrev() {
    if (pageParam <= 1) return
    navigateToProducts((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
  }

  function handleClearFilters() {
    navigateToProducts(() => ({ page: 1, search: undefined, archived: undefined }))
  }

  return (
    <Box p="md">
      <Stack gap="md">
        {/* Page header */}
        <Group justify="space-between" align="center">
          <Title order={1}>Products</Title>
          <Group gap="sm">
            <Button variant="default" onClick={() => setImportCsvOpened(true)}>
              Import CSV
            </Button>
            <Button onClick={() => setNewProductOpened(true)}>New product</Button>
          </Group>
        </Group>

        {/* Search + archived filter row */}
        <Group gap="sm" align="center">
          <TextInput
            placeholder="Search by name or SKU…"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.currentTarget.value)}
            w={280}
          />
          <SegmentedControl
            value={archivedSegValue}
            onChange={handleArchivedChange}
            data={[
              { value: 'active', label: 'Active' },
              { value: 'all', label: 'All' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </Group>

        {/* Error state */}
        {isError && (
          <Alert color="red">
            {ApiError.is(error) ? (error.detail ?? error.error) : 'An error occurred'}
          </Alert>
        )}

        {/* Empty states */}
        {!isError && total === 0 && !hasFilters && (
          <EmptyState
            title="No products yet"
            body="Create your first product or import from CSV."
            actions={[
              { label: 'New product', onClick: () => setNewProductOpened(true), primary: true },
              { label: 'Import CSV', onClick: () => setImportCsvOpened(true) },
            ]}
            agentPrompt="Want me to import from CSV?"
          />
        )}

        {!isError && total === 0 && hasFilters && (
          <Stack align="center" py="xl" gap="sm">
            <Text c="dimmed">No products match these filters. Clear filters?</Text>
            <Button variant="subtle" onClick={handleClearFilters}>
              Clear filters
            </Button>
          </Stack>
        )}

        {/* Table */}
        {total > 0 && (
          <>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>SKU</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Base unit</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((product) => (
                  <Table.Tr
                    key={product.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      void navigate({
                        to: '/products/$id' as const,
                        params: { id: product.id },
                      })
                    }
                  >
                    <Table.Td>
                      <Text size="sm" ff="monospace">
                        {product.sku}
                      </Text>
                    </Table.Td>
                    <Table.Td>{product.name}</Table.Td>
                    <Table.Td>{product.base_unit}</Table.Td>
                    <Table.Td>{product.description}</Table.Td>
                    <Table.Td>
                      {product.archived_at && (
                        <Badge color="gray" size="sm">
                          Archived
                        </Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {/* Pagination footer */}
            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
              </Text>
              <Group gap="xs">
                <Button
                  variant="default"
                  size="xs"
                  onClick={handlePagePrev}
                  disabled={pageParam <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="default"
                  size="xs"
                  onClick={handlePageNext}
                  disabled={offset + LIMIT >= total}
                >
                  Next
                </Button>
              </Group>
            </Group>
          </>
        )}
      </Stack>

      <NewProductModal
        opened={newProductOpened}
        onClose={() => setNewProductOpened(false)}
      />

      <ImportCsvModal
        opened={importCsvOpened}
        onClose={() => setImportCsvOpened(false)}
      />
    </Box>
  )
}
