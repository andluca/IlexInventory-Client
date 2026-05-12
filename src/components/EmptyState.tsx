/**
 * src/components/EmptyState.tsx
 *
 * Per docs/design/components.md §EmptyState.
 * Centered column, dashed border on surface-2, padding 2xl, min-height 400px.
 * Optional icon (60px circle), title, body, action buttons.
 */

import { Box, Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { Link } from '@tanstack/react-router'

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
}

export function EmptyState({ icon: Icon, title, body, actions }: EmptyStateProps) {
  return (
    <Card
      withBorder
      padding="xl"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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

        {actions && actions.length > 0 ? (
          <Group justify="center" gap="sm">
            {actions.map((action) =>
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
          </Group>
        ) : null}
      </Stack>
    </Card>
  )
}
