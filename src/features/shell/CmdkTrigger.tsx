/**
 * CmdkTrigger — topbar button that opens the command palette.
 *
 * Uses Mantine spotlight's programmatic API to open the palette.
 * The keyboard shortcut (mod+K) is handled by <Spotlight> itself via SpotlightRoot.
 *
 * Per ILE-9 Step 7: replaced useCmdk zustand store (now deleted) with spotlight.open().
 */

import { Button, Kbd } from '@mantine/core'
import { spotlight } from '@mantine/spotlight'

export function CmdkTrigger() {
  return (
    <Button
      variant="subtle"
      size="xs"
      onClick={() => spotlight.open()}
      aria-label="Open command palette"
    >
      <Kbd>⌘K</Kbd>
    </Button>
  )
}
