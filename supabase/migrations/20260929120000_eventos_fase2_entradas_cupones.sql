-- =============================================
-- Migration: Team events phase 2 (US-0119)
-- Snapshot columns (disciplina / escenario / entrenadores), drafts (borrador),
-- formulario, métodos de pago, evento_entradas and evento_entrada_cupones.
-- =============================================

begin;

-- ---------------------------------------------
-- 1. eventos.disciplina_id: uuid FK -> text (discipline NAME snapshot)
-- ---------------------------------------------
alter table public.eventos add column disciplina_nombre text;

update public.eventos e
   set disciplina_nombre = d.nombre
  from public.disciplinas d
 where d.id = e.disciplina_id;

alter table public.eventos drop constraint eventos_disciplina_id_fkey;
drop index if exists public.idx_eventos_disciplina_id;
alter table public.eventos drop column disciplina_id;
alter table public.eventos rename column disciplina_nombre to disciplina_id;

create index idx_eventos_disciplina_id on public.eventos (tenant_id, disciplina_id);

-- ---------------------------------------------
-- 2. eventos.escenario_id: uuid FK -> jsonb snapshot object
-- ---------------------------------------------
alter table public.eventos add column escenario_snapshot jsonb;

update public.eventos e
   set escenario_snapshot = jsonb_build_object(
         'id', s.id,
         'nombre', s.nombre,
         'tipo', s.tipo,
         'ubicacion', s.ubicacion,
         'direccion', s.direccion,
         'coordenadas', s.coordenadas,
         'capacidad', s.capacidad,
         'image_url', s.image_url)
  from public.escenarios s
 where s.id = e.escenario_id;

alter table public.eventos drop constraint eventos_escenario_id_fkey;
alter table public.eventos drop column escenario_id;
alter table public.eventos rename column escenario_snapshot to escenario_id;

-- ---------------------------------------------
-- 3. eventos.entrenador_id: uuid FK -> jsonb array of {id, nombre, experiencia}
-- ---------------------------------------------
alter table public.eventos add column entrenadores_snapshot jsonb not null default '[]'::jsonb;

update public.eventos e
   set entrenadores_snapshot = jsonb_build_array(jsonb_build_object(
         'id', u.id,
         'nombre', btrim(coalesce(u.nombre, '') || ' ' || coalesce(u.apellido, '')),
         'experiencia', ''))
  from public.usuarios u
 where u.id = e.entrenador_id;

alter table public.eventos drop constraint eventos_entrenador_id_fkey;
alter table public.eventos drop column entrenador_id;
alter table public.eventos rename column entrenadores_snapshot to entrenador_id;

-- ---------------------------------------------
-- 4. Drafts, formulario, métodos de pago
-- ---------------------------------------------
alter table public.eventos
  add column borrador boolean not null default false,
  add column formulario_id uuid,
  add column metodos_pago jsonb not null default '[]'::jsonb;

update public.eventos set nombre = 'Evento sin nombre' where nombre is null or btrim(nombre) = '';

alter table public.eventos
  add constraint eventos_formulario_id_fkey
    foreign key (formulario_id) references public.formularios_plantillas(id) on delete set null,
  add constraint eventos_nombre_requerido_ck
    check (length(btrim(coalesce(nombre, ''))) > 0),
  add constraint eventos_disciplina_nombre_ck
    check (disciplina_id is null or length(btrim(disciplina_id)) between 1 and 100),
  -- The only completeness rule that fits on the row itself; ticket/payment completeness is enforced by guardar_evento_completo.
  add constraint eventos_publicado_completo_ck
    check (borrador or disciplina_id is not null),
  add constraint eventos_escenario_object_ck
    check (escenario_id is null or (jsonb_typeof(escenario_id) = 'object' and escenario_id ? 'id' and escenario_id ? 'nombre')),
  add constraint eventos_entrenador_array_ck
    check (jsonb_typeof(entrenador_id) = 'array'),
  add constraint eventos_metodos_pago_array_ck
    check (jsonb_typeof(metodos_pago) = 'array');

