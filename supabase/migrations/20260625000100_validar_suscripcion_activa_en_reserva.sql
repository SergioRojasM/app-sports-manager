-- Reject deductions from subscriptions that are 'pendiente' or 'cancelada'.
-- Allows 'activa' and 'vencida' (admin may deduct from recently-expired subscriptions
-- when booking past trainings).

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
      IF NOT EXISTS (
        SELECT 1
        FROM public.suscripciones
        WHERE id = v_suscripcion
          AND estado IN ('activa', 'vencida')
      ) THEN
        RAISE EXCEPTION 'SUSCRIPCION_INACTIVA'
          USING ERRCODE = 'P0001';
      END IF;

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
          RAISE EXCEPTION 'UNIDADES_AGOTADAS'
            USING ERRCODE = 'P0001';
        END IF;
      END IF;
    END IF;

    INSERT INTO public.reserva_servicios (reserva_id, suscripcion_id, servicio_id)
    VALUES (v_reserva.id, v_suscripcion, v_servicio)
    ON CONFLICT (reserva_id, servicio_id) DO NOTHING;
  END LOOP;

  RETURN v_reserva;
END;
$$;
