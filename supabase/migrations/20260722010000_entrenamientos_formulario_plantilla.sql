-- =============================================
-- Migration: Attach form templates to trainings
-- US-0086: formulario_id + formulario_obligatorio on entrenamientos / entrenamientos_grupo
-- =============================================

-- 1. entrenamientos_grupo: new columns
alter table public.entrenamientos_grupo
  add column if not exists formulario_id uuid default null,
  add column if not exists formulario_obligatorio boolean not null default false;

alter table public.entrenamientos_grupo
  add constraint entrenamientos_grupo_formulario_id_fkey
    foreign key (formulario_id) references public.formularios_plantillas(id) on delete set null;

alter table public.entrenamientos_grupo
  add constraint entrenamientos_grupo_formulario_exclusivo_ck
    check (not (formulario_id is not null and formulario_externo is not null));

alter table public.entrenamientos_grupo
  add constraint entrenamientos_grupo_formulario_obligatorio_ck
    check (formulario_obligatorio = false or formulario_id is not null or formulario_externo is not null);

create index if not exists idx_entrenamientos_grupo_formulario_id
  on public.entrenamientos_grupo (formulario_id);

-- 2. entrenamientos: new columns
alter table public.entrenamientos
  add column if not exists formulario_id uuid default null,
  add column if not exists formulario_obligatorio boolean not null default false;

alter table public.entrenamientos
  add constraint entrenamientos_formulario_id_fkey
    foreign key (formulario_id) references public.formularios_plantillas(id) on delete set null;

alter table public.entrenamientos
  add constraint entrenamientos_formulario_exclusivo_ck
    check (not (formulario_id is not null and formulario_externo is not null));

alter table public.entrenamientos
  add constraint entrenamientos_formulario_obligatorio_ck
    check (formulario_obligatorio = false or formulario_id is not null or formulario_externo is not null);

create index if not exists idx_entrenamientos_formulario_id
  on public.entrenamientos (formulario_id);
