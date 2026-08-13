## Context

Reservations are currently viewable only per-training via `ReservasPanel` inside the training detail flow. The database already has a `reservas_reporte_view` that flat-joins reservas with athlete info, training, discipline, scenario, attendance, and level data — currently used only for per-training CSV export via `reservasService.getReservasReport()`.

The portal menu system uses `ROLE_TENANT_ITEMS` (role-scoped routes) and `SHARED_TENANT_ITEMS` (any-role routes) in `src/types/portal.types.ts`. The shared layout at `(shared)/layout.tsx` guards by tenant membership (any valid role).

Existing patterns to follow: `gestion-suscripciones` for page/table/filter architecture, `ReservasPanel` + `@/lib/csv.ts` for CSV export.

## Goals / Non-Goals

**Goals:**
- Cross-training reservation listing for admin/coach with server-side filtering
- Reuse `reservas_reporte_view` to avoid new database objects
- Server-side filters that re-execute the query (not in-memory) for date range, athlete, attendance, discipline
- CSV export of current filtered result set
- Follow hexagonal architecture: Component → Hook → Service → Supabase

**Non-Goals:**
- Athlete-facing reservation history
- Editing/canceling reservations from this view
- Server-side pagination (client-side is sufficient given bounded result sets)
- Real-time updates or live subscriptions

## Decisions

### 1. Reuse `reservas_reporte_view` instead of building a new query

**Choice**: Query the existing `reservas_reporte_view` with dynamic filters in `getReservasManagement`.

**Rationale**: The view already joins all 7 tables needed (reservas, usuarios, entrenamientos, disciplinas, escenarios, entrenamiento_categorias, nivel_disciplina, asistencias). Building a custom `.select()` with nested joins would duplicate this logic and be harder to maintain. The view is also already granted to `authenticated` role.

**Alternative considered**: Direct `.from('reservas').select(...)` with nested joins — rejected because it would duplicate the view's join logic and the athlete text search filter is easier to express against flat view columns.

### 2. Athlete text search via `or()` filter on view columns

**Choice**: Use Supabase's `.or()` with `.ilike()` on `atleta_nombre`, `atleta_apellido`, `atleta_email`, and `numero_identificacion` columns from the view.

**Rationale**: The view exposes these as flat columns, making `ilike` filters straightforward. Full-text search is overkill for this use case — the athlete pool per tenant is typically < 500 members.

### 3. Menu entry via `SHARED_TENANT_ITEMS` (not role-specific)

**Choice**: Add "Gestión de Reservas" to `SHARED_TENANT_ITEMS` in `portal.types.ts` so it appears for all tenant roles (admin, coach, athlete).

**Rationale**: The page lives under `(shared)/` which is role-agnostic. The existing RLS on `asistencias` naturally hides attendance data from athletes — so athletes would see reservations without attendance info, which is acceptable. However, since the user story specifies admin/coach only, we'll add it to both `administrador` and `entrenador` arrays in `ROLE_TENANT_ITEMS` instead.

**Final decision**: Add to both `administrador` and `entrenador` entries in `ROLE_TENANT_ITEMS` with path `gestion-reservas`. The page route lives under `(shared)/` for code sharing, but menu visibility is restricted to admin/coach roles.

### 4. Filter state managed by hook, applied on explicit action

**Choice**: The hook holds draft filter state. Filters are applied when the user clicks "Aplicar filtros", which triggers a new service call. This matches the server-side query re-execution requirement.

**Rationale**: Avoids excessive API calls on each keystroke/selection. The user consciously triggers the query with their chosen filter combination.

### 5. Client-side pagination with bounded result sets

**Choice**: All matching rows are fetched in a single query. Pagination is handled client-side by slicing the array.

**Rationale**: Default is 100 rows. With filters active, the max 60-day date range constraint bounds the result set. For a typical tenant, even unfiltered 60-day results are < 2000 rows — well within browser memory.

### 6. Attendance filter as post-query condition in service

**Choice**: The attendance filter maps to conditions on `asistio` column: `asistio = true` (asistió), `asistio = false` (no asistió), `asistio IS NULL` (sin registrar).

**Rationale**: Direct column filter on the view — no post-processing needed.

## Architecture

```
Page (gestion-reservas/page.tsx)
  └─ GestionReservasPage (component)
       ├─ ReservasFiltersPanel (component)
       │    └─ Date range chips, athlete search input,
       │       attendance chips, discipline dropdown
       ├─ Info banner (100-row warning or result count)
       ├─ ReservasManagementTable (component)
       │    ├─ Two-line athlete cell
       │    ├─ ReservaEstadoBadge
       │    ├─ Attendance badge (inline)
       │    └─ Client-side pagination controls
       └─ CSV export button

Hook: useGestionReservas
  ├─ State: filters (draft), appliedFilters, rows, loading, error
  ├─ State: pagination (currentPage, pageSize)
  ├─ fetchReservas() → reservasService.getReservasManagement()
  ├─ fetchDisciplines() → disciplinesService.getAll()
  └─ exportCsv() → toCsvString + downloadTextFile

Service: reservasService.getReservasManagement()
  └─ Queries reservas_reporte_view with dynamic filters
```

## Risks / Trade-offs

**[Risk] View query performance on large tenants** → The 100-row default limit and 60-day max date range mitigate unbounded queries. Existing indexes on `reservas(tenant_id)` and `entrenamientos(fecha_hora)` support the primary access pattern. Monitor if needed.

**[Risk] `ilike` athlete search on non-indexed columns** → For typical tenant sizes (< 500 athletes), `ilike` on the view is acceptable. If performance degrades, consider adding a GIN trigram index on `usuarios(nombre, apellido)`. Not needed now.

**[Risk] Attendance data visible to athletes if page URL is accessed directly** → The `(shared)/` layout allows any tenant member. However, `asistencias` RLS restricts SELECT to admin/coach, so `asistio` column returns NULL for athletes. The menu entry is only shown to admin/coach, so direct URL access by athletes would show reservations without attendance — acceptable and non-harmful.
