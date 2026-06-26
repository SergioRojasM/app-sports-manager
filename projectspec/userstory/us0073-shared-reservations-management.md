# US-0073 — Shared Reservations Management with Server-Side Filtering

## ID
US-0073

## Name
Shared reservations management page with server-side filtering, pagination warning, and CSV export

## As a
Administrator or Coach

## I Want
A shared reservations management page that shows the last 100 reservations ordered by date, with the ability to filter by athlete, attendance status, discipline, and date range — where filters re-execute the database query rather than filtering in memory

## So That
I can efficiently review and audit athlete reservation history across all trainings in the organization, identify attendance patterns, and export filtered results for reporting purposes

---

## Description

### Current State
Reservations are currently only visible within the context of a single training session, inside the `ReservasPanel` component accessed from the training detail view. There is no cross-training view that allows admins/coaches to see all reservations across the organization, filter by athlete, or analyze attendance patterns. The existing `reservas_reporte_view` provides a flat join of reservas with athlete, training, discipline, scenario, and attendance data — but is only used for per-training CSV export.

### Proposed Changes

#### 1. New Shared Page
Create a new shared page at `/portal/orgs/[tenant_id]/(shared)/gestion-reservas` accessible to both administrators and coaches (any valid tenant role via the shared layout guard).

#### 2. Default View — Last 100 Reservations
- On initial load, query the last 100 reservations for the tenant ordered by `entrenamiento_fecha DESC` (training date, most recent first).
- Display an informational banner warning: *"Mostrando las últimas 100 reservas. Para obtener más resultados, utiliza los filtros."*

#### 3. Server-Side Filter Panel
A filter panel that, when applied, re-executes the database query (not in-memory filtering). Filters:

| Filter | Type | Options |
|--------|------|---------|
| **Date range** | Preset chips + custom range | `Últimos 7 días`, `Último mes`, `Mes a la fecha`, `Rango personalizado` (max 60 days) |
| **Athlete** | Search input (autocomplete from tenant members) | Searches by `nombre`, `apellido`, `email`, or `numero_identificacion` |
| **Attendance** | Chip filter | `Todos`, `Asistió`, `No asistió`, `Sin registrar` |
| **Discipline** | Dropdown select | Lists all active disciplines for the tenant |

When any filter is active, the 100-row limit is removed (the query returns all matching rows within the date range constraint of max 60 days). The banner changes to show the count of results found.

#### 4. Results Table
Each row displays:

| Column | Content |
|--------|---------|
| **Atleta** | Two-line cell: line 1 = `nombre apellido`, line 2 = `email` · `numero_identificacion` |
| **Disciplina** | Discipline name from the training |
| **Entrenamiento** | Training name |
| **Fecha entrenamiento** | Formatted `fecha_hora` of the training |
| **Estado reserva** | Badge: `confirmada`, `pendiente`, `cancelada`, `completada` |
| **Asistencia** | Badge: `Asistió` (green), `No asistió` (red), `Sin registrar` (gray) |
| **Fecha reserva** | When the reservation was created |

Table should support client-side pagination (page size 25/50/100).

#### 5. CSV Export
A button to export the currently displayed (filtered) rows to CSV. Uses the existing `toCsvString` / `downloadTextFile` utilities from `@/lib/csv.ts`. File name: `reservas-{tenant_name}-{date}.csv`.

#### 6. Architecture Constraint
No Supabase calls from components or hooks — all data access goes through the service layer. The hook orchestrates loading state, filter state, and calls service functions. Components only render UI and invoke hook callbacks.

---

## Database Changes

No new tables or columns needed. The existing `reservas_reporte_view` already provides all required data through its joins:

- `reservas` → `usuarios` (athlete info)
- `reservas` → `entrenamientos` (training name/date)
- `entrenamientos` → `disciplinas` (discipline name)
- `entrenamientos` → `escenarios` (scenario name)
- `reservas` → `asistencias` (attendance data)
- `reservas` → `entrenamiento_categorias` → `nivel_disciplina` (level name)

**Existing RLS**: The `reservas_reporte_view` inherits RLS from underlying tables. `reservas` SELECT policy allows any tenant member to read. `asistencias` SELECT policy restricts to admin/coach only — since this page targets admin/coach users, this is already correct.

**No migration required.**

---

## API / Server Actions

### Service: `src/services/supabase/portal/reservas.service.ts`

#### New function: `getReservasManagement`

```typescript
type ReservasManagementFilters = {
  tenantId: string;
  fechaDesde?: string;       // ISO date string YYYY-MM-DD
  fechaHasta?: string;       // ISO date string YYYY-MM-DD
  atletaSearch?: string;     // Free text search on nombre, apellido, email, numero_identificacion
  asistencia?: 'asistio' | 'no_asistio' | 'sin_registrar';
  disciplinaId?: string;     // UUID
  limit?: number;            // Default 100 when no filters active
};
```

- **Input**: `ReservasManagementFilters`
- **Return**: `ReservaReportRow[]` (existing type, already has all needed fields)
- **Auth/RLS**: Inherits from `reservas_reporte_view` — requires tenant membership. Attendance data is only visible to admin/coach due to `asistencias` RLS policy.
- **Implementation**: Query `reservas_reporte_view` with dynamic filters. When no filters are set, apply `LIMIT 100`. When filters are active, enforce max 60-day date range. Order by `entrenamiento_fecha DESC NULLS LAST`.

