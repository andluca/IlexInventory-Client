/**
 * src/components/ErrorBoundary.tsx
 *
 * Class component error boundary. Catches render-time crashes in subtree.
 * Two fallbacks:
 *  - ApiError 4xx → shows the BE envelope copy (user-readable)
 *  - Anything else → generic "Something went wrong" + Reload button
 *
 * Mount once in _authed.tsx wrapping <Outlet />.
 * Per-widget error states (e.g. FinancialSummary's inline <Alert>) are NOT replaced.
 *
 * componentDidCatch calls console.error for dev debugging / future Sentry hook.
 *
 * Per ILE-9 Step 3.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Alert, Button, Stack, Text } from '@mantine/core'
import { ApiError } from '@/api/errors'

type Props = {
  children: ReactNode
}

type State = {
  error: unknown
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state

    if (error) {
      if (ApiError.is(error) && error.status >= 400 && error.status < 500) {
        return (
          <Stack p="xl">
            <Alert color="red">{error.detail ?? error.error}</Alert>
            <Button variant="subtle" onClick={this.handleRetry}>
              Try again
            </Button>
          </Stack>
        )
      }

      return (
        <Stack p="xl">
          <Text>Something went wrong. Reload the page.</Text>
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Button variant="subtle" onClick={this.handleRetry}>
            Try again
          </Button>
        </Stack>
      )
    }

    return this.props.children
  }
}
