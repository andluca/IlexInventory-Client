# ILE-23 — Extend glass to overlays + KPI cards (modals, menus, popovers, palette)

Status: planned

## Overview

ILE-15 applied glass to chrome only (sidebar / topbar / right-rail). ILE-21 extended it to the unified header. This issue extends the glass language to **layered overlays** (Mantine `Modal`, `Menu.Dropdown`, `Popover.Dropdown`, the Spotlight command palette) and to the **two KPI dashboard containers** (`ExpiringSoonWidget`, `FinancialSummary` — outer Card only; tables inside stay opaque). Modals use the higher-opacity `surfaces.elevatedHigh` (0.85 alpha + 16px blur) so legibility holds even over busy routes.

No new component shape. Theme-level component defaults + two specific consumer styling tweaks. The dashboard widgets keep their data tables crisp — glass is for the container, not the data.

## Surface

- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/mantine.ts` — add `Modal`, `Popover`, `Menu` component default `styles` with elevated-high glass + meniscus
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/CmdkPalette.tsx` — apply glass `styles` to Spotlight
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/dashboard/ExpiringSoonWidget.tsx` — outer Card → glass
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/dashboard/FinancialSummary.tsx` — outer Card → glass
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/__tests__/CmdkPalette.test.tsx` — assert Spotlight container carries glass classes
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/docs/design/components.md` — extend §Surfaces with "Overlay glass policy"

## Dependencies

- **Requires** ILE-19 (`surfaces.elevatedHigh`, `shadows.modalGlass`, motion tokens, meniscus).
- **Requires** ILE-20 (component-defaults pattern established; not a hard dep, but the doc section is co-located).
- **Compatible with** ILE-22 in parallel (different files).
- **No BE dependency.** No schema regen.
- **Decision lock:** No glass on data tables (legibility). No glass on form inputs.

## Plan

### Mantine component defaults — `src/theme/mantine.ts`

Add to the existing `components` block:

```ts
components: {
  // ... existing Button, Input, TextInput, Select defaults ...

  Modal: {
    defaultProps: {
      transitionProps: { transition: 'pop', duration: 180 },
      overlayProps: { backgroundOpacity: 0.55, blur: 4 },
      radius: 'lg',
    },
    styles: {
      content: {
        backgroundColor: surfaces.elevatedHigh,
        backdropFilter: `blur(${surfaces.elevatedHighBlur})`,
        borderTop: surfaces.meniscus,
        border: '1px solid var(--mantine-color-dark-4)',
        boxShadow: shadows.modalGlass,
      },
      header: {
        backgroundColor: 'transparent',
      },
    },
  },

  Popover: {
    styles: {
      dropdown: {
        backgroundColor: surfaces.elevated,
        backdropFilter: `blur(${surfaces.elevatedBlur})`,
        borderTop: surfaces.meniscus,
        border: '1px solid var(--mantine-color-dark-4)',
        boxShadow: shadows.popover,
      },
    },
  },

  Menu: {
    styles: {
      dropdown: {
        backgroundColor: surfaces.elevated,
        backdropFilter: `blur(${surfaces.elevatedBlur})`,
        borderTop: surfaces.meniscus,
        border: '1px solid var(--mantine-color-dark-4)',
        boxShadow: shadows.popover,
      },
    },
  },
},
```

### CmdkPalette — apply glass to Spotlight

`@mantine/spotlight` is per-instance — theme component defaults do not propagate. Edit `CmdkPalette.tsx`:

```tsx
<Spotlight
  actions={allGroups}
  query={query}
  onQueryChange={setQuery}
  shortcut="mod + K"
  nothingFound="No actions found"
  searchProps={{ placeholder: 'Search or type a command…' }}
  styles={{
    content: {
      backgroundColor: 'var(--mantine-other-surfaceElevatedHigh)',
      backdropFilter: 'blur(var(--mantine-other-surfaceElevatedHighBlur))',
      borderTop: 'var(--mantine-other-meniscus)',
      border: '1px solid var(--mantine-color-dark-4)',
      boxShadow: 'var(--mantine-other-shadowModalGlass)',
    },
    search: {
      backgroundColor: 'transparent',
      borderBottom: '1px solid var(--mantine-color-dark-4)',
    },
  }}
/>
```

(Mantine exposes `theme.other.*` as CSS custom properties prefixed `--mantine-other-*` in v7. Verify naming during execution; fall back to inline values if the CSS-var bridge does not pick up the `other` block.)

### Dashboard KPI cards

`ExpiringSoonWidget.tsx` + `FinancialSummary.tsx` — apply glass to the outer `<Card>` only. Tables inside stay opaque.

