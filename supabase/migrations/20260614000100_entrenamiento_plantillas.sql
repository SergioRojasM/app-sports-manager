-- =============================================
-- Migration: Training Templates
-- US-0069: Save and Reuse Training Templates
-- =============================================

-- 1. Create entrenamiento_plantillas table
create table if not exists public.entrenamiento_plantillas (
  id          uuid          primary key default gen_random_uuid(),
  tenant_id   uuid          not null,
  nombre      varchar(150)  not null,
  descripcion text,
  contenido   jsonb         not null,
  created_by  uuid,
  created_at  timestamptz   not null default timezone('utc', now()),
  updated_at  timestamptz   not null default timezone('utc', now()),

  constraint entrenamiento_plantillas_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint entrenamiento_plantillas_created_by_fkey
    foreign key (created_by) references public.usuarios(id) on delete set null,
  constraint entrenamiento_plantillas_tenant_nombre_uk
    unique (tenant_id, nombre)
);

create index if not exists idx_entrenamiento_plantillas_tenant_id
  on public.entrenamiento_plantillas (tenant_id);

-- 2. Enable RLS on entrenamiento_plantillas
alter table public.entrenamiento_plantillas enable row level security;

grant select, insert, update, delete on table public.entrenamiento_plantillas to authenticated;

-- SELECT: any authenticated member of the tenant
drop policy if exists entrenamiento_plantillas_select_authenticated on public.entrenamiento_plantillas;
create policy entrenamiento_plantillas_select_authenticated on public.entrenamiento_plantillas
  for select to authenticated
  using (
    exists (
      select 1 from public.miembros_tenant mt
      where mt.tenant_id = entrenamiento_plantillas.tenant_id
        and mt.usuario_id = auth.uid()
    )
  );

-- INSERT: trainer or admin (same roles allowed to create trainings, US-0049)
drop policy if exists entrenamiento_plantillas_insert_trainer_admin on public.entrenamiento_plantillas;
create policy entrenamiento_plantillas_insert_trainer_admin on public.entrenamiento_plantillas
  for insert to authenticated
  with check (
    tenant_id in (
      select ta.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- UPDATE: trainer or admin
drop policy if exists entrenamiento_plantillas_update_trainer_admin on public.entrenamiento_plantillas;
create policy entrenamiento_plantillas_update_trainer_admin on public.entrenamiento_plantillas
  for update to authenticated
  using (
    tenant_id in (
      select ta.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  )
  with check (
    tenant_id in (
      select ta.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- DELETE: trainer or admin
drop policy if exists entrenamiento_plantillas_delete_trainer_admin on public.entrenamiento_plantillas;
create policy entrenamiento_plantillas_delete_trainer_admin on public.entrenamiento_plantillas
  for delete to authenticated
  using (
    tenant_id in (
      select ta.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- 3. Attach set_updated_at trigger to entrenamiento_plantillas
drop trigger if exists entrenamiento_plantillas_set_updated_at on public.entrenamiento_plantillas;
create trigger entrenamiento_plantillas_set_updated_at
  before update on public.entrenamiento_plantillas
  for each row execute function public.set_updated_at();
