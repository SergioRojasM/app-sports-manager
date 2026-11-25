-- US-0114 security foundation.
-- miembros_tenant_select_authenticated was USING (true): any authenticated user could
-- enumerate every membership of every tenant. Scope reads to the caller's own rows and,
-- for trainers/administrators, to members of the tenants they operate.
-- v_miembros_equipo ran with its owner's privileges (bypassing RLS entirely); make it
-- security_invoker so the base-table policies apply to whoever queries it.

begin;

drop policy if exists miembros_tenant_select_authenticated on public.miembros_tenant;
drop policy if exists miembros_tenant_select_scoped on public.miembros_tenant;

create policy miembros_tenant_select_scoped
  on public.miembros_tenant
  for select
  to authenticated
  using (
    usuario_id = auth.uid()
    or tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

alter view public.v_miembros_equipo set (security_invoker = true);

commit;
