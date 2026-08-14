-- =============================================
-- Migration: Widen entrenamientos_publicos.banner_url
-- US-0100: banner_url stores a Supabase Storage signed URL (JWT-bearing
-- query string), which routinely exceeds 500 characters and was being
-- rejected by the varchar(500) cap. Switch to unrestricted text; the view
-- must be dropped/recreated since it directly projects this column.
-- =============================================

begin;

drop view public.entrenamientos_publicos_view;

alter table public.entrenamientos_publicos
  alter column banner_url type text;

-- Recreate the view exactly as defined in
-- 20260724010000_entrenamientos_publicos_public_view.sql, now inheriting
-- banner_url as text.
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

-- Supabase ships ALTER DEFAULT PRIVILEGES granting ALL on new objects in
-- `public` to anon, authenticated and service_role. A bare `grant select ...`
-- does not remove that broader ALL grant re-applied by recreating the view
-- (see 20260729000100_entrenamientos_publicos_restricciones_servicio.sql for
-- the same fix applied to entrenamientos_publicos_servicios_view) — revoke
-- everything first, then grant only what is needed.
revoke all on public.entrenamientos_publicos_view from anon, authenticated;
grant select on public.entrenamientos_publicos_view to anon, authenticated;

commit;
