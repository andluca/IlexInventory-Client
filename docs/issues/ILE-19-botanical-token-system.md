# ILE-19 — Botanical token system: elevated-high + tinted + meniscus + ambient + motion

Status: planned

## Overview

ILE-15 landed the first half of the chrome-glass language (`surfaces.elevated` at 0.72 alpha + 12px blur, applied to sidebar/topbar/right-rail). The remaining design language for the broader refactor — modal glass at higher opacity, tinted status surfaces (terere/amber/clay), a hairline "meniscus" border for glass edges, a botanical ambient gradient on `<body>`, and a motion token system — must land as **additive tokens** before any consumer code is touched.

Zero behaviour change. Zero app code touched. All additions live in `tokens.ts` and propagate to Tailwind + Mantine + global.css. ILE-20 (primitives) and ILE-21 (header) and ILE-23 (overlay glass) consume from here.

## Surface

- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/tokens.ts` — extend `surfaces` block, extend `shadows`, add new `motion` block
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/tailwind.config.ts` — expose new tokens under `backgroundColor`, `backdropBlur`, `borderColor`, `boxShadow`, `transitionTimingFunction`, `transitionDuration`
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/mantine.ts` — extend `theme.other` with new tokens
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/global.css` — declare CSS vars for ambient gradient + motion tokens; extend `body` rule; extend `prefers-reduced-transparency` block; add `prefers-reduced-motion` block; add `@keyframes page-header-in`, `[data-motion="page-header"]` rule, `.spine` class + `@keyframes spine-in` (consumed by ILE-20 PageHeader and ILE-21 Sidebar — owning all keyframes here keeps the layer-2 surfaces disjoint)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/docs/design/tokens.md` — append "Surfaces & elevation: extended" and "Motion" sections
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/theme/__tests__/tokens.test.ts` — new (smoke test that each new export is a non-empty string)

## Dependencies

- **Requires** ILE-15 (DONE) — the `surfaces` and `shadows` blocks exist; this issue extends them.
- **Blocks** ILE-20 (primitives consume tinted + meniscus + motion tokens), ILE-21 (header consumes meniscus + motion), ILE-23 (modal glass consumes `elevatedHigh`).
- **No BE dependency.** No schema regen.
- **Decision lock:** Charcoal-only (no light variant), Inter + JetBrains Mono, single source of truth (`tokens.ts` → Tailwind + Mantine consume).

## Plan

### Token additions — `src/theme/tokens.ts`

Extend `surfaces`:
```ts
export const surfaces = {
  elevated: 'rgb(18 18 18 / 0.72)',          // existing
  elevatedBlur: '12px',                       // existing
  elevatedHigh: 'rgb(18 18 18 / 0.85)',       // NEW — modal glass (legibility-first)
  elevatedHighBlur: '16px',                   // NEW
  tintedTerere: 'rgb(0 193 106 / 0.08)',      // NEW — healthy/committed status
  tintedTereredBorder: 'rgb(0 193 106 / 0.18)', // NEW
  tintedAmber: 'rgb(245 158 11 / 0.10)',      // NEW — expiring within 7d
  tintedAmberBorder: 'rgb(245 158 11 / 0.22)', // NEW
  tintedClay: 'rgb(220 38 38 / 0.10)',        // NEW — recalled/expired
  tintedClayBorder: 'rgb(220 38 38 / 0.22)',  // NEW
  meniscus: '1px solid rgb(255 255 255 / 0.04)', // NEW — hairline top edge on glass
  ambientGradient:
    'radial-gradient(ellipse 80% 50% at 15% 0%, rgb(0 193 106 / 0.020) 0%, transparent 60%), ' +
    'radial-gradient(ellipse 60% 40% at 85% 100%, rgb(54 54 54 / 0.45) 0%, transparent 70%)',
} as const
```

Extend `shadows`:
```ts
export const shadows = {
  card: 'none',                                       // existing
  elevated: '0 4px 16px 0 rgb(0 0 0 / 0.35)',         // existing
  modal: '0 8px 32px 0 rgb(0 0 0 / 0.5)',             // existing
  popover: '0 4px 16px 0 rgb(0 0 0 / 0.4)',           // existing
  hoverLift: '0 8px 24px 0 rgb(0 0 0 / 0.45)',        // NEW — opt-in hover
  modalGlass: '0 24px 64px 0 rgb(0 0 0 / 0.55)',      // NEW — replaces modal shadow when modal goes glass in ILE-23
} as const
```

