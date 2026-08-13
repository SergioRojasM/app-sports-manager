-- =============================================
-- Migration: Widen handle_new_auth_user() metadata mapping for Google OAuth
-- US-0104: Google's OAuth provider populates raw_user_meta_data under
-- full_name/name and avatar_url/picture instead of the password-signup
-- flow's own nombre/foto_url keys. Widen the trigger function's nombre and
-- foto_url resolution to coalesce across both key sets (existing keys take
-- priority) so first-time Google signups get their name/photo populated.
-- =============================================

begin;

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
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nombre', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', '')
    ),
    nullif(new.raw_user_meta_data ->> 'apellido', ''),
    nullif(new.raw_user_meta_data ->> 'telefono', ''),
    nullif(new.raw_user_meta_data ->> 'fecha_nacimiento', '')::date,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'foto_url', ''),
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    ),
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

commit;
