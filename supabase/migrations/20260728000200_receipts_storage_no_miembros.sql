-- ============================================================
-- US-0093 (follow-up): payment-proof storage for non-member buyers
--
-- `athlete_upload_own_receipts` (20260324000100) required an ACTIVE
-- membership in the tenant, which was correct while only members could
-- subscribe. Public plans let a non-member buy — and that buyer has no
-- `miembros_tenant` row at all, so uploading their payment proof failed
-- with "new row violates row-level security policy".
--
-- Also fixes a PRE-EXISTING gap surfaced while validating this: there was
-- no UPDATE policy for athletes on storage.objects (only `org_admin_update`),
-- so re-uploading a receipt — which `storageService.uploadPaymentProof`
-- performs with `upsert: true` — failed for EVERY athlete, member or not.
--
-- Access rule for a receipt path (orgs/{tenant}/users/{user}/receipts/...):
--   the object is in the caller's OWN user folder, AND the caller is either
--   an active member of that tenant OR holds a subscription in it.
-- The subquery on public.suscripciones runs under its own RLS
-- (`suscripciones_select_own`), so it can only ever match the caller's rows.
-- ============================================================

begin;

-- ─────────────────────────────────────────────
-- 1. INSERT — first upload of a payment proof
-- ─────────────────────────────────────────────
drop policy if exists athlete_upload_own_receipts on storage.objects;
create policy athlete_upload_own_receipts on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[4] = auth.uid()::text
    and (storage.foldername(name))[5] = 'receipts'
    and (
      exists (
        select 1
        from public.miembros_tenant mt
        where mt.usuario_id = auth.uid()
          and mt.tenant_id = ((storage.foldername(name))[2])::uuid
          and mt.estado = 'activo'
      )
      or exists (
        select 1
        from public.suscripciones s
        where s.atleta_id = auth.uid()
          and s.tenant_id = ((storage.foldername(name))[2])::uuid
      )
    )
  );

-- ─────────────────────────────────────────────
-- 2. UPDATE — re-upload replaces the object at the same path (upsert)
-- ─────────────────────────────────────────────
drop policy if exists athlete_update_own_receipts on storage.objects;
create policy athlete_update_own_receipts on storage.objects
  for update to authenticated
  using (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[4] = auth.uid()::text
    and (storage.foldername(name))[5] = 'receipts'
    and (
      exists (
        select 1
        from public.miembros_tenant mt
        where mt.usuario_id = auth.uid()
          and mt.tenant_id = ((storage.foldername(name))[2])::uuid
          and mt.estado = 'activo'
      )
      or exists (
        select 1
        from public.suscripciones s
        where s.atleta_id = auth.uid()
          and s.tenant_id = ((storage.foldername(name))[2])::uuid
      )
    )
  )
  with check (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[4] = auth.uid()::text
    and (storage.foldername(name))[5] = 'receipts'
  );

-- ─────────────────────────────────────────────
-- 3. SELECT — a user can always read back their own uploads
--
-- `org_member_read` covers active members of the tenant (so an administrator
-- still reads a buyer's receipt to validate the payment), but not a
-- non-member buyer reading their own comprobante in "Mis Suscripciones".
-- Scoped to the caller's own user folder, so it grants nothing else.
-- ─────────────────────────────────────────────
drop policy if exists user_read_own_files on storage.objects;
create policy user_read_own_files on storage.objects
  for select to authenticated
  using (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[4] = auth.uid()::text
  );

commit;
