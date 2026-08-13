# US-0102 — Public Trainings Marketplace: Month Default + Date Range Filters

## ID
US-0102

## Name
Improve date filtering in the public trainings filters modal (logged-in `/portal/entrenamientos-publicos`): default to the current month's upcoming sessions and allow filtering by an explicit date range with month navigation

## As a
Logged-in user browsing the Public Trainings Marketplace (`/portal/entrenamientos-publicos`)

## I Want
The marketplace to show the current month's upcoming trainings by default when I open the page, and to be able to open the filters drawer, pick a specific date range, and move the calendar between months to pick dates outside the current month

## So That
I can quickly see what's coming up this month without configuring anything, and still narrow results to a specific date range (e.g. a trip, a weekend, or a future month) when the defaults don't fit what I'm looking for

---

## Description

### Current State
- `useEntrenamientosPublicosMarketplace` (`src/hooks/portal/entrenamientos-publicos/useEntrenamientosPublicosMarketplace.ts`) defaults `dateChip` to `'this_week'` on mount and filters the already-loaded, unbounded-future list of published trainings (`entrenamientosPublicosService.listPublicTrainings()`, which only applies `gte('fecha_hora', now)` with no upper bound) via `matchesDateChip`, which supports only four fixed presets: `today`, `tomorrow`, `this_week`, `weekend`.
- `PublicTrainingFiltersDrawer` (`src/components/portal/entrenamientos-publicos/PublicTrainingFiltersDrawer.tsx`) renders a **visual-only** calendar: it always shows the current real-world month (`new Date()`), has no prev/next navigation, and clicking a day does nothing — it exists purely as a decorative month view alongside the four date chips.
- There is no way to filter by an arbitrary date range, and no way to see or select dates in a future/past month from the drawer.
- All filtering happens client-side in the hook (`items` already holds every upcoming published training across tenants), so no service/API/database change is required for this story — it is a filtering-logic + UI change only.

### Proposed Changes

**1. Default view = current month's upcoming trainings**
- On mount, instead of defaulting to `dateChip: 'this_week'`, the hook defaults the active filter to a date range covering **today through the last day of the current calendar month** (Bogotá local calendar, matching the rest of the app's date-only conventions — see `src/lib/portal/bogota-date.ts` for the existing pattern, though no timestamptz boundary math is needed here since filtering is purely client-side on already-loaded `Date` values).
- This means on first load, the grid shows only trainings whose `fechaHora` falls between "now" and the end of the current month — i.e., "próximos entrenamientos del mes".

**2. Unify quick chips and calendar selection into a single date-range filter**
- Replace the hook's four-way `dateChip` matching (`matchesDateChip`) with a single `dateFrom` / `dateTo` (inclusive, `YYYY-MM-DD` local strings) range filter used for all date filtering.
- The four existing quick chips (Hoy / Mañana / Esta semana / Fin de semana) remain in the drawer as shortcuts: clicking one computes the equivalent `dateFrom`/`dateTo` pair and applies it (replacing any custom range), and is shown as "active" only when the current `dateFrom`/`dateTo` exactly match that chip's computed range. Clicking an already-active chip clears the range back to "no date filter" (all upcoming, not the month default — consistent with today's toggle-off behavior).
- `serviciosRequeridos`/name/description search and the `tenantId` filter are unaffected and continue to AND-combine with the date range as before.

**3. Interactive, navigable calendar with range selection**
- The drawer's calendar becomes stateful and interactive:
  - A `calendarMonth` value (year+month being displayed) defaults to the current month and is **owned by the hook** (not local component state), so the displayed month and the selected range stay consistent if the drawer is closed/reopened.
  - Prev/Next chevron buttons around the month label move `calendarMonth` back/forward one month. The "Prev" button is disabled when `calendarMonth` is the current real-world month (no bookable date exists before today, so browsing further back is not useful).
  - Days belonging to the previous/next month (the leading/trailing filler cells) and days strictly before today are rendered disabled (dimmed, `aria-disabled`, not clickable).
  - Clicking a selectable day:
    - If no range is in progress (`dateFrom` is null, or both `dateFrom`/`dateTo` are already set), the clicked day becomes the new `dateFrom` and `dateTo` is cleared.
    - If `dateFrom` is set and `dateTo` is not, and the clicked day is **on or after** `dateFrom`, it becomes `dateTo` (range complete).
    - If `dateFrom` is set and `dateTo` is not, and the clicked day is **before** `dateFrom`, it replaces `dateFrom` (restart selection) rather than erroring.
  - Days within the selected range (inclusive of both endpoints) are visually highlighted; `dateFrom`/`dateTo` endpoints get a stronger highlight than the days between them.
  - A "Limpiar fechas" text button below the calendar clears `dateFrom`/`dateTo` entirely (shows all upcoming trainings regardless of date, not just the current month).
  - The currently selected range is echoed as short text above or below the calendar (e.g. "12 ago – 20 ago" or "Desde 12 ago" while only the start is picked), so the selection is legible without decoding the highlighted cells.

**4. No visibility/RLS/query changes**
- `listPublicTrainings()` keeps loading every upcoming published training in one unbounded query; this story does not add server-side date filtering. If this ever becomes a performance concern (very large future backlog of published trainings), that would be a separate story — out of scope here.

---

## Database Changes

None. This is a client-side filtering and UI change only; no new tables, columns, RLS policies, or migrations are required.

---

## API / Server Actions

