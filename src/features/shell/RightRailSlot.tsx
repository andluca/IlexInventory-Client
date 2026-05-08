import { useState } from 'react'
import { Stack, Text, TextInput, ActionIcon, Group, Box } from '@mantine/core'
import { IconMessageCircle, IconChevronRight } from '@tabler/icons-react'

/**
 * RightRailSlot — collapsible right-rail container, 320px wide.
 *
 * v1 ships an empty placeholder body. ILE-13 (Phase 3) fills it with <AgentPanel>.
 * Local useState for collapsed flag (no cross-component coupling in v1; promote
 * to a store if ILE-13 needs it from outside).
 *
 * Per docs/design/components.md#rightrailslot.
 */
export function RightRailSlot() {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <Box
        component="aside"
        w={36}
        h="100vh"
        style={{
          borderLeft: '1px solid var(--mantine-color-dark-4)',
          position: 'sticky',
          top: 0,
          flexShrink: 0,
        }}
      >
        <ActionIcon
          variant="subtle"
          onClick={() => setCollapsed(false)}
          mt="sm"
          ml="xs"
          aria-label="Expand Ask Ilex panel"
        >
          <IconChevronRight size={16} />
        </ActionIcon>
      </Box>
    )
  }

  return (
    <Box
      component="aside"
      w={320}
      h="100vh"
      style={{
        borderLeft: '1px solid var(--mantine-color-dark-4)',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
        <Group gap="xs">
          <IconMessageCircle size={16} color="var(--mantine-color-primary-6)" />
          <Text size="sm" fw={600}>Ask Ilex</Text>
        </Group>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse Ask Ilex panel"
        >
          <IconChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
        </ActionIcon>
      </Group>

      <Stack flex={1} align="center" justify="center" p="md">
        <IconMessageCircle size={32} color="var(--mantine-color-dark-3)" />
        <Text size="sm" c="dimmed" ta="center">
          What can I help with?
        </Text>
      </Stack>

      <Box p="sm" style={{ borderTop: '1px solid var(--mantine-color-dark-4)' }}>
        <TextInput
          placeholder="Ask anything about your inventory…"
          disabled
          aria-label="Ask Ilex (coming soon)"
        />
      </Box>
    </Box>
  )
}
