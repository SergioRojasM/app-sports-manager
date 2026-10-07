-- US-0134: subscription and payment notifications (email + in-app) on top of the US-0125 module.
--
--   Athlete purchase ──> comprar_suscripcion()  (one transaction; replaces three client writes)
--                          └─> _encolar_notificacion_suscripcion(recibida, nueva_admin)
--   Direct writes (admin screens, proof re-upload) ──> AFTER triggers on suscripciones / pagos
--                          └─> _encolar_notificacion_suscripcion(...)
--
-- Athletes can no longer insert into suscripciones / pagos directly: the RPC is the only path,
-- so its validations, its server-side amount and its notifications cannot be bypassed.

begin;

-- ─────────────────────────────────────────────
-- 1. Enqueue helper: athlete types go to the athlete, *_admin types to the tenant administrators
-- ─────────────────────────────────────────────

create or replace function public._encolar_notificacion_suscripcion(
  p_suscripcion_id uuid,
  p_tipo text,
  p_pago_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v           record;
  v_pago      record;
  v_plan      text;
  v_atleta    text;
  v_requiere  boolean;
  v_payload   jsonb;
  v_titulo    text;
  v_mensaje   text;
  v_url       text;
  v_admin     record;
begin
  select s.id, s.tenant_id, s.atleta_id, s.estado, s.fecha_fin,
         p.nombre as plan_nombre, pt.nombre as tipo_nombre, t.nombre as tenant_nombre,
         u.email as atleta_email, u.nombre as atleta_nombre, u.apellido as atleta_apellido
    into v
    from suscripciones s
    join planes p on p.id = s.plan_id
    left join plan_tipos pt on pt.id = s.plan_tipo_id
    join tenants t on t.id = s.tenant_id
    join usuarios u on u.id = s.atleta_id
   where s.id = p_suscripcion_id;
  if not found then
    return;
  end if;

  select pg.estado, pg.motivo_rechazo into v_pago from pagos pg where pg.id = p_pago_id;

  v_plan := v.plan_nombre || coalesce(' — ' || v.tipo_nombre, '');
  v_atleta := btrim(coalesce(v.atleta_nombre, '') || ' ' || coalesce(v.atleta_apellido, ''));
  if v_atleta = '' then
    v_atleta := 'Un atleta';
  end if;
  v_requiere := v.estado = 'pendiente' or coalesce(v_pago.estado, '') = 'pendiente';

  v_payload := jsonb_build_object(
    'suscripcion_id', v.id,
    'pago_id', p_pago_id,
    'tenant_id', v.tenant_id,
    'plan', v_plan,
    'tenant_nombre', v.tenant_nombre,
    'atleta_nombre', v_atleta,
    'motivo_rechazo', v_pago.motivo_rechazo,
    'requiere_validacion', v_requiere);

  -- Tenant administrators
  if p_tipo in ('suscripcion_nueva_admin', 'pago_comprobante_admin') then
    if p_tipo = 'suscripcion_nueva_admin' then
      v_titulo := case when v_requiere then 'Nueva suscripción por validar' else 'Nueva suscripción' end;
      v_mensaje := format('%s compró %s.', v_atleta, v_plan);
    else
      v_titulo := 'Nuevo pago por validar';
      v_mensaje := format('%s subió un comprobante para %s.', v_atleta, v_plan);
    end if;
    v_url := format('/portal/orgs/%s/gestion-suscripciones', v.tenant_id);

    for v_admin in select a.usuario_id, a.email from _admins_tenant(v.tenant_id) a loop
      perform _notificar_email(v.tenant_id, 'suscripciones', p_tipo, v_admin.email, v_admin.usuario_id,
                               'suscripcion', v.id, v_payload);
      perform _notificar_in_app(v_admin.usuario_id, v.tenant_id, 'suscripciones', p_tipo, v_titulo, v_mensaje,
                                v_url, 'suscripcion', v.id);
    end loop;
    return;
  end if;

  -- Athlete
  case p_tipo
    when 'suscripcion_recibida' then
      v_titulo := 'Recibimos tu solicitud';
      v_mensaje := format('Tu suscripción a %s en %s está en revisión.', v_plan, v.tenant_nombre);
    when 'pago_validado' then
      v_titulo := 'Pago aprobado';
      v_mensaje := format('Tu pago de %s fue aprobado.', v_plan);
    when 'pago_rechazado' then
      v_titulo := 'Pago rechazado';
      v_mensaje := case
        when nullif(btrim(v_pago.motivo_rechazo), '') is null
          then format('Tu pago de %s fue rechazado. Puedes subir un nuevo comprobante.', v_plan)
        else format('Tu pago de %s fue rechazado: %s. Puedes subir un nuevo comprobante.',
                    v_plan, rtrim(btrim(v_pago.motivo_rechazo), '.'))
      end;
    when 'suscripcion_aprobada' then
      v_titulo := 'Suscripción activa';
      v_mensaje := case
        when v.fecha_fin is null then format('Tu suscripción a %s está activa.', v_plan)
        else format('Tu suscripción a %s está activa hasta el %s.', v_plan, to_char(v.fecha_fin, 'DD/MM/YYYY'))
      end;
    when 'suscripcion_rechazada' then
      v_titulo := 'Suscripción rechazada';
      v_mensaje := format('Tu solicitud de %s en %s fue rechazada.', v_plan, v.tenant_nombre);
    when 'suscripcion_asignada' then
      v_titulo := 'Nueva suscripción';
      v_mensaje := format('%s agregó la suscripción %s a tu cuenta.', v.tenant_nombre, v_plan);
    else
      return;
  end case;

  perform _notificar_email(v.tenant_id, 'suscripciones', p_tipo, v.atleta_email, v.atleta_id,
                           'suscripcion', v.id, v_payload);
  perform _notificar_in_app(v.atleta_id, v.tenant_id, 'suscripciones', p_tipo, v_titulo, v_mensaje,
                            '/portal/mis-suscripciones', 'suscripcion', v.id);
end;
$$;

revoke all on function public._encolar_notificacion_suscripcion(uuid, text, uuid) from public, anon, authenticated;

-- ─────────────────────────────────────────────
-- 2. Purchase RPC: subscription + service units + payment (proof path already set) in one transaction.
--    The proof file is uploaded BEFORE this call, to a path built from the client-generated p_pago_id.
-- ─────────────────────────────────────────────

create or replace function public.comprar_suscripcion(
  p_tenant_id        uuid,
  p_plan_id          uuid,
  p_plan_tipo_id     uuid,
  p_metodo_pago_id   uuid,
  p_comentarios      text,
  p_pago_id          uuid,
  p_comprobante_path text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_precio         numeric;
  v_tiene_tipos    boolean;
  v_pago_id        uuid := p_pago_id;
  v_path           text := nullif(btrim(p_comprobante_path), '');
  v_suscripcion_id uuid;
begin
  if v_uid is null then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Same rule the dropped insert policy applied
  if p_tenant_id is null or p_plan_id is null or not can_subscribe_to_plan(p_plan_id, p_tenant_id) then
    raise exception 'PLAN_NO_DISPONIBLE';
  end if;

  select exists (select 1 from plan_tipos pt where pt.plan_id = p_plan_id and pt.activo) into v_tiene_tipos;
  if v_tiene_tipos then
    select pt.precio into v_precio
      from plan_tipos pt
     where pt.id = p_plan_tipo_id and pt.plan_id = p_plan_id and pt.activo;
    if not found then
      raise exception 'SUBTIPO_NO_DISPONIBLE';
    end if;
  elsif p_plan_tipo_id is not null then
    raise exception 'SUBTIPO_NO_DISPONIBLE';
  end if;

  -- Serializes the same athlete + plan, so two simultaneous requests cannot both pass the check
  perform pg_advisory_xact_lock(hashtext(v_uid::text || ':' || p_plan_id::text));
  if exists (
    select 1 from suscripciones s
     where s.atleta_id = v_uid and s.plan_id = p_plan_id and s.estado = 'pendiente') then
    raise exception 'SUSCRIPCION_PENDIENTE_EXISTENTE';
  end if;

  if p_metodo_pago_id is not null and not exists (
    select 1 from tenant_metodos_pago m
     where m.id = p_metodo_pago_id and m.tenant_id = p_tenant_id and m.activo) then
    raise exception 'METODO_PAGO_INVALIDO';
  end if;

  if v_path is not null then
    -- Only the caller's own receipt path for this very payment id, and the file must be there
    if v_pago_id is null
       or v_path !~ ('^orgs/' || p_tenant_id::text || '/users/' || v_uid::text
                     || '/receipts/' || v_pago_id::text || '\.[A-Za-z0-9]{1,5}$')
       or not exists (select 1 from storage.objects o where o.bucket_id = 'org-assets' and o.name = v_path) then
      raise exception 'COMPROBANTE_INVALIDO';
    end if;
  end if;

  if v_pago_id is null then
    v_pago_id := gen_random_uuid();
  elsif exists (select 1 from pagos pg where pg.id = v_pago_id) then
    raise exception 'COMPROBANTE_INVALIDO';
  end if;

  insert into suscripciones (tenant_id, atleta_id, plan_id, plan_tipo_id, comentarios, estado)
  values (p_tenant_id, v_uid, p_plan_id, p_plan_tipo_id, nullif(btrim(p_comentarios), ''), 'pendiente')
  returning id into v_suscripcion_id;

  if p_plan_tipo_id is not null then
    perform populate_suscripcion_servicios(v_suscripcion_id, p_plan_tipo_id);
  end if;

  insert into pagos (id, tenant_id, suscripcion_id, monto, estado, metodo_pago_id, comprobante_path)
  values (v_pago_id, p_tenant_id, v_suscripcion_id, coalesce(v_precio, 0), 'pendiente', p_metodo_pago_id, v_path);

  -- A notification problem must never undo the purchase
  begin
    perform _encolar_notificacion_suscripcion(v_suscripcion_id, 'suscripcion_recibida', v_pago_id);
    perform _encolar_notificacion_suscripcion(v_suscripcion_id, 'suscripcion_nueva_admin', v_pago_id);
  exception when others then
    raise warning 'comprar_suscripcion: notifications failed (%)', sqlstate;
  end;

  return jsonb_build_object('suscripcion_id', v_suscripcion_id, 'pago_id', v_pago_id);
end;
$$;

revoke all on function public.comprar_suscripcion(uuid, uuid, uuid, uuid, text, uuid, text) from public, anon;
grant execute on function public.comprar_suscripcion(uuid, uuid, uuid, uuid, text, uuid, text) to authenticated;

-- The RPC is now the only way an athlete creates a subscription or its payment.
-- Administrator inserts (suscripciones_insert_admin, pagos_insert_admin) and the athlete's
-- proof re-upload (pagos_update_own) are unchanged.
drop policy if exists suscripciones_insert_own on public.suscripciones;
drop policy if exists pagos_insert_own on public.pagos;

-- ─────────────────────────────────────────────
-- 3. Triggers for the writes that stay direct. "By the athlete" = auth.uid() is the subscription's
--    atleta_id; anything else (staff, service role, cron) counts as staff.
--    They never raise: a write cannot fail because of a notification.
-- ─────────────────────────────────────────────

create or replace function public._suscripciones_notificar_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Rows inserted by comprar_suscripcion are the athlete's own and are notified by the RPC
  if auth.uid() is distinct from new.atleta_id then
    perform _encolar_notificacion_suscripcion(new.id, 'suscripcion_asignada');
  end if;
  return null;
exception when others then
  raise warning 'suscripciones_notificar_insert failed (%)', sqlstate;
  return null;
end;
$$;

create or replace function public._suscripciones_notificar_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.estado = 'pendiente' and new.estado = 'activa' then
    perform _encolar_notificacion_suscripcion(new.id, 'suscripcion_aprobada');
  elsif old.estado = 'pendiente' and new.estado = 'cancelada' and auth.uid() is distinct from new.atleta_id then
    perform _encolar_notificacion_suscripcion(new.id, 'suscripcion_rechazada');
  end if;
  return null;
exception when others then
  raise warning 'suscripciones_notificar_estado failed (%)', sqlstate;
  return null;
end;
$$;

create or replace function public._pagos_notificar_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.suscripcion_id is null then
    return null;
  end if;

  if old.estado = 'pendiente' and new.estado = 'validado' then
    perform _encolar_notificacion_suscripcion(new.suscripcion_id, 'pago_validado', new.id);
  elsif old.estado = 'pendiente' and new.estado = 'rechazado' then
    perform _encolar_notificacion_suscripcion(new.suscripcion_id, 'pago_rechazado', new.id);
  end if;

  -- The purchase's own proof is part of the RPC insert, so an athlete update seen here is a later
  -- upload. The path is NOT compared: a re-upload with the same extension overwrites the same path.
  if new.comprobante_path is not null
     and auth.uid() = (select s.atleta_id from suscripciones s where s.id = new.suscripcion_id) then
    perform _encolar_notificacion_suscripcion(new.suscripcion_id, 'pago_comprobante_admin', new.id);
  end if;
  return null;
exception when others then
  raise warning 'pagos_notificar_update failed (%)', sqlstate;
  return null;
end;
$$;

revoke all on function public._suscripciones_notificar_insert() from public, anon, authenticated;
revoke all on function public._suscripciones_notificar_estado() from public, anon, authenticated;
revoke all on function public._pagos_notificar_update() from public, anon, authenticated;

drop trigger if exists suscripciones_notificar_insert on public.suscripciones;
create trigger suscripciones_notificar_insert
  after insert on public.suscripciones
  for each row execute function public._suscripciones_notificar_insert();

drop trigger if exists suscripciones_notificar_estado on public.suscripciones;
create trigger suscripciones_notificar_estado
  after update of estado on public.suscripciones
  for each row when (old.estado is distinct from new.estado)
  execute function public._suscripciones_notificar_estado();

drop trigger if exists pagos_notificar_update on public.pagos;
create trigger pagos_notificar_update
  after update of estado, comprobante_path on public.pagos
  for each row execute function public._pagos_notificar_update();

commit;
