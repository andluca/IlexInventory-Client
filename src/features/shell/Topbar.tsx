import { useNavigate } from '@tanstack/react-router'
import { Group, Menu, ActionIcon, Avatar, Box, Text } from '@mantine/core'
import { chromeBorder } from '@/theme/borders'
import { IconUser, IconLogout } from '@tabler/icons-react'
import { useAuthMe } from '@/data/auth/queries'
import { useLogoutMutation } from '@/data/auth/mutations'
import { FloorModeToggle } from './FloorModeToggle'
import { CmdkTrigger } from './CmdkTrigger'

/**
 * Topbar — sticky top row.
 *
 * Composition: <CmdkTrigger> (left), <FloorModeToggle> + user menu (right).
 * User menu shows the email and a Logout item; logout clears caches and redirects to /login.
 */
export function Topbar() {
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
    <Box
      component="header"
      px="md"
      py="md"
      className="bg-surface-elevated backdrop-blur-elevated"
      style={{
        borderBottom: chromeBorder,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Group justify="space-between">
        <CmdkTrigger />

        <Group gap="md">
          <FloorModeToggle />

          <Menu position="bottom-end" withArrow>
            <Menu.Target>
              <ActionIcon variant="subtle" aria-label="User menu">
                <Avatar size="sm" radius="xl">
                  <IconUser size={14} />
                </Avatar>
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {user && (
                <Menu.Label>
                  <Text size="xs" truncate>
                    {user.email}
                  </Text>
                </Menu.Label>
              )}
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconLogout size={14} />}
                onClick={handleLogout}
                disabled={logout.isPending}
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Box>
  )
}
