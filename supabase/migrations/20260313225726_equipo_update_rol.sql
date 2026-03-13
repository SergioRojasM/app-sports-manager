-- =============================================
-- MIGRATION: Admin equipo role update — RLS policy for
--   UPDATE on miembros_tenant (rol_id only use case)
-- US-0029: Edit Team Member Role
-- =============================================

begin;

-- 1. Allow admins to UPDATE miembros_tenant rows for their tenant
grant update on table public.miembros_tenant to authenticated;

drop policy if exists miembros_tenant_update_rol_admin on public.miembros_tenant;
create policy miembros_tenant_update_rol_admin on public.miembros_tenant
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
