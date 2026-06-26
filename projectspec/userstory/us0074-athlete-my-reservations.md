# US-0074 — Athlete My Reservations View

## ID
US-0074

## Name
Athlete personal reservations view with server-side filtering and CSV export

## As a
Athlete (usuario)

## I Want
A "Mis Reservas" page that shows my own reservation history across all trainings, with the ability to filter by date range, attendance status, and discipline

## So That
I can review my personal training reservation history, track my attendance patterns, and export my records for personal reference

---

## Description

### Current State
Athletes can only see their reservations within the context of a single training session (via the booking panel in the training detail view). There is no unified view where an athlete can see all their reservations across trainings, filter by date range, or review their attendance history. The admin/coach "Gestión de Reservas" page (US-0073) exists but is not available to athletes and shows all athletes' data.

### Proposed Changes

#### 1. New Athlete Page
Create a new athlete-scoped page at `/portal/orgs/[tenant_id]/(atleta)/mis-reservas` accessible only to users with the `usuario` role. Add a "Mis Reservas" navigation entry to the athlete menu.

#### 2. Default View — Last 100 Reservations (Own Only)
- On initial load, query the last 100 reservations **for the authenticated athlete only** (`atleta_id = auth.uid()`), ordered by `entrenamiento_fecha DESC`.
- Display an informational banner: *"Mostrando tus últimas 100 reservas. Para obtener más resultados, utiliza los filtros."*

#### 3. Server-Side Filter Panel
A filter panel that, when applied, re-executes the database query. Filters (same as US-0073 **except** athlete search, since the view is already scoped to the authenticated user):

| Filter | Type | Options |
|--------|------|---------|
| **Date range** | Preset chips + custom range | `Últimos 7 días`, `Último mes`, `Mes a la fecha`, `Rango personalizado` (max 60 days) |
| **Attendance** | Chip filter | `Todos`, `Asistió`, `No asistió`, `Sin registrar` |
| **Discipline** | Dropdown select | Lists all active disciplines for the tenant |

When any filter is active, the 100-row limit is removed (bounded by max 60-day date range constraint). The banner changes to show the count of results found.

#### 4. Results Table
Each row displays:

| Column | Content |
|--------|---------|
| **Disciplina** | Discipline name from the training |
| **Entrenamiento** | Training name |
| **Fecha entrenamiento** | Formatted `fecha_hora` of the training |
| **Estado reserva** | Badge: `confirmada`, `pendiente`, `cancelada`, `completada` |
| **Asistencia** | Badge: `Asistió` (green), `No asistió` (red), `Sin registrar` (gray) |
| **Fecha reserva** | When the reservation was created |

Note: The athlete column is omitted since all rows belong to the authenticated user. The table supports client-side pagination (page size 25/50/100).

#### 5. CSV Export
A button to export the currently displayed (filtered) rows to CSV. Uses the existing `toCsvString` / `downloadTextFile` utilities from `@/lib/csv.ts`. File name: `mis-reservas-{date}.csv`.

#### 6. Architecture Constraint
No Supabase calls from components or hooks — all data access goes through the service layer. Reuse the existing `ReservaEstadoBadge` from `src/components/portal/gestion-reservas/`. Reuse the same filter panel pattern from US-0073 but without the athlete search input.

---

## Database Changes

No new tables, columns, or migrations needed.

**Existing RLS already supports this use case:**
- `reservas` SELECT policy: any tenant member can read reservations (the service will add `atleta_id` filter)
- `asistencias` SELECT policy `asistencias_select_own_atleta`: athletes can read their own attendance records via join through `reservas.atleta_id = auth.uid()`
- `reservas_reporte_view`: inherits RLS from underlying tables — athlete sees only rows where their `atleta_id` matches

**No migration required.**

---

## API / Server Actions

### Service: `src/services/supabase/portal/reservas.service.ts`

#### New function: `getMisReservas`

```typescript
type MisReservasFilters = {
  tenantId: string;
  atletaId: string;
  fechaDesde?: string;
  fechaHasta?: string;
  asistencia?: 'asistio' | 'no_asistio' | 'sin_registrar';
  disciplinaNombre?: string;
  limit?: number;
};
```

