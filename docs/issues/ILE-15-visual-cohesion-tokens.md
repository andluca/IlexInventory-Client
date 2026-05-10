# ILE-15 — Visual cohesion: surface-elevation tokens + glass-on-chrome

Status: planned

## Overview

User feedback: "the design isn't very pleasant, the containers don't match… header and sidebar don't match. The design itself is cold and without life." ILE-12 already landed the *border* half of this issue — `src/theme/borders.ts` with one named export `chromeBorder`, all eight inline literals swapped, `EmptyState` moved to `<Card withBorder>`, topbar / sidebar header heights aligned. The *elevation* half is still open: there is still no token for "elevated chrome" vs flat data tables, so future polish would land as inline styles.

Three points remain worth landing as tokens — without re-litigating SPEC's locked decisions (charcoal-only, no light mode, Inter + JetBrains Mono):

1. **No surface-elevation token.** `tokens.ts` defines `shadows.card = 'none'`, `shadows.modal`, `shadows.popover`. There is no token for an *elevated* chrome surface (translucent + backdrop-blur) or for a soft hover shadow on cards. Adding glassmorphism without tokens creates brittle inline styles.
2. **Chrome / content hierarchy is uniform.** Sidebar, topbar, right rail and every Card render with the same `dark-7` background and `dark-4` border. The user calls this "cold." A subtle translucent + blurred *chrome* surface — applied only to sidebar / topbar / right rail — gives visual hierarchy without touching dense tabular content (where glass reads as noise).
3. **Single source of truth must hold.** `tokens.ts` is canonical; `mantine.ts` and `tailwind.config.ts` must both consume from it. New tokens cannot be defined twice.

## Surface

- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/tokens.ts` — add `surfaces` and extend `shadows`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/borders.ts` — keep one export; optionally add `subtleBorder` only if it pays off
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/mantine.ts` — pick up new tokens via `theme.other` (no duplication)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/tailwind.config.ts` — extend `backgroundColor` / `backdropBlur` / `boxShadow` from same tokens
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/global.css` — `@media (prefers-reduced-transparency: reduce)` fallback
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/Sidebar.tsx` — adopt `surfaces.elevated`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/Topbar.tsx` — adopt `surfaces.elevated`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/RightRailSlot.tsx` — adopt `surfaces.elevated`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/AppShell.tsx` — verify still 60-LOC compliant after shell changes
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/__tests__/AppShell.test.tsx` — append `reduced-transparency` behavioural test
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/docs/design/tokens.md` — append "Surfaces & elevation" section

## Dependencies

- **Requires** ILE-12 (DONE) — `src/theme/borders.ts` shape, EmptyState `<Card withBorder>`, Topbar/Sidebar alignment. This issue layers on top.
- **No BE dependency** — pure FE styling.
- **No schema regen** — no `generated/` touch.
- **Decision lock:** charcoal-only, no `:root` light variant (`docs/decisions.md` SPEC deviation #5). Inter + JetBrains Mono (deviation #6). Mantine + Tailwind contract (D0).

## Context

### What already exists

- `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/tokens.ts` — single source of truth. Exports `colors`, `gray`, `fontFamily`, `typeScale`, `spacing`, `density`, `radius`, `shadows`, `focus`. `shadows` currently has `card='none'`, `modal`, `popover` only.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/borders.ts` — one named export `chromeBorder = '1px solid var(--mantine-color-dark-4)' as const`, deliberately a module so this issue can extend it.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/mantine.ts` — imports `colors, fontFamily, radius` from `tokens.ts`. Defines `theme.colors.dark[6]/[7]` to charcoal + surface. No `theme.other` block yet.
- `/home/andluca/Documents/Github/IlexInventory-Client/tailwind.config.ts` — imports `colors, fontFamily, spacing, radius, density` from `tokens.ts`. Extends `colors`, `fontFamily`, `spacing`, `borderRadius`, `height`, `minHeight`. No `backgroundColor` / `backdropBlur` / `boxShadow` extension yet.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/global.css` — Tailwind base + `:root` CSS custom props (`--radius`, `--ring-color`, `--ring-offset-color`) + `html { color-scheme: dark }` + `body { @apply bg-charcoal text-text font-sans }`. No backdrop-filter rules.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/Sidebar.tsx` — uses `chromeBorder` on `borderRight`, header `borderBottom`, footer `borderTop`. No `backgroundColor` set on the outer `Box` (falls through to `dark-7`).
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/Topbar.tsx` — has explicit `backgroundColor: 'var(--mantine-color-dark-7)'` on outer `Box` (line 39). This is the only shell component already setting an explicit chrome background, and is the line that must change.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/RightRailSlot.tsx` — uses `chromeBorder` on `borderLeft`, group `borderBottom`, footer `borderTop`. No explicit `backgroundColor`.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/__tests__/AppShell.test.tsx` — existing ILE-12 test asserts outer `overflow: hidden` + `<main>` `overflowY: auto`. Pattern to extend.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/components/EmptyState.tsx` — already `<Card withBorder padding="xl">` per ILE-12. **Do not touch** in this issue.
- `/home/andluca/Documents/Github/IlexInventory-Client/docs/design/tokens.md` — canonical token doc. Has Colors / Typography / Spacing / Radius / Shadows / Focus sections. No "Surfaces & elevation" section yet. Has a "Polish targets vs prototype" section at the end where shadow/glass intent could land.

### Spec reference

- `docs/decisions.md` D0 (Mantine + Tailwind), D4 (floor mode), SPEC deviation #5 (no light mode), deviation #6 (no Geist).
- `docs/architecture.md` — no business logic in routes; theme files live in `src/theme/` only.
- `docs/specs/SPEC.md` §2.1 (Tailwind never inside Mantine theme overrides; raw CSS in `src/theme/` only).

### Decisions already made that affect this issue

- **Charcoal-only.** No `:root` light variant. No light-mode tokens.
- **Borders, not shadows, for depth.** `shadows.card = 'none'` is intentional. `shadows.elevated` lands as an *additive* token for opt-in hover treatments — `shadows.card` stays `'none'`.
- **No glass on data.** Translucent chrome only on sidebar / topbar / right rail. List pages, tables, KPI tiles stay crisp.
- **Single source of truth.** `tokens.ts` is canonical; `mantine.ts` and `tailwind.config.ts` consume from it.
- **`borders.ts` module shape stays.** ILE-12 chose named exports so this issue can append without churn. We keep that contract.
- **60-LOC component cap (ILE-16 scope).** Sidebar (~98), Topbar (~80), RightRailSlot (~99) are already over the cap and tracked by ILE-16 — this issue must not push them further over; if any new background wiring would, factor a small helper.

## Plan

### Generated types

Not applicable. No BE endpoint touch, no schema regen.

### Data layer

Not applicable. No hook or cache key change.

### Theme tokens (canonical surface)

Edit `src/theme/tokens.ts`:

1. **Add `surfaces` block** (new section, placed after `colors` and before `gray` so it sits near the rest of the color tokens — or just before `shadows` to keep "depth-related" tokens together; pick the position that reads best on second look).
   ```ts
   export const surfaces = {
     // Charcoal-only translucent chrome background. Picked alpha so AA contrast
     // holds for `text` (#FAFAFA) and `textMuted` (#9C9C9C). Charcoal base is
     // #121212 — at 0.72 opacity, effective luminance still well below text.
     elevated: 'rgb(18 18 18 / 0.72)',
     // Backdrop-blur magnitude for the chrome surface. 12px is enough to soften
     // anything behind the chrome without dominating the perception of depth.
     elevatedBlur: '12px',
   } as const
   ```
   Alpha pinned at ~0.72 — keep it conservative so charcoal text contrast stays AA. The two values land in `tokens.ts` only; consumers compose `backgroundColor` + `backdropFilter: blur(...)`.

2. **Extend `shadows` block** (additive — `card='none'` unchanged):
   ```ts
   export const shadows = {
     card: 'none',
     // Soft outer shadow for hover-elevation on opt-in cards. Not applied by
     // default — cards still use borders for depth (charcoal contract).
     elevated: '0 4px 16px 0 rgb(0 0 0 / 0.35)',
     modal: '0 8px 32px 0 rgb(0 0 0 / 0.5)',
     popover: '0 4px 16px 0 rgb(0 0 0 / 0.4)',
   } as const
   ```

3. **No reorg** of unrelated blocks. Keep diff minimal.

### Borders extension (optional)

Edit `src/theme/borders.ts`:

- Audit shell call-sites. Decision: ship **only** `chromeBorder` for now. A `subtleBorder` variant would have zero consumers today and `chromeBorder` covers every shell divider. Skip the optional addition — keep the module a one-export façade until a second consumer appears.

### Mantine theme wiring

Edit `src/theme/mantine.ts`:

1. Import `surfaces, shadows` from `./tokens`.
2. Add a `theme.other` block to expose surface + shadow tokens to component overrides and to any consumer that reads `useMantineTheme().other`:
   ```ts
   other: {
     surfaceElevated: surfaces.elevated,
     surfaceElevatedBlur: surfaces.elevatedBlur,
     shadowElevated: shadows.elevated,
   },
   ```
3. No component override added — shell components consume tokens directly via the import for v1. (`theme.other` exists so future shared components — popover variants, hover cards — can pick them up without touching `tokens.ts`.)

### Tailwind wiring

Edit `tailwind.config.ts`:

1. Import `shadows, surfaces` from `./src/theme/tokens` alongside the existing imports.
2. Extend the `theme.extend` block:
   ```ts
   backgroundColor: {
     'surface-elevated': surfaces.elevated,
   },
   backdropBlur: {
     elevated: surfaces.elevatedBlur,
   },
   boxShadow: {
     elevated: shadows.elevated,
   },
   ```
3. Keep `darkMode: 'class'` and the existing `floor:` variant plugin untouched.

### Global CSS — reduced-transparency fallback

Edit `src/theme/global.css`:

Append a media-query rule that strips backdrop-blur and forces the chrome surface to a solid charcoal when the OS / browser signals `prefers-reduced-transparency: reduce`. We target the chrome surface by attribute selector (`[data-chrome="elevated"]`) so we don't need a class soup:

```css
@media (prefers-reduced-transparency: reduce) {
  [data-chrome='elevated'] {
    /* Solid charcoal — drop the translucency. */
    background-color: var(--mantine-color-dark-7);
    backdrop-filter: none;
  }
}
```

Why a `data-` attribute selector and not a Tailwind class: this rule must override inline `style` values set by React, and `data-` selectors with `background-color` declared without `!important` still win over inline `style` when applied via the cascade — except they don't, inline beats stylesheet. Two options:

- **Option A (preferred):** apply the chrome background as a Tailwind class (`bg-surface-elevated backdrop-blur-elevated`) rather than inline `style`, and let the media query use a plain class selector — Tailwind's `backdrop-blur-none` utility class inside `@media` does not apply; we hand-write the override. Use `!important` on the media-query declarations.
- **Option B:** keep React inline styles but mark the element with `data-chrome="elevated"` and add `!important` on the media-query override.

Pick Option A — it stays in the Tailwind contract and avoids `!important` in production CSS. Shell components apply `className="bg-surface-elevated backdrop-blur-elevated"` (not inline `style`) for the new surface; existing borders stay as inline `chromeBorder` since that token is a CSS string, not a Tailwind class.

Final rule:
```css
@media (prefers-reduced-transparency: reduce) {
  .bg-surface-elevated {
    background-color: var(--mantine-color-dark-7) !important;
    backdrop-filter: none !important;
  }
}
```
`!important` is acceptable here — this is a media-query accessibility fallback, the canonical case for it.

### Shell components

Edit `src/features/shell/Sidebar.tsx`:

- Add `className="bg-surface-elevated backdrop-blur-elevated"` to the outer `<Box component="aside">`.
- Keep all `chromeBorder` usage intact.
- Verify no inline `backgroundColor` is set on the outer Box (currently none — fine).

Edit `src/features/shell/Topbar.tsx`:

- Outer `<Box component="header">`: remove `backgroundColor: 'var(--mantine-color-dark-7)'` from the inline `style` prop. Add `className="bg-surface-elevated backdrop-blur-elevated"`.
- `position: sticky`, `top: 0`, `zIndex: 10` stay inline (positional concerns, not chrome).

Edit `src/features/shell/RightRailSlot.tsx`:

- Both the collapsed (36px) and expanded (320px) outer `<Box component="aside">` get `className="bg-surface-elevated backdrop-blur-elevated"`.
- Inner group and footer borders stay inline.

Edit `src/features/shell/AppShell.tsx`:

- No code change expected. Verify visual cohesion: the chrome surfaces should layer above the underlying `<main>` content with a perceptible blur. AppShell file count check: ~57 LOC currently, no change.

### Component LOC budget check

After edits:
- Sidebar: +1 className attr, no helper extraction needed. Still ~98 LOC. ILE-16 already tracks the cap; this issue is LOC-neutral.
- Topbar: +1 className, -1 inline style line. LOC-neutral (~80).
- RightRailSlot: +2 className attrs on two outer Boxes. ~+2 LOC (~101). Already over ILE-16 cap; mention in `## Notes` that this issue is LOC-neutral relative to ILE-16's target, not blocking it.

