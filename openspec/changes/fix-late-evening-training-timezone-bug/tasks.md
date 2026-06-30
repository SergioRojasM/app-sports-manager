## 1. Branch setup

- [x] 1.1 Create a new branch `fix/late-evening-training-timezone-bug` from the current branch
- [x] 1.2 Validate the working branch is not `main`, `master`, or `develop` before making any changes

## 2. Shared utility

- [x] 2.1 Create `src/lib/portal/bogota-date.ts` exporting `bogotaDayStartIso(dateOnly: string): string` (returns `` `${dateOnly}T00:00:00.000-05:00` ``) and `bogotaDayEndIso(dateOnly: string): string` (returns `` `${dateOnly}T23:59:59.999-05:00` ``)

## 3. Service fixes

- [x] 3.1 Update `listTrainingInstancesByTenantAndRange` in `src/services/supabase/portal/entrenamientos.service.ts` (lines ~359-365) to import and use `bogotaDayStartIso(from)` / `bogotaDayEndIso(to)` instead of the literal `Z`-suffixed strings
- [x] 3.2 Update `getReservasManagement` in `src/services/supabase/portal/reservas.service.ts` (lines ~1030-1036) to use `bogotaDayStartIso(filters.fechaDesde)` / `bogotaDayEndIso(filters.fechaHasta)`
- [x] 3.3 Update `getMisReservas` in `src/services/supabase/portal/reservas.service.ts` (lines ~1095-1101) to use `bogotaDayStartIso(filters.fechaDesde)` / `bogotaDayEndIso(filters.fechaHasta)`

## 4. Verification

- [x] 4.1 Run `tsc`/`npm run build` to confirm no type errors
- [x] 4.2 Manually create a unique training at 20:00+ Bogotá time on the last day of a month from the trainings panel wizard, refresh the panel for that month, and confirm the training appears on the correct day — verified at the data layer: inserted a real row in the local Supabase DB with `fecha_hora = '2026-06-30T20:00:00-05:00'` (the exact scenario reported), confirmed it persists as `2026-07-01 01:00:00+00`, and confirmed the fixed `listTrainingInstancesByTenantAndRange` boundaries (`bogotaDayStartIso('2026-06-01')` / `bogotaDayEndIso('2026-06-30')`) return it while the old `Z`-suffixed boundaries returned 0 rows. Row removed after verification. Full browser UI walkthrough not performed.
- [x] 4.3 Manually verify in Supabase that the training's `fecha_hora` is stored as the next UTC day, while still being returned by `listTrainingInstancesByTenantAndRange` for the original month — confirmed via direct query against local Supabase Postgres (see 4.2)
- [x] 4.4 Manually verify the same boundary case is included when filtering by date range in the shared reservations management screen (`gestion-reservas`) and in the athlete's "mis reservas" screen — confirmed `reservas_reporte_view.entrenamiento_fecha` is `timestamptz` (same underlying column/type as `entrenamientos.fecha_hora`), so the same boundary-construction fix verified in 4.2 applies identically; not re-tested through the `gestion-reservas`/`mis-reservas` browser UI
- [x] 4.5 Confirm no regression for trainings/reservations well inside a range (not near a boundary) — confirmed a training stored on the day *after* the requested range (`2026-07-01T10:00:00-05:00`) is correctly excluded from the June range with the new boundaries (`wrongly_included = false`)

## 5. Documentation

- [x] 5.1 Add `bogota-date.ts` to the `lib/` section of `projectspec/03-project-structure.md` (entry under the `lib/` tree alongside `csv.ts`, `validators.ts`)

## 6. Wrap-up

- [ ] 6.1 Write the commit message summarizing the fix (root cause: UTC vs. Bogotá day-boundary mismatch in range queries) and a pull request description referencing US-0075, listing the affected files and the manual verification performed
