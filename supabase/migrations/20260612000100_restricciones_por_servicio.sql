-- ============================================================
-- US-0064: Training Restrictions by Service
-- Adds service-based access restriction columns to restriction
-- tables, creates reserva_servicios ledger, and implements
-- new book/cancel SECURITY DEFINER RPCs.
-- NOTE: plan_id and disciplina_id columns are intentionally
-- kept in both restriction tables. They will be dropped in a
-- future clean-up US once the service-based model is stable.
-- ============================================================

-- ── 1. entrenamiento_restricciones: add service columns + descripcion ─────────
ALTER TABLE public.entrenamiento_restricciones
  ADD COLUMN descripcion   text,
  ADD COLUMN servicio_1_id uuid REFERENCES public.servicios(id) ON DELETE SET NULL,
  ADD COLUMN servicio_2_id uuid REFERENCES public.servicios(id) ON DELETE SET NULL,
  ADD COLUMN servicio_3_id uuid REFERENCES public.servicios(id) ON DELETE SET NULL,
  ADD COLUMN servicio_4_id uuid REFERENCES public.servicios(id) ON DELETE SET NULL;

-- ── 2. entrenamiento_grupo_restricciones: same additions ──────────────────────
ALTER TABLE public.entrenamiento_grupo_restricciones
  ADD COLUMN descripcion   text,
  ADD COLUMN servicio_1_id uuid REFERENCES public.servicios(id) ON DELETE SET NULL,
  ADD COLUMN servicio_2_id uuid REFERENCES public.servicios(id) ON DELETE SET NULL,
  ADD COLUMN servicio_3_id uuid REFERENCES public.servicios(id) ON DELETE SET NULL,
  ADD COLUMN servicio_4_id uuid REFERENCES public.servicios(id) ON DELETE SET NULL;

-- ── 3. Partial indexes for service lookups ────────────────────────────────────
CREATE INDEX idx_ent_restricciones_servicio_1
  ON public.entrenamiento_restricciones (servicio_1_id)
  WHERE servicio_1_id IS NOT NULL;

CREATE INDEX idx_ent_restricciones_servicio_2
  ON public.entrenamiento_restricciones (servicio_2_id)
  WHERE servicio_2_id IS NOT NULL;

CREATE INDEX idx_eg_restricciones_servicio_1
  ON public.entrenamiento_grupo_restricciones (servicio_1_id)
  WHERE servicio_1_id IS NOT NULL;

CREATE INDEX idx_eg_restricciones_servicio_2
  ON public.entrenamiento_grupo_restricciones (servicio_2_id)
  WHERE servicio_2_id IS NOT NULL;

-- ── 4. reserva_servicios — ledger of service units deducted per booking ───────
CREATE TABLE IF NOT EXISTS public.reserva_servicios (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id     uuid        NOT NULL
    REFERENCES public.reservas(id) ON DELETE CASCADE,
  suscripcion_id uuid
    REFERENCES public.suscripciones(id) ON DELETE SET NULL,
  servicio_id    uuid        NOT NULL
    REFERENCES public.servicios(id) ON DELETE RESTRICT,
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT reserva_servicios_reserva_servicio_uk
    UNIQUE (reserva_id, servicio_id)
);

-- ── 5. Indexes on reserva_servicios ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reserva_servicios_reserva_id
  ON public.reserva_servicios (reserva_id);

CREATE INDEX IF NOT EXISTS idx_reserva_servicios_suscripcion_id
  ON public.reserva_servicios (suscripcion_id);

-- ── 6. RLS on reserva_servicios ───────────────────────────────────────────────
ALTER TABLE public.reserva_servicios ENABLE ROW LEVEL SECURITY;

-- SELECT only — all writes go through SECURITY DEFINER RPCs
GRANT SELECT ON TABLE public.reserva_servicios TO authenticated;

-- SELECT policy: own athlete or tenant admin (via reservas join)
DROP POLICY IF EXISTS reserva_servicios_select ON public.reserva_servicios;
CREATE POLICY reserva_servicios_select
  ON public.reserva_servicios
  FOR SELECT TO authenticated
  USING (
    reserva_id IN (
      SELECT r.id
      FROM public.reservas r
      WHERE r.atleta_id = auth.uid()
         OR r.tenant_id IN (
           SELECT t.id
           FROM public.get_admin_tenants_for_authenticated_user() t
         )
    )
  );

