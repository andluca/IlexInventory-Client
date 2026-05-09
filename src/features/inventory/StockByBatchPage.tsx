/**
 * src/features/inventory/StockByBatchPage.tsx
 *
 * Stock by batch page (R1 alt view + R2 expiring-within view via SPEC §3.5).
 * Layout archetype A3 (List with filters): header, filter row, table, pagination.
 *
 * The `expiring_within=N` filter doubles as the R2 dedicated view linked from
 * the dashboard widget (ILE-8 wires the dashboard link).
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearch, Link } from '@tanstack/react-router'
import {
  Title,
  Group,
  Button,
  NumberInput,
  SegmentedControl,
  Table,
  Text,
  Badge,
  Alert,
  Stack,
  Box,
  Select,
} from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useBatchesList } from '@/data/inventory/queries'
import { useProductsList } from '@/data/catalog/queries'
import { ApiError } from '@/api/errors'
import { ManualBatchModal } from './ManualBatchModal'

type RecallFilter = 'all' | 'active' | 'recalled'

export function StockByBatchPage() {
  const navigate = useNavigate()
  const rawSearch = useSearch({ strict: false }) as {
    product_id?: string
    is_recalled?: boolean
    expiring_within?: number
    page?: number
  }

  const productId = rawSearch.product_id
  const isRecalledParam = rawSearch.is_recalled
  const expiringWithin = rawSearch.expiring_within
  const pageParam = rawSearch.page ?? 1

  // Local state for debounced expiring_within input
  const [localExpiring, setLocalExpiring] = useState<string>(
    expiringWithin !== undefined ? String(expiringWithin) : '',
  )
  useEffect(() => {
    setLocalExpiring(expiringWithin !== undefined ? String(expiringWithin) : '')
  }, [expiringWithin])

  // Debounce expiring_within → URL
  useEffect(() => {
    const parsedLocal = localExpiring !== '' ? Number(localExpiring) : undefined
    if (parsedLocal === expiringWithin) return

    const t = setTimeout(() => {
      void navigate({
        to: '/stock',
        search: {
          ...(productId !== undefined ? { product_id: productId } : {}),
          ...(isRecalledParam !== undefined ? { is_recalled: isRecalledParam } : {}),
          ...(parsedLocal !== undefined ? { expiring_within: parsedLocal } : {}),
          page: 1,
        },
      })
    }, 300)
    return () => clearTimeout(t)
  }, [localExpiring, expiringWithin, productId, isRecalledParam, navigate])

  const recallFilter: RecallFilter =
    isRecalledParam === true ? 'recalled' : isRecalledParam === false ? 'active' : 'all'

  const limit = 50
  const batchList = useBatchesList({
    ...(productId !== undefined ? { product_id: productId } : {}),
    ...(isRecalledParam !== undefined ? { is_recalled: isRecalledParam } : {}),
    ...(expiringWithin !== undefined ? { expiring_within: expiringWithin } : {}),
    page: pageParam,
    limit,
  })

  const products = useProductsList({ limit: 200 })

  const total = batchList.data?.total ?? 0
  const items = batchList.data?.items ?? []
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const hasFilters =
    productId !== undefined || isRecalledParam !== undefined || expiringWithin !== undefined

  const [manualBatchOpen, setManualBatchOpen] = useState(false)

  const productOptions = [
    { value: '', label: 'All products' },
    ...(products.data?.items.map((p) => ({ value: p.id, label: p.name })) ?? []),
  ]

  function handleRecallChange(v: string) {
    const newIsRecalled =
      v === 'recalled' ? true : v === 'active' ? false : undefined
    void navigate({
      to: '/stock',
      search: {
        ...(productId !== undefined ? { product_id: productId } : {}),
        ...(newIsRecalled !== undefined ? { is_recalled: newIsRecalled } : {}),
        ...(expiringWithin !== undefined ? { expiring_within: expiringWithin } : {}),
        page: 1,
      },
    })
  }

  function handleProductChange(v: string | null) {
    const newProductId = v && v !== '' ? v : undefined
    void navigate({
      to: '/stock',
      search: {
        ...(newProductId !== undefined ? { product_id: newProductId } : {}),
        ...(isRecalledParam !== undefined ? { is_recalled: isRecalledParam } : {}),
        ...(expiringWithin !== undefined ? { expiring_within: expiringWithin } : {}),
        page: 1,
      },
    })
  }

  return (
    <Stack p="xl" gap="md">
      <Group justify="space-between">
        <Title order={1}>Stock</Title>
        <Button leftSection={<IconPlus size={14} />} onClick={() => setManualBatchOpen(true)}>
          New batch
        </Button>
      </Group>

      {/* Filter row */}
      <Group gap="sm">
        <Select
          data={productOptions}
          value={productId ?? ''}
          onChange={handleProductChange}
          placeholder="All products"
          clearable
          w={240}
          aria-label="Product filter"
        />

        <SegmentedControl
          value={recallFilter}
          onChange={handleRecallChange}
          data={[
            { label: 'All', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Recalled', value: 'recalled' },
          ]}
        />

        <NumberInput
          value={localExpiring !== '' ? Number(localExpiring) : ''}
          onChange={(v) => setLocalExpiring(v !== '' ? String(v) : '')}
          placeholder="Expiring within (days)"
          min={1}
          w={200}
          aria-label="Expiring within days"
        />
      </Group>

      {batchList.error && (
        <Alert color="red">
          {ApiError.is(batchList.error)
            ? (batchList.error.detail ?? batchList.error.error)
            : 'Failed to load'}
        </Alert>
      )}

      {batchList.isLoading && <Text c="dimmed">Loading…</Text>}

      {batchList.isSuccess && items.length === 0 && !hasFilters && (
        <Box ta="center" py="xl">
          <Text c="dimmed">No batches yet. Receive a PO or create a batch manually.</Text>
          <Group justify="center" mt="md" gap="sm">
            <Button leftSection={<IconPlus size={14} />} onClick={() => setManualBatchOpen(true)}>
              New batch
            </Button>
            <Button variant="subtle" component={Link} to="/purchase-orders/new">
              New PO
            </Button>
          </Group>
        </Box>
      )}

      {batchList.isSuccess && items.length === 0 && hasFilters && (
        <Box ta="center" py="xl">
          <Text c="dimmed">No batches match these filters.</Text>
          <Button
            variant="subtle"
            mt="sm"
            onClick={() => void navigate({ to: '/stock', search: {} })}
          >
            Clear filters
          </Button>
        </Box>
      )}

      {batchList.isSuccess && items.length > 0 && (
        <>
          <Table highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Batch code</Table.Th>
                <Table.Th>Product</Table.Th>
                <Table.Th>Expiration</Table.Th>
                <Table.Th>On hand</Table.Th>
                <Table.Th>Unit cost</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((batch) => {
                const productName =
                  products.data?.items.find((p) => p.id === batch.product_id)?.name ??
                  batch.product_id.slice(0, 8)
                return (
                  <Table.Tr
                    key={batch.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      void navigate({ to: '/batches/$id', params: { id: batch.id } })
                    }
                  >
                    <Table.Td>
                      <Text ff="monospace" size="sm">
                        {batch.batch_code}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{productName}</Text>
                    </Table.Td>
                    <Table.Td>
                      {batch.expiration_date ? (
                        <Text size="sm">{batch.expiration_date}</Text>
                      ) : (
                        <Text size="sm" c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text ff="monospace" size="sm">
                        {batch.on_hand}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text ff="monospace" size="sm">
                        ${batch.unit_cost}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {batch.is_recalled && (
                        <Badge color="red" variant="light">
                          Recalled
                        </Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                )
              })}
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
                    to: '/stock',
                    search: {
                      ...(productId !== undefined ? { product_id: productId } : {}),
                      ...(isRecalledParam !== undefined ? { is_recalled: isRecalledParam } : {}),
                      ...(expiringWithin !== undefined ? { expiring_within: expiringWithin } : {}),
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
                    to: '/stock',
                    search: {
                      ...(productId !== undefined ? { product_id: productId } : {}),
                      ...(isRecalledParam !== undefined ? { is_recalled: isRecalledParam } : {}),
                      ...(expiringWithin !== undefined ? { expiring_within: expiringWithin } : {}),
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

      <ManualBatchModal
        opened={manualBatchOpen}
        onClose={() => setManualBatchOpen(false)}
      />
    </Stack>
  )
}
