import { useEffect, type ReactNode } from 'react'
import { Box } from '@mantine/core'
import { useFloorMode } from '@/stores/floor-mode'
import { applyFloorClass } from './floorMode'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { RightRailSlot } from './RightRailSlot'

/**
 * AppShell — wraps every authenticated page (per SPEC §2.8).
 *
 * Layout:
 *   ┌─────────┬──────────────────────────┬─────────────┐
 *   │         │  Topbar (sticky)         │             │
 *   │ Sidebar ├──────────────────────────┤  RightRail  │
 *   │ (240px) │  Main column (Outlet)    │  (320px)    │
 *   │ sticky  │  scrolls                 │  sticky     │
 *   └─────────┴──────────────────────────┴─────────────┘
 *
 * Floor-mode side effect: toggles <html class="floor"> based on the store.
 * Lives here, not in the store, so stores stay side-effect-free.
 * Public pages (/login, /signup) don't render AppShell — the floor class
 * is therefore never applied pre-auth.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const enabled = useFloorMode((s) => s.enabled)

  useEffect(() => {
    applyFloorClass(enabled)
  }, [enabled])

  return (
    <Box style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar />
        <Box component="main" style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </Box>
      </Box>
      <RightRailSlot />
    </Box>
  )
}
