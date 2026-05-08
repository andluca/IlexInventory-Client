---
name: tdd
description: TDD cycle and test-type guide for the Ilex frontend (Vitest + Testing Library + MSW + Playwright smoke). Use when writing or planning code under src/, when adding a test, or when deciding which test type fits a feature. Do NOT use for backend testing or other repos.
---

# TDD discipline — Ilex frontend

## The cycle

1. **Red.** Write the smallest failing test that exercises one fact. Run it; confirm it fails for the right reason (assertion mismatch, missing export — not a syntax error or missing test runner).
2. **Green.** Write the minimum code that passes. Hardcoded returns are fine on iteration one. Add the next fact's test; triangulate.
3. **Refactor.** Improve the design. By now you've walked the full logic and can see what wasn't visible from the empty file: the helper hiding inside, the conditional that's secretly the general rule, the provisional name, the prop that fights its caller. Tests staying green is the safety net; improving the code is the goal.

Skipping refactor turns TDD into iteration.

## Test types

| Type | Location | Tests | HTTP |
|---|---|---|---|
| Unit | colocated `*.test.ts` | Pure logic — formatters, money/qty math, URL builders, mappers. | No |
| Hook | colocated `*.test.tsx` | One TanStack Query hook — fetch, mutate, cache invalidation, idempotency-key plumbing. | MSW |
| Component | colocated `*.test.tsx` | One component — render, interactions, form validation, a11y roles. | No (props only) |
| Page / feature | `src/features/{domain}/__tests__/` | A page composing hooks + components — wired through providers. | MSW |
| E2E smoke | `tests/e2e/` | Critical flows (login → SO commit → recall). | Real BE in dev mode |

## State pattern

Component and page tests describe state declaratively via MSW handlers. Spec `States` blocks (empty / loading / error / populated / confirmation, per [`docs/specification.md`](../../../docs/specification.md)) translate to MSW handler bundles + a `setupServer` per test.

```tsx
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@testing-library/react';
import { ProductsListPage } from '../ProductsListPage';
import { renderWithProviders } from 'src/test/render';

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('renders empty state when no products exist', async () => {
  server.use(
    http.get('*/api/v1/products', () =>
      HttpResponse.json({ results: [], next: null })
    ),
  );
  renderWithProviders(<ProductsListPage />);
  expect(await screen.findByText(/no products yet/i)).toBeInTheDocument();
});
```

`renderWithProviders` wraps Mantine, TanStack Query (with a fresh client per test), TanStack Router (memory history), and the agent context.

## Hook tests with `renderHook`

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useProductList } from 'src/data/catalog/queries';
import { wrapWithProviders } from 'src/test/render';

test('useProductList returns paginated products', async () => {
  server.use(/* MSW handler */);
  const { result } = renderHook(() => useProductList({ archived: false }), {
    wrapper: wrapWithProviders,
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.results).toHaveLength(2);
});
```

## Mandatory tests

- **Owner-isolation**: every detail route gets a 404 variant (server returns 404 → page renders "Not found"). Don't distinguish cross-owner from never-existed.
- **Terminal mutation idempotency**: every terminal mutation hook gets a test asserting the `Idempotency-Key` header is present (and stable across retries within the same attempt).
- **409 stale-state**: every terminal mutation hook gets a 409 test asserting refetch fires + the toast surfaces the right wording (per `ilex-discipline` skill, errors section).
- **Money / qty paths**: every form that submits money or qty gets a test with a precision-sensitive value (e.g. `"0.0001"`) round-tripping correctly as a string. No `number` math.
- **Refactor pass**: every Green has a follow-up commit that improves design without changing behavior.

## Run

```bash
npm test                                 # vitest watch
npm test -- --run                        # one-shot
npm test -- src/data/catalog             # one folder
npm test -- -t "renders empty state"     # by name
npm run test:e2e                         # playwright
```

## Pitfalls

- Snapshot tests for component output. They drift, hide intent, and rot. Behavior tests over snapshots — assert what the user sees / can do.
- Mocking the generated client. Mock the network (MSW); the client is not the seam.
- Mocking `useQuery` itself. Use a real QueryClient + MSW; that's where bugs hide.
- Asserting on internal state (`result.current.queryKey`) instead of observable behavior.
- Testing Mantine internals (e.g. that `Modal` renders a portal). Test your code, not the library.
- Building test state by calling the mutation under test. Set MSW state directly.
- Skipping the 404 / 409 variants because they "obviously work."
