## Why

Training times on the Inicio (home/dashboard) page are rendered without an explicit timezone, so a Server Component running in a UTC server environment displays a Bogotá 8:00 p.m. training as 1:00 a.m. the next day. Every other screen in the app (trainings management panel, calendar) already renders `fecha_hora` in `America/Bogota` — Inicio is the one place this was missed, and athletes risk showing up at the wrong time for a training they booked correctly.

## What Changes

- Add a shared `formatBogotaDateTime(fechaStr: string): string` helper to the existing `src/lib/portal/bogota-date.ts` utility (created for the related timezone fix US-0075), producing the same `"{weekday short}, {day} {month short} · {h:mm a}"` `es-CO` output as today, but always computed in `America/Bogota` regardless of server runtime timezone.
- Update `InicioFeaturedTraining.tsx` and `InicioProximosEntrenamientos.tsx` to import and use `formatBogotaDateTime` instead of their duplicated, timezone-unaware local `formatFecha` functions.
- Remove the two duplicated local `formatFecha` implementations.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `user-home-dashboard`: The "Featured next training card" and "Upcoming trainings list" requirements are updated to specify that displayed date/time SHALL be computed in the `America/Bogota` timezone rather than the server runtime's local timezone.

## Impact

- Affected files: `src/lib/portal/bogota-date.ts`, `src/components/portal/inicio/InicioFeaturedTraining.tsx`, `src/components/portal/inicio/InicioProximosEntrenamientos.tsx`.
- No database, service, hook, or API changes — `fetchProximosEntrenamientos` in `inicio.service.ts` and the `InicioEntrenamiento` type are unaffected; this is a presentation-layer-only fix.
- No new dependencies.

## Non-goals

- No change to the underlying data model (`entrenamientos.fecha_hora` remains `timestamptz`).
- No introduction of a configurable per-tenant/per-org timezone setting — the fix follows the existing hardcoded `America/Bogota` convention used everywhere else in the codebase.
- No redesign of the Inicio page layout, locale, or date/time string format — only the timezone source used to compute that string changes.
- No changes to `entrenamientos.service.ts`, `useEntrenamientos.ts`, or other screens that already convert to Bogotá time correctly.

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Utility | `src/lib/portal/bogota-date.ts` | Add exported `formatBogotaDateTime(fechaStr: string): string` |
| Component | `src/components/portal/inicio/InicioFeaturedTraining.tsx` | Remove local `formatFecha`; use `formatBogotaDateTime` |
| Component | `src/components/portal/inicio/InicioProximosEntrenamientos.tsx` | Remove local `formatFecha`; use `formatBogotaDateTime` |

## Step-by-Step Implementation Plan

1. Add `formatBogotaDateTime` to `src/lib/portal/bogota-date.ts`, mirroring the existing `formatFecha` logic but with `timeZone: 'America/Bogota'` added to each `Intl`/`toLocaleDateString`/`toLocaleTimeString` call.
2. Update `InicioFeaturedTraining.tsx` to import `formatBogotaDateTime` from `@/lib/portal/bogota-date` and remove its local `formatFecha` function.
3. Update `InicioProximosEntrenamientos.tsx` the same way.
4. Run `tsc`/build to confirm no type errors.
5. Manually verify: a training stored for 8:00–11:59 p.m. Bogotá time displays the correct Bogotá day and time on Inicio, matching the trainings management panel.
