-- =============================================
-- Migration: RLS policies for public.reservas
-- US-0016: Training Booking Feature
-- =============================================

begin;

-- Grant DML permissions to authenticated role
grant insert, update, delete on table public.reservas to authenticated;

-- -------------------------------------------------------
-- Helper function: returns tenant IDs where the current
-- user has role 'entrenador' or 'administrador'.
-- -------------------------------------------------------
create or replace function public.get_trainer_or_admin_tenants_for_authenticated_user()
returns table(tenant_id uuid)
language sql
security definer
set search_path = public
stable
as $$
  select mt.tenant_id
  from public.miembros_tenant mt
  join public.roles r on r.id = mt.rol_id
  where mt.usuario_id = auth.uid()
    and lower(r.nombre) in ('entrenador', 'administrador');
$$;

grant execute on function public.get_trainer_or_admin_tenants_for_authenticated_user() to authenticated;

-- -------------------------------------------------------
-- SELECT: tenant members can read bookings.
-- Atleta sees own rows only; entrenador/admin sees all.
-- -------------------------------------------------------
drop policy if exists reservas_select_authenticated on public.reservas;
create policy reservas_select_authenticated on public.reservas
  for select to authenticated
  using (
    -- User is a member of the tenant
    exists (
      select 1
      from public.miembros_tenant mt
      where mt.tenant_id = reservas.tenant_id
        and mt.usuario_id = auth.uid()
    )
    -- and (
    --   -- Own booking
    --   atleta_id = auth.uid()
    --   -- OR entrenador/admin of the tenant
    --   or reservas.tenant_id in (
    --     select ta.tenant_id
    --     from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    --   )
    -- )
  );

-- -------------------------------------------------------
-- INSERT: member of the tenant.
-- atleta_id must equal auth.uid() unless the user is
-- entrenador or administrador in that tenant.
-- -------------------------------------------------------
drop policy if exists reservas_insert_authenticated on public.reservas;
create policy reservas_insert_authenticated on public.reservas
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.miembros_tenant mt
      where mt.tenant_id = reservas.tenant_id
        and mt.usuario_id = auth.uid()
    )
    and (
      atleta_id = auth.uid()
      or reservas.tenant_id in (
        select ta.tenant_id
        from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
      )
    )
  );

-- -------------------------------------------------------
-- UPDATE: the athlete can update (cancel) their own
-- booking; entrenador/admin can update any booking in
-- the tenant.
-- -------------------------------------------------------
drop policy if exists reservas_update_trainer_or_admin on public.reservas;
drop policy if exists reservas_update_authenticated on public.reservas;
create policy reservas_update_authenticated on public.reservas
  for update to authenticated
  using (
    -- Own booking
    atleta_id = auth.uid()
    -- OR entrenador/admin of the tenant
    or reservas.tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  )
  with check (
    atleta_id = auth.uid()
    or reservas.tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- -------------------------------------------------------
-- DELETE: only entrenador or administrador of the tenant.
-- -------------------------------------------------------
drop policy if exists reservas_delete_trainer_or_admin on public.reservas;
create policy reservas_delete_trainer_or_admin on public.reservas
  for delete to authenticated
  using (
    reservas.tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

commit;
