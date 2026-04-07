-- ============================================================================
-- Migration: Automated Suspension Evaluation Cron (US-0056)
-- ============================================================================
-- This migration:
-- 1. Makes registrado_por nullable on miembros_tenant_novedades (NULL = system action)
-- 2. Adds validacion_suspension column to asistencias
-- 3. Creates evaluar_suspensiones_cron() function
-- 4. Creates reactivar_suspensiones_expiradas() function
-- 5. Schedules daily cron job at 06:00 UTC (01:00 AM Colombia)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Make registrado_por nullable (system-automated actions have no user)
-- ----------------------------------------------------------------------------
ALTER TABLE public.miembros_tenant_novedades
  ALTER COLUMN registrado_por DROP NOT NULL;

COMMENT ON COLUMN public.miembros_tenant_novedades.registrado_por IS
  'UUID of the user who triggered the change. NULL indicates an automated system action (e.g., cron job).';

-- ----------------------------------------------------------------------------
-- 2. Add validacion_suspension column to asistencias
-- ----------------------------------------------------------------------------
ALTER TABLE public.asistencias
  ADD COLUMN IF NOT EXISTS validacion_suspension BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_asistencias_no_validadas
  ON public.asistencias (tenant_id)
  WHERE asistio = false AND validacion_suspension = false;

-- ----------------------------------------------------------------------------
-- 3. Function: evaluar_suspensiones_cron()
-- Evaluates active members with assigned suspension rules.
-- Counts unprocessed absences per rule criteria and suspends members
-- exceeding the threshold. Marks processed absences.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluar_suspensiones_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_public_tenant_id CONSTANT uuid := '2a089688-3cfc-4216-9372-33f50079fbd1';
  r RECORD;
  v_absence_count INT;
  v_absence_ids UUID[];
BEGIN
  FOR r IN
    SELECT
      mt.id         AS miembro_id,
      mt.tenant_id,
      mt.usuario_id,
      trs.id        AS regla_id,
      trs.nombre    AS regla_nombre,
      trs.num_inasistencias,
      trs.por_suscripcion,
      trs.por_dias_atras,
      trs.duracion
    FROM miembros_tenant mt
    JOIN tenant_reglas_suspension trs
      ON trs.id = mt.tenant_regla_suspension_id
    WHERE mt.estado = 'activo'
      AND mt.tenant_regla_suspension_id IS NOT NULL
      AND trs.activo = true
      AND mt.tenant_id <> v_public_tenant_id
  LOOP
    -- Count unprocessed absences matching the rule criteria
    SELECT
      COUNT(*)::int,
      ARRAY_AGG(a.id)
    INTO v_absence_count, v_absence_ids
    FROM asistencias a
    JOIN reservas rv ON rv.id = a.reserva_id
    WHERE rv.atleta_id   = r.usuario_id
      AND a.tenant_id    = r.tenant_id
      AND a.asistio       = false
      AND a.validacion_suspension = false
      -- por_dias_atras filter: pass all rows when 0 (disabled)
      AND (r.por_dias_atras = 0
           OR a.fecha_asistencia >= NOW() - (r.por_dias_atras || ' days')::interval)
      -- por_suscripcion filter: pass all rows when false (disabled)
      AND (r.por_suscripcion = false
           OR EXISTS (
             SELECT 1 FROM suscripciones s
             WHERE s.atleta_id  = r.usuario_id
               AND s.tenant_id  = r.tenant_id
               AND s.estado     = 'activa'
               AND a.fecha_asistencia >= s.fecha_inicio
               AND a.fecha_asistencia <= s.fecha_fin
           ));

    IF v_absence_count >= r.num_inasistencias THEN
      -- Suspend the member
      UPDATE miembros_tenant
         SET estado = 'suspendido'
       WHERE id = r.miembro_id;

      -- Create audit record
      INSERT INTO miembros_tenant_novedades
        (tenant_id, miembro_id, tipo, descripcion, estado_resultante, registrado_por)
      VALUES (
        r.tenant_id,
        r.miembro_id,
        'inasistencias_acumuladas',
        format('Suspensión automática por regla: %s. Inasistencias contabilizadas: %s', r.regla_nombre, v_absence_count),
        'suspendido',
        NULL
      );

      -- Mark processed absences
      UPDATE asistencias
         SET validacion_suspension = true
       WHERE id = ANY(v_absence_ids);
    END IF;
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Function: reactivar_suspensiones_expiradas()
-- Reactivates members whose temporary suspension (duracion > 0) has elapsed.
-- Members with duracion = 0 (permanent) are never auto-reactivated.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reactivar_suspensiones_expiradas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_suspension_date TIMESTAMPTZ;
BEGIN
  FOR r IN
    SELECT
      mt.id         AS miembro_id,
      mt.tenant_id,
      trs.duracion,
      trs.nombre    AS regla_nombre
    FROM miembros_tenant mt
    JOIN tenant_reglas_suspension trs
      ON trs.id = mt.tenant_regla_suspension_id
    WHERE mt.estado = 'suspendido'
      AND mt.tenant_regla_suspension_id IS NOT NULL
      AND trs.activo = true
      AND trs.duracion > 0
  LOOP
    -- Find the most recent suspension novedad
    SELECT n.created_at INTO v_suspension_date
    FROM miembros_tenant_novedades n
    WHERE n.miembro_id = r.miembro_id
      AND n.tenant_id  = r.tenant_id
      AND n.tipo = 'inasistencias_acumuladas'
      AND n.estado_resultante = 'suspendido'
    ORDER BY n.created_at DESC
    LIMIT 1;

    -- Reactivate if suspension period has elapsed
    IF v_suspension_date IS NOT NULL
       AND v_suspension_date + (r.duracion || ' days')::interval <= NOW()
    THEN
      UPDATE miembros_tenant
         SET estado = 'activo'
       WHERE id = r.miembro_id;

      INSERT INTO miembros_tenant_novedades
        (tenant_id, miembro_id, tipo, descripcion, estado_resultante, registrado_por)
      VALUES (
        r.tenant_id,
        r.miembro_id,
        'reactivacion',
        format('Reactivación automática. Suspensión por regla "%s" expirada tras %s días.', r.regla_nombre, r.duracion),
        'activo',
        NULL
      );
    END IF;
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Schedule daily cron job: 06:00 UTC = 01:00 AM Colombia (UTC-5)
-- Order: reactivate first, then evaluate (allows re-suspension if needed)
-- ----------------------------------------------------------------------------
SELECT cron.schedule(
  'evaluar-suspensiones-diarias',
  '0 6 * * *',
  $$SELECT reactivar_suspensiones_expiradas(); SELECT evaluar_suspensiones_cron();$$
);
