/**
 * src/features/procurement/PosListPage.tsx
 *
 * POs list page (R5 flow — SPEC §3.4). Archetype A3 (List with filters).
 * Filters: status (draft/received/all — only the two BE-D6 states), supplier search, date range.
 * Pagination: offset (Previous/Next + page numbers).
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearch, Link } from '@tanstack/react-router'
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
import { IconPlus, IconSearch } from '@tabler/icons-react'
import { usePosList } from '@/data/procurement/queries'
import { ApiError } from '@/api/errors'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { EmptyState } from '@/components/EmptyState'

type StatusFilter = 'draft' | 'received' | 'all'

export function PosListPage() {
  const navigate = useNavigate()
  const rawSearch = useSearch({ strict: false }) as {
    status?: StatusFilter
    search?: string
    page?: number
  }
  const statusParam: StatusFilter = rawSearch.status ?? 'all'
  const searchParam = rawSearch.search ?? ''
  const pageParam = rawSearch.page ?? 1

  const [localSearch, setLocalSearch] = useState(searchParam)
  useEffect(() => setLocalSearch(searchParam), [searchParam])

  // Debounce search → URL
  useEffect(() => {
    const t = setTimeout(() => {
      if (localSearch === searchParam) return
      void navigate({
        to: '/purchase-orders',
        search: {
          status: statusParam,
          ...(localSearch ? { search: localSearch } : {}),
          page: 1,
        },
      })
    }, 250)
    return () => clearTimeout(t)
  }, [localSearch, searchParam, statusParam, navigate])

  const hasFilters = statusParam !== 'all' || Boolean(searchParam)
  const apiStatus = statusParam === 'all' ? undefined : statusParam
  const limit = 50
  const list = usePosList({
    ...(apiStatus !== undefined ? { status: apiStatus } : {}),
    ...(searchParam ? { search: searchParam } : {}),
    page: pageParam,
    limit,
  })

  const total = list.data?.total ?? 0
  const items = list.data?.items ?? []
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <Stack p="xl" gap="md">
      <Group justify="space-between">
        <Title order={1}>Purchase Orders</Title>
        <Group>
          <TextInput
            placeholder="Search supplier"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={14} />}
            w={240}
          />
          <Button
            component={Link}
            to="/purchase-orders/new"
            leftSection={<IconPlus size={14} />}
          >
            New PO
          </Button>
        </Group>
      </Group>

      <SegmentedControl
        value={statusParam}
        onChange={(v) =>
          void navigate({
            to: '/purchase-orders',
            search: {
              status: v as StatusFilter,
              ...(searchParam ? { search: searchParam } : {}),
              page: 1,
            },
          })
        }
        data={[
          { label: 'All', value: 'all' },
          { label: 'Draft', value: 'draft' },
          { label: 'Received', value: 'received' },
        ]}
      />

      {list.error && (
        <Alert color="red">
          {ApiError.is(list.error) ? (list.error.detail ?? list.error.error) : 'Failed to load'}
        </Alert>
      )}

      {list.isLoading && <LoadingSkeleton rows={5} />}

      {list.isSuccess && items.length === 0 && !hasFilters && (
        <EmptyState
          title="No purchase orders yet"
          body="Create your first PO to start receiving inventory."
          actions={[
            { label: 'New purchase order', href: '/purchase-orders/new', primary: true },
          ]}
          agentPrompt="Draft a PO for top supplier?"
        />
      )}

      {list.isSuccess && items.length === 0 && hasFilters && (
        <Box ta="center" py="xl">
          <Text c="dimmed">No purchase orders match these filters.</Text>
          <Button
            mt="md"
            variant="subtle"
            onClick={() => void navigate({ to: '/purchase-orders', search: {} })}
          >
            Clear filters
          </Button>
        </Box>
      )}

      {list.isSuccess && items.length > 0 && (
        <>
          <Table highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Supplier</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Lines</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Received</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((po) => (
                <Table.Tr
                  key={po.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    void navigate({ to: '/purchase-orders/$id', params: { id: po.id } })
                  }
                >
                  <Table.Td>
                    <Text fw={500}>{po.supplier_name}</Text>
                    {po.supplier_contact && (
                      <Text size="xs" c="dimmed">
                        {po.supplier_contact}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={po.status === 'received' ? 'green' : 'gray'} variant="light">
                      {po.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text ff="monospace" size="sm">
                      {po.lines.length}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(po.created_at).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {po.received_at ? new Date(po.received_at).toLocaleDateString() : '—'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Showing {(pageParam - 1) * limit + 1}–{Math.min(pageParam * limit, total)} of {total}
            </Text>
            <Group gap="xs">
              <Button
                variant="subtle"
                disabled={pageParam <= 1}
                onClick={() =>
                  void navigate({
                    to: '/purchase-orders',
                    search: {
                      status: statusParam,
                      ...(searchParam ? { search: searchParam } : {}),
                      page: pageParam - 1,
                    },
                  })
                }
              >
                Previous
              </Button>
              <Text size="sm">
                Page {pageParam} of {totalPages}
              </Text>
              <Button
                variant="subtle"
                disabled={pageParam >= totalPages}
                onClick={() =>
                  void navigate({
                    to: '/purchase-orders',
                    search: {
                      status: statusParam,
                      ...(searchParam ? { search: searchParam } : {}),
                      page: pageParam + 1,
                    },
                  })
                }
              >
                Next
              </Button>
            </Group>
          </Group>
        </>
      )}
    </Stack>
  )
}
