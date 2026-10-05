## 1. Branch Setup

- [x] 1.1 Create a new branch named `feat/marketplace-default-60-day-window` off the current base branch
- [x] 1.2 Verify the working branch is not `main`, `master`, or `develop` before making any changes

## 2. Hook: Default Window + Derived Flag

- [x] 2.1 In `src/hooks/portal/entrenamientos-publicos/useEntrenamientosPublicosMarketplace.ts`, add an `addDaysKey(reference: Date, days: number): string` helper (local-date arithmetic, reusing `toDateKey`) and remove `endOfCurrentMonthKey` (no longer used after this change)
- [x] 2.2 Change the initial `dateTo` state from `endOfCurrentMonthKey(new Date())` to `addDaysKey(new Date(), 60)`
- [x] 2.3 Add a memoized `isDefaultDateRange` boolean, true only when `dateFrom`/`dateTo` exactly equal a freshly computed `addDaysKey(new Date(), 0)` / `addDaysKey(new Date(), 60)` pair
- [x] 2.4 Return `isDefaultDateRange` from the hook alongside the existing filter state/handlers

## 3. Component: Explanatory Note

- [x] 3.1 In `src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx`, destructure `isDefaultDateRange` from `useEntrenamientosPublicosMarketplace`
- [x] 3.2 Render a note beneath the sticky header, gated on `isDefaultDateRange && !loading && !error`, using the existing `text-landing-text-secondary`/`font-landing-body` styling conventions, with copy conveying: trainings shown are scoped to the next 60 days, and the user can filter by dates to see more

## 4. Manual Verification

- [x] 4.1 Verify the default grid on load shows only trainings within today → today+60 days, tested on at least one date near a month boundary (e.g. temporarily mock `Date` or verify logically) to confirm the window no longer shrinks near month-end
- [x] 4.2 Verify the note is visible on initial load and hidden during the loading/error states
- [x] 4.3 Verify the note hides after clicking a quick chip (Hoy/Mañana/Esta semana/Fin de semana), after selecting a custom calendar range, and after "Limpiar fechas"
- [x] 4.4 Verify the note reappears if a manual selection happens to exactly reproduce the default 60-day range
- [x] 4.5 Verify search and Organización filters still AND-combine correctly with the default window and with any other date filter
- [x] 4.6 Confirm no regressions to existing US-0102 calendar navigation, chip toggling, and "Limpiar fechas" behavior

## 5. Documentation

- [x] 5.1 Update `projectspec/03-project-structure.md`'s `useEntrenamientosPublicosMarketplace.ts` and `EntrenamientosPublicosPage.tsx` annotations to reflect the new 60-day default and note (if those inline descriptions call out the current month-default behavior)

## 6. Wrap-up

- [x] 6.1 Run type-check, lint, and tests; fix any failures (do not run a full build)
- [x] 6.2 Write the commit message for the implementation
- [x] 6.3 Write the pull request description for the implementation
