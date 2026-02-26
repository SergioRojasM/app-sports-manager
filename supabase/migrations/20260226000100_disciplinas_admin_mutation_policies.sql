begin;

drop policy if exists disciplinas_update_admin_only on public.disciplinas;
create policy disciplinas_update_admin_only on public.disciplinas
  for update to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  )
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

drop policy if exists disciplinas_insert_admin_only on public.disciplinas;
create policy disciplinas_insert_admin_only on public.disciplinas
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

drop policy if exists disciplinas_delete_admin_only on public.disciplinas;
create policy disciplinas_delete_admin_only on public.disciplinas
  for delete to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

commit;