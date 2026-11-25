# US-0113 — Public Trainings Marketplace: Default 60-Day Window + Explanatory Note

## ID
US-0113

## Name
Default the logged-in Public Trainings Marketplace (`/portal/entrenamientos-publicos`) to the next 60 days and show a note explaining the window and how to see more

## As a
Logged-in user browsing the Public Trainings Marketplace (`/portal/entrenamientos-publicos`)

## I Want
The marketplace to show published trainings scheduled in the next 60 days by default, with a visible note telling me that's what I'm seeing and that I can use the date filter to look further out

## So That
I see a useful, bounded set of upcoming sessions without extra steps, while understanding why some future trainings might not appear and how to find them

---

## Description

### Current State
- `useEntrenamientosPublicosMarketplace` (`src/hooks/portal/entrenamientos-publicos/useEntrenamientosPublicosMarketplace.ts`) currently defaults `dateFrom`/`dateTo` on mount to **today → the last day of the current calendar month** (`endOfCurrentMonthKey`, US-0102). This means the default window shrinks to as little as a few days when the page is opened near the end of a month.
- `entrenamientosPublicosService.listPublicTrainings()` (`src/services/supabase/portal/entrenamientos-publicos.service.ts`) already loads **every** upcoming published training with no upper date bound (`gte('fecha_hora', now)` only) — the "current month" scoping today happens entirely client-side in the hook via `filteredItems`. No service/query change is needed to change the default window.
- `PublicTrainingFiltersDrawer` (`src/components/portal/entrenamientos-publicos/PublicTrainingFiltersDrawer.tsx`) already supports picking an arbitrary custom date range and navigating the calendar forward/backward across months (US-0102), and four quick chips (Hoy/Mañana/Esta semana/Fin de semana).
- There is currently no on-page message explaining what date window is being applied by default — a user unfamiliar with the "Filtrar" drawer has no way to know the grid is scoped to the current month at all.

### Proposed Changes

**1. Change the default date window from "current month" to "next 60 days"**
- Replace the hook's `endOfCurrentMonthKey(new Date())` default for `dateTo` with a new helper that computes **today + 60 calendar days** (inclusive range: `dateFrom = today`, `dateTo = today + 60 days`), using the same local `YYYY-MM-DD` (`toDateKey`) convention already used throughout the hook — no timezone/timestamptz math needed since filtering stays entirely client-side on already-loaded `Date` values.
- This is a pure default-value change: `filteredItems`, `setDateRange`, `clearDateRange`, `applyDateChip`, and the calendar navigation (`calendarMonth`, `goToPrevMonth`, `goToNextMonth`) all keep their existing US-0102 behavior unchanged. The user can still pick any custom range, including one that starts or extends beyond the 60-day default, exactly as before.
- The four quick chips and "Limpiar fechas" are unaffected — "Limpiar fechas" continues to mean "no date filter, show all upcoming trainings regardless of date," not "reset to the 60-day default."

