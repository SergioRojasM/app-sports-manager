## Context

The `usuarios` table already stores identity data (ID type, number, RH, birth date) but is missing the ID issue date (`fecha_exp_identificacion`). The existing `fecha_nacimiento` field is in the DB but is not surfaced through the `v_miembros_equipo` view or the `reservas_reporte_view`, making it invisible to admins in the team editor and absent from CSV exports. This is a pure data-model extension with additive changes only — no existing columns, types, or APIs are removed.

## Goals / Non-Goals

**Goals:**
- Add `fecha_exp_identificacion date` column to `public.usuarios`.
- Expose both date fields in `v_miembros_equipo` and `reservas_reporte_view`.
- Surface `fecha_exp_identificacion` in the self-service profile form (`PerfilPersonalForm`).
- Surface both fields in the admin team-member editor (`EditarPerfilMiembroModal`) with correct pre-fill.
- Merge `Tipo ID` + `N° Identificación` into a single grouped column in `EquipoTable`; add `F. Nacimiento` column.
- Extend the attendance CSV export with `fecha_nacimiento` and `fecha_exp_identificacion` columns.

**Non-Goals:**
- Validation or expiry-check logic based on date values (e.g., alerting on expired IDs).
- Displaying date fields in any other views beyond Perfil, EquipoTable/EditarPerfilMiembroModal, and the CSV export.
- Migrating historical data — all new fields are nullable with no backfill.
- Changing authentication or RLS ownership of the `usuarios` row.

## Decisions

### D1 — Use `CREATE OR REPLACE VIEW` for both views (no separate DROP migration)

`v_miembros_equipo` and `reservas_reporte_view` are non-materialized views with no dependent objects (no indexes, no mat-views built on top). Using `CREATE OR REPLACE VIEW` is safe and avoids a DROP/CREATE cycle that could cause a brief downtime window in production.

**Alternative considered**: DROP + CREATE in a transaction. Rejected because it requires two separate statements and introduces a momentary gap where the view doesn't exist, which could fail concurrent requests.

### D2 — Three separate migration files (one per concern)

Rather than one combined migration, split into:
1. `ADD COLUMN` on `usuarios`  
2. Recreate `v_miembros_equipo`  
3. Recreate `reservas_reporte_view`  

This matches the project's established pattern (one concern per migration file) and makes rollback straightforward — each migration can be reviewed in isolation.

**Alternative considered**: Single migration. Rejected because it conflates DDL concerns and makes partial rollback impossible.

### D3 — No changes to `editarPerfilMiembro` service function signature

`equipo.service.ts` already accepts `EditarPerfilMiembroInput` which is a partial patch object passed directly to Supabase `.update()`. Adding `fecha_exp_identificacion?: string | null` to the TypeScript type is sufficient — no runtime code change is needed in the service function body.

**Alternative considered**: Dedicated `updateUserDates` service function. Rejected — unnecessary abstraction for a single nullable column addition.

### D4 — `fecha_nacimiento` pre-fill fix is bundled into this story

`EditarPerfilMiembroModal` already has a `fechaNacimiento` state variable but resets it to `''` on every open because `v_miembros_equipo` didn't include the column. Now that the view exposes it, the pre-fill simply reads `miembro.fecha_nacimiento`. This is a one-line fix bundled here for coherence.

### D5 — EquipoTable column grouping: merge ID columns, add DOB

The merged **Identificación** column renders `{tipo} · {número}` on one line with the issue date below (`Exp: {fecha_exp_identificacion}`). This condenses two existing columns into one, freeing space for the new DOB column without widening the table further.

**Alternative considered**: Keep the two original columns and add two more (4 ID-related columns). Rejected — too wide; the table already has 10 columns.

## Risks / Trade-offs

- **View recreation during live traffic** → Minimal risk: `CREATE OR REPLACE VIEW` is atomic in PostgreSQL; no locks are taken on the underlying tables. The migration runs within a transaction.
- **Existing CSV consumers** → The CSV column list change (two new columns appended) is additive and ordered consistently. Any downstream system parsing by column index (not name) could be affected. Since this is an internal export consumed by admins in Excel, this is acceptable.
- **`fecha_nacimiento` now appears in `v_miembros_equipo`** → The view is already accessible to all authenticated users via `miembros_tenant_select_authenticated`. Date of birth is personal data — however, `v_miembros_equipo` is already admin-scoped in practice (only admins and coaches load the team page). No new RLS policy is required.

## Migration Plan

1. Apply `20260328000100_add_fecha_exp_identificacion_usuarios.sql` — adds the column.
2. Apply `20260328000200_v_miembros_equipo_add_dates.sql` — recreates the view to include both date columns.
3. Apply `20260328000300_reservas_reporte_view_add_dates.sql` — recreates the report view.
4. Deploy application code (types, services, hooks, components) — safe to deploy before or after migrations since all new fields are nullable and the existing selects remain valid.

**Rollback**: Drop `fecha_exp_identificacion` column and recreate both views without the new columns. No data loss risk since the column is new.

## Open Questions

None — all decisions are resolved above.
