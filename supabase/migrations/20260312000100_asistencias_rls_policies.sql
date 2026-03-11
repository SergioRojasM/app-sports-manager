-- =============================================
-- Migration: RLS policies for public.asistencias
-- US-0024: Validate Training Attendance
-- =============================================
-- Depends on: get_trainer_or_admin_tenants_for_authenticated_user()
-- introduced in 20260302000200_reservas_rls_policies.sql

begin;

-- Grant DML permissions to authenticated role
grant select, insert, update, delete on table public.asistencias to authenticated;

-- -------------------------------------------------------
-- SELECT: only admins and coaches of the tenant can read.
-- Athletes are explicitly excluded.
-- -------------------------------------------------------
drop policy if exists asistencias_select_trainer_or_admin on public.asistencias;
create policy asistencias_select_trainer_or_admin on public.asistencias
  for select to authenticated
  using (
    asistencias.tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- -------------------------------------------------------
-- INSERT: only admins and coaches of the tenant.
-- validado_por must equal auth.uid().
-- -------------------------------------------------------
drop policy if exists asistencias_insert_trainer_or_admin on public.asistencias;
create policy asistencias_insert_trainer_or_admin on public.asistencias
  for insert to authenticated
  with check (
    asistencias.tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
    and validado_por = auth.uid()
  );

-- -------------------------------------------------------
-- UPDATE: only admins and coaches of the tenant.
-- -------------------------------------------------------
drop policy if exists asistencias_update_trainer_or_admin on public.asistencias;
create policy asistencias_update_trainer_or_admin on public.asistencias
  for update to authenticated
  using (
    asistencias.tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  )
  with check (
    asistencias.tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- -------------------------------------------------------
-- DELETE: only admins and coaches of the tenant.
-- -------------------------------------------------------
drop policy if exists asistencias_delete_trainer_or_admin on public.asistencias;
create policy asistencias_delete_trainer_or_admin on public.asistencias
  for delete to authenticated
  using (
    asistencias.tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

commit;
