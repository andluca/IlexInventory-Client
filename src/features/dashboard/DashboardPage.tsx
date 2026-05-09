/**
 * src/features/dashboard/DashboardPage.tsx
 *
 * Dashboard page (/) — realizes R2 + R3 + F11 per SPEC §3.2 + §3.7.
 * Layout: QuickActions row → 2-column grid (ExpiringSoonWidget | FinancialSummary)
 *         → full-width MarginByProductTable.
 *
 * Date range lives in URL search params (from/to) — single source of truth.
 * DashboardPage reads/writes via useSearch + navigate (TanStack Router).
 *
 * Props:
 *   today?: string  — ISO date string override for tests; defaults to system date.
 */

import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Grid, Group, Stack } from '@mantine/core'
import { QuickActions } from './QuickActions'
import { ExpiringSoonWidget } from './ExpiringSoonWidget'
import { FinancialSummary } from './FinancialSummary'
import { MarginByProductTable } from './MarginByProductTable'
import { DateRangePicker } from './DateRangePicker'
import { ImportCsvModal } from '@/features/catalog/ImportCsvModal'

export interface DashboardPageProps {
  /** ISO date override for tests — makes default computations deterministic. */
  today?: string
}

function getTodayStr(override?: string): string {
  return override ?? new Date().toISOString().slice(0, 10)
}

function getDefaultFrom(to: string): string {
  const d = new Date(Date.parse(to) - 30 * 86_400_000)
  return d.toISOString().slice(0, 10)
}

export function DashboardPage({ today }: DashboardPageProps) {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as {
    from?: string
    to?: string
    expiring_within?: number
  }

  const todayStr = getTodayStr(today)
  const to = search.to ?? todayStr
  const from = search.from ?? getDefaultFrom(to)
  const expiringWithin = search.expiring_within ?? 30

  const [importOpen, setImportOpen] = useState(false)

  function handleDateRangeChange(next: { from: string; to: string }) {
    void navigate({
      to: '/',
      // Replace only from/to; preserve expiring_within (and anything else)
      search: {
        from: next.from,
        to: next.to,
        expiring_within: expiringWithin,
      },
    })
  }

  return (
    <Stack p="xl" gap="lg">
      {/* Quick actions row */}
      <QuickActions onImportClick={() => setImportOpen(true)} />

      {/* Date range picker — scopes both FinancialSummary and MarginByProductTable */}
      <Group>
        <DateRangePicker from={from} to={to} onChange={handleDateRangeChange} />
      </Group>

      {/* Two-column widget grid */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <ExpiringSoonWidget within={expiringWithin} today={todayStr} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <FinancialSummary from={from} to={to} />
        </Grid.Col>
      </Grid>

      {/* Full-width margin table */}
      <MarginByProductTable from={from} to={to} />

      {/* Import CSV modal — owned here; triggered by QuickActions */}
      <ImportCsvModal opened={importOpen} onClose={() => setImportOpen(false)} />
    </Stack>
  )
}
