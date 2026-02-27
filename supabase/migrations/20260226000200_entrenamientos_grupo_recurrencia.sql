begin;

create index if not exists idx_entrenamientos_grupo_tenant_id
  on public.entrenamientos_grupo (tenant_id);

create index if not exists idx_entrenamientos_grupo_estado
  on public.entrenamientos_grupo (estado);

create index if not exists idx_entrenamientos_grupo_tipo
  on public.entrenamientos_grupo (tipo);

create index if not exists idx_entrenamientos_grupo_reglas_grupo_id
  on public.entrenamientos_grupo_reglas (entrenamiento_grupo_id);

create index if not exists idx_entrenamientos_grupo_reglas_dia_semana
  on public.entrenamientos_grupo_reglas (dia_semana);

create index if not exists idx_entrenamientos_entrenamiento_grupo_id
  on public.entrenamientos (entrenamiento_grupo_id);

create index if not exists idx_entrenamientos_entrenamiento_grupo_regla_id
  on public.entrenamientos (entrenamiento_grupo_regla_id);

create index if not exists idx_entrenamientos_fecha_hora
  on public.entrenamientos (fecha_hora);


create or replace function public.sync_entrenamientos_from_grupo()
returns trigger
language plpgsql
as $$
begin
  update public.entrenamientos
  set
    nombre = new.nombre,
    descripcion = new.descripcion,
    disciplina_id = new.disciplina_id,
    escenario_id = new.escenario_id,
    entrenador_id = new.entrenador_id,
    duracion_minutos = new.duracion_minutos,
    cupo_maximo = new.cupo_maximo,
    updated_at = timezone('utc', now())
  where entrenamiento_grupo_id = new.id
    and tenant_id = new.tenant_id
    and (fecha_hora is null or fecha_hora >= timezone('utc', now()))
    and coalesce(lower(estado), '') not in ('cancelado')
    and coalesce(bloquear_sync_grupo, false) = false;

  return new;
end;
$$;

drop trigger if exists entrenamientos_grupo_sync_entrenamientos on public.entrenamientos_grupo;
create trigger entrenamientos_grupo_sync_entrenamientos
after update of
  nombre,
  descripcion,
  disciplina_id,
  escenario_id,
  entrenador_id,
  duracion_minutos,
  cupo_maximo
on public.entrenamientos_grupo
for each row
execute function public.sync_entrenamientos_from_grupo();

alter table public.entrenamientos_grupo enable row level security;
alter table public.entrenamientos_grupo_reglas enable row level security;

grant select on table public.entrenamientos_grupo to authenticated;
grant select on table public.entrenamientos_grupo_reglas to authenticated;

drop policy if exists entrenamientos_grupo_select_authenticated on public.entrenamientos_grupo;
create policy entrenamientos_grupo_select_authenticated on public.entrenamientos_grupo
  for select to authenticated
  using (true);

drop policy if exists entrenamientos_grupo_reglas_select_authenticated on public.entrenamientos_grupo_reglas;
create policy entrenamientos_grupo_reglas_select_authenticated on public.entrenamientos_grupo_reglas
  for select to authenticated
  using (true);

drop policy if exists entrenamientos_grupo_update_admin_only on public.entrenamientos_grupo;
create policy entrenamientos_grupo_update_admin_only on public.entrenamientos_grupo
  for update to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  )
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

drop policy if exists entrenamientos_grupo_insert_admin_only on public.entrenamientos_grupo;
create policy entrenamientos_grupo_insert_admin_only on public.entrenamientos_grupo
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

drop policy if exists entrenamientos_grupo_delete_admin_only on public.entrenamientos_grupo;
create policy entrenamientos_grupo_delete_admin_only on public.entrenamientos_grupo
  for delete to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

drop policy if exists entrenamientos_grupo_reglas_update_admin_only on public.entrenamientos_grupo_reglas;
create policy entrenamientos_grupo_reglas_update_admin_only on public.entrenamientos_grupo_reglas
  for update to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  )
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

drop policy if exists entrenamientos_grupo_reglas_insert_admin_only on public.entrenamientos_grupo_reglas;
create policy entrenamientos_grupo_reglas_insert_admin_only on public.entrenamientos_grupo_reglas
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

drop policy if exists entrenamientos_grupo_reglas_delete_admin_only on public.entrenamientos_grupo_reglas;
create policy entrenamientos_grupo_reglas_delete_admin_only on public.entrenamientos_grupo_reglas
  for delete to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

drop policy if exists entrenamientos_update_admin_only on public.entrenamientos;
create policy entrenamientos_update_admin_only on public.entrenamientos
  for update to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  )
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

drop policy if exists entrenamientos_insert_admin_only on public.entrenamientos;
create policy entrenamientos_insert_admin_only on public.entrenamientos
  for insert to authenticated
  with check (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

drop policy if exists entrenamientos_delete_admin_only on public.entrenamientos;
create policy entrenamientos_delete_admin_only on public.entrenamientos
  for delete to authenticated
  using (
    tenant_id in (
      select admin_tenants.id
      from public.get_admin_tenants_for_authenticated_user() admin_tenants
    )
  );

commit;
