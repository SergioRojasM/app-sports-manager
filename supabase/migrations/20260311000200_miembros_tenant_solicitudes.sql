-- =============================================
-- Migration: miembros_tenant_solicitudes table
-- US-0025: Organization Access Request Flow
-- =============================================
-- New table for access request tracking with partial unique index,
-- RLS policies, and admin-scoped select/update.

begin;

-- ─── Table DDL ───

create table if not exists public.miembros_tenant_solicitudes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  usuario_id uuid not null,
  estado text not null default 'pendiente',
  mensaje text,
  nota_revision text,
  rol_solicitado_id uuid,
  revisado_por uuid,
  revisado_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint miembros_tenant_solicitudes_estado_ck
    check (estado in ('pendiente', 'aceptada', 'rechazada')),
  constraint miembros_tenant_solicitudes_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint miembros_tenant_solicitudes_usuario_id_fkey
    foreign key (usuario_id) references public.usuarios(id) on delete cascade,
  constraint miembros_tenant_solicitudes_revisado_por_fkey
    foreign key (revisado_por) references public.usuarios(id) on delete set null
);

-- ─── Partial unique index: only one pendiente row per (tenant, user) ───

create unique index miembros_tenant_solicitudes_pendiente_uk
  on public.miembros_tenant_solicitudes (tenant_id, usuario_id)
  where estado = 'pendiente';

-- ─── Composite indexes ───

create index idx_solicitudes_tenant_estado
  on public.miembros_tenant_solicitudes (tenant_id, estado);

create index idx_solicitudes_usuario_tenant
  on public.miembros_tenant_solicitudes (usuario_id, tenant_id);

create index idx_solicitudes_usuario_tenant_created
  on public.miembros_tenant_solicitudes (usuario_id, tenant_id, created_at desc);

-- ─── RLS ───

alter table public.miembros_tenant_solicitudes enable row level security;

-- Grant permissions
grant select, insert, update on public.miembros_tenant_solicitudes to authenticated;

-- INSERT: user may only insert their own requests
drop policy if exists solicitudes_insert_own on public.miembros_tenant_solicitudes;
create policy solicitudes_insert_own on public.miembros_tenant_solicitudes
  for insert to authenticated
  with check (
    usuario_id = auth.uid()
  );

-- SELECT (own): user may read their own requests
drop policy if exists solicitudes_select_own on public.miembros_tenant_solicitudes;
create policy solicitudes_select_own on public.miembros_tenant_solicitudes
  for select to authenticated
  using (
    usuario_id = auth.uid()
  );

-- SELECT (admin): admin may read all requests for their tenant
drop policy if exists solicitudes_select_admin on public.miembros_tenant_solicitudes;
create policy solicitudes_select_admin on public.miembros_tenant_solicitudes
  for select to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- UPDATE (admin): admin may update estado, revisado_por, revisado_at, nota_revision
drop policy if exists solicitudes_update_admin on public.miembros_tenant_solicitudes;
create policy solicitudes_update_admin on public.miembros_tenant_solicitudes
  for update to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  )
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- ─── miembros_tenant: INSERT policy for admins (needed when accepting solicitudes) ───
drop policy if exists miembros_tenant_insert_admin on public.miembros_tenant;
create policy miembros_tenant_insert_admin on public.miembros_tenant
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

commit;
