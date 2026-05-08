import { create } from 'zustand'

/**
 * Cmdk (⌘K) palette store — open/close shell only.
 *
 * The Spotlight body lands in ILE-9 with category content (Navigate / Create / Act / Agent).
 * This store exists in ILE-3 solely so <CmdkTrigger> has something to call.
 */
type CmdkState = {
  open: boolean
  openShell: () => void
  closeShell: () => void
}

export const useCmdk = create<CmdkState>((set) => ({
  open: false,
  openShell: () => set({ open: true }),
  closeShell: () => set({ open: false }),
}))
