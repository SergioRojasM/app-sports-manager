-- US-0125: cross-cutting notifications module (email outbox + in-app inbox), first consumer: events.
--
--   purchase RPC ──> _encolar_notificacion() ──> _notificar_email()  ──> notificaciones_outbox
--                                          └──> _notificar_in_app() ──> notificaciones ──Realtime──> header bell
--   notificaciones_outbox ── insert trigger (pg_net) + pg_cron every minute ──>
--     POST /api/internal/notificaciones/despachar ──> Resend
--
-- The dispatcher URL and bearer secret live in Supabase Vault (`notificaciones_dispatch_url`,
-- `notificaciones_dispatch_secret`). Without them (default local setup) nothing is called.

begin;

create extension if not exists pg_net;

-- ─────────────────────────────────────────────
-- 1. Email outbox (service role / cron only)
-- ─────────────────────────────────────────────

create table public.notificaciones_outbox (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid references public.tenants(id) on delete cascade,
  modulo                  varchar(40) not null,
  tipo                    varchar(60) not null,
  destinatario_email      varchar(254) not null,
  destinatario_usuario_id uuid references public.usuarios(id) on delete set null,
  entidad_tipo            varchar(40),
  entidad_id              uuid,
  payload                 jsonb not null default '{}'::jsonb,
  estado                  varchar(20) not null default 'pendiente',
  intentos                smallint not null default 0,
  ultimo_error            text,
  proximo_intento_at      timestamptz not null default now(),
  bloqueada_at            timestamptz,
  proveedor_id            text,
  created_at              timestamptz not null default now(),
  enviada_at              timestamptz,
  constraint notificaciones_outbox_estado_ck
    check (estado in ('pendiente', 'procesando', 'enviada', 'error'))
);

create index idx_notificaciones_outbox_pendientes
  on public.notificaciones_outbox (proximo_intento_at) where estado = 'pendiente';
create index idx_notificaciones_outbox_entidad
  on public.notificaciones_outbox (entidad_tipo, entidad_id);

alter table public.notificaciones_outbox enable row level security;
revoke all on public.notificaciones_outbox from anon, authenticated;

-- ─────────────────────────────────────────────
-- 2. In-app inbox: the legacy table was unused, had no tenant/link columns and was readable by everyone
-- ─────────────────────────────────────────────

drop table if exists public.notificaciones;

create table public.notificaciones (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references public.usuarios(id) on delete cascade,
  tenant_id    uuid references public.tenants(id) on delete cascade,
  modulo       varchar(40) not null,
  tipo         varchar(60) not null,
  titulo       varchar(200) not null,
  mensaje      text not null,
  url          text,
  entidad_tipo varchar(40),
  entidad_id   uuid,
  leida        boolean not null default false,
  leida_at     timestamptz,
  created_at   timestamptz not null default now()
);

create index idx_notificaciones_usuario on public.notificaciones (usuario_id, created_at desc);
create index idx_notificaciones_no_leidas on public.notificaciones (usuario_id) where leida = false;

alter table public.notificaciones enable row level security;
revoke all on public.notificaciones from anon, authenticated;
grant select on public.notificaciones to authenticated;

-- No insert/update/delete policy: writes go through the SECURITY DEFINER functions below
create policy notificaciones_select_own on public.notificaciones
  for select to authenticated
  using (usuario_id = auth.uid());

alter publication supabase_realtime add table public.notificaciones;