None. `entrenamientosPublicosService.listPublicTrainings()` (`src/services/supabase/portal/entrenamientos-publicos.service.ts`) is unchanged — it already returns the full unbounded-future list that all filtering operates on client-side.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Types | `src/types/portal/entrenamientos-publicos.types.ts` | Extend `PublicTrainingFilters` with `dateFrom: string \| null` and `dateTo: string \| null` (replacing/alongside `dateChip`); keep `PublicTrainingDateChip` as the type for the four quick-chip presets |
| Hook | `src/hooks/portal/entrenamientos-publicos/useEntrenamientosPublicosMarketplace.ts` | Replace `matchesDateChip`-based filtering with `dateFrom`/`dateTo` range filtering; default `dateFrom`/`dateTo` to "today → end of current month" on mount; add `calendarMonth` state + `goToPrevMonth`/`goToNextMonth`; add `setDateRange(from, to)` and `clearDateRange()`; add `applyDateChip(chip)` that computes and applies the equivalent range, toggling off when the chip is already active |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingFiltersDrawer.tsx` | Make the calendar interactive: build days from `calendarMonth` prop (not `new Date()`), add prev/next month buttons, make day cells clickable with range-selection logic and highlighting, disable past/adjacent-month days, add selected-range text summary and "Limpiar fechas" action; wire quick chips to `applyDateChip` |
| Component | `src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx` | Pass the new hook fields/handlers (`dateFrom`, `dateTo`, `calendarMonth`, `goToPrevMonth`, `goToNextMonth`, `setDateRange`, `clearDateRange`, `applyDateChip`) down to `PublicTrainingFiltersDrawer` in place of `dateChip`/`onChangeDateChip` |

---

## Acceptance Criteria

1. On first load of `/portal/entrenamientos-publicos` (logged in), the grid shows only published trainings whose `fechaHora` falls between the current moment and the end of the current calendar month (inclusive) — "próximos entrenamientos del mes" — with no manual filtering required.
2. Opening the "Filtrar" drawer shows the calendar defaulted to the current month, with today and the active default range (today → end of month) visually indicated.
3. Clicking the "Next" chevron advances the calendar one month at a time indefinitely; clicking "Prev" moves back one month at a time but is disabled/no-op once the current real-world month is reached.
4. Clicking a selectable day when no range is in progress sets it as the range start (`dateFrom`) and highlights it; the grid updates to show only trainings on or after that date (still respecting any other active filters).
5. Clicking a second, later-or-equal day completes the range (`dateTo`); the grid updates to show only trainings whose date falls within `[dateFrom, dateTo]` inclusive.
6. Clicking a day earlier than the current `dateFrom` while only `dateFrom` is set restarts the selection from that new day, rather than throwing or producing an invalid inverted range.
7. Days before today, and filler days belonging to the adjacent month, are visually disabled and not clickable.
8. Clicking one of the four quick chips (Hoy/Mañana/Esta semana/Fin de semana) applies the equivalent date range and updates the calendar highlight accordingly; clicking the same chip again clears the date filter entirely (grid shows all upcoming trainings, not scoped to the current month).
9. "Limpiar fechas" clears `dateFrom`/`dateTo` (shows all upcoming trainings) without affecting the search text or Organización filter.
10. The search (`nombre`/`descripcion`/`serviciosRequeridos`) and Organización (`tenantId`) filters continue to AND-combine correctly with the active date range.
11. Selecting a date range whose window contains zero published trainings shows the grid's existing empty state (no crash, no stale results from the previous filter).
12. Reopening the drawer after closing it (without a page reload) preserves the last-selected `calendarMonth`, `dateFrom`, and `dateTo`.
13. All new interactive calendar day cells are real `<button>` elements reachable by keyboard (Tab) and activatable with Enter/Space, with an `aria-label` stating the full date (e.g. "12 de agosto de 2026"); disabled days expose `aria-disabled="true"` and are not focusable via Tab (`tabIndex={-1}` or `disabled`).

---

## Implementation Steps

- [ ] Extend `PublicTrainingFilters` type with `dateFrom`/`dateTo` in `src/types/portal/entrenamientos-publicos.types.ts`
- [ ] Update `useEntrenamientosPublicosMarketplace.ts`: replace `matchesDateChip` with range-based filtering, add default month range on mount, add `calendarMonth` state + navigation handlers, add `setDateRange`/`clearDateRange`/`applyDateChip`
- [ ] Update `PublicTrainingFiltersDrawer.tsx`: interactive calendar (navigation, selectable/disabled day cells, range highlighting, range summary text, "Limpiar fechas"), wire quick chips to `applyDateChip`
- [ ] Update `EntrenamientosPublicosPage.tsx` to pass the new props through
- [ ] Manually verify: default month view on load, forward/backward month navigation, single-day selection, full range selection, restart-selection-on-earlier-click, chip toggle on/off, "Limpiar fechas", empty-result range, drawer close/reopen state persistence, keyboard navigation of calendar cells
- [ ] Confirm no regressions to the existing search and Organización filters combined with date filtering

---

## Non-Functional Requirements

- **Security**: None — no new data access, no RLS changes; filtering operates entirely on already-authorized client-side data.
- **Performance**: No new queries. Calendar grid/day-cell rendering must stay cheap (pure date arithmetic, no re-fetching on month navigation or range selection).
- **Accessibility**: Calendar day cells must be real, keyboard-reachable, labeled buttons (see Acceptance Criterion 13); prev/next month buttons need `aria-label`s ("Mes anterior" / "Mes siguiente"); the disabled "Prev" state must expose `disabled` (not just a visual dim) so it's skipped by keyboard/assistive tech.
- **Error handling**: Purely client-side state — no error states to surface beyond the existing empty-grid state already handled by `PublicTrainingsGrid` when a filter combination yields zero results.
