# US-0033 — Bookings and Attendance CSV Report

## ID
US-0033

## Name
Generate Bookings and Attendance CSV Report from the Reservas Panel

## As a
Tenant administrator or coach

## I Want
To download a CSV report from the Reservas panel of a training session that contains the full list of bookings, athlete details, and attendance records

## So That
I can analyze participation data, track attendance trends, and share reports with other stakeholders without needing direct database access

---

## Description

In the portal, administrators and coaches can open the **Reservas panel** (slide-over) of any training session (`gestion-entrenamientos`) and view the list of bookings. This story adds a **"Descargar CSV"** button to that panel. When clicked, the button triggers a client-side CSV generation that queries all bookings for the selected training, enriches each row with athlete profile data and attendance record, and triggers a browser download of the resulting `.csv` file.

### Functional Details

1. A **"Descargar CSV"** button (with a download icon) is displayed in the header area of `ReservasPanel.tsx`, visible **only** to roles `administrador` and `entrenador`.
2. Clicking the button:
   a. Sets a local `isExporting` state (`true`) to disable the button and show a loading indicator.
   b. Calls a new service function that performs a single Supabase query joining all required tables.
   c. Transforms the result into CSV format client-side.
   d. Triggers a browser file download (`<a>` element with `href` = object URL).
   e. Resets `isExporting` to `false`.
3. The generated filename uses the training name and date: `reservas_{training_slug}_{YYYY-MM-DD}.csv`.
4. If there are no bookings for the selected training, the export still produces a valid CSV file containing only the header row.
5. If the export query fails, a `window.alert` with the error message is shown (consistent with the existing pattern in the panel).

---

## CSV Report Structure

Each row in the CSV file represents **one booking**. All booking states must be included (`pendiente`, `confirmada`, `cancelada`, `completada`).

### Columns

| Column (header)          | Source                                               |
|--------------------------|------------------------------------------------------|
| `entrenamiento_nombre`   | `entrenamientos.nombre`                              |
| `entrenamiento_fecha`    | `entrenamientos.fecha_hora` (formatted `YYYY-MM-DD HH:mm`) |
| `disciplina`             | `disciplinas.nombre`                                 |
| `escenario`              | `escenarios.nombre`                                  |
| `nivel_disciplina`       | `nivel_disciplina.nombre` (via `entrenamiento_categorias`) |
| `reserva_id`             | `reservas.id`                                        |
| `reserva_estado`         | `reservas.estado`                                    |
| `fecha_reserva`          | `reservas.fecha_reserva` (formatted `YYYY-MM-DD HH:mm`) |
| `fecha_cancelacion`      | `reservas.fecha_cancelacion` (formatted or empty)    |
| `notas_reserva`          | `reservas.notas`                                     |
| `atleta_nombre`          | `usuarios.nombre`                                    |
| `atleta_apellido`        | `usuarios.apellido`                                  |
| `atleta_email`           | `usuarios.email`                                     |
| `atleta_telefono`        | `usuarios.telefono`                                  |
| `tipo_identificacion`    | `usuarios.tipo_identificacion`                       |
| `numero_identificacion`  | `usuarios.numero_identificacion`                     |
| `asistio`                | `asistencias.asistio` → `"Sí"` / `"No"` / `"Sin registrar"` |
| `fecha_asistencia`       | `asistencias.fecha_asistencia` (formatted or empty)  |
| `observaciones_asistencia` | `asistencias.observaciones`                        |
| `validado_por_email`     | `usuarios.email` for `asistencias.validado_por`      |

---

## DB Tables Involved

