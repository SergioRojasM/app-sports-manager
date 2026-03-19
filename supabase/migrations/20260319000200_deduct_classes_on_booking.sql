-- ============================================
-- US-0035: Deduct / Restore subscription classes on booking
-- ============================================

-- 1. Add suscripcion_id FK column to reservas
ALTER TABLE public.reservas
  ADD COLUMN suscripcion_id uuid
    REFERENCES public.suscripciones(id)
    ON DELETE SET NULL;

CREATE INDEX idx_reservas_suscripcion_id
  ON public.reservas (suscripcion_id);

-- ============================================
-- 2. book_and_deduct_class — atomic deduct + insert
-- ============================================
CREATE OR REPLACE FUNCTION public.book_and_deduct_class(
  p_tenant_id                  uuid,
  p_atleta_id                  uuid,
  p_entrenamiento_id           uuid,
  p_entrenamiento_categoria_id uuid DEFAULT NULL,
  p_notas                      text DEFAULT NULL,
  p_suscripcion_id             uuid DEFAULT NULL
)
RETURNS public.reservas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserva public.reservas;
  v_rows    int;
BEGIN
  -- Deduct class if a subscription was provided
  IF p_suscripcion_id IS NOT NULL THEN
    UPDATE public.suscripciones
       SET clases_restantes = clases_restantes - 1
     WHERE id = p_suscripcion_id
       AND clases_restantes > 0;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows = 0 THEN
      RAISE EXCEPTION 'CLASES_AGOTADAS'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Insert the reservation
  INSERT INTO public.reservas (
    tenant_id,
    atleta_id,
    entrenamiento_id,
    entrenamiento_categoria_id,
    estado,
    fecha_reserva,
    notas,
    suscripcion_id
  ) VALUES (
    p_tenant_id,
    p_atleta_id,
    p_entrenamiento_id,
    p_entrenamiento_categoria_id,
    'confirmada',
    now(),
    p_notas,
    p_suscripcion_id
  )
  RETURNING * INTO v_reserva;

  RETURN v_reserva;
END;
$$;

-- ============================================
-- 3. cancel_and_restore_class — atomic cancel + restore
-- ============================================
CREATE OR REPLACE FUNCTION public.cancel_and_restore_class(
  p_reserva_id     uuid,
  p_tenant_id      uuid,
  p_suscripcion_id uuid DEFAULT NULL
)
RETURNS public.reservas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserva public.reservas;
BEGIN
  -- Update the reservation to cancelled
  UPDATE public.reservas
     SET estado = 'cancelada',
         fecha_cancelacion = now()
   WHERE id = p_reserva_id
     AND tenant_id = p_tenant_id
  RETURNING * INTO v_reserva;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada'
      USING ERRCODE = 'P0002';
  END IF;

  -- Restore the class if a subscription was provided
  IF p_suscripcion_id IS NOT NULL THEN
    UPDATE public.suscripciones
       SET clases_restantes = clases_restantes + 1
     WHERE id = p_suscripcion_id;
    -- Silent no-op if subscription was deleted (0 rows updated is fine)
  END IF;

  RETURN v_reserva;
END;
$$;

-- ============================================
-- 4. Grant EXECUTE to authenticated role
-- ============================================
GRANT EXECUTE ON FUNCTION public.book_and_deduct_class(uuid, uuid, uuid, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_and_restore_class(uuid, uuid, uuid) TO authenticated;
