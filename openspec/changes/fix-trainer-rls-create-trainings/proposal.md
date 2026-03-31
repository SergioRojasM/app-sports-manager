## Why

The `entrenador` role cannot create, edit, or delete training sessions despite the UI granting them access. The root cause is that RLS policies on all five training-related tables reference `get_admin_tenants_for_authenticated_user()`, which only returns tenants where the user is an `administrador`. This silently blocks every write operation for coaches at the database layer.

## What Changes

- Drop the five `*_admin_only` / `*_admin` RLS policies (INSERT, UPDATE, DELETE) on tables `entrenamientos`, `entrenamientos_grupo`, `entrenamientos_grupo_reglas`, `entrenamiento_restricciones`, and `entrenamiento_grupo_restricciones`.
- Recreate those same policies using the existing `get_trainer_or_admin_tenants_for_authenticated_user()` function, which already covers both `entrenador` and `administrador`.
- No UI, hook, service, or type changes required — the application layer is already correct.

## Capabilities

### New Capabilities

- `trainer-training-management`: The `entrenador` role gains database-level permission to create, edit, and delete training sessions and their associated data (recurrence rules, booking restrictions) within their tenant.

### Modified Capabilities

- `training-management`: The write-access requirement for training sessions expands from `administrador`-only to `administrador | entrenador`. The spec's invariants for who can mutate training data change.

## Impact

- **Database**: 5 tables affected — new RLS policies replace existing ones in a single migration.
- **Application code**: No changes.
- **Existing `administrador` behavior**: No regression — `get_trainer_or_admin_tenants_for_authenticated_user()` includes admins.
- **`usuario` (athlete) role**: No new permissions — function excludes the `usuario` role.
- **Dependencies**: Relies on `get_trainer_or_admin_tenants_for_authenticated_user()` already defined in migration `20260302000200_reservas_rls_policies.sql`.

## Non-goals

- Not changing SELECT policies (already open to all tenant members).
- Not adding service-level role validation — RLS is the enforced boundary.
- Not changing any UI, hook, or service layer code.
- Not modifying permissions for any tables outside the five training-related ones.

## Files to Create or Modify

| File | Change |
|------|--------|
| `supabase/migrations/20260330000200_entrenamientos_rls_allow_trainer.sql` | New migration: drop admin-only CUD policies on 5 tables, recreate with trainer+admin access |
