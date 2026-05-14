import { useNavigate } from '@tanstack/react-router'
import { Group, Menu, ActionIcon, Avatar, Box, Image, Text } from '@mantine/core'
import { chromeBorder } from '@/theme/borders'
import { IconUser, IconLogout } from '@tabler/icons-react'
import { useAuthMe } from '@/data/auth/queries'
import { useLogoutMutation } from '@/data/auth/mutations'
import { FloorModeToggle } from './FloorModeToggle'
import { CmdkTrigger } from './CmdkTrigger'

const meniscus = '1px solid rgb(255 255 255 / 0.04)'

/**
 * Header — full-width sticky header in three sections.
 *
 * Left (240px, matching sidebar width): logo + org name tag.
 * Middle: CmdkTrigger (command palette).
 * Right: FloorModeToggle + user avatar menu.
 *
 * Replaces Topbar (ILE-21). History preserved via git mv.
 */
export function Header() {
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
      role="banner"
      py="md"
      className="bg-surface-elevated backdrop-blur-elevated"
      style={{
        borderTop: meniscus,
        borderBottom: chromeBorder,
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <Group justify="space-between" align="center" style={{ height: '100%' }}>
        {/* Left: logo + org tag, width matches sidebar */}
        <Box
          w={240}
          px="md"
          style={{ borderRight: chromeBorder, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
        >
          <Image src="/ilex_logo_v4.svg" alt="Ilex Inventory" h={28} fit="contain" w="auto" />
          <Text size="xs" ff="mono" c="dimmed" tt="lowercase" style={{ letterSpacing: '0.04em' }}>
            {user ? user.email.split('@')[0] : 'ilex'}
          </Text>
        </Box>

        {/* Middle: command palette trigger */}
        <Box style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <CmdkTrigger />
        </Box>

        {/* Right: floor toggle + user menu */}
        <Group gap="md" px="md">
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
