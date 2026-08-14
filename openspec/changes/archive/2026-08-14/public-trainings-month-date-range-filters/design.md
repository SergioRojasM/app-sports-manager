## Context

`PublicTrainingFiltersDrawer` currently renders a read-only calendar built from `new Date()` inside the component itself, and the hook filters an already-loaded, unbounded-future list of published trainings via a four-preset `dateChip` match (`today`/`tomorrow`/`this_week`/`weekend`). There is no server involvement in date filtering — `entrenamientosPublicosService.listPublicTrainings()` only applies a lower bound (`gte('fecha_hora', now)`) and returns every future published training across tenants; everything else happens client-side in `useEntrenamientosPublicosMarketplace`. This story replaces the preset model with an explicit `dateFrom`/`dateTo` range, moves calendar month state into the hook (so it survives drawer close/reopen), and makes the calendar grid interactive. No new service, query, or data model is involved.

## Goals / Non-Goals

**Goals:**
- Default the marketplace to "today → end of current month" on first load without requiring server changes.
- Give the drawer a single date-range model (`dateFrom`/`dateTo`) that both the quick chips and calendar clicks write to, so there is one source of truth for "what date filter is active".
- Make the calendar navigable indefinitely into the future, bounded at the current month going backward, using hook-owned `calendarMonth` state so navigation and selection persist across drawer close/reopen.
- Meet the accessibility bar in the User Story: real `<button>` day cells, full-date `aria-label`s, `disabled`/non-focusable past and filler days, labeled nav buttons.

**Non-Goals:**
- No server-side date filtering, pagination, or query changes to `listPublicTrainings()`.
- No timestamptz/RLS boundary math — all values compared are already-loaded `Date`/ISO strings on the client; `dateFrom`/`dateTo` are plain `YYYY-MM-DD` local strings compared against each item's local calendar date, not `bogota-date.ts`'s timestamptz helpers (those exist for server query boundaries, which this change doesn't touch).
- No visual redesign of the drawer beyond what interactivity requires — existing `landing-*` Tailwind tokens and layout are reused as-is.

## Decisions

**1. Represent the date filter as `dateFrom`/`dateTo` local date strings (`YYYY-MM-DD`), not `Date` objects, in both the type and hook state.**
Alternative considered: keep `Date` objects in state. Rejected — string state is trivially comparable (`>=`/`<=` on `YYYY-MM-DD` strings sort correctly), serializes cleanly for the "range summary text" requirement, and avoids timezone drift from `Date` mutation (the existing `matchesDateChip` code already mutates `Date` instances in place, which is the kind of bug this format sidesteps).

**2. Compare each training's local calendar date (derived from `fechaHora`) against `[dateFrom, dateTo]` using simple string/date comparison, matching the existing client-side-only filtering approach — not `bogota-date.ts`'s timestamptz boundary helpers.**
`bogota-date.ts` exists to build query-boundary ISO strings for server-side `gte`/`lte` filters. This story does zero server filtering (per the User Story's explicit call-out), so introducing timestamptz boundary math would add complexity with no corresponding query to bound. The existing pattern in this hook (`new Date(fechaHora)` compared against locally-derived boundaries) is kept, just generalized from four presets to an arbitrary range.

**3. Own `calendarMonth` in the hook, not as local `useState` in `PublicTrainingFiltersDrawer`.**
The User Story requires the displayed month to persist across drawer close/reopen without a page reload (Acceptance Criterion 12). A component-local `useState` would reset every time the drawer unmounts (it currently returns `null` when `!open`, i.e., unmounts its subtree). Lifting `calendarMonth` alongside `dateFrom`/`dateTo`/`search`/`tenantId` into the hook keeps all filter-drawer state in one place with one lifecycle, consistent with how `dateChip`/`search`/`tenantId` already live in the hook today.

**4. Chips compute a range and call the same `setDateRange` path as calendar clicks, via a single `applyDateChip(chip)` hook function; there is no persisted "active chip" state.**
Alternative considered: keep a separate `dateChip` field alongside `dateFrom`/`dateTo` to track "which chip (if any) is active" so the UI doesn't have to recompute. Rejected — deriving chip-active state by recomputing each chip's range and comparing to the current `dateFrom`/`dateTo` (as the User Story specifies) avoids a second source of truth that could desync from the range (e.g. if a user tweaks the range via calendar clicks after selecting a chip, a separately-tracked `dateChip` would go stale unless carefully cleared). `PublicTrainingDateChip` remains only as the parameter type for `applyDateChip`.

**5. Selection-in-progress state machine lives entirely in derived logic inside `setDateRange`'s caller (the drawer's day-click handler), not as extra hook state.**
The three-way branch from the User Story (no range in progress → start range; `dateFrom` set, click ≥ `dateFrom` → complete range; `dateFrom` set, click < `dateFrom` → restart) is pure logic over the existing `dateFrom`/`dateTo` values, so it needs no additional state field — the drawer computes the next `{dateFrom, dateTo}` pair from the current values and the clicked day, then calls `setDateRange(nextFrom, nextTo)` once.

## Risks / Trade-offs

- **[Risk]** Comparing local `YYYY-MM-DD` strings against `fechaHora` (an ISO timestamp, likely UTC or with offset) could misclassify a training's calendar day near midnight if the conversion to a local date string uses the wrong timezone. → **Mitigation**: derive the comparison date the same way the existing "today" calculations already do in this hook (`new Date(fechaHora)` local getters), keeping behavior consistent with the pre-existing four-chip logic rather than introducing a new timezone conversion path.
- **[Risk]** Making `calendarMonth` hook state instead of component state slightly widens the hook's public surface (four new exports: `calendarMonth`, `goToPrevMonth`, `goToNextMonth`, plus the range setters). → **Mitigation**: acceptable, mirrors the existing pattern where all other filter state (`dateChip`, `search`, `tenantId`) is already hook-owned and passed down as props.
- **[Risk]** Restart-on-earlier-click and chip-toggle-clears-to-null (not month default) are both slightly non-obvious UX rules from the User Story that are easy to get backwards during implementation. → **Mitigation**: covered explicitly as scenarios in specs.md and as manual verification steps in tasks.md.

No migration plan section — no data, schema, or deployment changes are involved; this ships as a normal frontend PR.
