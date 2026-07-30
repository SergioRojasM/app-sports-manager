-- =============================================
-- Migration: Sync entrenamientos.visibilidad from entrenamientos_publicos.activo
-- US-0092: publishing a training to the marketplace never flipped the source
-- training's visibilidad to 'publico', leaving it unreadable/unbookable for
-- non-member visitors under the existing membership-gated RLS. This migration:
--   1. Adds a trigger that keeps visibilidad/visible_para in sync with activo.
--   2. Backfills already-published trainings that are stuck broken today.
--   3. Widens the RLS policies the existing booking pipeline reads directly
--      (entrenamiento_categorias, entrenamiento_restricciones, reservas) with
--      an additive branch for public trainings, mirroring the pattern already
--      used by entrenamientos_select_authenticated (US-0013).
-- =============================================

begin;

-- 1. Keep entrenamientos.visibilidad/visible_para in sync with entrenamientos_publicos.activo,
--    so the existing booking pipeline (which reads the SOURCE entrenamientos row directly, not
--    just entrenamientos_publicos) actually becomes visible/bookable cross-tenant once published.
create or replace function public.sync_entrenamiento_visibilidad_on_publicacion()
returns trigger
language plpgsql
as $$
begin
  if new.activo then
    update public.entrenamientos
       set visibilidad = 'publico',
           visible_para = '2a089688-3cfc-4216-9372-33f50079fbd1'
     where id = new.entrenamiento_id
       and visibilidad is distinct from 'publico';
  else
    update public.entrenamientos
       set visibilidad = 'privado',
           visible_para = new.tenant_id
     where id = new.entrenamiento_id
       and visibilidad = 'publico';
  end if;

  return new;
end;
$$;

drop trigger if exists entrenamientos_publicos_sync_visibilidad on public.entrenamientos_publicos;
create trigger entrenamientos_publicos_sync_visibilidad
  after insert or update on public.entrenamientos_publicos
  for each row execute function public.sync_entrenamiento_visibilidad_on_publicacion();

-- 2. Backfill: fix trainings that were already published before this migration existed.
update public.entrenamientos e
   set visibilidad = 'publico',
       visible_para = '2a089688-3cfc-4216-9372-33f50079fbd1'
  from public.entrenamientos_publicos ep
 where ep.entrenamiento_id = e.id
   and ep.activo = true
   and e.visibilidad is distinct from 'publico';

-- 3. Extend RLS so the rest of the booking pipeline can read what it needs for a public training.

drop policy if exists entrenamiento_categorias_select_authenticated on public.entrenamiento_categorias;
create policy entrenamiento_categorias_select_authenticated on public.entrenamiento_categorias
  for select to authenticated
  using (
    exists (
      select 1
      from public.entrenamientos e
      join public.miembros_tenant mt on mt.tenant_id = e.tenant_id
      where e.id = entrenamiento_categorias.entrenamiento_id
        and mt.usuario_id = auth.uid()
    )
    or exists (
      select 1 from public.entrenamientos e
      where e.id = entrenamiento_categorias.entrenamiento_id
        and e.visibilidad = 'publico'
    )
  );

drop policy if exists ent_restricciones_select_authenticated on public.entrenamiento_restricciones;
create policy ent_restricciones_select_authenticated on public.entrenamiento_restricciones
  for select to authenticated
  using (
    exists (
      select 1 from public.miembros_tenant mt
      where mt.tenant_id = entrenamiento_restricciones.tenant_id
        and mt.usuario_id = auth.uid()
    )
    or exists (
      select 1 from public.entrenamientos e
      where e.id = entrenamiento_restricciones.entrenamiento_id
        and e.visibilidad = 'publico'
    )
  );

drop policy if exists reservas_select_authenticated on public.reservas;
create policy reservas_select_authenticated on public.reservas
  for select to authenticated
  using (
    exists (
      select 1 from public.miembros_tenant mt
      where mt.tenant_id = reservas.tenant_id
        and mt.usuario_id = auth.uid()
    )
    or exists (
      select 1 from public.entrenamientos e
      where e.id = reservas.entrenamiento_id
        and e.visibilidad = 'publico'
    )
  );

drop policy if exists reservas_insert_authenticated on public.reservas;
create policy reservas_insert_authenticated on public.reservas
  for insert to authenticated
  with check (
    (
      exists (
        select 1 from public.miembros_tenant mt
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

-- 4. Storage RLS for form-response image uploads on a published training: the athlete
--    upload/read-back policies were membership-gated with no public-training branch,
--    so a non-member visitor's image field upload failed before it ever reached the
--    formulario_respuestas insert (which is otherwise fine — SECURITY DEFINER RPC).

drop policy if exists athlete_upload_own_formulario_respuestas on storage.objects;
create policy athlete_upload_own_formulario_respuestas on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[4] = auth.uid()::text
    and (storage.foldername(name))[5] = 'formularios'
    and (
      exists (
        select 1 from public.miembros_tenant mt
        where mt.usuario_id = auth.uid()
          and mt.tenant_id = ((storage.foldername(name))[2])::uuid
          and mt.estado = 'activo'
      )
      or exists (
        select 1 from public.entrenamientos e
        where e.tenant_id = ((storage.foldername(name))[2])::uuid
          and e.formulario_id = ((storage.foldername(name))[6])::uuid
          and e.visibilidad = 'publico'
      )
    )
  );

-- New, narrowly-scoped SELECT policy (not a widening of org_member_read, which covers
-- every org-assets path — banners, logos, receipts — and would leak unrelated tenant
-- assets to any authenticated user). Scoped to the caller's own uploaded file under a
-- published training's formulario path; the publishing tenant's members already read
-- this same file via the pre-existing, unmodified org_member_read policy.
drop policy if exists public_training_formulario_respuesta_read on storage.objects;
create policy public_training_formulario_respuesta_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[4] = auth.uid()::text
    and (storage.foldername(name))[5] = 'formularios'
    and exists (
      select 1 from public.entrenamientos e
      where e.tenant_id = ((storage.foldername(name))[2])::uuid
        and e.formulario_id = ((storage.foldername(name))[6])::uuid
        and e.visibilidad = 'publico'
    )
  );

commit;
