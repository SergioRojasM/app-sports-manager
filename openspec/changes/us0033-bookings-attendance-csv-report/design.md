## Context

The Reservas panel (`ReservasPanel.tsx`) is an existing slide-over component used by administrators and coaches to manage bookings for a training session. It already receives `tenantId`, `instance`, and `role` as props, and renders booking rows with attendance status badges.

The `reservas.service.ts` already fetches bookings with a partial join (athlete name, category). The `reservas.types.ts` file hosts all booking-related types. There is currently no `src/lib/` utility for CSV operations — `src/lib/constants.ts` is the only file there.

All data required for the report (bookings, athlete profiles, attendance, training metadata, discipline, scenario, and level) is accessible through the existing Supabase browser client under the current RLS policies. A new PostgreSQL view (`reservas_reporte_view`) will be introduced via migration to pre-join all required tables, simplifying the client query to a flat select filtered by `tenant_id` and `entrenamiento_id`.

## Goals / Non-Goals

**Goals:**
- Create a DB view `reservas_reporte_view` that pre-joins all required tables and exposes a flat row per booking.
- Implement RFC 4180-compliant CSV generation and browser download as a reusable pure utility.
- Render a "Descargar CSV" button in the `ReservasPanel` header, gated to `administrador`/`entrenador` roles, with loading state during export.
- Export `ReservaReportRow` type for potential reuse.

**Non-Goals:**
- No server-side CSV generation, API endpoints, or streaming.
- No pagination (training sessions are bounded by `cupo_maximo`, typically < 50 rows).
- No export from other panels (subscriptions, team members, etc.).
- No email delivery or cloud storage of generated files.
- No new RLS policies beyond granting SELECT on the view to `authenticated`.
- No new npm packages.

## Decisions

### 1. Client-side CSV generation (vs. a server-side API route)

**Decision**: Generate the CSV entirely in the browser using the Supabase JS client and `Blob` + `URL.createObjectURL`.

**Rationale**: The dataset is small (bounded by `cupo_maximo`), all required data is already accessible via the browser client under existing RLS, and this avoids adding an API route, server auth context, and deployment complexity. An API route would add latency and a new attack surface with no benefit at this scale.

**Alternative considered**: A Next.js Route Handler (`/api/export/reservas`) that runs the query server-side. Rejected because it requires a service-role key exposure and additional auth validation, for no gain.

---

### 2. New `src/lib/csv.ts` utility (vs. inline logic in the component)

**Decision**: Extract `escapeCsvField`, `toCsvString`, and `downloadTextFile` into a standalone `src/lib/csv.ts` module.

**Rationale**: RFC 4180 escaping is non-trivial to get right (quote-wrapping, double-quote doubling). Isolating it makes the logic independently testable and reusable for future export features (e.g., subscriptions, attendance-only reports).

---

### 3. DB view for report data (vs. nested Supabase join in the client)

**Decision**: Create a PostgreSQL view `reservas_reporte_view` that performs all joins server-side. The client query becomes a simple flat `SELECT * FROM reservas_reporte_view WHERE tenant_id = $1 AND entrenamiento_id = $2`.

**Rationale**: The multi-level nested join required to assemble all columns (`reservas → usuarios`, `entrenamientos → disciplinas/escenarios`, `asistencias → usuarios` for validator, `entrenamiento_categorias → nivel_disciplina`) is complex to express in Supabase's PostgREST syntax and hard to read/maintain as TypeScript. Centralising the join logic in a view:
- Eliminates FK hint fragility (`table!fk_name` syntax) in client code.
- Gives the PostgreSQL query planner full visibility to optimise the join.
- Makes the service function trivial: one `.from('reservas_reporte_view').select('*').eq(...)` call.
- The flat result maps directly to `ReservaReportRow` — no nested object destructuring.

**Alternative considered**: Nested `.select()` with FK hints directly from the client. Rejected because it is brittle (FK constraint name changes break the query) and produces a nested JSON shape that requires manual flattening.

**Migration**: A new migration file creates the view and grants `SELECT` to the `authenticated` role. RLS is enforced via `tenant_id` column filter — the view exposes `tenant_id` so the calling code always scopes by it. No `security_definer` needed.

---

### 4. `ReservaReportRow` type location

**Decision**: Define `ReservaReportRow` in `reservas.service.ts` and re-export it from `src/types/portal/reservas.types.ts`.

**Rationale**: The type is tightly coupled to the service query shape. Co-locating it with the function that produces it makes the contract explicit. Re-exporting from the types barrel keeps the public interface consistent with the rest of the codebase.

---

### 5. UTF-8 BOM prefix

**Decision**: Prepend `\uFEFF` to the CSV content in `downloadTextFile`.

**Rationale**: Microsoft Excel does not detect UTF-8 encoding without a BOM, causing diacritics (e.g., Spanish accented characters) to render as garbage. All modern browsers and text editors handle the BOM correctly. This is the least-friction solution for the target users.

---

### 6. Filename pattern

**Decision**: `reservas_{slug}_{YYYY-MM-DD}.csv` where slug = training name lowercased with spaces replaced by underscores; date derived from `fecha_hora`.

**Rationale**: Makes files self-identifying when saved to disk. Consistent with the user story specification.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Large training sessions (edge case where `cupo_maximo` is null or very high) could generate a slow or large file | Document this as a non-supported case; the current RLS and design assumes bounded sessions. Can add pagination later if needed. |
| DB view must be kept in sync with table schema changes | View is defined with explicit column aliases; any column rename or table structural change requires a view rebuild. Document this in the migration comment. |
| `asistencias` LEFT JOIN in the view returns `null` for bookings without an attendance record | View uses `LEFT JOIN`; service maps `asistio IS NULL` → `"Sin registrar"`, `true` → `"Sí"`, `false` → `"No"`. |
| View bypasses table-level RLS if called without a tenant filter | The view does NOT use `security_definer`. The service function always scopes by `tenant_id`. Supabase applies the underlying table RLS for the authenticated user. |
| CSV fields containing commas, newlines, or double-quotes could break parsers | RFC 4180 escaping in `escapeCsvField` wraps any field containing `,`, `"`, or `\n` in double-quotes, doubling inner quotes. |
| Button visible to `entrenador` role — `asistencias` RLS already restricts reads to admin/coach | No additional client-side guard needed; RLS is the authoritative control. The button condition (`isAdmin`) aligns with existing panel logic. |

## Implementation Order

Following the page → component → service → types → utility convention adapted for this change:

1. **Migration** — new file in `supabase/migrations/`: Create `reservas_reporte_view` with all required joins and column aliases; grant `SELECT` to `authenticated`.
2. **Types** — `reservas.types.ts`: Add and export `ReservaReportRow` (flat type matching view columns).
3. **Service** — `reservas.service.ts`: Add `getReservasReport(tenantId, entrenamientoId)` querying `reservas_reporte_view`; map `asistio` boolean to string label.
4. **Utility** — `src/lib/csv.ts`: `escapeCsvField`, `toCsvString<T>`, `downloadTextFile` (UTF-8 BOM for Excel).
5. **Component** — `ReservasPanel.tsx`: `isExporting` state, `handleExportCsv`, "Descargar CSV" button.
