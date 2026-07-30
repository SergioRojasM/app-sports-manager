-- =============================================
-- Migration: Recreate reservas_reporte_view with tenant_nombre
-- US-0097: Cross-tenant "Mis Reservas" needs the organization name per row
--
-- Also sets security_invoker = true (PG15+). The view is owned by `postgres`,
-- which has BYPASSRLS; without security_invoker, Postgres checks row-level
-- security using the VIEW OWNER's privileges rather than the querying role's,
-- so every prior version of this view silently bypassed RLS on `reservas`
-- entirely — any authenticated user could read every reservation across every
-- tenant directly via this view, regardless of the .eq() filters applied by
-- the service layer. security_invoker makes the view evaluate RLS as the
-- calling role, so the reservas_select_authenticated policy (fixed in the
-- companion migration 20260729190000) is what actually governs visibility.
-- =============================================

DROP VIEW IF EXISTS public.reservas_reporte_view;

CREATE VIEW public.reservas_reporte_view
WITH (security_invoker = true)
AS
SELECT
  r.id                          AS reserva_id,
  r.tenant_id,
  t.nombre                      AS tenant_nombre,
  r.entrenamiento_id,
  r.atleta_id,
  r.estado                      AS reserva_estado,
  r.fecha_reserva,
  r.fecha_cancelacion,
  r.notas                       AS notas_reserva,
  r.created_at,
  -- Athlete
  a.nombre                      AS atleta_nombre,
  a.apellido                    AS atleta_apellido,
  a.email                       AS atleta_email,
  a.telefono                    AS atleta_telefono,
  a.tipo_identificacion,
  a.numero_identificacion,
  a.fecha_nacimiento,
  a.fecha_exp_identificacion,
  -- Training
  e.nombre                      AS entrenamiento_nombre,
  e.fecha_hora                  AS entrenamiento_fecha,
  -- Discipline & Scenario
  d.nombre                      AS disciplina,
  s.nombre                      AS escenario,
  -- Category level
  nd.nombre                     AS nivel_disciplina,
  -- Attendance
  asi.asistio,
  asi.fecha_asistencia,
  asi.observaciones              AS observaciones_asistencia,
  -- Validator
  v.email                       AS validado_por_email
FROM public.reservas r
  INNER JOIN public.usuarios          a   ON a.id  = r.atleta_id
  INNER JOIN public.entrenamientos    e   ON e.id  = r.entrenamiento_id
  LEFT  JOIN public.tenants           t   ON t.id  = r.tenant_id
  LEFT  JOIN public.disciplinas       d   ON d.id  = e.disciplina_id
  LEFT  JOIN public.escenarios        s   ON s.id  = e.escenario_id
  LEFT  JOIN public.entrenamiento_categorias ec ON ec.id = r.entrenamiento_categoria_id
  LEFT  JOIN public.nivel_disciplina  nd  ON nd.id = ec.nivel_id
  LEFT  JOIN public.asistencias       asi ON asi.reserva_id = r.id
  LEFT  JOIN public.usuarios          v   ON v.id  = asi.validado_por;

GRANT SELECT ON public.reservas_reporte_view TO authenticated;
