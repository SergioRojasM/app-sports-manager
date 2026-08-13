## Context

Athletes currently view their reservations only within a single training session via `ReservasPanel`. The admin/coach "Gestion de Reservas" page (US-0073, `shared-reservations-management` change) provides a cross-training reservation listing with server-side filters, but it targets admin/coach roles and shows all athletes' data.

The database already has `reservas_reporte_view` which flat-joins reservas with athlete info, training, discipline, scenario, attendance, and level data. However, the view does not currently expose `atleta_id` — it only surfaces `atleta_email`, `atleta_nombre`, and `atleta_apellido`. This means filtering by the authenticated user's ID requires either email matching or a view modification.

The US-0073 implementation provides a strong pattern to follow: `GestionReservasPage` → `ReservasFiltersPanel` → `ReservasManagementTable`, backed by `useGestionReservas` hook and `getReservasManagement` service function.

## Goals / Non-Goals

**Goals:**
- Athlete-scoped cross-training reservation history with server-side filtering
- Reuse `reservas_reporte_view` with a migration to add the missing `atleta_id` column
- Server-side filters (date range, attendance, discipline) that re-execute the query
- CSV export of current filtered result set
- Follow hexagonal architecture: Component → Hook → Service → Supabase

**Non-Goals:**
- Editing/canceling reservations from this view — it is read-only
- Admin or coach access to this page — they use shared "Gestion de Reservas"
- Server-side pagination (client-side is sufficient given bounded result sets)
- Real-time updates or websocket subscriptions
- Attendance editing from this view

## Decisions

### 1. Add `atleta_id` to `reservas_reporte_view` via migration

**Choice**: Recreate the view adding `r.atleta_id AS atleta_id` to the SELECT list. Update `ReservaReportRow` type to include `atleta_id: string`.

**Rationale**: The view currently only exposes `atleta_email` but no `atleta_id`. Filtering by email is fragile — the athlete's UUID is the canonical identifier. Adding the column to the view is a non-breaking additive change. The existing `getReservasManagement` function selects `*` from the view, so it will pick up the new column automatically without code changes.

**Alternative considered**: Filter by `atleta_email` by first fetching the authenticated user's email — rejected because UUID matching is more robust, and the migration is trivial (view recreation, no data changes).

### 2. Reuse `reservas_reporte_view` with `atleta_id` filter for scoping

**Choice**: Query `reservas_reporte_view` filtered by `tenant_id` and `atleta_id` in the new `getMisReservas` service function.

**Rationale**: Same approach as US-0073's `getReservasManagement` — the view already joins all 7 tables needed. Adding `atleta_id` as an equality filter is the simplest possible scoping mechanism. Defense-in-depth: the RLS on `reservas` ensures tenant membership, while the service-level `atleta_id` filter ensures only own rows are returned.

### 3. Follow the US-0073 filter pattern without athlete search

**Choice**: Reuse the same filter architecture (date range preset chips + custom range, attendance chip filter, discipline dropdown) but omit the athlete search input since the page is inherently self-scoped.

**Rationale**: Consistent UX across reservation views. The underlying filter logic (server-side re-execution, 60-day date range limit, attendance mapping to `asistio` column) is identical. Only the athlete search is removed.

### 4. Reuse `ReservaEstadoBadge` from `gestion-reservas` feature slice

**Choice**: Import `ReservaEstadoBadge` from `src/components/portal/gestion-reservas/ReservaEstadoBadge.tsx` rather than duplicating it.

**Rationale**: The badge renders identically in both views. Cross-feature imports are acceptable for shared presentational components. If this becomes an issue, the badge can be promoted to a shared components directory later.

### 5. Page route under `(atleta)/` with role guard

**Choice**: Create the page at `src/app/portal/orgs/[tenant_id]/(atleta)/mis-reservas/page.tsx`. The existing `(atleta)/layout.tsx` already redirects non-`usuario` users.

**Rationale**: Follows the same pattern as `mis-suscripciones-y-pagos` — an athlete-specific page under the `(atleta)` route group. The role guard is automatic via the layout.

### 6. Navigation via `ROLE_TENANT_ITEMS.usuario`

**Choice**: Add `{ label: 'Mis Reservas', path: 'mis-reservas', icon: 'event_available' }` to the `usuario` array in `ROLE_TENANT_ITEMS`.

**Rationale**: The page is athlete-only, so it belongs in the role-specific menu items, not `SHARED_TENANT_ITEMS`.

### 7. Client-side pagination with bounded result sets

**Choice**: All matching rows are fetched in a single query. Pagination is handled client-side by slicing the array. Page sizes: 25, 50, 100.

**Rationale**: Default is 100 rows. With filters active, the max 60-day date range constraint bounds the result set. For a single athlete, reservation counts are typically well under 1000 rows.

## Architecture

```
Page (mis-reservas/page.tsx)
  └─ MisReservasPage (component)
       ├─ MisReservasFiltersPanel (component)
       │    └─ Date range chips, attendance chips,
       │       discipline dropdown (no athlete search)
       ├─ Info banner (100-row default or result count)
       ├─ MisReservasTable (component)
       │    ├─ ReservaEstadoBadge (reused from gestion-reservas)
       │    ├─ Attendance badge (inline text)
       │    └─ Client-side pagination controls
       └─ CSV export button
```

```
Data flow:
  MisReservasPage
    └─ useMisReservas (hook)
         ├─ reservasService.getMisReservas() — filtered query
         └─ disciplinesService.listDisciplinesByTenant() — dropdown options
```

## Risks / Trade-offs

- **[View migration risk]** → Recreating the view is a `DROP VIEW` + `CREATE VIEW` operation. Existing queries using `SELECT *` will pick up the new column harmlessly. No data loss since views are derived. **Mitigation**: Apply locally only; verify existing `getReservasManagement` still works after migration.
- **[Attendance RLS for athletes]** → The `asistencias` table has an `asistencias_select_own_atleta` RLS policy that allows athletes to read their own attendance records (via join through `reservas.atleta_id = auth.uid()`). The view's LEFT JOIN on `asistencias` should surface attendance data for the athlete's own rows. **Mitigation**: Verify in local testing that `asistio` is not null-masked by RLS for the athlete's own reservations.
- **[Cross-feature import]** → Importing `ReservaEstadoBadge` from `gestion-reservas/` creates a dependency between feature slices. **Mitigation**: The badge is a pure presentational component with no side effects. Acceptable trade-off vs. duplication.

## Open Questions

None — the design closely follows the proven US-0073 pattern with straightforward scope reduction (athlete-only, no athlete search).
