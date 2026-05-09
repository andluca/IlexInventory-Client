/**
 * src/components/LoadingSkeleton.tsx
 *
 * Stack of N Mantine <Skeleton> rows for list/detail loading scaffolds.
 * role="status" + aria-busy="true" + visually hidden "Loading…" for screen readers.
 * Default height={36} matches <DataTable> row height per docs/design/components.md §42.
 *
 * Per ILE-9 Step 2. Replaces ad-hoc <Text c="dimmed">Loading…</Text> patterns.
 */

import { Box, Skeleton, Stack } from '@mantine/core'

type LoadingSkeletonProps = {
  rows?: number
  height?: number
  gap?: number
}

export function LoadingSkeleton({ rows = 5, height = 36, gap = 8 }: LoadingSkeletonProps) {
  return (
    <Box role="status" aria-busy="true">
      {/* Visually hidden text for screen readers */}
      <Box
        component="span"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Loading…
      </Box>
      <Stack gap={gap}>
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} height={height} radius="sm" />
        ))}
      </Stack>
    </Box>
  )
}
