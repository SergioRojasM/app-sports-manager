-- =============================================
-- Migration: Athlete own-record SELECT policy for public.asistencias
-- US-0024: Validate Training Attendance (read-only view for athletes)
-- =============================================
-- Allows athletes to SELECT their own asistencia records
-- (linked via reservas.atleta_id = auth.uid()).
-- The existing trainer/admin policy remains; both are PERMISSIVE and
-- evaluated with OR semantics, so either grants access.

begin;

drop policy if exists asistencias_select_own_atleta on public.asistencias;
create policy asistencias_select_own_atleta on public.asistencias
  for select to authenticated
  using (
    exists (
      select 1 from public.reservas r
      where r.id = asistencias.reserva_id
        and r.atleta_id = auth.uid()
        and r.tenant_id = asistencias.tenant_id
    )
  );

commit;
