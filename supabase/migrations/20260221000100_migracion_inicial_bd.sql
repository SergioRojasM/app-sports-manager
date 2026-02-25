-- =============================================
-- MIGRATION: Esquema base desde database-schema.drawio
-- Fecha: 2026-02-21
-- =============================================

begin;

create extension if not exists pgcrypto;

-- =========================
-- TABLAS BASE
-- =========================

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  nombre varchar(50) not null unique,
  fecha_creacion date,
  email varchar(255) unique,
  telefono varchar(20),
  instagram_url varchar(500),
  facebook_url varchar(500),
  x_url varchar(500),
  web_url varchar(500),
  logo_url varchar(500),
  descripcion text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  nombre varchar(50) not null,
  descripcion text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint roles_nombre_uk unique (nombre)
);

create table if not exists public.usuarios (
  id uuid primary key,
  email varchar(255) not null unique,
  nombre varchar(100),
  apellido varchar(100),
  telefono varchar(20),
  fecha_nacimiento date,
  foto_url varchar(500),
  activo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint usuarios_auth_user_id_fkey
    foreign key (id) references auth.users(id) on delete cascade
);

create table if not exists public.miembros_tenant (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  usuario_id uuid not null,
  rol_id uuid not null,
  nombre varchar(50) unique,
  descripcion text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint miembros_tenant_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint miembros_tenant_usuario_id_fkey
    foreign key (usuario_id) references public.usuarios(id) on delete cascade,
  constraint miembros_tenant_rol_id_fkey
    foreign key (rol_id) references public.roles(id) on delete restrict,
  constraint miembros_tenant_tenant_usuario_uk unique (tenant_id, usuario_id)
);

create table if not exists public.perfil_deportivo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  peso_kg numeric(3,2),
  altura_cm numeric(3,1),
  created_at timestamptz not null default timezone('utc', now()),
  constraint perfil_deportivo_user_id_fkey
    foreign key (user_id) references public.usuarios(id) on delete cascade,
  constraint perfil_deportivo_user_id_uk unique (user_id)
);




-- =========================
-- INFRAESTRUCTURA / CATÁLOGOS
-- =========================

create table if not exists public.escenarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  nombre varchar(100),
  descripcion text,
  ubicacion varchar(255),
  direccion varchar(255),
  capacidad integer,
  tipo varchar(50),
  activo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint escenarios_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade
);

create table if not exists public.horarios_escenarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  escenario_id uuid not null,
  dia_semana integer not null,
  hora_inicio time not null,
  hora_fin time not null,
  disponible boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint horarios_escenarios_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint horarios_escenarios_escenario_id_fkey
    foreign key (escenario_id) references public.escenarios(id) on delete cascade,
  constraint horarios_escenarios_dia_semana_ck check (dia_semana between 0 and 6),
  constraint horarios_escenarios_horas_ck check (hora_fin > hora_inicio)
);

create table if not exists public.disciplinas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  nombre varchar(100) not null,
  descripcion text,
  icono_url varchar(500),
  activo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint disciplinas_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint disciplinas_tenant_nombre_uk unique (tenant_id, nombre)
);

-- =========================
-- ENTRENAMIENTOS / PLANES
-- =========================

create table if not exists public.entrenamientos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  nombre varchar(150),
  descripcion text,
  disciplina_id uuid not null,
  escenario_id uuid not null,
  entrenador_id uuid,
  fecha_hora timestamptz,
  duracion_minutos integer,
  cupo_maximo integer,
  estado varchar(30) not null default 'pendiente',
  created_at timestamptz not null default timezone('utc', now()),
  constraint entrenamientos_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint entrenamientos_disciplina_id_fkey
    foreign key (disciplina_id) references public.disciplinas(id) on delete restrict,
  constraint entrenamientos_escenario_id_fkey
    foreign key (escenario_id) references public.escenarios(id) on delete restrict,
  constraint entrenamientos_entrenador_id_fkey
    foreign key (entrenador_id) references public.usuarios(id) on delete set null,
  constraint entrenamientos_duracion_ck check (duracion_minutos is null or duracion_minutos > 0),
  constraint entrenamientos_cupo_ck check (cupo_maximo is null or cupo_maximo > 0)
);

