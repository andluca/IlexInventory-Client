/**
 * src/features/shell/CmdkPalette.tsx
 *
 * Mounts a single <Spotlight> instance inside <AppShell> alongside <Outlet>.
 * Composes three action groups: Navigate, Create, Act.
 * Keyboard shortcut "mod+K" is handled by Mantine Spotlight automatically.
 *
 * Per ILE-9 Step 7 (SPEC §3.9).
 */

import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Spotlight } from '@mantine/spotlight'
import { useManualBatchModal } from '@/stores/manual-batch-modal'
import { useActModalBus } from '@/stores/act-modal-bus'
import { buildNavigateActions } from './cmdk-items/navigate'
import { buildCreateActions } from './cmdk-items/create'
import { buildActActions } from './cmdk-items/act'
import { useCmdkContext } from './cmdk-items/useCmdkContext'

export function CmdkPalette() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const setManualBatchOpen = useManualBatchModal((s) => s.setOpen)
  const requestBus = useActModalBus((s) => s.request_)

  const ctx = useCmdkContext()

  const navigateGroup = buildNavigateActions((opts) => {
    void navigate(opts)
  })

  const createGroup = buildCreateActions(
    (opts) => { void navigate(opts) },
    () => setManualBatchOpen(true),
  )

  const actGroup = buildActActions(ctx, {
    openRecall: (batchId) => requestBus({ kind: 'recall', batchId }),
    openUnRecall: (batchId) => requestBus({ kind: 'unrecall', batchId }),
    openCommit: () => requestBus({ kind: 'commit' }),
    openVoid: (soId) => requestBus({ kind: 'void', soId }),
    openArchive: (productId) => requestBus({ kind: 'archive', productId }),
  })

  // Build the actions array — filter out empty act group
  const allGroups = [
    navigateGroup,
    createGroup,
    ...(actGroup.actions.length > 0 ? [actGroup] : []),
  ]

  return (
    <Spotlight
      actions={allGroups}
      query={query}
      onQueryChange={setQuery}
      shortcut="mod + K"
      nothingFound="No actions found"
      searchProps={{
        placeholder: 'Search or type a command…',
      }}
    />
  )
}
