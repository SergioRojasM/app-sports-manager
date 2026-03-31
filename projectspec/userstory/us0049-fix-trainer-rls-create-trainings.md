# US-0049 — Fix RLS Policies to Allow Coaches to Create and Manage Trainings

## ID
US-0049

## Name
Fix Row Level Security Policies So Coaches Can Create, Edit, and Delete Trainings

## As a
Coach (`entrenador`) member of a tenant

## I Want
To be able to create, edit, and delete training sessions in my organization's training calendar

## So That
I can manage the teams and athletes I am responsible for without needing an administrator to do it for me

---

## Description

### Current State

The UI layer correctly permits coaches to manage trainings: `EntrenamientosPage` computes `canManage = role === 'administrador' || role === 'entrenador'`, showing the create/edit/delete controls to both roles. The `(shared)` route group also gives coaches access to the `/gestion-entrenamientos` page.

However, the Supabase RLS policies on all five training-related tables were created with `_admin_only` semantics: they reference the function `get_admin_tenants_for_authenticated_user()`, which returns only tenants where the user's role is `administrador`. This means that when a coach submits the training creation form, the Supabase insert is silently rejected at the database layer. The operation appears to succeed on the client but no row is written, or a Supabase PostgREST error is returned.

The function `get_trainer_or_admin_tenants_for_authenticated_user()` already exists (created in migration `20260302000200_reservas_rls_policies.sql`) and is already used for `reservas`, `asistencias`, and `entrenamiento_categorias` tables. It is simply missing from the training core tables.

### Proposed Changes

Create a new migration that, for each of the five affected tables, **drops the existing admin-only CUD policies and recreates them using `get_trainer_or_admin_tenants_for_authenticated_user()`**, which covers both `administrador` and `entrenador` roles.

Affected tables and operations:

| Table | Operations to fix |
|---|---|
| `entrenamientos` | INSERT, UPDATE, DELETE |
| `entrenamientos_grupo` | INSERT, UPDATE, DELETE |
| `entrenamientos_grupo_reglas` | INSERT, UPDATE, DELETE |
| `entrenamiento_restricciones` | INSERT, UPDATE, DELETE |
| `entrenamiento_grupo_restricciones` | INSERT, UPDATE, DELETE |

SELECT policies are not changed — they already allow all authenticated tenant members to read.

No application code changes are required.

---

## Database Changes

### New migration: `supabase/migrations/20260330000200_entrenamientos_rls_allow_trainer.sql`

For each table, drop the old admin-only CUD policies and create new trainer-or-admin equivalents:

```sql
begin;

-- ============================================================
-- Fix: Allow entrenador + administrador to CUD trainings
-- Replaces *_admin_only / *_admin policies that used
-- get_admin_tenants_for_authenticated_user() with the existing
-- get_trainer_or_admin_tenants_for_authenticated_user().
-- ============================================================

-- ------------------------------------------------
-- Table: entrenamientos_grupo
-- ------------------------------------------------

drop policy if exists entrenamientos_grupo_insert_admin_only on public.entrenamientos_grupo;
create policy entrenamientos_grupo_insert_trainer_admin on public.entrenamientos_grupo
  for insert to authenticated
  with check (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

drop policy if exists entrenamientos_grupo_update_admin_only on public.entrenamientos_grupo;
create policy entrenamientos_grupo_update_trainer_admin on public.entrenamientos_grupo
  for update to authenticated
  using (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  )
  with check (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

drop policy if exists entrenamientos_grupo_delete_admin_only on public.entrenamientos_grupo;
create policy entrenamientos_grupo_delete_trainer_admin on public.entrenamientos_grupo
  for delete to authenticated
  using (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- ------------------------------------------------
-- Table: entrenamientos_grupo_reglas
-- ------------------------------------------------

drop policy if exists entrenamientos_grupo_reglas_insert_admin_only on public.entrenamientos_grupo_reglas;
create policy entrenamientos_grupo_reglas_insert_trainer_admin on public.entrenamientos_grupo_reglas
  for insert to authenticated
  with check (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

drop policy if exists entrenamientos_grupo_reglas_update_admin_only on public.entrenamientos_grupo_reglas;
create policy entrenamientos_grupo_reglas_update_trainer_admin on public.entrenamientos_grupo_reglas
  for update to authenticated
  using (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  )
  with check (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

drop policy if exists entrenamientos_grupo_reglas_delete_admin_only on public.entrenamientos_grupo_reglas;
create policy entrenamientos_grupo_reglas_delete_trainer_admin on public.entrenamientos_grupo_reglas
  for delete to authenticated
  using (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- ------------------------------------------------
-- Table: entrenamientos
-- ------------------------------------------------

drop policy if exists entrenamientos_insert_admin_only on public.entrenamientos;
create policy entrenamientos_insert_trainer_admin on public.entrenamientos
  for insert to authenticated
  with check (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

drop policy if exists entrenamientos_update_admin_only on public.entrenamientos;
create policy entrenamientos_update_trainer_admin on public.entrenamientos
  for update to authenticated
  using (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  )
  with check (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

drop policy if exists entrenamientos_delete_admin_only on public.entrenamientos;
create policy entrenamientos_delete_trainer_admin on public.entrenamientos
  for delete to authenticated
  using (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- ------------------------------------------------
-- Table: entrenamiento_restricciones
-- ------------------------------------------------

drop policy if exists ent_restricciones_insert_admin on public.entrenamiento_restricciones;
create policy ent_restricciones_insert_trainer_admin on public.entrenamiento_restricciones
  for insert to authenticated
  with check (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

drop policy if exists ent_restricciones_update_admin on public.entrenamiento_restricciones;
create policy ent_restricciones_update_trainer_admin on public.entrenamiento_restricciones
  for update to authenticated
  using (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  )
  with check (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

drop policy if exists ent_restricciones_delete_admin on public.entrenamiento_restricciones;
create policy ent_restricciones_delete_trainer_admin on public.entrenamiento_restricciones
  for delete to authenticated
  using (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

-- ------------------------------------------------
-- Table: entrenamiento_grupo_restricciones
-- ------------------------------------------------

drop policy if exists eg_restricciones_insert_admin on public.entrenamiento_grupo_restricciones;
create policy eg_restricciones_insert_trainer_admin on public.entrenamiento_grupo_restricciones
  for insert to authenticated
  with check (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

drop policy if exists eg_restricciones_update_admin on public.entrenamiento_grupo_restricciones;
create policy eg_restricciones_update_trainer_admin on public.entrenamiento_grupo_restricciones
  for update to authenticated
  using (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  )
  with check (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

drop policy if exists eg_restricciones_delete_admin on public.entrenamiento_grupo_restricciones;
create policy eg_restricciones_delete_trainer_admin on public.entrenamiento_grupo_restricciones
  for delete to authenticated
  using (
    tenant_id in (
      select ta.tenant_id
      from public.get_trainer_or_admin_tenants_for_authenticated_user() ta
    )
  );

commit;
```