- **Input**: `MisReservasFilters`
- **Return**: `ReservaReportRow[]` (existing type)
- **Auth/RLS**: Inherits from `reservas_reporte_view`. The `atleta_id` filter ensures only own rows are returned. The `asistencias_select_own_atleta` RLS policy allows athletes to read their own attendance data.
- **Implementation**: Query `reservas_reporte_view` filtered by `tenant_id` and athlete email (matched via `atleta_email` to the authenticated user's email, or via a subquery). When no filters are set, apply `LIMIT 100`. Order by `entrenamiento_fecha DESC NULLS LAST`. Reuse the same dynamic filter pattern as `getReservasManagement`.

### Service: `src/services/supabase/portal/disciplines.service.ts`

Already exists — `listDisciplinesByTenant(tenantId)` returns tenant-scoped disciplines. No changes needed.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Types | `src/types/portal/reservas.types.ts` | Add `MisReservasFilters` type |
| Service | `src/services/supabase/portal/reservas.service.ts` | Add `getMisReservas` function and export it |
| Hook | `src/hooks/portal/mis-reservas/useMisReservas.ts` | New hook: manages filter state (no athlete search), loading, pagination, CSV export |
| Component | `src/components/portal/mis-reservas/MisReservasPage.tsx` | Main page component with loading/empty/error states, banner, filters, table, CSV button |
| Component | `src/components/portal/mis-reservas/MisReservasFiltersPanel.tsx` | Filter panel: date range chips, attendance chips, discipline dropdown (no athlete search) |
| Component | `src/components/portal/mis-reservas/MisReservasTable.tsx` | Data table without athlete column, with badges and client-side pagination |
| Component | `src/components/portal/mis-reservas/index.ts` | Barrel export |
| Page | `src/app/portal/orgs/[tenant_id]/(atleta)/mis-reservas/page.tsx` | New athlete page route |
| Navigation | `src/types/portal.types.ts` | Add "Mis Reservas" entry to `ROLE_TENANT_ITEMS.usuario` |

---

## Acceptance Criteria

1. The page is accessible at `/portal/orgs/[tenant_id]/mis-reservas` for users with role `usuario`.
2. The page is NOT accessible to admin or coach roles (role guard redirects).
3. On initial load, the last 100 reservations belonging to the authenticated athlete are displayed, ordered by training date descending.
4. No reservations from other athletes are visible — only the authenticated user's own data.
5. An informational banner shows: *"Mostrando tus últimas 100 reservas. Para obtener más resultados, utiliza los filtros."*
6. When any filter is applied, the banner updates to show: *"Mostrando {N} reservas encontradas."*
7. Date range filter offers presets: `Últimos 7 días`, `Último mes`, `Mes a la fecha`, `Rango personalizado`.
8. Custom date range rejects spans greater than 60 days with a validation message.
9. Attendance filter chips: `Todos`, `Asistió`, `No asistió`, `Sin registrar`.
10. Discipline filter dropdown lists all active disciplines for the tenant.
11. Clicking "Aplicar filtros" re-executes the database query with the selected filters (not in-memory).
12. The table shows: discipline, training name, training date, reservation status badge, attendance badge, and reservation date. No athlete column.
13. Attendance data is visible to the athlete (own records allowed by `asistencias_select_own_atleta` RLS policy).
14. Client-side pagination works with page sizes 25, 50, and 100.
15. The "Exportar CSV" button exports the current filtered rows to a CSV file named `mis-reservas-{YYYY-MM-DD}.csv`.
16. No Supabase calls exist in any component or hook file — all calls go through `reservas.service.ts` and `disciplines.service.ts`.
17. Empty state shows: *"No tienes reservas registradas en esta organización."*
18. Loading state shows a loading indicator while the query is executing.
19. The "Mis Reservas" menu entry appears in the athlete navigation menu.

---

## Implementation Steps

- [ ] Add `MisReservasFilters` type to `src/types/portal/reservas.types.ts`
- [ ] Add `getMisReservas` function to `src/services/supabase/portal/reservas.service.ts`
- [ ] Create hook `src/hooks/portal/mis-reservas/useMisReservas.ts`
- [ ] Create component `src/components/portal/mis-reservas/MisReservasFiltersPanel.tsx`
- [ ] Create component `src/components/portal/mis-reservas/MisReservasTable.tsx`
- [ ] Create component `src/components/portal/mis-reservas/MisReservasPage.tsx`
- [ ] Create barrel export `src/components/portal/mis-reservas/index.ts`
- [ ] Create page `src/app/portal/orgs/[tenant_id]/(atleta)/mis-reservas/page.tsx`
- [ ] Add "Mis Reservas" entry to `ROLE_TENANT_ITEMS.usuario` in `src/types/portal.types.ts`
- [ ] Update `projectspec/03-project-structure.md` with the new feature slice
- [ ] Test manually: default load shows own 100 rows, filters re-query, CSV export works, no other athlete data visible
- [ ] Test edge cases: no reservations, filters with no matches, date range > 60 days rejected

---

## Non-Functional Requirements

- **Security**: The `reservas_reporte_view` inherits RLS from `reservas` (tenant member SELECT) and `asistencias` (own-record SELECT for athletes). The service function explicitly filters by `atleta_id` as a defense-in-depth measure. The `(atleta)/` layout role guard prevents non-`usuario` access.
- **Performance**: Same as US-0073 — 100-row default limit, max 60-day date range constraint, existing indexes on `reservas(tenant_id)` and `entrenamientos(fecha_hora)`.
- **Accessibility**: Filter chips and buttons keyboard-navigable. Semantic `<table>` elements. Native date pickers.
- **Error handling**: Service errors surface as toast/inline error with retry. Invalid date range shows inline validation message.
