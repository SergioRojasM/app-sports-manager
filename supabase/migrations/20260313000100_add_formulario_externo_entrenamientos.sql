begin;

-- 1. Add formulario_externo to entrenamientos_grupo
alter table public.entrenamientos_grupo
  add column if not exists formulario_externo varchar(500) default null;

-- 2. Add formulario_externo to entrenamientos
alter table public.entrenamientos
  add column if not exists formulario_externo varchar(500) default null;

-- -- 3. Replace sync trigger function to include formulario_externo
-- create or replace function public.sync_entrenamientos_from_grupo()
-- returns trigger
-- language plpgsql
-- as $$
-- begin
--   update public.entrenamientos
--   set
--     nombre = new.nombre,
--     descripcion = new.descripcion,
--     punto_encuentro = new.punto_encuentro,
--     formulario_externo = new.formulario_externo,
--     disciplina_id = new.disciplina_id,
--     escenario_id = new.escenario_id,
--     entrenador_id = new.entrenador_id,
--     duracion_minutos = new.duracion_minutos,
--     cupo_maximo = new.cupo_maximo,
--     updated_at = timezone('utc', now())
--   where entrenamiento_grupo_id = new.id
--     and tenant_id = new.tenant_id
--     and (fecha_hora is null or fecha_hora >= timezone('utc', now()))
--     and coalesce(lower(estado), '') not in ('cancelado')
--     and coalesce(bloquear_sync_grupo, false) = false;

--   return new;
-- end;
-- $$;

commit;