create index idx_eventos_formulario_id on public.eventos (formulario_id) where formulario_id is not null;
create index idx_eventos_tenant_borrador on public.eventos (tenant_id) where borrador;

drop index if exists public.idx_eventos_publicos_fecha_hora;
create index idx_eventos_publicos_fecha_hora on public.eventos (fecha_hora)
  where publico = true and activo = true and borrador = false;

comment on column public.eventos.disciplina_id is 'Discipline NAME snapshot (text), not an FK. Null only while borrador (US-0119).';
comment on column public.eventos.escenario_id is 'Escenario snapshot {id,nombre,tipo,ubicacion,direccion,coordenadas,capacidad,image_url}, not an FK (US-0119).';
comment on column public.eventos.entrenador_id is 'Array of trainer snapshots [{id,nombre,experiencia}], not an FK (US-0119).';
comment on column public.eventos.metodos_pago is 'Array of tenant_metodos_pago snapshots accepted for this event (US-0119).';
comment on column public.eventos.borrador is 'Work in progress: visible only to tenant admins/trainers; completeness not enforced (US-0119).';
comment on column public.eventos.precio is 'DERIVED from evento_entradas by guardar_evento_completo; do not write directly (US-0119).';

-- ---------------------------------------------
-- 5. eventos SELECT policies: drafts are never visible to anon or plain members
-- ---------------------------------------------
drop policy eventos_select_anon on public.eventos;
create policy eventos_select_anon on public.eventos
  for select to anon
  using (publico = true and activo = true and borrador = false);

drop policy eventos_select_authenticated on public.eventos;
create policy eventos_select_authenticated on public.eventos
  for select to authenticated
  using (
    (publico = true and activo = true and borrador = false)
    or (
      activo = true
      and borrador = false
      and tenant_id in (select t.tenant_id from public.get_member_tenants_for_authenticated_user() t)
    )
    or tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  );

-- ---------------------------------------------
-- 6. evento_entradas
-- ---------------------------------------------
create table public.evento_entradas (
  id                 uuid primary key default gen_random_uuid(),
  evento_id          uuid not null,
  tenant_id          uuid not null,
  tipo_entrada       varchar(20) not null default 'sencilla',
  nombre             varchar(100),
  eventos_id_bundle  jsonb not null default '[]'::jsonb,
  valida_desde       timestamptz,
  valida_hasta       timestamptz,
  valor              numeric(12,2),
  orden              integer not null default 0,
  created_at         timestamptz not null default timezone('utc', now()),
  updated_at         timestamptz not null default timezone('utc', now()),

  constraint evento_entradas_evento_id_fkey
    foreign key (evento_id) references public.eventos(id) on delete cascade,
  constraint evento_entradas_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,

  -- Format rules only; completeness is enforced by guardar_evento_completo on final save.
  constraint evento_entradas_tipo_ck check (tipo_entrada in ('sencilla', 'multiple')),
  constraint evento_entradas_nombre_ck check (nombre is null or length(btrim(nombre)) > 0),
  constraint evento_entradas_valor_ck check (valor is null or valor >= 0),
  constraint evento_entradas_ventana_ck
    check (valida_desde is null or valida_hasta is null or valida_desde < valida_hasta),
  constraint evento_entradas_bundle_array_ck check (jsonb_typeof(eventos_id_bundle) = 'array'),
  constraint evento_entradas_bundle_tipo_ck
    check (tipo_entrada = 'multiple' or eventos_id_bundle = '[]'::jsonb)
);

comment on table public.evento_entradas is
  'Ticket types of an event (US-0119). Nullable nombre/valor are only valid while the event is a draft.';

create unique index uq_evento_entradas_nombre
  on public.evento_entradas (evento_id, lower(btrim(nombre)))
  where nombre is not null;
create index idx_evento_entradas_evento_orden on public.evento_entradas (evento_id, orden);
create index idx_evento_entradas_bundle on public.evento_entradas using gin (eventos_id_bundle);