-- ── 7. book_and_deduct_service_units ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.book_and_deduct_service_units(
  p_tenant_id                  uuid,
  p_atleta_id                  uuid,
  p_entrenamiento_id           uuid,
  p_entrenamiento_categoria_id uuid    DEFAULT NULL,
  p_notas                      text    DEFAULT NULL,
  p_deductions                 jsonb   DEFAULT '[]'
)
RETURNS public.reservas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserva      public.reservas;
  v_item         jsonb;
  v_suscripcion  uuid;
  v_servicio     uuid;
  v_unlimited    boolean;
  v_rows         int;
BEGIN
  -- ── Pass 1: pre-validate all finite services before any write ──────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_deductions)
  LOOP
    v_suscripcion := (v_item->>'suscripcion_id')::uuid;
    v_servicio    := (v_item->>'servicio_id')::uuid;

    IF v_suscripcion IS NOT NULL THEN
      SELECT (unidades_restantes IS NULL)
        INTO v_unlimited
        FROM public.suscripcion_servicios
       WHERE suscripcion_id = v_suscripcion
         AND servicio_id    = v_servicio;

      IF NOT COALESCE(v_unlimited, false) THEN
        IF NOT EXISTS (
          SELECT 1
          FROM public.suscripcion_servicios
         WHERE suscripcion_id     = v_suscripcion
           AND servicio_id        = v_servicio
           AND unidades_restantes > 0
        ) THEN
          RAISE EXCEPTION 'UNIDADES_AGOTADAS'
            USING ERRCODE = 'P0001';
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- ── Insert reservation ─────────────────────────────────────────────────────
  INSERT INTO public.reservas (
    tenant_id,
    atleta_id,
    entrenamiento_id,
    entrenamiento_categoria_id,
    estado,
    fecha_reserva,
    notas
  ) VALUES (
    p_tenant_id,
    p_atleta_id,
    p_entrenamiento_id,
    p_entrenamiento_categoria_id,
    'confirmada',
    now(),
    p_notas
  )
  RETURNING * INTO v_reserva;

  -- ── Pass 2: deduct units and log each service ──────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_deductions)
  LOOP
    v_suscripcion := (v_item->>'suscripcion_id')::uuid;
    v_servicio    := (v_item->>'servicio_id')::uuid;

    IF v_suscripcion IS NOT NULL THEN
      SELECT (unidades_restantes IS NULL)
        INTO v_unlimited
        FROM public.suscripcion_servicios
       WHERE suscripcion_id = v_suscripcion
         AND servicio_id    = v_servicio;

      IF NOT COALESCE(v_unlimited, false) THEN
        UPDATE public.suscripcion_servicios
           SET unidades_restantes = unidades_restantes - 1
         WHERE suscripcion_id     = v_suscripcion
           AND servicio_id        = v_servicio
           AND unidades_restantes > 0;

        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows = 0 THEN
          -- Concurrent race: another booking beat us
          RAISE EXCEPTION 'UNIDADES_AGOTADAS'
            USING ERRCODE = 'P0001';
        END IF;
      END IF;
    END IF;

    -- Log deduction (including unlimited rows for traceability)
    INSERT INTO public.reserva_servicios (reserva_id, suscripcion_id, servicio_id)
    VALUES (v_reserva.id, v_suscripcion, v_servicio)
    ON CONFLICT (reserva_id, servicio_id) DO NOTHING;
  END LOOP;

  RETURN v_reserva;
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_and_deduct_service_units(uuid, uuid, uuid, uuid, text, jsonb)
  TO authenticated;

-- ── 8. cancel_and_restore_service_units ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_and_restore_service_units(
  p_reserva_id uuid,
  p_tenant_id  uuid
)
RETURNS public.reservas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserva public.reservas;
  v_rec     record;
BEGIN
  -- Mark reservation cancelled
  UPDATE public.reservas
     SET estado            = 'cancelada',
         fecha_cancelacion = now()
   WHERE id        = p_reserva_id
     AND tenant_id = p_tenant_id
  RETURNING * INTO v_reserva;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada'
      USING ERRCODE = 'P0002';
  END IF;

  -- Restore finite units for each logged service deduction
  FOR v_rec IN
    SELECT rs.suscripcion_id, rs.servicio_id
      FROM public.reserva_servicios rs
     WHERE rs.reserva_id    = p_reserva_id
       AND rs.suscripcion_id IS NOT NULL
  LOOP
    UPDATE public.suscripcion_servicios
       SET unidades_restantes = unidades_restantes + 1
     WHERE suscripcion_id    = v_rec.suscripcion_id
       AND servicio_id       = v_rec.servicio_id
       AND unidades_restantes IS NOT NULL;  -- skip unlimited rows
  END LOOP;

  -- Remove deduction ledger rows
  DELETE FROM public.reserva_servicios WHERE reserva_id = p_reserva_id;

  RETURN v_reserva;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_and_restore_service_units(uuid, uuid)
  TO authenticated;