**2. Track whether the active filter is still the default 60-day window**
- The hook exposes a new derived boolean, `isDefaultDateRange`, true only while `dateFrom`/`dateTo` exactly equal the freshly computed "today → today+60 days" pair. It becomes `false` the moment the user picks a quick chip, a custom range, or clears the filter, and becomes `true` again only if they navigate back to that exact range (including after "Limpiar fechas" if they then reselect it, though there's no explicit "reset to default" affordance in this story).

**3. Show an explanatory note on the marketplace page**
- `EntrenamientosPublicosPage.tsx` renders a small, dismissable-free (always recomputed from state, not permanently dismissed) note beneath the sticky header, visible **only while `isDefaultDateRange` is true**:
  > "Se muestran los entrenamientos de los próximos 60 días. Si quieres ver más, filtra por fechas."
- The note is plain text (no persistence/localStorage needed) styled consistently with the existing landing/portal muted-text tokens (e.g. `text-landing-text-secondary`), placed directly under the sticky filter bar so it doesn't shift the grid's scroll position.
- The note disappears automatically as soon as the user applies any non-default date filter (a quick chip, a custom range, or "Limpiar fechas") — since at that point the grid is no longer scoped to "next 60 days" and the note would be misleading. It reappears only if the resulting filter happens to exactly match the default range again.

---

## Database Changes

None. This is a client-side default-value and UI-copy change only.

---

## API / Server Actions

None. `entrenamientosPublicosService.listPublicTrainings()` is unchanged — it already returns the full unbounded-future list that all date filtering (including the new 60-day default) operates on client-side.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Hook | `src/hooks/portal/entrenamientos-publicos/useEntrenamientosPublicosMarketplace.ts` | Add `endOfWindowKey(reference: Date, days: number)` (or a dedicated `next60DaysKey`) helper; replace `endOfCurrentMonthKey(new Date())` with the new 60-day default for the initial `dateTo` state; add derived `isDefaultDateRange` boolean (recomputed via `useMemo`, comparing current `dateFrom`/`dateTo` against a freshly computed default pair); return `isDefaultDateRange` from the hook |
| Component | `src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx` | Destructure `isDefaultDateRange` from the hook; render the explanatory note beneath the sticky header, conditioned on `isDefaultDateRange && !loading && !error` |

No changes to `PublicTrainingFiltersDrawer.tsx`, `PublicTrainingsGrid.tsx`, `SessionsAvailableWidget.tsx`, or any service/type file — `PublicTrainingFilters`'s `dateFrom`/`dateTo` shape is unchanged, only the hook's initial values and one new derived boolean are added.

---

## Acceptance Criteria

1. On first load of `/portal/entrenamientos-publicos` (logged in), with no prior filter interaction, the grid shows only published trainings whose `fechaHora` falls between now and 60 calendar days from today (inclusive), regardless of which calendar month today falls in.
2. Loading the page on any day of the month (including the 1st or the last day) yields a full 60-day window — the window no longer shrinks near month-end the way the previous "current month" default did.
3. While the default 60-day window is active, a note reading "Se muestran los entrenamientos de los próximos 60 días. Si quieres ver más, filtra por fechas." (or equivalent copy conveying the same two facts) is visible on the page beneath the header, and disappears while the loading or error state is shown.
4. Clicking any of the four quick chips (Hoy/Mañana/Esta semana/Fin de semana) hides the note and filters the grid to that chip's range, exactly as before this change.
5. Opening the "Filtrar" drawer and selecting a custom date range (via calendar day clicks) hides the note and filters the grid to that custom range, exactly as before this change.
6. Clicking "Limpiar fechas" hides the note and shows all upcoming published trainings with no date bound, exactly as before this change.
7. If a user's custom selection happens to exactly reproduce the default 60-day range (today → today+60), the note reappears.
8. The search (`nombre`/`descripcion`/`serviciosRequeridos`) and Organización (`tenantId`) filters continue to AND-combine correctly with the default 60-day window and with any other date filter, unchanged from current behavior.
9. `PublicTrainingFiltersDrawer`'s calendar, month navigation, chip highlighting, and "Limpiar fechas" continue to work exactly as specified in US-0102 — this story only changes the initial default values and adds the note, not the filtering UI itself.
10. No new network requests are introduced: `listPublicTrainings()` and `listPublicTenantOptions()` are called the same number of times as before (once on mount), since the 60-day scoping is applied client-side to the already-loaded list.

---

## Implementation Steps

- [ ] Add a `next60DaysKey`/`endOfWindowKey` helper to `useEntrenamientosPublicosMarketplace.ts` and use it for the initial `dateTo` state (replacing `endOfCurrentMonthKey`)
- [ ] Add the `isDefaultDateRange` derived boolean to the hook and return it
- [ ] Render the explanatory note in `EntrenamientosPublicosPage.tsx`, gated on `isDefaultDateRange && !loading && !error`
- [ ] Manually verify: default window spans exactly 60 days from today regardless of month boundary; note shows on load and hides after any chip/custom-range/clear interaction; note reappears if the resulting selection matches the default range exactly
- [ ] Confirm no regressions to existing US-0102 calendar navigation, chip toggling, and "Limpiar fechas" behavior
- [ ] Confirm no regressions to search/Organización filter combination with the new default range

---

## Non-Functional Requirements

- **Security**: None — no new data access, no RLS changes; purely a client-side default-value and copy change on already-authorized data.
- **Performance**: No new queries; `isDefaultDateRange` is a cheap `useMemo` comparison, no re-fetch triggered by the note's visibility toggling.
- **Accessibility**: The note is static, non-interactive text — no ARIA role needed beyond being readable in normal document flow (avoid `aria-hidden`); it must not trap focus or shift layout in a way that disorients keyboard/screen-reader users navigating from the header to the grid.
- **Error handling**: The note must not render during `loading` or `error` states (Acceptance Criterion 3) — no other error handling is introduced by this change.
