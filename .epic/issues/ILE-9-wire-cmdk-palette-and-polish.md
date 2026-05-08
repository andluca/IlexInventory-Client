---
id: ILE-9
github_id: null
status: open
assignee: null
state: Queued
type: item
depends_on: [ILE-8]
---

# ILE-9 Wire ⌘K command palette + polish pass

## Overview

Fill the Mantine Spotlight (⌘K + Ctrl+K) categories left as a shell in ILE-3 per SPEC §3.9: **Navigate** (every page in §2.7), **Create** (new PO, new SO, new product, manual batch), **Act** (context-aware: recall this batch when on `/batches/:id`, commit this SO when on SO draft, void this SO when on SO detail post-commit, archive product when on product detail with batches), **Agent** (open panel + prefill query — stub in v1 since the panel ships empty; fully wired in the deferred Phase 3 issue). Polish pass: empty states with agent-prompt copy ("Want me to import from CSV?" per `product.md` UX patterns), error boundaries on every route (4xx envelope rendering, 5xx generic fallback), loading skeletons (Mantine `Skeleton`) on every list and detail, floor-mode QA across all feature pages (row heights, contrast, touch-target sizes), accessibility pass (focus order, ARIA roles, keyboard navigation in modals + table sort).

## Surface

- [ ] `src/features/shell/CmdkPalette.tsx`, `cmdk-items/{navigate,create,act,agent}.ts`
- [ ] `src/components/ErrorBoundary.tsx`, `EmptyState.tsx`, `LoadingSkeleton.tsx`
- [ ] Floor-mode visual review across all feature pages (catalog, procurement, inventory, sales, financials, dashboard)
- [ ] a11y assertions added to component tests
- [ ] Tests: ⌘K opens on shortcut, context-aware Act items only show when relevant, EmptyState renders agent-prompt copy

## Dependencies

- ILE-8 (financials + CSV exports)
