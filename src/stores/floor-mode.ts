import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Floor-mode store — persisted to localStorage under key "ilex.floorMode".
 *
 * Floor mode is a UI ergonomics toggle for tablet/warehouse use:
 * - Larger touch targets (36px → 48px row height, 36px → 44px inputs)
 * - Sets class "floor" on <html> element
 * - Purely client-side; no API awareness (D4)
 *
 * Toggle UI lands in issue 003 (App shell).
 * Tailwind `floor:` variant compiled from day one (tailwind.config.ts).
 */
type FloorModeState = {
  enabled: boolean
  toggle: () => void
}

export const useFloorMode = create<FloorModeState>()(
  persist(
    (set) => ({
      enabled: false,
      toggle: () => set((state) => ({ enabled: !state.enabled })),
    }),
    {
      name: 'ilex.floorMode',
    },
  ),
)
