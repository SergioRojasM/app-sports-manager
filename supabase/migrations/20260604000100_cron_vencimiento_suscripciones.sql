-- ============================================================================
-- Migration: Automated Subscription Expiry Cron (US-0059)
-- ============================================================================
-- This migration:
-- 1. Adds a partial index on suscripciones(estado, fecha_fin) for active rows
-- 2. Creates the vencer_suscripciones_expiradas() function
-- 3. Schedules a daily cron job at 06:00 UTC (01:00 AM Colombia, UTC-5)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Partial index to speed up the daily expired-subscription scan
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_suscripciones_estado_fecha_fin
  ON public.suscripciones (estado, fecha_fin)
  WHERE estado = 'activa';

-- ----------------------------------------------------------------------------
-- 2. Function: vencer_suscripciones_expiradas()
-- Updates all active subscriptions whose fecha_fin is in the past to 'vencida'.
-- Excludes the public tenant. Safe to call multiple times (idempotent).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vencer_suscripciones_expiradas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_public_tenant_id CONSTANT uuid := '2a089688-3cfc-4216-9372-33f50079fbd1';
  v_updated_count INT;
BEGIN
  UPDATE public.suscripciones
     SET estado = 'vencida'
   WHERE estado = 'activa'
     AND fecha_fin IS NOT NULL
     AND fecha_fin < CURRENT_DATE
     AND tenant_id <> v_public_tenant_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'vencer_suscripciones_expiradas: % suscripcion(es) actualizadas a vencida', v_updated_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Schedule daily cron job: 06:00 UTC = 01:00 AM Colombia (UTC-5)
-- Consistent with the evaluar-suspensiones-diarias cron timing.
-- ----------------------------------------------------------------------------
SELECT cron.schedule(
  'vencer-suscripciones-diarias',
  '0 6 * * *',
  $$SELECT public.vencer_suscripciones_expiradas();$$
);
