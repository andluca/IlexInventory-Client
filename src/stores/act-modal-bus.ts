import { create } from 'zustand'

/**
 * Act modal bus store — one-way notification channel from CmdkPalette to detail pages.
 *
 * The palette calls request_({ kind, ... }) to signal intent.
 * The target page listens via useActModalBus(s => s.request), opens its own modal
 * when request.kind matches, then calls clear().
 *
 * Created in ILE-9 Step 4.
 */
export type ActModalRequest =
  | { kind: 'recall'; batchId: string }
  | { kind: 'unrecall'; batchId: string }
  | { kind: 'commit' }
  | { kind: 'void'; soId: string }
  | { kind: 'archive'; productId: string }

type ActModalBusState = {
  request: ActModalRequest | null
  request_: (req: ActModalRequest) => void
  clear: () => void
}

export const useActModalBus = create<ActModalBusState>((set) => ({
  request: null,
  request_: (req) => set({ request: req }),
  clear: () => set({ request: null }),
}))
