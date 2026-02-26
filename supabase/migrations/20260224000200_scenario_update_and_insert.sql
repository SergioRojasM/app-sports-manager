begin;

drop policy if exists scenarios_update_admin_only on public.escenarios;
create policy scenarios_update_admin_only on public.escenarios
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

drop policy if exists scenarios_insert_admin_only on public.escenarios;
create policy scenarios_insert_admin_only on public.escenarios
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

drop policy if exists scenarios_delete_admin_only on public.escenarios;
create policy scenarios_delete_admin_only on public.escenarios
  for delete to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

commit;
