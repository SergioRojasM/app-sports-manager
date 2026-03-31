-- US-0051: Remove precio, vigencia_meses, clases_incluidas from planes
-- These fields are now exclusively on plan_tipos.

alter table public.planes
  drop column if exists precio,
  drop column if exists vigencia_meses,
  drop column if exists clases_incluidas;

-- Drop constraints that referenced those columns (if they still exist)
alter table public.planes
  drop constraint if exists planes_precio_ck,
  drop constraint if exists planes_clases_ck;
