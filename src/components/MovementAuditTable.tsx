/**
 * src/components/MovementAuditTable.tsx
 *
 * Shared movement audit subview. Consumed by:
 *  - ProductDetailPage (productId prop)
 *  - BatchDetailPage (batchId prop) — ILE-6
 *
 * Pagination via useInfiniteQuery (cursor-paginated /movements).
 * Filters: date-range (from/to) + kind — local component state (v1).
 */

import { useState } from 'react'
import {
  Table,
  Button,
  Select,
  Group,
  Text,
  Alert,
  Stack,
  TextInput,
  Badge,
} from '@mantine/core'
import type { InfiniteData } from '@tanstack/react-query'
import { useMovements } from '@/data/inventory/queries'
import type { MovementListResponse } from '@/data/inventory/queries'
import { ApiError } from '@/api/errors'

export type MovementAuditTableProps = {
  productId?: string
  batchId?: string
}

const KIND_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'receipt', label: 'receipt' },
  { value: 'sale', label: 'sale' },
  { value: 'adjustment', label: 'adjustment' },
  { value: 'write_off', label: 'write_off' },
  { value: 'recall_block', label: 'recall_block' },
  { value: 'recall_unblock', label: 'recall_unblock' },
  { value: 'metadata_correction', label: 'metadata_correction' },
]

function kindColor(kind: string): string {
  switch (kind) {
    case 'receipt':
      return 'teal'
    case 'sale':
      return 'blue'
    case 'adjustment':
      return 'yellow'
    case 'write_off':
      return 'orange'
    case 'recall_block':
    case 'recall_unblock':
      return 'red'
    case 'metadata_correction':
      return 'gray'
    default:
      return 'gray'
  }
}

export function MovementAuditTable({ productId, batchId }: MovementAuditTableProps) {
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [kind, setKind] = useState<string>('')

  const movementsParams: {
    product_id?: string
    batch_id?: string
    from?: string
    to?: string
    kind?: string
  } = {}
  if (productId) movementsParams.product_id = productId
  if (batchId) movementsParams.batch_id = batchId
  if (from) movementsParams.from = from
  if (to) movementsParams.to = to
  if (kind) movementsParams.kind = kind

  const { data, isLoading, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useMovements(movementsParams)

  const typedData = data as InfiniteData<MovementListResponse> | undefined
  const allItems = typedData?.pages.flatMap((p) => p.items) ?? []

  function renderError() {
    if (!isError) return null
    const message = ApiError.is(error) ? (error.detail ?? error.error) : 'An error occurred'
    return (
      <Alert color="red" mb="sm">
        {message}
      </Alert>
    )
  }

  return (
    <Stack gap="sm">
      {/* Filter row */}
      <Group gap="sm">
        <TextInput
          size="xs"
          placeholder="From (YYYY-MM-DD)"
          value={from}
          onChange={(e) => setFrom(e.currentTarget.value)}
          aria-label="From date"
          w={150}
        />
        <TextInput
          size="xs"
          placeholder="To (YYYY-MM-DD)"
          value={to}
          onChange={(e) => setTo(e.currentTarget.value)}
          aria-label="To date"
          w={150}
        />
        <Select
          size="xs"
          data={KIND_OPTIONS}
          value={kind}
          onChange={(v) => setKind(v ?? '')}
          aria-label="Kind filter"
          w={180}
        />
      </Group>

      {renderError()}

      {isLoading && <Text size="sm" c="dimmed">Loading movements…</Text>}

      {!isLoading && !isError && allItems.length === 0 && (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          No movements in this range.
        </Text>
      )}

      {allItems.length > 0 && (
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Created at</Table.Th>
              <Table.Th>Kind</Table.Th>
              <Table.Th>Quantity</Table.Th>
              <Table.Th>Notes</Table.Th>
              <Table.Th>Reference</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {allItems.map((m: MovementListResponse['items'][number]) => (
              <Table.Tr key={m.id}>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {m.created_at.replace('T', ' ').replace('Z', '')}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={kindColor(m.kind)} variant="light" size="sm">
                    {m.kind}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {m.signed_quantity}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{m.notes ?? ''}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{m.reference_id ?? ''}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {hasNextPage && (
        <Button
          variant="subtle"
          size="sm"
          onClick={() => void fetchNextPage()}
          loading={isFetchingNextPage}
        >
          Load more
        </Button>
      )}
    </Stack>
  )
}
