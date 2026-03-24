-- =============================================
-- Migration: View v_miembros_equipo (flat shape + inasistencias counter)
-- US-0037: Tenant Member Status Management
-- =============================================
-- Depends on: miembros_tenant.estado (migration 20260320000100)

begin;

create or replace view public.v_miembros_equipo as
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

-- Grant select so the view is queryable via PostgREST
grant select on public.v_miembros_equipo to authenticated;

commit;
