/**
 * src/features/sales/FefoPreview.tsx
 *
 * Differentiator visualization — renders the proposed FEFO allocation
 * from POST /sales-orders/:id/preview.
 * Pure presentational: parent owns preview/loading/shortfall state.
 */

import { Alert, Badge, Box, Button, Card, Group, Skeleton, Stack, Table, Text, Title } from '@mantine/core'
import { IconRefresh } from '@tabler/icons-react'
import { formatMoney } from '@/utils/money'
import { formatQty } from '@/utils/qty'
import { ShortfallBanner } from './ShortfallBanner'
import { ApiError } from '@/api/errors'
import type { SalesOrderPreviewResponse } from '@/data/sales/queries'

type ProposedAllocation = SalesOrderPreviewResponse['allocations'][number]

export type { SalesOrderPreviewResponse }

type ShortfallData = {
  product_id: string
  required: string
  available: string
}

export type FefoPreviewProps = {
  preview: SalesOrderPreviewResponse | null
  loading?: boolean
  error?: ApiError | null
  shortfall?: ShortfallData | null
  onRefresh: () => void
  onCommit: () => void
  commitDisabled?: boolean
  onDismissShortfall?: () => void
}

function isExpiringSoon(expirationDate: string | null): boolean {
  if (!expirationDate) return false
  const now = new Date()
  const exp = new Date(expirationDate)
  const diffMs = exp.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays < 14
}

export function FefoPreview({
  preview,
  loading = false,
  error,
  shortfall,
  onRefresh,
  onCommit,
  commitDisabled = false,
  onDismissShortfall,
}: FefoPreviewProps) {
  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>FEFO Preview</Title>
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconRefresh size={14} />}
          onClick={onRefresh}
          loading={loading}
        >
          ↻ Refresh preview
        </Button>
      </Group>

      {/* Shortfall banner inline */}
      {shortfall && (
        <ShortfallBanner
          productName={shortfall.product_id}
          required={shortfall.required}
          available={shortfall.available}
          baseUnit="unit"
          onDismiss={onDismissShortfall ?? (() => undefined)}
        />
      )}

      {/* Generic error */}
      {error && (
        <Alert color="red">
          {ApiError.is(error) ? (error.detail ?? error.error) : 'Preview failed'}
        </Alert>
      )}

      {/* Empty / no lines yet */}
      {!preview && !loading && !error && (
        <Box ta="center" py="xl">
          <Text c="dimmed">Add lines to see the FEFO allocation.</Text>
        </Box>
      )}

      {/* Loading: skeleton cards */}
      {loading && !preview && (
        <Stack gap="sm">
          <Skeleton height={80} />
          <Skeleton height={80} />
        </Stack>
      )}

      {/* Populated — group flat allocations by line_id client-side. */}
      {preview && (
        <Stack gap="sm">
          {Array.from(
            preview.allocations.reduce((acc, alloc) => {
              const arr = acc.get(alloc.line_id) ?? []
              arr.push(alloc)
              acc.set(alloc.line_id, arr)
              return acc
            }, new Map<string, ProposedAllocation[]>()),
          ).map(([lineId, allocations]) => {
            const sortedAllocations = [...allocations].sort((a, b) => {
              // FEFO: expiration_date ASC NULLS LAST
              if (!a.expiration_date && !b.expiration_date) return 0
              if (!a.expiration_date) return 1
              if (!b.expiration_date) return -1
              return a.expiration_date.localeCompare(b.expiration_date)
            })

            return (
              <Card key={lineId} withBorder p="md">
                <Stack gap="xs">
                  <Text size="sm" fw={500} ff="monospace">
                    Line: {lineId.slice(0, 8)}
                  </Text>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Batch</Table.Th>
                        <Table.Th>Expiration</Table.Th>
                        <Table.Th>Qty</Table.Th>
                        <Table.Th>Unit cost</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {sortedAllocations.map((alloc, i) => (
                        <Table.Tr key={i}>
                          <Table.Td>
                            <Text ff="monospace" size="xs">
                              {alloc.batch_code}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Text size="xs">{alloc.expiration_date ?? '—'}</Text>
                              {isExpiringSoon(alloc.expiration_date) && (
                                <Badge color="orange" size="xs">
                                  Expiring soon
                                </Badge>
                              )}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text ff="monospace" size="xs">
                              {formatQty(alloc.quantity, 'unit')}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text ff="monospace" size="xs">
                              {formatMoney(alloc.unit_cost)}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Stack>
              </Card>
            )
          })}

          <Button
            fullWidth
            color="teal"
            onClick={onCommit}
            disabled={commitDisabled}
          >
            Commit
          </Button>
        </Stack>
      )}
    </Stack>
  )
}
