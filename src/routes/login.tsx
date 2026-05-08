import { createFileRoute } from '@tanstack/react-router'
import { Stack, Image, Text, Title } from '@mantine/core'

/**
 * Login route — placeholder.
 * Renders the brand mark and a note that auth lands in issue 003.
 *
 * Acceptance criterion: `npm run dev` → `/login` renders + shows the brand mark.
 */
export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <Stack align="center" justify="center" mih="100vh" p="xl" bg="var(--mantine-color-dark-7)">
      <Image
        src="/ilex_logo_v4.svg"
        alt="Ilex Inventory"
        w={80}
        h={80}
        fit="contain"
      />
      <Title order={2} mt="md">
        Ilex Inventory
      </Title>
      <Text c="dimmed" size="sm">
        Login coming in issue 003.
      </Text>
    </Stack>
  )
}
