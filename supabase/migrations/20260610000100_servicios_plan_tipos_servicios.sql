-- =============================================
-- Migration: Services Catalog + Plan Tipo Services
-- US-0062: Services Catalog and Plan Service Assignments
-- =============================================

-- 1. Create servicios table
create table if not exists public.servicios (
  id          uuid          primary key default gen_random_uuid(),
  tenant_id   uuid          not null,
  nombre      varchar(100)  not null,
  descripcion text,
  activo      boolean       not null default true,
  created_at  timestamptz   not null default timezone('utc', now()),
  updated_at  timestamptz   not null default timezone('utc', now()),

  constraint servicios_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint servicios_tenant_nombre_uk
    unique (tenant_id, nombre)
);

create index if not exists idx_servicios_tenant_id on public.servicios (tenant_id);

-- 2. Enable RLS on servicios
alter table public.servicios enable row level security;

grant select, insert, update, delete on table public.servicios to authenticated;

-- SELECT: all authenticated users
drop policy if exists servicios_select_authenticated on public.servicios;
create policy servicios_select_authenticated on public.servicios
  for select to authenticated
  using (true);

-- INSERT: tenant admins only
drop policy if exists servicios_insert_admin_only on public.servicios;
create policy servicios_insert_admin_only on public.servicios
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- UPDATE: tenant admins only
drop policy if exists servicios_update_admin_only on public.servicios;
create policy servicios_update_admin_only on public.servicios
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

-- DELETE: tenant admins only
drop policy if exists servicios_delete_admin_only on public.servicios;
create policy servicios_delete_admin_only on public.servicios
  for delete to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- 3. Attach set_updated_at trigger to servicios
drop trigger if exists servicios_set_updated_at on public.servicios;
create trigger servicios_set_updated_at
  before update on public.servicios
  for each row execute function public.set_updated_at();

-- 4. Create plan_tipos_servicios table
create table if not exists public.plan_tipos_servicios (
  id            uuid     primary key default gen_random_uuid(),
  plan_tipo_id  uuid     not null,
  servicio_id   uuid     not null,
  unidades      integer  not null default 1,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),

  constraint plan_tipos_servicios_plan_tipo_id_fkey
    foreign key (plan_tipo_id) references public.plan_tipos(id) on delete cascade,
  constraint plan_tipos_servicios_servicio_id_fkey
    foreign key (servicio_id) references public.servicios(id) on delete restrict,
  constraint plan_tipos_servicios_plan_tipo_servicio_uk
    unique (plan_tipo_id, servicio_id),
  constraint plan_tipos_servicios_unidades_ck
    check (unidades >= 1)
);

create index if not exists idx_plan_tipos_servicios_plan_tipo_id
  on public.plan_tipos_servicios (plan_tipo_id);
create index if not exists idx_plan_tipos_servicios_servicio_id
  on public.plan_tipos_servicios (servicio_id);

-- 5. Enable RLS on plan_tipos_servicios
alter table public.plan_tipos_servicios enable row level security;

grant select, insert, update, delete on table public.plan_tipos_servicios to authenticated;

-- SELECT: all authenticated users
drop policy if exists plan_tipos_servicios_select_authenticated on public.plan_tipos_servicios;
create policy plan_tipos_servicios_select_authenticated on public.plan_tipos_servicios
  for select to authenticated
  using (true);

-- INSERT: tenant admins only (via plan_tipos → planes → tenant)
drop policy if exists plan_tipos_servicios_insert_admin_only on public.plan_tipos_servicios;
create policy plan_tipos_servicios_insert_admin_only on public.plan_tipos_servicios
  for insert to authenticated
  with check (
    plan_tipo_id in (
      select pt.id
      from public.plan_tipos pt
      where pt.tenant_id in (
        select admin_tenants.id
        from public.get_admin_tenants_for_authenticated_user() admin_tenants
      )
    )
  );

-- UPDATE: tenant admins only
drop policy if exists plan_tipos_servicios_update_admin_only on public.plan_tipos_servicios;
create policy plan_tipos_servicios_update_admin_only on public.plan_tipos_servicios
  for update to authenticated
  using (
    plan_tipo_id in (
      select pt.id
      from public.plan_tipos pt
      where pt.tenant_id in (
        select admin_tenants.id
        from public.get_admin_tenants_for_authenticated_user() admin_tenants
      )
    )
  );

-- DELETE: tenant admins only
drop policy if exists plan_tipos_servicios_delete_admin_only on public.plan_tipos_servicios;
create policy plan_tipos_servicios_delete_admin_only on public.plan_tipos_servicios
  for delete to authenticated
  using (
    plan_tipo_id in (
      select pt.id
      from public.plan_tipos pt
      where pt.tenant_id in (
        select admin_tenants.id
        from public.get_admin_tenants_for_authenticated_user() admin_tenants
      )
    )
  );

-- 6. Attach set_updated_at trigger to plan_tipos_servicios
drop trigger if exists plan_tipos_servicios_set_updated_at on public.plan_tipos_servicios;
create trigger plan_tipos_servicios_set_updated_at
  before update on public.plan_tipos_servicios
  for each row execute function public.set_updated_at();
