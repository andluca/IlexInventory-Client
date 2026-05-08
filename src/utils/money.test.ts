import { describe, it, expect } from 'vitest'
import { formatMoney, parseMoneyString } from './money'
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