Add `motion` block (new):
```ts
export const motion = {
  duration: { fast: '120ms', base: '180ms', slow: '240ms' },
  ease: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  },
} as const
```

### Tailwind wiring — `tailwind.config.ts`

```ts
import { /* existing */, motion } from './src/theme/tokens'

backgroundColor: {
  'surface-elevated': surfaces.elevated,           // existing
  'surface-elevated-high': surfaces.elevatedHigh,  // NEW
  'tinted-terere': surfaces.tintedTerere,          // NEW
  'tinted-amber': surfaces.tintedAmber,            // NEW
  'tinted-clay': surfaces.tintedClay,              // NEW
},
backdropBlur: {
  elevated: surfaces.elevatedBlur,                 // existing
  'elevated-high': surfaces.elevatedHighBlur,      // NEW
},
borderColor: {
  'tinted-terere': surfaces.tintedTereredBorder,
  'tinted-amber': surfaces.tintedAmberBorder,
  'tinted-clay': surfaces.tintedClayBorder,
},
boxShadow: {
  elevated: shadows.elevated,                       // existing
  'hover-lift': shadows.hoverLift,                  // NEW
  'modal-glass': shadows.modalGlass,                // NEW
},
transitionTimingFunction: {
  out: motion.ease.out,
  'in-out': motion.ease.inOut,
},
transitionDuration: {
  fast: '120',
  base: '180',
  slow: '240',
},
```

### Mantine theme — `src/theme/mantine.ts`

Extend `theme.other`:
```ts
other: {
  surfaceElevated: surfaces.elevated,           // existing
  surfaceElevatedBlur: surfaces.elevatedBlur,   // existing
  shadowElevated: shadows.elevated,             // existing
  surfaceElevatedHigh: surfaces.elevatedHigh,   // NEW
  surfaceElevatedHighBlur: surfaces.elevatedHighBlur, // NEW
  tintedTerere: surfaces.tintedTerere,
  tintedAmber: surfaces.tintedAmber,
  tintedClay: surfaces.tintedClay,
  tintedTereredBorder: surfaces.tintedTereredBorder,
  tintedAmberBorder: surfaces.tintedAmberBorder,
  tintedClayBorder: surfaces.tintedClayBorder,
  meniscus: surfaces.meniscus,
  shadowHoverLift: shadows.hoverLift,
  shadowModalGlass: shadows.modalGlass,
  motionDurationFast: motion.duration.fast,
  motionDurationBase: motion.duration.base,
  motionDurationSlow: motion.duration.slow,
  motionEaseOut: motion.ease.out,
  motionEaseInOut: motion.ease.inOut,
},
```

### Global CSS — `src/theme/global.css`

Declare CSS vars in `:root` for the ambient gradient + motion tokens (so future inline styles or keyframes can use `var(--motion-duration-base)`):
```css
:root {
  --radius: 0.5rem;                                   /* existing */
  --ring-color: oklch(0.72 0.19 155 / 0.5);           /* existing */
  --ring-offset-color: oklch(0.145 0 0);              /* existing */
  --ambient-gradient:
    radial-gradient(ellipse 80% 50% at 15% 0%, rgb(0 193 106 / 0.020) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 85% 100%, rgb(54 54 54 / 0.45) 0%, transparent 70%);
  --motion-duration-fast: 120ms;
  --motion-duration-base: 180ms;
  --motion-duration-slow: 240ms;
  --motion-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --motion-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

Extend `body`:
```css
body {
  @apply bg-charcoal text-text font-sans;
  font-variant-numeric: tabular-nums;
  background-image: var(--ambient-gradient);
  background-attachment: fixed;
}
```

Extend `prefers-reduced-transparency` to neutralize new glass classes:
```css
@media (prefers-reduced-transparency: reduce) {
  .bg-surface-elevated,
  .bg-surface-elevated-high {
    background-color: var(--mantine-color-dark-7) !important;
    backdrop-filter: none !important;
  }
  .bg-tinted-terere, .bg-tinted-amber, .bg-tinted-clay {
    background-color: var(--mantine-color-dark-6) !important;
  }
  body { background-image: none !important; }
}
```

Add `prefers-reduced-motion` block:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    /* Keep opacity transitions perceptible; strip transform. */
  }
}
```

