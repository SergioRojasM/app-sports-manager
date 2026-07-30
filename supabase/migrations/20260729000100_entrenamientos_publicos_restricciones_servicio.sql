-- ============================================================
-- US-0094: allow publishing trainings with service-based restrictions
--
-- US-0089 blocked publishing any training carrying a servicio_*_id
-- restriction, on the premise that "a cross-tenant visitor can never hold a
-- subscription/service in a tenant they aren't a member of". US-0093
-- invalidated that premise: a non-member can buy a public plan, which creates
-- a subscription in the tenant and populates suscripcion_servicios.
--
-- The booking pipeline was already tenant+athlete scoped, never membership
-- scoped (getServicioEntitlements never joins miembros_tenant, and the
-- membership lookup in validateBookingRestrictions only runs inside the
-- `if (row.usuario_estado)` branch), so a service-only restriction row is
-- already satisfiable by a paying non-member.
--
-- The gate is therefore RETARGETED, not removed: publication is blocked only
-- when NO restriction row can be satisfied without membership.
-- ============================================================

begin;

-- ─────────────────────────────────────────────
-- 1. Drop the US-0089 rule
-- ─────────────────────────────────────────────
drop trigger if exists entrenamientos_publicos_no_servicio_restriccion on public.entrenamientos_publicos;
drop function if exists public.check_entrenamiento_publico_sin_restriccion_servicio();

-- ─────────────────────────────────────────────
-- 2. New rule: block membership-only restrictions
--
-- Restriction rows are OR-ed at booking time (validateBookingRestrictions
-- returns on the first passing row) and the conditions WITHIN a row are ANDed.
-- So the block must be "no row is satisfiable without membership", NOT "some
-- row is membership-only" — the latter would wrongly reject a training that
-- also has a service-only row a non-member can satisfy.
--
--   block  ⇔  exists(rows)  AND  not exists(row free of membership conditions)
--
-- A row is "free" when usuario_estado IS NULL and validar_nivel_disciplina is
-- not true. Timing constraints (reserva/cancelacion_antelacion_horas) live on
-- `entrenamientos`, not here, so they never block.
-- ─────────────────────────────────────────────
create or replace function public.check_entrenamiento_publico_restricciones_membresia()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.entrenamiento_restricciones er
    where er.entrenamiento_id = new.entrenamiento_id
  )
  and not exists (
    select 1
    from public.entrenamiento_restricciones er
    where er.entrenamiento_id = new.entrenamiento_id
      and er.usuario_estado is null
      and coalesce(er.validar_nivel_disciplina, false) = false
  ) then
    raise exception
      'No se puede publicar un entrenamiento cuyas restricciones solo pueden cumplirse siendo miembro de la organización.';
  end if;

  return new;
end;
$$;

drop trigger if exists entrenamientos_publicos_restricciones_membresia on public.entrenamientos_publicos;
create trigger entrenamientos_publicos_restricciones_membresia
  before insert or update on public.entrenamientos_publicos
  for each row execute function public.check_entrenamiento_publico_restricciones_membresia();

-- ─────────────────────────────────────────────
-- 3. Required-service names for the AUTHENTICATED marketplace
--
-- Like any view, this runs with its owner's privileges, so it resolves service
-- names without granting anyone direct SELECT on `servicios` or
-- `entrenamiento_restricciones` (both hardened in US-0093). An authenticated
-- NON-MEMBER cannot read `servicios` for a service that no public plan grants,
-- which is exactly the case this view exists to cover.
--
-- Granted to `authenticated` ONLY — never to `anon`. Service names are tenant
-- catalog data and must not reach an unauthenticated surface. The anonymous
-- landing page keeps using `entrenamientos_publicos_view`, which this migration
-- deliberately does NOT touch (no new column, no grant change).
-- ─────────────────────────────────────────────
create or replace view public.entrenamientos_publicos_servicios_view as
select
  ep.entrenamiento_id,
  coalesce(
    (
      select array_agg(distinct s.nombre order by s.nombre)
      from public.entrenamiento_restricciones er
      cross join lateral (
        values (er.servicio_1_id), (er.servicio_2_id), (er.servicio_3_id), (er.servicio_4_id)
      ) as slot(servicio_id)
      join public.servicios s on s.id = slot.servicio_id
      where er.entrenamiento_id = ep.entrenamiento_id
    ),
    array[]::text[]
  ) as servicios_requeridos
from public.entrenamientos_publicos ep
where ep.activo = true
  and ep.fecha_hora >= now();

-- Supabase ships ALTER DEFAULT PRIVILEGES granting ALL on new objects in
-- `public` to anon, authenticated and service_role. A bare `grant select ... to
-- authenticated` is therefore a no-op: anon would still read this view, and —
-- because this view is simple enough to be AUTO-UPDATABLE — anon/authenticated
-- would also hold INSERT/UPDATE/DELETE on it. Writing through a view runs with
-- the view owner's privileges, which would bypass RLS on entrenamientos_publicos
-- entirely. So revoke everything first, then grant only what is needed.
revoke all on public.entrenamientos_publicos_servicios_view from anon, authenticated;
grant select on public.entrenamientos_publicos_servicios_view to authenticated;

commit;
