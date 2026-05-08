/**
 * src/utils/csv-export.ts
 *
 * Builder for CSV download anchor `href` values — the ONLY sanctioned bare-HTTP
 * path in the FE (per SPEC §2.5). The caller renders `<a href={csvExportUrl(...)} download>`;
 * the browser navigates with the session cookie attached.
 *
 * No fetch, no DOM manipulation, no openapi-fetch involvement.
 * The CI grep gate for "no bare fetch outside data layer" explicitly exempts this file.
 */

// ---------------------------------------------------------------------------
// Allowlist
//
// Restricted to the four CSV-capable endpoints from SPEC §2.5.
// Any other path throws immediately so misuse is loud at the call site.
// ---------------------------------------------------------------------------

/**
 * Path prefixes that support ?format=csv (SPEC §2.5).
 * Dynamic segments (e.g. /batches/b-1/recall-report) are matched by prefix.
 */
const CSV_PATH_ALLOWLIST: readonly string[] = [
  '/financials/dashboard',
  '/financials/margin',
  '/movements',
  '/batches/', // e.g. /batches/{id}/recall-report
]

function isAllowedPath(path: string): boolean {
  return CSV_PATH_ALLOWLIST.some((allowed) => {
    // Exact match (e.g. '/movements') or prefix match for dynamic paths (e.g. '/batches/')
    return path === allowed || path.startsWith(allowed)
  })
}

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

/**
 * Build the CSV export URL for a supported endpoint.
 *
 * @param path    The endpoint path relative to VITE_API_BASE_URL.
 *                Must be one of the allowlisted CSV endpoints (SPEC §2.5):
 *                `/financials/dashboard`, `/financials/margin`,
 *                `/movements`, `/batches/{id}/recall-report`.
 * @param params  Optional query params. `undefined` values are dropped.
 *                Values are URL-encoded. `format=csv` is always appended last.
 * @returns       Absolute URL string suitable for use in `<a href download>`.
 * @throws        When `path` is not in the CSV allowlist — misuse is loud.
 */
export function csvExportUrl(
  path: string,
  params?: Record<string, string | number | undefined>,
): string {
  if (!isAllowedPath(path)) {
    throw new Error(
      `csvExportUrl: '${path}' is not in the CSV export allowlist. ` +
        'Allowed paths: /financials/dashboard, /financials/margin, /movements, /batches/{id}/recall-report. ' +
        'If a new CSV endpoint is needed, update the allowlist in src/utils/csv-export.ts after updating SPEC §2.5.',
    )
  }

  // Build query string from provided params (dropping undefined values).
  const qs = new URLSearchParams()
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        qs.set(key, String(value))
      }
    }
  }
  // Always append format=csv last.
  qs.set('format', 'csv')

  return `${BASE_URL}${path}?${qs.toString()}`
}
