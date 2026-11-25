## Why

The logged-in Public Trainings Marketplace (`/portal/entrenamientos-publicos`) currently defaults its date filter to "today → end of the current calendar month" (US-0102). This window shrinks unpredictably depending on what day of the month a user opens the page — as little as a single day when opened on the 30th/31st — and nothing on the page explains that a date scope is even being applied, so a user sees a seemingly-arbitrary subset of trainings with no way to understand why or what to do about it.

## What Changes

- Replace the marketplace's default date window with a fixed **rolling 60-day window** (today → today + 60 days), independent of calendar-month boundaries.
- Add a derived `isDefaultDateRange` flag to `useEntrenamientosPublicosMarketplace` that is true only while the active `dateFrom`/`dateTo` exactly match the freshly computed 60-day default.
- Show an explanatory note on the marketplace page, visible only while `isDefaultDateRange` is true, telling the user trainings are scoped to the next 60 days and that they can use the existing "Filtrar" date range/quick-chip controls (US-0102) to see more or a different window.
- No changes to the filter drawer's calendar, chips, or custom-range selection logic — those already work correctly and are reused as-is.

## Capabilities

### New Capabilities
- `public-trainings-marketplace-date-window`: Default date-scoping behavior of the logged-in Public Trainings Marketplace listing, including the rolling-window default and the on-page note that communicates it.

### Modified Capabilities
(none — no existing spec currently covers marketplace date-filtering behavior; US-0102's month-default/date-range-filter behavior was implemented without an OpenSpec capability, so this change establishes the first spec for it, framed as new rather than modified)

## Impact

- `src/hooks/portal/entrenamientos-publicos/useEntrenamientosPublicosMarketplace.ts` — default `dateTo` initial state, new `isDefaultDateRange` derived value.
- `src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx` — new conditional note element beneath the sticky header.
- No API, database, or type-shape changes. No new page or component is created — this is a copy/default-value change on two existing files reusing the current filter UI (`PublicTrainingFiltersDrawer.tsx`) and its established `text-landing-text-secondary` muted-text styling, so no separate design mockup is needed.

## Non-goals

- No changes to `PublicTrainingFiltersDrawer.tsx`'s calendar, month navigation, quick chips, or "Limpiar fechas" behavior — all of that (US-0102) is reused unchanged.
- No server-side date filtering or query changes — `listPublicTrainings()` continues to load the full unbounded-future list; scoping stays client-side.
- No persistence of the note's dismissal state (e.g. localStorage) — the note is purely derived from current filter state, not a one-time dismissible banner.
- No changes to the anonymous landing page (`/entrenamientos-publicos`) or its `usePublicEntrenamientosLanding` hook — this change is scoped to the logged-in portal marketplace only.
