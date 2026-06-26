## 1. Branch Setup

- [x] 1.1 Create a new branch `feat/athlete-my-reservations` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master`, or `develop`

## 2. Database Migration

- [x] 2.1 Create migration `supabase/migrations/{timestamp}_reservas_reporte_view_add_atleta_id.sql` that recreates `reservas_reporte_view` adding `r.atleta_id AS atleta_id` to the SELECT list (preserve all existing columns and joins from `20260328000300_reservas_reporte_view_add_dates.sql`)
- [x] 2.2 Apply the migration locally with `supabase db reset` or `supabase migration up` and verify the view includes the new column

## 3. Types

- [x] 3.1 Add `atleta_id: string` field to `ReservaReportRow` in `src/types/portal/reservas.types.ts`
- [x] 3.2 Add `MisReservasFilters` type to `src/types/portal/reservas.types.ts` with fields: `tenantId: string`, `atletaId: string`, `fechaDesde?: string`, `fechaHasta?: string`, `asistencia?: ReservasManagementAsistencia`, `disciplinaNombre?: string`, `limit?: number`

## 4. Service

- [x] 4.1 Add `getMisReservas(filters: MisReservasFilters): Promise<ReservaReportRow[]>` function to `src/services/supabase/portal/reservas.service.ts` — query `reservas_reporte_view` filtered by `tenant_id` and `atleta_id`, with dynamic filters for `fechaDesde`, `fechaHasta`, `asistencia`, `disciplinaNombre`; apply `LIMIT 100` when no filters are active; order by `entrenamiento_fecha DESC NULLS LAST`
- [x] 4.2 Export `getMisReservas` from the service module

## 5. Hook

- [x] 5.1 Create `src/hooks/portal/mis-reservas/useMisReservas.ts` — manages filter state (date range, attendance, discipline), loading state, data, error state, pagination (page/pageSize), CSV export function; calls `reservasService.getMisReservas()` on initial load and on filter application; calls `disciplinesService.listDisciplinesByTenant()` for discipline dropdown options

## 6. Components

- [x] 6.1 Create `src/components/portal/mis-reservas/MisReservasFiltersPanel.tsx` — date range preset chips (`Ultimos 7 dias`, `Ultimo mes`, `Mes a la fecha`, `Rango personalizado` with max 60-day validation), attendance chip filter (`Todos`, `Asistio`, `No asistio`, `Sin registrar`), discipline dropdown, "Aplicar filtros" button
- [x] 6.2 Create `src/components/portal/mis-reservas/MisReservasTable.tsx` — data table with columns: Disciplina, Entrenamiento, Fecha entrenamiento, Estado reserva (using `ReservaEstadoBadge` from `gestion-reservas/`), Asistencia (colored badge), Fecha reserva; client-side pagination with page sizes 25/50/100; no athlete column
- [x] 6.3 Create `src/components/portal/mis-reservas/MisReservasPage.tsx` — main page component wiring `useMisReservas` hook, renders informational banner (default: "Mostrando tus ultimas 100 reservas..." or filtered: "Mostrando {N} reservas encontradas."), `MisReservasFiltersPanel`, `MisReservasTable`, CSV export button, loading/error/empty states
- [x] 6.4 Create `src/components/portal/mis-reservas/index.ts` — barrel export for `MisReservasPage`

## 7. Page Route

- [x] 7.1 Create `src/app/portal/orgs/[tenant_id]/(atleta)/mis-reservas/page.tsx` — server component that renders `MisReservasPage`

## 8. Navigation

- [x] 8.1 Add `{ label: 'Mis Reservas', path: 'mis-reservas', icon: 'event_available' }` to `ROLE_TENANT_ITEMS.usuario` array in `src/types/portal.types.ts`

## 9. Documentation

- [x] 9.1 Update `projectspec/03-project-structure.md` to document the new `mis-reservas` feature slice: page route under `(atleta)/`, components, hook, and the updated `reservas_reporte_view` column

## 10. Verification

- [x] 10.1 Run `npx tsc --noEmit` to verify no TypeScript errors
- [x] 10.2 Test manually: default load shows own 100 rows, no other athlete data visible, filters re-query server-side, CSV export works, pagination works, empty state displays correctly
- [x] 10.3 Test edge cases: no reservations (empty state), filters with no matches, custom date range > 60 days rejected, attendance data visible for own records

## 11. Commit and PR

- [x] 11.1 Create a commit with message describing the feature implementation
- [ ] 11.2 Create a pull request with title and description summarizing the change, acceptance criteria, and test plan (blocked: no GitHub auth configured)
