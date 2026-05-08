/**
 * src/features/auth/SignupPage.tsx
 *
 * Public sign-up page (X2 flow — SPEC §3.1).
 * Single-step form: email + password. No confirmation field, no email verification.
 * 409 duplicate_email → inline error under email; "Already have an account? Log in" stays visible.
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
import { useSignupMutation } from '@/data/auth/mutations'
import { ApiError } from '@/api/errors'
import { sanitizeNext } from './sanitizeNext'

export function SignupPage() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { next?: string }
  const signupMutation = useSignupMutation()
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
    signupMutation.mutate(values, {
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
                placeholder="Choose a password"
                autoComplete="new-password"
                {...form.getInputProps('password')}
              />

              <Button type="submit" fullWidth loading={signupMutation.isPending}>
                Sign up
              </Button>
            </Stack>
          </form>
        </Paper>

        <Text size="sm" c="dimmed">
          Already have an account?{' '}
          <Anchor component={Link} to="/login">
            Log in
          </Anchor>
        </Text>
      </Stack>
    </Center>
  )
}
