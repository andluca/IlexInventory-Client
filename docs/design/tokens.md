# Design tokens — canonical

Source values for every visual token in the FE. Tailwind config and Mantine theme both consume from `src/theme/tokens.ts`, which is generated from this document. When this document changes, regenerate `tokens.ts`.

The OKLCH values come from the v0 prototype's `globals-lp.css`; the hex approximations are for human reference.

---

## Colors

### Brand

| Token | OKLCH | Hex (≈) | Use |
|---|---|---|---|
| `charcoal` | `oklch(0.145 0 0)` | `#121212` | App background. The whole site is dark. |
| `surface` | `oklch(0.18 0 0)` | `#1B1B1B` | Card / sidebar / popover / modal background. One step lighter than charcoal. |
| `surface-2` | `oklch(0.25 0 0)` | `#2A2A2A` | Muted / secondary / input background. Hover state on cards. |
| `border` | `oklch(0.3 0 0)` | `#363636` | Default border. |
| `text` | `oklch(0.985 0 0)` | `#FAFAFA` | Primary text on charcoal. |
| `text-muted` | `oklch(0.65 0 0)` | `#9C9C9C` | Secondary / supporting text, table column headers. |
| `tereré` | `oklch(0.72 0.19 155)` | `#00C16A` | Primary accent. CTAs, active nav, KPI trends, mono "on hand" pills, brand wordmark "ilex" syllable. |
| `tereré-fg` | `oklch(0.145 0 0)` | `#121212` | Foreground when on a tereré-green surface (buttons, pills). |
| `amber` | `oklch(0.75 0.15 75)` | `#F59E0B` | Warning — expiring within 7 days. |
| `amber-fg` | `oklch(0.2 0 0)` | `#1A1A1A` | Foreground on amber. |
| `clay` | `oklch(0.55 0.2 25)` | `#DC2626` | Destructive — expired, recalled, hard-delete. |
| `clay-fg` | `oklch(0.985 0 0)` | `#FAFAFA` | Foreground on clay. |

### Neutral scale

A 5-step gray ramp derived from charcoal. Use these for borders, dividers, and disabled states, not for color.

| Token | OKLCH | Hex (≈) |
|---|---|---|
| `gray-1` | `oklch(0.145 0 0)` | `#121212` (= `charcoal`) |
| `gray-2` | `oklch(0.18 0 0)` | `#1B1B1B` (= `surface`) |
| `gray-3` | `oklch(0.25 0 0)` | `#2A2A2A` (= `surface-2`) |
| `gray-4` | `oklch(0.3 0 0)` | `#363636` (= `border`) |
| `gray-5` | `oklch(0.65 0 0)` | `#9C9C9C` (= `text-muted`) |

### Tailwind / shadcn semantic mapping

The prototype uses semantic CSS variables. We keep the names so the v0 components port with minimal renaming:

```
--background   → charcoal
--foreground   → text
--card         → surface
--popover      → surface
--primary      → tereré
--secondary    → surface-2
--muted        → surface-2
--muted-foreground → text-muted
--accent       → tereré
--destructive  → clay
--warning      → amber
--border       → border
--input        → surface-2
--ring         → tereré (used at 50% alpha for focus rings)
--sidebar      → surface
```

### Mantine theme mapping

Mantine wants 10-step color tuples and a primary color name. Codify:

- `theme.colors.terere` — 10-step tuple generated from `#00C16A` via Mantine's `colorsTuple` helper, indexed at 6 (default for buttons / active states).
- `theme.colors.clay` — 10-step from `#DC2626`, indexed at 6.
- `theme.colors.amber` — 10-step from `#F59E0B`, indexed at 5.
- `theme.colors.dark` — Mantine's built-in dark scale, but **override `dark[7]` to `#121212`** (charcoal), `dark[6]` to `#1B1B1B` (surface), `dark[5]` to `#2A2A2A` (surface-2). Keeps Mantine's `Mantine.colorScheme === 'dark'` defaults aligned with our values.
- `theme.primaryColor` = `'terere'`. `theme.primaryShade = { dark: 6 }`.

---

## Typography

| Role | Font | Stack |
|---|---|---|
| UI | **Inter** | `Inter, ui-sans-serif, system-ui, sans-serif` |
| Data (SKUs, lot codes, timestamps, money, decimals) | **JetBrains Mono** | `'JetBrains Mono', ui-monospace, 'Geist Mono', monospace` |

Weights loaded: 400, 500, 700 (Inter); 400, 500 (JetBrains Mono).

### Type scale

