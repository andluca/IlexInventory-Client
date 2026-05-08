import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '@/features/auth/LoginPage'

/**
 * Login route — X1.
 * Public; does not mount the App Shell.
 */
export const Route = createFileRoute('/login')({
  component: LoginPage,
})
