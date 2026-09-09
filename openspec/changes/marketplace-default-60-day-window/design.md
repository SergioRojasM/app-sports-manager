## Context

`useEntrenamientosPublicosMarketplace.ts` already loads the full unbounded-future list of published trainings once (`listPublicTrainings()`) and applies all filtering — date range, tenant, search — client-side via `filteredItems` (`useMemo`). US-0102 introduced `dateFrom`/`dateTo` range filtering, quick chips, and a navigable calendar drawer, defaulting on mount to "today → end of current calendar month" via `endOfCurrentMonthKey`. This change only touches the *initial default values* of that existing filter state and adds one derived boolean plus one UI note — it does not touch the filtering mechanism, the drawer, or the service layer.

## Goals / Non-Goals

**Goals:**
- Make the default `dateTo` a fixed 60-day-from-today boundary instead of "end of current month," so the default window size is constant regardless of what day of the month the page loads.
- Let the page communicate, in plain text, that a 60-day scope is active and that the existing date filter can be used to see more.
- Keep the note accurate at all times by deriving it from live filter state rather than a one-time flag, so it never lies about what's currently shown.

**Non-Goals:**
- Changing how filtering itself works (`filteredItems`, `PublicTrainingFiltersDrawer` calendar/chips/range logic) — all reused unchanged from US-0102.
- Adding server-side date bounding to `listPublicTrainings()` — out of scope per US-0102's existing "separate story if it becomes a performance concern" note, unchanged here.
- Persisting note dismissal or any per-user preference — the note is stateless UI, always recomputed.

## Decisions

**1. Compute the 60-day boundary with local `Date` arithmetic, reusing `toDateKey`.**
`endOfCurrentMonthKey(reference)` is replaced by a new `addDaysKey(reference: Date, days: number): string` helper (`new Date(reference); date.setDate(date.getDate() + days); return toDateKey(date)`), called as `addDaysKey(new Date(), 60)` for the initial `dateTo` state. This mirrors the existing local-date-string convention (no timezone conversion, no `bogota-date.ts` involvement) already used by every other date helper in this hook, so behavior stays consistent with `computeChipRange` and the calendar's day-key comparisons.
- *Alternative considered*: reuse/generalize `endOfCurrentMonthKey` into a generic "end of window" function. Rejected — `endOfCurrentMonthKey` remains unused after this change and is deleted rather than kept as dead code; a small, single-purpose `addDaysKey` is clearer than overloading month-end math for a day-count use case.

**2. Derive `isDefaultDateRange` by recomputing the default pair on every render via `useMemo`, not by storing an "is default" flag in state.**
`isDefaultDateRange = dateFrom === addDaysKey(new Date(), 0) && dateTo === addDaysKey(new Date(), 60)`, memoized with `[dateFrom, dateTo]` as deps (the `new Date()` calls inside are cheap and always reflect "now" at render time — no stale-closure risk since nothing caches the boundary beyond one render).
- *Alternative considered*: set a `hasCustomFilter` boolean explicitly inside `setDateRange`/`clearDateRange`/`applyDateChip` and flip it back only via a dedicated "reset to default" action. Rejected — the User Story explicitly requires the note to reappear if the user's selection happens to exactly reproduce the default range again (AC7), which a one-way "dirty" flag can't express; recomputing from actual state is the only approach that satisfies both directions.

**3. Place the note as a conditionally-rendered element in `EntrenamientosPublicosPage.tsx`, not inside the sticky header or as a new shared component.**
It renders directly beneath the existing sticky filter bar `div`, gated on `isDefaultDateRange && !loading && !error`, using the same `text-landing-text-secondary`/`font-landing-body` tokens already used elsewhere on this page (e.g. the loading message) for visual consistency.
- *Alternative considered*: extract a `MarketplaceDefaultRangeNote` component. Rejected as unnecessary — it's a single conditional paragraph with no reuse target elsewhere in the codebase; extracting it would add an abstraction with one caller.

## Risks / Trade-offs

- **[Risk]** A user whose local clock/timezone differs from the app's assumed local calendar could see a boundary off by one day in edge cases (midnight rollover). → **Mitigation**: this matches the exact behavior already accepted for `computeChipRange`'s "today"/"tomorrow" chips (US-0102) — no new exposure, same existing local-`Date()` assumption across the whole hook.
- **[Risk]** The note text is hardcoded Spanish copy; if marketplace copy is later externalized/i18n'd, this string needs to move too. → **Mitigation**: written as a literal JSX string co-located with the other hardcoded Spanish UI copy already on this page (e.g. "Cargando entrenamientos públicos...", "Reintentar") — consistent with current conventions, no new pattern introduced.

## Migration Plan

No data migration. Deploy as a normal frontend change: merge → build → release. No feature flag needed (default-value + note changes are safe to ship directly; rollback is a plain revert of the two touched files). No Supabase migration involved, local or remote.
