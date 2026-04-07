## 1. Branch Setup

- [x] 1.1 Create a new branch `feat/auto-suspension-cron` from current branch
- [x] 1.2 Validate working branch is not `main`, `master`, or `develop`

## 2. Database Migration — Enable pg_cron

- [x] 2.1 Create migration file `supabase/migrations/20260407000300_enable_pg_cron.sql` with `CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog` and grant statements for postgres role
- [x] 2.2 Apply migration locally: `npx supabase db push --local`
- [x] 2.3 Verify extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron'`

## 3. Database Migration — Cron Suspension Functions

- [x] 3.1 Create migration file `supabase/migrations/20260407000400_cron_evaluacion_suspensiones.sql` containing all changes below (3.2–3.7) in a single file
- [x] 3.2 ALTER `miembros_tenant_novedades.registrado_por` to DROP NOT NULL, add column comment explaining NULL = system-automated action
- [x] 3.3 ADD `validacion_suspension BOOLEAN NOT NULL DEFAULT false` column to `asistencias` table
- [x] 3.4 CREATE partial index `idx_asistencias_no_validadas ON asistencias(tenant_id) WHERE asistio = false AND validacion_suspension = false`
- [x] 3.5 CREATE function `evaluar_suspensiones_cron()` as SECURITY DEFINER — evaluates active members with assigned rules, counts unprocessed absences per rule criteria (AND logic for dual conditions), suspends members, logs novedades, marks processed absences
- [x] 3.6 CREATE function `reactivar_suspensiones_expiradas()` as SECURITY DEFINER — reactivates members whose temporary suspension has elapsed based on most recent suspension novedad date
- [x] 3.7 SCHEDULE pg_cron job `evaluar-suspensiones-diarias` with expression `0 6 * * *` (06:00 UTC = 01:00 AM Colombia), calling reactivation first then evaluation

## 4. Apply and Verify Migrations

- [x] 4.1 Apply migration locally: `npx supabase db push --local`
- [x] 4.2 Verify cron job is registered: `SELECT * FROM cron.job WHERE jobname = 'evaluar-suspensiones-diarias'`
- [x] 4.3 Verify `registrado_por` is nullable: check column definition in `miembros_tenant_novedades`
- [x] 4.4 Verify `validacion_suspension` column exists on `asistencias` with default `false`

## 5. Manual Testing

- [x] 5.1 Insert seed data: create tenant with suspension rule (`num_inasistencias = 3`, `por_dias_atras = 30`, `activo = true`), assign rule to an active member, create 3+ absence records (`asistio = false`) with `fecha_asistencia` within last 30 days
- [x] 5.2 Run `SELECT evaluar_suspensiones_cron()` — verify member is suspended, novedad exists with `tipo = 'inasistencias_acumuladas'` and `registrado_por = NULL`, and absences have `validacion_suspension = true`
- [x] 5.3 Backdate the suspension novedad `created_at` to 6+ days ago for a rule with `duracion = 5`, run `SELECT reactivar_suspensiones_expiradas()` — verify member is reactivated with novedad `tipo = 'reactivacion'`
- [x] 5.4 Run `SELECT evaluar_suspensiones_cron()` again after reactivation — verify no re-suspension (absences already marked `validacion_suspension = true`)
- [x] 5.5 Verify members of public tenant, members without rules, and members with inactive rules are all skipped

## 6. Documentation

- [x] 6.1 Update `projectspec/03-project-structure.md` to document the two new PL/pgSQL functions and the cron job under the database section

## 7. Commit and PR

- [ ] 7.1 Stage all changes: `git add -A`
- [ ] 7.2 Commit with message: `feat: automated suspension evaluation cron job (US-0056)`
- [ ] 7.3 Create pull request with description summarizing: pg_cron enablement, `validacion_suspension` column, `evaluar_suspensiones_cron()` and `reactivar_suspensiones_expiradas()` functions, daily `0 6 * * *` schedule, nullable `registrado_por`
