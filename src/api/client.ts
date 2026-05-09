/**
 * src/api/client.ts
 *
 * Thin typed wrapper around openapi-fetch, bound to the generated paths.
 * The data layer (src/data/{domain}/) is the only consumer.
 *
 * Cross-cutting concerns added here:
 *  1. credentials: 'include' — session cookie travels with every request.
 *  2. CSRF — X-CSRFToken header from the csrftoken cookie on POST/PATCH/DELETE.
 *  3. Idempotency-Key — UUIDv7 minted on the seven BE-required endpoints + write_off movements.
 *     Caller-supplied key always wins (retry semantics).
 *  4. 4xx normalization — response >= 400 throws ApiError with typed BE envelope.
 */

import createClient from 'openapi-fetch'
import type { paths } from './generated/schema'
import { ApiError } from './errors'
import { uuidv7 } from '@/utils/uuidv7'

// ---------------------------------------------------------------------------
// Cookie reader
// ---------------------------------------------------------------------------

function getCookie(name: string): string | undefined {
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
  return match ? match.slice(name.length + 1) : undefined
}

// ---------------------------------------------------------------------------
// Idempotency-Key endpoint list
//
// Per SPEC §2.5 the seven BE-required endpoints:
//   POST /products/import
//   POST /purchase-orders/{id}/receive
//   POST /batches
//   POST /batches/{id}/recall
//   POST /batches/{id}/un-recall
//   POST /sales-orders/{id}/commit   (listed for when schema snapshot includes them)
//   POST /sales-orders/{id}/void
// Plus POST /batches/{id}/movements when kind === 'write_off' (conditional — see middleware).
// ---------------------------------------------------------------------------

/** Paths that always get an Idempotency-Key on POST (exact schemaPath from openapi-fetch). */
const ALWAYS_IDEMPOTENT_POST_PATHS = new Set([
  '/api/v1/products/import',
  '/api/v1/purchase-orders/{po_id}/receive',
  '/api/v1/batches',
  '/api/v1/batches/{batch_id}/recall',
  '/api/v1/batches/{batch_id}/un-recall',
  // Sales endpoints — schema path param is `so_id`:
  '/api/v1/sales-orders/{so_id}/commit',
  '/api/v1/sales-orders/{so_id}/void',
])

/** Paths that get an Idempotency-Key only when the body matches a condition. */
const CONDITIONAL_IDEMPOTENT_POST_PATHS: Record<string, (body: Record<string, unknown>) => boolean> = {
  '/api/v1/batches/{batch_id}/movements': (body) => body['kind'] === 'write_off',
}

// ---------------------------------------------------------------------------
// Build and configure the openapi-fetch client
//
// Created lazily on first use so that globalThis.fetch is captured after
// MSW (or any test interceptor) has patched it.
// In production the singleton is built on the first API call and reused.
// ---------------------------------------------------------------------------

// The VITE_API_BASE_URL includes the /api/v1 path (e.g. http://localhost:8000/api/v1).
// The generated schema paths already start with /api/v1/, so we need the origin only.
// Strip trailing /api/v1 if present so openapi-fetch doesn't double the prefix.
const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
const BASE_URL = RAW_BASE_URL.replace(/\/api\/v1\/?$/, '')

type OpenApiClient = ReturnType<typeof createClient<paths>>

let _client: OpenApiClient | null = null

function buildClient(): OpenApiClient {
  const client = createClient<paths>({
    baseUrl: BASE_URL,
    // Forward to globalThis.fetch at call time so MSW test interceptors work.
    fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
    credentials: 'include',
  })

  // -- Request middleware: CSRF + Idempotency-Key --
  client.use({
    async onRequest({ request, schemaPath }) {
      const method = request.method.toUpperCase()

      // 1. CSRF header on state-changing requests
      if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
        const csrf = getCookie('csrftoken')
        if (csrf) {
          request.headers.set('X-CSRFToken', csrf)
        }
      }

      // 2. Idempotency-Key on relevant endpoints
      if (method === 'POST') {
        const alreadyHasKey = request.headers.has('Idempotency-Key')

        if (ALWAYS_IDEMPOTENT_POST_PATHS.has(schemaPath)) {
          if (!alreadyHasKey) {
            request.headers.set('Idempotency-Key', uuidv7())
          }
        } else if (schemaPath in CONDITIONAL_IDEMPOTENT_POST_PATHS) {
          // Read body to check the condition — clone first to avoid consuming the stream.
          let body: Record<string, unknown> = {}
          const contentType = request.headers.get('content-type') ?? ''
          if (contentType.includes('application/json')) {
            try {
              body = (await request.clone().json()) as Record<string, unknown>
            } catch {
              // Malformed body — skip idempotency logic
            }
          }
          const checker = CONDITIONAL_IDEMPOTENT_POST_PATHS[schemaPath]
          if (checker && checker(body) && !alreadyHasKey) {
            request.headers.set('Idempotency-Key', uuidv7())
          }
        }
      }

      return request
    },
  })

  // -- Response middleware: 4xx error normalization --
  client.use({
    async onResponse({ response }) {
      if (response.status >= 400) {
        let envelope: { error?: string; detail?: string; fields?: Record<string, string> } = {}
        try {
          envelope = (await response.clone().json()) as typeof envelope
        } catch {
          // Non-JSON 4xx — build a minimal envelope
          envelope = { error: `http_${response.status}` }
        }
        const apiError = new ApiError({
          status: response.status,
          error: envelope.error ?? `http_${response.status}`,
          ...(envelope.detail !== undefined ? { detail: envelope.detail } : {}),
          ...(envelope.fields !== undefined ? { fields: envelope.fields } : {}),
        })
        throw apiError
      }
      return response
    },
  })

  return client
}

function getClient(): OpenApiClient {
  if (!_client) {
    _client = buildClient()
  }
  return _client
}

// ---------------------------------------------------------------------------
// Exported API client proxy
//
// A Proxy forwards all property accesses to the lazily-created client so
// callers can use `apiClient.GET(...)` as if it were a direct object reference
// while still benefiting from lazy initialization.
// ---------------------------------------------------------------------------

export const apiClient = new Proxy({} as OpenApiClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// ---------------------------------------------------------------------------
// Exported helpers
// ---------------------------------------------------------------------------

/**
 * Mint a fresh UUIDv7 for use as an Idempotency-Key.
 * The data layer holds the key in a ref/closure across retries so the same
 * key is reused when TanStack Query retries the mutation.
 */
export function mintIdempotencyKey(): string {
  return uuidv7()
}

