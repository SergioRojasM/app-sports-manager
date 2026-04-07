## Why

Suspension rules (US-0054) and rule-to-member assignment (US-0055) exist, but enforcement is entirely manual — an admin must track absences and apply suspensions via `cambiar_estado_miembro()`. This is error-prone, inconsistent, and doesn't scale. A daily automated cron job ensures rules are enforced fairly and members with expired temporary suspensions are reactivated without admin intervention.

## What Changes

- **Enable `pg_cron` extension** to support scheduled PostgreSQL jobs within Supabase.
- **Add `validacion_suspension` column** (`boolean DEFAULT false`) to `asistencias` to mark absence records already counted toward a suspension, preventing the re-suspension loop after temporary reactivation.
- **Make `registrado_por` nullable** on `miembros_tenant_novedades` to support system-automated audit records (NULL = cron action).
- **Create `evaluar_suspensiones_cron()` function** — evaluates active members with assigned rules, counts unprocessed absences per rule criteria, suspends members exceeding the threshold, logs audit records, and marks processed absences.
- **Create `reactivar_suspensiones_expiradas()` function** — reactivates members whose temporary suspension (`duracion > 0`) has elapsed based on the most recent suspension novedad date.
- **Schedule daily cron job** at `0 6 * * *` (06:00 UTC = 01:00 AM Colombia) — first reactivates, then evaluates.

## Non-goals

- No UI changes — this is entirely database-side (no new pages, components, hooks, or services).
- No changes to the existing manual `cambiar_estado_miembro()` RPC or admin suspension workflows.
- No email or push notifications when a member is suspended/reactivated.
- No dashboard or reporting for cron job execution history (monitoring via `cron.job_run_details` SQL query only).

## Capabilities

### New Capabilities
- `auto-suspension-cron`: Automated daily evaluation of suspension rules via pg_cron — suspends members exceeding absence thresholds and reactivates expired temporary suspensions.

### Modified Capabilities
- `training-attendance`: Add `validacion_suspension` column to `asistencias` table to track which absence records have been processed by the suspension cron.
- `tenant-member-status`: Make `registrado_por` nullable on `miembros_tenant_novedades` to support system-automated (cron) audit records.

## Impact

- **Database**: 2 new migrations — `pg_cron` extension enablement + main migration (ALTER `miembros_tenant_novedades`, ALTER `asistencias`, 2 new PL/pgSQL functions, cron schedule).
- **Tables modified**: `asistencias` (new column + partial index), `miembros_tenant_novedades` (nullable column).
- **New DB objects**: `evaluar_suspensiones_cron()`, `reactivar_suspensiones_expiradas()`, cron job `evaluar-suspensiones-diarias`.
- **Dependencies**: Requires US-0054 (`tenant_reglas_suspension` table) and US-0055 (`tenant_regla_suspension_id` FK on `miembros_tenant`) to be applied.
- **RLS**: Both functions are `SECURITY DEFINER` — bypass RLS by design. No RLS policy changes needed.

## Files to Create

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260407000300_enable_pg_cron.sql` | Enable pg_cron extension |
| Migration | `supabase/migrations/20260407000400_cron_evaluacion_suspensiones.sql` | ALTER novedades, ADD column asistencias, CREATE 2 functions, SCHEDULE cron |
