-- =============================================
-- Migration: tenants.publico
-- US-0133: Tenant public visibility in the organizations marketplace
-- =============================================
-- 1. Add publico column to tenants
-- 2. Access requests can only target public organizations

begin;

-- ─── 1. Visibility flag. Existing tenants stay listed (no behavior change) ───

alter table public.tenants
  add column if not exists publico boolean not null default true;

comment on column public.tenants.publico is
  'US-0133: when false the organization is hidden from the organizations marketplace for non-members and cannot receive access requests.';

-- ─── 2. INSERT: user may only request access to public organizations ───

drop policy if exists solicitudes_insert_own on public.miembros_tenant_solicitudes;
create policy solicitudes_insert_own on public.miembros_tenant_solicitudes
  for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and exists (
      select 1
      from public.tenants t
      where t.id = tenant_id
        and t.publico
    )
  );

commit;
