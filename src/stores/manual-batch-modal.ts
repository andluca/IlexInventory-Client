import { create } from 'zustand'

/**
 * Manual batch modal store — lets the CmdkPalette open the existing
 * <ManualBatchModal> from any route without lifting modal-specific state
 * into <AppShell>'s component file.
 *
 * Created in ILE-9 Step 4.
 */
type ManualBatchModalState = {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useManualBatchModal = create<ManualBatchModalState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