### Routes

Not applicable.

### Tests (write FIRST)

Two small behavioural tests. No snapshot, no Playwright.

1. **`src/features/shell/__tests__/AppShell.test.tsx`** — append two `it(...)` blocks inside the existing `describe('AppShell', ...)`:

   - `it('sidebar, topbar, and right rail carry bg-surface-elevated chrome class', ...)`:
     - Render via existing `renderAppShell()` helper.
     - After `<main>` resolves, walk `screen.getByRole('main')`'s siblings / ancestors.
     - Assert `<aside>` (sidebar) has `bg-surface-elevated` and `backdrop-blur-elevated` in `className`.
     - Assert `<header>` (topbar) has both classes.
     - Assert `<aside data-testid="agent-panel">` (right rail) has both classes.
     - Rationale: smoke test that the new tokens are wired through the three intended consumers and nowhere else (we explicitly do not assert classes on `<main>`).

   - `it('topbar no longer sets inline backgroundColor on its outer box', ...)`:
     - Render; locate `<header>`.
     - Assert `header.style.backgroundColor` is empty (regression guard for the line 39 inline `backgroundColor` removal — the move-to-Tailwind contract).

2. **Reduced-transparency fallback** — assertion strategy:
   - jsdom does not evaluate `@media (prefers-reduced-transparency: reduce)`. We do NOT add a runtime test for the CSS rule.
   - Coverage option: a static check in the `tokens` test file (or a new `src/theme/global.css` content test) that reads `global.css` as text and asserts the media query + selector exists. **Decision:** skip — content-of-CSS tests are brittle and the rule is small. Manual smoke (toggle OS reduce-transparency setting; verify chrome surface goes opaque) is sufficient.

