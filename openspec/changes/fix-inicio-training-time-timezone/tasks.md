## 1. Branch Setup

- [x] 1.1 Create a new branch named `fix/inicio-training-time-timezone`
- [x] 1.2 Validate the current working branch is not `main`, `master`, or `develop` before making changes

## 2. Utility

- [x] 2.1 Add exported `formatBogotaDateTime(fechaStr: string): string` to `src/lib/portal/bogota-date.ts`, reproducing the current `formatFecha` output shape (`"{weekday short}, {day} {month short} · {h:mm a}"`, `es-CO` locale) with `timeZone: 'America/Bogota'` added to each `toLocaleDateString`/`toLocaleTimeString` call

## 3. Components

- [x] 3.1 Update `src/components/portal/inicio/InicioFeaturedTraining.tsx` to import `formatBogotaDateTime` from `@/lib/portal/bogota-date` and remove its local `formatFecha` function
- [x] 3.2 Update `src/components/portal/inicio/InicioProximosEntrenamientos.tsx` to import `formatBogotaDateTime` from `@/lib/portal/bogota-date` and remove its local `formatFecha` function

## 4. Verification

- [x] 4.1 Run `tsc`/build to confirm no type errors
- [x] 4.2 Manually verify: a training stored for 8:00–11:59 p.m. Bogotá time displays the correct Bogotá calendar day and time on Inicio (featured card and list), regardless of server runtime timezone
- [x] 4.3 Manually compare the displayed time for the same training on Inicio vs. the trainings management panel (`EntrenamientosPage.tsx`/`EntrenamientosCalendar.tsx`) to confirm they match
- [x] 4.4 Confirm no duplicated `formatFecha` function remains in either Inicio component

## 5. Wrap-up

- [x] 5.1 Write commit message and pull request description summarizing the timezone fix for Inicio training times
