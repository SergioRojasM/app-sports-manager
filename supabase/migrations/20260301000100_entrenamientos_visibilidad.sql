-- =============================================
-- Migración: Visibilidad de entrenamientos (público/privado)
-- US-0013: Training Visibility Feature
-- =============================================

begin;

-- 1. Agregar columna visibilidad (publico | privado)
alter table public.entrenamientos
  add column if not exists visibilidad varchar(10) not null default 'privado';

-- 2. Agregar columna visible_para (FK a tenants)
alter table public.entrenamientos
  add column if not exists visible_para uuid;

-- 3. CHECK constraint para valores válidos de visibilidad
alter table public.entrenamientos
  add constraint entrenamientos_visibilidad_ck
  check (visibilidad in ('publico', 'privado'));

-- 4. FK constraint visible_para -> tenants(id)
alter table public.entrenamientos
  add constraint entrenamientos_visible_para_fkey
  foreign key (visible_para) references public.tenants(id) on delete set null;

-- 5. Backfill: visible_para = tenant_id para todos los privados existentes
update public.entrenamientos
  set visible_para = tenant_id
  where visibilidad = 'privado' and visible_para is null;

-- 6. Índices para consultas por visibilidad
create index if not exists idx_entrenamientos_visibilidad on public.entrenamientos (visibilidad);
create index if not exists idx_entrenamientos_visible_para on public.entrenamientos (visible_para);

-- 7. Actualizar RLS SELECT policy para permitir acceso cross-tenant a entrenamientos públicos
--    Condición: visibilidad = 'publico' OR el usuario es miembro del tenant del entrenamiento
drop policy if exists entrenamientos_select_authenticated on public.entrenamientos;
create policy entrenamientos_select_authenticated on public.entrenamientos
  for select to authenticated
  using (
    visibilidad = 'publico'
    or exists (
      select 1
      from public.miembros_tenant mt
      where mt.tenant_id = entrenamientos.tenant_id
        and mt.usuario_id = auth.uid()
    )
  );

commit;
