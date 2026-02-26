begin;

create or replace function public.get_admin_tenants_for_authenticated_user()
returns setof public.tenants
language sql
security definer
set search_path = public
stable
as $$
  select t.*
  from public.tenants t
  join public.miembros_tenant mt on mt.tenant_id = t.id
  join public.roles r on r.id = mt.rol_id
  where mt.usuario_id = auth.uid()
    and lower(r.nombre) = 'administrador';
$$;

grant execute on function public.get_admin_tenants_for_authenticated_user() to authenticated;
grant update on table public.tenants to authenticated;

drop policy if exists tenants_update_admin_only on public.tenants;
create policy tenants_update_admin_only on public.tenants
  for update to authenticated
  using (
    id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  )
  with check (
    id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

commit;
