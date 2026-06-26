## Why

Admins and coaches currently can only view reservations within the context of a single training session (via `ReservasPanel`). There is no cross-training view to see all reservations across the organization, filter by athlete, analyze attendance patterns, or export filtered results. This limits operational oversight and makes it difficult to audit reservation/attendance history efficiently.

## What Changes

- New shared page at `/portal/orgs/[tenant_id]/(shared)/gestion-reservas` accessible to administrators and coaches
- Default view shows the last 100 reservations ordered by training date (most recent first) with an informational banner
- Server-side filter panel that re-executes the database query (not in-memory) with filters for:
  - Date range (presets: últimos 7 días, último mes, mes a la fecha, rango personalizado max 60 days)
  - Athlete search (by name, email, or identification number)
  - Attendance status (asistió, no asistió, sin registrar)
  - Discipline (dropdown of active tenant disciplines)
- When filters are active, the 100-row limit is removed (bounded by max 60-day date range)
- Results table with: athlete (two-line: name + email/cedula), discipline, training name, training date, reservation status badge, attendance badge, reservation date
- Client-side pagination (page sizes 25/50/100)
- CSV export button for the currently displayed (filtered) rows
- Navigation entry added for admin and coach roles

## Capabilities

### New Capabilities
- `reservations-management`: Shared page for cross-training reservation listing with server-side filtering, client-side pagination, and CSV export

### Modified Capabilities
_(none — no existing spec-level behavior changes)_

## Impact

### Files to Create

| Area | File | Description |
|------|------|-------------|
| Page | `src/app/portal/orgs/[tenant_id]/(shared)/gestion-reservas/page.tsx` | New shared page route |
| Component | `src/components/portal/gestion-reservas/GestionReservasPage.tsx` | Main page component |
| Component | `src/components/portal/gestion-reservas/ReservasFiltersPanel.tsx` | Filter panel with date range, athlete search, attendance, discipline |
| Component | `src/components/portal/gestion-reservas/ReservasManagementTable.tsx` | Data table with two-line athlete cell, badges, pagination |
| Component | `src/components/portal/gestion-reservas/ReservaEstadoBadge.tsx` | Colored badge for reservation status |
| Component | `src/components/portal/gestion-reservas/index.ts` | Barrel export |
| Hook | `src/hooks/portal/gestion-reservas/useGestionReservas.ts` | Filter state, loading, pagination, service calls |
| Types | `src/types/portal/reservas.types.ts` | Add `ReservasManagementFilters` type |

### Files to Modify

| Area | File | Description |
|------|------|-------------|
| Service | `src/services/supabase/portal/reservas.service.ts` | Add `getReservasManagement` function |
| Navigation | Portal menu configuration | Add "Gestión de Reservas" entry for admin/coach |

### Dependencies Used (no changes)
- Existing `reservas_reporte_view` database view (all joins already in place)
- Existing `disciplines.service.ts` for discipline dropdown
- Existing `@/lib/csv.ts` for CSV export (`toCsvString`, `downloadTextFile`)
- Existing RLS policies (reservas: tenant member SELECT; asistencias: admin/coach only)

### No database migration required

## Non-goals

- Athlete-facing reservation history (this page is for admin/coach only)
- Editing or canceling reservations from this view (use the existing per-training `ReservasPanel`)
- Real-time updates or subscription-based data refresh
- Server-side pagination (client-side pagination is sufficient given the max result set size)

## Implementation Plan

1. **Types** — Add `ReservasManagementFilters` to `src/types/portal/reservas.types.ts`
2. **Service** — Add `getReservasManagement` to `src/services/supabase/portal/reservas.service.ts`
3. **Hook** — Create `useGestionReservas` managing filter state, loading, data fetching, and pagination
4. **Components** — Create `ReservasFiltersPanel`, `ReservasManagementTable`, `ReservaEstadoBadge`, and `GestionReservasPage`
5. **Page** — Wire the shared route at `(shared)/gestion-reservas/page.tsx`
6. **Navigation** — Add menu entry for admin/coach roles
7. **Test** — Manual verification: default 100 rows, server-side filters, CSV export, pagination, edge cases
