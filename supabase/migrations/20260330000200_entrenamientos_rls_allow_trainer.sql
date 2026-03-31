-- ============================================================
-- Migration: Fix RLS policies to allow entrenador role to
-- create, edit, and delete training sessions.
--
-- Problem: INSERT/UPDATE/DELETE policies on all five training
-- tables used get_admin_tenants_for_authenticated_user(), which
-- only covers the administrador role. This silently blocked
-- coaches from writing training data.
--
-- Fix: Replace those policies with equivalents that use the
-- existing get_trainer_or_admin_tenants_for_authenticated_user()
-- function, which covers both entrenador and administrador.
--
-- US-0049
-- ============================================================

begin;

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
