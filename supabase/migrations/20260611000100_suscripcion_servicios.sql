-- ============================================================
-- US-0063: Per-service unit entitlement ledger on subscriptions
-- Creates suscripcion_servicios table, RLS, trigger, and
-- populate_suscripcion_servicios SECURITY DEFINER function.
-- ============================================================

-- 1. Create suscripcion_servicios table
create table if not exists public.suscripcion_servicios (
  id                 uuid        primary key default gen_random_uuid(),
  suscripcion_id     uuid        not null,
  servicio_id        uuid        not null,
  unidades_incluidas integer,
  unidades_restantes integer,
  created_at         timestamptz not null default timezone('utc', now()),
  updated_at         timestamptz not null default timezone('utc', now()),

  constraint suscripcion_servicios_suscripcion_id_fkey
    foreign key (suscripcion_id) references public.suscripciones(id) on delete cascade,
  constraint suscripcion_servicios_servicio_id_fkey
    foreign key (servicio_id) references public.servicios(id) on delete restrict,
  constraint suscripcion_servicios_suscripcion_servicio_uk
    unique (suscripcion_id, servicio_id),
  constraint suscripcion_servicios_unidades_incluidas_ck
    check (unidades_incluidas is null or unidades_incluidas >= 0),
  constraint suscripcion_servicios_unidades_restantes_ck
    check (unidades_restantes is null or unidades_restantes >= 0)
);

-- 2. Indexes
create index if not exists idx_suscripcion_servicios_suscripcion_id
  on public.suscripcion_servicios (suscripcion_id);

create index if not exists idx_suscripcion_servicios_servicio_id
  on public.suscripcion_servicios (servicio_id);

-- 3. updated_at trigger (reuses existing set_updated_at function)
drop trigger if exists suscripcion_servicios_set_updated_at on public.suscripcion_servicios;
create trigger suscripcion_servicios_set_updated_at
  before update on public.suscripcion_servicios
  for each row execute function public.set_updated_at();

-- 4. Enable RLS
alter table public.suscripcion_servicios enable row level security;

-- 5. Grant SELECT only — no direct INSERT/UPDATE/DELETE for authenticated role
--    (all writes go through the populate_suscripcion_servicios SECURITY DEFINER function)
grant select on table public.suscripcion_servicios to authenticated;

-- 6. SELECT policy: own athlete OR tenant admin
drop policy if exists suscripcion_servicios_select on public.suscripcion_servicios;
create policy suscripcion_servicios_select
  on public.suscripcion_servicios
  for select to authenticated
  using (
    suscripcion_id in (
      select s.id
      from public.suscripciones s
      where
        s.atleta_id = auth.uid()
        or s.tenant_id in (
          select admin_tenants.id
          from public.get_admin_tenants_for_authenticated_user() admin_tenants
        )
    )
  );

-- 7. SECURITY DEFINER function: populate service unit rows at subscription creation time
create or replace function public.populate_suscripcion_servicios(
  p_suscripcion_id uuid,
  p_plan_tipo_id   uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.suscripcion_servicios (
    suscripcion_id,
    servicio_id,
    unidades_incluidas,
    unidades_restantes
  )
  select
    p_suscripcion_id,
    pts.servicio_id,
    pts.unidades,   -- NULL = unlimited
    pts.unidades    -- snapshot same value for restantes
  from public.plan_tipos_servicios pts
  where pts.plan_tipo_id = p_plan_tipo_id
  on conflict (suscripcion_id, servicio_id) do nothing;
end;
$$;

-- 8. Grant EXECUTE to authenticated
grant execute on function public.populate_suscripcion_servicios(uuid, uuid) to authenticated;
