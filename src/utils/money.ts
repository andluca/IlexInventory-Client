import Decimal from 'decimal.js'

/**
 * Money formatting utilities.
 *
 * All values are strings end-to-end matching BE's numeric(14, 4).
 * Arithmetic uses Decimal.js — no JS number math on money paths.
 *
 * SPEC §2.4: money/qty as strings, Decimal.js arithmetic.
 */

/**
 * Parses a money string (e.g. "1000.0000") into a Decimal for arithmetic.
 * Throws on empty or non-numeric input — guards against accidental "" or "abc".
 */
export function parseMoneyString(value: string): Decimal {
  if (!value || value.trim() === '') {
    throw new Error(`parseMoneyString: empty string is not a valid money value`)
  }
  try {
    const d = new Decimal(value)
    // Ensure it's a finite number (not NaN or Infinity)
    if (!d.isFinite()) {
      throw new Error(`parseMoneyString: "${value}" is not a finite number`)
    }
    return d
  } catch {
    throw new Error(`parseMoneyString: "${value}" is not a valid decimal string`)
  }
}

export type FormatMoneyOptions = {
  currency?: string
  locale?: string
}

/**
 * Formats a money string for display.
 *
 * formatMoney("1000.0000") → "$1,000.00"
 * formatMoney("-100.5000") → "-$100.50"
 * formatMoney("0.0001")   → "$0.00"  (sub-cent displayed at 2dp; full precision in arithmetic)
 *
 * Uses Intl.NumberFormat for locale-aware formatting.
 * Sub-cent values are rounded to 2 decimal places for DISPLAY only.
 * Use parseMoneyString() to preserve full 4dp precision for arithmetic.
 */
export function formatMoney(
  value: string,
  { currency = 'USD', locale = 'en-US' }: FormatMoneyOptions = {},
): string {
  const decimal = parseMoneyString(value)

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  // Convert to number for Intl.NumberFormat display only.
  // The Decimal value is used purely to validate and convert — no precision loss
  // matters at display precision (2dp). The raw string is never passed to Number().
  const asNumber = decimal.toNumber()
  return formatter.format(asNumber)
}
