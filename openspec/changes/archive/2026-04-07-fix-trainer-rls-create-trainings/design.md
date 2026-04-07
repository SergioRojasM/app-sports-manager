## Context

The Supabase RLS policies on five training-related tables (`entrenamientos`, `entrenamientos_grupo`, `entrenamientos_grupo_reglas`, `entrenamiento_restricciones`, `entrenamiento_grupo_restricciones`) were originally written with `_admin_only` semantics. They use `get_admin_tenants_for_authenticated_user()`, a function that resolves only tenants where the current user has the `administrador` role. This blocks `entrenador` users from writing to any of these tables despite the UI presenting them with create/edit/delete controls.

The fix is a single SQL migration that drops the restrictive policies and recreates them using the already-existing function `get_trainer_or_admin_tenants_for_authenticated_user()`, which covers both `entrenador` and `administrador`.

## Goals / Non-Goals

**Goals:**
- Allow `entrenador` role to INSERT, UPDATE, and DELETE rows in all five training-related tables.
- Maintain identical permissions for `administrador` (no regression).
- Implement the fix as a single, self-contained SQL migration with no application code changes.

**Non-Goals:**
- Changing SELECT policies (already open to all authenticated tenant members).
- Adding service-layer role guards.
- Changing any UI, hook, or service layer code.
- Modifying permissions for any tables beyond the five training-related ones.

## Decisions

### Use `get_trainer_or_admin_tenants_for_authenticated_user()` instead of a new function

**Decision**: Reuse the existing `get_trainer_or_admin_tenants_for_authenticated_user()` function rather than creating a new one.

**Rationale**: This function was created exactly for this purpose (`reservas`, `asistencias`) and already encapsulates the correct logic. Creating a duplicate would be unnecessary and would diverge maintenance.

**Alternatives considered**:
- Inline subquery directly in the policy body — rejected because the shared function is already cached as `STABLE` + `SECURITY DEFINER`, which gives better query plan behavior.
- Add an `OR` condition on top of the existing `_admin_only` policy — rejected because it would leave the old policy intact and create policy union ambiguity.

### Drop old policies first, then create new ones in the same migration

**Decision**: Each table's old policies are dropped and new ones created in one `BEGIN/COMMIT` block.

**Rationale**: Atomic — no window where the table is uncovered or double-covered. The `DROP POLICY IF EXISTS` guards against re-entrant runs.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Migration fails mid-way, leaving a table without CUD policies | Wrapped in a single transaction (`BEGIN/COMMIT`). Migration tools will roll back on error. |
| `get_trainer_or_admin_tenants_for_authenticated_user()` not present in target DB | Function was created in migration `20260302000200` — always run before this migration by timestamp ordering. |
| Regression: `usuario` athletes should still not be able to write | Function returns only rows where role is `entrenador` or `administrador` — `usuario` is excluded by the `IN (...)` check. |

## Migration Plan

1. Create `supabase/migrations/20260330000200_entrenamientos_rls_allow_trainer.sql`.
2. Apply locally: `supabase db push` (or `supabase migration up`).
3. Verify in Supabase Studio: confirm policies `*_trainer_admin` exist on the five tables and old `*_admin_only` / `*_admin` policies are gone.
4. Manual smoke test with a coach account.
5. Deploy to production via standard migration pipeline.

**Rollback**: Re-create the original `*_admin_only` policies using `get_admin_tenants_for_authenticated_user()`. No data loss risk.
