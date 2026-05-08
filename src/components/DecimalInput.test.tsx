import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { DecimalInput } from './DecimalInput'

describe('<DecimalInput>', () => {
  it('renders with the supplied value', () => {
    renderWithProviders(<DecimalInput value="100.0000" onChange={vi.fn()} />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('100.0000')
  })

  it('emits string on change (never number)', () => {
    const onChange = vi.fn()
    renderWithProviders(<DecimalInput value="" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '50.5' } })
    expect(onChange).toHaveBeenCalledWith('50.5')
    // Ensure it's a string, never a number
    expect(typeof onChange.mock.calls[0]?.[0]).toBe('string')
  })

  it('rejects characters that violate the regex (letters)', () => {
    const onChange = vi.fn()
    renderWithProviders(<DecimalInput value="5" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'abc' } })
    // onChange should NOT be called when invalid input is entered
    expect(onChange).not.toHaveBeenCalled()
  })

  it('respects custom precision — rejects too many decimal places', () => {
    const onChange = vi.fn()
    renderWithProviders(<DecimalInput value="" onChange={onChange} precision={2} />)
    const input = screen.getByRole('textbox')
    // "5.123" has 3 decimal places, which exceeds precision=2
    fireEvent.change(input, { target: { value: '5.123' } })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('allows valid input at custom precision', () => {
    const onChange = vi.fn()
    renderWithProviders(<DecimalInput value="" onChange={onChange} precision={2} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '5.12' } })
    expect(onChange).toHaveBeenCalledWith('5.12')
  })

  it('normalizes trailing dot on blur ("5." → "5")', () => {
    const onChange = vi.fn()
    renderWithProviders(<DecimalInput value="5." onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith('5')
  })

  it('preserves a single leading zero before decimal ("0.5" survives blur as "0.5")', () => {
    const onChange = vi.fn()
    renderWithProviders(<DecimalInput value="0.5" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.blur(input)
    // "0.5" should remain "0.5" — not stripped to ".5"
    // onChange may not be called if value is already normalized, or called with "0.5"
    const calls = onChange.mock.calls
    if (calls.length > 0) {
      expect(calls[0]?.[0]).toBe('0.5')
    }
    // Input should still display "0.5"
    expect(input).toHaveValue('0.5')
  })

  it('collapses multiple leading zeros on integers ("007" → "7")', () => {
    const onChange = vi.fn()
    renderWithProviders(<DecimalInput value="007" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith('7')
  })

  it('renders the unit suffix when supplied', () => {
    renderWithProviders(<DecimalInput value="1.5" onChange={vi.fn()} unit="kg" />)
    expect(screen.getByText('kg')).toBeInTheDocument()
  })

  it('applies tabular-nums class when unit is set', () => {
    renderWithProviders(<DecimalInput value="1.5" onChange={vi.fn()} unit="kg" />)
    const input = screen.getByRole('textbox')
    expect(input.className).toMatch(/tabular-nums/)
  })

  it('surfaces the error prop', () => {
    renderWithProviders(
      <DecimalInput value="" onChange={vi.fn()} error="Value is required" />,
    )
    expect(screen.getByText('Value is required')).toBeInTheDocument()
  })

  it('round-trips a precision-sensitive value without 1e-4 exponent leakage', () => {
    // The critical invariant: "0.0001" must render and emit as a string literal,
    // never converted to the exponential "1e-4" that JS floats would produce.
    const onChange = vi.fn()
    // Start with empty value; we'll type the precision-sensitive value
    renderWithProviders(<DecimalInput value="" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    // Type "0.0001" — the regex allows 4 decimal places (default precision)
    fireEvent.change(input, { target: { value: '0.0001' } })
    // Must have been called with the exact string "0.0001", not "1e-4"
    expect(onChange).toHaveBeenCalledWith('0.0001')
    const emittedValue = onChange.mock.calls[0]?.[0] as string
    expect(emittedValue).not.toContain('e')
    expect(emittedValue).not.toContain('E')
    // Also verify the component renders a pre-supplied "0.0001" correctly
    const { unmount } = renderWithProviders(<DecimalInput value="0.0001" onChange={vi.fn()} />)
    const renderedInput = screen.getAllByRole('textbox').at(-1)!
    expect(renderedInput).toHaveValue('0.0001')
    unmount()
  })

  it('is disabled when the disabled prop is set', () => {
    renderWithProviders(<DecimalInput value="1.0" onChange={vi.fn()} disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('renders placeholder text when provided', () => {
    renderWithProviders(<DecimalInput value="" onChange={vi.fn()} placeholder="Enter qty" />)
    expect(screen.getByPlaceholderText('Enter qty')).toBeInTheDocument()
  })
})
