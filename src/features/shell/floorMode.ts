/**
 * src/features/shell/floorMode.ts
 *
 * DOM side-effect helper for floor mode.
 *
 * Toggles the "floor" class on <html> based on the floor-mode store's
 * enabled flag. Lives here (not in the store) because stores stay
 * side-effect-free — DOM mutations belong in components/features.
 *
 * Used by <AppShell> in a useEffect:
 *   useEffect(() => { applyFloorClass(enabled) }, [enabled])
 */

export function applyFloorClass(enabled: boolean): void {
  document.documentElement.classList.toggle('floor', enabled)
}