### Existing helper function (no changes needed)

`get_trainer_or_admin_tenants_for_authenticated_user()` already exists in `20260302000200_reservas_rls_policies.sql`:

```sql
create or replace function public.get_trainer_or_admin_tenants_for_authenticated_user()
returns table(tenant_id uuid)
language sql security definer set search_path = public stable
as $$
  select mt.tenant_id
  from public.miembros_tenant mt
  join public.roles r on r.id = mt.rol_id
  where mt.usuario_id = auth.uid()
    and lower(r.nombre) in ('entrenador', 'administrador');
$$;
```

---

## API / Server Actions

No changes to API or server actions are required. The service function `entrenamientosService.createTrainingSeries()` in `src/services/supabase/portal/entrenamientos.service.ts` already constructs the requests correctly; the failure was entirely at the RLS layer.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260330000200_entrenamientos_rls_allow_trainer.sql` | New migration: drop admin-only CUD policies on 5 tables, recreate them allowing `entrenador` + `administrador` |

No application source files require modification.

---

## Acceptance Criteria

1. A user with role `entrenador` in a tenant can successfully create a single (`tipo = 'unico'`) training session via the form modal; the row appears in the calendar immediately after saving.
2. A user with role `entrenador` can successfully create a recurring training series (`tipo = 'recurrente'`); the generated instances appear in the calendar.
3. A user with role `entrenador` can edit an existing training session (single instance update) and the change persists.
4. A user with role `entrenador` can edit all instances of a recurring series and all instances are updated.
5. A user with role `entrenador` can delete a training session; the row is removed from the calendar.
6. A user with role `entrenador` can create a training with booking restrictions (`entrenamiento_restricciones` rows); the restriction rows are persisted correctly.
7. A user with role `entrenador` can create a recurring series with group-level restrictions (`entrenamiento_grupo_restricciones` rows); the restriction rows are persisted correctly.
8. A user with role `usuario` (athlete) still cannot create, edit, or delete trainings — Supabase returns a policy violation error.
9. A user with role `administrador` continues to be able to create, edit, and delete trainings without regression.
10. RLS SELECT policies are unchanged — all tenant members can still read training rows.

---

## Implementation Steps

- [ ] Create migration file `supabase/migrations/20260330000200_entrenamientos_rls_allow_trainer.sql` with the SQL from the **Database Changes** section above
- [ ] Apply migration locally: `supabase db push` (or `supabase migration up`)
- [ ] In Supabase Studio (or `psql`), verify the 5 tables each have `*_trainer_admin` policies listed for INSERT, UPDATE, DELETE and that the old `*_admin_only` / `*_admin` policies are gone
- [ ] Manual test — coach account, happy path: create single training → confirm row visible in calendar
- [ ] Manual test — coach account: create recurring series → confirm instances visible
- [ ] Manual test — coach account: edit a training → confirm change persists
- [ ] Manual test — coach account: delete a training → confirm row removed
- [ ] Manual test — athlete account: attempt to create training → confirm failure (no UI button, and if tested via API: 403/RLS violation)
- [ ] Regression test — admin account: create, edit, delete training → confirm no regression

---

## Non-Functional Requirements

- **Security**: No overpermissioning. Only `entrenador` and `administrador` roles can CUD trainings. The helper function `get_trainer_or_admin_tenants_for_authenticated_user()` is declared `SECURITY DEFINER` and `STABLE`, consistent with its use in other modules.
- **Performance**: No new indexes needed. The existing index `idx_entrenamientos_grupo_tenant_id` and tenant-scoped primary keys are sufficient for the policy checks.
- **Accessibility**: No UI changes required.
- **Error handling**: No UI changes required. Current error surfacing in `EntrenamientosPage` (via `submitError` state) already handles Supabase errors and displays them to the user.
