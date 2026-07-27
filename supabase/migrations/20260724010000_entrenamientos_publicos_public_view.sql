-- =============================================
-- Migration: Public read view for the landing page
-- US-0091: entrenamientos_publicos_view — exposes only public-safe columns
-- of entrenamientos_publicos (+ joined disciplinas/escenarios/tenants) plus a
-- live reservas_activas count, for anonymous (unauthenticated) consumption.
--
-- This view runs with the privileges of its owner (the migration role),
-- which bypasses RLS on the tables it references as their owner. That is
-- intentional and is what lets `anon` read through it — do NOT change this
-- to `select *` or add columns that aren't safe to show to a visitor with
-- no session. No existing grant/policy on entrenamientos_publicos, reservas,
-- disciplinas, escenarios, or tenants is modified by this migration.
-- =============================================

begin;

create view public.entrenamientos_publicos_view as
select
  ep.id,
  ep.tenant_id,
  ep.entrenamiento_id,
  ep.nombre,
  ep.descripcion,
  ep.disciplina_id,
  ep.fecha_hora,
  ep.duracion_minutos,
  ep.cupo_maximo,
  ep.punto_encuentro,
  ep.reserva_antelacion_horas,
  ep.cancelacion_antelacion_horas,
  ep.precio,
  ep.banner_url,
  ep.created_at,
  d.nombre as disciplina_nombre,
  e.nombre as escenario_nombre,
  e.ubicacion as escenario_ubicacion,
  t.nombre as tenant_nombre,
  t.logo_url as tenant_logo_url,
  coalesce(r.reservas_activas, 0) as reservas_activas
from public.entrenamientos_publicos ep
join public.disciplinas d on d.id = ep.disciplina_id
join public.escenarios e on e.id = ep.escenario_id
join public.tenants t on t.id = ep.tenant_id
left join lateral (
  select count(*) as reservas_activas
  from public.reservas r
  where r.entrenamiento_id = ep.entrenamiento_id
    and r.estado <> 'cancelada'
) r on true
where ep.activo = true
  and ep.fecha_hora >= now();

grant select on public.entrenamientos_publicos_view to anon, authenticated;

commit;