create trigger evento_entradas_set_updated_at
  before update on public.evento_entradas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------
-- 7. evento_entrada_cupones
-- ---------------------------------------------
create table public.evento_entrada_cupones (
  id            uuid primary key default gen_random_uuid(),
  entrada_id    uuid not null,
  evento_id     uuid not null,
  tenant_id     uuid not null,
  nombre        varchar(100),
  cupon         varchar(30),
  descuento     numeric(5,2),
  valido_desde  timestamptz,
  valido_hasta  timestamptz,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),

  constraint evento_entrada_cupones_entrada_id_fkey
    foreign key (entrada_id) references public.evento_entradas(id) on delete cascade,
  constraint evento_entrada_cupones_evento_id_fkey
    foreign key (evento_id) references public.eventos(id) on delete cascade,
  constraint evento_entrada_cupones_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,

  constraint evento_entrada_cupones_nombre_ck check (nombre is null or length(btrim(nombre)) > 0),
  constraint evento_entrada_cupones_codigo_ck check (cupon is null or cupon ~ '^[A-Z0-9_-]{3,30}$'),
  constraint evento_entrada_cupones_descuento_ck
    check (descuento is null or (descuento > 0 and descuento <= 100)),
  constraint evento_entrada_cupones_ventana_ck
    check (valido_desde is null or valido_hasta is null or valido_desde < valido_hasta)
);

comment on table public.evento_entrada_cupones is
  'Percentage discount coupons per ticket (US-0119). Codes are secret: readable only by tenant admins/trainers.';

create unique index uq_evento_entrada_cupones_codigo
  on public.evento_entrada_cupones (evento_id, cupon)
  where cupon is not null;
create index idx_evento_entrada_cupones_entrada on public.evento_entrada_cupones (entrada_id);

create trigger evento_entrada_cupones_set_updated_at
  before update on public.evento_entrada_cupones
  for each row execute function public.set_updated_at();

-- ---------------------------------------------
-- 8. RLS
-- ---------------------------------------------
alter table public.evento_entradas enable row level security;
alter table public.evento_entrada_cupones enable row level security;

revoke all on public.evento_entradas from anon, authenticated;
revoke all on public.evento_entrada_cupones from anon, authenticated;
grant select on public.evento_entradas to anon;
grant select, insert, update, delete on public.evento_entradas to authenticated;
grant select, insert, update, delete on public.evento_entrada_cupones to authenticated;

-- Tickets are readable whenever the parent event is (eventos RLS applies inside the subquery).
create policy evento_entradas_select_anon on public.evento_entradas
  for select to anon
  using (exists (select 1 from public.eventos e where e.id = evento_entradas.evento_id));

create policy evento_entradas_select_authenticated on public.evento_entradas
  for select to authenticated
  using (exists (select 1 from public.eventos e where e.id = evento_entradas.evento_id));

create policy evento_entradas_insert_trainer_admin on public.evento_entradas
  for insert to authenticated
  with check (
    tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
    and exists (
      select 1 from public.eventos e
       where e.id = evento_entradas.evento_id and e.tenant_id = evento_entradas.tenant_id)
  );

create policy evento_entradas_update_trainer_admin on public.evento_entradas
  for update to authenticated
  using (tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t))
  with check (
    tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
    and exists (
      select 1 from public.eventos e
       where e.id = evento_entradas.evento_id and e.tenant_id = evento_entradas.tenant_id)
  );

create policy evento_entradas_delete_trainer_admin on public.evento_entradas
  for delete to authenticated
  using (tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t));

-- Coupon codes are secret: only the tenant's admins/trainers can read or write them.
create policy evento_entrada_cupones_all_trainer_admin on public.evento_entrada_cupones
  for all to authenticated
  using (tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t))
  with check (
    tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
    and exists (
      select 1 from public.evento_entradas en
       where en.id = evento_entrada_cupones.entrada_id
         and en.evento_id = evento_entrada_cupones.evento_id
         and en.tenant_id = evento_entrada_cupones.tenant_id)
  );

commit;
