## 1. Branch Setup

- [x] 1.1 Create a new git branch: `git checkout -b fix/trainer-rls-create-trainings`
- [x] 1.2 Verify working branch is not `main`, `master`, or `develop`: `git branch --show-current`

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/20260330000200_entrenamientos_rls_allow_trainer.sql`
- [x] 2.2 Add DROP + CREATE statements for `entrenamientos_grupo` policies: `entrenamientos_grupo_insert_trainer_admin`, `entrenamientos_grupo_update_trainer_admin`, `entrenamientos_grupo_delete_trainer_admin` (using `get_trainer_or_admin_tenants_for_authenticated_user()`)
- [x] 2.3 Add DROP + CREATE statements for `entrenamientos_grupo_reglas` policies: `entrenamientos_grupo_reglas_insert_trainer_admin`, `entrenamientos_grupo_reglas_update_trainer_admin`, `entrenamientos_grupo_reglas_delete_trainer_admin`
- [x] 2.4 Add DROP + CREATE statements for `entrenamientos` policies: `entrenamientos_insert_trainer_admin`, `entrenamientos_update_trainer_admin`, `entrenamientos_delete_trainer_admin`
- [x] 2.5 Add DROP + CREATE statements for `entrenamiento_restricciones` policies: `ent_restricciones_insert_trainer_admin`, `ent_restricciones_update_trainer_admin`, `ent_restricciones_delete_trainer_admin`
- [x] 2.6 Add DROP + CREATE statements for `entrenamiento_grupo_restricciones` policies: `eg_restricciones_insert_trainer_admin`, `eg_restricciones_update_trainer_admin`, `eg_restricciones_delete_trainer_admin`
- [x] 2.7 Wrap all statements in a single `BEGIN; ... COMMIT;` transaction block

## 3. Apply Migration

- [x] 3.1 Apply migration locally: `supabase db push` (or `supabase migration up`)
- [x] 3.2 Verify in Supabase Studio or via `psql`: confirm that each of the 5 tables has the new `*_trainer_admin` policies for INSERT, UPDATE, DELETE and that the old `*_admin_only` / `*_admin` policies no longer exist

## 4. Manual Testing

- [x] 4.1 Log in as an `entrenador` user → navigate to `/portal/orgs/[tenant_id]/gestion-entrenamientos` → create a unique training (`tipo = 'unico'`) → confirm the training appears in the calendar
- [x] 4.2 As `entrenador`: create a recurring training series (`tipo = 'recurrente'`) → confirm instances appear in the calendar
- [x] 4.3 As `entrenador`: edit a training (single instance) → confirm change persists after page reload
- [x] 4.4 As `entrenador`: edit all instances of a series → confirm all eligible instances are updated
- [x] 4.5 As `entrenador`: delete a training session → confirm it is removed from the calendar
- [x] 4.6 As `entrenador`: create a training with booking restrictions → confirm restriction rows are saved
- [x] 4.7 As `administrador`: create, edit, and delete a training → confirm no regression
- [x] 4.8 As `usuario` (athlete): confirm the "Crear entrenamiento" button is not visible and no write access is available via direct API call

## 5. Commit and Pull Request

- [x] 5.1 Stage and commit the migration: `git add supabase/migrations/20260330000200_entrenamientos_rls_allow_trainer.sql && git commit -m "fix(rls): allow entrenador role to create, edit and delete trainings"`
- [x] 5.2 Push branch and open a Pull Request with the following description:

  **Title**: `fix(rls): allow entrenador role to create, edit and delete trainings`

  **Description**:
  > The RLS policies on the five training-related tables (`entrenamientos`, `entrenamientos_grupo`, `entrenamientos_grupo_reglas`, `entrenamiento_restricciones`, `entrenamiento_grupo_restricciones`) were using `get_admin_tenants_for_authenticated_user()`, which only covers the `administrador` role. This blocked coaches from writing training data despite the UI granting them access.
  >
  > This migration drops the `*_admin_only` / `*_admin` CUD policies and recreates them using the existing `get_trainer_or_admin_tenants_for_authenticated_user()` function, aligning DB permissions with the intended role model.
  >
  > **No application code changes.** Migration only.
  >
  > Closes US-0049.
