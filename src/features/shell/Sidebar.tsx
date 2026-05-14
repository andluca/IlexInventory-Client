import { Link, useLocation } from '@tanstack/react-router'
import { NavLink, Stack, Text, Tooltip, Box } from '@mantine/core'
import { chromeBorder } from '@/theme/borders'
import {
  IconLayoutDashboard,
  IconBox,
  IconTruckDelivery,
  IconShoppingCart,
  IconStack,
  IconSettings,
} from '@tabler/icons-react'

/**
 * Sidebar — fixed-width 240px left column.
 *
 * Nav links to top-level pages. Logo moved to Header (ILE-21).
 * Active route indicated by `.spine` accent bar (ILE-21).
 */

type NavItem = {
  to: string
  label: string
  icon: typeof IconLayoutDashboard
  available: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: IconLayoutDashboard, available: true },
  { to: '/products', label: 'Products', icon: IconBox, available: true },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: IconTruckDelivery, available: true },
  { to: '/sales-orders', label: 'Sales Orders', icon: IconShoppingCart, available: true },
  { to: '/stock', label: 'Stock', icon: IconStack, available: true },
  { to: '/settings', label: 'Settings', icon: IconSettings, available: true },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <Box
      component="aside"
      w={240}
      h="100%"
      className="bg-surface-elevated backdrop-blur-elevated"
      style={{
        borderRight: chromeBorder,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack gap={2} p="xs" flex={1}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive =
            location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to))

          if (!item.available) {
            return (
              <Tooltip key={item.to} label="Coming soon" position="right">
                <NavLink
                  label={item.label}
                  leftSection={<Icon size={16} />}
                  disabled
                  aria-label={`${item.label} (coming soon)`}
                />
              </Tooltip>
            )
          }

          return (
            <Box key={item.to} style={{ position: 'relative' }}>
              {isActive && <Box className="spine" aria-hidden data-testid="spine" />}
              <NavLink
                component={Link}
                to={item.to}
                label={item.label}
                leftSection={<Icon size={16} />}
                active={isActive}
                styles={{ root: { background: 'transparent' } }}
              />
            </Box>
          )
        })}
      </Stack>

      <Box p="md" style={{ borderTop: chromeBorder }}>
        <Text size="xs" c="dimmed">
          Built for F&B CPG brands
        </Text>
      </Box>
    </Box>
  )
}
