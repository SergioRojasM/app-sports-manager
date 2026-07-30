## Context

`entrenamientos.fecha_hora` is stored as `timestamptz` (a UTC instant). Every screen that renders it must convert it to `America/Bogota` before display — the app has no configurable per-tenant timezone, so `America/Bogota` is hardcoded everywhere this conversion happens correctly (`useEntrenamientos.ts`, `entrenamientos.service.ts`, `EntrenamientosPage.tsx`, `EntrenamientosCalendar.tsx`), following the fixed `-05:00` offset convention established by the earlier US-0075 fix (`src/lib/portal/bogota-date.ts`).

The Inicio dashboard (`src/components/portal/inicio/InicioFeaturedTraining.tsx` and `InicioProximosEntrenamientos.tsx`) is the one place this conversion was never added: both define an identical local `formatFecha` that calls `toLocaleDateString`/`toLocaleTimeString` with no `timeZone` option, so the result depends on the Node.js server process's local timezone (typically UTC in production) rather than Bogotá.

## Goals / Non-Goals

**Goals:**
- Make Inicio's displayed training date/time always reflect `America/Bogota`, regardless of server runtime timezone.
- Eliminate the duplicated `formatFecha` implementation by extending the existing shared utility (`bogota-date.ts`) rather than introducing a new module.
- Keep the exact same visual output format (`"{weekday short}, {day} {month short} · {h:mm a}"`, `es-CO`) for any training not near a timezone boundary — this is a correctness fix, not a redesign.

**Non-Goals:**
- No configurable/per-tenant timezone setting — continues the existing hardcoded `America/Bogota` convention.
- No changes to data fetching, database schema, or the `InicioEntrenamiento` type.
- No changes to other screens that already convert correctly.

## Decisions

- **Extend `src/lib/portal/bogota-date.ts` rather than create a new file.** This file is already the established home for Bogotá-timezone helpers (from US-0075) and is a plain `src/lib/portal/` utility with no React/Server-Component dependencies, so it's importable from both Server Components unchanged.
- **Use `Intl.DateTimeFormat`/`toLocaleDateString`/`toLocaleTimeString` with an explicit `timeZone: 'America/Bogota'` option**, mirroring the exact three-call structure of the current `formatFecha`, instead of switching to a different formatting approach (e.g., `Intl.DateTimeFormat.formatToParts` used elsewhere in the codebase for date-only/date-time-local values). Rationale: `toLocaleDateString`/`toLocaleTimeString` already accept a `timeZone` option identical to `Intl.DateTimeFormat`, so the minimal, lowest-risk change is adding that one option to each of the three existing calls — this preserves the exact current output string shape with zero behavioral drift other than the timezone source.
- **Single new exported function `formatBogotaDateTime(fechaStr: string): string`** encapsulating all three calls, rather than exporting three separate helpers. The two call sites only ever need the combined string, so one function keeps the API surface minimal and matches how `formatFecha` is already consumed (call once, get the final display string).

## Risks / Trade-offs

- [Risk] A caller could pass a non-ISO/invalid string and get `Invalid Date` rendered → Mitigation: not a new risk — `fecha_hora` is always a valid `timestamptz` string sourced directly from Supabase; behavior matches today's `formatFecha`, no new validation needed.
- [Risk] Someone reintroduces a local, timezone-unaware formatter in a future Inicio component → Mitigation: keeping the helper in the shared `bogota-date.ts` module (rather than duplicating again) makes it the obvious import to reach for; no automated enforcement is proposed as part of this fix.

## Migration Plan

Pure code change, no data migration. Deploy as a normal frontend release; no rollback concerns beyond reverting the commit if a regression in the display format is observed.
