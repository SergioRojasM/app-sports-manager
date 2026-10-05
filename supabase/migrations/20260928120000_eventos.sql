-- =============================================
-- Migration: Team events (US-0118, phase 1)
-- Standalone events a tenant organizes for its members. Independent from
-- entrenamientos / entrenamientos_publicos; the column set mirrors
-- entrenamientos_publicos (US-0109 detail fields + jsonb precio) so the
-- phase 2 form can reuse the same editors.
--
-- Read:  anon → publico and activo
--        authenticated → publico and activo, OR activo rows of own tenants,
--                        OR every row of tenants where caller is admin/trainer
-- Write: tenant admins and trainers only
-- =============================================

begin;

-- 1. Table
create table public.eventos (
  id                            uuid primary key default gen_random_uuid(),
  tenant_id                     uuid not null,
  nombre                        varchar(150),
  descripcion                   text,
  disciplina_id                 uuid not null,
  escenario_id                  uuid,
  entrenador_id                 uuid,
  fecha_hora                    timestamptz,
  duracion_minutos              integer,
  cupo_maximo                   integer,
  punto_encuentro               text,
  estado                        varchar(30) not null default 'confirmado',
  reserva_antelacion_horas      integer,
  cancelacion_antelacion_horas  integer,
  precio                        jsonb not null default '[]'::jsonb,
  banner_url                    text,
  activo                        boolean not null default true,
  publico                       boolean not null default true,
  creado_por                    uuid,
  omitir_confirmacion_compra    boolean not null default false,
  cronograma                    jsonb not null default '[]'::jsonb,
  incluye                       jsonb not null default '[]'::jsonb,
  descripcion_larga             text,
  pagina_evento_url             text,
  created_at                    timestamptz not null default timezone('utc', now()),
  updated_at                    timestamptz not null default timezone('utc', now()),

  constraint eventos_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint eventos_disciplina_id_fkey
    foreign key (disciplina_id) references public.disciplinas(id) on delete restrict,
  -- An event outlives a removed venue/trainer; punto_encuentro can take over
  constraint eventos_escenario_id_fkey
    foreign key (escenario_id) references public.escenarios(id) on delete set null,
  constraint eventos_entrenador_id_fkey
    foreign key (entrenador_id) references public.usuarios(id) on delete set null,
  constraint eventos_creado_por_fkey
    foreign key (creado_por) references public.usuarios(id) on delete set null,

  constraint eventos_estado_ck
    check (estado in ('confirmado', 'cancelado')),
  constraint eventos_duracion_ck
    check (duracion_minutos is null or duracion_minutos > 0),
  constraint eventos_cupo_ck
    check (cupo_maximo is null or cupo_maximo > 0),
  constraint eventos_reserva_antelacion_ck
    check (reserva_antelacion_horas is null or reserva_antelacion_horas >= 0),
  constraint eventos_cancelacion_antelacion_ck
    check (cancelacion_antelacion_horas is null or cancelacion_antelacion_horas >= 0),
  constraint eventos_precio_array_ck
    check (jsonb_typeof(precio) = 'array'),
  constraint eventos_cronograma_array_ck
    check (jsonb_typeof(cronograma) = 'array'),
  constraint eventos_incluye_array_ck
    check (jsonb_typeof(incluye) = 'array')
);

comment on table public.eventos is
  'Team events (US-0118). Independent from entrenamientos; publico=true is readable by anon, publico=false only by tenant members.';

-- 2. Indexes
create index idx_eventos_tenant_fecha_hora on public.eventos (tenant_id, fecha_hora);
create index idx_eventos_disciplina_id on public.eventos (disciplina_id);
create index idx_eventos_publicos_fecha_hora on public.eventos (fecha_hora)
  where publico = true and activo = true;

-- 3. updated_at trigger (reuses the shared trigger function)
create trigger eventos_set_updated_at
  before update on public.eventos
  for each row execute function public.set_updated_at();

-- 4. RLS
alter table public.eventos enable row level security;

-- Supabase default privileges grant ALL to anon/authenticated; make them explicit and minimal
revoke all on public.eventos from anon, authenticated;
grant select on public.eventos to anon;
grant select, insert, update, delete on public.eventos to authenticated;

create policy eventos_select_anon on public.eventos
  for select to anon
  using (publico = true and activo = true);

-- Both helpers exclude pendiente_activacion memberships (US-0114)
create policy eventos_select_authenticated on public.eventos
  for select to authenticated
  using (
    (publico = true and activo = true)
    or (
      activo = true
      and tenant_id in (select t.tenant_id from public.get_member_tenants_for_authenticated_user() t)
    )
    or tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  );

create policy eventos_insert_trainer_admin on public.eventos
  for insert to authenticated
  with check (
    tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  );

-- with check repeats the predicate so a row cannot be moved to another tenant
create policy eventos_update_trainer_admin on public.eventos
  for update to authenticated
  using (
    tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  )
  with check (
    tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  );

create policy eventos_delete_trainer_admin on public.eventos
  for delete to authenticated
  using (
    tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  );

commit;