### Service: `src/services/supabase/portal/disciplines.service.ts`

#### Existing function: `getAll` (or equivalent)
Already exists and returns tenant-scoped disciplines. No changes needed — the hook will call this for the discipline dropdown options.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Service | `src/services/supabase/portal/reservas.service.ts` | Add `getReservasManagement` function and export it |
| Types | `src/types/portal/reservas.types.ts` | Add `ReservasManagementFilters` type |
| Hook | `src/hooks/portal/gestion-reservas/useGestionReservas.ts` | New hook: manages filter state, loading, pagination, calls service |
| Component | `src/components/portal/gestion-reservas/GestionReservasPage.tsx` | Main page component with loading/empty/error states |
| Component | `src/components/portal/gestion-reservas/ReservasFiltersPanel.tsx` | Filter panel: date range chips, athlete search, attendance chips, discipline dropdown |
| Component | `src/components/portal/gestion-reservas/ReservasManagementTable.tsx` | Data table with two-line athlete cell, badges, client-side pagination |
| Component | `src/components/portal/gestion-reservas/ReservaEstadoBadge.tsx` | Colored badge for reservation status |
| Component | `src/components/portal/gestion-reservas/index.ts` | Barrel export |
| Page | `src/app/portal/orgs/[tenant_id]/(shared)/gestion-reservas/page.tsx` | New shared page route |

---

## Acceptance Criteria

1. The page is accessible at `/portal/orgs/[tenant_id]/(shared)/gestion-reservas` for administrators and coaches.
2. On initial load, the last 100 reservations are displayed ordered by training date (most recent first).
3. An informational banner shows: *"Mostrando las últimas 100 reservas. Para obtener más resultados, utiliza los filtros."*
4. When any filter is applied, the banner updates to show: *"Mostrando {N} reservas encontradas."*
5. Date range filter offers presets: `Últimos 7 días`, `Último mes`, `Mes a la fecha`, `Rango personalizado`.
6. Custom date range rejects spans greater than 60 days with a validation message.
7. Athlete search filters by name, last name, email, or identification number via a text input.
8. Attendance filter chips: `Todos`, `Asistió`, `No asistió`, `Sin registrar`.
9. Discipline filter dropdown lists all active disciplines for the tenant.
10. Clicking "Aplicar filtros" re-executes the database query with the selected filters (not in-memory).
11. The table shows: athlete (name + email/cedula on two lines), discipline, training name, training date, reservation status badge, attendance badge, and reservation date.
12. Client-side pagination works with page sizes 25, 50, and 100.
13. The "Exportar CSV" button exports the currently displayed filtered rows to a CSV file.
14. No Supabase calls exist in any component or hook file — all calls go through `reservas.service.ts` and `disciplines.service.ts`.
15. The existing `ReservaStatusBadge` (from `src/components/portal/entrenamientos/reservas/`) can be reused, or a new `ReservaEstadoBadge` created in the gestion-reservas slice to avoid cross-feature imports.
16. The `AsistenciaStatusBadge` (from `src/components/portal/entrenamientos/reservas/`) pattern is reused for attendance display — either via shared import or a local equivalent.
17. Empty state shows a meaningful message when no reservations match the filters.
18. Loading state shows a skeleton or loading indicator while the query is executing.

---

## Implementation Steps

- [ ] Add `ReservasManagementFilters` type to `src/types/portal/reservas.types.ts`
- [ ] Add `getReservasManagement` function to `src/services/supabase/portal/reservas.service.ts`
- [ ] Create hook `src/hooks/portal/gestion-reservas/useGestionReservas.ts`
- [ ] Create component `src/components/portal/gestion-reservas/GestionReservasPage.tsx`
- [ ] Create component `src/components/portal/gestion-reservas/ReservasFiltersPanel.tsx`
- [ ] Create component `src/components/portal/gestion-reservas/ReservasManagementTable.tsx`
- [ ] Create component `src/components/portal/gestion-reservas/ReservaEstadoBadge.tsx`
- [ ] Create barrel export `src/components/portal/gestion-reservas/index.ts`
- [ ] Create page `src/app/portal/orgs/[tenant_id]/(shared)/gestion-reservas/page.tsx`
- [ ] Add navigation entry for "Gestión de Reservas" in the portal menu for admin and coach roles
- [ ] Test manually: default load shows 100 rows, filters re-query, CSV export works, pagination works
- [ ] Test edge cases: no results, filters with no matches, date range > 60 days rejected

---

## Non-Functional Requirements

- **Security**: RLS on `reservas_reporte_view` ensures tenant isolation. Attendance data only visible to admin/coach via `asistencias` RLS policy. No new RLS policies needed.
- **Performance**: The `reservas_reporte_view` query uses existing indexes on `reservas(tenant_id)`, `reservas(entrenamiento_id)`, and `entrenamientos(fecha_hora)`. The 100-row default limit prevents unbounded queries. The max 60-day date range constraint limits filtered result sets. Consider adding an index on `reservas_reporte_view` materialized columns if query performance degrades.
- **Accessibility**: Filter chips and buttons should be keyboard-navigable. Table should use semantic `<table>` elements. Date inputs should use native date pickers.
- **Error handling**: Service errors surface as toast notifications. Network errors show a retry-able error state. Invalid date range shows inline validation message below the date inputs.