create table if not exists public.planes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  nombre varchar(100),
  descripcion text,
  precio numeric(10,2),
  duracion_dias integer,
  clases_incluidas integer,
  beneficios text,
  tipo varchar(50),
  activo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint planes_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint planes_precio_ck check (precio is null or precio >= 0),
  constraint planes_duracion_ck check (duracion_dias is null or duracion_dias > 0),
  constraint planes_clases_ck check (clases_incluidas is null or clases_incluidas >= 0)
);

create table if not exists public.responsabilidades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  nombre boolean,
  observaciones text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint responsabilidades_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade
);

create table if not exists public.responsables (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  entrenamiento_id uuid not null,
  usuario_id uuid not null,
  responsabilidad_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint responsables_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint responsables_entrenamiento_id_fkey
    foreign key (entrenamiento_id) references public.entrenamientos(id) on delete cascade,
  constraint responsables_usuario_id_fkey
    foreign key (usuario_id) references public.usuarios(id) on delete cascade,
  constraint responsables_responsabilidad_id_fkey
    foreign key (responsabilidad_id) references public.responsabilidades(id) on delete restrict,
  constraint responsables_uk unique (entrenamiento_id, usuario_id, responsabilidad_id)
);

-- =========================
-- OPERACIONES DE ATLETAS / PAGOS
-- =========================

create table if not exists public.suscripciones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  atleta_id uuid not null,
  plan_id uuid not null,
  fecha_inicio date,
  fecha_fin date,
  clases_restantes integer,
  estado varchar(30) not null default 'activa',
  created_at timestamptz not null default timezone('utc', now()),
  constraint suscripciones_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint suscripciones_atleta_id_fkey
    foreign key (atleta_id) references public.usuarios(id) on delete restrict,
  constraint suscripciones_plan_id_fkey
    foreign key (plan_id) references public.planes(id) on delete restrict,
  constraint suscripciones_estado_ck check (estado in ('activa', 'vencida', 'cancelada')),
  constraint suscripciones_fechas_ck check (
    fecha_inicio is null
    or fecha_fin is null
    or fecha_fin >= fecha_inicio
  )
);

create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  atleta_id uuid not null,
  entrenamiento_id uuid not null,
  fecha_reserva timestamptz,
  estado varchar(30) not null default 'pendiente',
  notas text,
  fecha_cancelacion timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint reservas_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint reservas_atleta_id_fkey
    foreign key (atleta_id) references public.usuarios(id) on delete restrict,
  constraint reservas_entrenamiento_id_fkey
    foreign key (entrenamiento_id) references public.entrenamientos(id) on delete cascade,
  constraint reservas_estado_ck check (estado in ('pendiente', 'confirmada', 'cancelada', 'completada'))
);

create table if not exists public.asistencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  reserva_id uuid not null,
  validado_por uuid,
  fecha_asistencia timestamptz,
  asistio boolean,
  observaciones text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint asistencias_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint asistencias_reserva_id_fkey
    foreign key (reserva_id) references public.reservas(id) on delete cascade,
  constraint asistencias_validado_por_fkey
    foreign key (validado_por) references public.usuarios(id) on delete set null,
  constraint asistencias_reserva_id_uk unique (reserva_id)
);

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  suscripcion_id uuid not null,
  monto numeric(10,2) not null,
  metodo_pago varchar(50),
  comprobante_url varchar(500),
  estado varchar(30) not null default 'pendiente',
  validado_por uuid,
  fecha_pago timestamptz,
  fecha_validacion timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint pagos_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint pagos_suscripcion_id_fkey
    foreign key (suscripcion_id) references public.suscripciones(id) on delete cascade,
  constraint pagos_validado_por_fkey
    foreign key (validado_por) references public.usuarios(id) on delete set null,
  constraint pagos_estado_ck check (estado in ('pendiente', 'validado', 'rechazado')),
  constraint pagos_metodo_pago_ck check (metodo_pago is null or metodo_pago in ('transferencia', 'efectivo', 'tarjeta')),
  constraint pagos_monto_ck check (monto >= 0)
);

create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  tipo varchar(50),
  titulo varchar(200),
  mensaje text,
  leida boolean not null default false,
  fecha_envio timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notificaciones_usuario_id_fkey
    foreign key (usuario_id) references public.usuarios(id) on delete cascade,
  constraint notificaciones_tipo_ck check (tipo is null or tipo in ('reserva', 'pago', 'entrenamiento', 'general'))
);

-- =========================
-- ÍNDICES
-- =========================

