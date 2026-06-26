## Why

Athletes currently can only see their reservations within the context of a single training session (via the booking panel in the training detail view). There is no unified view where an athlete can see all their reservations across trainings, filter by date range, or review their attendance history. The admin/coach "Gestion de Reservas" page (US-0073) exists but is not available to athletes and shows all athletes' data. Athletes need a personal reservation history view to track their training patterns and export records.

## What Changes

- **New athlete page** at `/portal/orgs/[tenant_id]/(atleta)/mis-reservas` accessible only to users with the `usuario` role
- **Default view** shows the last 100 reservations for the authenticated athlete only, ordered by training date descending, with an informational banner
- **Server-side filter panel** with date range (preset chips + custom range, max 60 days), attendance status chips, and discipline dropdown — no athlete search since the view is self-scoped
- **Results table** without athlete column (discipline, training name, training date, reservation status badge, attendance badge, reservation date) with client-side pagination (25/50/100)
- **CSV export** of currently filtered rows using existing `toCsvString` / `downloadTextFile` utilities
- **Navigation entry** "Mis Reservas" added to `ROLE_TENANT_ITEMS.usuario` in `portal.types.ts`
- **Database migration** to add `atleta_id` column to `reservas_reporte_view` (needed for service-level filtering by authenticated user ID)

## Non-goals

- No inline booking creation or cancellation from this page — it is read-only
- No admin/coach access to this page — they use the shared "Gestion de Reservas" (US-0073) instead
- No real-time updates or websocket subscriptions
- No attendance editing from this view — athletes can only view their attendance status

## Capabilities

### New Capabilities
- `athlete-reservations-view`: Personal reservation history page for athletes with server-side filtering, table display, and CSV export

### Modified Capabilities
- `training-booking`: The `reservas_reporte_view` gains an `atleta_id` column to support direct ID-based filtering (no behavioral change to existing queries)

## Impact

### Files to create
| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_reservas_reporte_view_add_atleta_id.sql` | Recreate view with `r.atleta_id` column |
| Types | `src/types/portal/reservas.types.ts` | Add `MisReservasFilters` type, add `atleta_id` to `ReservaReportRow` |
| Service | `src/services/supabase/portal/reservas.service.ts` | Add `getMisReservas` function |
| Hook | `src/hooks/portal/mis-reservas/useMisReservas.ts` | New hook: filter state, loading, pagination, CSV export |
| Component | `src/components/portal/mis-reservas/MisReservasPage.tsx` | Main page with banner, filters, table, CSV button |
| Component | `src/components/portal/mis-reservas/MisReservasFiltersPanel.tsx` | Filter panel (date range, attendance, discipline) |
| Component | `src/components/portal/mis-reservas/MisReservasTable.tsx` | Data table without athlete column |
| Component | `src/components/portal/mis-reservas/index.ts` | Barrel export |
| Page | `src/app/portal/orgs/[tenant_id]/(atleta)/mis-reservas/page.tsx` | New athlete route |

### Files to modify
| Area | File | Change |
|------|------|--------|
| Navigation | `src/types/portal.types.ts` | Add "Mis Reservas" entry to `ROLE_TENANT_ITEMS.usuario` |
| Spec | `projectspec/03-project-structure.md` | Document new feature slice |

### Implementation plan
1. Create migration to add `atleta_id` to `reservas_reporte_view`
2. Add `MisReservasFilters` type and update `ReservaReportRow` in `reservas.types.ts`
3. Add `getMisReservas` service function to `reservas.service.ts`
4. Create `useMisReservas` hook
5. Create `MisReservasFiltersPanel` component
6. Create `MisReservasTable` component
7. Create `MisReservasPage` component + barrel export
8. Create page route at `(atleta)/mis-reservas/page.tsx`
9. Add navigation entry to `portal.types.ts`
10. Update `projectspec/03-project-structure.md`
