-- ============================================================
-- US-0060: Admin create subscription — INSERT RLS policies
-- Allows tenant admins to insert suscripciones and pagos
-- on behalf of any athlete in their tenant.
-- ============================================================

-- 1. Grant INSERT privilege (already granted for self-insert; idempotent re-grant)
grant insert on public.suscripciones to authenticated;
grant insert on public.pagos to authenticated;

-- 2. suscripciones — admin INSERT policy
drop policy if exists suscripciones_insert_admin on public.suscripciones;
create policy suscripciones_insert_admin on public.suscripciones
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- 3. pagos — admin INSERT policy
drop policy if exists pagos_insert_admin on public.pagos;
create policy pagos_insert_admin on public.pagos
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );
