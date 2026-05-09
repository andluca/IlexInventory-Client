import { describe, it, expect } from 'vitest'
import { formatMoney, parseMoneyString, formatPercent } from './money'
import Decimal from 'decimal.js'

describe('formatMoney', () => {
  it('formats a 4-decimal numeric string at currency precision', () => {
    expect(formatMoney('1000.0000')).toBe('$1,000.00')
  })

  it('preserves precision on sub-cent inputs (no 1e-4 exponent leakage)', () => {
    const result = formatMoney('0.0001')
    // Should not produce exponential notation
    expect(result).not.toContain('e')
    expect(result).not.toContain('E')
    // Should display as $0.00 (rounded by Intl.NumberFormat to 2 decimal places for display)
    expect(result).toBe('$0.00')
  })

  it('renders the brief example', () => {
    // BE-D13 margin example: $900.00 revenue component
    expect(formatMoney('900.0000')).toBe('$900.00')
  })

  it('handles negative values', () => {
    expect(formatMoney('-100.5000')).toBe('-$100.50')
  })

  it('throws on a non-decimal string', () => {
    expect(() => formatMoney('abc')).toThrow()
    expect(() => formatMoney('')).toThrow()
  })

  it('formats zero correctly', () => {
    expect(formatMoney('0.0000')).toBe('$0.00')
  })

  it('formats large values with commas', () => {
    expect(formatMoney('1234567.8900')).toBe('$1,234,567.89')
  })
})

describe('formatPercent', () => {
  it('formats the brief worked example: "900.0000" → "900%"', () => {
    // BE-D13 guard: the prototype rendered "90%" — this is the regression lock
    expect(formatPercent('900.0000')).toBe('900%')
  })

  it('formats fractional values with 1 fraction digit: "12.5000" → "12.5%"', () => {
    // max 1 fraction digit, min 0: fractional part is preserved up to 1dp
    expect(formatPercent('12.5000')).toBe('12.5%')
  })

  it('returns "—" when input is null (BE-D13: margin_pct is null when COGS=0)', () => {
    expect(formatPercent(null)).toBe('—')
  })

  it('formats "0.0000" → "0%" (whole number → no trailing decimal)', () => {
    // min=0 max=1: 0.0000 rounds to 0 with no trailing .0
    expect(formatPercent('0.0000')).toBe('0%')
  })

  it('formats values ≥10 with no fraction digit when whole: "66.6667" rounds to "66.7%"', () => {
    // 66.6667 at max 1dp → "66.7%"
    expect(formatPercent('66.6667')).toBe('66.7%')
  })

  it('formats "9.9999" → "10%" (rounds to whole number, no trailing decimal)', () => {
    // 9.9999 at max 1dp rounds to 10.0; min=0 so displayed as "10%"
    expect(formatPercent('9.9999')).toBe('10%')
  })
})

describe('parseMoneyString', () => {
  it('round-trips a 4-decimal string through Decimal', () => {
    const result = parseMoneyString('1000.0000')
    expect(result).toBeInstanceOf(Decimal)
    expect(result.toFixed(4)).toBe('1000.0000')
  })

  it('preserves full precision for sub-cent arithmetic', () => {
    const result = parseMoneyString('0.0001')
    expect(result.toFixed(4)).toBe('0.0001')
    // Ensure no float coercion
    expect(result.toString()).not.toContain('e')
  })

  it('round-trips negative values', () => {
    const result = parseMoneyString('-100.5000')
    expect(result.toFixed(4)).toBe('-100.5000')
  })

  it('throws on non-numeric input', () => {
    expect(() => parseMoneyString('abc')).toThrow()
    expect(() => parseMoneyString('')).toThrow()
  })
})
