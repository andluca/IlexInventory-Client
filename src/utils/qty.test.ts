import { describe, it, expect } from 'vitest'
import { formatQty, toBaseUnit, fromBaseUnit } from './qty'
import Decimal from 'decimal.js'

describe('formatQty', () => {
  it('renders g unchanged below 1000', () => {
    expect(formatQty('500.0000', 'g')).toBe('500 g')
  })

  it('converts g to kg above the 1000g threshold', () => {
    expect(formatQty('1500.0000', 'g')).toBe('1.5 kg')
  })

  it('converts ml to L above the 1000ml threshold', () => {
    expect(formatQty('2500.0000', 'ml')).toBe('2.5 L')
  })

  it('preserves precision on sub-gram amounts (no exponent leakage)', () => {
    const result = formatQty('0.0001', 'g')
    expect(result).toBe('0.0001 g')
    expect(result).not.toContain('e')
    expect(result).not.toContain('E')
  })

  it('renders unit base as-is with "units" label', () => {
    expect(formatQty('12.0000', 'unit')).toBe('12 units')
  })

  it('renders exactly 1000g as 1 kg', () => {
    expect(formatQty('1000.0000', 'g')).toBe('1 kg')
  })

  it('renders exactly 1000ml as 1 L', () => {
    expect(formatQty('1000.0000', 'ml')).toBe('1 L')
  })

  it('renders ml unchanged below 1000', () => {
    expect(formatQty('500.0000', 'ml')).toBe('500 ml')
  })

  it('preserves precision on fractional kg display', () => {
    expect(formatQty('1234.5678', 'g')).toBe('1.2345678 kg')
  })
})

describe('toBaseUnit', () => {
  it('converts kg to g', () => {
    expect(toBaseUnit('1.5', 'kg')).toBe('1500.0000')
  })

  it('converts L to ml', () => {
    expect(toBaseUnit('2.5', 'L')).toBe('2500.0000')
  })

  it('passes through g unchanged (already base)', () => {
    expect(toBaseUnit('500', 'g')).toBe('500.0000')
  })

  it('passes through ml unchanged (already base)', () => {
    expect(toBaseUnit('500', 'ml')).toBe('500.0000')
  })

  it('passes through unit unchanged', () => {
    expect(toBaseUnit('12', 'unit')).toBe('12.0000')
  })

  it('round-trips sub-gram values without precision loss', () => {
    // 0.001 kg = 1 g (exactly)
    const result = toBaseUnit('0.001', 'kg')
    expect(result).toBe('1.0000')
  })
})

describe('fromBaseUnit', () => {
  it('converts g to kg', () => {
    expect(fromBaseUnit('1500.0000', 'g', 'kg')).toBe('1.5')
  })

  it('converts ml to L', () => {
    expect(fromBaseUnit('2500.0000', 'ml', 'L')).toBe('2.5')
  })

  it('passes through g to g', () => {
    expect(fromBaseUnit('500.0000', 'g', 'g')).toBe('500')
  })

  it('identity round-trip for sub-gram values', () => {
    const base = toBaseUnit('0.0001', 'kg') // → '0.1000'
    const display = fromBaseUnit(base, 'g', 'kg') // → '0.0001'
    expect(new Decimal(display).toFixed(4)).toBe('0.0001')
  })
})
