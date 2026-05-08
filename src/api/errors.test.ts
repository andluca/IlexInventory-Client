import { describe, expect, it } from 'vitest'
import { ApiError } from './errors'

describe('ApiError', () => {
  it('is an instance of Error', () => {
    const err = new ApiError({ status: 400, error: 'bad_request' })
    expect(err).toBeInstanceOf(Error)
  })

  it('is an instance of ApiError', () => {
    const err = new ApiError({ status: 400, error: 'bad_request' })
    expect(err).toBeInstanceOf(ApiError)
  })

  it('sets message to detail when detail is provided', () => {
    const err = new ApiError({
      status: 400,
      error: 'duplicate_email',
      detail: 'Already used',
    })
    expect(err.message).toBe('Already used')
  })

  it('falls back to error code when detail is absent', () => {
    const err = new ApiError({ status: 400, error: 'duplicate_email' })
    expect(err.message).toBe('duplicate_email')
  })

  it('preserves status', () => {
    const err = new ApiError({ status: 422, error: 'shortfall' })
    expect(err.status).toBe(422)
  })

  it('preserves the machine error code', () => {
    const err = new ApiError({ status: 409, error: 'already_received' })
    expect(err.error).toBe('already_received')
  })

  it('preserves detail string', () => {
    const err = new ApiError({
      status: 409,
      error: 'already_received',
      detail: 'This PO has already been received.',
    })
    expect(err.detail).toBe('This PO has already been received.')
  })

  it('preserves fields shape', () => {
    const err = new ApiError({
      status: 400,
      error: 'validation_error',
      fields: { email: 'taken', password: 'too short' },
    })
    expect(err.fields).toEqual({ email: 'taken', password: 'too short' })
  })

  it('has undefined fields when not provided', () => {
    const err = new ApiError({ status: 401, error: 'not_authenticated' })
    expect(err.fields).toBeUndefined()
  })

  describe('ApiError.is()', () => {
    it('returns true for an ApiError instance', () => {
      const err = new ApiError({ status: 400, error: 'bad_request' })
      expect(ApiError.is(err)).toBe(true)
    })

    it('returns false for a plain Error', () => {
      expect(ApiError.is(new Error('plain error'))).toBe(false)
    })

    it('returns false for a non-Error value', () => {
      expect(ApiError.is('not an error')).toBe(false)
      expect(ApiError.is(null)).toBe(false)
      expect(ApiError.is(undefined)).toBe(false)
      expect(ApiError.is({ status: 400 })).toBe(false)
    })
  })
})
