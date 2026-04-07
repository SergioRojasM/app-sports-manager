# US-0056 — Automated Suspension Evaluation Cron Job

## ID
US-0056

## Name
Daily Automated Suspension and Reactivation via pg_cron

## As a
System (automated background process)

## I Want
To evaluate suspension rules every day at 01:00 AM Colombia time, automatically suspending members who exceed their absence threshold and reactivating members whose temporary suspension has expired

## So That
Tenant administrators don't need to manually track absences and apply suspensions — the system enforces rules consistently and fairly without human intervention

---

## Description

### Current State
- **US-0054** introduced `tenant_reglas_suspension` — admins can define up to 3 suspension rules per tenant specifying: absence threshold (`num_inasistencias`), counting window (`por_dias_atras` in days and/or `por_suscripcion` within active subscription period), and suspension duration (`duracion` in days; 0 = permanent).
- **US-0055** introduced `tenant_regla_suspension_id` FK on `miembros_tenant` — admins can assign a single rule to each team member.
- There is **no automated enforcement**. Suspensions are currently applied manually via the `cambiar_estado_miembro()` RPC, which requires an authenticated admin user.
- There is no mechanism to automatically reactivate members after a temporary suspension expires.

### Proposed Changes

#### 1. Enable `pg_cron` Extension
Enable the `pg_cron` PostgreSQL extension (available in Supabase) to support scheduled database jobs.

#### 2. Add `validacion_suspension` Column to `asistencias`
Add a `boolean NOT NULL DEFAULT false` column to `asistencias` to mark absence records that have already been counted toward a suspension. **This prevents the re-suspension loop**: without it, a member suspended for 5 days would be reactivated and immediately re-suspended by the same absences still within the rolling window.

A partial index `idx_asistencias_no_validadas` on `(tenant_id) WHERE asistio = false AND validacion_suspension = false` optimizes the cron query.

#### 3. Make `registrado_por` Nullable on `miembros_tenant_novedades`
The cron job runs as the database owner without an authenticated user context. `registrado_por = NULL` will indicate a system-automated action. The existing `cambiar_estado_miembro()` function and UI flows are unaffected — they always pass a valid `registrado_por`.

