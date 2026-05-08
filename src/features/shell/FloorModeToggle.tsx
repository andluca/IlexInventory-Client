import { Switch } from '@mantine/core'
import { useFloorMode } from '@/stores/floor-mode'

/**
 * FloorModeToggle — Mantine <Switch> in the topbar.
 *
 * Pure store consumer. The <html class="floor"> side effect lives in <AppShell>'s
 * useEffect (per Specification — stores stay side-effect-free).
 */
export function FloorModeToggle() {
  const enabled = useFloorMode((s) => s.enabled)
  const toggle = useFloorMode((s) => s.toggle)

  return (
    <Switch
      checked={enabled}
      onChange={toggle}
      label="Floor mode"
      size="sm"
      aria-label="Toggle floor mode"
    />
  )
}
