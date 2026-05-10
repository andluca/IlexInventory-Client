import { useEffect, type ReactNode } from 'react'
import { Box } from '@mantine/core'
import { useFloorMode } from '@/stores/floor-mode'
import { useManualBatchModal } from '@/stores/manual-batch-modal'
import { applyFloorClass } from './floorMode'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { RightRailSlot } from './RightRailSlot'
import { CmdkPalette } from './CmdkPalette'
import { ManualBatchModal } from '@/features/inventory/ManualBatchModal'

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
  const manualBatchOpen = useManualBatchModal((s) => s.open)
  const setManualBatchOpen = useManualBatchModal((s) => s.setOpen)

  useEffect(() => {
    applyFloorClass(enabled)
  }, [enabled])

  return (
    <Box style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar />
        <Box component="main" style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </Box>
      </Box>
      <RightRailSlot />
      {/* CmdkPalette mounts once — keyboard shortcut "mod+K" handled by Spotlight */}
      <CmdkPalette />
      {/* ManualBatchModal bound to useManualBatchModal store — opened from palette or BatchDetailPage */}
      <ManualBatchModal
        opened={manualBatchOpen}
        onClose={() => setManualBatchOpen(false)}
      />
    </Box>
  )
}
