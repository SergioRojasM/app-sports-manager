# US-0037 — Tenant Member Status Management

## ID
US-0037

## Name
Manage Member Status and Activity Log Within a Tenant

## As a
Tenant Administrator

## I Want
Each member of my organization to have their own status within my tenant (independent of their global user status), and to be able to record administrative events (novedades) such as payment failures or training absence accumulation that drive those status transitions.

## So That
I can accurately reflect the operational state of each athlete within my organization, take corrective actions (suspend, reactivate), keep an auditable log of the reasons behind each status change, and display the correct tenant-specific status in the team management view.

---

## Description

### Current State

`usuarios.estado` (added in migration `20260303195145`) is a **global** flag (`activo`, `mora`, `suspendido`, `inactivo`) that belongs to the user account, not to any specific tenant's membership. However, the "Gestión de Equipo" page (`EquipoStatusBadge`, `EquipoTable`, `equipo.service.ts`) currently surfaces this global flag as if it were a tenant-scoped state.

This is incorrect: a user might be active in one organization but suspended in another due to debt or disciplinary reasons that are local to that tenant. This user story decouples the two concepts.

### Proposed Changes

#### 1. Add `estado` column to `miembros_tenant`

Add a `texto` column `estado` to `public.miembros_tenant` with allowed values `activo | mora | suspendido | inactivo` and a default of `activo`. This column represents the member's status **within that specific tenant**.

#### 2. Create `miembros_tenant_novedades` table

A new audit/event log table that records every administrative event affecting a member's tenant-level status. Each row captures:
- **What happened** (`tipo`: `falta_pago`, `inasistencias_acumuladas`, `suspension_manual`, `reactivacion`, `otro`)
- **A free-text description** explaining the reason
- **The resulting status** after the event (`estado_resultante`)
- **Who registered it** (the admin user)
- **When it happened** (`created_at`)

Novedades are append-only; they are never edited or deleted (audit trail). The most recent novedad determines the observable state, but historical rows must be preserved.

#### 3. Update the Team Management UI

The "Estado" column in `EquipoTable` must reflect `miembros_tenant.estado` (not `usuarios.estado`). Admins must be able to:
- **Change a member's tenant status** (e.g., set to `mora`, `suspendido`, `inactivo`, `activo`) via a dedicated action button/modal.
- **Add a novedad** with a type and description to justify the status change.
- **View the history of novedades** for a member in a read-only modal or expandable panel.
- **See a "Fallas (30d)" counter** per member row: number of training absences (`asistencias.asistio = false`) in the last 30 days. This gives the admin actionable context to decide whether a status change is warranted, without requiring a separate report.

---

## Database Changes

### Migration 1 — Add `estado` to `miembros_tenant`

```sql
-- Add tenant-scoped estado column with check constraint
alter table public.miembros_tenant
  add column estado text not null default 'activo',
  add constraint miembros_tenant_estado_ck
    check (estado in ('activo', 'mora', 'suspendido', 'inactivo'));

-- Backfill from usuarios.estado for existing memberships
update public.miembros_tenant mt
set estado = u.estado
from public.usuarios u
where mt.usuario_id = u.id;

-- RLS: allow authenticated admins of the tenant to UPDATE estado
grant update on table public.miembros_tenant to authenticated;

-- The existing miembros_tenant_update_rol_admin policy may be broadened,
-- or a separate policy created:
drop policy if exists miembros_tenant_update_estado_admin on public.miembros_tenant;
create policy miembros_tenant_update_estado_admin on public.miembros_tenant
  for update to authenticated
  using (
    exists (
      select 1 from public.miembros_tenant mt2
      join public.roles r on r.id = mt2.rol_id
      where mt2.tenant_id = miembros_tenant.tenant_id
        and mt2.usuario_id = auth.uid()
        and r.nombre = 'administrador'
    )
  )
  with check (
    exists (
      select 1 from public.miembros_tenant mt2
      join public.roles r on r.id = mt2.rol_id
      where mt2.tenant_id = miembros_tenant.tenant_id
        and mt2.usuario_id = auth.uid()
        and r.nombre = 'administrador'
    )
  );
```

### Migration 3 — Create `v_miembros_equipo` view

To avoid an N+1 query pattern, a Postgres view computes `inasistencias_recientes` inline alongside the member join:

