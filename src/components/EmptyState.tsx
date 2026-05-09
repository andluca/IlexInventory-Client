/**
 * src/components/EmptyState.tsx
 *
 * Per docs/design/components.md §EmptyState.
 * Centered column, dashed border on surface-2, padding 2xl, min-height 400px.
 * Optional icon (60px circle), title, body, action buttons, agent-prompt CTA.
 */

import { Box, Button, Group, Stack, Text, Title } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { IconSparkles } from '@tabler/icons-react'
import { useAgentPanel } from '@/stores/agent-panel'

type ActionItem = {
  label: string
  href?: string
  onClick?: () => void
  primary?: boolean
}

type EmptyStateProps = {
  icon?: React.ComponentType
  title: string
  body?: string
  actions?: ActionItem[]
  agentPrompt?: string
}

export function EmptyState({ icon: Icon, title, body, actions, agentPrompt }: EmptyStateProps) {
  const setOpen = useAgentPanel((s) => s.setOpen)
  const setPrefilledQuery = useAgentPanel((s) => s.setPrefilledQuery)

  function handleAskIlex() {
    if (agentPrompt) {
      setPrefilledQuery(agentPrompt)
    }
    setOpen(true)
  }

  return (
    <Box
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        border: '1px dashed var(--mantine-color-dark-4)',
        borderRadius: 'var(--mantine-radius-md)',
        padding: 'var(--mantine-spacing-xl)',
      }}
    >
      <Stack align="center" gap="md" maw={480}>
        {Icon && (
          <Box
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'var(--mantine-color-dark-6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon />
          </Box>
        )}

        <Title order={2} ta="center">
          {title}
        </Title>

        {body && (
          <Text c="dimmed" ta="center" maw="50ch">
            {body}
          </Text>
        )}

        {(actions && actions.length > 0) || agentPrompt ? (
          <Group justify="center" gap="sm">
            {actions?.map((action) =>
              action.href ? (
                <Button
                  key={action.label}
                  component={Link}
                  to={action.href}
                  variant={action.primary ? 'filled' : 'light'}
                  {...(action.primary ? { color: 'primary' as never } : {})}
                >
                  {action.label}
                </Button>
              ) : (
                <Button
                  key={action.label}
                  onClick={action.onClick}
                  variant={action.primary ? 'filled' : 'light'}
                  {...(action.primary ? { color: 'primary' as never } : {})}
                >
                  {action.label}
                </Button>
              ),
            )}

            {agentPrompt && (
              <Button
                variant="subtle"
                leftSection={<IconSparkles size={14} />}
                onClick={handleAskIlex}
              >
                Ask Ilex
              </Button>
            )}
          </Group>
        ) : null}
      </Stack>
    </Box>
  )
}