3. **Existing tests** — all 385 must stay green.
   - `RightRailSlot.test.tsx`: no class assertions today, untouched.
   - `CmdkPalette.test.tsx`: shell-rendering test; unaffected.
   - `Sidebar` has no dedicated test; the AppShell test above is the smoke.

Total: 385 → 387 tests.

### Implementation order

Write tests first per TDD; then land the code in the order below so each step keeps the suite green:

1. **(Test)** Edit `src/features/shell/__tests__/AppShell.test.tsx` — append the two new `it(...)` blocks. They will fail red (no `bg-surface-elevated` class set; topbar still has inline `backgroundColor`). Theme/Util layer.
2. **(Theme)** Edit `src/theme/tokens.ts` — add `surfaces` block and extend `shadows` with `elevated`. Theme layer.
3. **(Theme)** Edit `tailwind.config.ts` — import `surfaces, shadows`; extend `backgroundColor.surface-elevated`, `backdropBlur.elevated`, `boxShadow.elevated`. Util / build layer.
4. **(Theme)** Edit `src/theme/mantine.ts` — import `surfaces, shadows`; add `theme.other` block. Theme layer.
5. **(Theme)** Edit `src/theme/global.css` — append `@media (prefers-reduced-transparency: reduce)` rule overriding `.bg-surface-elevated`. Theme layer.
6. **(Feature)** Edit `src/features/shell/Topbar.tsx` — drop inline `backgroundColor`, add `className="bg-surface-elevated backdrop-blur-elevated"`. Feature layer.
7. **(Feature)** Edit `src/features/shell/Sidebar.tsx` — add same className to outer Box. Feature layer.
8. **(Feature)** Edit `src/features/shell/RightRailSlot.tsx` — add same className to both outer Boxes (collapsed + expanded). Feature layer.
9. **(Verify)** Run `npm test` — new AppShell tests pass green; 385 → 387 total.
10. **(Verify)** Run `npm run typecheck` + `npm run lint` + the 6 SPEC §4 grep gates + `npm run generate:api -- --check`.
11. **(Verify)** Manual smoke: dev server, scroll a list page (Products), confirm sidebar/topbar/right rail show subtle blur as content scrolls underneath. Toggle OS reduce-transparency (macOS: System Settings → Accessibility → Display → "Reduce transparency"; Linux: GNOME Accessibility → Reduce transparency); confirm chrome goes opaque.
12. **(Docs)** Append "Surfaces & elevation" section to `docs/design/tokens.md` (see section below).

