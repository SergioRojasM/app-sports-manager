-- ============================================================
-- US-0020: Admin subscription management — RLS policies
-- Allows admin SELECT + UPDATE on suscripciones and pagos
-- ============================================================

-- 1. Ensure role-level privileges
grant select, update on public.suscripciones to authenticated;
grant select, update on public.pagos to authenticated;

-- 2. suscripciones — admin select
drop policy if exists suscripciones_select_admin on public.suscripciones;
create policy suscripciones_select_admin on public.suscripciones
  for select to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- 3. suscripciones — admin update
drop policy if exists suscripciones_update_admin on public.suscripciones;
create policy suscripciones_update_admin on public.suscripciones
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

-- 4. pagos — admin select
drop policy if exists pagos_select_admin on public.pagos;
create policy pagos_select_admin on public.pagos
  for select to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- 5. pagos — admin update
drop policy if exists pagos_update_admin on public.pagos;
create policy pagos_update_admin on public.pagos
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
