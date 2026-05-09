/**
 * src/features/dashboard/ExpiringSoonWidget.tsx
 *
 * Realizes R2 per SPEC §3.2.
 *
 * - Mantine Card with title "Expiring soon" + "Within N days" caption
 * - Table of up to 10 batch rows sorted by expiration ASC (server-side)
 * - "View all →" footer link → /stock?expiring_within={N}
 * - Row click → /batches/{id}
 * - Inline expiry styling: amber for ≤14d, red for expired (past today)
 * - Loading, empty, and error states
 *
 * Props:
 *   within: number  — number of days to look ahead (default 30)
 *   today?: string  — ISO date override for tests (YYYY-MM-DD). Defaults to new Date().toISOString().slice(0,10)
 */

import { Alert, Anchor, Badge, Card, Group, Skeleton, Stack, Table, Text, Title } from '@mantine/core'
import { useNavigate } from '@tanstack/react-router'
import { useBatchesList } from '@/data/inventory/queries'
import { ApiError } from '@/api/errors'

export interface ExpiringSoonWidgetProps {
  within: number
  /** ISO date string override for today (for deterministic tests). Defaults to system date. */
  today?: string
}

function getToday(todayOverride?: string): string {
  return todayOverride ?? new Date().toISOString().slice(0, 10)
}

function getDaysUntilExpiry(expirationDate: string, today: string): number {
  const exp = Date.parse(expirationDate)
  const now = Date.parse(today)
  return Math.floor((exp - now) / 86_400_000)
}

export function ExpiringSoonWidget({ within, today }: ExpiringSoonWidgetProps) {
  const navigate = useNavigate()
  const todayStr = getToday(today)

  const { data, isLoading, error } = useBatchesList({ expiring_within: within, limit: 10 })

  const viewAllHref = `/stock?expiring_within=${within}`

  return (
    <Card withBorder p="lg" h="100%">
      <Stack gap="md" h="100%">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Title order={3}>Expiring soon</Title>
            <Text size="xs" c="dimmed">
              Within {within} days
            </Text>
          </Stack>
          <Anchor
            component="a"
            href={viewAllHref}
            size="sm"
          >
            View all →
          </Anchor>
        </Group>

        {isLoading ? (
          <Stack gap="xs">
            <Skeleton height={28} />
            <Skeleton height={28} />
            <Skeleton height={28} />
          </Stack>
        ) : error ? (
          <Alert color="red" role="alert">
            {ApiError.is(error) ? (error.detail ?? error.error) : 'Failed to load expiring batches'}
          </Alert>
        ) : !data || data.items.length === 0 ? (
          <Text size="sm" c="dimmed">
            No batches expiring in the next {within} days.
          </Text>
        ) : (
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Batch code</Table.Th>
                <Table.Th>Expires</Table.Th>
                <Table.Th ta="right">On hand</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.items.map((batch) => {
                const daysUntil =
                  batch.expiration_date != null
                    ? getDaysUntilExpiry(batch.expiration_date, todayStr)
                    : null

                const isExpired = daysUntil !== null && daysUntil <= 0
                const isWarningSoon = daysUntil !== null && daysUntil > 0 && daysUntil <= 14

                return (
                  <Table.Tr
                    key={batch.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      void navigate({ to: '/batches/$id', params: { id: batch.id } })
                    }}
                  >
                    <Table.Td>
                      <Text
                        size="sm"
                        c={isExpired ? 'red' : isWarningSoon ? 'yellow' : 'dimmed'}
                        fw={isExpired ? 700 : 400}
                      >
                        {batch.batch_code}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {batch.expiration_date ? (
                        <Group gap={4} align="center">
                          <Text
                            size="sm"
                            c={isExpired ? 'red' : isWarningSoon ? 'yellow' : 'dimmed'}
                          >
                            {batch.expiration_date}
                          </Text>
                          {isExpired && (
                            <Badge color="red" size="xs" variant="light">
                              Expired
                            </Badge>
                          )}
                          {isWarningSoon && (
                            <Badge color="yellow" size="xs" variant="light">
                              Soon
                            </Badge>
                          )}
                        </Group>
                      ) : (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm">{batch.on_hand}</Text>
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Card>
  )
}
