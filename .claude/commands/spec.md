---
description: Create a Page spec (or component / hook spec) for the Ilex client following docs/specification.md
argument-hint: description of the page or feature
---

# Spec

Instructions: $ARGUMENTS

Create a spec for the described page, component, or data hook.

1. Read [`docs/specs/SPEC.md`](../../docs/specs/SPEC.md) to confirm the surface this spec belongs to (page enumeration, realized flow IDs, consumed endpoints).
2. Read [`docs/specification.md`](../../docs/specification.md) for the format definitions. **Page spec** is the bridge between Functional and Technical — most specs are Page specs.
3. Consult the `ilex-discipline` skill for layer rules and the `tdd` skill if testing patterns are relevant.
4. Create a file `docs/specs/{feature-or-page}.md`. Slug from the route path when it's a Page spec (e.g. `/sales-orders/new` → `sales-orders-new.md`).

## Page spec structure (from `docs/specification.md`)

```markdown
# `{path}`

{One-paragraph description of what the page does and who uses it.}

## Realizes
{Flow IDs (F-N) + read view IDs (R-N) the page implements, with one-line context per ID.}

## Data
### Reads
- `{HTTP} {endpoint}` — what for, which hook (`use{Noun}Query`)
### Writes
- `{HTTP} {endpoint}` — what for, which hook (`use{Verb}{Noun}Mutation`), Idempotency-Key (if required)

## States
- **Empty** — when, what's shown
- **Loading** — skeleton / spinner shape
- **Error** — 4xx envelope rendering, 409 stale-state behavior
- **Populated** — primary affordances visible
- **Confirmation modal(s)** — for terminal mutations (per `docs/product.md` UX patterns)

## Modes (optional)
{Floor / Standard differences if any.}

## Examples
{Concrete user scenarios with Visit / Click / See / Submit steps.}

### Example: {scenario name}
- **Visit:** `{path}`
- **See:** {visible state}
- **Click:** {affordance}
- **Submit:** {form / action}
- **See:** {resulting state}
```

## Notes

- Spec lands **before** code. If reality diverges, update the spec first.
- States are required. Examples are required. Skipping either turns the spec into a wishlist.
- Reference [`docs/decisions.md`](../../docs/decisions.md) by number (D-N or BE-D-N); don't restate rationale.
- For non-Page specs (Component, Hook, Modal/Workflow, App), use the format definition from `docs/specification.md` if it exists. If it doesn't yet, **add the format definition there first**, then write your spec — formats are added the first time we write a spec of that kind.
- Focus on MVP. Iterate later. The job is alignment with the implementer, not exhaustive enumeration.
