## 1. Branch Setup

- [x] 1.1 Create a new branch: `feat/us0033-bookings-attendance-csv-report`
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop`

## 2. Database Migration — reservas_reporte_view

- [x] 2.1 Create migration file `supabase/migrations/20260318000000_reservas_reporte_view.sql`
- [x] 2.2 Write the `CREATE OR REPLACE VIEW public.reservas_reporte_view` statement joining: `reservas`, `usuarios` (athlete via `reservas_atleta_id_fkey`), `entrenamientos`, `disciplinas`, `escenarios`, `asistencias` (LEFT JOIN via `asistencias_reserva_id_fkey`), `usuarios` alias `validador` (LEFT JOIN via `asistencias_validado_por_fkey`), `entrenamiento_categorias` (LEFT JOIN), `nivel_disciplina` (LEFT JOIN)
- [x] 2.3 Expose all columns required by `ReservaReportRow`: `reserva_id`, `tenant_id`, `entrenamiento_id`, `reserva_estado`, `fecha_reserva`, `fecha_cancelacion`, `notas_reserva`, `atleta_nombre`, `atleta_apellido`, `atleta_email`, `atleta_telefono`, `tipo_identificacion`, `numero_identificacion`, `nivel_disciplina`, `entrenamiento_nombre`, `entrenamiento_fecha`, `disciplina`, `escenario`, `asistio`, `fecha_asistencia`, `observaciones_asistencia`, `validado_por_email`
- [x] 2.4 Add `GRANT SELECT ON public.reservas_reporte_view TO authenticated;` at the end of the migration
- [x] 2.5 Apply the migration locally with `supabase db reset` or `supabase migration up` and verify the view exists

## 3. Types

- [x] 3.1 Add `ReservaReportRow` type to `src/types/portal/reservas.types.ts` with all 20 flat columns matching the view output (use `string | null` for nullable fields; `boolean | null` for `asistio`)

## 4. Service

- [x] 4.1 Add `getReservasReport(tenantId: string, entrenamientoId: string): Promise<ReservaReportRow[]>` to `src/services/supabase/portal/reservas.service.ts`
- [x] 4.2 Query `.from('reservas_reporte_view').select('*').eq('tenant_id', tenantId).eq('entrenamiento_id', entrenamientoId).order('fecha_reserva', { ascending: true })`
- [x] 4.3 Throw a `ReservaServiceError` on Supabase error (reuse existing `mapServiceError` helper)
- [x] 4.4 Return the raw rows (do NOT map `asistio` boolean to string in the service — leave that to the CSV layer)

## 5. CSV Utility

- [x] 5.1 Create `src/lib/csv.ts`
- [x] 5.2 Implement `escapeCsvField(value: string | null | undefined): string` — wraps fields containing `,`, `"`, or `\n` in double-quotes and doubles inner quotes (RFC 4180)
- [x] 5.3 Implement `toCsvString<T extends Record<string, unknown>>(rows: T[]): string` — uses keys of the first row as the header; handles empty array (returns header-only string); calls `escapeCsvField` on every cell value
- [x] 5.4 Implement `downloadTextFile(content: string, filename: string, mimeType?: string): void` — creates a `Blob` with UTF-8 BOM (`\uFEFF` + content), sets `mimeType` default to `text/csv;charset=utf-8;`, triggers download via `URL.createObjectURL` + hidden `<a>` click, then revokes the object URL

## 6. Component — ReservasPanel

- [x] 6.1 Open `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx`
- [x] 6.2 Import `getReservasReport` from `@/services/supabase/portal/reservas.service`
- [x] 6.3 Import `toCsvString` and `downloadTextFile` from `@/lib/csv`
- [x] 6.4 Add `const [isExporting, setIsExporting] = useState(false)` state
- [x] 6.5 Implement `handleExportCsv` async function:
  - Sets `isExporting = true`
  - Calls `getReservasReport(tenantId, instance.id)`
  - Maps each row's `asistio` field: `true → "Sí"`, `false → "No"`, `null → "Sin registrar"`
  - Formats date fields (`entrenamiento_fecha`, `fecha_reserva`, `fecha_cancelacion`, `fecha_asistencia`) to `YYYY-MM-DD HH:mm`
  - Builds filename: training name lowercased, spaces → underscores, date from `fecha_hora` as `YYYY-MM-DD`
  - Calls `toCsvString(rows)` then `downloadTextFile(csv, filename)`
  - Catches errors and calls `window.alert(error.message ?? 'Error al exportar')`
  - Sets `isExporting = false` in a `finally` block
- [x] 6.6 Add "Descargar CSV" button in the panel header, visible only when `isAdmin === true`:
  - Uses `material-symbols-outlined` icon `download`
  - Disabled when `isExporting === true`
  - Shows a spinner or "Exportando..." label while `isExporting`

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md` to document:
  - New file `src/lib/csv.ts` and its exported functions
  - New DB view `reservas_reporte_view`
  - New function `getReservasReport` in `reservas.service.ts`
  - New type `ReservaReportRow` in `reservas.types.ts`

## 8. Validation

- [x] 8.1 Run `npm run build` (or `tsc --noEmit`) — no type errors
- [x] 8.2 Manual test: open Reservas panel as `administrador` for a training with bookings → click "Descargar CSV" → verify file downloads and opens correctly in a spreadsheet
- [x] 8.3 Manual test: verify the CSV has exactly 20 columns in the correct order
- [x] 8.4 Manual test: verify attendance columns show `Sí` / `No` / `Sin registrar` correctly
- [x] 8.5 Manual test: open Reservas panel as `atleta` → verify "Descargar CSV" button is absent
- [x] 8.6 Manual test: trigger export for a training with zero bookings → verify header-only CSV downloads without error

## 9. Commit and Pull Request

- [x] 9.1 Stage all changes and create a commit with message:
  `feat(us0033): add bookings attendance CSV export from Reservas panel`
- [x] 9.2 Push branch and open a pull request with description:
  > Adds a "Descargar CSV" button to the Reservas panel (admin/coach only). Introduces `reservas_reporte_view` DB view for efficient flat data access, `src/lib/csv.ts` RFC 4180 utility, `getReservasReport` service function, and `ReservaReportRow` type. All CSV generation is client-side with no new API routes or npm packages.
