-- =============================================
-- Migration: Recreate reservas_reporte_view with fecha_nacimiento & fecha_exp_identificacion
-- US-0045: Add ID issue date and birth date fields
-- =============================================

DROP VIEW IF EXISTS public.reservas_reporte_view;

CREATE VIEW public.reservas_reporte_view AS
SELECT
  r.id                          AS reserva_id,
  r.tenant_id,
  r.entrenamiento_id,
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
  LEFT  JOIN public.disciplinas       d   ON d.id  = e.disciplina_id
  LEFT  JOIN public.escenarios        s   ON s.id  = e.escenario_id
  LEFT  JOIN public.entrenamiento_categorias ec ON ec.id = r.entrenamiento_categoria_id
  LEFT  JOIN public.nivel_disciplina  nd  ON nd.id = ec.nivel_id
  LEFT  JOIN public.asistencias       asi ON asi.reserva_id = r.id
  LEFT  JOIN public.usuarios          v   ON v.id  = asi.validado_por;

GRANT SELECT ON public.reservas_reporte_view TO authenticated;
