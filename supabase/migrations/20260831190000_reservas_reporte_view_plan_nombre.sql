-- =============================================================================
-- Migration: surface the deducted plan and its validity window on the bookings
--            report (US-0112)
-- =============================================================================
--
-- Adds `plan_nombre`, `plan_fecha_inicio` and `plan_fecha_fin` to
-- `public.reservas_reporte_view`, which backs all three bookings-report
-- surfaces (per-training CSV, "Gestión de Reservas", "Mis Reservas").
--
-- The booking -> plan link is NOT a direct FK on `reservas`; it is resolved
-- through two distinct paths, and both are needed for full coverage:
--
--   1. `reserva_servicios` — the consumption ledger written by
--      `book_and_deduct_service_units`. Authoritative for confirmed bookings.
--   2. `reservas.suscripcion_id` — populated ONLY by the deferred plan-purchase
--      path (US-0106/US-0110), where the booking is inserted as 'pendiente'
--      alongside a not-yet-approved subscription and no units are deducted yet.
--
-- Each column is therefore `coalesce(<ledger lookup>, <direct lookup>)`.
-- The validity dates live on the SUBSCRIPTION, not on the plan: `planes` has no
-- date columns (`vigencia_meses` was dropped in 20260331000100) and
-- `plan_tipos.vigencia_dias` is only the catalog duration.
--
-- Because `reservas_reporte_view` is `security_invoker = true` (deliberately —
-- see 20260729190100), joined tables are evaluated with the CALLER's privileges.
-- `reserva_servicios` was readable only by the owning athlete or a tenant
-- administrador, but `entrenador` also has access to both Gestión de Reservas
-- and the per-training CSV, so its policy is widened to tenant staff below via
-- the existing trainer-or-admin helper. `planes` needs no change
-- (`planes_select_authenticated`).
--
-- `suscripciones` turned out NOT to be owner/admin-only as assumed: the blanket
-- policy `suscripciones_select_authenticated USING (true)` from the initial
-- migration (20260221000100:525) has been live since day one — the `drop` that
-- would have removed it sits inside that file's commented-out ROLLBACK block,
-- so it never ran. Every authenticated user could therefore read EVERY
-- subscription row in the database, across all tenants.
--
-- That matters here because the `su_dir` fallback below joins `suscripciones`
-- directly: leaving the blanket policy in place would surface other athletes'
-- (and other tenants') plan names and validity windows through the report to
-- any authenticated caller querying the view. The blanket policy is therefore
-- dropped, which makes the owner/admin/trainer policies actually load-bearing:
--
--   * suscripciones_select_own     — athlete reads their own subscriptions
--   * suscripciones_select_admin   — administrador reads their tenant's
--   * suscripciones_select_trainer — entrenador reads their tenant's (new)
--
-- The trainer policy is required beyond this report: `getServicioEntitlements`
-- (reservas.service.ts) reads `suscripciones` tenant+athlete-scoped when staff
-- book on behalf of an athlete, and was relying on the blanket policy to do so.
--
-- KNOWN LIMITATIONS (accepted, documented here on purpose):
--
--   * Cancelled bookings lose the link. `cancel_and_restore_service_units`
--     deletes the booking's `reserva_servicios` rows after restoring units
--     (20260612000100:243), so a cancelled booking reports NULL even though it
--     did consume a plan. Preserving it would require redesigning unit
--     restitution — out of scope.
--
--   * No backfill for unlimited plans. Bookings already created against an
--     unlimited entitlement stored `suscripcion_id = NULL` in
--     `reserva_servicios`; the accompanying write-path fix in
--     `findServiceSubscriptionsToCharge` applies going forward only, and the
--     historical value is not reconstructible.
--
--   * A booking spanning two subscriptions reports only the first.
--     `findServiceSubscriptionsToCharge` resolves each required service
--     independently (picking the entitlement with fewest remaining units), so a
--     training requiring e.g. "Clase" and "Sauna" can legitimately draw them
--     from two different plans. The view reports ONE, chosen deterministically,
--     because the three columns must stay coherent — a merged "Plan A, Plan B"
--     name could not be paired with a single start/end date. If the multi-plan
--     case turns out to be common, the follow-up is a separate per-service
--     breakdown, not widening these three columns.
-- =============================================================================

begin;

-- ── 0. Close the blanket read on suscripciones ───────────────────────────────
-- `USING (true)` from 20260221000100:525 — see the header. RLS policies are
-- OR-ed, so while this exists no other SELECT policy on the table constrains
-- anything. Dropping it is what makes the three scoped policies effective.
drop policy if exists suscripciones_select_authenticated on public.suscripciones;

-- ── 1. Widen suscripciones SELECT to tenant staff ────────────────────────────
-- RLS policies are OR-ed, so this is ADDED alongside the existing
-- `suscripciones_select_own` / `suscripciones_select_admin` without dropping
-- them. Note the trainer helper returns `table(tenant_id uuid)` — NOT
-- `setof tenants` like the admin helper — so the subquery selects `tenant_id`.
drop policy if exists suscripciones_select_trainer on public.suscripciones;
create policy suscripciones_select_trainer on public.suscripciones
  for select to authenticated
  using (
    tenant_id in (
      select tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user()
    )
  );

-- ── 2. Widen reserva_servicios SELECT to tenant staff ────────────────────────
-- Replaces the policy from 20260612000100:73, swapping the admin-only helper
-- for the trainer-or-admin one. The athlete branch is unchanged.
drop policy if exists reserva_servicios_select on public.reserva_servicios;
create policy reserva_servicios_select
  on public.reserva_servicios
  for select to authenticated
  using (
    reserva_id in (
      select r.id
      from public.reservas r
      where r.atleta_id = auth.uid()
         or r.tenant_id in (
           select tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user()
         )
    )
  );

-- ── 3. Recreate the report view with the three plan columns ──────────────────
-- Definition carried forward verbatim from 20260813180000 (which added
-- motivo_rechazo); only the three plan columns and their joins are new.
drop view if exists public.reservas_reporte_view;

create view public.reservas_reporte_view
with (security_invoker = true)
as
select
  r.id                          as reserva_id,
  r.tenant_id,
  t.nombre                      as tenant_nombre,
  r.entrenamiento_id,
  r.atleta_id,
  r.estado                      as reserva_estado,
  r.fecha_reserva,
  r.fecha_cancelacion,
  r.notas                       as notas_reserva,
  r.motivo_rechazo,
  r.created_at,
  -- Athlete
  a.nombre                      as atleta_nombre,
  a.apellido                    as atleta_apellido,
  a.email                       as atleta_email,
  a.telefono                    as atleta_telefono,
  a.tipo_identificacion,
  a.numero_identificacion,
  a.fecha_nacimiento,
  a.fecha_exp_identificacion,
  -- Training
  e.nombre                      as entrenamiento_nombre,
  e.fecha_hora                  as entrenamiento_fecha,
  -- Discipline & Scenario
  d.nombre                      as disciplina,
  s.nombre                      as escenario,
  -- Category level
  nd.nombre                     as nivel_disciplina,
  -- Attendance
  asi.asistio,
  asi.fecha_asistencia,
  asi.observaciones              as observaciones_asistencia,
  -- Validator
  v.email                       as validado_por_email,
  -- Plan the booking was deducted from, and that subscription's validity
  -- window (US-0112). All three come from the SAME subscription. Kept as real
  -- `date` columns (not pre-formatted text) so they stay sortable/comparable.
  coalesce(rsp.plan_nombre,   pl_dir.nombre)       as plan_nombre,
  coalesce(rsp.fecha_inicio,  su_dir.fecha_inicio) as plan_fecha_inicio,
  coalesce(rsp.fecha_fin,     su_dir.fecha_fin)    as plan_fecha_fin
from public.reservas r
  inner join public.usuarios          a   on a.id  = r.atleta_id
  inner join public.entrenamientos    e   on e.id  = r.entrenamiento_id
  left  join public.tenants           t   on t.id  = r.tenant_id
  left  join public.disciplinas       d   on d.id  = e.disciplina_id
  left  join public.escenarios        s   on s.id  = e.escenario_id
  left  join public.entrenamiento_categorias ec on ec.id = r.entrenamiento_categoria_id
  left  join public.nivel_disciplina  nd  on nd.id = ec.nivel_id
  left  join public.asistencias       asi on asi.reserva_id = r.id
  left  join public.usuarios          v   on v.id  = asi.validado_por
  -- Primary source: the consumption ledger. Picks ONE subscription rather than
  -- aggregating, so name and dates always describe the same one. A booking may
  -- consume several services; they normally share a single suscripcion.
  -- Ordering is for determinism, not preference: rs.created_at is typically
  -- identical across the rows (same transaction), so su.id breaks the tie.
  left join lateral (
    select p.nombre as plan_nombre, su.fecha_inicio, su.fecha_fin
      from public.reserva_servicios rs
      join public.suscripciones     su on su.id = rs.suscripcion_id
      join public.planes            p  on p.id  = su.plan_id
     where rs.reserva_id = r.id
     order by rs.created_at, su.id
     limit 1
  ) rsp on true
  -- Fallback: 'pendiente' booking riding on a plan purchase that is not yet
  -- approved, so no reserva_servicios row exists yet (US-0106/US-0110).
  left join public.suscripciones su_dir on su_dir.id = r.suscripcion_id
  left join public.planes        pl_dir on pl_dir.id = su_dir.plan_id;

grant select on public.reservas_reporte_view to authenticated;

commit;
