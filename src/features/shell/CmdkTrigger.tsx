import { Button, Kbd } from '@mantine/core'
import { useCmdk } from '@/stores/cmdk'

let warnedOnce = false

/**
 * CmdkTrigger — topbar button that opens the (not-yet-implemented) palette.
 *
 * In v1 nothing is wired downstream; toggles the boolean store. ILE-9 fills
 * the Spotlight body with Navigate / Create / Act / Agent categories.
 *
 * Dev convenience: console-warn once per session that the palette is a stub.
 * Gated by import.meta.env.DEV so the empty click is debuggable but silent in prod.
 */
export function CmdkTrigger() {
  const openShell = useCmdk((s) => s.openShell)

  function handleClick() {
    openShell()
    if (import.meta.env.DEV && !warnedOnce) {
      warnedOnce = true
      console.warn('[CmdkTrigger] Spotlight palette not yet wired (lands in ILE-9).')
    }
  }

  return (
    <Button variant="subtle" size="xs" onClick={handleClick} aria-label="Open command palette">
      <Kbd>⌘K</Kbd>
    </Button>
  )
}
