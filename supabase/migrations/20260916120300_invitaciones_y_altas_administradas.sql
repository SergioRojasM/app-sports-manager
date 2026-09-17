-- US-0114: administrator onboarding of tenant members.
--   * invitaciones_tenant  — email invitation with deferred activation (default mode)
--   * altas_administradas_tenant — audit of accounts provisioned with a temporary password
--     (never stores the password)
-- Writes happen only through the RPCs below. Functions that record the outcome of a
-- Supabase Auth admin call are executable by service_role only.
-- Error contract (mapped to HTTP by the Next.js privileged routes):
--   42501 forbidden · 22023 invalid request · P0002 not found ·
--   P0001 message in (RATE_LIMIT, FEATURE_DISABLED, EXPIRED, CANCELLED, EMAIL_MISMATCH,
--                     ALREADY_ACCEPTED, ACCOUNT_EXISTS, INVALID_STATE)

begin;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.invitaciones_tenant (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  rol_id uuid not null references public.roles(id),
  nombre text,
  nota_admin text,
  estado text not null default 'pendiente',
  canal_entrega text,
  codigo_error text,
  auth_user_id uuid,
  creada_por uuid not null references public.usuarios(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  cancelled_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitaciones_tenant_estado_ck
    check (estado in ('pendiente', 'enviada', 'aceptada', 'cancelada', 'expirada', 'fallida')),
  constraint invitaciones_tenant_canal_ck
    check (canal_entrega is null or canal_entrega in ('email', 'in_app')),
  constraint invitaciones_tenant_nota_len_ck
    check (nota_admin is null or char_length(nota_admin) <= 500),
  constraint invitaciones_tenant_expiry_ck
    check (expires_at > created_at),
  constraint invitaciones_tenant_email_normalized_ck
    check (email = lower(btrim(email)))
);

create unique index if not exists invitaciones_tenant_activa_uq
  on public.invitaciones_tenant (tenant_id, lower(email))
  where estado in ('pendiente', 'enviada');
create index if not exists invitaciones_tenant_listado_idx
  on public.invitaciones_tenant (tenant_id, estado, created_at desc);
create index if not exists invitaciones_tenant_destinatario_idx
  on public.invitaciones_tenant (lower(email), estado);
create index if not exists invitaciones_tenant_activacion_idx
  on public.invitaciones_tenant (auth_user_id, estado);
create index if not exists invitaciones_tenant_creador_idx
  on public.invitaciones_tenant (creada_por, created_at desc);

drop trigger if exists trg_invitaciones_tenant_updated_at on public.invitaciones_tenant;
create trigger trg_invitaciones_tenant_updated_at
  before update on public.invitaciones_tenant
  for each row execute function public.set_updated_at();

-- One row per send attempt (create or resend); used for the per-invitation resend limit.
create table if not exists public.invitaciones_tenant_envios (
  id uuid primary key default gen_random_uuid(),
  invitacion_id uuid not null references public.invitaciones_tenant(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists invitaciones_tenant_envios_idx
  on public.invitaciones_tenant_envios (invitacion_id, created_at desc);

create table if not exists public.altas_administradas_tenant (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  usuario_id uuid references public.usuarios(id) on delete set null,
  rol_id uuid not null references public.roles(id),
  creada_por uuid not null references public.usuarios(id),
  metodo text not null default 'contrasena_temporal',
  estado text not null default 'reservada',
  codigo_error text,
  nota_admin text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint altas_administradas_metodo_ck check (metodo in ('contrasena_temporal')),
  constraint altas_administradas_estado_ck
    check (estado in ('reservada', 'pendiente_activacion', 'activada', 'fallida')),
  constraint altas_administradas_nota_len_ck
    check (nota_admin is null or char_length(nota_admin) <= 500),
  constraint altas_administradas_email_normalized_ck
    check (email = lower(btrim(email)))
);

create unique index if not exists altas_administradas_en_curso_uq
  on public.altas_administradas_tenant (tenant_id, lower(email))
  where estado in ('reservada', 'pendiente_activacion');
create index if not exists altas_administradas_tenant_idx
  on public.altas_administradas_tenant (tenant_id, created_at desc);
create index if not exists altas_administradas_usuario_idx
  on public.altas_administradas_tenant (usuario_id, tenant_id, estado);

drop trigger if exists trg_altas_administradas_updated_at on public.altas_administradas_tenant;
create trigger trg_altas_administradas_updated_at
  before update on public.altas_administradas_tenant
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: administrators read their tenant's rows; no direct writes
-- ---------------------------------------------------------------------------

alter table public.invitaciones_tenant enable row level security;
alter table public.invitaciones_tenant_envios enable row level security;
alter table public.altas_administradas_tenant enable row level security;

drop policy if exists invitaciones_tenant_select_admin on public.invitaciones_tenant;
create policy invitaciones_tenant_select_admin
  on public.invitaciones_tenant for select to authenticated
  using (tenant_id in (select adm.id from public.get_admin_tenants_for_authenticated_user() adm));

drop policy if exists altas_administradas_select_admin on public.altas_administradas_tenant;
create policy altas_administradas_select_admin
  on public.altas_administradas_tenant for select to authenticated
  using (tenant_id in (select adm.id from public.get_admin_tenants_for_authenticated_user() adm));

revoke insert, update, delete on table public.invitaciones_tenant from anon, authenticated;
revoke all on table public.invitaciones_tenant_envios from anon, authenticated;
revoke insert, update, delete on table public.altas_administradas_tenant from anon, authenticated;
grant select on table public.invitaciones_tenant to authenticated;
grant select on table public.altas_administradas_tenant to authenticated;

-- Admin list view: hides delivery channel and error code so the list does not reveal
-- whether an email already had an account.
create or replace view public.v_invitaciones_tenant_admin
with (security_invoker = true) as
select
  i.id,
  i.tenant_id,
  i.email,
  i.rol_id,
  r.nombre as rol_nombre,
  i.nombre,
  i.nota_admin,
  case
    when i.estado in ('pendiente', 'enviada') and i.expires_at <= now() then 'expirada'
    else i.estado
  end as estado,
  i.creada_por,
  i.expires_at,
  i.accepted_at,
  i.cancelled_at,
  i.last_sent_at,
  i.created_at,
  i.updated_at
from public.invitaciones_tenant i
join public.roles r on r.id = i.rol_id;

revoke all on table public.v_invitaciones_tenant_admin from anon;
grant select on table public.v_invitaciones_tenant_admin to authenticated;

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

create or replace function public._assert_admin_and_assignable_role(p_tenant_id uuid, p_rol_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not exists (select 1 from public.get_admin_tenants_for_authenticated_user() adm where adm.id = p_tenant_id) then
    raise exception 'Forbidden: caller is not admin of this tenant' using errcode = '42501';
  end if;

  if p_rol_id is null
     or not exists (
       select 1 from public.roles r
       where r.id = p_rol_id
         and lower(r.nombre) in ('administrador', 'entrenador', 'usuario')
     ) then
    raise exception 'Role is not assignable' using errcode = '22023';
  end if;
end;
$$;

create or replace function public._normalizar_email(p_email text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 255 then
    raise exception 'Invalid email' using errcode = '22023';
  end if;
  return v_email;
end;
$$;

create or replace function public._email_verificado_actual()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select lower(u.email)
  from auth.users u
  where u.id = auth.uid()
    and u.email_confirmed_at is not null;
$$;

revoke execute on function public._assert_admin_and_assignable_role(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._normalizar_email(text) from public, anon, authenticated;
revoke execute on function public._email_verificado_actual() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Invitations — administrator RPCs (user session)
-- ---------------------------------------------------------------------------

create or replace function public.crear_invitacion_tenant(
  p_tenant_id uuid,
  p_email text,
  p_rol_id uuid,
  p_nombre text default null,
  p_nota text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_id uuid;
begin
  perform public._assert_admin_and_assignable_role(p_tenant_id, p_rol_id);
  v_email := public._normalizar_email(p_email);

  if p_nota is not null and char_length(p_nota) > 500 then
    raise exception 'Note too long' using errcode = '22023';
  end if;

  select i.id into v_id
  from public.invitaciones_tenant i
  where i.tenant_id = p_tenant_id
    and lower(i.email) = v_email
    and i.estado in ('pendiente', 'enviada')
  for update;

  if v_id is not null then
    -- Re-submitting an active invitation counts as a resend.
    if (select count(*) from public.invitaciones_tenant_envios e
        where e.invitacion_id = v_id and e.created_at > now() - interval '1 hour') >= 3 then
      raise exception 'RATE_LIMIT' using errcode = 'P0001';
    end if;

    update public.invitaciones_tenant
       set rol_id = p_rol_id,
           nombre = coalesce(nullif(btrim(p_nombre), ''), nombre),
           nota_admin = coalesce(nullif(btrim(p_nota), ''), nota_admin),
           expires_at = greatest(expires_at, now() + interval '7 days')
     where id = v_id;
  else
    if (select count(*) from public.invitaciones_tenant i
        where i.creada_por = auth.uid() and i.created_at > now() - interval '1 hour') >= 30
       or (select count(*) from public.invitaciones_tenant i
           where i.tenant_id = p_tenant_id and i.created_at > now() - interval '1 day') >= 200 then
      raise exception 'RATE_LIMIT' using errcode = 'P0001';
    end if;

    insert into public.invitaciones_tenant (tenant_id, email, rol_id, nombre, nota_admin, creada_por)
    values (p_tenant_id, v_email, p_rol_id, nullif(btrim(p_nombre), ''), nullif(btrim(p_nota), ''), auth.uid())
    returning id into v_id;
  end if;

  insert into public.invitaciones_tenant_envios (invitacion_id) values (v_id);
  return v_id;
end;
$$;

create or replace function public.reenviar_invitacion_tenant(p_invitacion_id uuid)
returns table (invitacion_id uuid, tenant_id uuid, email text, nombre text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_inv public.invitaciones_tenant%rowtype;
begin
  select * into v_inv from public.invitaciones_tenant i where i.id = p_invitacion_id for update;
  if not found then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  if auth.uid() is null
     or not exists (select 1 from public.get_admin_tenants_for_authenticated_user() adm where adm.id = v_inv.tenant_id) then
    raise exception 'Forbidden: caller is not admin of this tenant' using errcode = '42501';
  end if;

  if v_inv.estado not in ('pendiente', 'enviada', 'expirada') then
    raise exception 'INVALID_STATE' using errcode = '22023';
  end if;

  if (select count(*) from public.invitaciones_tenant_envios e
      where e.invitacion_id = v_inv.id and e.created_at > now() - interval '1 hour') >= 3 then
    raise exception 'RATE_LIMIT' using errcode = 'P0001';
  end if;

  -- Reviving an expired invitation must not collide with a newer active one.
  if v_inv.estado = 'expirada' and exists (
    select 1 from public.invitaciones_tenant o
    where o.tenant_id = v_inv.tenant_id and lower(o.email) = lower(v_inv.email)
      and o.estado in ('pendiente', 'enviada') and o.id <> v_inv.id
  ) then
    raise exception 'INVALID_STATE' using errcode = '22023';
  end if;

  update public.invitaciones_tenant i
     set estado = case when i.estado = 'expirada' then 'pendiente' else i.estado end,
         expires_at = now() + interval '7 days'
   where i.id = v_inv.id;

  insert into public.invitaciones_tenant_envios (invitacion_id) values (v_inv.id);

  return query select v_inv.id, v_inv.tenant_id, v_inv.email, v_inv.nombre;
end;
$$;

create or replace function public.cancelar_invitacion_tenant(p_invitacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.invitaciones_tenant%rowtype;
begin
  select * into v_inv from public.invitaciones_tenant i where i.id = p_invitacion_id for update;
  if not found then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  if auth.uid() is null
     or not exists (select 1 from public.get_admin_tenants_for_authenticated_user() adm where adm.id = v_inv.tenant_id) then
    raise exception 'Forbidden: caller is not admin of this tenant' using errcode = '42501';
  end if;

  if v_inv.estado = 'cancelada' then
    return;
  end if;

  if v_inv.estado not in ('pendiente', 'enviada', 'expirada') then
    raise exception 'INVALID_STATE' using errcode = '22023';
  end if;

  update public.invitaciones_tenant
     set estado = 'cancelada', cancelled_at = now()
   where id = v_inv.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Invitations — outcome recording (service_role only)
-- ---------------------------------------------------------------------------

create or replace function public.registrar_envio_invitacion(p_invitacion_id uuid, p_canal text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_canal not in ('email', 'in_app') then
    raise exception 'Invalid channel' using errcode = '22023';
  end if;

  update public.invitaciones_tenant
     set canal_entrega = p_canal,
         estado = case when p_canal = 'email' then 'enviada' else estado end,
         last_sent_at = case when p_canal = 'email' then now() else last_sent_at end,
         codigo_error = null
   where id = p_invitacion_id
     and estado in ('pendiente', 'enviada');
end;
$$;

create or replace function public.registrar_fallo_invitacion(p_invitacion_id uuid, p_codigo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.invitaciones_tenant
     set estado = 'fallida',
         codigo_error = left(coalesce(p_codigo, 'desconocido'), 64)
   where id = p_invitacion_id
     and estado in ('pendiente', 'enviada');
end;
$$;

-- ---------------------------------------------------------------------------
-- Invitations — recipient RPCs (user session)
-- ---------------------------------------------------------------------------

create or replace function public.get_mis_invitaciones_pendientes()
returns table (
  id uuid,
  tenant_id uuid,
  tenant_nombre text,
  rol_nombre text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.tenant_id, t.nombre::text, r.nombre::text, i.expires_at
  from public.invitaciones_tenant i
  join public.tenants t on t.id = i.tenant_id
  join public.roles r on r.id = i.rol_id
  where lower(i.email) = public._email_verificado_actual()
    and i.estado in ('pendiente', 'enviada')
    and i.expires_at > now()
  order by i.created_at desc;
$$;

create or replace function public.get_invitacion_para_aceptar(p_invitacion_id uuid)
returns table (
  id uuid,
  tenant_id uuid,
  tenant_nombre text,
  rol_nombre text,
  expires_at timestamptz,
  estado text
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_email text := public._email_verificado_actual();
begin
  return query
  select i.id, i.tenant_id, t.nombre::text, r.nombre::text, i.expires_at,
         case
           when i.estado in ('pendiente', 'enviada') and i.expires_at <= now() then 'expirada'
           else i.estado
         end
  from public.invitaciones_tenant i
  join public.tenants t on t.id = i.tenant_id
  join public.roles r on r.id = i.rol_id
  where i.id = p_invitacion_id
    and v_email is not null
    and lower(i.email) = v_email;

  if not found then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.activar_invitacion_tenant(p_invitacion_id uuid)
returns table (tenant_id uuid, miembro_id uuid)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_email text := public._email_verificado_actual();
  v_inv public.invitaciones_tenant%rowtype;
  v_miembro_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_inv from public.invitaciones_tenant i where i.id = p_invitacion_id for update;
  if not found then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  if v_email is null or lower(v_inv.email) <> v_email then
    raise exception 'EMAIL_MISMATCH' using errcode = 'P0001';
  end if;

  if v_inv.estado = 'aceptada' then
    if v_inv.auth_user_id = v_uid then
      select mt.id into v_miembro_id
      from public.miembros_tenant mt
      where mt.tenant_id = v_inv.tenant_id and mt.usuario_id = v_uid;
      return query select v_inv.tenant_id, v_miembro_id;
      return;
    end if;
    raise exception 'ALREADY_ACCEPTED' using errcode = 'P0001';
  end if;

  if v_inv.estado = 'cancelada' then
    raise exception 'CANCELLED' using errcode = 'P0001';
  end if;

  if v_inv.estado = 'expirada'
     or (v_inv.estado in ('pendiente', 'enviada') and v_inv.expires_at <= now()) then
    raise exception 'EXPIRED' using errcode = 'P0001';
  end if;

  if v_inv.estado not in ('pendiente', 'enviada') then
    raise exception 'INVALID_STATE' using errcode = '22023';
  end if;

  insert into public.usuarios (id, email)
  select u.id, u.email from auth.users u where u.id = v_uid
  on conflict (id) do nothing;

  insert into public.miembros_tenant (tenant_id, usuario_id, rol_id, estado)
  values (v_inv.tenant_id, v_uid, v_inv.rol_id, 'activo')
  on conflict (tenant_id, usuario_id) do nothing;

  select mt.id into v_miembro_id
  from public.miembros_tenant mt
  where mt.tenant_id = v_inv.tenant_id and mt.usuario_id = v_uid;

  update public.invitaciones_tenant
     set estado = 'aceptada',
         auth_user_id = v_uid,
         accepted_at = now()
   where id = v_inv.id;

  return query select v_inv.tenant_id, v_miembro_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Administrator-provisioned accounts
-- ---------------------------------------------------------------------------

create or replace function public.reservar_alta_administrada(
  p_tenant_id uuid,
  p_email text,
  p_rol_id uuid,
  p_nota text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_id uuid;
begin
  perform public._assert_admin_and_assignable_role(p_tenant_id, p_rol_id);
  v_email := public._normalizar_email(p_email);

  if p_nota is not null and char_length(p_nota) > 500 then
    raise exception 'Note too long' using errcode = '22023';
  end if;

  if not coalesce((
    select at.aprovisionamiento_administrado_habilitado
    from public.admin_tenants at
    where at.tenant_id = p_tenant_id
  ), false) then
    raise exception 'FEATURE_DISABLED' using errcode = 'P0001';
  end if;

  if (select count(*) from public.altas_administradas_tenant a
      where a.tenant_id = p_tenant_id and a.created_at > now() - interval '1 day') >= 20 then
    raise exception 'RATE_LIMIT' using errcode = 'P0001';
  end if;

  -- A reservation abandoned mid-saga (process died) must not block a retry forever.
  update public.altas_administradas_tenant a
     set estado = 'fallida', codigo_error = 'abandonada'
   where a.tenant_id = p_tenant_id
     and lower(a.email) = v_email
     and a.estado = 'reservada'
     and a.created_at < now() - interval '10 minutes';

  if exists (
    select 1 from public.altas_administradas_tenant a
    where a.tenant_id = p_tenant_id and lower(a.email) = v_email
      and a.estado in ('reservada', 'pendiente_activacion')
  ) then
    raise exception 'ACCOUNT_EXISTS' using errcode = 'P0001';
  end if;

  insert into public.altas_administradas_tenant (tenant_id, email, rol_id, creada_por, nota_admin)
  values (p_tenant_id, v_email, p_rol_id, auth.uid(), nullif(btrim(p_nota), ''))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.completar_alta_administrada(p_alta_id uuid, p_usuario_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alta public.altas_administradas_tenant%rowtype;
  v_miembro_id uuid;
begin
  select * into v_alta from public.altas_administradas_tenant a where a.id = p_alta_id for update;
  if not found then
    raise exception 'Provisioning not found' using errcode = 'P0002';
  end if;
  if v_alta.estado <> 'reservada' then
    raise exception 'INVALID_STATE' using errcode = '22023';
  end if;

  insert into public.miembros_tenant (tenant_id, usuario_id, rol_id, estado)
  values (v_alta.tenant_id, p_usuario_id, v_alta.rol_id, 'pendiente_activacion')
  returning id into v_miembro_id;

  update public.altas_administradas_tenant
     set estado = 'pendiente_activacion', usuario_id = p_usuario_id, codigo_error = null
   where id = v_alta.id;

  return v_miembro_id;
end;
$$;

create or replace function public.registrar_fallo_alta(p_alta_id uuid, p_codigo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.altas_administradas_tenant
     set estado = 'fallida',
         codigo_error = left(coalesce(p_codigo, 'desconocido'), 64)
   where id = p_alta_id
     and estado in ('reservada', 'pendiente_activacion');
end;
$$;

create or replace function public.activar_alta_administrada(p_tenant_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_miembro_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select mt.id into v_miembro_id
  from public.miembros_tenant mt
  where mt.tenant_id = p_tenant_id
    and mt.usuario_id = v_uid
    and mt.estado = 'pendiente_activacion'
  for update;

  if v_miembro_id is null then
    raise exception 'No pending membership' using errcode = 'P0002';
  end if;

  update public.miembros_tenant set estado = 'activo' where id = v_miembro_id;

  update public.altas_administradas_tenant
     set estado = 'activada', activated_at = now()
   where tenant_id = p_tenant_id
     and usuario_id = v_uid
     and estado = 'pendiente_activacion';

  insert into public.miembros_tenant_novedades (
    tenant_id, miembro_id, tipo, descripcion, estado_resultante, registrado_por
  ) values (
    p_tenant_id, v_miembro_id, 'activacion_cuenta', 'Activación de cuenta por el miembro', 'activo', v_uid
  );

  return v_miembro_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- cambiar_estado_miembro: pending-activation transition rules
-- ---------------------------------------------------------------------------

create or replace function public.cambiar_estado_miembro(
  p_miembro_id uuid,
  p_tenant_id uuid,
  p_nuevo_estado text,
  p_tipo text,
  p_descripcion text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_estado_actual text;
begin
  if v_caller_id is null
     or not exists (select 1 from public.get_admin_tenants_for_authenticated_user() adm where adm.id = p_tenant_id) then
    raise exception 'Forbidden: caller is not admin of this tenant'
      using errcode = '42501';
  end if;

  if p_nuevo_estado = 'pendiente_activacion' then
    raise exception 'Cannot move a member into pendiente_activacion'
      using errcode = '22023';
  end if;

  select mt.estado into v_estado_actual
  from public.miembros_tenant mt
  where mt.id = p_miembro_id
    and mt.tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception 'Member not found in this tenant'
      using errcode = 'P0002';
  end if;

  if v_estado_actual = 'pendiente_activacion' and p_nuevo_estado not in ('activo', 'inactivo') then
    raise exception 'A pending member can only become activo or inactivo'
      using errcode = '22023';
  end if;

  update public.miembros_tenant
     set estado = p_nuevo_estado
   where id = p_miembro_id
     and tenant_id = p_tenant_id;

  insert into public.miembros_tenant_novedades(
    tenant_id, miembro_id, tipo, descripcion, estado_resultante, registrado_por
  ) values (
    p_tenant_id, p_miembro_id, p_tipo, p_descripcion, p_nuevo_estado, v_caller_id
  );

  if v_estado_actual = 'pendiente_activacion' and p_nuevo_estado = 'activo' then
    update public.altas_administradas_tenant a
       set estado = 'activada', activated_at = now()
      from public.miembros_tenant mt
     where mt.id = p_miembro_id
       and a.tenant_id = p_tenant_id
       and a.usuario_id = mt.usuario_id
       and a.estado = 'pendiente_activacion';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function public.crear_invitacion_tenant(uuid, text, uuid, text, text) from public, anon;
revoke execute on function public.reenviar_invitacion_tenant(uuid) from public, anon;
revoke execute on function public.cancelar_invitacion_tenant(uuid) from public, anon;
revoke execute on function public.get_mis_invitaciones_pendientes() from public, anon;
revoke execute on function public.get_invitacion_para_aceptar(uuid) from public, anon;
revoke execute on function public.activar_invitacion_tenant(uuid) from public, anon;
revoke execute on function public.reservar_alta_administrada(uuid, text, uuid, text) from public, anon;
revoke execute on function public.activar_alta_administrada(uuid) from public, anon;
revoke execute on function public.cambiar_estado_miembro(uuid, uuid, text, text, text) from public, anon;

grant execute on function public.crear_invitacion_tenant(uuid, text, uuid, text, text) to authenticated;
grant execute on function public.reenviar_invitacion_tenant(uuid) to authenticated;
grant execute on function public.cancelar_invitacion_tenant(uuid) to authenticated;
grant execute on function public.get_mis_invitaciones_pendientes() to authenticated;
grant execute on function public.get_invitacion_para_aceptar(uuid) to authenticated;
grant execute on function public.activar_invitacion_tenant(uuid) to authenticated;
grant execute on function public.reservar_alta_administrada(uuid, text, uuid, text) to authenticated;
grant execute on function public.activar_alta_administrada(uuid) to authenticated;
grant execute on function public.cambiar_estado_miembro(uuid, uuid, text, text, text) to authenticated;

revoke execute on function public.registrar_envio_invitacion(uuid, text) from public, anon, authenticated;
revoke execute on function public.registrar_fallo_invitacion(uuid, text) from public, anon, authenticated;
revoke execute on function public.completar_alta_administrada(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.registrar_fallo_alta(uuid, text) from public, anon, authenticated;
grant execute on function public.registrar_envio_invitacion(uuid, text) to service_role;
grant execute on function public.registrar_fallo_invitacion(uuid, text) to service_role;
grant execute on function public.completar_alta_administrada(uuid, uuid) to service_role;
grant execute on function public.registrar_fallo_alta(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Daily expiry of invitations (provisioned accounts never expire)
-- ---------------------------------------------------------------------------

create or replace function public.expirar_invitaciones_tenant()
returns void
language sql
security definer
set search_path = public
as $$
  update public.invitaciones_tenant
     set estado = 'expirada'
   where estado in ('pendiente', 'enviada')
     and expires_at <= now();
$$;

revoke execute on function public.expirar_invitaciones_tenant() from public, anon, authenticated;

select cron.unschedule(j.jobname) from cron.job j where j.jobname = 'expirar-invitaciones-tenant';
select cron.schedule(
  'expirar-invitaciones-tenant',
  '15 6 * * *',
  $$SELECT public.expirar_invitaciones_tenant();$$
);

commit;
