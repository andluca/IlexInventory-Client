import { useEffect, type ReactNode } from 'react'
import { Box } from '@mantine/core'
import { useFloorMode } from '@/stores/floor-mode'
import { useManualBatchModal } from '@/stores/manual-batch-modal'
import { applyFloorClass } from './floorMode'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { CmdkPalette } from './CmdkPalette'
import { ManualBatchModal } from '@/features/inventory/ManualBatchModal'

/**
 * AppShell — wraps every authenticated page (per SPEC §2.8).
 *
 * Layout:
 *   ┌─────────────────────────────────────────────┐
 *   │  Header (sticky, full-width)                │
 *   ├─────────┬───────────────────────────────────┤
 *   │ Sidebar │  Main column (Outlet)             │
 *   │ (240px) │  scrolls                          │
 *   │ sticky  │                                   │
 *   └─────────┴───────────────────────────────────┘
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
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header />
      <Box style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Sidebar />
        <Box component="main" style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          {children}
        </Box>
      </Box>
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
