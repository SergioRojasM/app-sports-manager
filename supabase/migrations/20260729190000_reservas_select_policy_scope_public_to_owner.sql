-- =============================================
-- Migration: Scope the public-training branch of reservas_select_authenticated
-- to the caller's own booking (US-0097)
--
-- The public-training branch introduced in 20260727010000 had no atleta_id
-- check, so any authenticated user could read ANY athlete's reservation on
-- ANY published public training. This closes that gap: non-members of the
-- hosting tenant may only read their own bookings on public trainings.
-- Tenant staff are unaffected (still covered by the membership branch).
-- =============================================

begin;

drop policy if exists reservas_select_authenticated on public.reservas;
create policy reservas_select_authenticated on public.reservas
  for select to authenticated
  using (
    exists (
      select 1 from public.miembros_tenant mt
      where mt.tenant_id = reservas.tenant_id
        and mt.usuario_id = auth.uid()
    )
    or (
      atleta_id = auth.uid()
      and exists (
        select 1 from public.entrenamientos e
        where e.id = reservas.entrenamiento_id
          and e.visibilidad = 'publico'
      )
    )
  );

commit;
