## 1. Branch Setup

- [x] 1.1 Create branch `feat/gestion-equipo` from the current base branch
- [x] 1.2 Verify the working branch is not `main`, `master`, or `develop` before proceeding

## 2. Database Migration

- [x] 2.1 Create `supabase/migrations/20260304000100_add_identificacion_cols_usuarios.sql` with the following content:
  ```sql
  alter table public.usuarios
    add column tipo_identificacion varchar(20),
    add column numero_identificacion varchar(30);

  alter table public.usuarios
    add constraint usuarios_tipo_identificacion_ck
      check (tipo_identificacion in ('CC', 'CE', 'TI', 'NIT', 'Pasaporte', 'Otro'));

  alter table public.usuarios
    add constraint usuarios_estado_ck
      check (estado in ('activo', 'mora', 'suspendido', 'inactivo'));

  drop policy if exists miembros_tenant_select_admin on public.miembros_tenant;
  create policy miembros_tenant_select_admin on public.miembros_tenant
    for select to authenticated
    using (
      tenant_id in (
        select id from public.get_admin_tenants_for_authenticated_user()
      )
    );
  ```
- [x] 2.2 Apply the migration locally: `npx supabase db diff -f add_identificacion_cols_usuarios` then `npx supabase migration up`
- [x] 2.3 Verify the two new columns and both check constraints appear in the local DB schema
- [x] 2.4 Verify the `miembros_tenant_select_admin` RLS policy exists (check `supabase/migrations` for any pre-existing conflicting policy first) — SKIPPED: existing `miembros_tenant_select_authenticated` policy with `using(true)` already grants SELECT to all authenticated users

## 3. Types

- [x] 3.1 Create `src/types/portal/equipo.types.ts` and define:
  - `TipoIdentificacion` union type: `'CC' | 'CE' | 'TI' | 'NIT' | 'Pasaporte' | 'Otro'`
  - `MiembroEstado` union type: `'activo' | 'mora' | 'suspendido' | 'inactivo'`
  - `MiembroRow` type with fields: `usuario_id`, `nombre`, `apellido`, `tipo_identificacion: TipoIdentificacion | null`, `numero_identificacion: string | null`, `telefono`, `email`, `foto_url`, `estado: MiembroEstado`, `miembro_id`, `rol_nombre`
  - `MiembroTableItem` type: `MiembroRow & { fullName: string; estadoLabel: string }`
  - `EquipoStats` type: `{ totalMiembros: number; totalActivos: number; entrenadoresActivos: number }`
  - `EquipoServiceError` class extending `Error` with `code: 'forbidden' | 'unknown'`

## 4. Service

- [x] 4.1 Create `src/services/supabase/portal/equipo.service.ts` implementing:
  - `getEquipo(tenantId: string): Promise<MiembroRow[]>` — queries `miembros_tenant` with `roles!inner(nombre)` and `usuarios!inner(nombre, apellido, tipo_identificacion, numero_identificacion, telefono, email, foto_url, estado)` filtered by `tenant_id`; maps raw rows to `MiembroRow[]`; throws `EquipoServiceError` on failure
  - `getEquipoStats(members: MiembroRow[]): EquipoStats` — pure helper, no DB call; derives `totalMiembros`, `totalActivos` (`estado === 'activo'`), `entrenadoresActivos` (`rol_nombre.toLowerCase() === 'entrenador' && estado === 'activo'`)
  - `mapPostgrestError` internal helper mapping Supabase error codes to `EquipoServiceError`

## 5. Hook

- [x] 5.1 Create `src/hooks/portal/gestion-equipo/useEquipo.ts` with the following state and derived values:
  - State: `members: MiembroRow[]`, `loading: boolean`, `error: string | null`
  - State: `searchTerm: string`, `estadoFilter: MiembroEstado | 'all'`
  - State: `currentPage: number` (default `1`), `pageSize: 20 | 50 | 100` (default `20`)
  - Derived: `filteredMembers` — apply `searchTerm` (case-insensitive match on `fullName`, `email`, `telefono`) then `estadoFilter` to `members`
  - Derived: `paginatedMembers` — slice of `filteredMembers` for current page
  - Derived: `totalFiltered`, `totalPages`, `stats: EquipoStats` (from full `members` list, not filtered)
  - Behaviour: reset `currentPage` to `1` whenever `searchTerm` or `estadoFilter` changes
  - Exposed: `setSearchTerm`, `setEstadoFilter`, `setCurrentPage`, `setPageSize`, `refresh`

## 6. Components

- [x] 6.1 Create `src/components/portal/gestion-equipo/EquipoStatusBadge.tsx`
  - Props: `estado: MiembroEstado`
  - Renders a `<span>` with `aria-label={estado}`, colour classes per estado:
    - `activo` → `bg-emerald-900/30 text-emerald-300 border border-emerald-400/30`
    - `mora` → `bg-amber-900/30 text-amber-300 border border-amber-400/30`
    - `suspendido` → `bg-orange-900/30 text-orange-300 border border-orange-400/30`
    - `inactivo` → `bg-slate-800/50 text-slate-400 border border-slate-600/30`

- [x] 6.2 Create `src/components/portal/gestion-equipo/EquipoStatsCards.tsx`
  - Props: `stats: EquipoStats`
  - Renders three glass-style cards (dark glass look, `border-portal-border`) with labels and values:
    - **Total Miembros** → `stats.totalMiembros`
    - **Usuarios Activos** → `stats.totalActivos`
    - **Entrenadores Activos** → `stats.entrenadoresActivos`

