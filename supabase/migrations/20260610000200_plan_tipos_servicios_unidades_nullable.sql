-- Allow unidades to be NULL (NULL = unlimited)
-- Drop the existing NOT NULL + check constraint, then re-add only the check for positive values

alter table public.plan_tipos_servicios
  alter column unidades drop not null,
  alter column unidades set default null,
  drop constraint if exists plan_tipos_servicios_unidades_ck;

alter table public.plan_tipos_servicios
  add constraint plan_tipos_servicios_unidades_ck
    check (unidades is null or unidades >= 1);