create index if not exists idx_perfil_deportivo_user_id on public.perfil_deportivo (user_id);
create index if not exists idx_escenarios_tenant_id on public.escenarios (tenant_id);
create index if not exists idx_disciplinas_tenant_id on public.disciplinas (tenant_id);
create index if not exists idx_horarios_escenarios_escenario_id on public.horarios_escenarios (escenario_id);
create index if not exists idx_entrenamientos_tenant_id on public.entrenamientos (tenant_id);
create index if not exists idx_entrenamientos_disciplina_id on public.entrenamientos (disciplina_id);
create index if not exists idx_entrenamientos_escenario_id on public.entrenamientos (escenario_id);
create index if not exists idx_entrenamientos_entrenador_id on public.entrenamientos (entrenador_id);
create index if not exists idx_planes_tenant_id on public.planes (tenant_id);
create index if not exists idx_suscripciones_tenant_id on public.suscripciones (tenant_id);
create index if not exists idx_suscripciones_atleta_id on public.suscripciones (atleta_id);
create index if not exists idx_suscripciones_plan_id on public.suscripciones (plan_id);
create index if not exists idx_reservas_tenant_id on public.reservas (tenant_id);
create index if not exists idx_reservas_atleta_id on public.reservas (atleta_id);
create index if not exists idx_reservas_entrenamiento_id on public.reservas (entrenamiento_id);
create index if not exists idx_asistencias_tenant_id on public.asistencias (tenant_id);
create index if not exists idx_asistencias_validado_por on public.asistencias (validado_por);
create index if not exists idx_pagos_tenant_id on public.pagos (tenant_id);
create index if not exists idx_pagos_suscripcion_id on public.pagos (suscripcion_id);
create index if not exists idx_pagos_validado_por on public.pagos (validado_por);
create index if not exists idx_notificaciones_usuario_id on public.notificaciones (usuario_id);
create index if not exists idx_responsabilidades_tenant_id on public.responsabilidades (tenant_id);
create index if not exists idx_responsables_tenant_id on public.responsables (tenant_id);
create index if not exists idx_responsables_entrenamiento_id on public.responsables (entrenamiento_id);
create index if not exists idx_responsables_usuario_id on public.responsables (usuario_id);
create index if not exists idx_responsables_responsabilidad_id on public.responsables (responsabilidad_id);
create index if not exists idx_miembros_tenant_tenant_id on public.miembros_tenant (tenant_id);
create index if not exists idx_miembros_tenant_usuario_id on public.miembros_tenant (usuario_id);
create index if not exists idx_miembros_tenant_rol_id on public.miembros_tenant (rol_id);

-- =========================
-- RLS + POLICIES (SELECT autenticado)
-- =========================

alter table public.tenants enable row level security;
alter table public.roles enable row level security;
alter table public.usuarios enable row level security;
alter table public.miembros_tenant enable row level security;
alter table public.perfil_deportivo enable row level security;
alter table public.escenarios enable row level security;
alter table public.horarios_escenarios enable row level security;
alter table public.disciplinas enable row level security;
alter table public.entrenamientos enable row level security;
alter table public.planes enable row level security;
alter table public.responsabilidades enable row level security;
alter table public.responsables enable row level security;
alter table public.suscripciones enable row level security;
alter table public.reservas enable row level security;
alter table public.asistencias enable row level security;
alter table public.pagos enable row level security;
alter table public.notificaciones enable row level security;

grant select on table
  public.tenants,
  public.roles,
  public.usuarios,
  public.miembros_tenant,
  public.perfil_deportivo,
  public.escenarios,
  public.horarios_escenarios,
  public.disciplinas,
  public.entrenamientos,
  public.planes,
  public.responsabilidades,
  public.responsables,
  public.suscripciones,
  public.reservas,
  public.asistencias,
  public.pagos,
  public.notificaciones
to authenticated;

drop policy if exists tenants_select_authenticated on public.tenants;
create policy tenants_select_authenticated on public.tenants
  for select to authenticated
  using (true);

drop policy if exists roles_select_authenticated on public.roles;
create policy roles_select_authenticated on public.roles
  for select to authenticated
  using (true);

drop policy if exists usuarios_select_authenticated on public.usuarios;
create policy usuarios_select_authenticated on public.usuarios
  for select to authenticated
  using (true);

drop policy if exists miembros_tenant_select_authenticated on public.miembros_tenant;
create policy miembros_tenant_select_authenticated on public.miembros_tenant
  for select to authenticated
  using (true);

