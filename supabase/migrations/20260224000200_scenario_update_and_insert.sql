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
-- horarios_escenarios
drop policy if exists horarios_escenarios_update_admin_only on public.horarios_escenarios;
create policy horarios_escenarios_update_admin_only on public.horarios_escenarios
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

drop policy if exists horarios_escenarios_insert_admin_only on public.horarios_escenarios;
create policy horarios_escenarios_insert_admin_only on public.horarios_escenarios
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

drop policy if exists horarios_escenarios_delete_admin_only on public.horarios_escenarios;
create policy horarios_escenarios_delete_admin_only on public.horarios_escenarios
  for delete to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

commit;
