-- ============================================================
-- US-0093 (fix): INSERT ... RETURNING on planes / servicios
--
-- 20260728000100 wrote the SELECT policies of `planes` and `servicios` as
-- `using (can_read_plan(id))` / `using (can_read_servicio(id))`. Both helpers
-- are STABLE and re-query THEIR OWN table, so they evaluate against the
-- snapshot taken at the start of the statement — where the row being inserted
-- does not exist yet.
--
-- PostgREST issues `INSERT ... RETURNING` (`.insert().select().single()`), and
-- RETURNING requires the SELECT policy to pass on the new row. Result:
-- "42501 new row violates row-level security policy" when an administrator
-- created a plan or a service, even though the INSERT policy itself passed
-- (an insert with `Prefer: return=minimal` succeeded).
--
-- Fix: express both predicates over the row's OWN columns instead of
-- re-querying the same table. Subqueries against OTHER tables are fine —
-- those rows already exist before the statement.
--
-- `can_read_plan(uuid)` is kept: `plan_tipos` and `planes_disciplina` call it
-- on their PARENT plan, which always pre-exists, so RETURNING works there.
-- `can_read_servicio(uuid)` becomes unused and is dropped.
-- ============================================================

begin;

-- ─────────────────────────────────────────────
-- 1. planes — same rule, no self-query
-- ─────────────────────────────────────────────
drop policy if exists planes_select_authenticated on public.planes;
create policy planes_select_authenticated on public.planes
  for select to authenticated
  using (
    -- public catalog: public AND active
    (es_publico and activo)
    -- member of the owning tenant (any role, any membership state)
    or tenant_id in (
      select mt.tenant_id
      from public.get_member_tenants_for_authenticated_user() mt
    )
    -- already subscribed: keeps the buyer's own rows readable after an un-publish
    or id in (
      select s.plan_id
      from public.suscripciones s
      where s.atleta_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 2. servicios — same rule, no self-query
-- ─────────────────────────────────────────────
drop policy if exists servicios_select_authenticated on public.servicios;
create policy servicios_select_authenticated on public.servicios
  for select to authenticated
  using (
    tenant_id in (
      select mt.tenant_id
      from public.get_member_tenants_for_authenticated_user() mt
    )
    or exists (
      select 1
      from public.plan_tipos_servicios pts
      join public.plan_tipos pt on pt.id = pts.plan_tipo_id
      join public.planes     p  on p.id  = pt.plan_id
      where pts.servicio_id = servicios.id
        and p.es_publico
        and p.activo
    )
    or exists (
      select 1
      from public.suscripcion_servicios ss
      join public.suscripciones su on su.id = ss.suscripcion_id
      where ss.servicio_id = servicios.id
        and su.atleta_id = auth.uid()
    )
  );

drop function if exists public.can_read_servicio(uuid);

commit;