```sql
create or replace view public.v_miembros_equipo as
select
  mt.id,
  mt.tenant_id,
  mt.usuario_id,
  mt.rol_id,
  mt.estado,
  mt.created_at,
  u.nombre,
  u.apellido,
  u.tipo_identificacion,
  u.numero_identificacion,
  u.telefono,
  u.email,
  u.foto_url,
  u.rh,
  r.nombre as rol_nombre,
  (
    select count(*)::int
    from public.asistencias a
    join public.reservas rv on rv.id = a.reserva_id
    where rv.usuario_id = mt.usuario_id
      and rv.tenant_id = mt.tenant_id
      and a.asistio = false
      and a.created_at >= now() - interval '30 days'
  ) as inasistencias_recientes
from public.miembros_tenant mt
join public.usuarios u on u.id = mt.usuario_id
join public.roles r on r.id = mt.rol_id;
```

This view is read-only. RLS on the underlying tables continues to apply because the view does not use `SECURITY DEFINER`. The service queries `v_miembros_equipo` instead of `miembros_tenant` for the list load.

---

### Migration 2 — Create `miembros_tenant_novedades`

```sql
create table if not exists public.miembros_tenant_novedades (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null,
  miembro_id      uuid not null,          -- FK → miembros_tenant.id
  tipo            text not null,
  descripcion     text,
  estado_resultante text not null,
  registrado_por  uuid not null,          -- FK → usuarios.id (admin)
  created_at      timestamptz not null default timezone('utc', now()),

  constraint miembros_tenant_novedades_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint miembros_tenant_novedades_miembro_id_fkey
    foreign key (miembro_id) references public.miembros_tenant(id) on delete cascade,
  constraint miembros_tenant_novedades_registrado_por_fkey
    foreign key (registrado_por) references public.usuarios(id) on delete restrict,
  constraint miembros_tenant_novedades_tipo_ck
    check (tipo in ('falta_pago', 'inasistencias_acumuladas', 'suspension_manual', 'reactivacion', 'otro')),
  constraint miembros_tenant_novedades_estado_resultante_ck
    check (estado_resultante in ('activo', 'mora', 'suspendido', 'inactivo'))
);

-- Indexes
create index idx_miembros_novedades_miembro on public.miembros_tenant_novedades (miembro_id, created_at desc);
create index idx_miembros_novedades_tenant  on public.miembros_tenant_novedades (tenant_id, created_at desc);

alter table public.miembros_tenant_novedades enable row level security;

-- SELECT: admins of the tenant (and the member themselves) can read novedades
drop policy if exists novedades_select_tenant_admin on public.miembros_tenant_novedades;
create policy novedades_select_tenant_admin on public.miembros_tenant_novedades
  for select to authenticated
  using (
    exists (
      select 1 from public.miembros_tenant mt
      join public.roles r on r.id = mt.rol_id
      where mt.tenant_id = miembros_tenant_novedades.tenant_id
        and mt.usuario_id = auth.uid()
        and r.nombre = 'administrador'
    )
  );

-- INSERT: admins only
grant insert on table public.miembros_tenant_novedades to authenticated;
drop policy if exists novedades_insert_admin on public.miembros_tenant_novedades;
create policy novedades_insert_admin on public.miembros_tenant_novedades
  for insert to authenticated
  with check (
    registrado_por = auth.uid()
    and exists (
      select 1 from public.miembros_tenant mt
      join public.roles r on r.id = mt.rol_id
      where mt.tenant_id = miembros_tenant_novedades.tenant_id
        and mt.usuario_id = auth.uid()
        and r.nombre = 'administrador'
    )
  );

-- No UPDATE or DELETE policies: novedades are immutable (append-only audit log)
```

**Security note:** Novedades are append-only. No `UPDATE` or `DELETE` policies are granted. If hard deletion is ever required, it must go through a `SECURITY DEFINER` function with explicit authorization checks, not through direct table access.

---

## Types

### `src/types/portal/equipo.types.ts`

