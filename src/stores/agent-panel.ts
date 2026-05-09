import { create } from 'zustand'

/**
 * Agent panel store — drives <RightRailSlot> open state + prefilled-query rendering.
 *
 * Created in ILE-9 (step 1). Replaces RightRailSlot's local useState for collapsed
 * so the CmdkPalette's Agent action can force-expand the panel and prefill a query.
 */
type AgentPanelState = {
  open: boolean
  prefilledQuery: string
  setOpen: (open: boolean) => void
  setPrefilledQuery: (q: string) => void
}

export const useAgentPanel = create<AgentPanelState>((set) => ({
  open: false,
  prefilledQuery: '',
  setOpen: (open) => set({ open }),
  setPrefilledQuery: (q) => set({ prefilledQuery: q }),
}))
