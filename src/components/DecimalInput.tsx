import { TextInput, Text } from '@mantine/core'
import type { TextInputProps } from '@mantine/core'

/**
 * <DecimalInput> — string-only decimal field.
 *
 * Replacement for Mantine's NumberInput on all money and quantity paths.
 * SPEC §2.4: "Mantine's NumberInput returns number and is therefore banned
 * for money/qty fields."
 *
 * Contract:
 * - value: string (never number)
 * - onChange: (next: string) => void (emits strings only)
 * - precision: number of decimal places (default 4, matches numeric(14,4))
 * - allowNegative: if true, accepts a leading "-" (for signed quantities — ILE-6 adjust/write-off)
 * - Validates against regex: ^\d*(\.\d{0,N})?$ (or ^-?\d*(\.\d{0,N})?$ when allowNegative)
 * - On blur:
 *   1. Strips trailing decimal point ("5." → "5")
 *   2. Collapses multi-leading-zeros on integers ("007" → "7")
 *   3. KEEPS a single leading zero before a decimal point ("0.5" stays "0.5")
 *      — stripping it would produce ".5" which breaks Decimal.js parsing.
 * - min/max: validated on blur via Decimal.js comparison
 * - unit: rendered as right-section text in text-muted; input gets tabular-nums + text-right
 * - No state owned — caller owns the string
 */

export type DecimalInputProps = {
  value: string
  onChange: (next: string) => void
  precision?: number
  min?: string
  max?: string
  unit?: 'g' | 'ml' | 'unit' | 'kg' | 'L' | string
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: TextInputProps['label']
  description?: TextInputProps['description']
  required?: boolean
  className?: string
  allowNegative?: boolean
}

export function DecimalInput({
  value,
  onChange,
  precision = 4,
  min,
  max,
  unit,
  placeholder,
  disabled,
  error,
  label,
  description,
  required,
  className,
  allowNegative = false,
}: DecimalInputProps) {
  // Build regex dynamically from precision.
  // Allows: empty string, integers, decimals up to precision places
  // Pattern: ^\d*(\.\d{0,N})?$ (or ^-?\d*(\.\d{0,N})?$ when allowNegative)
  const regex = allowNegative
    ? new RegExp(`^-?\\d*(\\.\\d{0,${precision}})?$`)
    : new RegExp(`^\\d*(\\.\\d{0,${precision}})?$`)

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value
    // Only emit if the value matches the regex or is empty
    if (regex.test(next)) {
      onChange(next)
    }
    // If it doesn't match, swallow the event (don't call onChange)
  }

  function handleBlur() {
    let normalized = value

    // 1. Trim trailing decimal point: "5." → "5"
    if (normalized.endsWith('.')) {
      normalized = normalized.slice(0, -1)
    }

    // 2. Handle leading zeros:
    //    - If the value has a decimal point ("0.5"), keep the single leading "0"
    //    - If it's an integer ("007"), collapse multiple leading zeros → "7"
    //    - Keep a single "0" as-is (don't strip to "")
    //
    //    Defensive note: the design spec says "strips leading zeros on blur"
    //    but the literal interpretation breaks "0.5" → ".5" (invalid for Decimal.js).
    //    Implement as: collapse multi-leading-zeros on integers only.
    if (normalized !== '' && !normalized.includes('.')) {
      // Integer path: strip leading zeros (but keep "0" itself)
      const withoutLeadingZeros = normalized.replace(/^0+(\d)/, '$1')
      if (withoutLeadingZeros !== normalized) {
        normalized = withoutLeadingZeros
      }
    } else if (normalized.includes('.')) {
      // Decimal path: "0.5" → keep, "00.5" → "0.5" (keep one zero before decimal)
      const withoutExtraLeadingZeros = normalized.replace(/^0{2,}(\d*\.\d*)/, '0$1')
      if (withoutExtraLeadingZeros !== normalized) {
        normalized = withoutExtraLeadingZeros
      }
    }

    // 3. Apply min/max if provided (import Decimal only when needed)
    if ((min !== undefined || max !== undefined) && normalized !== '') {
      import('decimal.js').then(({ default: Decimal }) => {
        try {
          const d = new Decimal(normalized)
          let clamped = normalized
          if (min !== undefined && d.lt(new Decimal(min))) {
            clamped = min
          }
          if (max !== undefined && d.gt(new Decimal(max))) {
            clamped = max
          }
          if (clamped !== value) {
            onChange(clamped)
          } else if (normalized !== value) {
            onChange(normalized)
          }
        } catch {
          // Invalid Decimal — emit as-is
          if (normalized !== value) {
            onChange(normalized)
          }
        }
      })
      return
    }

    // Emit normalized value if it changed
    if (normalized !== value) {
      onChange(normalized)
    }
  }

  const hasUnit = Boolean(unit)

  const rightSection = hasUnit ? (
    <Text size="sm" c="dimmed" style={{ userSelect: 'none', pointerEvents: 'none' }}>
      {unit}
    </Text>
  ) : undefined

  // Build optional props only when defined — required by exactOptionalPropertyTypes
  const optionalProps: Partial<TextInputProps> = {}
  if (placeholder !== undefined) optionalProps.placeholder = placeholder
  if (disabled !== undefined) optionalProps.disabled = disabled
  if (error !== undefined) optionalProps.error = error
  if (label !== undefined) optionalProps.label = label
  if (description !== undefined) optionalProps.description = description
  if (required !== undefined) optionalProps.required = required
  if (className !== undefined) optionalProps.className = className
  if (rightSection !== undefined) optionalProps.rightSection = rightSection
  if (hasUnit) optionalProps.rightSectionWidth = 48

  return (
    <TextInput
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      classNames={{
        input: hasUnit ? 'tabular-nums text-right' : 'tabular-nums',
      }}
      {...optionalProps}
    />
  )
}
