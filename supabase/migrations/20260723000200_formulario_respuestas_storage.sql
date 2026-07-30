-- =============================================
-- Migration: Storage policies for form-response image uploads
-- US-0087: reuse the existing org-assets bucket, new "formularios" path segment
-- =============================================

-- Athlete: upload an image for their own form response
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

-- Staff (administrador/entrenador): upload an image on behalf of an athlete they're booking for
drop policy if exists staff_upload_formulario_respuestas_on_behalf on storage.objects;
create policy staff_upload_formulario_respuestas_on_behalf on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[5] = 'formularios'
    and exists (
      select 1
      from public.miembros_tenant mt
      join public.roles r on r.id = mt.rol_id
      where mt.usuario_id = auth.uid()
        and mt.tenant_id = ((storage.foldername(name))[2])::uuid
        and mt.estado = 'activo'
        and lower(r.nombre) in ('administrador', 'entrenador')
    )
  );

-- No new SELECT policy needed: the existing org_member_read policy
-- (20260324000100_create_org_assets_bucket.sql) already lets any active member of the
-- tenant read any file under orgs/{tenantId}/..., which covers this new path too.
