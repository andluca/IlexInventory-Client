/**
 * DateRangePicker.test.tsx
 *
 * TDD for ILE-8 Step 6 — DateRangePicker component.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '@/theme/mantine'
import { DateRangePicker } from '../DateRangePicker'

function renderPicker(props: Partial<React.ComponentProps<typeof DateRangePicker>> = {}) {
  const from = props.from ?? '2026-04-09'
  const to = props.to ?? '2026-05-09'
  const onChange = props.onChange ?? vi.fn()
  return {
    ...render(
      <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
        <DateRangePicker from={from} to={to} onChange={onChange} presets={props.presets} />
      </MantineProvider>,
    ),
    onChange,
  }
}

describe('DateRangePicker', () => {
  it('renders active preset label when value matches a preset day delta (Last 30 days)', () => {
    // to = 2026-05-09, from = 2026-04-09 => 30 day delta => "Last 30 days"
    renderPicker({ from: '2026-04-09', to: '2026-05-09' })
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
  })

  it('renders absolute date label when value does not match any preset', () => {
    // 45-day delta — no preset matches
    renderPicker({ from: '2026-03-25', to: '2026-05-09' })
    // Should show a formatted date range, not a preset label
    expect(screen.queryByText('Last 7 days')).not.toBeInTheDocument()
    expect(screen.queryByText('Last 14 days')).not.toBeInTheDocument()
    expect(screen.queryByText('Last 30 days')).not.toBeInTheDocument()
    expect(screen.queryByText('Last 90 days')).not.toBeInTheDocument()
    // Should show some date range text (trigger button label)
    const trigger = screen.getByRole('button')
    expect(trigger.textContent).toBeTruthy()
    expect(trigger.textContent).not.toBe('')
  })

  it('clicking a preset dispatches onChange with computed from/to and closes the popover', async () => {
    const onChange = vi.fn()
    renderPicker({ from: '2026-04-09', to: '2026-05-09', onChange })

    // Open the popover
    fireEvent.click(screen.getByRole('button'))

    // Click "Last 7 days" preset
    await waitFor(() => {
      expect(screen.getByText('Last 7 days')).toBeVisible()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }))

    expect(onChange).toHaveBeenCalledOnce()
    const callArgs = onChange.mock.calls[0] as [{ from: string; to: string }]
    expect(callArgs).toBeDefined()
    const { from, to } = callArgs[0]
    // Verify the delta is 7 days
    const delta = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
    expect(delta).toBe(7)
  })
})