- `MiembroEstado` remains `'activo' | 'mora' | 'suspendido' | 'inactivo'` (no change to the union).
- Add `MiembroNovedadTipo = 'falta_pago' | 'inasistencias_acumuladas' | 'suspension_manual' | 'reactivacion' | 'otro'`.
- Add `MiembroNovedad` shape:
  ```ts
  export type MiembroNovedad = {
    id: string;
    miembro_id: string;
    tipo: MiembroNovedadTipo;
    descripcion: string | null;
    estado_resultante: MiembroEstado;
    registrado_por: string;
    created_at: string;
  };
  ```
- Add `CambiarEstadoMiembroInput`:
  ```ts
  export type CambiarEstadoMiembroInput = {
    miembroId: string;        // miembros_tenant.id
    tenantId: string;
    nuevoEstado: MiembroEstado;
    tipo: MiembroNovedadTipo;
    descripcion?: string;
  };
  ```
- Update `MiembroRow` and `RawMiembroRow` so `estado` is read from `miembros_tenant.estado` rather than `usuarios.estado`. The `usuarios` join no longer needs to carry `estado`.
- Add `inasistencias_recientes: number` to `MiembroRow` — computed by the `v_miembros_equipo` view; defaults to `0` if null.

---

## Service Layer

### `src/services/supabase/portal/equipo.service.ts`

#### 1. Update `RawMiembroRow` and the Supabase select query

The existing `miembros` query selects `usuarios(... estado ...)`. Move `estado` out of the nested `usuarios` object and into the top-level `miembros_tenant` row:

The service now queries `v_miembros_equipo` instead of `miembros_tenant` directly. The view already flattens the `usuarios` and `roles` join, so `RawMiembroRow` becomes a flat shape:

```ts
// The service queries v_miembros_equipo — a flat view, no nested relations
type RawMiembroRow = {
  id: string;
  tenant_id: string;
  usuario_id: string;
  rol_id: string;
  estado: string;                    // ← from miembros_tenant
  inasistencias_recientes: number;   // ← lateral subquery in the view
  nome: string | null;               // flattened from usuarios
  apellido: string | null;
  tipo_identificacion: string | null;
  numero_identificacion: string | null;
  telefono: string | null;
  email: string;
  foto_url: string | null;
  rh: string | null;
  rol_nombre: string;                // flattened from roles
};
```

Update the Supabase `.from('v_miembros_equipo').select('*')` (or list explicit columns). Update `mapRawRow` accordingly — `estado` and `inasistencias_recientes` come from top-level fields; `usuarios: { ... }` nesting is removed.

