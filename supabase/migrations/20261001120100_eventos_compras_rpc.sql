-- =============================================
-- Migration: Team events phase 4 (US-0121) — purchase RPCs
-- Every function is SECURITY DEFINER (bypasses RLS) and validates everything itself.
-- Errors are raised as '<CODE>' or '<CODE>:<event name>' messages; the client maps them
-- (eventos-compras.service.ts → mapCompraError).
-- Helpers are prefixed with `_` and have no client grants.
-- =============================================

begin;

-- ─────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────

-- Event can be bought by the caller: published, active, confirmed, future or undated, and
-- public or of a tenant the caller is a (non-pending) member of.
create or replace function public._evento_visible_para_compra(p_evento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from eventos e
     where e.id = p_evento_id
       and e.activo
       and not e.borrador
       and e.estado = 'confirmado'
       and (e.fecha_hora is null or e.fecha_hora > now())
       and (
         e.publico
         or (auth.uid() is not null
             and e.tenant_id in (select t.tenant_id from get_member_tenants_for_authenticated_user() t))
       )
  );
$$;

-- Marks pendiente_pago purchases older than 30 min as expirada and voids their tickets.
-- p_evento_ids = null → every event.
create or replace function public._expirar_compras_pendientes(p_evento_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
begin
  select coalesce(array_agg(c.id), '{}')
    into v_ids
    from evento_compras c
   where c.estado = 'pendiente_pago'
     and c.created_at < now() - interval '30 minutes'
     and (
       p_evento_ids is null
       or c.evento_id = any (p_evento_ids)
       or exists (select 1 from evento_tickets t where t.compra_id = c.id and t.evento_id = any (p_evento_ids))
     );

  if cardinality(v_ids) = 0 then
    return 0;
  end if;

  update evento_compras set estado = 'expirada' where id = any (v_ids);
  update evento_tickets set estado = 'anulada' where compra_id = any (v_ids);

  return cardinality(v_ids);
end;
$$;

-- 'EV-' + 8 chars from an unambiguous alphabet, retried on collision.
create or replace function public._generar_codigo_ticket()
returns varchar
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes    bytea;
  v_codigo   text;
  i          integer;
begin
  loop
    v_bytes := extensions.gen_random_bytes(8);
    v_codigo := 'EV-';
    for i in 0..7 loop
      v_codigo := v_codigo || substr(v_alfabeto, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from evento_tickets t where t.codigo = v_codigo);
  end loop;
  return v_codigo;
end;
$$;

-- Outbox row for a purchase transition. Not sent in this phase.
create or replace function public._encolar_notificacion(p_compra_id uuid, p_tipo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into evento_notificaciones (tenant_id, compra_id, tipo, destinatario_email, payload)
  select c.tenant_id, c.id, p_tipo, c.comprador_email,
         jsonb_build_object(
           'evento_id', e.id,
           'evento_nombre', e.nombre,
           'fecha_hora', e.fecha_hora,
           'nombre_tenant', e.nombre_tenant,
           'comprador_nombre', c.comprador_nombre,
           'entrada_nombre', c.entrada_nombre,
           'codigos', coalesce((select jsonb_agg(t.codigo order by t.created_at, t.codigo)
                                  from evento_tickets t where t.compra_id = c.id), '[]'::jsonb),
           'estado', c.estado,
           'total', c.total,
           'motivo_rechazo', c.motivo_rechazo)
    from evento_compras c
    join eventos e on e.id = c.evento_id
   where c.id = p_compra_id;
end;
$$;

-- Percentage of a complete, in-window coupon of the ticket, or null.
create or replace function public._cupon_descuento(p_entrada_id uuid, p_codigo text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select c.descuento
    from evento_entrada_cupones c
   where c.entrada_id = p_entrada_id
     and c.cupon = upper(btrim(coalesce(p_codigo, '')))
     and c.nombre is not null
     and c.descuento is not null
     and (c.valido_desde is null or c.valido_desde <= now())
     and (c.valido_hasta is null or now() <= c.valido_hasta)
   limit 1;
$$;

-- Response shape shared by the purchase RPCs: enough to render the confirmation and the PDF.
create or replace function public._compra_resultado(p_compra_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'compra_id', c.id,
           'tenant_id', c.tenant_id,
           'estado', c.estado,
           'requiere_archivos', (
             c.total > 0
             or exists (
               select 1
                 from evento_formularios ef
                 cross join lateral jsonb_array_elements(ef.campos) as campo(value)
                where ef.evento_id = c.evento_id and ef.vigente
                  and campo.value->>'seccion_tipo' = 'datos' and campo.value->>'campo_tipo' = 'imagen')),
           'tickets', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'id', t.id,
                      'evento_id', t.evento_id,
                      'evento_nombre', e.nombre,
                      'fecha_hora', e.fecha_hora,
                      'lugar', coalesce(e.escenario_id->>'nombre', e.punto_encuentro),
                      'nombre_tenant', e.nombre_tenant,
                      'codigo', t.codigo,
                      'estado', t.estado)
                    order by (t.evento_id <> c.evento_id), e.fecha_hora nulls last, t.codigo)
               from evento_tickets t
               join eventos e on e.id = t.evento_id
              where t.compra_id = c.id), '[]'::jsonb),
           'cancelacion_antelacion_horas', me.cancelacion_antelacion_horas,
           'total', c.total,
           'entrada_nombre', c.entrada_nombre,
           'comprador_nombre', c.comprador_nombre,
           'comprador_email', c.comprador_email,
           'created_at', c.created_at)
    from evento_compras c
    join eventos me on me.id = c.evento_id
   where c.id = p_compra_id;
