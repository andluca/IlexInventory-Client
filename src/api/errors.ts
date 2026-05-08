/**
 * src/api/errors.ts
 *
 * Typed error class for the BE 4xx envelope:
 *   { error: ErrorCode, detail?: string, fields?: Record<string, string> }
 *
 * Thrown by the apiClient response middleware on any response >= 400.
 * TanStack Query routes the thrown error into the `error` state with a typed shape.
 */

export interface ApiErrorInit {
  status: number
  error: string
  detail?: string
  fields?: Record<string, string>
}

export class ApiError extends Error {
  /** HTTP status code (e.g. 400, 401, 409, 422) */
  readonly status: number

  /** Machine-readable error code from the BE envelope (e.g. 'duplicate_email', 'shortfall') */
  readonly error: string

  /** Human-readable message from the BE envelope (may be undefined) */
  readonly detail: string | undefined

  /** Per-field validation errors (e.g. { email: 'taken' }). Undefined when not present. */
  readonly fields: Record<string, string> | undefined

  constructor({ status, error, detail, fields }: ApiErrorInit) {
    // message = detail if present, otherwise the machine error code
    super(detail ?? error)
    this.name = 'ApiError'
    this.status = status
    this.error = error
    this.detail = detail
    this.fields = fields

    // Restore prototype chain for instanceof checks across transpiler boundaries
    Object.setPrototypeOf(this, new.target.prototype)
  }

  /**
   * Type guard: returns true when the value is an ApiError instance.
   * Prefer this over `instanceof ApiError` in catch blocks for safety across module boundaries.
   */
  static is(err: unknown): err is ApiError {
    return err instanceof ApiError
  }
}