Append the keyframes + selectors that ILE-20 (PageHeader entry animation) and ILE-21 (Sidebar spine) will consume:

```css
/* Consumed by <PageHeader> (ILE-20) — sets data-motion="page-header" attribute. */
[data-motion='page-header'] {
  animation: page-header-in var(--motion-duration-slow) var(--motion-ease-out) both;
}
@keyframes page-header-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}

/* Consumed by Sidebar active nav (ILE-21) — wraps active NavLink in <Box className="spine">. */
.spine {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--mantine-color-terere-6);
  border-radius: 1px;
  animation: spine-in var(--motion-duration-base) var(--motion-ease-out) both;
}
@keyframes spine-in {
  from { opacity: 0; transform: translateY(-16px); }
  to   { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  [data-motion='page-header'],
  .spine {
    animation: none;
  }
}
```

Owning all keyframes in ILE-19 keeps ILE-20 and ILE-21 disjoint at the file level (they live in `src/components/` and `src/features/shell/` respectively); the `/build` parallel dispatch in Layer 2 needs that disjointness.

### Test — `src/theme/__tests__/tokens.test.ts`

One small file. Imports each new export and asserts it's a non-empty string. Catches typos and confirms ESM resolution. ~20 LOC, ~15 it() blocks.

### Docs — `docs/design/tokens.md`

Append two sections:
- **Surfaces & elevation: extended.** Table of `elevatedHigh`, tinted variants, `meniscus`, `ambientGradient` with use sites.
- **Motion.** Table of duration + easing tokens with use sites + the `prefers-reduced-motion` policy.

### Validation gates

- Both `tsc -p tsconfig.node.json` and main `tsc --noEmit` clean (ILE-15 hit a `.d.ts` cache bug here — explicitly rebuild the node config before main typecheck).
- `npm run lint` clean.
- All 6 grep gates clean (no new violations).
- `npm test` green; expect ~405 → ~420 (the small tokens.test.ts file adds ~15 trivial export-check tests).
- `npm run generate:api -- --check` no drift.
- `npm run build` succeeds.
- Dev smoke: load any page; ambient gradient is barely perceptible at top-left (tereré tint) and bottom-right (graphite warmth) on a calibrated display — invisible at low brightness; that is the intent.

## Acceptance criteria

- [ ] `tokens.ts` exports `surfaces.elevatedHigh`, `surfaces.elevatedHighBlur`, `surfaces.tintedTerere/Amber/Clay`, the three `Tinted{tone}Border` tokens, `surfaces.meniscus`, `surfaces.ambientGradient`, `shadows.hoverLift`, `shadows.modalGlass`, and a new `motion` block.
- [ ] Tailwind exposes every new token under the right utility key.
- [ ] Mantine `theme.other` exposes every new token.
- [ ] `global.css` declares CSS vars for ambient + motion; `body` shows the ambient gradient; reduced-transparency + reduced-motion fallbacks present.
- [ ] `docs/design/tokens.md` has new "Surfaces & elevation: extended" and "Motion" sections.
- [ ] All gates green; suite up by ~15 tests (token smoke checks).
- [ ] **Zero app behaviour change** — no rendered component looks different after merge except for the ambient gradient (which is intentional + subtle).

## Rollback

Single revert. Token additions are additive; reverting the 5 files removes the entire vocabulary. No data, no schema, no cache.

## Notes

- The `.d.ts` cache bug from ILE-15: after editing `tokens.ts`, run `npx tsc -p tsconfig.node.json` once to rebuild `node_modules/.cache/tsc-node/` before running the main `tsc --noEmit`. Otherwise the main typecheck may read stale declarations and flag the new exports as missing.
- The ambient gradient alpha is deliberately ultra-low (0.020 tereré, 0.45 graphite). Higher values read as a "glow" on cheap matte laptop screens. QA on at least one non-color-accurate display before merging.
- A future `data-disable-ambient` user setting on `<html>` is noted but out of scope for this issue.