$$;

-- True when every path is a file of this purchase that exists in storage.
create or replace function public._archivos_compra_validos(p_tenant_id uuid, p_compra_id uuid, p_paths text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(bool_and(
           p.path like 'compras-eventos/' || p_tenant_id::text || '/' || p_compra_id::text || '/%'
           and exists (select 1 from storage.objects o where o.bucket_id = 'org-assets' and o.name = p.path)
         ), true)
    from unnest(p_paths) as p(path);
$$;

revoke all on function public._evento_visible_para_compra(uuid) from public, anon, authenticated;
revoke all on function public._expirar_compras_pendientes(uuid[]) from public, anon, authenticated;
revoke all on function public._generar_codigo_ticket() from public, anon, authenticated;
revoke all on function public._encolar_notificacion(uuid, text) from public, anon, authenticated;
revoke all on function public._cupon_descuento(uuid, text) from public, anon, authenticated;
revoke all on function public._compra_resultado(uuid) from public, anon, authenticated;
revoke all on function public._archivos_compra_validos(uuid, uuid, text[]) from public, anon, authenticated;

-- ─────────────────────────────────────────────
-- validar_cupon_evento
-- ─────────────────────────────────────────────

create or replace function public.validar_cupon_evento(p_evento_id uuid, p_entrada_id uuid, p_codigo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_valor numeric;
  v_pct   numeric;
begin
  if not _evento_visible_para_compra(p_evento_id) then
    return jsonb_build_object('valido', false, 'motivo', 'CUPON_INVALIDO');
  end if;

  select en.valor into v_valor
    from evento_entradas en
   where en.id = p_entrada_id and en.evento_id = p_evento_id and en.nombre is not null;

  if v_valor is null or v_valor <= 0 then
    return jsonb_build_object('valido', false, 'motivo', 'CUPON_INVALIDO');
  end if;

  v_pct := _cupon_descuento(p_entrada_id, p_codigo);
  if v_pct is null then
    return jsonb_build_object('valido', false, 'motivo', 'CUPON_INVALIDO');
  end if;

  return jsonb_build_object(
    'valido', true,
    'descuento_pct', v_pct,
    'total', round(v_valor * (1 - v_pct / 100)),
    'motivo', null);
end;
$$;

-- ─────────────────────────────────────────────
-- iniciar_compra_evento
-- ─────────────────────────────────────────────

create or replace function public.iniciar_compra_evento(
  p_evento_id            uuid,
  p_entrada_id           uuid,
  p_cupon                text,
  p_metodo_pago_id       uuid,
  p_comprador            jsonb,
  p_datos_perfil         jsonb,
  p_formulario_respuesta jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Fixed buyer fields are captured by the checkout itself; never required again as profile fields
  c_perfil_fijos constant text[] := array['nombre', 'apellido', 'fecha_nacimiento'];
  v_uid          uuid := auth.uid();
  v_email        text;
  v_nombre       text;
  v_nacimiento   date;
  v_evento       eventos%rowtype;
  v_entrada      evento_entradas%rowtype;
  v_targets      uuid[];
  v_target       eventos%rowtype;
  v_pct          numeric;
  v_total        numeric;
  v_metodo       jsonb;
  v_form         evento_formularios%rowtype;
  v_campo        jsonb;
  v_valor_campo  text;
  v_perfil_key   text;
  v_respuestas   jsonb := '{}'::jsonb;
  v_datos_perfil jsonb := '{}'::jsonb;
  v_tiene_imagen boolean := false;
  v_vendidos     integer;
  v_compra_id    uuid := gen_random_uuid();
begin
  -- 1. Buyer
  v_nombre := btrim(coalesce(p_comprador->>'nombre', ''));

  if v_uid is not null then
    select lower(btrim(u.email)) into v_email from auth.users u where u.id = v_uid;
  else
    v_email := lower(btrim(coalesce(p_comprador->>'email', '')));
  end if;

  begin
    v_nacimiento := nullif(p_comprador->>'fecha_nacimiento', '')::date;
  exception when others then
    raise exception 'DATOS_INVALIDOS';
  end;

  if length(v_nombre) not between 1 and 150
     or v_email is null or length(v_email) > 254
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or v_nacimiento is null or v_nacimiento <= date '1900-01-01' or v_nacimiento >= current_date then
    raise exception 'DATOS_INVALIDOS';
  end if;

  -- 2. Event and ticket (read; locked below together with the bundle, in id order)
  select * into v_evento from eventos where id = p_evento_id;
  if not found then
    raise exception 'EVENTO_NO_DISPONIBLE';
  end if;

  select * into v_entrada from evento_entradas where id = p_entrada_id and evento_id = p_evento_id;
  if not found or v_entrada.nombre is null or v_entrada.valor is null then
    raise exception 'ENTRADA_INVALIDA';
  end if;

  -- 6 (early). Target events: this one plus the bundle for a Múltiple ticket
  v_targets := array[p_evento_id];
  if v_entrada.tipo_entrada = 'multiple' then
    v_targets := v_targets || coalesce((
      select array_agg(distinct x::uuid)
        from jsonb_array_elements_text(v_entrada.eventos_id_bundle) x
       where x::uuid <> p_evento_id), '{}');
  end if;

  -- Lock every involved event in id order (concurrent purchases serialize; no deadlocks)
  perform 1 from eventos e where e.id = any (v_targets) order by e.id for update;

  if not _evento_visible_para_compra(p_evento_id) then
    raise exception 'EVENTO_NO_DISPONIBLE';
  end if;

  if v_evento.fecha_hora is not null and v_evento.reserva_antelacion_horas is not null
     and now() > v_evento.fecha_hora - make_interval(hours => v_evento.reserva_antelacion_horas) then
    raise exception 'VENTA_CERRADA';
  end if;

  if (v_entrada.valida_desde is not null and now() < v_entrada.valida_desde)
     or (v_entrada.valida_hasta is not null and now() > v_entrada.valida_hasta) then
    raise exception 'VENTA_CERRADA';
  end if;

  for v_target in select * from eventos e where e.id = any (v_targets) and e.id <> p_evento_id loop
    if v_target.tenant_id <> v_evento.tenant_id or not _evento_visible_para_compra(v_target.id) then
      raise exception 'BUNDLE_NO_DISPONIBLE';
    end if;
  end loop;
  if (select count(*) from eventos e where e.id = any (v_targets)) <> cardinality(v_targets) then
    raise exception 'BUNDLE_NO_DISPONIBLE';
  end if;

  -- 3. Coupon
  v_total := v_entrada.valor;
  if length(btrim(coalesce(p_cupon, ''))) > 0 then
    if v_entrada.valor <= 0 then
      raise exception 'CUPON_INVALIDO';
    end if;
    v_pct := _cupon_descuento(p_entrada_id, p_cupon);
    if v_pct is null then
      raise exception 'CUPON_INVALIDO';
    end if;
    v_total := round(v_entrada.valor * (1 - v_pct / 100));
  end if;

  -- 4. Payment method (never cash)
  if v_total > 0 then
    select m.value into v_metodo
      from jsonb_array_elements(v_evento.metodos_pago) as m(value)
     where m.value->>'id' = p_metodo_pago_id::text and coalesce(m.value->>'tipo', '') <> 'efectivo'
     limit 1;
    if v_metodo is null then
      raise exception 'METODO_PAGO_INVALIDO';
    end if;
  end if;

  -- 5. Form: the event's vigente snapshot only (never the templates)
  select * into v_form from evento_formularios where evento_id = p_evento_id and vigente;
  if found then
    for v_campo in
      select c.value from jsonb_array_elements(v_form.campos) as c(value)
       where c.value->>'seccion_tipo' = 'datos' and nullif(c.value->>'campo_nombre', '') is not null
    loop
      if v_campo->>'campo_tipo' = 'imagen' then
        v_tiene_imagen := true;
        continue;  -- checked in finalizar_compra_evento
      end if;
      v_valor_campo := btrim(coalesce(p_formulario_respuesta->>(v_campo->>'campo_nombre'), ''));
      if coalesce((v_campo->>'campo_obligatorio')::boolean, false)
         and (v_valor_campo = '' or (v_campo->>'campo_tipo' = 'checkbox' and v_valor_campo <> 'true')) then
        raise exception 'FORMULARIO_INCOMPLETO';
      end if;
      if v_valor_campo <> '' then
        v_respuestas := v_respuestas || jsonb_build_object(v_campo->>'campo_nombre', v_valor_campo);
      end if;
    end loop;

    for v_perfil_key in select jsonb_array_elements_text(v_form.perfil_campos_requeridos) loop
      continue when v_perfil_key = any (c_perfil_fijos);
      v_valor_campo := btrim(coalesce(p_datos_perfil->>v_perfil_key, ''));
      if v_valor_campo = '' then
        raise exception 'FORMULARIO_INCOMPLETO';
      end if;
      v_datos_perfil := v_datos_perfil || jsonb_build_object(v_perfil_key, v_valor_campo);
    end loop;
  end if;

  -- 7. Lazy expiry of stale holds on the involved events
  perform _expirar_compras_pendientes(v_targets);

  -- 8. Uniqueness and capacity per event
  for v_target in select * from eventos e where e.id = any (v_targets) order by e.id loop
    if exists (
      select 1 from evento_tickets t
       where t.evento_id = v_target.id and t.asistente_email = v_email and t.estado <> 'anulada') then
      raise exception 'ENTRADA_DUPLICADA:%', v_target.nombre;
    end if;
    if v_target.cupo_maximo is not null then
      select count(*) into v_vendidos
        from evento_tickets t
       where t.evento_id = v_target.id and t.estado <> 'anulada';
      if v_vendidos >= v_target.cupo_maximo then
        raise exception 'CUPO_AGOTADO:%', v_target.nombre;
      end if;
    end if;
  end loop;

  -- 9. Purchase, tickets and answers
  insert into evento_compras (
    id, tenant_id, evento_id, entrada_id, comprador_usuario_id,
    comprador_nombre, comprador_email, comprador_fecha_nacimiento,
    entrada_nombre, entrada_tipo, valor_base, cupon_codigo, descuento_pct, total, metodo_pago
  ) values (
    v_compra_id, v_evento.tenant_id, p_evento_id, p_entrada_id, v_uid,
    v_nombre, v_email, v_nacimiento,
    v_entrada.nombre, v_entrada.tipo_entrada, v_entrada.valor,
    case when v_pct is not null then upper(btrim(p_cupon)) end, v_pct, v_total,
    case when v_total > 0 then v_metodo end
  );

  begin
    insert into evento_tickets (compra_id, tenant_id, evento_id, usuario_id, asistente_nombre, asistente_email, codigo)
    select v_compra_id, v_evento.tenant_id, t, v_uid, v_nombre, v_email, _generar_codigo_ticket()
      from unnest(v_targets) t;
  exception when unique_violation then
    raise exception 'ENTRADA_DUPLICADA:%', v_evento.nombre;
  end;

  if v_form.id is not null then
    insert into evento_formulario_respuestas (compra_id, tenant_id, evento_id, evento_formulario_id, datos_perfil, respuestas)
    values (v_compra_id, v_evento.tenant_id, p_evento_id, v_form.id, v_datos_perfil, v_respuestas);
  end if;

  -- 10. Free shortcut: nothing to upload → confirmed in this call
  if v_total = 0 and not v_tiene_imagen then
    update evento_compras set estado = 'confirmada' where id = v_compra_id;
    update evento_tickets set estado = 'activa' where compra_id = v_compra_id;
    perform _encolar_notificacion(v_compra_id, 'compra_confirmada');
  end if;

  return _compra_resultado(v_compra_id);
end;
$$;

-- ─────────────────────────────────────────────
-- finalizar_compra_evento
-- ─────────────────────────────────────────────

create or replace function public.finalizar_compra_evento(
  p_compra_id        uuid,
  p_comprobante_path text,
  p_archivos         jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compra    evento_compras%rowtype;
  v_omitir    boolean;
  v_resp_id   uuid;
  v_campos    jsonb;
  v_archivos  jsonb := '{}'::jsonb;
  v_campo     jsonb;
  v_path      text;
  v_paths     text[] := '{}';
begin
  select * into v_compra from evento_compras where id = p_compra_id for update;
  if not found or v_compra.estado <> 'pendiente_pago' or v_compra.created_at <= now() - interval '30 minutes' then
    raise exception 'COMPRA_EXPIRADA';
  end if;

  if v_compra.comprador_usuario_id is not null and v_compra.comprador_usuario_id is distinct from auth.uid() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Form images: only keys of imagen fields of the snapshot this purchase answered
  select r.id, ef.campos into v_resp_id, v_campos
    from evento_formulario_respuestas r
    join evento_formularios ef on ef.id = r.evento_formulario_id
   where r.compra_id = p_compra_id;

  if v_resp_id is not null then
    for v_campo in
      select c.value from jsonb_array_elements(v_campos) as c(value)
       where c.value->>'seccion_tipo' = 'datos' and c.value->>'campo_tipo' = 'imagen'
         and nullif(c.value->>'campo_nombre', '') is not null
    loop
      v_path := nullif(btrim(coalesce(p_archivos->>(v_campo->>'campo_nombre'), '')), '');
      if v_path is null then
        if coalesce((v_campo->>'campo_obligatorio')::boolean, false) then
          raise exception 'FORMULARIO_INCOMPLETO';
        end if;
        continue;
      end if;
      v_archivos := v_archivos || jsonb_build_object(v_campo->>'campo_nombre', v_path);
      v_paths := v_paths || v_path;
    end loop;
  end if;

  if v_compra.total > 0 and nullif(btrim(coalesce(p_comprobante_path, '')), '') is null then
    raise exception 'COMPROBANTE_REQUERIDO';
  end if;
  if v_compra.total > 0 then
    v_paths := v_paths || btrim(p_comprobante_path);
  end if;

  if not _archivos_compra_validos(v_compra.tenant_id, v_compra.id, v_paths) then
    raise exception 'ARCHIVO_INVALIDO';
  end if;

  if v_resp_id is not null then
    update evento_formulario_respuestas set archivos = v_archivos where id = v_resp_id;
  end if;

  select e.omitir_confirmacion_compra into v_omitir from eventos e where e.id = v_compra.evento_id;

  if v_compra.total = 0 or v_omitir then
    update evento_compras
       set estado = 'confirmada',
           comprobante_path = case when v_compra.total > 0 then btrim(p_comprobante_path) end
     where id = p_compra_id;
    update evento_tickets set estado = 'activa' where compra_id = p_compra_id;
    perform _encolar_notificacion(p_compra_id, 'compra_confirmada');
  else
    update evento_compras
       set estado = 'en_validacion', comprobante_path = btrim(p_comprobante_path)
     where id = p_compra_id;
    perform _encolar_notificacion(p_compra_id, 'compra_recibida');
  end if;

  return _compra_resultado(p_compra_id);
end;
$$;

-- ─────────────────────────────────────────────
-- reenviar_comprobante_compra_evento
-- ─────────────────────────────────────────────

create or replace function public.reenviar_comprobante_compra_evento(p_compra_id uuid, p_comprobante_path text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compra   evento_compras%rowtype;
  v_eventos  uuid[];
  v_target   eventos%rowtype;
  v_vendidos integer;
  v_omitir   boolean;
begin
  select * into v_compra from evento_compras where id = p_compra_id for update;
  if not found or v_compra.comprador_usuario_id is distinct from auth.uid() or auth.uid() is null then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_compra.estado <> 'rechazada' then
    raise exception 'ESTADO_INVALIDO';
  end if;

  if nullif(btrim(coalesce(p_comprobante_path, '')), '') is null then
    raise exception 'COMPROBANTE_REQUERIDO';
  end if;
  if not _archivos_compra_validos(v_compra.tenant_id, v_compra.id, array[btrim(p_comprobante_path)]) then
    raise exception 'ARCHIVO_INVALIDO';
  end if;

  select array_agg(t.evento_id order by t.evento_id) into v_eventos
    from evento_tickets t where t.compra_id = p_compra_id;

  perform 1 from eventos e where e.id = any (v_eventos) order by e.id for update;
  perform _expirar_compras_pendientes(v_eventos);

  for v_target in select * from eventos e where e.id = any (v_eventos) order by e.id loop
    if not _evento_visible_para_compra(v_target.id) then
      raise exception 'EVENTO_NO_DISPONIBLE';
    end if;
    if exists (
      select 1 from evento_tickets t
       where t.evento_id = v_target.id and t.asistente_email = v_compra.comprador_email
         and t.estado <> 'anulada' and t.compra_id <> p_compra_id) then
      raise exception 'ENTRADA_DUPLICADA:%', v_target.nombre;
    end if;
    if v_target.cupo_maximo is not null then
      select count(*) into v_vendidos
        from evento_tickets t
       where t.evento_id = v_target.id and t.estado <> 'anulada' and t.compra_id <> p_compra_id;
      if v_vendidos >= v_target.cupo_maximo then
        raise exception 'CUPO_AGOTADO:%', v_target.nombre;
      end if;
    end if;
  end loop;

  select e.omitir_confirmacion_compra into v_omitir from eventos e where e.id = v_compra.evento_id;

  update evento_compras
     set estado = case when v_omitir then 'confirmada' else 'en_validacion' end,
         comprobante_path = btrim(p_comprobante_path),
         motivo_rechazo = null
   where id = p_compra_id;

  begin
    update evento_tickets
       set estado = case when v_omitir then 'activa' else 'pendiente' end
     where compra_id = p_compra_id;
  exception when unique_violation then
    raise exception 'ENTRADA_DUPLICADA:%', (select e.nombre from eventos e where e.id = v_compra.evento_id);
  end;

  perform _encolar_notificacion(p_compra_id, case when v_omitir then 'compra_confirmada' else 'compra_recibida' end);

  return _compra_resultado(p_compra_id);
end;
$$;

-- ─────────────────────────────────────────────
-- cancelar_compra_evento
-- ─────────────────────────────────────────────

create or replace function public.cancelar_compra_evento(p_compra_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compra evento_compras%rowtype;
  v_evento eventos%rowtype;
begin
  select * into v_compra from evento_compras where id = p_compra_id for update;
  if not found or v_compra.comprador_usuario_id is distinct from auth.uid() or auth.uid() is null then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_compra.estado not in ('en_validacion', 'confirmada') then
    raise exception 'ESTADO_INVALIDO';
  end if;

  -- A Múltiple purchase is cancelled as a whole with the MAIN event's policy.
  -- Null policy → no cancellation and no refund.
  select * into v_evento from eventos where id = v_compra.evento_id;
  if v_evento.cancelacion_antelacion_horas is null
     or (v_evento.fecha_hora is not null
         and now() > v_evento.fecha_hora - make_interval(hours => v_evento.cancelacion_antelacion_horas)) then
    raise exception 'CANCELACION_NO_PERMITIDA';
  end if;

  update evento_compras set estado = 'cancelada', cancelado_at = now() where id = p_compra_id;
  update evento_tickets set estado = 'anulada' where compra_id = p_compra_id;
  perform _encolar_notificacion(p_compra_id, 'compra_cancelada');

  return _compra_resultado(p_compra_id);
end;
$$;

-- ─────────────────────────────────────────────
-- validar_compra_evento (staff)
-- ─────────────────────────────────────────────

create or replace function public.validar_compra_evento(p_compra_id uuid, p_aprobar boolean, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compra evento_compras%rowtype;
  v_motivo text := btrim(coalesce(p_motivo, ''));
begin
  select * into v_compra from evento_compras where id = p_compra_id for update;
  if not found
     or v_compra.tenant_id not in (select t.tenant_id from get_trainer_or_admin_tenants_for_authenticated_user() t) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_compra.estado <> 'en_validacion' then
    raise exception 'ESTADO_INVALIDO';
  end if;

  if coalesce(p_aprobar, false) then
    update evento_compras
       set estado = 'confirmada', validado_por = auth.uid(), validado_at = now()
     where id = p_compra_id;
    update evento_tickets set estado = 'activa' where compra_id = p_compra_id;
    perform _encolar_notificacion(p_compra_id, 'compra_confirmada');
  else
    if length(v_motivo) not between 1 and 500 then
      raise exception 'MOTIVO_REQUERIDO';
    end if;
    update evento_compras
       set estado = 'rechazada', motivo_rechazo = v_motivo, validado_por = auth.uid(), validado_at = now()
     where id = p_compra_id;
    update evento_tickets set estado = 'anulada' where compra_id = p_compra_id;
    perform _encolar_notificacion(p_compra_id, 'compra_rechazada');
  end if;

  return _compra_resultado(p_compra_id);
end;
$$;

-- ─────────────────────────────────────────────
-- vincular_compras_invitado
-- ─────────────────────────────────────────────

-- Links guest purchases made with the caller's VERIFIED email. Idempotent.
create or replace function public.vincular_compras_invitado()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_ids   uuid[];
begin
  if v_uid is null then
    return 0;
  end if;

  select lower(btrim(u.email)) into v_email
    from auth.users u
   where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null then
    return 0;
  end if;

  with linked as (
    update evento_compras c
       set comprador_usuario_id = v_uid
     where c.comprador_usuario_id is null and c.comprador_email = v_email
    returning c.id
  )
  select coalesce(array_agg(id), '{}') into v_ids from linked;

  if cardinality(v_ids) > 0 then
    update evento_tickets set usuario_id = v_uid where compra_id = any (v_ids) and usuario_id is null;
  end if;

  return cardinality(v_ids);
end;
$$;

-- ─────────────────────────────────────────────
-- expirar_compras_evento_pendientes (cron)
-- ─────────────────────────────────────────────

create or replace function public.expirar_compras_evento_pendientes()
returns integer
language sql
security definer
set search_path = public
as $$
  select _expirar_compras_pendientes(null);
$$;

-- ─────────────────────────────────────────────
-- Grants
-- ─────────────────────────────────────────────

revoke all on function public.validar_cupon_evento(uuid, uuid, text) from public;
revoke all on function public.iniciar_compra_evento(uuid, uuid, text, uuid, jsonb, jsonb, jsonb) from public;
revoke all on function public.finalizar_compra_evento(uuid, text, jsonb) from public;
revoke all on function public.reenviar_comprobante_compra_evento(uuid, text) from public, anon;
revoke all on function public.cancelar_compra_evento(uuid) from public, anon;
revoke all on function public.validar_compra_evento(uuid, boolean, text) from public, anon;
revoke all on function public.vincular_compras_invitado() from public, anon;
revoke all on function public.expirar_compras_evento_pendientes() from public, anon, authenticated;

grant execute on function public.validar_cupon_evento(uuid, uuid, text) to anon, authenticated;
grant execute on function public.iniciar_compra_evento(uuid, uuid, text, uuid, jsonb, jsonb, jsonb) to anon, authenticated;
grant execute on function public.finalizar_compra_evento(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.reenviar_comprobante_compra_evento(uuid, text) to authenticated;
grant execute on function public.cancelar_compra_evento(uuid) to authenticated;
grant execute on function public.validar_compra_evento(uuid, boolean, text) to authenticated;
grant execute on function public.vincular_compras_invitado() to authenticated;

commit;
