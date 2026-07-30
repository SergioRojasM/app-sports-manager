# US-0083 — Fix incorrect timezone in "next trainings" times shown on Inicio

## ID
US-0083

## Name
Fix incorrect timezone in upcoming training times displayed on the Inicio (home/dashboard) page

## As a
Athlete viewing my upcoming trainings on the Inicio (home/dashboard) page

## I Want
The date and time of my featured training and my "Próximos Entrenamientos" list to be shown in Bogotá local time (the same timezone used everywhere else in the app)

## So That
I don't show up at the wrong time for a training because the home page displayed a UTC-shifted time instead of the actual Bogotá time I booked

---

## Description

### Current State

`entrenamientos.fecha_hora` is stored as `timestamptz` (UTC instant). Every other screen in the app that renders this value converts it explicitly to `America/Bogota` before formatting:

- `src/hooks/portal/entrenamientos/useEntrenamientos.ts:165-209` (`toDateOnlyFromIso`, `toDateTimeLocalInBogota`, `toBogotaIsoFromLocalInput`)
- `src/services/supabase/portal/entrenamientos.service.ts:140,294` (`toDateOnlyInBogota`, `toIsoFromDateAndTime`)
- `src/components/portal/entrenamientos/EntrenamientosPage.tsx:28` and `EntrenamientosCalendar.tsx:36` (`toDateKeyInBogota`)

All of these hardcode `timeZone: 'America/Bogota'` in an `Intl.DateTimeFormat`/`toLocaleDateString` call, consistent with the fixed `-05:00` offset convention already established by US-0075 (`src/lib/portal/bogota-date.ts`).

The Inicio page is the one place this was missed. Both `src/components/portal/inicio/InicioFeaturedTraining.tsx:4-10` and `src/components/portal/inicio/InicioProximosEntrenamientos.tsx:4-14` define an identical, locally-scoped `formatFecha` function:

```ts
function formatFecha(fechaStr: string): string {
  const date = new Date(fechaStr);
  const day = date.toLocaleDateString('es-CO', { weekday: 'short' });
  const dayMonth = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${day}, ${dayMonth} · ${time}`;
}
```

None of the three `toLocaleDateString`/`toLocaleTimeString` calls pass a `timeZone` option, so the result depends on the **runtime's local timezone**. Both components are Server Components (`InicioPage.tsx` → `InicioFeaturedTraining`/`InicioProximosEntrenamientos`, rendered from `src/app/portal/inicio/page.tsx`), so in production this renders in whatever timezone the Node.js server process runs in (typically UTC), not Bogotá. The result: a training booked for 8:00 p.m. Bogotá time shows as 1:00 a.m. (the next day) on the home page, while the exact same `fecha_hora` value shows correctly as 8:00 p.m. in the trainings management panel.

There is no organization/tenant-level timezone setting anywhere in the schema (only `entrenamientos_grupo.timezone`, scoped to training groups, populated with either `'America/Bogota'` or `'UTC'`) — the whole app hardcodes `America/Bogota` as the single local timezone, so the fix follows that same established convention rather than introducing per-tenant configuration.

### Proposed Changes

1. Add a new exported helper `formatBogotaDateTime(fechaStr: string): string` to the existing shared utility `src/lib/portal/bogota-date.ts` (already home to the Bogotá-offset helpers from US-0075). It reproduces the exact same output format as today's `formatFecha` (`"{weekday short}, {day} {month short} · {h:mm a}"`, `es-CO` locale) but adds `timeZone: 'America/Bogota'` to all three `toLocaleDateString`/`toLocaleTimeString` calls so the result is always Bogotá local time regardless of server runtime timezone.
2. Remove the duplicated local `formatFecha` function from `src/components/portal/inicio/InicioFeaturedTraining.tsx` and `src/components/portal/inicio/InicioProximosEntrenamientos.tsx`; import and use `formatBogotaDateTime` from `@/lib/portal/bogota-date` instead.
3. No other formatting behavior changes (locale, weekday/day/month/time layout, 12-hour clock) — this is strictly a timezone-correctness fix, not a redesign.

---

## Database Changes

None. `entrenamientos.fecha_hora` remains `timestamptz`; no migration required. No tenant/org timezone column is introduced — this fix follows the existing hardcoded `America/Bogota` convention used throughout the codebase.

---

## API / Server Actions

No new API surface, no service/hook changes. This is a pure presentation-layer fix confined to `src/lib/portal/bogota-date.ts` and the two Inicio components.

- **File:** `src/lib/portal/bogota-date.ts`
  - **New function:** `formatBogotaDateTime(fechaStr: string): string`
  - **Input:** `fechaStr` — an ISO `timestamptz` string (e.g. `entrenamiento.fecha_hora`)
  - **Return:** formatted string, e.g. `"lun, 21 jul · 8:00 p. m."`, always computed in `America/Bogota`
  - **Auth/RLS:** N/A (pure function, no data access)

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Utility | `src/lib/portal/bogota-date.ts` | Add exported `formatBogotaDateTime(fechaStr: string): string` using `timeZone: 'America/Bogota'` |
| Component | `src/components/portal/inicio/InicioFeaturedTraining.tsx` | Remove local `formatFecha`; import and use `formatBogotaDateTime` from `@/lib/portal/bogota-date` |
| Component | `src/components/portal/inicio/InicioProximosEntrenamientos.tsx` | Remove local `formatFecha`; import and use `formatBogotaDateTime` from `@/lib/portal/bogota-date` |

---

## Acceptance Criteria

1. A training with `fecha_hora` corresponding to `2026-07-21T20:00:00-05:00` (8:00 p.m. Bogotá) displays as `8:00 p. m.` (not `1:00 a. m.`) in both the featured training card and the "Próximos Entrenamientos" list on Inicio, regardless of the server process's local timezone.
2. The displayed date (weekday, day, month) for a training near a UTC day boundary (e.g. booked for 11:00 p.m. Bogotá) shows the correct Bogotá calendar day, not the next UTC day.
3. The displayed time on Inicio for a given training matches exactly the time shown for the same training in the trainings management panel (`EntrenamientosPage.tsx`/`EntrenamientosCalendar.tsx`).
4. Output string format/locale is unchanged from before the fix (same `es-CO` weekday/day/month/time layout) for trainings not near a timezone boundary — only the underlying timezone source changes.
5. No duplicated `formatFecha` function remains in either `InicioFeaturedTraining.tsx` or `InicioProximosEntrenamientos.tsx`.

---

## Implementation Steps

- [ ] Add `formatBogotaDateTime` to `src/lib/portal/bogota-date.ts`
- [ ] Update `InicioFeaturedTraining.tsx` to use `formatBogotaDateTime` and remove its local `formatFecha`
- [ ] Update `InicioProximosEntrenamientos.tsx` to use `formatBogotaDateTime` and remove its local `formatFecha`
- [ ] Run `tsc`/build to confirm no type errors
- [ ] Manually test: book/seed a training at 8:00 p.m.–11:59 p.m. Bogotá time and confirm Inicio shows the correct Bogotá day and time
- [ ] Manually compare the same training's displayed time on Inicio vs. the trainings management panel to confirm they match

---

## Non-Functional Requirements

- **Security**: No change to RLS or auth — presentation-only fix, no new data access.
- **Performance**: No impact; same data already fetched, only the formatting function changes.
- **Accessibility**: N/A — no markup/structure changes, only the text content of existing elements.
- **Error handling**: No new error paths. `formatBogotaDateTime` should behave like the current `formatFecha` for any input already handled today (no additional validation needed since `fecha_hora` is always a valid `timestamptz` string sourced from the database).
