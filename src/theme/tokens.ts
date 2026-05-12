/**
 * Design tokens — canonical
 * Generated from docs/design/tokens.md. Update both together.
 *
 * Tailwind config and Mantine theme both consume from this file.
 * No value should be defined twice.
 */

// ---------------------------------------------------------------------------
// Colors — Brand
// ---------------------------------------------------------------------------

export const colors = {
  // App background. The whole site is dark.
  charcoal: '#121212',
  // Card / sidebar / popover / modal background
  surface: '#1B1B1B',
  // Muted / secondary / input background. Hover state on cards.
  surface2: '#2A2A2A',
  // Default border
  border: '#363636',
  // Primary text on charcoal
  text: '#FAFAFA',
  // Secondary / supporting text, table column headers
  textMuted: '#9C9C9C',
  // Primary accent. CTAs, active nav, KPI trends.
  terere: '#00C16A',
  // Foreground when on a tereré-green surface (buttons, pills)
  terereFg: '#121212',
  // Warning — expiring within 7 days
  amber: '#F59E0B',
  // Foreground on amber
  amberFg: '#1A1A1A',
  // Destructive — expired, recalled, hard-delete
  clay: '#DC2626',
  // Foreground on clay
  clayFg: '#FAFAFA',
} as const

// ---------------------------------------------------------------------------
// Colors — Neutral scale (5-step gray ramp derived from charcoal)
// ---------------------------------------------------------------------------

export const gray = {
  1: '#121212', // = charcoal
  2: '#1B1B1B', // = surface
  3: '#2A2A2A', // = surface-2
  4: '#363636', // = border
  5: '#9C9C9C', // = text-muted
} as const

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const fontFamily = {
  sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
  mono: "'JetBrains Mono', ui-monospace, 'Geist Mono', monospace",
} as const

/** Type scale: [fontSize, lineHeight] */
export const typeScale = {
  display: ['2.25rem', '2.5rem'], // Inter 700 — Landing H1 only
  h1: ['1.5rem', '2rem'], // Inter 600 — Page titles
  h2: ['1rem', '1.5rem'], // Inter 600 — Card titles, widget headers
  body: ['0.875rem', '1.25rem'], // Inter 400 — Default body, table cells
  bodySm: ['0.8125rem', '1.125rem'], // Inter 400 — Table column headers
  caption: ['0.75rem', '1rem'], // Inter 500 — Pill / badge text
  mono: ['0.8125rem', '1.125rem'], // JetBrains Mono 500 — SKU / lot / timestamp
  monoLg: ['1rem', '1.5rem'], // JetBrains Mono 500 — Lot code in detail header
  kpi: ['1.5rem', '1.75rem'], // Inter 700, tracking-tight — KPI tile values
} as const

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------

export const spacing = {
  xs: '0.25rem', // Pill internal padding x
  sm: '0.5rem', // Pill internal padding y, tight gaps
  md: '0.75rem', // Default form gap
  lg: '1rem', // Card padding, table cell padding y
  xl: '1.5rem', // Card-to-card gap, section gap
  '2xl': '2rem', // Page section vertical rhythm
} as const

// ---------------------------------------------------------------------------
// Density
// ---------------------------------------------------------------------------

export const density = {
  rowHeightDefault: '36px',
  rowHeightFloor: '48px',
  inputHeightDefault: '36px',
  inputHeightFloor: '44px',
} as const

// ---------------------------------------------------------------------------
// Radius
// ---------------------------------------------------------------------------

export const radius = {
  sm: '0.25rem', // 4px — Pills, badges, mono code spans
  md: '0.375rem', // 6px — Inputs, dropdowns, segmented toggles
  lg: '0.5rem', // 8px — Cards, buttons, modals
  xl: '0.75rem', // 12px — Hero card on landing
} as const

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export const surfaces = {
  // Charcoal-only translucent chrome background. Picked alpha so AA contrast
  // holds for `text` (#FAFAFA) and `textMuted` (#9C9C9C). Charcoal base is
  // #121212 — at 0.72 opacity, effective luminance still well below text.
  elevated: 'rgb(18 18 18 / 0.72)',
  // Backdrop-blur magnitude for the chrome surface. 12px is enough to soften
  // anything behind the chrome without dominating the perception of depth.
  elevatedBlur: '12px',
  // Modal glass — higher opacity for legibility-first overlay surfaces.
  elevatedHigh: 'rgb(18 18 18 / 0.85)',
  elevatedHighBlur: '16px',
  // Tinted status surfaces — ultra-low alpha so they read as a tint, not a fill.
  tintedTerere: 'rgb(0 193 106 / 0.08)',      // healthy/committed status
  tintedTereredBorder: 'rgb(0 193 106 / 0.18)',
  tintedAmber: 'rgb(245 158 11 / 0.10)',      // expiring within 7d
  tintedAmberBorder: 'rgb(245 158 11 / 0.22)',
  tintedClay: 'rgb(220 38 38 / 0.10)',        // recalled/expired
  tintedClayBorder: 'rgb(220 38 38 / 0.22)',
  // Hairline top-edge border for glass surfaces ("meniscus" light refraction).
  meniscus: '1px solid rgb(255 255 255 / 0.04)',
  // Subtle botanical ambient gradient applied to <body>. Alpha is deliberately
  // ultra-low (0.020 tereré, 0.45 graphite) — reads as warmth, not a glow.
  ambientGradient:
    'radial-gradient(ellipse 80% 50% at 15% 0%, rgb(0 193 106 / 0.020) 0%, transparent 60%), ' +
    'radial-gradient(ellipse 60% 40% at 85% 100%, rgb(54 54 54 / 0.45) 0%, transparent 70%)',
} as const

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------

export const shadows = {
  card: 'none', // Charcoal uses borders, not shadows, for depth
  // Soft outer shadow for hover-elevation on opt-in cards. Not applied by
  // default — cards still use borders for depth (charcoal contract).
  elevated: '0 4px 16px 0 rgb(0 0 0 / 0.35)',
  modal: '0 8px 32px 0 rgb(0 0 0 / 0.5)',
  popover: '0 4px 16px 0 rgb(0 0 0 / 0.4)',
  // Opt-in hover lift shadow — deeper than elevated, for interactive cards.
  hoverLift: '0 8px 24px 0 rgb(0 0 0 / 0.45)',
  // Glass modal shadow — used when modal surface switches to elevatedHigh (ILE-23).
  modalGlass: '0 24px 64px 0 rgb(0 0 0 / 0.55)',
} as const

// ---------------------------------------------------------------------------
// Focus ring
// ---------------------------------------------------------------------------

export const focus = {
  ringColor: 'oklch(0.72 0.19 155 / 0.5)', // tereré at 50%
  ringOffsetColor: 'oklch(0.145 0 0)', // charcoal
  ringOffsetWidth: '2px',
  ringWidth: '2px',
} as const

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

export const motion = {
  duration: {
    fast: '120ms',
    base: '180ms',
    slow: '240ms',
  },
  ease: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  },
} as const
