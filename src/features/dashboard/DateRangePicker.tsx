/**
 * src/features/dashboard/DateRangePicker.tsx
 *
 * Feature-local date range picker (local to dashboard; shared version lands later).
 *
 * Props:
 *   from: string  — ISO date string YYYY-MM-DD (source of truth from URL)
 *   to:   string  — ISO date string YYYY-MM-DD (source of truth from URL)
 *   onChange: (next: { from: string; to: string }) => void
 *   presets?: Array<{ label: string; days: number }>  — defaults provided
 *
 * Selecting a preset dispatches onChange immediately and closes the popover.
 * The component never converts to/from Date objects across the props boundary —
 * strings are used end-to-end (same discipline as money/qty strings).
 */

import { useState } from 'react'
import { Button, Group, Popover, Stack, Text } from '@mantine/core'

const DEFAULT_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
]

export interface DateRangePickerProps {
  from: string
  to: string
  onChange: (next: { from: string; to: string }) => void
  presets?: Array<{ label: string; days: number }> | undefined
}

/** Format an ISO date string as a short date (e.g. "Apr 9"). */
function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Compute how many days between from and to (inclusive). */
function computeDelta(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}

/** Build an ISO date string `days` before `to`. */
function shiftFrom(to: string, days: number): string {
  const d = new Date(Date.parse(to) - days * 86_400_000)
  return d.toISOString().slice(0, 10)
}

export function DateRangePicker({ from, to, onChange, presets = DEFAULT_PRESETS }: DateRangePickerProps) {
  const [opened, setOpened] = useState(false)

  const delta = computeDelta(from, to)
  const matchedPreset = presets.find((p) => p.days === delta)
  const triggerLabel = matchedPreset ? matchedPreset.label : `${fmtDate(from)} – ${fmtDate(to)}`

  function handlePresetClick(days: number) {
    const newFrom = shiftFrom(to, days)
    onChange({ from: newFrom, to })
    setOpened(false)
  }

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" withArrow>
      <Popover.Target>
        <Button variant="subtle" size="sm" onClick={() => setOpened((o) => !o)}>
          {triggerLabel}
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs" p="xs">
          <Text size="xs" c="dimmed" fw={500}>
            Quick ranges
          </Text>
          <Group gap="xs">
            {presets.map((p) => (
              <Button
                key={p.label}
                variant={delta === p.days ? 'filled' : 'light'}
                size="xs"
                onClick={() => handlePresetClick(p.days)}
              >
                {p.label}
              </Button>
            ))}
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}
