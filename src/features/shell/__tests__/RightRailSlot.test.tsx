/**
 * src/features/shell/__tests__/RightRailSlot.test.tsx
 *
 * TDD for ILE-9 Step 5 — RightRailSlot wired to useAgentPanel store.
 * 2 tests:
 *  1. setOpen(true) expands the rail (shows full panel)
 *  2. setPrefilledQuery('hello') populates the TextInput value
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from '@/theme/mantine'
import { RightRailSlot } from '../RightRailSlot'
import { useAgentPanel } from '@/stores/agent-panel'

function renderSlot() {
  return render(
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <RightRailSlot />
    </MantineProvider>,
  )
}

beforeEach(() => {
  useAgentPanel.setState({ open: false, prefilledQuery: '' })
})

describe('RightRailSlot', () => {
  it('setOpen(true) expands the rail showing the Ask Ilex panel', () => {
    useAgentPanel.setState({ open: true })
    renderSlot()

    // With open=true the full panel renders, showing the "Ask Ilex" heading
    expect(screen.getAllByText(/ask ilex/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('textbox', { name: /ask ilex/i })).toBeInTheDocument()
  })

  it('setPrefilledQuery("hello") populates the TextInput value', () => {
    useAgentPanel.setState({ open: true, prefilledQuery: 'hello' })
    renderSlot()

    const input = screen.getByRole('textbox', { name: /ask ilex/i })
    expect(input).toHaveValue('hello')
  })
})