### Integration / wiring

- No new route, no ⌘K item, no Zustand store, no MSW handler.
- Floor mode interaction: floor mode adds the `.floor` class and bumps row/input heights — orthogonal to chrome elevation. No interaction to test.

### Documentation to update

- **`docs/design/tokens.md`** — append a new section between "Shadows" and "Focus" (or append at the end before "Polish targets"):

  ```markdown
  ## Surfaces & elevation

  Charcoal mode uses borders for content depth; chrome surfaces use translucency + backdrop-blur for a soft separation from scrolling content. Applied only to sidebar / topbar / right rail — never to data tables or cards (glass on dense tabular content reads as noise).

  | Token | Value | Use |
  |---|---|---|
  | `surfaces.elevated` | `rgb(18 18 18 / 0.72)` | Chrome background — charcoal at 0.72 alpha. AA-safe for `text` and `text-muted`. |
  | `surfaces.elevatedBlur` | `12px` | Backdrop-blur magnitude paired with `surfaces.elevated`. |
  | `shadows.elevated` | `0 4px 16px 0 rgb(0 0 0 / 0.35)` | Opt-in soft outer shadow for hover-elevation. Not default — cards still use borders. |

  Tailwind exposes these as `bg-surface-elevated`, `backdrop-blur-elevated`, `shadow-elevated`. Mantine exposes them under `theme.other.surfaceElevated` / `surfaceElevatedBlur` / `shadowElevated`.

  **Accessibility:** `global.css` includes `@media (prefers-reduced-transparency: reduce) { .bg-surface-elevated { background-color: var(--mantine-color-dark-7) !important; backdrop-filter: none !important; } }` — chrome degrades to solid charcoal when the user requests reduced transparency.
  ```

- **`docs/decisions.md`** — no change. The "charcoal-only" deviation already covers the no-light-mode constraint; "surface-elevated for chrome only" is a polish detail, not a load-bearing decision.
- **`docs/specs/SPEC.md`** — no change. No spec rule breaks.
- **`README.md`** — no change.

## Files involved

Created: none.

Modified:
- `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/tokens.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/mantine.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/tailwind.config.ts`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/global.css`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/Sidebar.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/Topbar.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/RightRailSlot.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/__tests__/AppShell.test.tsx`
- `/home/andluca/Documents/Github/IlexInventory-Client/docs/design/tokens.md`

