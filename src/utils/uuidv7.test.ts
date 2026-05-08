import { describe, expect, it } from 'vitest'
import { uuidv7 } from './uuidv7'

const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('uuidv7', () => {
  it('returns a string matching the canonical UUIDv7 format', () => {
    const id = uuidv7()
    expect(id).toMatch(UUID_V7_REGEX)
  })

  it('produces a different value on each call', () => {
    const a = uuidv7()
    const b = uuidv7()
    expect(a).not.toBe(b)
  })

  it('has the version nibble set to 7', () => {
    const id = uuidv7()
    // 15th character (index 14) is the start of the version field
    expect(id[14]).toBe('7')
  })

  it('has the variant bits set correctly (8, 9, a, or b in position 19)', () => {
    const id = uuidv7()
    // position 19 (after the third hyphen)
    expect(['8', '9', 'a', 'b']).toContain(id[19])
  })

  it('produces 1000 UUIDs that all match the format', () => {
    for (let i = 0; i < 1000; i++) {
      expect(uuidv7()).toMatch(UUID_V7_REGEX)
    }
  })

  it('timestamp portion is monotonically non-decreasing across 1000 calls', () => {
    const ids = Array.from({ length: 1000 }, () => uuidv7())
    // The first 8 chars (without hyphens) encode the 48-bit ms timestamp.
    // Strip hyphens and compare lexicographically — valid because hex timestamps
    // sort the same way as numeric values at equal length.
    const timestamps = ids.map((id) => id.replace(/-/g, '').slice(0, 12))
    for (let i = 1; i < timestamps.length; i++) {
      const curr = timestamps[i]
      const prev = timestamps[i - 1]
      // noUncheckedIndexedAccess: guard against undefined (array bounds checked by loop condition)
      if (curr !== undefined && prev !== undefined) {
        expect(curr >= prev).toBe(true)
      }
    }
  })
})
