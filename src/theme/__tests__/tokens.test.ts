/**
 * Smoke tests for token exports.
 * Confirms each new export is a non-empty string, catches typos,
 * and confirms ESM resolution.
 */
import { surfaces, shadows, motion } from '../tokens'

describe('surfaces — existing tokens', () => {
  it('surfaces.elevated is a non-empty string', () => {
    expect(typeof surfaces.elevated).toBe('string')
    expect(surfaces.elevated.length).toBeGreaterThan(0)
  })
  it('surfaces.elevatedBlur is a non-empty string', () => {
    expect(typeof surfaces.elevatedBlur).toBe('string')
    expect(surfaces.elevatedBlur.length).toBeGreaterThan(0)
  })
})

describe('surfaces — new tokens (ILE-19)', () => {
  it('surfaces.elevatedHigh is a non-empty string', () => {
    expect(typeof surfaces.elevatedHigh).toBe('string')
    expect(surfaces.elevatedHigh.length).toBeGreaterThan(0)
  })
  it('surfaces.elevatedHighBlur is a non-empty string', () => {
    expect(typeof surfaces.elevatedHighBlur).toBe('string')
    expect(surfaces.elevatedHighBlur.length).toBeGreaterThan(0)
  })
  it('surfaces.tintedTerere is a non-empty string', () => {
    expect(typeof surfaces.tintedTerere).toBe('string')
    expect(surfaces.tintedTerere.length).toBeGreaterThan(0)
  })
  it('surfaces.tintedTereredBorder is a non-empty string', () => {
    expect(typeof surfaces.tintedTereredBorder).toBe('string')
    expect(surfaces.tintedTereredBorder.length).toBeGreaterThan(0)
  })
  it('surfaces.tintedAmber is a non-empty string', () => {
    expect(typeof surfaces.tintedAmber).toBe('string')
    expect(surfaces.tintedAmber.length).toBeGreaterThan(0)
  })
  it('surfaces.tintedAmberBorder is a non-empty string', () => {
    expect(typeof surfaces.tintedAmberBorder).toBe('string')
    expect(surfaces.tintedAmberBorder.length).toBeGreaterThan(0)
  })
  it('surfaces.tintedClay is a non-empty string', () => {
    expect(typeof surfaces.tintedClay).toBe('string')
    expect(surfaces.tintedClay.length).toBeGreaterThan(0)
  })
  it('surfaces.tintedClayBorder is a non-empty string', () => {
    expect(typeof surfaces.tintedClayBorder).toBe('string')
    expect(surfaces.tintedClayBorder.length).toBeGreaterThan(0)
  })
  it('surfaces.meniscus is a non-empty string', () => {
    expect(typeof surfaces.meniscus).toBe('string')
    expect(surfaces.meniscus.length).toBeGreaterThan(0)
  })
  it('surfaces.ambientGradient is a non-empty string', () => {
    expect(typeof surfaces.ambientGradient).toBe('string')
    expect(surfaces.ambientGradient.length).toBeGreaterThan(0)
  })
})

describe('shadows — new tokens (ILE-19)', () => {
  it('shadows.hoverLift is a non-empty string', () => {
    expect(typeof shadows.hoverLift).toBe('string')
    expect(shadows.hoverLift.length).toBeGreaterThan(0)
  })
  it('shadows.modalGlass is a non-empty string', () => {
    expect(typeof shadows.modalGlass).toBe('string')
    expect(shadows.modalGlass.length).toBeGreaterThan(0)
  })
})

describe('motion — new export (ILE-19)', () => {
  it('motion.duration.fast is a non-empty string', () => {
    expect(typeof motion.duration.fast).toBe('string')
    expect(motion.duration.fast.length).toBeGreaterThan(0)
  })
  it('motion.duration.base is a non-empty string', () => {
    expect(typeof motion.duration.base).toBe('string')
    expect(motion.duration.base.length).toBeGreaterThan(0)
  })
  it('motion.duration.slow is a non-empty string', () => {
    expect(typeof motion.duration.slow).toBe('string')
    expect(motion.duration.slow.length).toBeGreaterThan(0)
  })
  it('motion.ease.out is a non-empty string', () => {
    expect(typeof motion.ease.out).toBe('string')
    expect(motion.ease.out.length).toBeGreaterThan(0)
  })
  it('motion.ease.inOut is a non-empty string', () => {
    expect(typeof motion.ease.inOut).toBe('string')
    expect(motion.ease.inOut.length).toBeGreaterThan(0)
  })
})
