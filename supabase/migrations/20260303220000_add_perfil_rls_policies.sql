-- ─────────────────────────────────────────────────────────────────────────────
-- RLS policies for user profile self-management (US0018)
-- Allows authenticated users to update their own usuarios row and
-- insert/update their own perfil_deportivo row.
-- ─────────────────────────────────────────────────────────────────────────────

-- usuarios: allow each user to update only their own row
drop policy if exists usuarios_update_own on public.usuarios;
create policy usuarios_update_own on public.usuarios
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- perfil_deportivo: allow each user to select only their own row
drop policy if exists perfil_deportivo_select_own on public.perfil_deportivo;
create policy perfil_deportivo_select_own on public.perfil_deportivo
  for select to authenticated
  using (user_id = auth.uid());

-- perfil_deportivo: allow each user to insert their own row
drop policy if exists perfil_deportivo_insert_own on public.perfil_deportivo;
create policy perfil_deportivo_insert_own on public.perfil_deportivo
  for insert to authenticated
  with check (user_id = auth.uid());

-- perfil_deportivo: allow each user to update their own row
drop policy if exists perfil_deportivo_update_own on public.perfil_deportivo;
create policy perfil_deportivo_update_own on public.perfil_deportivo
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
