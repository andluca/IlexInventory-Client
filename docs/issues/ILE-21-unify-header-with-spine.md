# ILE-21 — Unify header (header-over-sidebar) + tereré spine on active nav

Status: completed

## Overview

The dashboard currently shows two chrome surfaces stacked side-by-side: a small logo header inside `Sidebar.tsx` (lines 55–57) and a separate `Topbar.tsx` to its right. Both wear the same glass class but the seam between them is the dominant visual weakness. The user wants a **single unified header** instead.

This issue restructures the shell from `flex row [Sidebar | (Topbar / main)]` to `flex column [Header / row [Sidebar | main]]` — a full-width sticky glass header on top, sidebar starts beneath. The logo moves into the header. The sidebar gains a 2px tereré "spine" on the active nav item (the single visual cue of "you are here"), animating in from `-16px translateY` on route change. ILE-12's `<main>` scroll contract is preserved.

## Surface

- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/Topbar.tsx` → **renamed** to `Header.tsx`, component export `Topbar` → `Header`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/Sidebar.tsx` — remove inner logo block; `h="100vh"` → `h="100%"`; render the active-item spine
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/AppShell.tsx` — restructure outer flex (row → column)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/__tests__/AppShell.test.tsx` — update layout assertions
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/__tests__/Sidebar.spine.test.tsx` — new (3 behavioural tests)

**Out of scope (handled by ILE-19):** the `.spine` class + `@keyframes spine-in` CSS rule lives in `src/theme/global.css` and lands in ILE-19. `Sidebar.tsx` only renders `<Box className="spine" aria-hidden />` next to the active NavLink.

## Dependencies

- **Requires** ILE-18 (no `<RightRailSlot />` to plan around in `AppShell.tsx`).
- **Requires** ILE-19 (uses `surfaces.meniscus` + motion tokens).
- **No BE dependency.** No schema regen.
- **Decision lock:** 60-LOC component cap (`AppShell.tsx` ~57 today — stays under), `<main>` is the sole scroll surface (ILE-12), accessibility roles (`<header role="banner">`, `<aside role="complementary">`, `<main role="main">`).

## Plan

### Rename `Topbar.tsx` → `Header.tsx`

`git mv src/features/shell/Topbar.tsx src/features/shell/Header.tsx`. Rewrite the component export `Topbar` → `Header`. Update the import in `AppShell.tsx`.

### `Header.tsx` composition

Three sections in one sticky bar:

- **Left section (fixed `w={240}`, `borderRight: chromeBorder`):** brand block — `<Image src="/ilex_logo_v4.svg" h={28}>` followed by `<Text size="xs" ff="mono" c="dimmed" tt="lowercase" style={{ letterSpacing: '0.04em' }}>{orgName ?? 'ilex'}</Text>`. `orgName` read from `useAuthMe()`; falls back to `'ilex'` while loading.
- **Middle:** `<CmdkTrigger />` styled as a frosted pill — internal padding `xs sm`, label "Search or jump to…" in Inter 400, trailing `<kbd>` in mono with `⌘K`. (CmdkTrigger itself may need a small style update inside this issue to render as a pill instead of a plain button — verify during execution.)
- **Right:** `<FloorModeToggle />` + user avatar with `<Menu>` dropdown.

Outer `<Box component="header" role="banner">`:
- `className="bg-surface-elevated backdrop-blur-elevated"`
- `style={{ borderTop: meniscus, borderBottom: chromeBorder, position: 'sticky', top: 0, zIndex: 20 }}`
- `py="md"` (matches existing Topbar density)

### `Sidebar.tsx` changes

1. **Remove** the inner logo `<Box py="md" px="md" borderBottom>` block (lines 55–57) — logo lives in the header now.
2. Change `h="100vh"` → `h="100%"` on the outer aside (parent flex row owns viewport height now).
3. Inside the `NAV_ITEMS.map`, wrap each `<NavLink>` in `<Box style={{ position: 'relative' }}>` and conditionally render `{isActive && <Box className="spine" aria-hidden />}`.
4. Remove any accent color on active `<NavLink>` — the spine becomes the *single* active cue. (Pass `variant="light"` and/or override the theme so active state only gets text-color emphasis, not background fill.)

### `global.css` — owned by ILE-19

The `.spine` class + `@keyframes spine-in` + reduced-motion override land in ILE-19's `global.css` changes. ILE-21 only references the class — `<Box className="spine" aria-hidden />`.

### `AppShell.tsx` — flex restructure

From:
```tsx
<Box style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
  <Sidebar />
  <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
    <Topbar />
    <Box component="main" style={{ flex: 1, overflowY: 'auto' }}>
      {children}
    </Box>
  </Box>
  <CmdkPalette />
  <ManualBatchModal opened={manualBatchOpen} onClose={...} />
