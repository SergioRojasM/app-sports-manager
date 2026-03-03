## Why

Administrators currently have no dedicated view to manage and monitor the people in their organization. A centralized **Gestion Equipo** module provides a single place to browse all tenant members, check their status, and quickly identify active athletes and trainers — enabling better day-to-day team oversight without leaving the portal.

## What Changes

- **New route** `(administrador)/gestion-equipo/page.tsx` added to the portal under the admin role-group.
- **New feature slice** `gestion-equipo` created across components, hooks, services, and types following the established feature-slice convention.
- **New database migration** adds `tipo_identificacion` (varchar 20) and `numero_identificacion` (varchar 30) columns to `public.usuarios`.
- **Navigation updated**: `RoleBasedMenu.tsx` gains a *Gestión Equipo* entry scoped to the `administrador` role.
- **Read-only page** listing all tenant members with stats, search, and quick-filters — no mutations in this iteration.

## Capabilities

### New Capabilities

- `team-management`: Administrator-only module that lists all members of the tenant (joining `miembros_tenant`, `usuarios`, and `roles`). Includes stat cards (total members, active users, active trainers), quick-filter chips by `estado`, a search bar, and a data table with full name, identification type/number, phone, email, status badge, and role.

### Modified Capabilities

_(none — no existing spec-level requirements change)_

## Non-goals

- Member creation, editing, or deletion (deferred to a future story).
- Bulk actions or CSV export.
- Pagination (client-side filtering is sufficient for current tenant sizes; pagination deferred).
- Athlete/trainer performance metrics or training history within this view.

## Impact

**Database**
- `public.usuarios` — two new nullable columns: `tipo_identificacion`, `numero_identificacion`.
- Requires a new Supabase migration file.
- RLS: verify or create a SELECT policy on `miembros_tenant` allowing admins to read all members for their tenant (reuses `get_admin_tenants_for_authenticated_user()`).

**Files to create**

```
supabase/migrations/YYYYMMDDXXXXXX_add_identificacion_cols_usuarios.sql

src/types/portal/equipo.types.ts
src/services/supabase/portal/equipo.service.ts
src/hooks/portal/gestion-equipo/useEquipo.ts
src/components/portal/gestion-equipo/EquipoStatusBadge.tsx
src/components/portal/gestion-equipo/EquipoStatsCards.tsx
src/components/portal/gestion-equipo/EquipoHeaderFilters.tsx
src/components/portal/gestion-equipo/EquipoTable.tsx
src/components/portal/gestion-equipo/EquipoPage.tsx
src/app/portal/orgs/[tenant_id]/(administrador)/gestion-equipo/page.tsx
```

**Files to modify**

```
src/components/portal/RoleBasedMenu.tsx           — add Gestión Equipo nav item
projectspec/03-project-structure.md               — document new feature slice
```

**Dependencies**
- Existing Supabase helper `get_admin_tenants_for_authenticated_user()` (already available).
- Portal role-gate layout already enforces `(administrador)` route-group access.
- `estado` column on `usuarios` added by migration `20260303195145_add_estado_col_usuarios.sql`.

## Step-by-Step Implementation Plan

1. **Migration** — create and apply migration adding `tipo_identificacion` and `numero_identificacion` to `public.usuarios`. Verify/add RLS SELECT policy on `miembros_tenant` for admins.
2. **Types** (`equipo.types.ts`) — define `MiembroEstado`, `MiembroRow`, `MiembroTableItem`, `EquipoStats`, `EquipoServiceError`.
3. **Service** (`equipo.service.ts`) — implement `getEquipo(tenantId)` querying `miembros_tenant` joined with `usuarios` and `roles`; pure helper `getEquipoStats(members)`.
4. **Hook** (`useEquipo.ts`) — fetch on mount, derive `filteredMembers` from `searchTerm` + `estadoFilter`, derive `stats`, expose `setSearchTerm`, `setEstadoFilter`, `refresh`.
5. **Components** (in order):
   - `EquipoStatusBadge.tsx` — colour-coded badge for `estado` values.
   - `EquipoStatsCards.tsx` — three stat cards (total members, active users, active trainers).
   - `EquipoHeaderFilters.tsx` — search input + quick-filter chips.
   - `EquipoTable.tsx` — data table consuming `MiembroTableItem[]`.
   - `EquipoPage.tsx` — top-level composition (loading / error / empty states + all sub-components).
6. **Route page** — `gestion-equipo/page.tsx` under `(administrador)` rendering `<EquipoPage tenantId={...} />`.
7. **Navigation** — add menu entry in `RoleBasedMenu.tsx` for `administrador` role.
8. **Docs** — update `projectspec/03-project-structure.md` with the new feature slice.