- [x] 6.3 Create `src/components/portal/gestion-equipo/EquipoHeaderFilters.tsx`
  - Props: `searchTerm`, `onSearchChange`, `estadoFilter`, `onEstadoFilterChange`
  - Renders a search `<input>` (placeholder: "Buscar por nombre, email o teléfono…")
  - Renders a row of filter chips: **Todos · Activo · Mora · Suspendido · Inactivo**; active chip has accent border/background

- [x] 6.4 Create `src/components/portal/gestion-equipo/EquipoTable.tsx`
  - Props: `rows: MiembroTableItem[]`, `currentPage`, `pageSize`, `totalPages`, `totalFiltered`, `onPageChange`, `onPageSizeChange`
  - Renders a `<table>` with `<thead>` (all `<th scope="col">`) and columns: Nombre, Tipo ID, N° Identificación, Teléfono, Correo, Estado, Perfil
  - Nullable fields render `—`; Estado renders `<EquipoStatusBadge />`
  - Below the table renders a pagination bar:
    - Label: "Mostrando X–Y de Z miembros"
    - Previous / Next buttons (disabled at boundaries)
    - `<select>` with options `20`, `50`, `100` for page size

- [x] 6.5 Create `src/components/portal/gestion-equipo/EquipoPage.tsx`
  - Props: `tenantId: string`
  - Calls `useEquipo({ tenantId })`
  - Renders loading state, error state (with retry button), empty state, and the full composition: `EquipoStatsCards` → `EquipoHeaderFilters` → `EquipoTable`
  - Passes all pagination props from the hook to `EquipoTable`
  - Mirror structure of `src/components/portal/planes/PlanesPage.tsx`

## 7. Route Page

- [x] 7.1 Create `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-equipo/page.tsx` — thin page that resolves `tenant_id` from params and renders `<EquipoPage tenantId={tenantId} />`

## 8. Navigation

- [x] 8.1 Add `{ label: 'Equipo', path: 'gestion-equipo', icon: 'groups' }` to the `administrador` array in `ROLE_TENANT_ITEMS` in `src/types/portal.types.ts`
- [x] 8.2 Verify `resolvePortalMenu` produces the correct href `/portal/orgs/[tenant_id]/gestion-equipo` for the new entry (no changes should be needed — function is generic)

## 9. QA Checklist

- [x] 9.1 Log in as an `administrador` and verify the **Equipo** nav item appears in the sidebar
- [x] 9.2 Navigate to the Gestión Equipo page and verify all members of the tenant are listed
- [x] 9.3 Verify the three stat cards show correct counts (total, activos, entrenadores activos)
- [x] 9.4 Search by partial name, email, and phone; verify table filters correctly
- [x] 9.5 Select each estado quick-filter chip; verify table filters to matching rows only
- [x] 9.6 Verify estado badges render the correct colours for each value
- [x] 9.7 Verify pagination: default 20 rows, Next/Prev navigation, page-size selector (20/50/100)
- [x] 9.8 Verify Previous button is disabled on page 1 and Next is disabled on the last page
- [x] 9.9 Log in as a `usuario` or `entrenador` and verify `/gestion-equipo` is not accessible
- [x] 9.10 Verify nullable columns (`tipo_identificacion`, `numero_identificacion`, `telefono`) display `—` when null

## 10. Documentation

- [x] 10.1 Update `projectspec/03-project-structure.md` — add `gestion-equipo/` to the directory tree in the routes, components, hooks, services, and types sections

## 11. Commit and Pull Request

- [x] 11.1 Stage all changes and create a commit with message:
  ```
  feat(equipo): add team management module for administrators

  - Migration: add tipo_identificacion, numero_identificacion columns to usuarios
    with check constraints; add estado check constraint; add admin RLS policy on miembros_tenant
  - Types: MiembroRow, MiembroTableItem, EquipoStats, TipoIdentificacion, MiembroEstado, EquipoServiceError
  - Service: equipo.service.ts with getEquipo() join query and getEquipoStats() pure helper
  - Hook: useEquipo with client-side search/filter, pagination (20/50/100), and stats derivation
  - Components: EquipoStatusBadge, EquipoStatsCards, EquipoHeaderFilters, EquipoTable (with pagination bar), EquipoPage
  - Route: (administrador)/gestion-equipo/page.tsx
  - Navigation: ROLE_TENANT_ITEMS administrador array updated with Equipo entry
  - Docs: 03-project-structure.md updated

  Closes US0017
  ```
- [x] 11.2 Open a Pull Request with the following description:
  ```
  ## Summary
  Implements the Gestion Equipo module (US0017) — a read-only administrator view
  listing all members of the organization with search, status filters, stat cards,
  and client-side pagination (20/50/100 rows per page).

  ## Changes
  - DB migration: `tipo_identificacion` + `numero_identificacion` columns, two check
    constraints, and RLS policy for admin SELECT on `miembros_tenant`
  - New feature slice: types → service → hook → 5 components → route page
  - Navigation: Equipo entry added to administrador ROLE_TENANT_ITEMS

  ## Testing
  - Manual QA checklist completed (see tasks 9.1–9.10)

  ## Notes
  - Read-only; member CRUD deferred to a future story
  - Server-side pagination deferred; client-side pagination handles current tenant sizes
  ```
