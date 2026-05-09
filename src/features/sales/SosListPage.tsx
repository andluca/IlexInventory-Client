/**
 * src/features/sales/SosListPage.tsx
 *
 * Sales orders list page (R4 per SPEC §3.6). Archetype A3 (List with filters).
 * Cursor-paginated via useInfiniteQuery — the only A3 page in v1 with cursor pagination.
 * Filters: status (SegmentedControl), customer search (debounced 250ms), date range.
 * Empty state: "No sales orders yet" + New SO CTA when no filters are active.
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
import { useSosList } from '@/data/sales/queries'
import { ApiError } from '@/api/errors'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { EmptyState } from '@/components/EmptyState'

type StatusFilter = 'all' | 'draft' | 'committed' | 'voided'

function statusBadgeColor(status: string): string {
  if (status === 'voided') return 'red'
  if (status === 'committed') return 'green'
  return 'gray'
}

// BE quirk (BE-D6 / SPEC §3.6): a voided SO keeps `status='committed'` and
// signals the void via `voided_at`. Surface "voided" whenever voided_at is set.
function effectiveStatus(so: { status: string; voided_at: string | null }): string {
  if (so.voided_at) return 'voided'
  return so.status
}

export function SosListPage() {
  const navigate = useNavigate()
  const rawSearch = useSearch({ strict: false }) as {
    status?: 'draft' | 'committed' | 'voided'
    search?: string
  }

  const statusParam: StatusFilter = rawSearch.status ?? 'all'
  const searchParam = rawSearch.search ?? ''

  const [localSearch, setLocalSearch] = useState(searchParam)
  useEffect(() => setLocalSearch(searchParam), [searchParam])

  // Debounce search → URL
  useEffect(() => {
    const t = setTimeout(() => {
      if (localSearch === searchParam) return
      void navigate({
        to: '/sales-orders',
        search: {
          ...(statusParam !== 'all' ? { status: statusParam } : {}),
          ...(localSearch ? { search: localSearch } : {}),
        },
      })
    }, 250)
    return () => clearTimeout(t)
  }, [localSearch, searchParam, statusParam, navigate])

  const apiStatus = statusParam === 'all' ? undefined : statusParam
  const list = useSosList({
    ...(apiStatus !== undefined ? { status: apiStatus } : {}),
    ...(searchParam ? { search: searchParam } : {}),
  })

  const hasFilters = statusParam !== 'all' || searchParam.length > 0
  const allItems = list.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <Stack p="xl" gap="md">
      <Group justify="space-between">
        <Title order={1}>Sales Orders</Title>
        <Group>
          <TextInput
            placeholder="Search customer"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={14} />}
            w={240}
          />
          <Button
            component={Link}
            to="/sales-orders/new"
            leftSection={<IconPlus size={14} />}
          >
            New SO
          </Button>
        </Group>
      </Group>

      <SegmentedControl
        value={statusParam}
        onChange={(v) =>
          void navigate({
            to: '/sales-orders',
            search: {
              ...(v !== 'all' ? { status: v as 'draft' | 'committed' | 'voided' } : {}),
              ...(searchParam ? { search: searchParam } : {}),
            },
          })
        }
        data={[
          { label: 'All', value: 'all' },
          { label: 'Draft', value: 'draft' },
          { label: 'Committed', value: 'committed' },
          { label: 'Voided', value: 'voided' },
        ]}
      />

      {list.error && (
        <Alert color="red">
          {ApiError.is(list.error) ? (list.error.detail ?? list.error.error) : 'Failed to load'}
        </Alert>
      )}

      {list.isLoading && <LoadingSkeleton rows={5} />}

      {list.isSuccess && allItems.length === 0 && !hasFilters && (
        <EmptyState
          title="No sales orders yet"
          body="Draft your first SO to see FEFO in action."
          actions={[
            { label: 'New SO', href: '/sales-orders/new', primary: true },
          ]}
          agentPrompt="Create an SO for recent customer?"
        />
      )}

      {list.isSuccess && allItems.length === 0 && hasFilters && (
        <Box ta="center" py="xl">
          <Text c="dimmed">No sales orders match these filters.</Text>
          <Button
            mt="md"
            variant="subtle"
            onClick={() =>
              void navigate({ to: '/sales-orders', search: {} })
            }
          >
            Clear filters
          </Button>
        </Box>
      )}

      {list.isSuccess && allItems.length > 0 && (
        <>
          <Table highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Lines</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Committed at</Table.Th>
                <Table.Th>Voided at</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {allItems.map((so) => (
                <Table.Tr
                  key={so.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    if (so.status === 'draft') {
                      void navigate({ to: '/sales-orders/$id/edit', params: { id: so.id } })
                    } else {
                      void navigate({ to: '/sales-orders/$id', params: { id: so.id } })
                    }
                  }}
                >
                  <Table.Td>
                    <Text fw={500}>{so.customer_name}</Text>
                    {so.customer_contact && (
                      <Text size="xs" c="dimmed">
                        {so.customer_contact}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {(() => {
                      const display = effectiveStatus(so)
                      return (
                        <Badge color={statusBadgeColor(display)} variant="light">
                          {display}
                        </Badge>
                      )
                    })()}
                  </Table.Td>
                  <Table.Td>
                    <Text ff="monospace" size="sm">
                      {so.lines.length}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(so.created_at).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {so.committed_at ? new Date(so.committed_at).toLocaleDateString() : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {so.voided_at ? new Date(so.voided_at).toLocaleDateString() : '—'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {list.hasNextPage && (
            <Group justify="center">
              <Button
                variant="subtle"
                onClick={() => void list.fetchNextPage()}
                loading={list.isFetchingNextPage}
              >
                Load more
              </Button>
            </Group>
          )}
        </>
      )}
    </Stack>
  )
}