Example pattern:
```tsx
<Card
  withBorder
  className="bg-surface-elevated backdrop-blur-elevated"
  style={{ borderTop: meniscus, /* existing borders */ }}
  padding="lg"
  radius="lg"
>
  {/* table content stays opaque — no class change inside */}
</Card>
```

The KPI numeric stays in `typeScale.kpi` (Inter 700 tracking-tight) — no typography change.

### Test additions

**`CmdkPalette.test.tsx`** — add one assertion:
```tsx
it('Spotlight container carries glass styles', async () => {
  render(<CmdkPalette />)
  await userEvent.keyboard('{Meta>}{k}{/Meta}')  // or "{Control>}{k}{/Control}" on Linux
  const palette = screen.getByRole('dialog')  // Spotlight uses role="dialog"
  // Either assert via getComputedStyle on the container, or assert the style prop directly
  expect(palette).toHaveStyle({ backdropFilter: expect.stringContaining('blur') })
})
```

(Exact selector + assertion form needs verification — Spotlight's DOM structure may require querying by data-attribute. Adjust during execution.)

### Validation gates

- `tsc --noEmit` clean.
- `npm run lint` clean.
- All 8 grep gates clean.
- `npm test` green; +1 test (CmdkPalette glass assertion).
- `npm run build` succeeds.
- **Manual smoke (mandatory walk-through):** in dev, open every modal — NewProductModal, ImportCsvModal, RecallModal, UnRecallModal, CommitConfirmModal, VoidConfirmModal, ArchiveConfirmModal, DeleteConfirmModal, AdjustModal, WriteOffModal, ManualBatchModal, ReceiveModal — each renders as glass with the 180ms pop transition.
- Open the ⌘K palette — glass.
- Open the user-menu dropdown in the header — glass.
- Hover the dashboard KPI cards — glass-on-top, tables inside stay opaque.
- DevTools rendering → emulate `prefers-reduced-transparency: reduce` — every glass surface returns to solid charcoal.
- DevTools rendering → emulate `prefers-reduced-motion: reduce` — transitions strip.

## Acceptance criteria

- [ ] All `<Modal>` instances render with `surfaces.elevatedHigh` background + 16px blur + meniscus top + `shadows.modalGlass`.
- [ ] All `<Menu.Dropdown>` and `<Popover.Dropdown>` render with `surfaces.elevated` + 12px blur + meniscus.
- [ ] ⌘K Spotlight palette renders with the same elevated-high glass as modals.
- [ ] `ExpiringSoonWidget` and `FinancialSummary` outer Cards are glass; their inner data tables stay opaque (visual smoke).
- [ ] CmdkPalette glass-style assertion test passes.
- [ ] No glass applied to form inputs, line editors, or data tables.
- [ ] `prefers-reduced-transparency` strips every glass surface back to solid charcoal.
- [ ] `prefers-reduced-motion` strips the pop transitions.
- [ ] All gates green.

## Rollback

Revert removes the theme component defaults + Spotlight inline styles + two KPI card class changes. Mantine reverts to default opaque modals. No data, no schema, no cache.

## Notes

- **Per-modal `styles` collisions:** the project has 12 modals; some pass inline `styles` to `<Modal>`. The component-default `styles` may be shadowed by per-instance `styles`. During execution, audit each `<Modal>` call site for inline `styles`; where collisions exist, move the glass into per-instance `styles` (verbose but explicit) and add a one-line comment pointing to ILE-23 for context. Don't lose glass to silent override.
- **Per-instance audit list (modals):**
  - `src/features/catalog/NewProductModal.tsx`
  - `src/features/catalog/ImportCsvModal.tsx`
  - `src/features/catalog/ArchiveConfirmModal.tsx`
  - `src/features/catalog/DeleteConfirmModal.tsx`
  - `src/features/sales/CommitConfirmModal.tsx`
  - `src/features/sales/VoidConfirmModal.tsx`
  - `src/features/inventory/ManualBatchModal.tsx`
  - `src/features/inventory/AdjustModal.tsx`
  - `src/features/inventory/RecallModal.tsx`
  - `src/features/inventory/UnRecallModal.tsx`
  - `src/features/inventory/WriteOffModal.tsx`
  - `src/features/procurement/ReceiveModal.tsx`
- The follow-up `<StatusBanner>` tone="amber" use case (expiring-within KPI) can ship in a separate issue or as part of ILE-22 — confirm during execution and either land here or defer.
- The "Visual regression baseline" screenshots noted in the master plan are deferred to a follow-up (`/screenshots`) — not blocking this issue.