Untouched (deliberately):
- `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/borders.ts` — one export is sufficient; revisit if/when a second border variant has 2+ consumers.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/components/EmptyState.tsx` — already `<Card withBorder>` per ILE-12.
- `/home/andluca/Documents/Github/IlexInventory-Client/src/features/shell/AppShell.tsx` — no behavioural change needed; existing test stays green.

## Acceptance criteria

- [ ] `src/theme/tokens.ts` exports `surfaces.elevated`, `surfaces.elevatedBlur`, and `shadows.elevated`. `shadows.card` stays `'none'`.
- [ ] `tailwind.config.ts` extends `backgroundColor['surface-elevated']`, `backdropBlur.elevated`, `boxShadow.elevated` — all sourced from `tokens.ts` (no parallel string literals).
- [ ] `src/theme/mantine.ts` exposes the same three tokens under `theme.other`.
- [ ] `src/theme/global.css` contains `@media (prefers-reduced-transparency: reduce) { .bg-surface-elevated { background-color: ...; backdrop-filter: none !important; } }`.
- [ ] `Sidebar.tsx`, `Topbar.tsx`, `RightRailSlot.tsx` outer Boxes carry `className="bg-surface-elevated backdrop-blur-elevated"`. Topbar no longer sets inline `backgroundColor`.
- [ ] New `it('sidebar, topbar, and right rail carry bg-surface-elevated chrome class', ...)` passes.
- [ ] New `it('topbar no longer sets inline backgroundColor on its outer box', ...)` passes.
- [ ] Existing 385 tests stay green (target: 387 total after this issue).
- [ ] No light-mode token, no `:root` light variant.
- [ ] No `backgroundColor` change on `<main>`, data tables, KPI tiles, list pages, or any feature-layer component outside `src/features/shell/`.
- [ ] Universal gates pass:
  - `npm test` → 387 passing
  - `npm run typecheck` (strict) clean
  - `npm run lint` clean
  - `npm run generate:api -- --check` → no diff
  - `grep -RE "(fetch|axios)\(" src/ --include='*.ts' --include='*.tsx' | grep -vE "src/data/|src/api/|src/utils/csv-export\.ts"` → empty
  - `grep -RE "as any" src/ --include='*.ts' --include='*.tsx' | grep -v "src/api/generated"` → empty
  - `grep -RE "from ['\"].*api/generated" src/features/ src/routes/` → empty
  - `grep -RE "\bNumberInput\b" src/features/` → empty outside the integer-only allowlist
- [ ] `docs/design/tokens.md` has a new "Surfaces & elevation" section.
- [ ] Manual visual smoke (operator-side): scroll the Products list — sidebar / topbar / right rail show a soft blur over content; data table cells stay crisp. Toggle OS reduce-transparency — chrome goes opaque charcoal.

## Rollback

Single revert of the merge commit restores the previous chrome look. Token additions are additive — reverting `tokens.ts`, `mantine.ts`, `tailwind.config.ts`, `global.css` plus the three shell components removes the entire surface; no migration needed. Tests added are colocated in `AppShell.test.tsx` and revert with the same commit. No database, no schema, no cache invalidation.

## Notes

- LOC: this issue is LOC-neutral or +2 on `RightRailSlot.tsx` (currently ~99). It does not push any component meaningfully further over ILE-16's 60-LOC cap; the refactor lives in that issue.
- Out of scope (re-stated): `borders.ts` second export (no consumer); `EmptyState` change (already done by ILE-12); list-page chrome (must stay crisp); light mode (locked out).
- The `theme.other` Mantine block is forward-looking — no v1 component reads from it, but it exists so a future hover-card or popover variant can opt into `shadowElevated` without touching `tokens.ts`.
- If browser support for `backdrop-filter` is a concern: Safari 9+, Chrome 76+, Firefox 103+ — all current. No fallback beyond the `prefers-reduced-transparency` rule. Browsers without `backdrop-filter` will see the translucent background without blur, which still reads as "elevated chrome."
