import { createFileRoute } from '@tanstack/react-router'
import { SignupPage } from '@/features/auth/SignupPage'

/**
 * Signup route — X2.
 * Public; does not mount the App Shell.
 */
export const Route = createFileRoute('/signup')({
  component: SignupPage,
})
