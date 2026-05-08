/**
 * src/features/shell/RequireAuth.tsx
 *
 * Route guard. Reads useAuthMe and:
 *   - isLoading → full-page Loader (prevents flash of unauthenticated content)
 *   - 401 error → navigate to /login?next=<currentPath> (via useEffect)
 *   - any other error → bubbles to root error boundary (5xx shouldn't log users out)
 *   - data → renders children
 */

import { type ReactNode, useEffect } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { Center, Loader } from '@mantine/core'
import { useAuthMe } from '@/data/auth/queries'
import { ApiError } from '@/api/errors'

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isLoading, error, data } = useAuthMe()
  const navigate = useNavigate()
  const location = useLocation()

  const is401 = error !== null && ApiError.is(error) && error.status === 401

  useEffect(() => {
    if (is401) {
      void navigate({
        to: '/login',
        search: { next: location.pathname },
        replace: true,
      })
    }
  }, [is401, navigate, location.pathname])

  if (isLoading || is401) {
    // Show loader while loading OR while waiting for the 401 redirect to fire
    return (
      <Center mih="100vh">
        <Loader />
      </Center>
    )
  }

  // Any other error (5xx) — bubble to root error boundary.
  // TanStack Router will catch it via the route's errorComponent.
  if (error) {
    throw error
  }

  if (data) {
    return <>{children}</>
  }

  // Fallback (shouldn't reach here)
  return (
    <Center mih="100vh">
      <Loader />
    </Center>
  )
}
