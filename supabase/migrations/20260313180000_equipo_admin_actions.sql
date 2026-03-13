-- =============================================
-- MIGRATION: Admin equipo actions — RLS policies for
--   UPDATE on usuarios, DELETE on miembros_tenant
-- US-0027: Team Member Row Actions
-- =============================================

begin;

-- 1. Allow admins to UPDATE usuarios for members of their tenant
drop policy if exists usuarios_update_admin on public.usuarios;
create policy usuarios_update_admin on public.usuarios
  for update to authenticated
  using (
    id in (
      select mt.usuario_id
      from public.miembros_tenant mt
      where mt.tenant_id in (
        select admin_t.id from public.get_admin_tenants_for_authenticated_user() admin_t
      )
    )
  )
  with check (
    id in (
      select mt.usuario_id
      from public.miembros_tenant mt
      where mt.tenant_id in (
        select admin_t.id from public.get_admin_tenants_for_authenticated_user() admin_t
      )
    )
  );

-- 2. Allow admins to DELETE miembros_tenant rows for their tenant
grant delete on table public.miembros_tenant to authenticated;

drop policy if exists miembros_tenant_delete_admin on public.miembros_tenant;
create policy miembros_tenant_delete_admin on public.miembros_tenant
  for delete to authenticated
  using (
    tenant_id in (
      select admin_t.id from public.get_admin_tenants_for_authenticated_user() admin_t
    )
  );

commit;
