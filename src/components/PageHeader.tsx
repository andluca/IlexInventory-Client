/**
 * src/components/PageHeader.tsx
 *
 * Per docs/design/components.md §PageHeader.
 * Glass-surfaced page header with optional context tag (SKU/lot/PO-N/SO-N),
 * subtitle, and actions slot. Entry animation via [data-motion="page-header"]
 * declared in global.css (ILE-19).
 */

import { Box, Group, Stack, Title, Text } from '@mantine/core'
import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  subtitle?: string | undefined
  /** SKU / lot code / PO-N / SO-N — mono uppercase tracked-wide */
  contextTag?: string | undefined
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, contextTag, actions }: PageHeaderProps) {
  return (
    <Box
      data-motion="page-header"
      className="bg-surface-elevated backdrop-blur-elevated"
      style={{
        borderTop: 'var(--mantine-other-meniscus, 1px solid rgb(255 255 255 / 0.04))',
        border: '1px solid var(--mantine-color-dark-4)',
        borderRadius: 'var(--mantine-radius-lg)',
        padding: 'var(--mantine-spacing-lg)',
      }}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Stack gap="xs">
          {contextTag && (
            <Text
              ff="monospace"
              size="xs"
              c="dimmed"
              tt="uppercase"
              style={{ letterSpacing: '0.08em' }}
            >
              {contextTag}
            </Text>
          )}
          <Title order={1}>{title}</Title>
          {subtitle && (
            <Text c="dimmed" size="sm">
              {subtitle}
            </Text>
          )}
        </Stack>
        {actions}
      </Group>
    </Box>
  )
}
