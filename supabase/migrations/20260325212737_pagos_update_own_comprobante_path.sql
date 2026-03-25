-- ============================================================
-- Allow athletes to UPDATE comprobante_path on their own pagos
-- (pagos linked to suscripciones where atleta_id = auth.uid())
-- ============================================================

drop policy if exists pagos_update_own on public.pagos;
create policy pagos_update_own on public.pagos
  for update to authenticated
  using (
    suscripcion_id in (
      select s.id from public.suscripciones s
      where s.atleta_id = auth.uid()
    )
  )
  with check (
    suscripcion_id in (
      select s.id from public.suscripciones s
      where s.atleta_id = auth.uid()
    )
  );
