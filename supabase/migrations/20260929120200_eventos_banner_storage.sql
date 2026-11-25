-- =============================================
-- Migration: event banner read policy (US-0119)
-- Path: org-assets/orgs/{tenantId}/eventos/{eventoId}.{ext}
-- Upload/update are already covered by the org_admin_* policies (any path under orgs/{tenantId}/).
-- Mirrors public_training_banner_read: any authenticated user may read event banners.
-- =============================================

begin;

create policy event_banner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'eventos'
  );

commit;
