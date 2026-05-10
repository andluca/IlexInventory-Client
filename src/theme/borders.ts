/**
 * Chrome border tokens.
 *
 * Single source of truth for shell dividers (sidebar / topbar / right rail).
 * ILE-15 will extend this module with surfaces.elevated, shadows.elevated, and a
 * glass-on-chrome variant — keep it as a named-export module so additions don't churn.
 */
export const chromeBorder = '1px solid var(--mantine-color-dark-4)' as const
