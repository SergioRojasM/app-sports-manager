-- =============================================
-- Migration: Public Training Marketplace
-- US-0089: entrenamientos_publicos table, RLS, servicio-restriction
-- pre-publish gate, and cross-tenant storage read policy for banners
-- =============================================

begin;

-- 1. entrenamientos_publicos table
create table public.entrenamientos_publicos (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null,
  entrenamiento_id  uuid not null,
  nombre            varchar(150),
  descripcion       text,
  disciplina_id     uuid not null,
  escenario_id      uuid not null,
  entrenador_id     uuid,
  fecha_hora        timestamptz,
  duracion_minutos  integer,
  cupo_maximo       integer,
  punto_encuentro   varchar(200),
  estado            varchar(30) not null default 'pendiente',
  reserva_antelacion_horas      integer,
  cancelacion_antelacion_horas  integer,
  precio            numeric(10,2),
  banner_url        varchar(500),
  activo            boolean not null default true,
  publicado_por     uuid,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),

  constraint entrenamientos_publicos_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint entrenamientos_publicos_entrenamiento_id_fkey
    foreign key (entrenamiento_id) references public.entrenamientos(id) on delete cascade,
  constraint entrenamientos_publicos_disciplina_id_fkey
    foreign key (disciplina_id) references public.disciplinas(id) on delete restrict,
  constraint entrenamientos_publicos_escenario_id_fkey
    foreign key (escenario_id) references public.escenarios(id) on delete restrict,
  constraint entrenamientos_publicos_entrenador_id_fkey
    foreign key (entrenador_id) references public.usuarios(id) on delete set null,
  constraint entrenamientos_publicos_publicado_por_fkey
    foreign key (publicado_por) references public.usuarios(id) on delete set null,
  constraint entrenamientos_publicos_entrenamiento_id_uk
    unique (entrenamiento_id),
  constraint entrenamientos_publicos_precio_ck
    check (precio is null or precio >= 0),
  constraint entrenamientos_publicos_cupo_ck
    check (cupo_maximo is null or cupo_maximo > 0),
  constraint entrenamientos_publicos_reserva_antelacion_ck
    check (reserva_antelacion_horas is null or reserva_antelacion_horas >= 0),
  constraint entrenamientos_publicos_cancelacion_antelacion_ck
    check (cancelacion_antelacion_horas is null or cancelacion_antelacion_horas >= 0)
);

-- 2. Indexes
create index idx_entrenamientos_publicos_tenant_id on public.entrenamientos_publicos (tenant_id);
create index idx_entrenamientos_publicos_activo on public.entrenamientos_publicos (activo);
create index idx_entrenamientos_publicos_fecha_hora on public.entrenamientos_publicos (fecha_hora);

-- 3. RLS
alter table public.entrenamientos_publicos enable row level security;
grant select, insert, update, delete on public.entrenamientos_publicos to authenticated;

-- SELECT: any authenticated user can browse active listings; owning admins can also
-- read their own tenant's inactive/draft publications for management purposes.
create policy entrenamientos_publicos_select_authenticated on public.entrenamientos_publicos
  for select to authenticated
  using (
    activo = true
    or tenant_id in (
      select t.id from public.get_admin_tenants_for_authenticated_user() t
    )
  );

-- INSERT/UPDATE/DELETE: tenant admin only
create policy entrenamientos_publicos_insert_admin on public.entrenamientos_publicos
  for insert to authenticated
  with check (tenant_id in (select t.id from public.get_admin_tenants_for_authenticated_user() t));

create policy entrenamientos_publicos_update_admin on public.entrenamientos_publicos
  for update to authenticated
  using (tenant_id in (select t.id from public.get_admin_tenants_for_authenticated_user() t))
  with check (tenant_id in (select t.id from public.get_admin_tenants_for_authenticated_user() t));

create policy entrenamientos_publicos_delete_admin on public.entrenamientos_publicos
  for delete to authenticated
  using (tenant_id in (select t.id from public.get_admin_tenants_for_authenticated_user() t));

-- 4. updated_at trigger (reuses the existing shared trigger function)
create trigger entrenamientos_publicos_set_updated_at
  before update on public.entrenamientos_publicos
  for each row execute function public.set_updated_at();

-- 5. Defense-in-depth: a training with any servicio-based restriction row can never be
-- published, since a cross-tenant visitor can never hold a subscription/service in a
-- tenant they don't belong to. The UI/service layer already blocks this before it gets
-- here; this trigger guarantees the rule holds for any future direct write too.
create or replace function public.check_entrenamiento_publico_sin_restriccion_servicio()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.entrenamiento_restricciones er
    where er.entrenamiento_id = new.entrenamiento_id
      and (
        er.servicio_1_id is not null
        or er.servicio_2_id is not null
        or er.servicio_3_id is not null
        or er.servicio_4_id is not null
      )
  ) then
    raise exception 'No se puede publicar un entrenamiento con restricciones de servicios.';
  end if;

  return new;
end;
$$;

create trigger entrenamientos_publicos_no_servicio_restriccion
  before insert or update on public.entrenamientos_publicos
  for each row execute function public.check_entrenamiento_publico_sin_restriccion_servicio();

-- 6. Storage: allow ANY authenticated user (not just tenant members) to read publication
-- banners, since they must be visible to cross-tenant visitors on the marketplace page.
-- Upload/update/delete already covered by the existing org_admin_* policies
-- (they match any path under orgs/{tenantId}/..., which includes the new subpath below).
create policy public_training_banner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'entrenamientos-publicos'
  );

commit;
