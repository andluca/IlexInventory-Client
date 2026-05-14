# ILE-20 — Shared shell primitives: PageHeader + ErrorState + StatusBanner

Status: completed

## Overview

16 authenticated pages each repeat the same `<Group justify="space-between"><Title order={1}>X</Title><Button>Y</Button></Group>` inline. Every list/detail page handles `<Alert color="red">{ApiError.is...}</Alert>` inline. No shared primitive carries the page-header rhythm or the error-state surface. ILE-22 will adopt these across all pages — but the primitives must exist first.

This issue ships three small, net-new components:
- `<PageHeader title actions subtitle? contextTag? />` — glass-surfaced page header with optional mono context tag (SKU, lot code, PO/SO number) and entry animation.
- `<ErrorState error onRetry? />` — clay-tinted alert that reads `ApiError.detail ?? error` and optionally exposes a retry button.
- `<StatusBanner tone children />` — glass-tinted status strip (terere/amber/clay) used by recall/voided/expiring surfaces.

No existing page is touched yet — adoption lives in ILE-22.

## Surface

- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/components/PageHeader.tsx` — new (≤60 LOC)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/components/PageHeader.test.tsx` — new (5 behavioural tests)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/components/ErrorState.tsx` — new (≤60 LOC)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/components/ErrorState.test.tsx` — new (4 behavioural tests)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/components/StatusBanner.tsx` — new (≤30 LOC)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/src/components/StatusBanner.test.tsx` — new (3 behavioural tests)
- [ ] `/home/andluca/Documents/Github/IlexInventory-Client/docs/design/components.md` — add §PageHeader, §ErrorState, §StatusBanner + "Page lifecycle" subsection

**Out of scope (handled by ILE-19):** the `@keyframes page-header-in` + `[data-motion="page-header"]` CSS rule lives in `src/theme/global.css` and lands in ILE-19. `PageHeader` only sets `data-motion="page-header"` on its outer wrapper; the animation is declarative via the global rule.

## Dependencies

- **Requires** ILE-19 (`surfaces.meniscus`, `surfaces.tinted{Terere/Amber/Clay}`, motion tokens).
- **Blocks** ILE-22 (page adoption).
- **No BE dependency.** No schema regen.
- **Decision lock:** 60-LOC component cap, four-layer architecture (`src/components/` is shared infra layer — fair game).

## Plan

### `PageHeader.tsx`

```tsx
// imports: Box, Group, Stack, Title, Text from @mantine/core; ReactNode from react.

type PageHeaderProps = {
  title: string
  subtitle?: string
  contextTag?: string  // SKU / lot code / PO-N / SO-N — mono uppercase tracked-wide
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
              ff="mono"
              size="xs"
              c="dimmed"
              tt="uppercase"
              style={{ letterSpacing: '0.08em' }}
            >
              {contextTag}
            </Text>
          )}
          <Title order={1}>{title}</Title>
          {subtitle && <Text c="dimmed" size="sm">{subtitle}</Text>}
        </Stack>
        {actions}
      </Group>
    </Box>
  )
}
```

The matching CSS rule (`[data-motion='page-header'] { animation: page-header-in ... }` + `@keyframes page-header-in` + reduced-motion override) is owned by ILE-19's `global.css` changes — ILE-20 does not touch `global.css`.

### `ErrorState.tsx`

```tsx
import { Alert, Button, Stack } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { ApiError } from '@/api/errors'

type ErrorStateProps = {
  error: unknown
  onRetry?: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const message = ApiError.is(error)
    ? (error.detail ?? error.error)
    : 'An error occurred'

  return (
    <Alert
      color="red"
      variant="light"
      radius="md"
      icon={<IconAlertCircle />}
      title="Something went wrong"
      role="alert"
    >
      <Stack gap="sm">
        <span>{message}</span>
        {onRetry && (
          <Button size="xs" variant="light" onClick={onRetry} w="fit-content">
            Retry
          </Button>
        )}
      </Stack>
    </Alert>
  )
}
```

(`ApiError.is` is the existing type guard at `src/api/errors.ts` — confirm path during execution.)

