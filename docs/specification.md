# Ilex Client Specification Format

This document defines the **spec system** for describing the Ilex client's pages, components, and data flows. Specs are written before code; code follows the spec; if reality diverges, update the spec first.

Scope: this file holds the **format definitions**. Concrete specs (per page, per feature, per hook) live alongside the code or under `docs/specs/` once needed. We add new formats here only when we actually need them — not preemptively.

---

## Categories

Specs split into two:

**Functional** — what the client surfaces, from the owner's perspective. Hierarchical: a page realizes flows; modes modify pages.

**Technical** — how the client is built. Flat catalog: feature components, data hooks, stores, generated clients.

**Page is the bridge.** It's the leaf of the Functional hierarchy and the unit Technical specs reference. Most specs we write will be Page specs.

---

## Principles

- **Specs land before code.** A spec defines what gets built; implementation follows.
- **Page is the bridge** between Functional and Technical specs.
- Functional specs describe *what*; Technical specs describe *how*.
- State changes are explicit in examples (initial → action → resulting state).
- Specs reference [`decisions.md`](decisions.md) by number; they don't restate rationale.
- Formats are minimal, consistent, and grow iteratively. New format types land here the first time we write a spec of that kind.

---

## Page Specification Format

The first format we need.

### Structure

1. Heading whose title is **`{path}`** (route URL)
2. A one-paragraph description
3. **Realizes** — flow IDs (F-N) and read view IDs (R-N) the page implements
4. **Data** — read endpoints (queries) + write endpoints (mutations) the page uses
5. **States** — empty, loading, error, populated; action-confirmation modals
6. **Modes** (optional) — floor / standard differences if any
7. **Examples** — concrete user scenarios with `Visit` / `Click` / `See` / `Submit` steps

### Step keywords

- **Visit:** user navigates to the page
- **Click:** user interacts (button, link, row)
- **See:** verification of visible state (text, table row, badge)
- **Submit:** form submission (PO receive, SO commit, recall, etc.)

### Example

(Lands the first time a concrete page spec is written.)

---

## Component Specification Format

Graduated when the design-system primitives landed (see [`docs/design/components.md`](design/components.md), which catalogs them in one consolidated file rather than per-file specs to keep artifact density manageable). Use the per-file format below when a component is complex enough to deserve its own spec.

### Structure

1. Heading **`<{ComponentName}>`** in code style
2. **File** — implementation path
3. **Used in** — archetype IDs (A1–A6) or page paths
4. **Props** — TypeScript signature in a fenced block
5. **Visual states** — default / hover / focus / disabled / loading / error / empty
6. **Behavior** — interactions, debouncing, keyboard, focus management
7. **Polish targets** — what to elevate beyond the prototype baseline (cite [`docs/design/`](design/) artifacts)

### Example

See any entry in [`docs/design/components.md`](design/components.md). They are written in this format, just consolidated into one file.

---

## To be added when we need them

The following format definitions will land here the first time we write a spec of that kind. We don't predefine formats we haven't used.

- **Hook spec** — for data hooks (queries, mutations) in `src/data/`
- **Modal / Workflow spec** — for cross-page workflows (CSV import, agent chat, sign-up)
- **App spec** — when the page catalog stabilizes; useful as a manifest
