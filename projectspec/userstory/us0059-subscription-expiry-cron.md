# US-0059 — Subscription Expiry Cron Job

## ID
US-0059

## Name
Automated Daily Cron to Expire Overdue Subscriptions

## As a
System (automated process)

## I Want
A scheduled database job that runs every day at 01:00 AM UTC-5 and sets the `estado` of any `activa` subscription whose `fecha_fin` is in the past to `vencida`

## So That
Subscription statuses are always accurate and up to date without requiring manual intervention, preventing athletes with expired subscriptions from appearing as active subscribers and ensuring business rules that depend on subscription state are enforced automatically.

---

## Description

### Current State
The `suscripciones` table tracks subscriptions with an `estado` column (allowed values: `activa`, `vencida`, `cancelada`) and a `fecha_fin` date column. Today, subscriptions are only changed to `vencida` manually by an admin. There is no automated process to expire subscriptions when their `fecha_fin` date passes. As a result, subscriptions can remain in `activa` state indefinitely even after they have expired.

### Proposed Changes

A new Supabase/pg_cron scheduled job is added that:

1. Creates a PL/pgSQL function `vencer_suscripciones_expiradas()` that:
   - Targets all rows in `public.suscripciones` where `estado = 'activa'` AND `fecha_fin < CURRENT_DATE` AND `tenant_id` is not the public tenant.
   - Performs a bulk `UPDATE` setting `estado = 'vencida'` for all matching rows.
   - Returns a summary (number of subscriptions updated) via `RAISE NOTICE`.

2. Schedules the function via `cron.schedule` to run daily at 06:00 UTC (01:00 AM Colombia, UTC-5) — consistent with the existing `evaluar-suspensiones-diarias` cron timing convention.

3. The cron job is integrated into the existing daily run alongside the suspension evaluation cron so both run at the same time window.

**No UI changes are required.** The UI already reads `estado` from the database; once rows are updated, the correct state will be reflected automatically.

---

## Database Changes

### New PL/pgSQL Function

```sql
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
```

### Cron Schedule

```sql
SELECT cron.schedule(
  'vencer-suscripciones-diarias',
  '0 6 * * *',
  $$SELECT public.vencer_suscripciones_expiradas();$$
);
```

**No new tables or columns are needed.** The `suscripciones` table already has the `estado` (varchar 30, CHECK IN `('activa','vencida','cancelada')`) and `fecha_fin` (date) columns.

### RLS / Permissions

The function is declared `SECURITY DEFINER` so it executes with the permissions of its owner (postgres), bypassing RLS for the update. No additional grants are required.

### Supporting Index (optional, recommended)

```sql
CREATE INDEX IF NOT EXISTS idx_suscripciones_estado_fecha_fin
  ON public.suscripciones (estado, fecha_fin)
  WHERE estado = 'activa';
```

This partial index speeds up the daily scan of active subscriptions with a past `fecha_fin`.

---

## API / Server Actions

No new server actions or API routes are required. The logic is entirely implemented as a database-level scheduled function.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260604000100_cron_vencimiento_suscripciones.sql` | Create function `vencer_suscripciones_expiradas()`, add partial index, schedule cron job |

---

## Acceptance Criteria

1. A pg_cron job named `vencer-suscripciones-diarias` exists in `cron.job` and is scheduled at `'0 6 * * *'`.
2. After the cron runs, all `suscripciones` rows with `estado = 'activa'` and `fecha_fin < CURRENT_DATE` are updated to `estado = 'vencida'`.
3. Subscriptions with `estado = 'cancelada'` are never touched by the cron (only `activa` rows are targeted).
4. Subscriptions with `fecha_fin IS NULL` are never touched by the cron.
5. Subscriptions belonging to the public tenant (`2a089688-3cfc-4216-9372-33f50079fbd1`) are excluded from the update.
6. The function can be invoked manually (`SELECT public.vencer_suscripciones_expiradas();`) and produces the correct result.
7. Invoking the function when there are no expired active subscriptions results in zero rows updated and no errors.
8. The migration applies cleanly on a local Supabase instance (`npx supabase db reset` or `npx supabase migration up`).
9. The partial index `idx_suscripciones_estado_fecha_fin` exists on the `suscripciones` table after migration.

---

## Implementation Steps

- [ ] Create migration file `supabase/migrations/20260604000100_cron_vencimiento_suscripciones.sql`
- [ ] Add partial index `idx_suscripciones_estado_fecha_fin` on `suscripciones(estado, fecha_fin)`
- [ ] Implement `vencer_suscripciones_expiradas()` function (SECURITY DEFINER, excludes public tenant)
- [ ] Schedule cron job `vencer-suscripciones-diarias` at `'0 6 * * *'`
- [ ] Apply migration locally: `npx supabase migration up` or `npx supabase db reset`
- [ ] Verify cron job appears in `SELECT * FROM cron.job;`
- [ ] Test manually: insert a subscription with `estado='activa'` and `fecha_fin = CURRENT_DATE - 1`, call the function, confirm `estado` becomes `vencida`
- [ ] Test edge cases: subscription with `fecha_fin = CURRENT_DATE` (today — should NOT be expired), `fecha_fin IS NULL`, `estado = 'cancelada'`
- [ ] Confirm public tenant subscriptions are excluded

---

## Non-Functional Requirements

- **Security**: The function uses `SECURITY DEFINER` with an explicit `SET search_path = public` to prevent search-path injection. It targets only the `suscripciones` table via a narrow `WHERE` clause. No user input is accepted.
- **Performance**: The partial index `WHERE estado = 'activa'` limits the scan to only active subscriptions. The cron runs once daily during off-peak hours (01:00 AM local time), so performance impact is negligible.
- **Idempotency**: Running the function multiple times per day is safe; rows already set to `vencida` do not match the `estado = 'activa'` filter and will not be updated again.
- **Observability**: `RAISE NOTICE` emits the count of updated rows to the PostgreSQL log on each run.
- **Error handling**: The function does not surface errors to end users. If it fails, the failure will be visible in Supabase cron job logs (`cron.job_run_details`). No UI-level error handling is required.