### `StatusBanner.tsx`

```tsx
import { Box, Group, type MantineSize, Text } from '@mantine/core'
import type { ReactNode } from 'react'

const TONE_BG = {
  terere: 'bg-tinted-terere',
  amber: 'bg-tinted-amber',
  clay: 'bg-tinted-clay',
} as const

const TONE_BORDER = {
  terere: 'var(--mantine-other-tintedTereredBorder)',
  amber: 'var(--mantine-other-tintedAmberBorder)',
  clay: 'var(--mantine-other-tintedClayBorder)',
} as const

type StatusBannerProps = {
  tone: 'terere' | 'amber' | 'clay'
  icon?: ReactNode
  children: ReactNode
}

export function StatusBanner({ tone, icon, children }: StatusBannerProps) {
  return (
    <Box
      role="status"
      className={TONE_BG[tone]}
      style={{
        border: `1px solid ${TONE_BORDER[tone]}`,
        borderRadius: 'var(--mantine-radius-md)',
        padding: 'var(--mantine-spacing-sm) var(--mantine-spacing-md)',
      }}
    >
      <Group gap="sm">
        {icon}
        <Text size="sm">{children}</Text>
      </Group>
    </Box>
  )
}
```

(If `var(--mantine-other-tintedTereredBorder)` does not resolve through Mantine's CSS-var bridge, fall back to inline hex from `theme.other.tintedTereredBorder` read via `useMantineTheme()`. Confirm during execution.)

### Tests

**PageHeader.test.tsx** (5 behavioural):
1. Renders `title` as `<h1>`.
2. Omits subtitle when not provided.
3. Renders `contextTag` in mono with uppercase + dimmed.
4. Renders `actions` slot.
5. Carries the glass class.

**ErrorState.test.tsx** (4 behavioural):
1. Renders `ApiError.detail` when present.
2. Falls back to `ApiError.error` when `detail` is null.
3. Generic message for non-`ApiError` input.
4. `onRetry` button fires the callback when clicked.

**StatusBanner.test.tsx** (3 behavioural):
- One per tone — asserts the correct bg class + border style.

Test count: +12 (3 components × 4ish each).

### Docs — `docs/design/components.md`

Append:
- **§PageHeader** — props, motion behavior, when to use `contextTag`.
- **§ErrorState** — props, ApiError unwrapping policy.
- **§StatusBanner** — props, tone semantics (terere = healthy/committed, amber = warning, clay = destructive/recalled).
- **§Page lifecycle** — canonical pattern: `isError → <ErrorState>`, `isPending → <LoadingSkeleton>`, `empty → <EmptyState>`, `data → content`. Adopt explicitly in every list/detail page.

### Validation gates

- `tsc --noEmit` clean.
- `npm run lint` clean.
- All 6 grep gates clean (the new files are inside `src/components/` — must not import from `src/api/generated`).
- `npm test` green; ~420 → ~432.
- `npm run build` succeeds.
- Dev smoke: render a `<PageHeader title="X" actions={<Button>Y</Button>} />` inline somewhere temporarily; observe the entry animation; revert before commit.

## Acceptance criteria

- [ ] Three new components exist under `src/components/`, each ≤60 LOC (StatusBanner ≤30).
- [ ] Each has a colocated `.test.tsx` with behavioural tests; suite up by ~12.
- [ ] `global.css` has the `[data-motion="page-header"]` rule + keyframes + reduced-motion override.
- [ ] `docs/design/components.md` has §PageHeader, §ErrorState, §StatusBanner, §Page lifecycle.
- [ ] No page is modified in this issue (adoption is ILE-22).
- [ ] All gates green.

## Rollback

Revert deletes the three components + tests + the `global.css` snippet. No consumer yet → zero blast radius.

## Notes

- The `ApiError` type guard must already be importable from `src/api/errors.ts` (or wherever it currently lives — verify in execution; the existing inline pattern `ApiError.is(error)` across 16+ pages tells us the export exists).
- Keep `EmptyState` untouched in this issue — it shipped in ILE-12 + ILE-18 cleanup, and `EmptyState` and the three new primitives compose orthogonally.
