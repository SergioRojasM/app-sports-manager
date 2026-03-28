-- =============================================
-- Migration: Recreate v_miembros_equipo with fecha_nacimiento & fecha_exp_identificacion
-- US-0045: Add ID issue date and birth date fields
-- =============================================

begin;

drop view if exists public.v_miembros_equipo;

create view public.v_miembros_equipo as
select
  mt.id,
  mt.tenant_id,
  mt.usuario_id,
  mt.rol_id,
  mt.estado,
  u.nombre,
  u.apellido,
  u.tipo_identificacion,
  u.numero_identificacion,
  u.fecha_nacimiento,
  u.fecha_exp_identificacion,
  u.telefono,
  u.email,
  u.foto_url,
  u.rh,
  r.nombre as rol_nombre,
  coalesce(faltas.cnt, 0)::int as inasistencias_recientes
from public.miembros_tenant mt
join public.usuarios u on u.id = mt.usuario_id
join public.roles r on r.id = mt.rol_id
left join lateral (
  select count(*)::int as cnt
  from public.asistencias a
  join public.reservas rv on rv.id = a.reserva_id
  where rv.atleta_id = mt.usuario_id
    and rv.tenant_id = mt.tenant_id
    and a.asistio = false
    and a.created_at >= now() - interval '30 days'
) faltas on true;

grant select on public.v_miembros_equipo to authenticated;

commit;
