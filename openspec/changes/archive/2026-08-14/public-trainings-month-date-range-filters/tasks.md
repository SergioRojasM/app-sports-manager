## 1. Branch Setup

- [x] 1.1 Create a new branch named `feat/public-trainings-month-date-range-filters` off the current branch
- [x] 1.2 Validate the working branch is not `main`, `master`, or `develop` before making any changes

## 2. Types

- [x] 2.1 Extend `PublicTrainingFilters` in `src/types/portal/entrenamientos-publicos.types.ts` with `dateFrom: string | null` and `dateTo: string | null`
- [x] 2.2 Keep `PublicTrainingDateChip` as the type used for the four quick-chip presets (`today`/`tomorrow`/`this_week`/`weekend`)

## 3. Hook — `useEntrenamientosPublicosMarketplace.ts`

- [x] 3.1 Add local date-string helpers: today as `YYYY-MM-DD`, end-of-current-month as `YYYY-MM-DD`, and per-chip range computation (`today`, `tomorrow`, `this_week`, `weekend`) returning `{ dateFrom, dateTo }`
- [x] 3.2 Replace `matchesDateChip`/`dateChip` state with `dateFrom`/`dateTo` state, defaulting on mount to today → end of current month
- [x] 3.3 Replace the `matchesDateChip` filter step in `filteredItems` with inclusive `dateFrom`/`dateTo` range filtering, keeping the existing AND-combination with `tenantId` and search
- [x] 3.4 Add `calendarMonth` state (year + month), defaulting to the current real-world month, plus `goToPrevMonth`/`goToNextMonth` handlers; `goToPrevMonth` SHALL be a no-op once `calendarMonth` is the current real-world month
- [x] 3.5 Add `setDateRange(from, to)` and `clearDateRange()` that update `dateFrom`/`dateTo`
- [x] 3.6 Add `applyDateChip(chip)`: compute the chip's equivalent range; if the current `dateFrom`/`dateTo` already exactly match it, clear the range instead; otherwise apply the computed range
- [x] 3.7 Update the hook's return object to expose `dateFrom`, `dateTo`, `calendarMonth`, `goToPrevMonth`, `goToNextMonth`, `setDateRange`, `clearDateRange`, `applyDateChip` in place of `dateChip`/`setDateChip`

## 4. Component — `PublicTrainingFiltersDrawer.tsx`

- [x] 4.1 Update props to accept `dateFrom`, `dateTo`, `calendarMonth`, `onGoToPrevMonth`, `onGoToNextMonth`, `onSetDateRange`, `onClearDateRange`, `onApplyDateChip` in place of `dateChip`/`onChangeDateChip`
- [x] 4.2 Build `calendarDays` from the `calendarMonth` prop instead of `new Date()`, marking each day disabled when it's before today or belongs to the previous/next month
- [x] 4.3 Add Prev/Next chevron buttons around the month label, calling `onGoToPrevMonth`/`onGoToNextMonth`; give each an `aria-label` ("Mes anterior" / "Mes siguiente"); disable the Prev button (native `disabled`) when `calendarMonth` is the current real-world month
- [x] 4.4 Convert day cells to real `<button>` elements: selectable days get an `aria-label` with the full date (e.g. "12 de agosto de 2026") and a click handler implementing the range state machine (start / extend / restart, per design.md decision 5); disabled days get `aria-disabled="true"` and `tabIndex={-1}`/`disabled` so they're unreachable via Tab
- [x] 4.5 Highlight days within `[dateFrom, dateTo]` inclusive, with a stronger highlight on the `dateFrom`/`dateTo` endpoints
- [x] 4.6 Add a short range-summary text near the calendar (e.g. "12 ago – 20 ago" or "Desde 12 ago")
- [x] 4.7 Add a "Limpiar fechas" text button below the calendar calling `onClearDateRange`
- [x] 4.8 Wire the four quick chips to call `onApplyDateChip(chip)`; compute each chip's "active" state by comparing its equivalent range to the current `dateFrom`/`dateTo` (no separate `dateChip` prop)

## 5. Component — `EntrenamientosPublicosPage.tsx`

- [x] 5.1 Destructure the new hook fields/handlers (`dateFrom`, `dateTo`, `calendarMonth`, `goToPrevMonth`, `goToNextMonth`, `setDateRange`, `clearDateRange`, `applyDateChip`) from `useEntrenamientosPublicosMarketplace`
- [x] 5.2 Pass them through to `PublicTrainingFiltersDrawer` in place of `dateChip`/`onChangeDateChip`
- [x] 5.3 Remove `thisWeekCount`/`isWithinCurrentWeek` from the hook; pass the hook's `items.length` (the already-filtered list) to `SessionsAvailableWidget` instead, so the header count reflects the active filter combination rather than a fixed current-week count
- [x] 5.4 Drop the hardcoded "esta semana" suffix from `SessionsAvailableWidget`'s label, since the count is no longer week-scoped

## 6. Manual Verification

- [x] 6.1 Verify first page load shows only trainings from today through the end of the current month, with no filter configured
- [x] 6.2 Verify opening the drawer shows the calendar on the current month with today and the default range indicated
- [x] 6.3 Verify Next chevron advances the calendar indefinitely and Prev is disabled at the current month
- [x] 6.4 Verify single-day selection sets `dateFrom`, highlights it, and filters the grid to on-or-after that date
- [x] 6.5 Verify a second, later-or-equal click completes the range and filters the grid to the inclusive window
- [x] 6.6 Verify clicking a day earlier than `dateFrom` (with `dateTo` unset) restarts the selection instead of erroring
- [x] 6.7 Verify past days and adjacent-month filler days are visually disabled and unclickable
- [x] 6.8 Verify each quick chip applies its equivalent range and toggles off (clearing entirely, not reverting to the month default) when clicked again while active
- [x] 6.9 Verify "Limpiar fechas" clears the range without changing search text or Organización selection
- [x] 6.10 Verify a date range with zero matching trainings shows the existing empty state with no crash or stale results
- [x] 6.11 Verify closing and reopening the drawer (no page reload) preserves `calendarMonth`, `dateFrom`, and `dateTo`
- [x] 6.12 Verify keyboard navigation: Tab reaches only selectable day cells (not disabled ones) and Enter/Space activates the focused day; verify the disabled Prev button is skipped by Tab
- [x] 6.13 Confirm search and Organización filters still AND-combine correctly with the active date range (no regression)
- [x] 6.14 Verify the header widget count matches the grid's item count under the default range, after clearing the range, and under a range with zero matches

## 7. Quality Gates

- [x] 7.1 Run type checking and fix any errors
- [x] 7.2 Run lint and fix any errors
- [x] 7.3 Run the test suite and fix any failures (no test script/suite exists in this project — nothing to run)
- [x] 7.4 Review whether `projectspec/03-project-structure.md` needs an update to reflect the new hook fields/behavior; update it if so

## 8. Commit & PR

- [x] 8.1 Draft a commit message summarizing the date-range filter and interactive calendar changes
- [x] 8.2 Draft a pull request description covering the change, testing performed, and any follow-ups (e.g. potential future server-side date filtering)
