# US-0075 — Fix late-evening trainings not appearing due to UTC/Bogotá date range mismatch

## ID
US-0075

## Name
Fix late-evening trainings and reservations not appearing because of UTC vs. Bogotá calendar-day mismatch in date range queries

## As a
Administrator, trainer, or athlete using the trainings panel and reservation history screens

## I Want
Trainings created late in the evening (Bogotá local time) to show up on the correct calendar day in the trainings panel, and to be included in the reservation management / "mis reservas" date-range filters

## So That
I don't lose visibility of trainings or reservations that happen to land on the next UTC calendar day when stored, especially near month/range boundaries

---

## Description

### Current State

The `entrenamientos` table stores `fecha_hora` as `timestamptz`. Bogotá is UTC-5 (no DST), so any training created at 19:00–23:59 Bogotá time is persisted with a UTC instant that falls on the **next calendar day** (e.g. `2026-06-30T20:00:00-05:00` is stored as `2026-07-01T01:00:00+00:00`). This part of the system already works correctly — `toIsoFromDateAndTime` (`entrenamientos.service.ts:293-305`) and `toBogotaIsoFromLocalInput` (`useEntrenamientos.ts:202-209`) already use the `-05:00` offset convention when building timestamps, and the display-side helpers (`toDateKeyInBogota` in `EntrenamientosPage.tsx`/`EntrenamientosCalendar.tsx`, `toDateOnlyFromIso`/`toDateTimeLocalInBogota` in `useEntrenamientos.ts`) correctly convert stored UTC instants back to Bogotá calendar days for display.

The bug is isolated to three **date-range query filters**, which build their `gte`/`lte` boundaries by concatenating a plain "YYYY-MM-DD" string (representing a Bogotá calendar day) with a literal UTC suffix instead of the Bogotá offset:

1. `entrenamientosService.listTrainingInstancesByTenantAndRange` — `src/services/supabase/portal/entrenamientos.service.ts:359-365`
   ```ts
   if (from) {
     query = query.gte('fecha_hora', `${from}T00:00:00.000Z`);
   }
   if (to) {
     query = query.lte('fecha_hora', `${to}T23:59:59.999Z`);
   }
   ```
   `from`/`to` come from `calendar.range` in `src/hooks/portal/entrenamientos/useEntrenamientosCalendar.ts:31-38`, which represents the **Bogotá** calendar month being viewed. Because the upper bound is treated as a UTC instant instead of a Bogotá instant, any training stored on the first hours of the following UTC day (i.e. created in the evening of the last Bogotá day of the range) falls outside `[from, to]` and is **excluded by the Supabase query itself** — it never reaches the frontend, regardless of how the panel later groups/filters by date.

2. `reservasService.getReservasManagement` (shared reservations management, US-0073) — `src/services/supabase/portal/reservas.service.ts:1030-1036`
   ```ts
   if (filters.fechaDesde) {
     query = query.gte('entrenamiento_fecha', filters.fechaDesde);
   }
   if (filters.fechaHasta) {
     query = query.lte('entrenamiento_fecha', `${filters.fechaHasta}T23:59:59`);
   }
   ```
3. `reservasService.getMisReservas` (athlete personal reservations, US-0074) — `src/services/supabase/portal/reservas.service.ts:1095-1101`
   ```ts
   if (filters.fechaDesde) {
     query = query.gte('entrenamiento_fecha', filters.fechaDesde);
   }
   if (filters.fechaHasta) {
     query = query.lte('entrenamiento_fecha', `${filters.fechaHasta}T23:59:59`);
   }
   ```
   Both filter the `reservas_reporte_view` column `entrenamiento_fecha`, which is sourced from `entrenamientos.fecha_hora` (`timestamptz`) — same underlying issue, plus an inconsistency where `fechaDesde` has no explicit offset at all.

There is currently no shared date/timezone utility in the codebase (`src/lib/` only has `constants.ts`, `csv.ts`, `validators.ts`, `utils.ts`, and `src/lib/portal/tenant-access.cache.ts`); each service builds ISO strings ad hoc.

### Proposed Changes

1. Add a small shared helper module `src/lib/portal/bogota-date.ts` exposing two pure functions that convert a Bogotá calendar day ("YYYY-MM-DD") into the correct UTC-equivalent ISO boundaries, using the same fixed `-05:00` offset convention already used elsewhere in the codebase (no DST handling needed for `America/Bogota`):
   - `bogotaDayStartIso(dateOnly: string): string` → `` `${dateOnly}T00:00:00.000-05:00` ``
   - `bogotaDayEndIso(dateOnly: string): string` → `` `${dateOnly}T23:59:59.999-05:00` ``

