begin;

insert into public.tenants (nombre, fecha_creacion, descripcion)
values ('public', current_date, 'Tenant por defecto para asignación automática de usuarios')
on conflict (nombre) do nothing;

insert into public.roles (nombre, descripcion)
select
  r.nombre,
  r.descripcion
from (
  values
    ('administrador'::varchar, 'Rol administrativo del tenant'::text),
    ('entrenador'::varchar, 'Rol de entrenador del tenant'::text),
    ('atleta'::varchar, 'Rol por defecto para nuevos usuarios'::text)
) as r(nombre, descripcion)
on conflict (nombre) do nothing;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_rol_id uuid;
begin
  v_tenant_id := nullif(new.raw_user_meta_data ->> 'tenant_id', '')::uuid;
  v_rol_id := nullif(new.raw_user_meta_data ->> 'rol_id', '')::uuid;

  if v_tenant_id is not null then
    select t.id
      into v_tenant_id
    from public.tenants t
    where t.id = v_tenant_id
    limit 1;
  end if;

  if v_tenant_id is null then
    select t.id
      into v_tenant_id
    from public.tenants t
    where lower(t.nombre) = 'public'
    limit 1;
  end if;

  if v_tenant_id is null then
    insert into public.tenants (nombre, fecha_creacion, descripcion)
    values ('public', current_date, 'Tenant por defecto para asignación automática de usuarios')
    returning id into v_tenant_id;
  end if;

  insert into public.roles (nombre, descripcion)
  select
    r.nombre,
    r.descripcion
  from (
    values
      ('admin'::varchar, 'Rol administrativo del tenant'::text),
      ('entrenador'::varchar, 'Rol de entrenador del tenant'::text),
      ('atleta'::varchar, 'Rol por defecto para nuevos usuarios'::text)
  ) as r(nombre, descripcion)
  on conflict (nombre) do nothing;

  if v_rol_id is not null then
    select r.id
      into v_rol_id
    from public.roles r
    where r.id = v_rol_id
    limit 1;
  end if;

  if v_rol_id is null then
    select r.id
      into v_rol_id
    from public.roles r
    where lower(r.nombre) = 'atleta'
    limit 1;
  end if;

  if v_rol_id is null then
    insert into public.roles (nombre, descripcion)
    values ('atleta', 'Rol por defecto para nuevos usuarios')
    returning id into v_rol_id;
  end if;

  insert into public.usuarios (
    id,
    tenant_id,
    email,
    nombre,
    apellido,
    telefono,
    fecha_nacimiento,
    foto_url,
    rol_id,
    activo,
    created_at
  )
  values (
    new.id,
    v_tenant_id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'nombre', ''),
    nullif(new.raw_user_meta_data ->> 'apellido', ''),
    nullif(new.raw_user_meta_data ->> 'telefono', ''),
    nullif(new.raw_user_meta_data ->> 'fecha_nacimiento', '')::date,
    nullif(new.raw_user_meta_data ->> 'foto_url', ''),
    v_rol_id,
    true,
    coalesce(new.created_at, timezone('utc', now()))
  )
  on conflict (id) do update
  set
    tenant_id = excluded.tenant_id,
    email = excluded.email,
    nombre = coalesce(excluded.nombre, public.usuarios.nombre),
    apellido = coalesce(excluded.apellido, public.usuarios.apellido),
    telefono = coalesce(excluded.telefono, public.usuarios.telefono),
    fecha_nacimiento = coalesce(excluded.fecha_nacimiento, public.usuarios.fecha_nacimiento),
    foto_url = coalesce(excluded.foto_url, public.usuarios.foto_url),
    rol_id = coalesce(excluded.rol_id, public.usuarios.rol_id),
    activo = true;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

commit;

