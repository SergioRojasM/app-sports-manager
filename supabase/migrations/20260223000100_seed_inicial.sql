begin;

-- insert into public.tenants (nombre, fecha_creacion, descripcion)
-- values ('public', current_date, 'Tenant por defecto para asignación automática de usuarios')
-- on conflict (nombre) do nothing;

insert into public.tenants (id, nombre, email, telefono, descripcion, fecha_creacion)
values (
	'2a089688-3cfc-4216-9372-33f50079fbd1',
	'public',
	'public@qbop.test',
	null,
	'Tenant público del sistema. Agrupa entrenamientos con visibilidad pública visibles para todos los usuarios autenticados.',
	current_date
)
on conflict (nombre) do nothing;

insert into public.roles (nombre, descripcion)
select
  r.nombre,
  r.descripcion
from (
  values
    ('administrador'::varchar, 'Rol administrativo del tenant'::text),
    ('entrenador'::varchar, 'Rol de entrenador del tenant'::text),
    ('usuario'::varchar, 'Rol por defecto para nuevos usuarios'::text)
) as r(nombre, descripcion)
on conflict (nombre) do nothing;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_public_tenant_id uuid;
  v_default_role_id uuid;
begin
  select t.id
    into v_public_tenant_id
  from public.tenants t
  where lower(t.nombre) = 'public'
  order by t.created_at asc, t.id asc
  limit 1;

  select r.id
    into v_default_role_id
  from public.roles r
  where lower(r.nombre) = 'usuario'
  order by r.created_at asc, r.id asc
  limit 1;

  insert into public.usuarios (
    id,
    email,
    nombre,
    apellido,
    telefono,
    fecha_nacimiento,
    foto_url,
    activo,
    created_at
  )
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'nombre', ''),
    nullif(new.raw_user_meta_data ->> 'apellido', ''),
    nullif(new.raw_user_meta_data ->> 'telefono', ''),
    nullif(new.raw_user_meta_data ->> 'fecha_nacimiento', '')::date,
    nullif(new.raw_user_meta_data ->> 'foto_url', ''),
    true,
    coalesce(new.created_at, timezone('utc', now()))
  )
  on conflict (id) do update
  set
    email = excluded.email,
    nombre = coalesce(excluded.nombre, public.usuarios.nombre),
    apellido = coalesce(excluded.apellido, public.usuarios.apellido),
    telefono = coalesce(excluded.telefono, public.usuarios.telefono),
    fecha_nacimiento = coalesce(excluded.fecha_nacimiento, public.usuarios.fecha_nacimiento),
    foto_url = coalesce(excluded.foto_url, public.usuarios.foto_url),
    activo = true;

  insert into public.miembros_tenant (
    tenant_id,
    usuario_id,
    rol_id,
    descripcion
  )
  values (
    v_public_tenant_id,
    new.id,
    v_default_role_id,
    'Membresía por defecto para onboarding'
  )
  on conflict (tenant_id, usuario_id) do update
  set
    rol_id = excluded.rol_id,
    descripcion = coalesce(public.miembros_tenant.descripcion, excluded.descripcion);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

commit;