```
reservas            → bookings (id, tenant_id, atleta_id, entrenamiento_id, estado, fecha_reserva,
                       notas, fecha_cancelacion, created_at, entrenamiento_categoria_id)
usuarios            → athlete profile (nombre, apellido, email, telefono,
                       tipo_identificacion, numero_identificacion)
entrenamientos      → training instance (nombre, fecha_hora, disciplina_id, escenario_id)
disciplinas         → discipline name
escenarios          → scenario name
asistencias         → attendance record (reserva_id, asistio, fecha_asistencia, observaciones,
                       validado_por) [LEFT JOIN — optional]
entrenamiento_categorias → level booking (entrenamiento_categoria_id → nivel_id)
nivel_disciplina    → level name (nombre)
usuarios (alias v)  → validator name / email via asistencias.validado_por [LEFT JOIN]
```

### Query Pattern (Supabase client)

```typescript
// Pseudocode — use Supabase chained select syntax
supabase
  .from('reservas')
  .select(`
    id,
    estado,
    fecha_reserva,
    notas,
    fecha_cancelacion,
    created_at,
    atleta:usuarios!reservas_atleta_id_fkey (
      nombre, apellido, email, telefono,
      tipo_identificacion, numero_identificacion
    ),
    entrenamiento:entrenamientos!reservas_entrenamiento_id_fkey (
      nombre, fecha_hora,
      disciplina:disciplinas!entrenamientos_disciplina_id_fkey ( nombre ),
      escenario:escenarios!entrenamientos_escenario_id_fkey ( nombre )
    ),
    asistencia:asistencias!asistencias_reserva_id_fkey (
      asistio, fecha_asistencia, observaciones,
      validador:usuarios!asistencias_validado_por_fkey ( email )
    ),
    categoria:entrenamiento_categorias!reservas_entrenamiento_categoria_id_fkey (
      nivel:nivel_disciplina!entrenamiento_categorias_nivel_id_fkey ( nombre )
    )
  `)
  .eq('tenant_id', tenantId)
  .eq('entrenamiento_id', entrenamientoId)
  .order('created_at', { ascending: true })
```

> **RLS Note**: The `asistencias` SELECT policy allows only admins and coaches. Since only `administrador` and `entrenador` roles can access the CSV button, the join will always succeed within its security context. The `usuarios` table is readable by all authenticated members per existing policy.

---

## Files to Create or Modify

### 1. `src/services/supabase/portal/reservas.service.ts` *(modify)*

Add a new exported function:

```typescript
export type ReservaReportRow = {
  reserva_id: string;
  reserva_estado: string;
  fecha_reserva: string | null;
  notas_reserva: string | null;
  fecha_cancelacion: string | null;
  atleta_nombre: string | null;
  atleta_apellido: string | null;
  atleta_email: string;
  atleta_telefono: string | null;
  tipo_identificacion: string | null;
  numero_identificacion: string | null;
  nivel_disciplina: string | null;
  entrenamiento_nombre: string | null;
  entrenamiento_fecha: string | null;
  disciplina: string | null;
  escenario: string | null;
  asistio: boolean | null;
  fecha_asistencia: string | null;
  observaciones_asistencia: string | null;
  validado_por_email: string | null;
};

// getReservasReport: fetch and flatten all data needed for CSV export
export async function getReservasReport(
  tenantId: string,
  entrenamientoId: string,
): Promise<ReservaReportRow[]>
```

The function performs the Supabase joined query described above and maps the nested objects to the flat `ReservaReportRow` shape.

### 2. `src/lib/csv.ts` *(create)*

A pure utility with no external dependencies:

```typescript
// Escape a single CSV field value (RFC 4180)
function escapeCsvField(value: string | null | undefined): string

// Convert an array of objects to a CSV string
// Keys of the first object become the header row
export function toCsvString<T extends Record<string, unknown>>(rows: T[]): string

// Trigger a browser download of a text file
export function downloadTextFile(content: string, filename: string, mimeType?: string): void
```

### 3. `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` *(modify)*

- Import `getReservasReport` from `reservas.service.ts` and `{ toCsvString, downloadTextFile }` from `@/lib/csv`.
- Add `isExporting: boolean` local state.
- Add an `handleExportCsv` async handler that:
  1. Sets `isExporting = true`.
  2. Calls `getReservasReport(tenantId, instance.id)`.
  3. Calls `toCsvString(rows)`.
  4. Calls `downloadTextFile(csv, filename)`.
  5. Catches errors and calls `window.alert(...)`.
  6. Sets `isExporting = false` in a finally block.
