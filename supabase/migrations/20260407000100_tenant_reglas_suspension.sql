-- Migration: 20260407000100_tenant_reglas_suspension.sql
-- Adds per-tenant suspension rules (max 3 per tenant, enforced at app layer)

create table if not exists public.tenant_reglas_suspension (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null,
  nombre             varchar(100) not null,
  num_inasistencias  integer not null default 1,
  por_suscripcion    boolean not null default false,
  por_dias_atras     integer not null default 0,
  duracion           integer not null default 0,
  activo             boolean not null default true,
  created_at         timestamptz not null default timezone('utc', now()),
  updated_at         timestamptz not null default timezone('utc', now()),
  constraint tenant_reglas_suspension_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint tenant_reglas_suspension_tenant_nombre_uk
    unique (tenant_id, nombre),
  constraint tenant_reglas_suspension_num_inasistencias_ck
    check (num_inasistencias >= 1),
  constraint tenant_reglas_suspension_por_dias_atras_ck
    check (por_dias_atras >= 0),
  constraint tenant_reglas_suspension_duracion_ck
    check (duracion >= 0)
);

create index if not exists idx_tenant_reglas_suspension_tenant_id
  on public.tenant_reglas_suspension (tenant_id);

-- Auto-update updated_at
drop trigger if exists tenant_reglas_suspension_set_updated_at on public.tenant_reglas_suspension;
create trigger tenant_reglas_suspension_set_updated_at
  before update on public.tenant_reglas_suspension
  for each row execute function public.set_updated_at();

-- RLS
alter table public.tenant_reglas_suspension enable row level security;
grant select, insert, update, delete on table public.tenant_reglas_suspension to authenticated;

-- SELECT: any authenticated user
drop policy if exists tenant_reglas_suspension_select_member on public.tenant_reglas_suspension;
create policy tenant_reglas_suspension_select_member on public.tenant_reglas_suspension
  for select to authenticated using (true);

-- INSERT: admin only
drop policy if exists tenant_reglas_suspension_insert_admin on public.tenant_reglas_suspension;
create policy tenant_reglas_suspension_insert_admin on public.tenant_reglas_suspension
  for insert to authenticated
  with check (
    tenant_id in (
      select id from public.get_admin_tenants_for_authenticated_user()
    )
  );

-- UPDATE: admin only
drop policy if exists tenant_reglas_suspension_update_admin on public.tenant_reglas_suspension;
create policy tenant_reglas_suspension_update_admin on public.tenant_reglas_suspension
  for update to authenticated
  using (
    tenant_id in (
      select id from public.get_admin_tenants_for_authenticated_user()
    )
  )
  with check (
    tenant_id in (
      select id from public.get_admin_tenants_for_authenticated_user()
    )
  );

-- DELETE: admin only
drop policy if exists tenant_reglas_suspension_delete_admin on public.tenant_reglas_suspension;
create policy tenant_reglas_suspension_delete_admin on public.tenant_reglas_suspension
  for delete to authenticated
  using (
    tenant_id in (
      select id from public.get_admin_tenants_for_authenticated_user()
    )
  );
