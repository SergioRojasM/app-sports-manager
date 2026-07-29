-- ============================================================
-- US-0094 (fix): the booking rejection must name the required service
--
-- `validateBookingRestrictions` builds its message by reading
-- servicios.nombre directly. After US-0093 hardened the `servicios` SELECT
-- policy (member OR granted by a public+active plan OR already held), a
-- NON-MEMBER matches none of those branches when no public plan grants the
-- service — the read returns null and the message degrades to the generic
-- "el servicio requerido", which defeats the whole point of telling the
-- visitor what to buy.
--
-- Fix at the source: a service required by an ACTIVE, FUTURE published
-- training is readable by any authenticated user. This exposes nothing new —
-- `entrenamientos_publicos_servicios_view` already serves exactly these names
-- to `authenticated` for the marketplace card. Still nothing for `anon`: the
-- policy is `to authenticated`.
-- ============================================================

begin;

drop policy if exists servicios_select_authenticated on public.servicios;
create policy servicios_select_authenticated on public.servicios
  for select to authenticated
  using (
    -- member of the service's tenant
    tenant_id in (
      select mt.tenant_id
      from public.get_member_tenants_for_authenticated_user() mt
    )
    -- granted by a public, active plan (US-0093)
    or exists (
      select 1
      from public.plan_tipos_servicios pts
      join public.plan_tipos pt on pt.id = pts.plan_tipo_id
      join public.planes     p  on p.id  = pt.plan_id
      where pts.servicio_id = servicios.id
        and p.es_publico
        and p.activo
    )
    -- required by an active, future published training (US-0094): the visitor
    -- must be told which service to acquire when their booking is rejected
    or exists (
      select 1
      from public.entrenamiento_restricciones er
      join public.entrenamientos_publicos ep on ep.entrenamiento_id = er.entrenamiento_id
      where ep.activo = true
        and ep.fecha_hora >= now()
        and servicios.id in (er.servicio_1_id, er.servicio_2_id, er.servicio_3_id, er.servicio_4_id)
    )
    -- already holds units of it (US-0093)
    or exists (
      select 1
      from public.suscripcion_servicios ss
      join public.suscripciones su on su.id = ss.suscripcion_id
      where ss.servicio_id = servicios.id
        and su.atleta_id = auth.uid()
    )
  );

commit;
