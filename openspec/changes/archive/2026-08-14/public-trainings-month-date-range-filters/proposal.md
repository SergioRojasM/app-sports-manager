## Why

The Public Trainings Marketplace filters drawer (`/portal/entrenamientos-publicos`) currently defaults to "esta semana" and offers only four fixed date presets; its calendar is a decorative, non-interactive view of the current real-world month with no navigation and no click behavior. Logged-in users cannot browse a full month of upcoming sessions by default, cannot pick an explicit date range (e.g. for a trip or a specific weekend), and cannot look ahead to a future month from the drawer. This story turns the calendar into a real range picker and changes the default view to "this month's upcoming trainings", without touching the underlying data query.

## What Changes

- Default filter on mount changes from the `this_week` chip to a `dateFrom`/`dateTo` range covering **today → end of the current calendar month**.
- The four quick chips (Hoy / Mañana / Esta semana / Fin de semana) are reimplemented as range-computing shortcuts (`applyDateChip`) instead of a `dateChip` match; a chip is shown active only when the current range exactly equals its computed range, and clicking an active chip clears the range entirely (not back to the month default).
- The drawer's calendar becomes interactive and stateful:
  - `calendarMonth` (the displayed year/month) moves from an implicit `new Date()` read to hook-owned state, with `goToPrevMonth`/`goToNextMonth` handlers. "Prev" is disabled at the current real-world month.
  - Day cells become real `<button>`s: clickable to start/extend/restart a range, disabled (and unfocusable) for past days and adjacent-month filler days, each with a full-date `aria-label`.
  - Selected range is highlighted (stronger highlight on endpoints) and echoed as short text (e.g. "12 ago – 20 ago").
  - A "Limpiar fechas" action clears `dateFrom`/`dateTo` entirely.
- `PublicTrainingFilters` type gains `dateFrom: string | null` / `dateTo: string | null`; `PublicTrainingDateChip` is kept only as the type used internally by `applyDateChip` to compute each chip's equivalent range.
- `matchesDateChip`-based filtering in the hook is replaced by inclusive `dateFrom`/`dateTo` range filtering, AND-combined with the existing search and `tenantId` filters exactly as today.
- The header's floating sessions widget switches from a fixed "current week" count (`thisWeekCount`/`isWithinCurrentWeek`) to the count of the currently filtered list, so it stays consistent with whatever date range, search, and organization filter are active.

**Non-goals**
- No change to `entrenamientosPublicosService.listPublicTrainings()` or any query/RLS — the service keeps returning the full unbounded-future list; all filtering stays client-side.
- No server-side date filtering or pagination — out of scope even if the unbounded list becomes a performance concern later.
- No change to the search or Organización (`tenantId`) filters beyond continuing to AND-combine with the new range.
- No redesign of the drawer's visual chrome (spacing, colors, chip styling) beyond what's needed to make the calendar interactive — this change reuses the existing `landing-*` Tailwind tokens and layout already present in `PublicTrainingFiltersDrawer.tsx`.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `public-training-marketplace`: the marketplace's date-filtering requirements change from a four-preset `dateChip` model with a non-interactive calendar to a `dateFrom`/`dateTo` range model with an interactive, navigable, keyboard-accessible calendar and a "current month" default.

## Impact

- **Types**: `src/types/portal/entrenamientos-publicos.types.ts` — `PublicTrainingFilters` gains `dateFrom`/`dateTo`; `PublicTrainingDateChip` retained for chip computation only.
- **Hook**: `src/hooks/portal/entrenamientos-publicos/useEntrenamientosPublicosMarketplace.ts` — replaces `matchesDateChip` filtering with range filtering; adds `calendarMonth`, `goToPrevMonth`, `goToNextMonth`, `setDateRange`, `clearDateRange`, `applyDateChip`; changes the mount default; removes `thisWeekCount`/`isWithinCurrentWeek` (the returned `items` is already the filtered list, so its `.length` is the widget count).
- **Component**: `src/components/portal/entrenamientos-publicos/PublicTrainingFiltersDrawer.tsx` — calendar rebuilt around `calendarMonth` prop instead of `new Date()`, day cells become interactive buttons, adds month navigation, range highlighting, range summary text, and "Limpiar fechas".
- **Component**: `src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx` — passes the new hook fields/handlers down to the drawer in place of `dateChip`/`onChangeDateChip`; passes `items.length` to the header widget instead of `thisWeekCount`.
- **Component**: `src/components/portal/entrenamientos-publicos/SessionsAvailableWidget.tsx` — drops the hardcoded "esta semana" suffix from its label, since the count it displays is no longer week-scoped.
- **No** database, RLS, migration, or service/API changes.
- **Design source**: this is a behavioral upgrade of an existing drawer/calendar already implemented in the codebase (`PublicTrainingFiltersDrawer.tsx`); the existing `landing-*` design tokens, spacing, and chip/button styles are reused as the visual reference rather than a new mockup, per the User Story's acceptance criteria.

## Implementation Plan

1. Extend `PublicTrainingFilters` with `dateFrom`/`dateTo` in the types file.
2. Update `useEntrenamientosPublicosMarketplace.ts`: add date-range helper functions (today, end-of-month, per-chip range computation), replace `matchesDateChip` filtering with inclusive range filtering, default `dateFrom`/`dateTo` to today→end-of-month on mount, add `calendarMonth` state and month-navigation handlers, add `setDateRange`/`clearDateRange`/`applyDateChip`.
3. Update `PublicTrainingFiltersDrawer.tsx`: derive calendar days from the `calendarMonth` prop, add prev/next buttons (with `aria-label`s and disabled state at the current month), convert day cells to labeled `<button>`s with click-to-select/extend/restart range logic and disabled state for past/filler days, add range highlighting and summary text, add "Limpiar fechas", wire quick chips to `applyDateChip`.
4. Update `EntrenamientosPublicosPage.tsx` to pass the new hook fields/handlers to the drawer instead of `dateChip`/`onChangeDateChip`.
5. Manually verify all Acceptance Criteria from the User Story (default month view, month navigation bounds, single/full range selection, restart-on-earlier-click, chip toggle on/off, "Limpiar fechas", empty-result range, drawer close/reopen persistence, keyboard navigation) and confirm no regression to search/Organización filtering.
