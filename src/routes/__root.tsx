import { createRootRoute, Outlet } from '@tanstack/react-router'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/router'
import { mantineTheme } from '@/theme/mantine'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

/**
 * Root route — mounts providers and the global Notifications host.
 *
 * MantineProvider: charcoal theme (dark-only, no light mode — design deviation #5)
 * QueryClientProvider: shared queryClient from src/router.ts
 * Notifications: Mantine toast system (used by data hooks for 409/error feedback)
 *
 * Note: React.StrictMode is in src/main.tsx (entry), not here.
 * Note: Spotlight provider mounts in issue 009.
 */
export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <QueryClientProvider client={queryClient}>
        <Notifications position="top-right" />
        <Outlet />
      </QueryClientProvider>
    </MantineProvider>
  )
}
