-- =============================================
-- Migration: Add tenant-scoped estado column to miembros_tenant
-- US-0037: Tenant Member Status Management
-- =============================================

begin;

-- 1. Add estado column with default 'activo'
alter table public.miembros_tenant
  add column estado text not null default 'activo';

-- 2. Check constraint for allowed values
alter table public.miembros_tenant
  add constraint miembros_tenant_estado_ck
  check (estado in ('activo', 'mora', 'suspendido', 'inactivo'));

-- 3. Backfill from usuarios.estado (same allowed set — safe)
update public.miembros_tenant mt
  set estado = u.estado
  from public.usuarios u
  where mt.usuario_id = u.id;

-- 4. RLS: Allow admins to UPDATE estado on miembros_tenant
grant update on table public.miembros_tenant to authenticated;

drop policy if exists miembros_tenant_update_estado_admin on public.miembros_tenant;
create policy miembros_tenant_update_estado_admin on public.miembros_tenant
  for update to authenticated
  using (
    tenant_id in (
      select admin_t.id from public.get_admin_tenants_for_authenticated_user() admin_t
    )
  )
  with check (
    tenant_id in (
      select admin_t.id from public.get_admin_tenants_for_authenticated_user() admin_t
    )
  );

commit;
