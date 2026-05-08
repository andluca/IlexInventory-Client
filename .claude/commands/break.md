---
description: Break a spec into numbered issues with status tracking
argument-hint: @docs/specs/{feature}.md
---

# Break

Instructions: $ARGUMENTS

Break the spec into individual implementation issues.

1. Read the spec indicated in the instructions.
2. Create issues in `docs/issues/`, one per file, numbered with prefix (001-, 002-, etc.).
3. Each issue contains only a title and a brief overview — detailing comes in `/plan`.
4. Respect dependency order: shared primitives before features, data hooks before page composition, component contracts before consumers.

## Issue naming conventions

- `001-setup-{tooling}.md` — bootstrapping (Vite, Mantine, TanStack, MSW, etc.)
- `002-add-{component}-component.md` — shared component under `src/components/`
- `003-add-{noun}-hooks.md` — query / mutation hooks under `src/data/{domain}/`
- `004-add-{path}-page.md` — page component under `src/features/{domain}/`
- `005-wire-{path}-route.md` — TanStack Router wiring under `src/routes/`
- `006-integrate-{module}-with-{other}.md` — cross-cutting integration

## Create status.md

After creating the issues, generate `docs/issues/status.md`:

```markdown
# Project Status

Last updated: {timestamp}

## Issues

- [ ] 001-issue-name.md - pending
- [ ] 002-issue-name.md - pending
- [ ] 003-issue-name.md - pending

## Summary

Total: X issues
Completed: 0
In progress: 0
Pending: X
Failed: 0

## Execution Log

(Entries added as issues are processed)

## Notes

(Decisions, blockers, relevant observations)
```

5. Keep the issue count manageable — if scope generates more than 10 issues, the spec probably needs to be split into phases.
