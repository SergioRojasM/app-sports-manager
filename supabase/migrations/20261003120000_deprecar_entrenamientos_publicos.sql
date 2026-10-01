-- =============================================
-- Migration: Deprecate the public trainings marketplace (US-0123)
--
-- The events module replaced public trainings; trainings are now internal
-- to the organization. This migration unpublishes everything and closes the
-- cross-tenant access the marketplace needed. It deletes no rows and drops
-- no tables or columns (that is US-0124), so BI keeps its history.
--
-- Non-members keep read access to their own existing bookings, the trainings
-- those bookings point to, and the form files they already uploaded.
-- =============================================

begin;

-- ─────────────────────────────────────────────
-- 1. Unpublish everything
--
-- The membership-restriction trigger raises when a publication's training
-- restrictions were changed after publishing; it must not block deactivation.
-- The sync trigger returns each training to 'privado'.
-- ─────────────────────────────────────────────
alter table public.entrenamientos_publicos
  disable trigger entrenamientos_publicos_restricciones_membresia;

update public.entrenamientos_publicos
   set activo = false
 where activo;

alter table public.entrenamientos_publicos
  enable trigger entrenamientos_publicos_restricciones_membresia;

-- Safety net for any training the sync trigger did not cover.
update public.entrenamientos
   set visibilidad = 'privado',
       visible_para = tenant_id
 where visibilidad = 'publico';

-- ─────────────────────────────────────────────
-- 2. Close writes on entrenamientos_publicos and the public views
-- ─────────────────────────────────────────────
drop policy if exists entrenamientos_publicos_insert_admin on public.entrenamientos_publicos;
drop policy if exists entrenamientos_publicos_update_admin on public.entrenamientos_publicos;
drop policy if exists entrenamientos_publicos_delete_admin on public.entrenamientos_publicos;

revoke insert, update, delete on public.entrenamientos_publicos from anon, authenticated;

revoke all on public.entrenamientos_publicos_view from anon, authenticated;
revoke all on public.entrenamientos_publicos_servicios_view from anon, authenticated;

-- ─────────────────────────────────────────────
-- 3. Trainings and bookings: members only, plus the owner of a booking
-- ─────────────────────────────────────────────

-- Backs the "owns a booking on this training" lookup below.
create index if not exists idx_reservas_entrenamiento_atleta
  on public.reservas (entrenamiento_id, atleta_id);

-- reservas no longer reads entrenamientos, so the two policies cannot recurse.
drop policy if exists reservas_select_authenticated on public.reservas;
create policy reservas_select_authenticated
  on public.reservas for select to authenticated
  using (
    tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
    or atleta_id = auth.uid()
  );

drop policy if exists reservas_insert_authenticated on public.reservas;
create policy reservas_insert_authenticated
  on public.reservas for insert to authenticated
  with check (
    tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
    and (
      atleta_id = auth.uid()
      or tenant_id in (select ta.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() ta)
    )
  );

drop policy if exists entrenamientos_select_authenticated on public.entrenamientos;
create policy entrenamientos_select_authenticated
  on public.entrenamientos for select to authenticated
  using (
    tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
    or exists (
      select 1 from public.reservas r
      where r.entrenamiento_id = entrenamientos.id
        and r.atleta_id = auth.uid()
    )
  );

drop policy if exists entrenamiento_categorias_select_authenticated on public.entrenamiento_categorias;
create policy entrenamiento_categorias_select_authenticated
  on public.entrenamiento_categorias for select to authenticated
  using (
    exists (
      select 1 from public.entrenamientos e
      where e.id = entrenamiento_categorias.entrenamiento_id
        and e.tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
    )
  );

drop policy if exists ent_restricciones_select_authenticated on public.entrenamiento_restricciones;
create policy ent_restricciones_select_authenticated
  on public.entrenamiento_restricciones for select to authenticated
  using (
    tenant_id in (select mts.tenant_id from public.get_member_tenants_for_authenticated_user() mts)
  );

-- ─────────────────────────────────────────────
-- 4. servicios: drop the "required by a published training" branch (US-0094)
-- ─────────────────────────────────────────────
drop policy if exists servicios_select_authenticated on public.servicios;
create policy servicios_select_authenticated on public.servicios
  for select to authenticated
  using (
    -- member of the service's tenant
    tenant_id in (
      select mt.tenant_id
      from public.get_member_tenants_for_authenticated_user() mt
    )
    -- granted by a public, active plan (US-0093)
    or exists (
      select 1
      from public.plan_tipos_servicios pts
      join public.plan_tipos pt on pt.id = pts.plan_tipo_id
      join public.planes     p  on p.id  = pt.plan_id
      where pts.servicio_id = servicios.id
        and p.es_publico
        and p.activo
    )
    -- already holds units of it (US-0093)
    or exists (
      select 1
      from public.suscripcion_servicios ss
      join public.suscripciones su on su.id = ss.suscripcion_id
      where ss.servicio_id = servicios.id
        and su.atleta_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 5. Storage
-- ─────────────────────────────────────────────

-- Form-response uploads: active members only.
drop policy if exists athlete_upload_own_formulario_respuestas on storage.objects;
create policy athlete_upload_own_formulario_respuestas on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[4] = auth.uid()::text
    and (storage.foldername(name))[5] = 'formularios'
    and exists (
      select 1 from public.miembros_tenant mt
      where mt.usuario_id = auth.uid()
        and mt.tenant_id = ((storage.foldername(name))[2])::uuid
        and mt.estado = 'activo'
    )
  );

-- A non-member keeps reading the files they already uploaded under their own path.
drop policy if exists public_training_formulario_respuesta_read on storage.objects;
create policy public_training_formulario_respuesta_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[4] = auth.uid()::text
    and (storage.foldername(name))[5] = 'formularios'
  );

drop policy if exists public_training_banner_read on storage.objects;

commit;
