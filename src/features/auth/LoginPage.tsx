/**
 * src/features/auth/LoginPage.tsx
 *
 * Public login page (X1 flow — SPEC §3.1).
 * Shell-less layout: narrow centered card on charcoal background.
 *
 * Form: email + password, @mantine/form with Zod-style inline validators.
 * Error handling:
 *   - Client-side: "Email is required" / "Password is required"
 *   - 401 invalid_credentials → inline alert
 *   - 400 validation_error → per-field errors via form.setErrors(fields)
 * On success: invalidates ['auth','me'] → navigates to `?next` or '/'
 */

import { useState } from 'react'
import { useNavigate, useSearch, Link } from '@tanstack/react-router'
import { useForm } from '@mantine/form'
import {
  Stack,
  Title,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Alert,
  Anchor,
  Text,
  Center,
  Image,
} from '@mantine/core'
import { useLoginMutation } from '@/data/auth/mutations'
import { ApiError } from '@/api/errors'
import { sanitizeNext } from './sanitizeNext'

export function LoginPage() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { next?: string }
  const loginMutation = useLoginMutation()
  const [alertMessage, setAlertMessage] = useState<string | null>(null)

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (v) => (v.trim().length === 0 ? 'Email is required' : null),
      password: (v) => (v.length === 0 ? 'Password is required' : null),
    },
  })

  function handleSubmit(values: { email: string; password: string }) {
    setAlertMessage(null)
    loginMutation.mutate(values, {
      onSuccess: () => {
        const next = sanitizeNext(search.next)
        void navigate({ to: next, replace: true })
      },
      onError: (error) => {
        if (ApiError.is(error)) {
          if (error.fields && Object.keys(error.fields).length > 0) {
            form.setErrors(error.fields)
          } else {
            setAlertMessage(error.detail ?? error.error)
          }
        }
      },
    })
  }

  return (
    <Center mih="100vh" bg="var(--mantine-color-dark-7)">
      <Stack align="center" w="100%" maw={480} px="md">
        <Image src="/ilex_logo_v4.svg" alt="Ilex Inventory" w={64} h={64} fit="contain" />
        <Title order={2}>Ilex Inventory</Title>

        <Paper p="xl" w="100%" withBorder>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              {alertMessage && (
                <Alert color="red" variant="light">
                  {alertMessage}
                </Alert>
              )}

              <TextInput
                label="Email"
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                {...form.getInputProps('email')}
              />

              <PasswordInput
                label="Password"
                placeholder="Your password"
                autoComplete="current-password"
                {...form.getInputProps('password')}
              />

              <Button
                type="submit"
                fullWidth
                loading={loginMutation.isPending}
              >
                Log in
              </Button>
            </Stack>
          </form>
        </Paper>

        <Text size="sm" c="dimmed">
          Don&apos;t have an account?{' '}
          <Anchor component={Link} to="/signup">
            Sign up
          </Anchor>
        </Text>
      </Stack>
    </Center>
  )
}