</Box>
```

To:
```tsx
<Box style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
  <Header />
  <Box style={{ flex: 1, display: 'flex', minHeight: 0 }}>
    <Sidebar />
    <Box component="main" style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
      {children}
    </Box>
  </Box>
  <CmdkPalette />
  <ManualBatchModal opened={manualBatchOpen} onClose={...} />
</Box>
```

Floor-mode `useEffect` stays. ManualBatchModal mount stays. CmdkPalette mount stays.

### Tests

**`AppShell.test.tsx` updates:**
- Drop right-rail assertions (already dropped by ILE-18).
- Update structural assertions: `<header role="banner">` is the first child of outer flex; sidebar is inside the inner row; `<main role="main">` still has `overflowY:auto`; outer container still `overflow:hidden`.
- Keep ILE-12's scroll contract test (`outer overflow:hidden`, `<main> overflowY:auto`).
- Keep ILE-15's chrome-class test (now applies to `<header>` and `<aside>` only — already addressed by ILE-18 rename).

**`Sidebar.spine.test.tsx` (new):**
1. When on `/products`, the Products `<NavLink>` has a `.spine` sibling.
2. Other nav items have no `.spine` sibling.
3. Re-rendering at a different route moves the `.spine` to the matching item.

### Validation gates

- `tsc --noEmit` clean.
- `npm run lint` clean.
- All 6 grep gates clean.
- `npm test` green; ~432 → ~435 (+3 spine tests; existing AppShell tests updated in place).
- `npm run build` succeeds.
- **Pixel-alignment check:** in dev, take a screenshot — the right edge of the 240px logo block in the header lines up with the right edge of the 240px sidebar column below. Off by even 1 pixel and the seam reads broken.
- Floor-mode toggle, user menu, ⌘K palette trigger all functional in dev smoke.
- Reduced-motion: emulate in DevTools — spine appears without animation.

## Acceptance criteria

- [ ] `Topbar.tsx` no longer exists; `Header.tsx` is canonical.
- [ ] Logo no longer appears inside `Sidebar.tsx`; appears in the left 240px block of `Header.tsx`.
- [ ] `<header role="banner">` is the first child of the outer `AppShell` flex.
- [ ] `<aside role="complementary">` (sidebar) sits in the inner flex row alongside `<main role="main">`.
- [ ] Active nav item shows a 2px tereré spine on the left edge that slides in on route change.
- [ ] Logo block right edge lines up pixel-perfect with sidebar column right edge below.
- [ ] All ILE-12 scroll contract assertions still pass.
- [ ] All gates green; suite at ~435.
- [ ] Reduced-motion strips the spine animation; reduced-transparency neutralizes the glass.

## Rollback

Single revert restores the Topbar / Sidebar logo split + AppShell row layout. No data, no schema, no cache.

## Notes

- The `chromeBorder` token in `src/theme/borders.ts` stays the source for borders that are not the meniscus hairline.
- If the Mantine NavLink active state requires a custom `styles` prop to drop the background fill (instead of just `variant`), apply it inline on each NavLink — do not extend `theme.components.NavLink` in this issue (out of scope for the shell refactor).
- `CmdkTrigger` styling tweak (frosted pill) lives in this issue since the trigger is now visually part of the header. Keep the change minimal — same component, restyled.
