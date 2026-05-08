import { describe, it, expect, beforeEach } from 'vitest'
import { useFloorMode } from './floor-mode'
import { applyFloorClass } from '@/features/shell/floorMode'

describe('useFloorMode store', () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    useFloorMode.setState({ enabled: false })
  })

  it('starts at enabled=false', () => {
    expect(useFloorMode.getState().enabled).toBe(false)
  })

  it('toggle() flips enabled', () => {
    useFloorMode.getState().toggle()
    expect(useFloorMode.getState().enabled).toBe(true)
    useFloorMode.getState().toggle()
    expect(useFloorMode.getState().enabled).toBe(false)
  })

  it('persists under "ilex.floorMode" key in localStorage', () => {
    useFloorMode.getState().toggle() // enable
    const stored = localStorage.getItem('ilex.floorMode')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored ?? '{}') as { state?: { enabled?: boolean } }
    expect(parsed.state?.enabled).toBe(true)
  })
})

describe('applyFloorClass', () => {
  beforeEach(() => {
    document.documentElement.className = ''
  })

  it('adds "floor" class when enabled=true', () => {
    applyFloorClass(true)
    expect(document.documentElement.classList.contains('floor')).toBe(true)
  })

  it('removes "floor" class when enabled=false', () => {
    document.documentElement.classList.add('floor')
    applyFloorClass(false)
    expect(document.documentElement.classList.contains('floor')).toBe(false)
  })

  it('is idempotent: calling with true twice does not duplicate class', () => {
    applyFloorClass(true)
    applyFloorClass(true)
    const classes = document.documentElement.classList
    const count = Array.from(classes).filter((c) => c === 'floor').length
    expect(count).toBe(1)
  })
})
