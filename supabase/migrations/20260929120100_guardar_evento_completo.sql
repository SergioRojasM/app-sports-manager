-- =============================================
-- Migration: guardar_evento_completo RPC (US-0119)
-- Atomic save of an event + its tickets + coupons, in draft or final mode.
-- SECURITY INVOKER: every statement runs under the caller's RLS; this function
-- only adds atomicity and cross-row validation, never privilege.
--
-- p_evento   : event columns (snake_case keys, see eventos table)
-- p_entradas : [{ client_key, id?, tipo_entrada, nombre, eventos_id_bundle, valida_desde,
--                 valida_hasta, valor, orden,
--                 cupones: [{ client_key, id?, nombre, cupon, descuento, valido_desde, valido_hasta }] }]
-- returns    : { evento_id, borrador, entradas: [{ client_key, id, cupones: [{ client_key, id }] }] }
-- =============================================

begin;

create or replace function public.guardar_evento_completo(
  p_tenant_id  uuid,
  p_evento_id  uuid,
  p_es_nuevo   boolean,
  p_borrador   boolean,
  p_evento     jsonb,
  p_entradas   jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_entradas        jsonb := coalesce(p_entradas, '[]'::jsonb);
  v_entrada         jsonb;
  v_cupon           jsonb;
  v_bundle_id       text;
  v_entrada_id      uuid;
  v_cupon_id        uuid;
  v_formulario_id   uuid := nullif(p_evento->>'formulario_id', '')::uuid;
  v_formulario_ok   boolean;
  v_stored_borrador boolean;
  v_keep_entradas   uuid[] := '{}';
  v_keep_cupones    uuid[];
  v_result_entradas jsonb := '[]'::jsonb;
  v_result_cupones  jsonb;
  v_any_paid        boolean := false;
begin
  -- 1. Role / tenant
  if p_tenant_id is null
     or p_tenant_id not in (select t.tenant_id from get_trainer_or_admin_tenants_for_authenticated_user() t) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if jsonb_typeof(v_entradas) <> 'array' then
    raise exception 'ENTRADAS_INVALIDAS' using errcode = '23514';
  end if;

  -- 2. Always-on checks (draft and final)
  if length(btrim(coalesce(p_evento->>'nombre', ''))) = 0 then
    raise exception 'NOMBRE_REQUERIDO' using errcode = '23514';
  end if;

  if v_formulario_id is not null then
    select f.activo into v_formulario_ok
      from formularios_plantillas f
     where f.id = v_formulario_id and f.tenant_id = p_tenant_id;
    if not found then
      raise exception 'FORMULARIO_INVALIDO' using errcode = '23503';
    end if;
  end if;

  if jsonb_typeof(coalesce(p_evento->'entrenador_id', '[]'::jsonb)) <> 'array'
     or exists (
       select 1 from jsonb_array_elements(coalesce(p_evento->'entrenador_id', '[]'::jsonb)) x
        where jsonb_typeof(x) <> 'object' or not (x ? 'id') or not (x ? 'nombre')) then
    raise exception 'ENTRENADORES_INVALIDOS' using errcode = '23514';
  end if;

  if jsonb_typeof(coalesce(p_evento->'metodos_pago', '[]'::jsonb)) <> 'array'
     or exists (
       select 1 from jsonb_array_elements(coalesce(p_evento->'metodos_pago', '[]'::jsonb)) x
        where jsonb_typeof(x) <> 'object' or not (x ? 'id') or not (x ? 'nombre')) then
    raise exception 'METODOS_PAGO_INVALIDOS' using errcode = '23514';
  end if;

  for v_entrada in select value from jsonb_array_elements(v_entradas) loop
    if jsonb_typeof(coalesce(v_entrada->'eventos_id_bundle', '[]'::jsonb)) <> 'array' then
      raise exception 'BUNDLE_INVALIDO' using errcode = '23503';
    end if;
    for v_bundle_id in select value from jsonb_array_elements_text(coalesce(v_entrada->'eventos_id_bundle', '[]'::jsonb)) loop
      if v_bundle_id = p_evento_id::text
         or not exists (
           select 1 from eventos e where e.id::text = v_bundle_id and e.tenant_id = p_tenant_id) then
        raise exception 'BUNDLE_INVALIDO' using errcode = '23503';
      end if;
    end loop;
    if nullif(v_entrada->>'valor', '')::numeric > 0 then
      v_any_paid := true;
    end if;
  end loop;

  -- 3. Completeness checks (final save only)
  if not p_borrador then
    if length(btrim(coalesce(p_evento->>'disciplina_id', ''))) = 0 then
      raise exception 'DISCIPLINA_REQUERIDA' using errcode = '23514';
    end if;

    if jsonb_array_length(v_entradas) = 0 then
      raise exception 'ENTRADAS_REQUERIDAS' using errcode = '23514';
    end if;

    for v_entrada in select value from jsonb_array_elements(v_entradas) loop
      if length(btrim(coalesce(v_entrada->>'nombre', ''))) = 0 or nullif(v_entrada->>'valor', '') is null then
        raise exception 'ENTRADA_INCOMPLETA' using errcode = '23514';
      end if;
      if v_entrada->>'tipo_entrada' = 'multiple'
         and jsonb_array_length(coalesce(v_entrada->'eventos_id_bundle', '[]'::jsonb)) = 0 then
        raise exception 'BUNDLE_REQUERIDO' using errcode = '23514';
      end if;
      for v_cupon in select value from jsonb_array_elements(coalesce(v_entrada->'cupones', '[]'::jsonb)) loop
        if length(btrim(coalesce(v_cupon->>'nombre', ''))) = 0
           or length(btrim(coalesce(v_cupon->>'cupon', ''))) = 0
           or nullif(v_cupon->>'descuento', '') is null then
          raise exception 'CUPON_INCOMPLETO' using errcode = '23514';
        end if;
        if (v_entrada->>'valor')::numeric = 0 then
          raise exception 'CUPON_EN_ENTRADA_GRATIS' using errcode = '23514';
        end if;
      end loop;
    end loop;

    if v_any_paid and jsonb_array_length(coalesce(p_evento->'metodos_pago', '[]'::jsonb)) = 0 then
      raise exception 'METODO_PAGO_REQUERIDO' using errcode = '23514';
    end if;

    if v_formulario_id is not null and not v_formulario_ok then
      raise exception 'FORMULARIO_INACTIVO' using errcode = '23514';
    end if;
  end if;

  -- 4. Write the event
  if p_es_nuevo then
    insert into eventos (
      id, tenant_id, creado_por, estado, borrador,
      nombre, descripcion, disciplina_id, escenario_id, entrenador_id,
      fecha_hora, duracion_minutos, cupo_maximo, punto_encuentro,
      reserva_antelacion_horas, cancelacion_antelacion_horas,
      banner_url, activo, publico, omitir_confirmacion_compra,
      cronograma, incluye, descripcion_larga, pagina_evento_url,
      formulario_id, metodos_pago
    ) values (
      p_evento_id, p_tenant_id, auth.uid(), 'confirmado', p_borrador,
      btrim(p_evento->>'nombre'),
      nullif(btrim(p_evento->>'descripcion'), ''),
      nullif(btrim(p_evento->>'disciplina_id'), ''),
      case when jsonb_typeof(p_evento->'escenario_id') = 'object' then p_evento->'escenario_id' end,
      coalesce(p_evento->'entrenador_id', '[]'::jsonb),
      nullif(p_evento->>'fecha_hora', '')::timestamptz,
      nullif(p_evento->>'duracion_minutos', '')::integer,
      nullif(p_evento->>'cupo_maximo', '')::integer,
      nullif(btrim(p_evento->>'punto_encuentro'), ''),
      nullif(p_evento->>'reserva_antelacion_horas', '')::integer,
      nullif(p_evento->>'cancelacion_antelacion_horas', '')::integer,
      nullif(btrim(p_evento->>'banner_url'), ''),
      coalesce((p_evento->>'activo')::boolean, true),
      coalesce((p_evento->>'publico')::boolean, true),
      coalesce((p_evento->>'omitir_confirmacion_compra')::boolean, false),
      coalesce(p_evento->'cronograma', '[]'::jsonb),
      coalesce(p_evento->'incluye', '[]'::jsonb),
      nullif(btrim(p_evento->>'descripcion_larga'), ''),
      nullif(btrim(p_evento->>'pagina_evento_url'), ''),
      v_formulario_id,
      coalesce(p_evento->'metodos_pago', '[]'::jsonb)
    );
  else
    select e.borrador into v_stored_borrador
      from eventos e
     where e.id = p_evento_id and e.tenant_id = p_tenant_id
       for update;
    if not found then
      raise exception 'NOT_FOUND' using errcode = 'P0002';
    end if;
    if p_borrador and not v_stored_borrador then
      raise exception 'NO_REVERTIR_A_BORRADOR' using errcode = '23514';
    end if;

    update eventos set
      borrador = p_borrador,
      nombre = btrim(p_evento->>'nombre'),
      descripcion = nullif(btrim(p_evento->>'descripcion'), ''),
      disciplina_id = nullif(btrim(p_evento->>'disciplina_id'), ''),
      escenario_id = case when jsonb_typeof(p_evento->'escenario_id') = 'object' then p_evento->'escenario_id' end,
      entrenador_id = coalesce(p_evento->'entrenador_id', '[]'::jsonb),
      fecha_hora = nullif(p_evento->>'fecha_hora', '')::timestamptz,
      duracion_minutos = nullif(p_evento->>'duracion_minutos', '')::integer,
      cupo_maximo = nullif(p_evento->>'cupo_maximo', '')::integer,
      punto_encuentro = nullif(btrim(p_evento->>'punto_encuentro'), ''),
      reserva_antelacion_horas = nullif(p_evento->>'reserva_antelacion_horas', '')::integer,
      cancelacion_antelacion_horas = nullif(p_evento->>'cancelacion_antelacion_horas', '')::integer,
      banner_url = nullif(btrim(p_evento->>'banner_url'), ''),
      activo = coalesce((p_evento->>'activo')::boolean, true),
      publico = coalesce((p_evento->>'publico')::boolean, true),
      omitir_confirmacion_compra = coalesce((p_evento->>'omitir_confirmacion_compra')::boolean, false),
      cronograma = coalesce(p_evento->'cronograma', '[]'::jsonb),
      incluye = coalesce(p_evento->'incluye', '[]'::jsonb),
      descripcion_larga = nullif(btrim(p_evento->>'descripcion_larga'), ''),
      pagina_evento_url = nullif(btrim(p_evento->>'pagina_evento_url'), ''),
      formulario_id = v_formulario_id,
      metodos_pago = coalesce(p_evento->'metodos_pago', '[]'::jsonb)
    where id = p_evento_id and tenant_id = p_tenant_id;
  end if;

  -- 5. Tickets: reject ids owned by another event, delete missing, upsert present
  for v_entrada in select value from jsonb_array_elements(v_entradas) loop
    v_entrada_id := nullif(v_entrada->>'id', '')::uuid;
    if v_entrada_id is not null then
      if exists (select 1 from evento_entradas en where en.id = v_entrada_id and en.evento_id <> p_evento_id) then
        raise exception 'ENTRADA_INVALIDA' using errcode = '42501';
      end if;
      v_keep_entradas := v_keep_entradas || v_entrada_id;
    end if;
  end loop;

  delete from evento_entradas en
   where en.evento_id = p_evento_id
     and not (en.id = any (v_keep_entradas));

  for v_entrada in select value from jsonb_array_elements(v_entradas) loop
    v_entrada_id := coalesce(nullif(v_entrada->>'id', '')::uuid, gen_random_uuid());

    insert into evento_entradas (
      id, evento_id, tenant_id, tipo_entrada, nombre, eventos_id_bundle,
      valida_desde, valida_hasta, valor, orden
    ) values (
      v_entrada_id, p_evento_id, p_tenant_id,
      coalesce(nullif(v_entrada->>'tipo_entrada', ''), 'sencilla'),
      nullif(btrim(v_entrada->>'nombre'), ''),
      case when v_entrada->>'tipo_entrada' = 'multiple'
           then coalesce(v_entrada->'eventos_id_bundle', '[]'::jsonb)
           else '[]'::jsonb end,
      nullif(v_entrada->>'valida_desde', '')::timestamptz,
      nullif(v_entrada->>'valida_hasta', '')::timestamptz,
      nullif(v_entrada->>'valor', '')::numeric,
      coalesce(nullif(v_entrada->>'orden', '')::integer, 0)
    )
    on conflict (id) do update set
      tipo_entrada = excluded.tipo_entrada,
      nombre = excluded.nombre,
      eventos_id_bundle = excluded.eventos_id_bundle,
      valida_desde = excluded.valida_desde,
      valida_hasta = excluded.valida_hasta,
      valor = excluded.valor,
      orden = excluded.orden;

    -- 6. Coupons of this ticket
    v_keep_cupones := '{}';
    for v_cupon in select value from jsonb_array_elements(coalesce(v_entrada->'cupones', '[]'::jsonb)) loop
      v_cupon_id := nullif(v_cupon->>'id', '')::uuid;
      if v_cupon_id is not null then
        if exists (select 1 from evento_entrada_cupones c where c.id = v_cupon_id and c.entrada_id <> v_entrada_id) then
          raise exception 'ENTRADA_INVALIDA' using errcode = '42501';
        end if;
        v_keep_cupones := v_keep_cupones || v_cupon_id;
      end if;
    end loop;

    delete from evento_entrada_cupones c
     where c.entrada_id = v_entrada_id
       and not (c.id = any (v_keep_cupones));

    v_result_cupones := '[]'::jsonb;
    for v_cupon in select value from jsonb_array_elements(coalesce(v_entrada->'cupones', '[]'::jsonb)) loop
      v_cupon_id := coalesce(nullif(v_cupon->>'id', '')::uuid, gen_random_uuid());

      insert into evento_entrada_cupones (
        id, entrada_id, evento_id, tenant_id, nombre, cupon, descuento, valido_desde, valido_hasta
      ) values (
        v_cupon_id, v_entrada_id, p_evento_id, p_tenant_id,
        nullif(btrim(v_cupon->>'nombre'), ''),
        nullif(upper(btrim(v_cupon->>'cupon')), ''),
        nullif(v_cupon->>'descuento', '')::numeric,
        nullif(v_cupon->>'valido_desde', '')::timestamptz,
        nullif(v_cupon->>'valido_hasta', '')::timestamptz
      )
      on conflict (id) do update set
        nombre = excluded.nombre,
        cupon = excluded.cupon,
        descuento = excluded.descuento,
        valido_desde = excluded.valido_desde,
        valido_hasta = excluded.valido_hasta;

      v_result_cupones := v_result_cupones
        || jsonb_build_object('client_key', v_cupon->>'client_key', 'id', v_cupon_id);
    end loop;

    v_result_entradas := v_result_entradas
      || jsonb_build_object('client_key', v_entrada->>'client_key', 'id', v_entrada_id, 'cupones', v_result_cupones);
  end loop;

  -- 7. Derived price summary (complete tickets only)
  update eventos e set precio = coalesce((
    select jsonb_agg(
             jsonb_build_object('nombre', en.nombre, 'precio', en.valor, 'descripcion', null)
             order by en.orden, en.created_at)
      from evento_entradas en
     where en.evento_id = p_evento_id
       and en.nombre is not null
       and en.valor is not null
  ), '[]'::jsonb)
  where e.id = p_evento_id;

  return jsonb_build_object(
    'evento_id', p_evento_id,
    'borrador', p_borrador,
    'entradas', v_result_entradas
  );
end;
$$;

comment on function public.guardar_evento_completo(uuid, uuid, boolean, boolean, jsonb, jsonb) is
  'Atomic save of an event with its tickets and coupons (US-0119). Draft mode validates name + format only; final mode enforces completeness.';

revoke all on function public.guardar_evento_completo(uuid, uuid, boolean, boolean, jsonb, jsonb) from public, anon;
grant execute on function public.guardar_evento_completo(uuid, uuid, boolean, boolean, jsonb, jsonb) to authenticated;

commit;
