/**
 * CmdkTrigger — frosted-glass search pill in the unified Header (ILE-21).
 *
 * Renders an `<UnstyledButton>` shaped as a wide pill: leading search icon +
 * "Search or jump to…" muted label + trailing `⌘K` kbd. Opens the Mantine
 * Spotlight palette via its programmatic API. The mod+K keyboard shortcut is
 * handled by <Spotlight> itself via SpotlightRoot.
 */

import { UnstyledButton, Group, Kbd, Text } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { spotlight } from '@mantine/spotlight'

export function CmdkTrigger() {
  return (
    <UnstyledButton
      onClick={() => spotlight.open()}
      aria-label="Open command palette (⌘K)"
      className="bg-surface-elevated backdrop-blur-elevated"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--mantine-spacing-sm)',
        width: 320,
        height: 34,
        padding: '0 8px 0 12px',
        border: '1px solid var(--mantine-color-dark-4)',
        borderRadius: 999,
        transition:
          'border-color var(--motion-duration-fast) var(--motion-ease-out), background-color var(--motion-duration-fast) var(--motion-ease-out)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgb(0 193 106 / 0.35)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--mantine-color-dark-4)'
      }}
    >
      <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
        <IconSearch size={14} color="var(--mantine-color-dark-2)" />
        <Text size="sm" c="dimmed" style={{ userSelect: 'none' }}>
          Search or jump to…
        </Text>
      </Group>
      <Kbd size="xs" style={{ flexShrink: 0 }}>⌘K</Kbd>
    </UnstyledButton>
  )
}