2. Update `listTrainingInstancesByTenantAndRange` in `entrenamientos.service.ts` to build its `gte`/`lte` boundaries using `bogotaDayStartIso(from)` / `bogotaDayEndIso(to)` instead of the literal `Z` suffix.

3. Update `getReservasManagement` and `getMisReservas` in `reservas.service.ts` to use the same helpers for both `fechaDesde` and `fechaHasta` boundaries, replacing the current inconsistent raw-string concatenation.

No changes are needed to the database schema, to the creation flow, or to the display/grouping logic — those are already correct.

---

## Database Changes

None. `entrenamientos.fecha_hora` remains `timestamptz`; no migration required.

---

## API / Server Actions

No new API surface. Existing functions keep their signatures; only their internal range-boundary construction changes.

- **File:** `src/services/supabase/portal/entrenamientos.service.ts`
  - **Function:** `listTrainingInstancesByTenantAndRange(tenantId: string, from?: string, to?: string): Promise<TrainingInstance[]>`
  - **Change:** lines 359-365 use `bogotaDayStartIso`/`bogotaDayEndIso` instead of literal `Z` suffixes.

- **File:** `src/services/supabase/portal/reservas.service.ts`
  - **Function:** `getReservasManagement(filters: ReservasManagementFilters): Promise<ReservaReportRow[]>`
  - **Change:** lines 1030-1036 use `bogotaDayStartIso`/`bogotaDayEndIso` for both `fechaDesde` and `fechaHasta`.
  - **Function:** `getMisReservas(filters: MisReservasFilters): Promise<ReservaReportRow[]>`
  - **Change:** lines 1095-1101 use `bogotaDayStartIso`/`bogotaDayEndIso` for both `fechaDesde` and `fechaHasta`.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Utility | `src/lib/portal/bogota-date.ts` | New file: `bogotaDayStartIso`, `bogotaDayEndIso` |
| Service | `src/services/supabase/portal/entrenamientos.service.ts` | Use new helpers in `listTrainingInstancesByTenantAndRange` (lines 359-365) |
| Service | `src/services/supabase/portal/reservas.service.ts` | Use new helpers in `getReservasManagement` (lines 1030-1036) and `getMisReservas` (lines 1095-1101) |

---

## Acceptance Criteria

1. Creating a unique training at 20:00 (Bogotá time) on the last day of a month, from the trainings panel wizard, results in a row visible on that same day in the trainings calendar/panel after a page refresh, for the month being viewed.
2. The Supabase query underlying `listTrainingInstancesByTenantAndRange` returns the training described in (1) when querying the month it was created in (verified by inspecting the returned data, not just the UI).
3. A reservation tied to a training stored at 01:00 UTC the day after a selected `fechaHasta` (Bogotá calendar day) is included in `getReservasManagement` results when `fechaHasta` is set to that Bogotá day.
4. Same as (3) for `getMisReservas` (athlete's personal reservation history).
5. Existing behavior for trainings/reservations comfortably inside a date range (not near a day/month boundary) is unchanged.
6. No regressions in existing date filters: `fechaDesde` lower bound still correctly includes the full first day in Bogotá time (00:00 Bogotá, not 00:00 UTC).

---

## Implementation Steps

- [ ] Create `src/lib/portal/bogota-date.ts` with `bogotaDayStartIso` and `bogotaDayEndIso`
- [ ] Update `entrenamientos.service.ts:359-365` to use the new helpers
- [ ] Update `reservas.service.ts:1030-1036` (`getReservasManagement`) to use the new helpers
- [ ] Update `reservas.service.ts:1095-1101` (`getMisReservas`) to use the new helpers
- [ ] Run `tsc`/build to confirm no type errors
- [ ] Manually test: create a training at 20:00+ Bogotá time on the last day of a month and confirm it appears in the panel for that month
- [ ] Manually test: filter gestión de reservas and mis reservas by a date range ending on that same boundary day and confirm the related reservation appears

---

## Non-Functional Requirements

- **Security**: No change to RLS or auth — this is a pure query-boundary correctness fix scoped to existing, already-authorized queries.
- **Performance**: No impact; same query shape, only literal boundary values change.
- **Accessibility**: N/A.
- **Error handling**: No new error paths introduced.