-- ─────────────────────────────────────────────
-- 3. Enqueue helpers (called from other modules' RPCs)
-- ─────────────────────────────────────────────

create or replace function public._notificar_email(
  p_tenant_id uuid,
  p_modulo text,
  p_tipo text,
  p_email text,
  p_usuario_id uuid,
  p_entidad_tipo text,
  p_entidad_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_email is null or btrim(p_email) = '' then
    return;
  end if;

  insert into notificaciones_outbox
    (tenant_id, modulo, tipo, destinatario_email, destinatario_usuario_id, entidad_tipo, entidad_id, payload)
  values
    (p_tenant_id, p_modulo, p_tipo, lower(btrim(p_email)), p_usuario_id, p_entidad_tipo, p_entidad_id,
     coalesce(p_payload, '{}'::jsonb));
end;
$$;

create or replace function public._notificar_in_app(
  p_usuario_id uuid,
  p_tenant_id uuid,
  p_modulo text,
  p_tipo text,
  p_titulo text,
  p_mensaje text,
  p_url text,
  p_entidad_tipo text,
  p_entidad_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_usuario_id is null then
    return;
  end if;

  insert into notificaciones
    (usuario_id, tenant_id, modulo, tipo, titulo, mensaje, url, entidad_tipo, entidad_id)
  values
    (p_usuario_id, p_tenant_id, p_modulo, p_tipo, left(p_titulo, 200), p_mensaje, p_url, p_entidad_tipo, p_entidad_id);
end;
$$;

-- Administrators of a tenant that can already use the portal
create or replace function public._admins_tenant(p_tenant_id uuid)
returns table (usuario_id uuid, email text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.email::text
    from miembros_tenant mt
    join roles r on r.id = mt.rol_id
    join usuarios u on u.id = mt.usuario_id
   where mt.tenant_id = p_tenant_id
     and r.nombre = 'administrador'
     and mt.estado <> 'pendiente_activacion';
$$;

revoke all on function public._notificar_email(uuid, text, text, text, uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public._notificar_in_app(uuid, uuid, text, text, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public._admins_tenant(uuid) from public, anon, authenticated;

-- ─────────────────────────────────────────────
-- 4. Events: same signature, so the 7 call sites in the purchase RPCs are untouched
-- ─────────────────────────────────────────────

create or replace function public._encolar_notificacion(p_compra_id uuid, p_tipo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v         record;
  v_payload jsonb;
  v_titulo  text;
  v_mensaje text;
  v_admin   record;
begin
  select c.id, c.tenant_id, c.evento_id, c.comprador_email, c.comprador_usuario_id, c.comprador_nombre,
         c.entrada_nombre, c.estado, c.total, c.motivo_rechazo, c.validado_at,
         e.nombre as evento_nombre, e.fecha_hora, e.nombre_tenant
    into v
    from evento_compras c
    join eventos e on e.id = c.evento_id
   where c.id = p_compra_id;
  if not found then
    return;
  end if;

  v_payload := jsonb_build_object(
    'compra_id', v.id,
    'tenant_id', v.tenant_id,
    'evento_id', v.evento_id,
    'evento_nombre', v.evento_nombre,
    'fecha_hora', v.fecha_hora,
    'nombre_tenant', v.nombre_tenant,
    'comprador_nombre', v.comprador_nombre,
    'entrada_nombre', v.entrada_nombre,
    'codigos', coalesce((select jsonb_agg(t.codigo order by t.created_at, t.codigo)
                           from evento_tickets t where t.compra_id = v.id), '[]'::jsonb),
    'estado', v.estado,
    'total', v.total,
    'motivo_rechazo', v.motivo_rechazo);

  -- Buyer: email always, in-app only with an account (guests have none)
  perform _notificar_email(v.tenant_id, 'eventos', p_tipo, v.comprador_email, v.comprador_usuario_id,
                           'evento_compra', v.id, v_payload);

  if v.comprador_usuario_id is not null then
    case p_tipo
      when 'compra_recibida' then
        v_titulo := 'Recibimos tu compra';
        v_mensaje := format('Tu compra para %s está en validación.', v.evento_nombre);
      when 'compra_confirmada' then
        v_titulo := 'Compra confirmada';
        v_mensaje := format('Tu entrada para %s ya está activa.', v.evento_nombre);
      when 'compra_rechazada' then
        v_titulo := 'Compra rechazada';
        v_mensaje := format('Tu compra para %s fue rechazada: %s', v.evento_nombre, coalesce(v.motivo_rechazo, ''));
      when 'compra_cancelada' then
        v_titulo := 'Compra cancelada';
        v_mensaje := format('Cancelaste tu compra para %s.', v.evento_nombre);
      else
        v_titulo := null;
    end case;

    if v_titulo is not null then
      perform _notificar_in_app(v.comprador_usuario_id, v.tenant_id, 'eventos', p_tipo, v_titulo, v_mensaje,
                                '/portal/mis-entradas', 'evento_compra', v.id);
    end if;
  end if;

  -- Administrators: purchases awaiting validation, and confirmations nobody on staff performed.
  -- validar_compra_evento sets validado_at = now() (the transaction time) right before calling this.
  -- validado_por cannot tell them apart: a rejected purchase keeps it and may auto-confirm on re-upload.
  if p_tipo = 'compra_recibida'
     or (p_tipo = 'compra_confirmada' and v.validado_at is distinct from now()) then
    v_titulo := case when p_tipo = 'compra_recibida' then 'Nueva compra por validar' else 'Nueva compra confirmada' end;
    v_mensaje := format('%s compró %s para %s.', v.comprador_nombre, v.entrada_nombre, v.evento_nombre);

    for v_admin in select a.usuario_id, a.email from _admins_tenant(v.tenant_id) a loop
      perform _notificar_email(v.tenant_id, 'eventos', 'compra_nueva_admin', v_admin.email, v_admin.usuario_id,
                               'evento_compra', v.id, v_payload);
      perform _notificar_in_app(v_admin.usuario_id, v.tenant_id, 'eventos', 'compra_nueva_admin', v_titulo, v_mensaje,
                                format('/portal/orgs/%s/gestion-eventos/%s/compras', v.tenant_id, v.evento_id),
                                'evento_compra', v.id);
    end loop;
  end if;
end;
$$;

revoke all on function public._encolar_notificacion(uuid, text) from public, anon, authenticated;

-- ─────────────────────────────────────────────
-- 5. Dispatcher side: claim and resolve (service role only)
-- ─────────────────────────────────────────────

-- Due pending rows plus rows a dead dispatcher left in `procesando` for more than 10 minutes
create or replace function public.reclamar_notificaciones_outbox(p_limite integer default 20)
returns setof public.notificaciones_outbox
language sql
security definer
set search_path = public
as $$
  update notificaciones_outbox o
     set estado = 'procesando', bloqueada_at = now()
   where o.id in (
     select c.id
       from notificaciones_outbox c
      where (c.estado = 'pendiente' and c.proximo_intento_at <= now())
         or (c.estado = 'procesando' and c.bloqueada_at < now() - interval '10 minutes')
      order by c.proximo_intento_at
      limit greatest(coalesce(p_limite, 20), 1)
      for update skip locked)
  returning o.*;
$$;

-- Retry schedule: 1 min, 5 min, 30 min, 2 h; the 5th failure is final
create or replace function public.resolver_notificacion_outbox(
  p_id uuid,
  p_ok boolean,
  p_proveedor_id text,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(p_ok, false) then
    update notificaciones_outbox
       set estado = 'enviada', enviada_at = now(), proveedor_id = p_proveedor_id, bloqueada_at = null
     where id = p_id and estado = 'procesando';
  else
    update notificaciones_outbox
       set intentos = intentos + 1,
           ultimo_error = left(coalesce(nullif(btrim(p_error), ''), 'error'), 500),
           bloqueada_at = null,
           estado = case when intentos + 1 >= 5 then 'error' else 'pendiente' end,
           proximo_intento_at = now() + case intentos + 1
                                          when 1 then interval '1 minute'
                                          when 2 then interval '5 minutes'
                                          when 3 then interval '30 minutes'
                                          else interval '2 hours'
                                        end
     where id = p_id and estado = 'procesando';
  end if;
end;
$$;

revoke all on function public.reclamar_notificaciones_outbox(integer) from public, anon, authenticated;
revoke all on function public.resolver_notificacion_outbox(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.reclamar_notificaciones_outbox(integer) to service_role;
grant execute on function public.resolver_notificacion_outbox(uuid, boolean, text, text) to service_role;

-- ─────────────────────────────────────────────
-- 6. Inbox: mark as read (own rows only)
-- ─────────────────────────────────────────────

create or replace function public.marcar_notificacion_leida(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update notificaciones
     set leida = true, leida_at = now()
   where id = p_id and usuario_id = auth.uid() and leida = false;
$$;

create or replace function public.marcar_notificaciones_leidas()
returns void
language sql
security definer
set search_path = public
as $$
  update notificaciones
     set leida = true, leida_at = now()
   where usuario_id = auth.uid() and leida = false;
$$;

revoke all on function public.marcar_notificacion_leida(uuid) from public, anon;
revoke all on function public.marcar_notificaciones_leidas() from public, anon;
grant execute on function public.marcar_notificacion_leida(uuid) to authenticated;
grant execute on function public.marcar_notificaciones_leidas() to authenticated;

-- ─────────────────────────────────────────────
-- 7. Dispatch: pg_net queues the request and sends it after commit, so callers are never blocked.
--    It must never raise: a purchase cannot fail because of a notification.
-- ─────────────────────────────────────────────

create or replace function public._disparar_despacho()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
begin
  select ds.decrypted_secret into v_url
    from vault.decrypted_secrets ds where ds.name = 'notificaciones_dispatch_url';
  select ds.decrypted_secret into v_secret
    from vault.decrypted_secrets ds where ds.name = 'notificaciones_dispatch_secret';

  if coalesce(btrim(v_url), '') = '' or coalesce(btrim(v_secret), '') = '' then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 55000);
exception when others then
  raise warning 'notificaciones: dispatch call failed (%)', sqlstate;
end;
$$;

create or replace function public._notificaciones_outbox_despachar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _disparar_despacho();
  return null;
end;
$$;

create trigger notificaciones_outbox_despachar
  after insert on public.notificaciones_outbox
  for each statement execute function public._notificaciones_outbox_despachar();

-- Cron entry point: zero HTTP calls while nothing is due
create or replace function public.despachar_notificaciones_pendientes()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from notificaciones_outbox o
     where (o.estado = 'pendiente' and o.proximo_intento_at <= now())
        or (o.estado = 'procesando' and o.bloqueada_at < now() - interval '10 minutes')) then
    perform _disparar_despacho();
  end if;
end;
$$;

revoke all on function public._disparar_despacho() from public, anon, authenticated;
revoke all on function public._notificaciones_outbox_despachar() from public, anon, authenticated;
revoke all on function public.despachar_notificaciones_pendientes() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'despachar-notificaciones';

select cron.schedule(
  'despachar-notificaciones',
  '* * * * *',
  $$select public.despachar_notificaciones_pendientes();$$
);

-- ─────────────────────────────────────────────
-- 8. The events-only outbox is replaced by the generic one. Its rows are NOT migrated:
--    they are stale notices that were never meant to be sent.
-- ─────────────────────────────────────────────

drop table public.evento_notificaciones;

commit;
