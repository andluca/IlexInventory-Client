import Decimal from 'decimal.js'

/**
 * Quantity formatting utilities.
 *
 * All values are strings end-to-end matching BE's numeric(14, 4).
 * Arithmetic uses Decimal.js — no JS number math on quantity paths.
 *
 * Base units per SPEC §2.4 / D3: g, ml, unit
 * Display units: g → kg (threshold 1000g), ml → L (threshold 1000ml), unit → units
 *
 * SPEC §2.4: quantity in base units (g, ml, unit); converted to display units (kg, L)
 * at the formatter boundary. The server never sees kg.
 */

export type BaseUnit = 'g' | 'ml' | 'unit'
export type DisplayUnit = 'kg' | 'L' | 'g' | 'ml' | 'unit'

/** Threshold above which g → kg and ml → L conversion kicks in */
const CONVERSION_THRESHOLD = new Decimal(1000)

/**
 * Formats a base-unit quantity string for display.
 * Converts g→kg and ml→L when at or above the 1000 threshold.
 * Preserves full precision without exponent notation.
 *
 * formatQty("500.0000", "g")    → "500 g"
 * formatQty("1500.0000", "g")   → "1.5 kg"
 * formatQty("0.0001", "g")      → "0.0001 g"
 * formatQty("12.0000", "unit")  → "12 units"
 */
export function formatQty(value: string, baseUnit: BaseUnit): string {
  const decimal = new Decimal(value)

  if (baseUnit === 'unit') {
    // Strip trailing zeros for display (12.0000 → 12)
    return `${decimal.toSignificantDigits().toString()} units`
  }

  if (baseUnit === 'g') {
    if (decimal.gte(CONVERSION_THRESHOLD)) {
      const kg = decimal.dividedBy(1000)
      return `${stripTrailingZeros(kg)} kg`
    }
    return `${stripTrailingZeros(decimal)} g`
  }

  if (baseUnit === 'ml') {
    if (decimal.gte(CONVERSION_THRESHOLD)) {
      const L = decimal.dividedBy(1000)
      return `${stripTrailingZeros(L)} L`
    }
    return `${stripTrailingZeros(decimal)} ml`
  }

  // TypeScript exhaustive check
  const _exhaustive: never = baseUnit
  throw new Error(`Unknown base unit: ${String(_exhaustive)}`)
}

/**
 * Converts a display-unit value to the base unit (4dp fixed string).
 * Used by form layers before submitting to the server.
 *
 * toBaseUnit("1.5", "kg")  → "1500.0000"
 * toBaseUnit("2.5", "L")   → "2500.0000"
 * toBaseUnit("500", "g")   → "500.0000"
 * toBaseUnit("12", "unit") → "12.0000"
 */
export function toBaseUnit(displayValue: string, displayUnit: DisplayUnit): string {
  const decimal = new Decimal(displayValue)

  switch (displayUnit) {
    case 'kg':
      return decimal.times(1000).toFixed(4)
    case 'L':
      return decimal.times(1000).toFixed(4)
    case 'g':
    case 'ml':
    case 'unit':
      return decimal.toFixed(4)
  }
}

/**
 * Converts a base-unit value string to a display-unit string.
 * Used by form layers when pre-filling forms from server data.
 *
 * fromBaseUnit("1500.0000", "g", "kg") → "1.5"
 * fromBaseUnit("2500.0000", "ml", "L") → "2.5"
 * fromBaseUnit("500.0000", "g", "g")   → "500"
 */
export function fromBaseUnit(
  baseValue: string,
  baseUnit: BaseUnit,
  targetUnit: DisplayUnit,
): string {
  const decimal = new Decimal(baseValue)

  if (baseUnit === 'g' && targetUnit === 'kg') {
    return stripTrailingZeros(decimal.dividedBy(1000))
  }
  if (baseUnit === 'ml' && targetUnit === 'L') {
    return stripTrailingZeros(decimal.dividedBy(1000))
  }

  // Same unit or unit→unit — strip trailing zeros
  return stripTrailingZeros(decimal)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Strips trailing zeros from a Decimal for human-readable display.
 * Avoids exponential notation (e.g. 1e-4 → 0.0001).
 */
function stripTrailingZeros(d: Decimal): string {
  // toSignificantDigits() can produce exponential; use manual approach:
  // Convert to full fixed representation then strip trailing zeros after decimal
  const str = d.toFixed(10) // enough precision to avoid exponent
  if (!str.includes('.')) return str
  // Strip trailing zeros after decimal point
  const trimmed = str.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
  return trimmed
}
