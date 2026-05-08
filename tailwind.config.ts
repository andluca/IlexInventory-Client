import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import { colors, fontFamily, spacing, radius, density } from './src/theme/tokens'

/**
 * Tailwind config — charcoal-only dark palette.
 * Reads from src/theme/tokens.ts (single source of truth with Mantine theme).
 *
 * No light palette (design deviation #5).
 * Fonts: Inter + JetBrains Mono (NOT Geist — design deviation #6).
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand colors
        charcoal: colors.charcoal,
        surface: colors.surface,
        'surface-2': colors.surface2,
        border: colors.border,
        text: colors.text,
        'text-muted': colors.textMuted,
        terere: colors.terere,
        'terere-fg': colors.terereFg,
        amber: colors.amber,
        'amber-fg': colors.amberFg,
        clay: colors.clay,
        'clay-fg': colors.clayFg,
      },
      fontFamily: {
        sans: [fontFamily.sans],
        mono: [fontFamily.mono],
      },
      spacing: {
        xs: spacing.xs,
        sm: spacing.sm,
        md: spacing.md,
        lg: spacing.lg,
        xl: spacing.xl,
        '2xl': spacing['2xl'],
      },
      borderRadius: {
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
        xl: radius.xl,
      },
      height: {
        'row-default': density.rowHeightDefault,
        'row-floor': density.rowHeightFloor,
        'input-default': density.inputHeightDefault,
        'input-floor': density.inputHeightFloor,
      },
      minHeight: {
        'row-default': density.rowHeightDefault,
        'row-floor': density.rowHeightFloor,
      },
    },
  },
  plugins: [
    // floor: variant — applies styles when <html class="floor"> or any ancestor has class "floor"
    // Used for increased row heights / touch targets on tablet/warehouse devices (D4).
    plugin(({ addVariant }) => {
      addVariant('floor', '&.floor, .floor &')
    }),
  ],
}

export default config