drop policy if exists perfil_deportivo_select_authenticated on public.perfil_deportivo;
create policy perfil_deportivo_select_authenticated on public.perfil_deportivo
  for select to authenticated
  using (true);

drop policy if exists escenarios_select_authenticated on public.escenarios;
create policy escenarios_select_authenticated on public.escenarios
  for select to authenticated
  using (true);

drop policy if exists horarios_escenarios_select_authenticated on public.horarios_escenarios;
create policy horarios_escenarios_select_authenticated on public.horarios_escenarios
  for select to authenticated
  using (true);

drop policy if exists disciplinas_select_authenticated on public.disciplinas;
create policy disciplinas_select_authenticated on public.disciplinas
  for select to authenticated
  using (true);

drop policy if exists entrenamientos_select_authenticated on public.entrenamientos;
create policy entrenamientos_select_authenticated on public.entrenamientos
  for select to authenticated
  using (true);

drop policy if exists planes_select_authenticated on public.planes;
create policy planes_select_authenticated on public.planes
  for select to authenticated
  using (true);

drop policy if exists responsabilidades_select_authenticated on public.responsabilidades;
create policy responsabilidades_select_authenticated on public.responsabilidades
  for select to authenticated
  using (true);

drop policy if exists responsables_select_authenticated on public.responsables;
create policy responsables_select_authenticated on public.responsables
  for select to authenticated
  using (true);

drop policy if exists suscripciones_select_authenticated on public.suscripciones;
create policy suscripciones_select_authenticated on public.suscripciones
  for select to authenticated
  using (true);

drop policy if exists reservas_select_authenticated on public.reservas;
create policy reservas_select_authenticated on public.reservas
  for select to authenticated
  using (true);

drop policy if exists asistencias_select_authenticated on public.asistencias;
create policy asistencias_select_authenticated on public.asistencias
  for select to authenticated
  using (true);

drop policy if exists pagos_select_authenticated on public.pagos;
create policy pagos_select_authenticated on public.pagos
  for select to authenticated
  using (true);

drop policy if exists notificaciones_select_authenticated on public.notificaciones;
create policy notificaciones_select_authenticated on public.notificaciones
  for select to authenticated
  using (true);

commit;

-- =============================================
-- ROLLBACK (manual)
-- Ejecutar este bloque SOLO si necesitas revertir la migración.
-- =============================================

/*
begin;

-- Policies
drop policy if exists notificaciones_select_authenticated on public.notificaciones;
drop policy if exists pagos_select_authenticated on public.pagos;
drop policy if exists asistencias_select_authenticated on public.asistencias;
drop policy if exists reservas_select_authenticated on public.reservas;
drop policy if exists suscripciones_select_authenticated on public.suscripciones;
drop policy if exists responsables_select_authenticated on public.responsables;
drop policy if exists responsabilidades_select_authenticated on public.responsabilidades;
drop policy if exists planes_select_authenticated on public.planes;
drop policy if exists entrenamientos_select_authenticated on public.entrenamientos;
drop policy if exists disciplinas_select_authenticated on public.disciplinas;
drop policy if exists horarios_escenarios_select_authenticated on public.horarios_escenarios;
drop policy if exists escenarios_select_authenticated on public.escenarios;
drop policy if exists perfil_deportivo_select_authenticated on public.perfil_deportivo;
drop policy if exists miembros_tenant_select_authenticated on public.miembros_tenant;
drop policy if exists usuarios_select_authenticated on public.usuarios;
drop policy if exists roles_select_authenticated on public.roles;
drop policy if exists tenants_select_authenticated on public.tenants;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_auth_user();

-- Tables (orden inverso por dependencias)
drop table if exists public.notificaciones;
drop table if exists public.pagos;
drop table if exists public.asistencias;
drop table if exists public.reservas;
drop table if exists public.suscripciones;
drop table if exists public.responsables;
drop table if exists public.responsabilidades;
drop table if exists public.planes;
drop table if exists public.entrenamientos;
drop table if exists public.horarios_escenarios;
drop table if exists public.escenarios;
drop table if exists public.disciplinas;
drop table if exists public.perfil_deportivo;
drop table if exists public.miembros_tenant;
drop table if exists public.usuarios;
drop table if exists public.roles;
drop table if exists public.tenants;

commit;
*/