#### 4. Create `evaluar_suspensiones_cron()` Function
`SECURITY DEFINER` function (owned by postgres, bypasses RLS) that:
1. Selects all members where `estado = 'activo'`, `tenant_regla_suspension_id IS NOT NULL`, the linked rule has `activo = true`, and `tenant_id != PUBLIC_TENANT_ID`.
2. For each member, counts unprocessed absences (`asistio = false AND validacion_suspension = false`) joined through `reservas` → `asistencias`, filtered by:
   - **If `por_dias_atras > 0`**: `fecha_asistencia >= NOW() - INTERVAL '<por_dias_atras> days'`
   - **If `por_suscripcion = true`**: `fecha_asistencia BETWEEN suscripcion.fecha_inicio AND suscripcion.fecha_fin` (matching the member's active subscription in the same tenant)
   - **If both conditions apply**: both filters are combined with **AND**
3. If the absence count ≥ `num_inasistencias`:
   - Updates `miembros_tenant.estado` to `'suspendido'`
   - Inserts an audit record in `miembros_tenant_novedades` with `tipo = 'inasistencias_acumuladas'`, `estado_resultante = 'suspendido'`, `registrado_por = NULL`, and a descriptive message including the rule name and absence count
   - Marks the counted absences with `validacion_suspension = true`

#### 5. Create `reactivar_suspensiones_expiradas()` Function
`SECURITY DEFINER` function that:
1. Selects all members where `estado = 'suspendido'`, `tenant_regla_suspension_id IS NOT NULL`, the linked rule has `duracion > 0` and `activo = true`.
2. For each member, finds the most recent novedad where `tipo = 'inasistencias_acumuladas'` and `estado_resultante = 'suspendido'`.
3. If `novedad.created_at + duracion days <= NOW()`:
   - Updates `miembros_tenant.estado` to `'activo'`
   - Inserts an audit record with `tipo = 'reactivacion'`, `estado_resultante = 'activo'`, `registrado_por = NULL`

#### 6. Schedule the Cron Job
Register a `pg_cron` job running daily at `0 6 * * *` (06:00 UTC = 01:00 AM Colombia UTC-5):
1. First calls `reactivar_suspensiones_expiradas()` — reactivate expired suspensions
2. Then calls `evaluar_suspensiones_cron()` — evaluate new suspensions

**Order matters**: a reactivated member may be immediately re-suspended if new (unprocessed) absences still exceed the threshold.

---

## Database Changes

### Migration 1: `supabase/migrations/20260407000300_enable_pg_cron.sql`

```sql
-- Enable pg_cron extension for scheduled database jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage to postgres (owner of cron functions)
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
```

### Migration 2: `supabase/migrations/20260407000400_cron_evaluacion_suspensiones.sql`

**2a. Alter `miembros_tenant_novedades.registrado_por` to nullable:**
```sql
ALTER TABLE public.miembros_tenant_novedades
  ALTER COLUMN registrado_por DROP NOT NULL;

COMMENT ON COLUMN public.miembros_tenant_novedades.registrado_por IS
  'UUID of the user who triggered the change. NULL indicates an automated system action (e.g., cron job).';
```

**2b. Add `validacion_suspension` column to `asistencias`:**
```sql
ALTER TABLE public.asistencias
  ADD COLUMN IF NOT EXISTS validacion_suspension BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_asistencias_no_validadas
  ON public.asistencias (tenant_id)
  WHERE asistio = false AND validacion_suspension = false;
```

**2c. Create `evaluar_suspensiones_cron()` function:**
```sql
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
      -- por_dias_atras filter
      AND (r.por_dias_atras = 0
           OR a.fecha_asistencia >= NOW() - (r.por_dias_atras || ' days')::interval)
      -- por_suscripcion filter
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
```

**2d. Create `reactivar_suspensiones_expiradas()` function:**
```sql
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
```

**2e. Schedule the cron job:**
```sql
SELECT cron.schedule(
  'evaluar-suspensiones-diarias',
  '0 6 * * *',
  $$SELECT reactivar_suspensiones_expiradas(); SELECT evaluar_suspensiones_cron();$$
);
```

### RLS Considerations
- Both functions use `SECURITY DEFINER` — they run as the function owner (postgres), bypassing all RLS policies.
- The existing `asistencias_update_trainer_or_admin` RLS policy restricts UPDATE to trainers/admins. Since the cron functions are `SECURITY DEFINER`, they bypass this restriction. No RLS policy changes are needed.
- The existing `miembros_tenant_update_estado_admin` RLS policy is similarly bypassed.
- `miembros_tenant_novedades` INSERT policy restricts to tenant admins — bypassed by `SECURITY DEFINER`.

### Indexes
- `idx_asistencias_no_validadas ON asistencias(tenant_id) WHERE asistio = false AND validacion_suspension = false` — optimizes the absence counting query in the cron function.
- Existing `idx_miembros_tenant_regla_suspension` (partial index from US-0055) optimizes the member selection query.

---

## API / Server Actions

No new API routes or server actions are required. This feature is entirely database-side (pg_cron + PL/pgSQL functions). The existing `cambiar_estado_miembro()` RPC and UI flows remain unchanged.

For manual testing, the functions can be invoked directly via SQL:
```sql
SELECT reactivar_suspensiones_expiradas();
SELECT evaluar_suspensiones_cron();
```

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260407000300_enable_pg_cron.sql` | Enable pg_cron extension |
| Migration | `supabase/migrations/20260407000400_cron_evaluacion_suspensiones.sql` | ALTER novedades, ADD column asistencias, CREATE 2 functions, SCHEDULE cron |

---

## Acceptance Criteria

1. The `pg_cron` extension is enabled and the job `evaluar-suspensiones-diarias` appears in `cron.job` with schedule `0 6 * * *`.
2. Given a member with `estado = 'activo'`, an assigned rule (`num_inasistencias = 3`, `por_dias_atras = 30`, `activo = true`), and 3+ unprocessed absences (`asistio = false`, `validacion_suspension = false`) with `fecha_asistencia` within the last 30 days: after running `evaluar_suspensiones_cron()`, the member's `estado` is `'suspendido'` and a novedad record exists with `tipo = 'inasistencias_acumuladas'`.
3. After suspension in AC-2, the counted absences have `validacion_suspension = true`.
4. Given a member suspended via the cron (AC-2) with a rule `duracion = 5` and the suspension novedad `created_at` was 6+ days ago: after running `reactivar_suspensiones_expiradas()`, the member's `estado` is `'activo'` and a novedad record exists with `tipo = 'reactivacion'`.
5. After reactivation in AC-4, running `evaluar_suspensiones_cron()` again does **not** re-suspend the member (the same absences are already marked `validacion_suspension = true`).
6. A member with a rule where `duracion = 0` (permanent) is **never** automatically reactivated.
7. Members belonging to the public tenant (`2a089688-3cfc-4216-9372-33f50079fbd1`) are skipped by the evaluation function.
8. Members with `tenant_regla_suspension_id IS NULL` are skipped.
9. Members whose assigned rule has `activo = false` are skipped.
10. Members with `estado = 'suspendido'` are skipped by `evaluar_suspensiones_cron()` (no duplicate novedades).
11. Members with `estado = 'mora'` or `estado = 'inactivo'` are skipped by `evaluar_suspensiones_cron()` (only `'activo'` members are evaluated).
12. When a rule has `por_suscripcion = true` AND `por_dias_atras = 20`, only absences that satisfy **both** conditions (within a 20-day window AND within the active subscription period) are counted.
13. When a rule has `por_suscripcion = true` and `por_dias_atras = 0`, absences are counted within the active subscription period only (no rolling-day filter).
14. When a rule has `por_suscripcion = false` and `por_dias_atras = 30`, absences are counted within the last 30 days only (no subscription filter).
15. `miembros_tenant_novedades.registrado_por` is `NULL` for all cron-generated records.
16. The existing manual `cambiar_estado_miembro()` RPC continues to work unchanged — it always sets `registrado_por` to the calling admin.
17. The cron job execution is logged in `cron.job_run_details` and can be inspected for monitoring.

---

## Implementation Steps

- [ ] Create migration `20260407000300_enable_pg_cron.sql` — enable pg_cron extension
- [ ] Create migration `20260407000400_cron_evaluacion_suspensiones.sql`:
  - [ ] ALTER `miembros_tenant_novedades.registrado_por` DROP NOT NULL
  - [ ] ADD `validacion_suspension` column to `asistencias` with partial index
  - [ ] CREATE `evaluar_suspensiones_cron()` function
  - [ ] CREATE `reactivar_suspensiones_expiradas()` function
  - [ ] SCHEDULE cron job `evaluar-suspensiones-diarias` at `0 6 * * *`
- [ ] Apply migrations locally: `npx supabase db push --local`
- [ ] Test: insert seed data with 3 absences → run `SELECT evaluar_suspensiones_cron()` → verify suspension + novedad + `validacion_suspension` flags
- [ ] Test: backdate suspension novedad → run `SELECT reactivar_suspensiones_expiradas()` → verify reactivation
- [ ] Test: run `SELECT evaluar_suspensiones_cron()` again after reactivation → verify no re-suspension (absences already marked)
- [ ] Test: verify public tenant members, null-rule members, and inactive-rule members are skipped
- [ ] Verify cron is registered: `SELECT * FROM cron.job WHERE jobname = 'evaluar-suspensiones-diarias'`

---

## Non-Functional Requirements

- **Security**: Both functions are `SECURITY DEFINER` running as the database owner. They bypass RLS by design. No user-facing API is exposed — functions are only callable from SQL (cron or manual).
- **Performance**: The partial index `idx_asistencias_no_validadas` ensures the absence counting query only scans relevant rows. The member selection query leverages the existing partial index `idx_miembros_tenant_regla_suspension`. For large tenants, the cursor-based (FOR loop) approach processes one member at a time to avoid memory spikes.
- **Observability**: All cron executions are logged in `cron.job_run_details`. Every state change produces an immutable audit record in `miembros_tenant_novedades` with `registrado_por = NULL` clearly identifying automated actions.
- **Error handling**: If a single member's evaluation fails (e.g., corrupt data), the PL/pgSQL FOR loop will abort the entire transaction. Consider wrapping each iteration in a `BEGIN ... EXCEPTION` block in a future iteration if partial failures need isolation.
- **Idempotency**: The `validacion_suspension` flag ensures running the function multiple times in the same day produces the same result — already-processed absences are not re-counted.
