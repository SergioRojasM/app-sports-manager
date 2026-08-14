## 1. Branch Setup

- [x] 1.1 Create a new branch `feat/shared-reservations-management` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master`, or `develop`

## 2. Types

- [x] 2.1 Add `ReservasManagementFilters` type to `src/types/portal/reservas.types.ts` with fields: `tenantId`, `fechaDesde?`, `fechaHasta?`, `atletaSearch?`, `asistencia?: 'asistio' | 'no_asistio' | 'sin_registrar'`, `disciplinaId?`, `limit?`

## 3. Service

- [x] 3.1 Add `getReservasManagement(filters: ReservasManagementFilters): Promise<ReservaReportRow[]>` function to `src/services/supabase/portal/reservas.service.ts` — queries `reservas_reporte_view` with dynamic filters (date range, athlete ilike search on `atleta_nombre/atleta_apellido/atleta_email/numero_identificacion`, attendance `asistio` condition, discipline `disciplina` match), applies `LIMIT 100` when no filters active, orders by `entrenamiento_fecha DESC NULLS LAST`
- [x] 3.2 Export `getReservasManagement` from the `reservasService` object

## 4. Hook

- [x] 4.1 Create `src/hooks/portal/gestion-reservas/useGestionReservas.ts` — manages draft filter state (dateRange preset, custom dates, athleteSearch, attendance, disciplinaId), applied filters, loading/error state, rows data, pagination (currentPage, pageSize with options 25/50/100), computed `paginatedRows`, `totalPages`, `totalFiltered`
- [x] 4.2 Hook calls `reservasService.getReservasManagement()` on mount (default 100 rows) and on `applyFilters()` action
- [x] 4.3 Hook calls `disciplinesService` to load discipline options for the dropdown
- [x] 4.4 Hook exposes `exportCsv()` function that uses `toCsvString` and `downloadTextFile` from `@/lib/csv.ts` to export current `rows` array
- [x] 4.5 Hook exposes `hasActiveFilters` boolean and `resultCount` for the info banner
- [x] 4.6 Verify hook does NOT import `createClient` — all Supabase access delegated to services

## 5. Components

- [x] 5.1 Create `src/components/portal/gestion-reservas/ReservaEstadoBadge.tsx` — colored badge component for reservation status (`confirmada` → green, `pendiente` → yellow, `cancelada` → red, `completada` → blue)
- [x] 5.2 Create `src/components/portal/gestion-reservas/ReservasFiltersPanel.tsx` — filter panel with: date range preset chips (`Últimos 7 días`, `Último mes`, `Mes a la fecha`, `Rango personalizado`) + custom date inputs, athlete text search input, attendance chip filter (`Todos`, `Asistió`, `No asistió`, `Sin registrar`), discipline dropdown select, and "Aplicar filtros" button. Custom date range validates max 60-day span
- [x] 5.3 Create `src/components/portal/gestion-reservas/ReservasManagementTable.tsx` — data table with columns: Atleta (two-line: `nombre apellido` / `email · numero_identificacion`), Disciplina, Entrenamiento, Fecha entrenamiento, Estado reserva (ReservaEstadoBadge), Asistencia (inline badge: Asistió green / No asistió red / Sin registrar gray), Fecha reserva. Includes client-side pagination controls (page size selector + page navigation)
- [x] 5.4 Create `src/components/portal/gestion-reservas/GestionReservasPage.tsx` — main page component that wires the hook, renders info banner (100-row warning or result count), ReservasFiltersPanel, ReservasManagementTable, "Exportar CSV" button, loading state, empty state, and error state
- [x] 5.5 Create `src/components/portal/gestion-reservas/index.ts` — barrel export for `GestionReservasPage`
- [x] 5.6 Verify no component file imports `createClient` — all data access delegated through the hook to services

## 6. Page Route

- [x] 6.1 Create `src/app/portal/orgs/[tenant_id]/(shared)/gestion-reservas/page.tsx` — server component that extracts `tenant_id` from params and renders `<GestionReservasPage tenantId={tenantId} />`

## 7. Navigation

- [x] 7.1 Add `{ label: 'Reservas', path: 'gestion-reservas', icon: 'event_available' }` to `ROLE_TENANT_ITEMS.administrador` array in `src/types/portal.types.ts`
- [x] 7.2 Add the same entry to `ROLE_TENANT_ITEMS.entrenador` array in `src/types/portal.types.ts`

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md` to include the new `gestion-reservas` feature slice: page route under `(shared)/`, components, hook, and the new service function

## 9. Commit & PR

- [x] 9.1 Create a commit with message summarizing the implementation of US-0073 shared reservations management
- [x] 9.2 Create a pull request with description covering: summary of changes, files created/modified, and test plan
