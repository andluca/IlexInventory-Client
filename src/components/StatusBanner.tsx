/**
 * src/components/StatusBanner.tsx — tinted status strip (ILE-20).
 * Tones: terere = healthy/committed, amber = warning, clay = destructive/recalled.
 */

import { Box, Group, Text } from '@mantine/core'
import type { ReactNode } from 'react'

type Tone = 'terere' | 'amber' | 'clay'

const TONE_BG: Record<Tone, string> = {
  terere: 'bg-tinted-terere',
  amber: 'bg-tinted-amber',
  clay: 'bg-tinted-clay',
}

const TONE_BORDER: Record<Tone, string> = {
  terere: 'var(--mantine-other-tintedTereredBorder)',
  amber: 'var(--mantine-other-tintedAmberBorder)',
  clay: 'var(--mantine-other-tintedClayBorder)',
}

type StatusBannerProps = {
  tone: Tone
  icon?: ReactNode
  children: ReactNode
}

export function StatusBanner({ tone, icon, children }: StatusBannerProps) {
  return (
    <Box
      role="status"
      className={TONE_BG[tone]}
      style={{
        border: `1px solid ${TONE_BORDER[tone]}`,
        borderRadius: 'var(--mantine-radius-md)',
        padding: 'var(--mantine-spacing-sm) var(--mantine-spacing-md)',
      }}
    >
      <Group gap="sm">
        {icon}
        <Text size="sm">{children}</Text>
      </Group>
    </Box>
  )
}
