import { createTheme, colorsTuple } from '@mantine/core'
import { colors, fontFamily, radius, surfaces, shadows } from './tokens'

/**
 * Mantine charcoal theme.
 * Consumes from tokens.ts — single source of truth with Tailwind config.
 *
 * Color scheme is dark-only (no light mode per design deviation #5).
 * Fonts: Inter + JetBrains Mono via Fontsource (NOT Geist — design deviation #6).
 */
export const mantineTheme = createTheme({
  // ---------------------------------------------------------------------------
  // Colors
  // ---------------------------------------------------------------------------
  colors: {
    // Primary accent: tereré green
    terere: colorsTuple(colors.terere),
    // Destructive: clay red
    clay: colorsTuple(colors.clay),
    // Warning: amber
    amber: colorsTuple(colors.amber),
    // Override Mantine's dark scale to align with our charcoal palette
    // dark[7] → charcoal (#121212), dark[6] → surface (#1B1B1B), dark[5] → surface-2 (#2A2A2A)
    dark: [
      '#C1C2C5', // dark[0]
      '#A6A7AB', // dark[1]
      '#909296', // dark[2]
      '#5c5f66', // dark[3]
      '#373A40', // dark[4]
      colors.surface2, // dark[5] → #2A2A2A (surface-2)
      colors.surface, // dark[6] → #1B1B1B (surface)
      colors.charcoal, // dark[7] → #121212 (charcoal / app background)
      '#000000', // dark[8]
      '#000000', // dark[9]
    ],
  },

  // ---------------------------------------------------------------------------
  // Primary color + shade
  // ---------------------------------------------------------------------------
  primaryColor: 'terere',
  primaryShade: { dark: 6 },

  // ---------------------------------------------------------------------------
  // Typography
  // ---------------------------------------------------------------------------
  fontFamily: fontFamily.sans,
  fontFamilyMonospace: fontFamily.mono,

  // ---------------------------------------------------------------------------
  // Shape
  // ---------------------------------------------------------------------------
  defaultRadius: 'md',
  radius: {
    sm: radius.sm,
    md: radius.md,
    lg: radius.lg,
    xl: radius.xl,
  },

  // ---------------------------------------------------------------------------
  // Focus
  // ---------------------------------------------------------------------------
  focusRing: 'auto',

  // ---------------------------------------------------------------------------
  // Other — surface + shadow tokens for component overrides and theme.other consumers
  // ---------------------------------------------------------------------------
  other: {
    surfaceElevated: surfaces.elevated,
    surfaceElevatedBlur: surfaces.elevatedBlur,
    shadowElevated: shadows.elevated,
  },

  // ---------------------------------------------------------------------------
  // Component defaults
  // ---------------------------------------------------------------------------
  components: {
    Button: {
      defaultProps: {
        // 36px height matches design density (default table row height)
        size: 'sm',
      },
    },
    Input: {
      defaultProps: {
        // 36px height matches design density
        size: 'sm',
      },
    },
    TextInput: {
      defaultProps: {
        size: 'sm',
      },
    },
    Select: {
      defaultProps: {
        size: 'sm',
      },
    },
  },
})
