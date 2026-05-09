import { Link, useLocation } from '@tanstack/react-router'
import { NavLink, Stack, Image, Text, Tooltip, Box } from '@mantine/core'
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
 * Brand mark + nav links to top-level pages. Routes that don't exist yet
 * (catalog/PO/SO/stock land in ILE-4–8) render as disabled with a "Coming soon"
 * tooltip — the surface is fully present from day one so navigation is stable.
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
      h="100vh"
      style={{
        borderRight: '1px solid var(--mantine-color-dark-4)',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
        <Image src="/ilex_logo_v4.svg" alt="Ilex Inventory" h={28} fit="contain" w="auto" />
      </Box>

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
            <NavLink
              key={item.to}
              component={Link}
              to={item.to}
              label={item.label}
              leftSection={<Icon size={16} />}
              active={isActive}
            />
          )
        })}
      </Stack>

      <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-dark-4)' }}>
        <Text size="xs" c="dimmed">
          Built for F&B CPG brands
        </Text>
      </Box>
    </Box>
  )
}
