import { useNavigate } from '@tanstack/react-router'
import { Card, Stack, Text, Button, Group, Code } from '@mantine/core'
import { IconLogout } from '@tabler/icons-react'
import { useAuthMe } from '@/data/auth/queries'
import { useLogoutMutation } from '@/data/auth/mutations'
import { PageHeader } from '@/components/PageHeader'

/**
 * SettingsPage — v1 surface intentionally thin (SPEC §2.7 / §3.8).
 *
 * Account info: email (mono) + Logout button. Agent OAuth status reserved for ILE-13.
 */
export function SettingsPage() {
  const { data: user } = useAuthMe()
  const logout = useLogoutMutation()
  const navigate = useNavigate()

  function handleLogout() {
    logout.mutate(undefined, {
      onSettled: () => {
        void navigate({ to: '/login', replace: true })
      },
    })
  }

  return (
    <Stack p="xl" maw={640}>
      <PageHeader title="Settings" />

      <Card withBorder p="lg">
        <Stack>
          <Title order={3}>Account</Title>
          {user ? (
            <Group>
              <Text c="dimmed" size="sm">
                Email
              </Text>
              <Code>{user.email}</Code>
            </Group>
          ) : (
            <Text c="dimmed" size="sm">
              Loading…
            </Text>
          )}

          <Group>
            <Button
              color="red"
              variant="outline"
              leftSection={<IconLogout size={14} />}
              onClick={handleLogout}
              loading={logout.isPending}
            >
              Logout
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  )
}