| Name | Size / line-height | Use |
|---|---|---|
| `display` | `2.25rem / 2.5rem` (Inter 700) | Landing H1 only |
| `h1` | `1.5rem / 2rem` (Inter 600) | Page titles |
| `h2` | `1rem / 1.5rem` (Inter 600) | Card titles, widget headers |
| `body` | `0.875rem / 1.25rem` (Inter 400) | Default body, table cells |
| `body-sm` | `0.8125rem / 1.125rem` (Inter 400) | Table column headers |
| `caption` | `0.75rem / 1rem` (Inter 500) | Pill / badge text, supporting metadata |
| `mono` | `0.8125rem / 1.125rem` (JetBrains Mono 500) | SKU / lot / timestamp cells |
| `mono-lg` | `1rem / 1.5rem` (JetBrains Mono 500) | Lot code in detail header |
| `kpi` | `1.5rem / 1.75rem` (Inter 700, `tracking-tight`) | KPI tile values |

**Tabular numerics** — every cell rendering a number, money, or quantity uses `font-variant-numeric: tabular-nums`. Tailwind: `tabular-nums`. Right-align all numeric columns.

---

## Spacing

| Token | Value | Use |
|---|---|---|
| `xs` | `0.25rem` | Pill internal padding x |
| `sm` | `0.5rem` | Pill internal padding y, tight gaps |
| `md` | `0.75rem` | Default form gap |
| `lg` | `1rem` | Card padding, table cell padding y |
| `xl` | `1.5rem` | Card-to-card gap, section gap |
| `2xl` | `2rem` | Page section vertical rhythm |

### Density

- Default table row height: **36px**
- Floor-mode row height: **48px**
- Default form input height: **36px**
- Floor-mode input height: **44px**

---

## Radius

| Token | Value | Use |
|---|---|---|
| `sm` | `0.25rem` (4px) | Pills, badges, mono code spans |
| `md` | `0.375rem` (6px) | Inputs, dropdowns, segmented toggles |
| `lg` | `0.5rem` (8px) | Cards, buttons, modals |
| `xl` | `0.75rem` (12px) | Hero card on landing |

Default radius scale base is `--radius: 0.5rem` (matches `lg`).

---

## Shadows

Charcoal mode uses borders, not shadows, for depth. Define `shadow-card` as a no-op or a 1px inset border in the surface color so the contract exists for future use.

| Token | Value |
|---|---|
| `shadow-card` | `none` |
| `shadow-modal` | `0 8px 32px 0 rgb(0 0 0 / 0.5)` |
| `shadow-popover` | `0 4px 16px 0 rgb(0 0 0 / 0.4)` |

---

## Focus

```
ring-color: oklch(0.72 0.19 155 / 0.5)   /* tereré at 50% */
ring-offset-color: oklch(0.145 0 0)      /* charcoal */
ring-offset-width: 2px
ring-width: 2px
```

Mantine: `theme.focusRing = 'auto'` with the override above. Tailwind: `focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background`.

The prototype's default focus rings are too subtle on charcoal — this is a polish target.

---

## Surfaces & elevation

Charcoal mode uses borders for content depth; chrome surfaces use translucency + backdrop-blur for a soft separation from scrolling content. Applied only to sidebar / topbar / right rail — never to data tables or cards (glass on dense tabular content reads as noise).

| Token | Value | Use |
|---|---|---|
| `surfaces.elevated` | `rgb(18 18 18 / 0.72)` | Chrome background — charcoal at 0.72 alpha. AA-safe for `text` and `text-muted`. |
| `surfaces.elevatedBlur` | `12px` | Backdrop-blur magnitude paired with `surfaces.elevated`. |
| `shadows.elevated` | `0 4px 16px 0 rgb(0 0 0 / 0.35)` | Opt-in soft outer shadow for hover-elevation. Not default — cards still use borders. |

Tailwind exposes these as `bg-surface-elevated`, `backdrop-blur-elevated`, `shadow-elevated`. Mantine exposes them under `theme.other.surfaceElevated` / `surfaceElevatedBlur` / `shadowElevated`.

**Accessibility:** `global.css` includes `@media (prefers-reduced-transparency: reduce) { .bg-surface-elevated { background-color: var(--mantine-color-dark-7) !important; backdrop-filter: none !important; } }` — chrome degrades to solid charcoal when the user requests reduced transparency.

---

## Surfaces & elevation: extended (ILE-19)

Additional glass and tinted-status vocabulary added in ILE-19. All are additive — the original `elevated`/`elevatedBlur`/`shadows.elevated` tokens are unchanged.

### Modal glass

| Token | Value | Use |
|---|---|---|
| `surfaces.elevatedHigh` | `rgb(18 18 18 / 0.85)` | Modal glass background — higher opacity than chrome for legibility-first overlay surfaces (ILE-23). |
| `surfaces.elevatedHighBlur` | `16px` | Backdrop-blur magnitude paired with `elevatedHigh`. |
| `shadows.hoverLift` | `0 8px 24px 0 rgb(0 0 0 / 0.45)` | Opt-in deeper hover shadow for interactive cards. |
| `shadows.modalGlass` | `0 24px 64px 0 rgb(0 0 0 / 0.55)` | Used with glass modal overlay (ILE-23). |

