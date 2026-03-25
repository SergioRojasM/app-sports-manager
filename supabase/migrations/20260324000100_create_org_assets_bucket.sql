-- Migration: Create org-assets bucket with RLS policies and initOrgFolders trigger
-- Related: US-0041 — Supabase Object Storage Integration

begin;

-- ─────────────────────────────────────────────
-- 1. Create private bucket
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-assets',
  'org-assets',
  false,
  10485760, -- 10 MiB
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- 2. RLS policies on storage.objects
-- ─────────────────────────────────────────────

-- 2a. INSERT — org admin can upload files under their org path
drop policy if exists org_admin_upload on storage.objects;
create policy org_admin_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and exists (
      select 1
      from public.miembros_tenant mt
      join public.roles r on r.id = mt.rol_id
      where mt.usuario_id = auth.uid()
        and mt.tenant_id = ((storage.foldername(name))[2])::uuid
        and mt.estado = 'activo'
        and lower(r.nombre) = 'administrador'
    )
  );

-- 2b. UPDATE — org admin can update (required for upsert)
drop policy if exists org_admin_update on storage.objects;
create policy org_admin_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and exists (
      select 1
      from public.miembros_tenant mt
      join public.roles r on r.id = mt.rol_id
      where mt.usuario_id = auth.uid()
        and mt.tenant_id = ((storage.foldername(name))[2])::uuid
        and mt.estado = 'activo'
        and lower(r.nombre) = 'administrador'
    )
  );

-- 2c. DELETE — org admin can delete files under their org path
drop policy if exists org_admin_delete on storage.objects;
create policy org_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and exists (
      select 1
      from public.miembros_tenant mt
      join public.roles r on r.id = mt.rol_id
      where mt.usuario_id = auth.uid()
        and mt.tenant_id = ((storage.foldername(name))[2])::uuid
        and mt.estado = 'activo'
        and lower(r.nombre) = 'administrador'
    )
  );

-- 2d. SELECT — any active org member can read files under their org path
drop policy if exists org_member_read on storage.objects;
create policy org_member_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and exists (
      select 1
      from public.miembros_tenant mt
      where mt.usuario_id = auth.uid()
        and mt.tenant_id = ((storage.foldername(name))[2])::uuid
        and mt.estado = 'activo'
    )
  );

-- 2e. INSERT — athlete can upload receipts to their own user path
drop policy if exists athlete_upload_own_receipts on storage.objects;
create policy athlete_upload_own_receipts on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[4] = auth.uid()::text
    and (storage.foldername(name))[5] = 'receipts'
    and exists (
      select 1
      from public.miembros_tenant mt
      where mt.usuario_id = auth.uid()
        and mt.tenant_id = ((storage.foldername(name))[2])::uuid
        and mt.estado = 'activo'
    )
  );

-- ─────────────────────────────────────────────
-- 3. initOrgFolders — Postgres function + trigger
--    Creates placeholder .keep files when a tenant is created.
--    Uses service_role via supabase_admin for storage insert.
-- ─────────────────────────────────────────────
create or replace function public.init_org_folders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert placeholder objects to initialize folder structure
  -- Using direct insert into storage.objects to avoid HTTP dependency
  insert into storage.objects (bucket_id, name, owner, metadata)
  values
    ('org-assets', 'orgs/' || new.id || '/brand/.keep', null, '{}'),
    ('org-assets', 'orgs/' || new.id || '/users/.keep', null, '{}')
  on conflict do nothing;

  return new;
end;
$$;

-- Trigger on tenants INSERT
drop trigger if exists trg_init_org_folders on public.tenants;
create trigger trg_init_org_folders
  after insert on public.tenants
  for each row
  execute function public.init_org_folders();

commit;
