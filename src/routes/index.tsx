import { createFileRoute, Link } from '@tanstack/react-router'
import { Title, Text, Stack, Anchor } from '@mantine/core'

/**
 * Index route — minimal placeholder.
 * Proves the router works and `npm run dev` boots cleanly.
 * The real dashboard lands in issue 009 (after auth + shell are in place).
 *
 * The `floor:h-row-floor` class on the wrapper demonstrates the Tailwind
 * `floor:` variant compiles without error (acceptance criterion).
 */
export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  return (
    <Stack p="xl" align="center" justify="center" mih="100vh">
      <Title order={1}>Ilex Inventory</Title>
      <Text c="dimmed">Dashboard coming in issue 009.</Text>
      {/* floor: variant smoke test — invisible but confirms compilation */}
      <div className="h-row-default floor:h-row-floor" aria-hidden="true" />
      <Anchor component={Link} to="/login">
        Go to Login →
      </Anchor>
    </Stack>
  )
}