```ts
// Removed nested structure — kept here for context only:
// type RawMiembroRow = {
//   estado: string;           // ← was from usuarios nested select
//   usuarios: {
//     nombre: string | null;
//     apellido: string | null;
    tipo_identificacion: string | null;
    numero_identificacion: string | null;
    telefono: string | null;
    email: string;
//     foto_url: string | null;
//     rh: string | null;
//   };
//   roles: { nombre: string };
// };

#### 2. Add `cambiarEstadoMiembro(input: CambiarEstadoMiembroInput): Promise<void>`

Performs two writes atomically (use a Supabase RPC or sequential service calls wrapped in error handling):

1. `UPDATE miembros_tenant SET estado = nuevoEstado WHERE id = miembroId AND tenant_id = tenantId`
2. `INSERT INTO miembros_tenant_novedades (tenant_id, miembro_id, tipo, descripcion, estado_resultante, registrado_por)` — `registrado_por` is the currently-authenticated user's `auth.uid()`.

If step 1 succeeds but step 2 fails, surface the error and consider rolling back or at minimum logging the inconsistency (the novedad is the audit record; the status should not be orphaned without a reason).

Preferred implementation: a single PostgreSQL RPC (`security definer`) that wraps both writes:

```sql
create or replace function public.cambiar_estado_miembro(
  p_miembro_id      uuid,
  p_tenant_id       uuid,
  p_nuevo_estado    text,
  p_tipo            text,
  p_descripcion     text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verify caller is admin of this tenant
  if not exists (
    select 1 from public.miembros_tenant mt
    join public.roles r on r.id = mt.rol_id
    where mt.tenant_id = p_tenant_id
      and mt.usuario_id = auth.uid()
      and r.nombre = 'administrador'
  ) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  -- Update tenant-scoped estado
  update public.miembros_tenant
  set estado = p_nuevo_estado
  where id = p_miembro_id and tenant_id = p_tenant_id;

  if not found then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;

  -- Append novedad
  insert into public.miembros_tenant_novedades
    (tenant_id, miembro_id, tipo, descripcion, estado_resultante, registrado_por)
  values
    (p_tenant_id, p_miembro_id, p_tipo, p_descripcion, p_nuevo_estado, auth.uid());
end;
$$;
```

Call via `supabase.rpc('cambiar_estado_miembro', { ... })` in the service layer.

#### 3. Add `getNovedadesMiembro(miembroId: string, tenantId: string): Promise<MiembroNovedad[]>`

Fetches all novedades for a given member, ordered by `created_at desc`.

---

## Hook Layer

### `src/hooks/portal/gestion-equipo/useEquipo.ts`

- Expose `cambiarEstado(miembroId, nuevoEstado, tipo, descripcion?)` which calls the service method and calls `refresh()` on success.
- Expose `getNovedades(miembroId)` returning `MiembroNovedad[]` (lazy-loaded per member, triggered from the UI).
- Add `isCambiandoEstado: boolean` loading flag.

---

## Components

### `src/components/portal/gestion-equipo/`

#### `EquipoTable.tsx`
- Add a **"Cambiar Estado"** action button in the row actions column (icon-only, e.g., a tag or status-change icon), visible only to admins.
- Pass `onCambiarEstado?: (row: MiembroTableItem) => void` prop.
- The "Estado" cell continues to render `<EquipoStatusBadge />`, but now sourced from `miembros_tenant.estado` via the updated `MiembroRow.estado`.
- Add a **"Fallas (30d)"** column that renders `inasistencias_recientes`:
  - `0` → dash (`—`), neutral slate color
  - `1–2` → amber badge (e.g., `bg-amber-900/30 text-amber-300`)
  - `3+` → red badge (e.g., `bg-red-900/30 text-red-300`)
- Pass `inasistencias_recientes` through from `MiembroTableItem` (already available via `MiembroRow`).

#### `EquipoStatusBadge.tsx`
- No change to visual styles or logic — it already renders the four states correctly.

#### New: `CambiarEstadoModal.tsx`
A right-side slide-in or centered confirmation modal with the following fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `nuevoEstado` | `<select>` | Yes | Options: Activo, Mora, Suspendido, Inactivo |
| `tipo` | `<select>` | Yes | Options: Falta de pago, Inasistencias acumuladas, Suspensión manual, Reactivación, Otro |
| `descripcion` | `<textarea>` | No | Max 500 chars; free-text reason |

- On confirm: calls `cambiarEstado(...)` hook method.
- Shows loading state while the RPC is in flight.
- On success: closes modal, refreshes equipo list, shows a success toast.
- On error: shows inline error message inside the modal without closing.
- Title: *"Cambiar estado de [Nombre Apellido]"*
- Include a read-only display of the current estado using `EquipoStatusBadge` so the admin can confirm the context before changing.

#### New: `NovedadesMiembroModal.tsx`
A read-only modal/drawer that shows the full history of novedades for a member:

- Title: *"Historial de novedades — [Nombre Apellido]"*
- Each novedad row shows: date (`created_at` formatted), `tipo` label, `descripcion`, `estado_resultante` badge.
- Novedades are listed newest-first.
- Shows a loading skeleton while fetching.
- Shows an empty state if no novedades exist.
- Add a **"Ver novedades"** action in the row actions column that opens this modal.

#### `EquipoPage.tsx`
- Add state variables: `cambiarEstadoTarget`, `novedadesTarget` (both `MiembroTableItem | null`).
- Wire up `onCambiarEstado` and `onVerNovedades` callbacks to `EquipoTable`.
- Render `<CambiarEstadoModal />` and `<NovedadesMiembroModal />`.

#### `index.ts`
- Export `CambiarEstadoModal` and `NovedadesMiembroModal`.

---

## Stats Updates

### `EquipoStatsCards.tsx` / `getEquipoStats()`

Stats are already derived from `members.estado`. Since `estado` now comes from `miembros_tenant`, the derivation logic remains unchanged — only the data source changes (resolved at the service layer).

---

## Files to Modify

| File | Change |
|---|---|
| `supabase/migrations/YYYYMMDDHHMMSS_miembros_tenant_estado.sql` | New migration: add `estado` column + check constraint + RLS policy |
| `supabase/migrations/YYYYMMDDHHMMSS_miembros_tenant_novedades.sql` | New migration: create `miembros_tenant_novedades` table + indexes + RLS + RPC |
| `supabase/migrations/YYYYMMDDHHMMSS_v_miembros_equipo.sql` | New migration: create `v_miembros_equipo` view with inasistencias subquery |
| `src/types/portal/equipo.types.ts` | Add `MiembroNovedadTipo`, `MiembroNovedad`, `CambiarEstadoMiembroInput`; add `inasistencias_recientes` to `MiembroRow`; flatten `RawMiembroRow` |
| `src/services/supabase/portal/equipo.service.ts` | Switch query to `v_miembros_equipo`; update `mapRawRow` for flat shape + `inasistencias_recientes`; add `cambiarEstadoMiembro`, `getNovedadesMiembro` |
| `src/hooks/portal/gestion-equipo/useEquipo.ts` | Add `cambiarEstado`, `getNovedades`, `isCambiandoEstado` |
| `src/components/portal/gestion-equipo/EquipoTable.tsx` | Add `onCambiarEstado`, `onVerNovedades` props; new action buttons; add "Fallas (30d)" column |
| `src/components/portal/gestion-equipo/EquipoPage.tsx` | Add modal state + wire new modals |
| `src/components/portal/gestion-equipo/CambiarEstadoModal.tsx` | **New file** |
| `src/components/portal/gestion-equipo/NovedadesMiembroModal.tsx` | **New file** |
| `src/components/portal/gestion-equipo/index.ts` | Export new components |

---

## Acceptance Criteria

1. **Migration backfill**: After applying the migration, all existing `miembros_tenant` rows have `estado` populated from their linked `usuarios.estado`.
2. **Decoupled states**: Changing `miembros_tenant.estado` for a member in Tenant A does not affect their `usuarios.estado` or their membership state in Tenant B.
3. **Team list reflects tenant state**: The "Estado" column in Gestión de Equipo shows the value from `miembros_tenant.estado`, not `usuarios.estado`.
4. **Status change with novedad**: An admin can open `CambiarEstadoModal`, select a new status and a tipo, optionally add a description, confirm, and the UI refreshes showing the updated badge.
5. **Novedad is always recorded**: Every successful `cambiar_estado_miembro` RPC inserts exactly one row in `miembros_tenant_novedades`.
6. **Read-only history**: Clicking "Ver novedades" opens `NovedadesMiembroModal` showing all past novedades for that member, newest first.
7. **Non-admin users cannot change status**: The RPC enforces admin-role authorization server-side; a frontend-only check is insufficient and must not be the only guard.
8. **No data loss**: Novedades cannot be updated or deleted via the API (no UPDATE/DELETE RLS policies; no exposed service methods for it).
9. **Stats cards remain accurate**: The counts in `EquipoStatsCards` (activos, mora, suspendidos, inactivos) reflect the tenant-scoped estado.
10. **Fallas counter is correct**: The "Fallas (30d)" column shows the exact count of `asistencias.asistio = false` rows linked to the member within the tenant in the last 30 days. A member with 0 fallas shows `—`; 1–2 shows an amber badge; 3+ shows a red badge.

---

## Non-Functional Requirements

- **Security**: Status changes must be validated server-side via the `cambiar_estado_miembro` `SECURITY DEFINER` RPC. Client-side role checks are UX guards only.
- **Atomicity**: The RPC must execute both the `UPDATE` on `miembros_tenant` and the `INSERT` on `miembros_tenant_novedades` within a single database transaction (Postgres function body runs in an implicit transaction).
- **Immutable audit trail**: `miembros_tenant_novedades` has no UPDATE or DELETE RLS policies. Historical records must never be modified or purged through normal application flows.
- **Performance**: The `idx_miembros_novedades_miembro` index ensures history queries are efficient even for members with many novedades. The `inasistencias_recientes` subquery in `v_miembros_equipo` uses the existing `asistencias` and `reservas` indexes; it runs once per member row during the list load. For tenants with large attendance history, a partial index on `asistencias(reserva_id) WHERE asistio = false` may be added if query times exceed acceptable thresholds.
- **Backward compatibility**: `usuarios.estado` remains in place and continues to be used for any authentication/account-level checks (e.g., blocking login). This US does not remove or repurpose that column.
