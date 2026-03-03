-- Add identification and RH columns to usuarios
alter table public.usuarios
  add column if not exists tipo_identificacion varchar(20),
  add column if not exists numero_identificacion varchar(30),
  add column if not exists rh varchar(10);

-- Check constraint: tipo_identificacion must be one of the allowed values
alter table public.usuarios
  add constraint usuarios_tipo_identificacion_ck
    check (tipo_identificacion in ('CC', 'CE', 'TI', 'NIT', 'Pasaporte', 'Otro'));

-- Check constraint: estado must be one of the allowed values
alter table public.usuarios
  add constraint usuarios_estado_ck
    check (estado in ('activo', 'mora', 'suspendido', 'inactivo'));

-- NOTE: miembros_tenant already has a SELECT policy for all authenticated users
-- (miembros_tenant_select_authenticated with using(true)), so an admin-specific
-- policy is redundant and skipped per design decision D6.
