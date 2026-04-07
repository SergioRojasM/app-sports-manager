## Context

US-0054 created `tenant_reglas_suspension` (admin-defined absence rules) and US-0055 added `tenant_regla_suspension_id` FK on `miembros_tenant` (rule-to-member assignment). Currently, suspension enforcement is entirely manual — admins must call `cambiar_estado_miembro()`. There is no mechanism for automatic reactivation after temporary suspensions expire.

The database already has:
- `asistencias` table tracking attendance (`asistio = true/false`) linked to `reservas` (which link to `atleta_id`)
- `miembros_tenant_novedades` audit table for all estado changes
- `suscripciones` table with `fecha_inicio`/`fecha_fin` for subscription-scoped absence counting
- `tenant_reglas_suspension` with rule parameters: `num_inasistencias`, `por_suscripcion`, `por_dias_atras`, `duracion`, `activo`

## Goals / Non-Goals

**Goals:**
- Automate daily suspension evaluation at 01:00 AM Colombia time (06:00 UTC)
- Reactivate members whose temporary suspension has expired before evaluating new suspensions
- Prevent re-suspension loops by marking processed absences
- Maintain full audit trail via `miembros_tenant_novedades`
- Keep the solution entirely database-side (no application code changes)

**Non-Goals:**
- No UI for cron monitoring (use `cron.job_run_details` directly)
- No notifications to suspended/reactivated members
- No changes to manual suspension workflows
- No partial failure isolation (entire cron run is one transaction)

## Decisions

### 1. pg_cron vs Edge Functions vs External Scheduler

**Chosen: pg_cron**

| Option | Pros | Cons |
|--------|------|------|
| **pg_cron** (chosen) | Runs inside DB, no latency, direct SQL access, no auth needed, built into Supabase | Limited to SQL/plpgsql, harder to add notifications later |
| Edge Functions + pg_net | Can send notifications, more flexible | Requires HTTP round-trip, auth complexity, pg_net extension needed |
| External scheduler (GitHub Actions, cron server) | Full language support | Infrastructure overhead, needs Supabase service key, network dependency |

**Rationale**: The logic is pure SQL (count absences, update estado, insert novedades). pg_cron eliminates all network/auth overhead and guarantees transactional consistency.

### 2. `validacion_suspension` column vs. alternative approaches

**Chosen: Boolean flag on `asistencias`**

| Option | Pros | Cons |
|--------|------|------|
| **Boolean column** (chosen) | Simple, fast partial index, idempotent | Adds a column to `asistencias` |
| Junction table (`suspension_asistencias`) | No schema change to existing table | Extra JOINs, more complex queries |
| Track "last processed date" per member | No per-row marking | Can't handle partial windows, edge cases with overlapping rules |

**Rationale**: The boolean flag is the simplest approach that prevents the re-suspension loop. When a member is suspended, the absences that contributed are marked `true`. After reactivation, only new (unmarked) absences trigger future evaluations. The partial index `WHERE asistio = false AND validacion_suspension = false` ensures the cron query only scans relevant rows.

### 3. `registrado_por` nullable vs. system user

**Chosen: Make nullable**

| Option | Pros | Cons |
|--------|------|------|
| **Nullable** (chosen) | No seed data dependency, clear semantic (NULL = system) | Slightly weaker FK constraint |
| System user row in `usuarios` | Preserves NOT NULL constraint | Requires seed data, FK to a fake user, could be confused with real users |

**Rationale**: NULL clearly conveys "no human actor" and avoids coupling to seed data.

### 4. Execution order: Reactivate → Evaluate

The cron job calls `reactivar_suspensiones_expiradas()` first, then `evaluar_suspensiones_cron()`. This allows a reactivated member to be immediately re-evaluated — if they have accumulated new unprocessed absences since their suspension, they may be re-suspended in the same run. This is the correct behavior.

### 5. Absence counting with dual conditions (AND logic)

When a rule has both `por_suscripcion = true` AND `por_dias_atras > 0`, only absences matching **both** conditions are counted. The SQL filters are: `(por_dias_atras = 0 OR fecha_asistencia >= NOW() - interval) AND (por_suscripcion = false OR EXISTS(active subscription covering fecha_asistencia))`. When either flag is "off" (false/0), that filter passes all rows.

### 6. SECURITY DEFINER for RLS bypass

Both functions use `SECURITY DEFINER` with `SET search_path = public`. They run as the function owner (postgres), bypassing all RLS policies on `miembros_tenant`, `asistencias`, and `miembros_tenant_novedades`. This is necessary because cron jobs have no authenticated user context.

## Risks / Trade-offs

- **[All-or-nothing transaction]** → If one member's evaluation fails (e.g., corrupt data), the entire cron run rolls back. *Mitigation*: acceptable for v1; add per-member `BEGIN...EXCEPTION` block in a future iteration if partial failures need isolation.
- **[pg_cron availability]** → pg_cron must be enabled in the Supabase project. On hosted Supabase, it's available on Pro plan and above. *Mitigation*: enable via migration; verify in Dashboard if migration alone doesn't suffice.
- **[Clock drift / timezone]** → pg_cron uses UTC. The schedule `0 6 * * *` assumes Colombia = UTC-5 (no DST). *Mitigation*: Colombia doesn't observe DST, so the offset is stable.
- **[Cursor-based loop performance]** → The FOR loop processes one member at a time. For tenants with thousands of members with assigned rules, this could be slow. *Mitigation*: partial index on absences + partial index on `tenant_regla_suspension_id` keep individual queries fast. Set-based refactor possible if needed.

## Migration Plan

1. Apply migration `20260407000300_enable_pg_cron.sql` — enables extension
2. Apply migration `20260407000400_cron_evaluacion_suspensiones.sql` — creates everything in one transaction
3. Verify: `SELECT * FROM cron.job WHERE jobname = 'evaluar-suspensiones-diarias'`
4. **Rollback**: `SELECT cron.unschedule('evaluar-suspensiones-diarias')` + drop functions + revert column changes

## Open Questions

None — all decisions were resolved during planning.