Tailwind: `bg-surface-elevated-high`, `backdrop-blur-elevated-high`, `shadow-hover-lift`, `shadow-modal-glass`.

### Tinted status surfaces

Ultra-low alpha fills that communicate status without blocking the content behind them. Used on batch/SO row tints and status cards.

| Token | Value | Use |
|---|---|---|
| `surfaces.tintedTerere` | `rgb(0 193 106 / 0.08)` | Healthy / committed status background. |
| `surfaces.tintedTereredBorder` | `rgb(0 193 106 / 0.18)` | Border paired with `tintedTerere`. |
| `surfaces.tintedAmber` | `rgb(245 158 11 / 0.10)` | Expiring-within-7d status background. |
| `surfaces.tintedAmberBorder` | `rgb(245 158 11 / 0.22)` | Border paired with `tintedAmber`. |
| `surfaces.tintedClay` | `rgb(220 38 38 / 0.10)` | Recalled / expired status background. |
| `surfaces.tintedClayBorder` | `rgb(220 38 38 / 0.22)` | Border paired with `tintedClay`. |

Tailwind: `bg-tinted-{terere,amber,clay}`, `border-tinted-{terere,amber,clay}`.
Mantine `theme.other`: `tinted{Terere,Amber,Clay}`, `tinted{Terere,Amber,Clay}Border`.

### Meniscus & ambient

| Token | Value | Use |
|---|---|---|
| `surfaces.meniscus` | `1px solid rgb(255 255 255 / 0.04)` | Hairline top-edge border for glass surfaces — simulates the light refraction at a glass/air boundary. |
| `surfaces.ambientGradient` | `radial-gradient(…)` | Body background gradient (tereré tint top-left + graphite warmth bottom-right). Applied via `background-image` on `<body>`. |

`surfaces.meniscus` is exposed in `theme.other.meniscus`; used as `borderTop` value on chrome containers. `ambientGradient` is consumed via `var(--ambient-gradient)` in `global.css` and is visible as a barely-perceptible botanical warmth on calibrated displays.

**Accessibility:** `global.css` extends the `prefers-reduced-transparency` block to cover `.bg-surface-elevated-high` and the three tinted classes, and adds `body { background-image: none !important; }` — ambient gradient is removed when reduced transparency is requested.

---

## Motion (ILE-19)

Token system for animation durations and easing curves. Single source of truth; wired through Tailwind (`transition-duration-{fast,base,slow}`, `ease-out`, `ease-in-out`) and Mantine `theme.other` (prefixed `motionDuration*` / `motionEase*`). Also declared as CSS custom properties in `:root` (`--motion-duration-{fast,base,slow}`, `--motion-ease-{out,in-out}`) for use inside `@keyframes` and inline styles.

### Duration

| Token | Value | Use |
|---|---|---|
| `motion.duration.fast` | `120ms` | Micro-interactions: icon swap, checkbox, badge state change. |
| `motion.duration.base` | `180ms` | Standard component enter/exit: dropdown, tooltip, sidebar spine. |
| `motion.duration.slow` | `240ms` | Page-level entry: `<PageHeader>` fade-up. |

### Easing

| Token | Value | Use |
|---|---|---|
| `motion.ease.out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Decelerate into rest — enter animations. |
| `motion.ease.inOut` | `cubic-bezier(0.65, 0, 0.35, 1)` | Symmetric ease — exit animations, in-place transforms. |

### Keyframes (ILE-19 owns; consumers in ILE-20 / ILE-21)

`global.css` defines two keyframes and their selectors:

- `[data-motion='page-header']` — `page-header-in` (opacity 0→1 + translateY 8px→0, `slow` + `ease-out`). Set this attribute on the `<PageHeader>` wrapper; ILE-20 consumes it.
- `.spine` — `spine-in` (opacity 0→1 + translateY -16px→0, `base` + `ease-out`). Wrap the active NavLink in `<Box className="spine">`; ILE-21 consumes it.

### Reduced-motion policy

`global.css` includes a global `@media (prefers-reduced-motion: reduce)` block that collapses all `animation-duration` and `transition-duration` to `0.01ms` (near-zero, not zero — avoids JS timing edge-cases). A second targeted block specifically disables `[data-motion='page-header']` and `.spine` animations when reduced motion is requested.

---

## Polish targets vs prototype

- **Mono character width** — JetBrains Mono ships slightly different metrics than Geist Mono. Re-verify lot-code column widths after font swap; lot codes like `LOT-2024-A11` should stay aligned across rows.
- **Drop the `:root` light mode block** entirely — there is no light theme in v1.
- **Add `@theme` Mantine-friendly tokens** alongside the shadcn semantic vars so both layers consume from `src/theme/tokens.ts` without duplication.
