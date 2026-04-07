-- =============================================
-- Migration: Add tenant_regla_suspension_id FK to miembros_tenant
-- and recreate v_miembros_equipo with rule columns
-- US-0055: Assign Suspension Rules to Team Members
-- =============================================

begin;

-- 1. Add nullable FK column to miembros_tenant
alter table public.miembros_tenant
  add column if not exists tenant_regla_suspension_id uuid null;

alter table public.miembros_tenant
  add constraint miembros_tenant_regla_suspension_fkey
    foreign key (tenant_regla_suspension_id)
    references public.tenant_reglas_suspension(id)
    on delete set null;

create index if not exists idx_miembros_tenant_regla_suspension
  on public.miembros_tenant (tenant_regla_suspension_id)
  where tenant_regla_suspension_id is not null;

-- 2. Recreate v_miembros_equipo including the new column + rule name
drop view if exists public.v_miembros_equipo;

create view public.v_miembros_equipo as
select
  mt.id,
  mt.tenant_id,
  mt.usuario_id,
  mt.rol_id,
  mt.estado,
  mt.tenant_regla_suspension_id,
  trs.nombre as regla_suspension_nombre,
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
left join public.tenant_reglas_suspension trs on trs.id = mt.tenant_regla_suspension_id
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
