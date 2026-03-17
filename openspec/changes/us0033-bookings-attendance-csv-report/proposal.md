## Why

Administrators and coaches currently have no way to extract booking and attendance data from the Reservas panel without direct database access. A downloadable CSV report gives them an offline-friendly, shareable snapshot of participation data for any training session, enabling analysis and stakeholder reporting without engineering involvement.

## What Changes

- Add a **"Descargar CSV"** button to the `ReservasPanel` header, visible only to `administrador` and `entrenador` roles.
- Add a new service function `getReservasReport` in `reservas.service.ts` that fetches all bookings for a given training with athlete details, attendance records, and related lookup data in a single Supabase joined query.
- Create a new pure utility module `src/lib/csv.ts` with RFC 4180-compliant CSV generation and browser download helpers.
- Export a new `ReservaReportRow` type from `src/types/portal/reservas.types.ts`.

## Capabilities

### New Capabilities
- `bookings-csv-export`: Client-side CSV export of all bookings for a training session, including athlete profile data, booking state, and attendance record. Triggered from the Reservas panel, accessible only to `administrador` and `entrenador` roles.

### Modified Capabilities

_(none — no existing spec-level requirements are changing)_

## Impact

**Files to create:**
- `src/lib/csv.ts` — new utility: `escapeCsvField`, `toCsvString`, `downloadTextFile`

**Files to modify:**
- `src/services/supabase/portal/reservas.service.ts` — add `getReservasReport` function and `ReservaReportRow` type
- `src/types/portal/reservas.types.ts` — export `ReservaReportRow`
- `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` — add `isExporting` state, `handleExportCsv` handler, and "Descargar CSV" button

**DB tables read (no writes):**
`reservas`, `usuarios`, `entrenamientos`, `disciplinas`, `escenarios`, `asistencias`, `entrenamiento_categorias`, `nivel_disciplina`

**Dependencies:** None — no new npm packages, no new routes, no DB migrations, no RLS changes required. The operation is fully client-side and read-only.

## Non-goals

- No server-side CSV generation or API endpoint.
- No pagination or streaming for large datasets (training sessions are capped by `cupo_maximo`, typically < 50 bookings).
- No CSV export for other panels (subscriptions, team members, etc.) — this story is scoped to the Reservas panel only.
- No email delivery or cloud upload of the generated file.
- No new RLS policies — existing policies already restrict `asistencias` SELECT to admins/coaches.

## Implementation Plan

1. **Service** (`reservas.service.ts`): Add `ReservaReportRow` type and `getReservasReport(tenantId, entrenamientoId)` using a Supabase joined select query; flatten nested result to `ReservaReportRow[]`.
2. **Types** (`reservas.types.ts`): Re-export `ReservaReportRow`.
3. **Utility** (`src/lib/csv.ts`): Implement `escapeCsvField` (RFC 4180), `toCsvString<T>`, and `downloadTextFile` (Blob + `URL.createObjectURL`, UTF-8 BOM for Excel compatibility).
4. **Component** (`ReservasPanel.tsx`): Add `isExporting` state, wire `handleExportCsv` async handler (set loading → fetch → build CSV → download → reset; catch with `window.alert`), render "Descargar CSV" button with `download` icon only when `isAdmin === true`.
