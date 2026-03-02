-- =============================================
-- Migration: Plans Management Feature
-- US-0014: Manage Plans Feature
-- =============================================
begin;

-- 1. Evolve planes table (already exists from initial migration)

-- 1a. Add vigencia_meses (replaces duracion_dias)
alter table public.planes
  add column if not exists vigencia_meses integer;

-- 1b. Backfill: convert duracion_dias to months (30 days = 1 month, min 1)
update public.planes
  set vigencia_meses = greatest(1, ceil(coalesce(duracion_dias, 30)::float / 30)::integer)
  where vigencia_meses is null;

-- 1c. Apply NOT NULL + default
alter table public.planes
  alter column vigencia_meses set not null,
  alter column vigencia_meses set default 1;

-- 1d. Drop old column
alter table public.planes
  drop column if exists duracion_dias;

-- 1e. Add updated_at column (missing from original table)
alter table public.planes
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

-- 1f. Add unique constraint on (tenant_id, nombre)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.planes'::regclass
      and conname = 'planes_tenant_nombre_uk'
  ) then
    alter table public.planes
      add constraint planes_tenant_nombre_uk unique (tenant_id, nombre);
  end if;
end $$;

-- 2. Create trigger function for updated_at (shared, reusable)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 3. Attach trigger to planes
drop trigger if exists planes_set_updated_at on public.planes;
create trigger planes_set_updated_at
  before update on public.planes
  for each row execute function public.set_updated_at();

-- 4. Create planes_disciplina join table
create table if not exists public.planes_disciplina (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null,
  disciplina_id uuid not null,
  created_at    timestamptz not null default timezone('utc', now()),
  constraint planes_disciplina_plan_id_fkey
    foreign key (plan_id) references public.planes(id) on delete cascade,
  constraint planes_disciplina_disciplina_id_fkey
    foreign key (disciplina_id) references public.disciplinas(id) on delete cascade,
  constraint planes_disciplina_plan_disciplina_uk unique (plan_id, disciplina_id)
);

create index if not exists idx_planes_disciplina_plan_id
  on public.planes_disciplina (plan_id);
create index if not exists idx_planes_disciplina_disciplina_id
  on public.planes_disciplina (disciplina_id);

-- 5. Mutation RLS policies for planes
-- (RLS already enabled + SELECT policy planes_select_authenticated already exists)
grant insert, update, delete on table public.planes to authenticated;

drop policy if exists planes_insert_admin_only on public.planes;
create policy planes_insert_admin_only on public.planes
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

drop policy if exists planes_update_admin_only on public.planes;
create policy planes_update_admin_only on public.planes
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

drop policy if exists planes_delete_admin_only on public.planes;
create policy planes_delete_admin_only on public.planes
  for delete to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

-- 6. RLS for planes_disciplina (new table)
alter table public.planes_disciplina enable row level security;

grant select, insert, update, delete on table public.planes_disciplina to authenticated;

-- SELECT: all authenticated users (consistent with the rest of the schema)
drop policy if exists planes_disciplina_select_authenticated on public.planes_disciplina;
create policy planes_disciplina_select_authenticated on public.planes_disciplina
  for select to authenticated
  using (true);

-- INSERT / DELETE: admin of the plan's tenant only
drop policy if exists planes_disciplina_insert_admin_only on public.planes_disciplina;
create policy planes_disciplina_insert_admin_only on public.planes_disciplina
  for insert to authenticated
  with check (
    plan_id in (
      select p.id from public.planes p
      where p.tenant_id in (
        select admin_tenants.id
        from public.get_admin_tenants_for_authenticated_user() admin_tenants
      )
    )
  );

drop policy if exists planes_disciplina_delete_admin_only on public.planes_disciplina;
create policy planes_disciplina_delete_admin_only on public.planes_disciplina
  for delete to authenticated
  using (
    plan_id in (
      select p.id from public.planes p
      where p.tenant_id in (
        select admin_tenants.id
        from public.get_admin_tenants_for_authenticated_user() admin_tenants
      )
    )
  );

commit;
