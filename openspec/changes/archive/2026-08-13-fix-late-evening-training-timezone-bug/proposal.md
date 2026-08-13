## Why

Trainings created in the evening (Bogotá local time, UTC-5) are stored correctly as `timestamptz`, but three date-range query filters treat the requested Bogotá calendar day/month as if it were a UTC day. As a result, a training created at 20:00 on the last day of a month (stored as 01:00 UTC the next day) is silently excluded by the Supabase query and never reaches the trainings panel, the shared reservations management screen, or the athlete's "mis reservas" history — even though the underlying data is correct.

## What Changes

- Add a shared helper `bogotaDayStartIso` / `bogotaDayEndIso` in `src/lib/portal/bogota-date.ts` that converts a "YYYY-MM-DD" Bogotá calendar day into the correct `-05:00`-offset ISO boundary (consistent with the existing `-05:00` convention already used by `toIsoFromDateAndTime` and `toBogotaIsoFromLocalInput`).
- Fix `entrenamientosService.listTrainingInstancesByTenantAndRange` (`src/services/supabase/portal/entrenamientos.service.ts`) to build its `gte`/`lte` range boundaries using the new helpers instead of literal UTC (`Z`) suffixes.
- Fix `reservasService.getReservasManagement` and `reservasService.getMisReservas` (`src/services/supabase/portal/reservas.service.ts`) to use the same helpers for both `fechaDesde` and `fechaHasta`, replacing the current inconsistent raw-string concatenation (one bound had no offset at all, the other had a bare `T23:59:59`).
- No UI, schema, or RLS changes — this is a backend query-boundary correctness fix.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `training-management`: adds an explicit, testable requirement that the monthly instance query (`listTrainingInstancesByTenantAndRange`) must include trainings whose tenant-local (Bogotá) calendar day falls within the requested range, even when their stored UTC instant falls on the next UTC day. This formalizes the previously-implicit, buggy behavior so it has a regression-test scenario going forward.

## Impact

- `src/lib/portal/bogota-date.ts` (new file)
- `src/services/supabase/portal/entrenamientos.service.ts` (`listTrainingInstancesByTenantAndRange`)
- `src/services/supabase/portal/reservas.service.ts` (`getReservasManagement`, `getMisReservas`)
- Affects: trainings panel calendar (`EntrenamientosPage.tsx`), shared reservations management (`gestion-reservas`), athlete personal reservations (`mis-reservas`)
- No database migrations, no RLS changes, no API contract changes
