## Why

`usuarios.estado` is a global account-level flag, but the Team Management UI surfaces it as if it were tenant-scoped. A user can be in good standing in one organization and suspended in another for reasons local to that tenant; conflating the two breaks the operational model. This change decouples the concepts by introducing a dedicated `miembros_tenant.estado` column with a full audit trail (`miembros_tenant_novedades`) and updates the Team Management UI to reflect the correct, tenant-scoped state.

## What Changes

- **Add `estado` column to `miembros_tenant`** — text column (`activo | mora | suspendido | inactivo`, default `activo`) with a check constraint and backfill from `usuarios.estado`.
- **Create `miembros_tenant_novedades` table** — append-only audit log capturing every admin-initiated event (tipo, descripcion, estado_resultante, registrado_por, created_at). No UPDATE/DELETE RLS policies.
- **Create `v_miembros_equipo` view** — flattens the `miembros_tenant + usuarios + roles` join and adds an `inasistencias_recientes` lateral subquery (absences in last 30 days per member per tenant).
- **Create `cambiar_estado_miembro` RPC** — `SECURITY DEFINER` Postgres function that atomically updates `miembros_tenant.estado` and inserts a `miembros_tenant_novedades` row. Enforces admin-role check server-side.
- **Update `equipo.service.ts`** — switch query from `miembros_tenant` to `v_miembros_equipo`; adapt `RawMiembroRow` to a flat shape; add `cambiarEstadoMiembro` and `getNovedadesMiembro` methods.
- **Update `useEquipo.ts` hook** — expose `cambiarEstado`, `getNovedades`, `isCambiandoEstado`.
- **Update `EquipoTable.tsx`** — source `estado` from `miembros_tenant` (via view); add "Fallas (30d)" column with colour coding; add "Cambiar Estado" and "Ver Novedades" action buttons.
- **New `CambiarEstadoModal.tsx`** — form modal with `nuevoEstado`, `tipo`, and `descripcion` fields.
- **New `NovedadesMiembroModal.tsx`** — read-only history drawer, newest-first.
- **Update `EquipoPage.tsx`** — wire modal state and callbacks.

## Capabilities

### New Capabilities
- `tenant-member-status`: Tenant-scoped member status and immutable audit log (novedades) — covers the `miembros_tenant.estado` column, the `miembros_tenant_novedades` table, the `v_miembros_equipo` view, the `cambiar_estado_miembro` RPC, and the service/hook/modal layer that drives the change-status and history interactions.

### Modified Capabilities
- `team-management`: The **Estado** column must now read from `miembros_tenant.estado` (not `usuarios.estado`); the table gains a **Fallas (30d)** column and two new row actions (Cambiar Estado, Ver Novedades). These are spec-level requirement changes — new columns, new callbacks, new action buttons.

## Non-goals

- Removing or repurposing `usuarios.estado` — it continues to serve as a global/account-level flag (e.g., blocking login).
- Adding novedad history to any page other than Gestión de Equipo.
- Automated status transitions (e.g., auto-suspend after N absences) — status changes are always admin-initiated in this US.
- Export or reporting of novedades outside the inline history modal.

## Impact

### Database
- New migration: `ALTER TABLE miembros_tenant ADD COLUMN estado`
- New migration: `CREATE TABLE miembros_tenant_novedades` + indexes + RLS
- New migration: `CREATE VIEW v_miembros_equipo` + `cambiar_estado_miembro` RPC

### Backend / Service
- `src/services/supabase/portal/equipo.service.ts` — query rewrite + 2 new methods
- `src/types/portal/equipo.types.ts` — new types (`MiembroNovedadTipo`, `MiembroNovedad`, `CambiarEstadoMiembroInput`); updated `MiembroRow` / `RawMiembroRow`

### Frontend
- `src/hooks/portal/gestion-equipo/useEquipo.ts`
- `src/components/portal/gestion-equipo/EquipoTable.tsx`
- `src/components/portal/gestion-equipo/EquipoPage.tsx`
- `src/components/portal/gestion-equipo/CambiarEstadoModal.tsx` *(new)*
- `src/components/portal/gestion-equipo/NovedadesMiembroModal.tsx` *(new)*
- `src/components/portal/gestion-equipo/index.ts`

## Implementation Plan

1. **Types** — extend `equipo.types.ts` with new types; update `MiembroRow` and `RawMiembroRow`.
2. **Migrations** — three migration files (estado column, novedades table + RPC, view).
3. **Service** — switch to `v_miembros_equipo`, update `mapRawRow`, add `cambiarEstadoMiembro` and `getNovedadesMiembro`.
4. **Hook** — add `cambiarEstado`, `getNovedades`, `isCambiandoEstado` to `useEquipo`.
5. **Components**:
   - `EquipoTable`: add Fallas column + new action buttons.
   - `CambiarEstadoModal`: new status-change form modal.
   - `NovedadesMiembroModal`: new read-only history modal.
   - `EquipoPage`: wire modal state and callbacks.
6. **Exports** — update `index.ts` with new components.
