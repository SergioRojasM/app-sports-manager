-- =============================================
-- Migration: blocked_access_request_control
-- US-0026: Blocked Access Request Control
-- =============================================
-- 1. Add max_solicitudes column to tenants
-- 2. Create miembros_tenant_bloqueados table
-- 3. Indexes and RLS policies

begin;

-- ─── 1. Add max_solicitudes to tenants ───

alter table public.tenants
  add column if not exists max_solicitudes smallint not null default 2
  constraint tenants_max_solicitudes_ck check (max_solicitudes >= 1 and max_solicitudes <= 10);

-- ─── 2. Create miembros_tenant_bloqueados table ───

create table if not exists public.miembros_tenant_bloqueados (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null,
  usuario_id      uuid not null,
  bloqueado_por   uuid,
  bloqueado_at    timestamptz not null default timezone('utc', now()),
  motivo          text,
  created_at      timestamptz not null default timezone('utc', now()),

  constraint miembros_tenant_bloqueados_tenant_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint miembros_tenant_bloqueados_usuario_fkey
    foreign key (usuario_id) references public.usuarios(id) on delete cascade,
  constraint miembros_tenant_bloqueados_bloqueado_por_fkey
    foreign key (bloqueado_por) references public.usuarios(id) on delete set null,
  constraint miembros_tenant_bloqueados_tenant_usuario_uk
    unique (tenant_id, usuario_id)
);

-- ─── 3. Indexes ───

create index if not exists idx_bloqueados_tenant
  on public.miembros_tenant_bloqueados (tenant_id);

create index if not exists idx_bloqueados_usuario_tenant
  on public.miembros_tenant_bloqueados (usuario_id, tenant_id);

-- ─── 4. RLS ───

alter table public.miembros_tenant_bloqueados enable row level security;

grant select, insert, delete on public.miembros_tenant_bloqueados to authenticated;

-- SELECT (own): user can read their own block records
drop policy if exists bloqueados_select_own on public.miembros_tenant_bloqueados;
create policy bloqueados_select_own on public.miembros_tenant_bloqueados
  for select to authenticated
  using (
    usuario_id = auth.uid()
  );

-- SELECT (admin): admin can read all block records for their tenants
drop policy if exists bloqueados_select_admin on public.miembros_tenant_bloqueados;
create policy bloqueados_select_admin on public.miembros_tenant_bloqueados
  for select to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- INSERT (admin): admin can insert block records for their tenants
drop policy if exists bloqueados_insert_admin on public.miembros_tenant_bloqueados;
create policy bloqueados_insert_admin on public.miembros_tenant_bloqueados
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- DELETE (admin): admin can delete (unblock) block records for their tenants
drop policy if exists bloqueados_delete_admin on public.miembros_tenant_bloqueados;
create policy bloqueados_delete_admin on public.miembros_tenant_bloqueados
  for delete to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

commit;
