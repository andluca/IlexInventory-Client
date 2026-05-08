import { describe, expect, it, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { apiClient, mintIdempotencyKey } from './client'
import { ApiError } from './errors'

// Regex matching UUIDv7 format
const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Set document.cookie for testing CSRF header injection. */
function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/`
}

/** Remove a cookie by expiring it. */
function clearCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

/** Minimal typed body for POST /batches (manual batch creation). */
const BATCH_BODY = {
  product_id: 'prod-uuid-1',
  batch_code: 'BATCH-001',
  unit_cost: 5,
  initial_quantity: 10,
} as const

/** Minimal typed body for POST /batches/{id}/movements with kind=write_off. */
const WRITE_OFF_BODY = {
  kind: 'write_off' as const,
  signed_quantity: -5,
  notes: 'Damaged goods',
} as const

/** Minimal typed body for POST /batches/{id}/movements with kind=adjustment. */
const ADJUSTMENT_BODY = {
  kind: 'adjustment' as const,
  signed_quantity: 10,
  notes: 'Stock count correction',
} as const

/** Minimal body for POST /batches/{id}/recall. */
const RECALL_BODY = { reason: 'Contamination' } as const

// ---------------------------------------------------------------------------
// Step 6: credentials, CSRF, 4xx normalization
// ---------------------------------------------------------------------------

describe('apiClient — credentials + CSRF', () => {
  beforeEach(() => {
    clearCookie('csrftoken')
  })

  it('attaches X-CSRFToken header on POST when csrftoken cookie is set', async () => {
    setCookie('csrftoken', 'test-csrf-abc')
    let capturedCsrf: string | null = null

    // Use POST /batches which has a typed request body in the schema
    server.use(
      http.post('http://localhost:8000/api/v1/batches', ({ request }) => {
        capturedCsrf = request.headers.get('X-CSRFToken')
        return HttpResponse.json(
          { id: 'b-1', batch_code: 'BATCH-001', on_hand: '10.0000' },
          { status: 201 },
        )
      }),
    )

    await apiClient.POST('/api/v1/batches', { body: BATCH_BODY })

    expect(capturedCsrf).toBe('test-csrf-abc')
  })

  it('omits X-CSRFToken header on POST when csrftoken cookie is absent', async () => {
    let capturedCsrf: string | null = 'not-checked'

    server.use(
      http.post('http://localhost:8000/api/v1/batches', ({ request }) => {
        capturedCsrf = request.headers.get('X-CSRFToken')
        return HttpResponse.json(
          { id: 'b-1', batch_code: 'BATCH-001', on_hand: '10.0000' },
          { status: 201 },
        )
      }),
    )

    await apiClient.POST('/api/v1/batches', { body: BATCH_BODY })

    expect(capturedCsrf).toBeNull()
  })

  it('does NOT attach X-CSRFToken header on GET requests', async () => {
    setCookie('csrftoken', 'test-csrf-abc')
    let capturedCsrf: string | null = 'not-checked'

    server.use(
      http.get('http://localhost:8000/api/v1/auth/me', ({ request }) => {
        capturedCsrf = request.headers.get('X-CSRFToken')
        return HttpResponse.json({ id: 1, email: 'test@example.com' }, { status: 200 })
      }),
    )

    await apiClient.GET('/api/v1/auth/me')

    expect(capturedCsrf).toBeNull()
  })
})

describe('apiClient — 4xx error normalization', () => {
  it('throws ApiError with parsed fields on 400 with envelope', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/batches', () => {
        return HttpResponse.json(
          {
            error: 'duplicate_email',
            detail: 'Already used',
            fields: { email: 'taken' },
          },
          { status: 400 },
        )
      }),
    )

    try {
      await apiClient.POST('/api/v1/batches', { body: BATCH_BODY })
      expect.fail('should have thrown')
    } catch (err) {
      expect(ApiError.is(err)).toBe(true)
      if (ApiError.is(err)) {
        expect(err.status).toBe(400)
        expect(err.error).toBe('duplicate_email')
        expect(err.detail).toBe('Already used')
        expect(err.fields).toEqual({ email: 'taken' })
      }
    }
  })

  it('throws ApiError(status=401) on 401 response', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/auth/me', () => {
        return HttpResponse.json(
          { error: 'not_authenticated', detail: 'Authentication credentials were not provided.' },
          { status: 401 },
        )
      }),
    )

    try {
      await apiClient.GET('/api/v1/auth/me')
      expect.fail('should have thrown')
    } catch (err) {
      expect(ApiError.is(err)).toBe(true)
      if (ApiError.is(err)) {
        expect(err.status).toBe(401)
        expect(err.error).toBe('not_authenticated')
      }
    }
  })

  it('throws ApiError(status=409) on 409 response', async () => {
    server.use(
      http.post('http://localhost:8000/api/v1/purchase-orders/po-1/receive', () => {
        return HttpResponse.json(
          { error: 'already_received', detail: 'This PO has already been received.' },
          { status: 409 },
        )
      }),
    )

    try {
      await apiClient.POST('/api/v1/purchase-orders/{po_id}/receive', {
        params: { path: { po_id: 'po-1' } },
        body: { lines: [] },
      })
      expect.fail('should have thrown')
    } catch (err) {
      expect(ApiError.is(err)).toBe(true)
      if (ApiError.is(err)) {
        expect(err.status).toBe(409)
        expect(err.error).toBe('already_received')
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Step 6: mintIdempotencyKey export
// ---------------------------------------------------------------------------

describe('mintIdempotencyKey', () => {
  it('returns a UUIDv7 string', () => {
    expect(mintIdempotencyKey()).toMatch(UUID_V7_REGEX)
  })

  it('produces a different value on each call', () => {
    expect(mintIdempotencyKey()).not.toBe(mintIdempotencyKey())
  })
})

// ---------------------------------------------------------------------------
// Step 7: Idempotency-Key plumbing
// ---------------------------------------------------------------------------

describe('apiClient — Idempotency-Key plumbing', () => {
  it('auto-mints an Idempotency-Key on POST /purchase-orders/{id}/receive', async () => {
    let capturedKey: string | null = null

    server.use(
      http.post('http://localhost:8000/api/v1/purchase-orders/po-1/receive', ({ request }) => {
        capturedKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({ id: 'po-1', status: 'received' }, { status: 200 })
      }),
    )

    await apiClient.POST('/api/v1/purchase-orders/{po_id}/receive', {
      params: { path: { po_id: 'po-1' } },
      body: { lines: [] },
    })

    expect(capturedKey).not.toBeNull()
    expect(capturedKey).toMatch(UUID_V7_REGEX)
  })

  it('uses caller-supplied Idempotency-Key on retry (does not overwrite)', async () => {
    const callerKey = 'caller-key-stable-across-retries'
    let capturedKey: string | null = null

    server.use(
      http.post('http://localhost:8000/api/v1/purchase-orders/po-1/receive', ({ request }) => {
        capturedKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({ id: 'po-1', status: 'received' }, { status: 200 })
      }),
    )

    await apiClient.POST('/api/v1/purchase-orders/{po_id}/receive', {
      params: { path: { po_id: 'po-1' } },
      body: { lines: [] },
      headers: { 'Idempotency-Key': callerKey },
    })

    expect(capturedKey).toBe(callerKey)
  })

  it('auto-mints Idempotency-Key on POST /batches (manual batch creation)', async () => {
    let capturedKey: string | null = null

    server.use(
      http.post('http://localhost:8000/api/v1/batches', ({ request }) => {
        capturedKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json(
          { id: 'b-1', batch_code: 'BATCH-001', on_hand: '10.0000' },
          { status: 201 },
        )
      }),
    )

    await apiClient.POST('/api/v1/batches', { body: BATCH_BODY })

    expect(capturedKey).toMatch(UUID_V7_REGEX)
  })

  it('auto-mints Idempotency-Key on POST /batches/{id}/recall', async () => {
    let capturedKey: string | null = null

    server.use(
      http.post('http://localhost:8000/api/v1/batches/b-1/recall', ({ request }) => {
        capturedKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({ id: 'b-1', is_recalled: true }, { status: 200 })
      }),
    )

    await apiClient.POST('/api/v1/batches/{batch_id}/recall', {
      params: { path: { batch_id: 'b-1' } },
      body: RECALL_BODY,
    })

    expect(capturedKey).toMatch(UUID_V7_REGEX)
  })

  it('auto-mints Idempotency-Key on POST /batches/{id}/un-recall', async () => {
    let capturedKey: string | null = null

    server.use(
      http.post('http://localhost:8000/api/v1/batches/b-1/un-recall', ({ request }) => {
        capturedKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({ id: 'b-1', is_recalled: false }, { status: 200 })
      }),
    )

    await apiClient.POST('/api/v1/batches/{batch_id}/un-recall', {
      params: { path: { batch_id: 'b-1' } },
    })

    expect(capturedKey).toMatch(UUID_V7_REGEX)
  })

  it('auto-mints Idempotency-Key on POST /batches/{id}/movements with kind=write_off', async () => {
    let capturedKey: string | null = null

    server.use(
      http.post('http://localhost:8000/api/v1/batches/b-1/movements', ({ request }) => {
        capturedKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({ id: 'm-1', kind: 'write_off' }, { status: 201 })
      }),
    )

    await apiClient.POST('/api/v1/batches/{batch_id}/movements', {
      params: { path: { batch_id: 'b-1' } },
      body: WRITE_OFF_BODY,
    })

    expect(capturedKey).toMatch(UUID_V7_REGEX)
  })

  it('does NOT add Idempotency-Key on POST /batches/{id}/movements with kind=adjustment (BE-D7)', async () => {
    let capturedKey: string | null = 'not-checked'

    server.use(
      http.post('http://localhost:8000/api/v1/batches/b-1/movements', ({ request }) => {
        capturedKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({ id: 'm-2', kind: 'adjustment' }, { status: 201 })
      }),
    )

    await apiClient.POST('/api/v1/batches/{batch_id}/movements', {
      params: { path: { batch_id: 'b-1' } },
      body: ADJUSTMENT_BODY,
    })

    expect(capturedKey).toBeNull()
  })

  it('does NOT add Idempotency-Key on GET /products', async () => {
    let capturedKey: string | null = 'not-checked'

    server.use(
      http.get('http://localhost:8000/api/v1/products', ({ request }) => {
        capturedKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({ results: [], count: 0 }, { status: 200 })
      }),
    )

    await apiClient.GET('/api/v1/products')

    expect(capturedKey).toBeNull()
  })
})