- Add the "Descargar CSV" button in the panel **header**, to the left of the close button, only when `isAdmin === true`. Button is disabled while `isExporting`. Use the existing `material-symbols-outlined` icon `download`.

### 4. `src/types/portal/reservas.types.ts` *(modify)*

Add the `ReservaReportRow` type export (or co-locate it in the service file — developer may choose, but the type should be exported for potential reuse).

---

## Acceptance Criteria

- [ ] **AC-1**: The "Descargar CSV" button is visible in the Reservas panel header for `administrador` and `entrenador` roles only; it is not rendered for `atleta` role.
- [ ] **AC-2**: Clicking the button in a panel with bookings downloads a valid `.csv` file with the correct headers and one data row per booking (all states included).
- [ ] **AC-3**: The CSV filename follows the pattern `reservas_{slug}_{date}.csv` where slug is the training name lowercased with spaces replaced by underscores and date is `YYYY-MM-DD` derived from `fecha_hora`.
- [ ] **AC-4**: Athlete data includes: name, last name, email, phone, ID type, ID number.
- [ ] **AC-5**: Attendance columns correctly reflect `"Sí"` / `"No"` / `"Sin registrar"` based on the presence and value of the `asistencias` record.
- [ ] **AC-6**: Fields containing commas or double-quotes are properly escaped per RFC 4180 (field wrapped in quotes, inner quotes doubled).
- [ ] **AC-7**: If no bookings exist, the downloaded file contains only the header row (no crash).
- [ ] **AC-8**: The button shows a disabled/loading state during the export and returns to normal after completion or error.
- [ ] **AC-9**: If the service call fails (network error, RLS rejection), a user-friendly alert is shown and the button re-enables.
- [ ] **AC-10**: The export does not alter any database state (read-only operation).

---

## Steps to Complete

1. **Add `getReservasReport` to `reservas.service.ts`**: Write the joined Supabase query and flatten the nested result into `ReservaReportRow[]`. Add the `ReservaReportRow` type to `src/types/portal/reservas.types.ts`.
2. **Create `src/lib/csv.ts`**: Implement `escapeCsvField`, `toCsvString`, and `downloadTextFile` utilities with proper RFC 4180 escaping.
3. **Modify `ReservasPanel.tsx`**: Add `isExporting` state, `handleExportCsv`, and the "Descargar CSV" button (admin/coach only).
4. **Manual test**: Open the Reservas panel as admin for a training with bookings → click Download → verify file opens correctly in a spreadsheet application.
5. **Manual test**: Verify button is absent when logged in as `atleta`.
6. **Manual test**: Verify export with a training that has zero bookings produces a header-only CSV.
7. **Manual test**: Verify attendance columns for bookings that have an attendance record vs. those that do not.

---

## Non-Functional Requirements

- **Security**: The export button is gated client-side by `role === 'administrador' || role === 'entrenador'`. The underlying Supabase query is further protected by existing RLS policies — `asistencias` SELECT is restricted to admins/coaches only. No new RLS policy changes are required.
- **Performance**: The query fetches data for a single `entrenamiento_id` at a time. Typical training sessions are capped at `cupo_maximo` bookings (usually < 50). No pagination is required. A single round-trip is sufficient.
- **Privacy**: CSV files are generated entirely client-side and never uploaded to any server. No additional PII storage is introduced.
- **Compatibility**: `downloadTextFile` must use `Blob` + `URL.createObjectURL` + an `<a>` click — compatible with all modern browsers. The CSV must be encoded as UTF-8 with BOM (`\uFEFF`) so it opens correctly in Microsoft Excel.
- **No new routes or API endpoints** are needed — all data is retrieved via the existing Supabase browser client.
- **No new npm packages** should be added — the CSV utility is implemented from scratch using standard browser APIs.
