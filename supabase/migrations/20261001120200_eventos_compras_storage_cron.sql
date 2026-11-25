-- =============================================
-- Migration: Team events phase 4 (US-0121) — purchase files + expiry cron
-- Files: org-assets/compras-eventos/{tenantId}/{compraId}/{kind}-{ts}.{ext}
-- Deliberately OUTSIDE orgs/ so org_member_read / event_banner_read never expose them.
-- Write-once: no update/delete policies; re-uploads use new file names.
-- =============================================

begin;

-- 1. Helpers. They take the raw folder segments as text and cast safely, so a malformed
--    path can never raise inside a policy expression evaluated for other paths.

-- Upload allowed: a fresh guest (or own) pending purchase, or the buyer re-uploading a rejected one.
create or replace function public.evento_compra_acepta_archivo(p_tenant text, p_compra text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if p_tenant is null or p_compra is null or p_tenant !~ c_uuid or p_compra !~ c_uuid then
    return false;
  end if;

  return exists (
    select 1
      from evento_compras c
     where c.id = p_compra::uuid
       and c.tenant_id = p_tenant::uuid
       and (
         (c.estado = 'pendiente_pago'
          and c.created_at > now() - interval '30 minutes'
          and (c.comprador_usuario_id is null or c.comprador_usuario_id = auth.uid()))
         or (c.estado = 'rechazada' and auth.uid() is not null and c.comprador_usuario_id = auth.uid())
       )
  );
end;
$$;

-- Read allowed: tenant admins/trainers, or the buyer.
create or replace function public.evento_compra_archivo_legible(p_tenant text, p_compra text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if auth.uid() is null or p_tenant is null or p_compra is null or p_tenant !~ c_uuid or p_compra !~ c_uuid then
    return false;
  end if;

  return exists (
    select 1
      from evento_compras c
     where c.id = p_compra::uuid
       and c.tenant_id = p_tenant::uuid
       and (
         c.comprador_usuario_id = auth.uid()
         or c.tenant_id in (select t.tenant_id from get_trainer_or_admin_tenants_for_authenticated_user() t)
       )
  );
end;
$$;

revoke all on function public.evento_compra_acepta_archivo(text, text) from public;
revoke all on function public.evento_compra_archivo_legible(text, text) from public;
grant execute on function public.evento_compra_acepta_archivo(text, text) to anon, authenticated;
grant execute on function public.evento_compra_archivo_legible(text, text) to authenticated;

-- 2. Storage policies
create policy evento_compra_upload on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'compras-eventos'
    and public.evento_compra_acepta_archivo((storage.foldername(name))[2], (storage.foldername(name))[3])
  );

create policy evento_compra_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'compras-eventos'
    and public.evento_compra_archivo_legible((storage.foldername(name))[2], (storage.foldername(name))[3])
  );

-- 3. Cron: expire 30-min holds every 5 minutes (re-runnable)
select cron.unschedule(jobid) from cron.job where jobname = 'expirar-compras-eventos';

select cron.schedule(
  'expirar-compras-eventos',
  '*/5 * * * *',
  $$select public.expirar_compras_evento_pendientes();$$
);

commit;
