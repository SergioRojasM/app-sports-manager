-- ============================================================
-- Migration: tenant_metodos_pago
-- US-0028: Manage Payment Methods
-- ============================================================

-- 1. Create tenant_metodos_pago table
create table if not exists public.tenant_metodos_pago (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null,
  nombre        varchar(100) not null,
  tipo          varchar(50) not null,
  valor         varchar(255),
  url           varchar(500),
  comentarios   text,
  activo        boolean not null default true,
  orden         integer not null default 0,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  constraint tenant_metodos_pago_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint tenant_metodos_pago_tipo_ck
    check (tipo in ('transferencia', 'efectivo', 'tarjeta', 'pasarela', 'otro')),
  constraint tenant_metodos_pago_tenant_nombre_uk
    unique (tenant_id, nombre)
);

-- 2. Indexes
create index if not exists idx_tenant_metodos_pago_tenant_id
  on public.tenant_metodos_pago (tenant_id);

-- 3. Trigger: auto-update updated_at
drop trigger if exists tenant_metodos_pago_set_updated_at on public.tenant_metodos_pago;
create trigger tenant_metodos_pago_set_updated_at
  before update on public.tenant_metodos_pago
  for each row execute function public.set_updated_at();

-- 4. RLS
alter table public.tenant_metodos_pago enable row level security;

grant select, insert, update, delete on table public.tenant_metodos_pago to authenticated;

-- SELECT: any authenticated user (consistent with planes, disciplinas pattern)
drop policy if exists tenant_metodos_pago_select_member on public.tenant_metodos_pago;
create policy tenant_metodos_pago_select_member on public.tenant_metodos_pago
  for select to authenticated
  using (true);

-- INSERT: admin only
drop policy if exists tenant_metodos_pago_insert_admin on public.tenant_metodos_pago;
create policy tenant_metodos_pago_insert_admin on public.tenant_metodos_pago
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- UPDATE: admin only
drop policy if exists tenant_metodos_pago_update_admin on public.tenant_metodos_pago;
create policy tenant_metodos_pago_update_admin on public.tenant_metodos_pago
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

-- DELETE: admin only
drop policy if exists tenant_metodos_pago_delete_admin on public.tenant_metodos_pago;
create policy tenant_metodos_pago_delete_admin on public.tenant_metodos_pago
  for delete to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- 5. Add metodo_pago_id to pagos
alter table public.pagos
  add column if not exists metodo_pago_id uuid;

-- 6. Drop legacy constraint
alter table public.pagos
  drop constraint if exists pagos_metodo_pago_ck;

-- 7. FK: pagos.metodo_pago_id → tenant_metodos_pago(id) ON DELETE SET NULL
alter table public.pagos
  add constraint pagos_metodo_pago_id_fkey
    foreign key (metodo_pago_id) references public.tenant_metodos_pago(id)
    on delete set null;

-- 8. Index on pagos.metodo_pago_id
create index if not exists idx_pagos_metodo_pago_id
  on public.pagos (metodo_pago_id);
