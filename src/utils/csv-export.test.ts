import { describe, expect, it } from 'vitest'
import { csvExportUrl } from './csv-export'

// In the test environment VITE_API_BASE_URL is undefined, so the function
// falls back to 'http://localhost:8000/api/v1'.
const BASE = 'http://localhost:8000/api/v1'

describe('csvExportUrl', () => {
  it('builds a URL for /financials/dashboard with date params', () => {
    const url = csvExportUrl('/financials/dashboard', { from: '2025-01-01', to: '2025-01-31' })
    expect(url).toBe(`${BASE}/financials/dashboard?from=2025-01-01&to=2025-01-31&format=csv`)
  })

  it('builds a URL for /movements with a batch_id param', () => {
    const url = csvExportUrl('/movements', { batch_id: 'b1' })
    expect(url).toBe(`${BASE}/movements?batch_id=b1&format=csv`)
  })

  it('drops undefined params', () => {
    const url = csvExportUrl('/movements', { batch_id: 'b1', kind: undefined })
    expect(url).not.toContain('kind')
    expect(url).toContain('batch_id=b1')
    expect(url).toContain('format=csv')
  })

  it('builds a URL for /financials/margin with no extra params', () => {
    const url = csvExportUrl('/financials/margin')
    expect(url).toBe(`${BASE}/financials/margin?format=csv`)
  })

  it('builds a URL for /batches/{id}/recall-report', () => {
    const url = csvExportUrl('/batches/b-abc/recall-report')
    expect(url).toBe(`${BASE}/batches/b-abc/recall-report?format=csv`)
  })

  it('URL-encodes values with reserved characters', () => {
    const url = csvExportUrl('/movements', { note: 'a b&c=d' })
    expect(url).toContain('note=a+b%26c%3Dd')
  })

  it('throws on a path not in the CSV allowlist', () => {
    expect(() => csvExportUrl('/products')).toThrow()
  })

  it('throws on /purchase-orders (not a CSV export path)', () => {
    expect(() => csvExportUrl('/purchase-orders')).toThrow()
  })

  it('always appends format=csv as the last param', () => {
    const url = csvExportUrl('/financials/dashboard', { from: '2025-01-01' })
    const params = new URL(url).searchParams
    const keys = [...params.keys()]
    expect(keys[keys.length - 1]).toBe('format')
    expect(params.get('format')).toBe('csv')
  })

  it('includes numeric param values', () => {
    const url = csvExportUrl('/financials/margin', { page: 2, limit: 50 })
    expect(url).toContain('page=2')
    expect(url).toContain('limit=50')
  })
})
