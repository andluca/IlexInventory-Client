/**
 * src/components/ErrorState.tsx
 *
 * Per docs/design/components.md §ErrorState.
 * Clay-tinted alert that reads ApiError.detail ?? ApiError.error or falls back
 * to a generic message for non-ApiError inputs. Optional retry button.
 */

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
