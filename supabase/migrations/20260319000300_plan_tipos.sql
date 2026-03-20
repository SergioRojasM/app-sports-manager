-- Migration: plan_tipos table and suscripciones.plan_tipo_id
-- US-0036: Plan Subtypes

-- 1. Create plan_tipos table
create table if not exists public.plan_tipos (
  id             uuid          primary key default gen_random_uuid(),
  tenant_id      uuid          not null,
  plan_id        uuid          not null,
  nombre         varchar(100)  not null,
  descripcion    text,
  precio         numeric(10,2),
  vigencia_dias  integer,
  clases_incluidas integer,
  activo         boolean       not null default true,
  created_at     timestamptz   not null default timezone('utc', now()),
  updated_at     timestamptz   not null default timezone('utc', now()),

  constraint plan_tipos_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint plan_tipos_plan_id_fkey
    foreign key (plan_id) references public.planes(id) on delete cascade,
  constraint plan_tipos_precio_ck
    check (precio is null or precio >= 0),
  constraint plan_tipos_vigencia_ck
    check (vigencia_dias is null or vigencia_dias > 0),
  constraint plan_tipos_clases_ck
    check (clases_incluidas is null or clases_incluidas >= 0),
  constraint plan_tipos_nombre_plan_uk
    unique (plan_id, nombre)
);

-- 2. Indexes
create index if not exists idx_plan_tipos_plan_id  on public.plan_tipos (plan_id);
create index if not exists idx_plan_tipos_tenant_id on public.plan_tipos (tenant_id);

-- 3. Enable RLS
alter table public.plan_tipos enable row level security;

-- 4. RLS Policies

-- SELECT: any authenticated user
create policy plan_tipos_select_authenticated on public.plan_tipos
  for select to authenticated using (true);

-- INSERT: only tenant admins
create policy plan_tipos_insert_admin on public.plan_tipos
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- UPDATE: only tenant admins
create policy plan_tipos_update_admin on public.plan_tipos
  for update to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- DELETE: only tenant admins
create policy plan_tipos_delete_admin on public.plan_tipos
  for delete to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- 5. Grant permissions
grant select, insert, update, delete on public.plan_tipos to authenticated;

-- 6. Extend suscripciones with plan_tipo_id
alter table public.suscripciones
  add column if not exists plan_tipo_id uuid
    references public.plan_tipos(id) on delete set null;

create index if not exists idx_suscripciones_plan_tipo_id
  on public.suscripciones (plan_tipo_id);
