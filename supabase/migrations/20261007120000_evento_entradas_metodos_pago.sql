-- =============================================
-- Migration: evento_entradas.metodos_pago (US-0130)
-- Payment methods valid for ONE ticket, in the same snapshot format as eventos.metodos_pago.
-- Snapshots may now be created only for the event (origen = 'evento'): they are never rows of
-- tenant_metodos_pago.
--   guardar_evento_completo  validates and stores each ticket's metodos_pago; on final save every
--                            paid ticket needs a method (event-level or its own). Same body as
--                            20261002120000 otherwise.
--   iniciar_compra_evento    accepts a method of the event or of the purchased ticket. Same body as
--                            20261001120100 otherwise.
-- =============================================

begin;

alter table public.evento_entradas
  add column if not exists metodos_pago jsonb not null default '[]'::jsonb;

alter table public.evento_entradas
  add constraint evento_entradas_metodos_pago_array_ck
    check (jsonb_typeof(metodos_pago) = 'array');

comment on column public.evento_entradas.metodos_pago is
  'Payment method snapshots valid only for this ticket (US-0130). Same format as eventos.metodos_pago.';
comment on column public.eventos.metodos_pago is
  'Payment method snapshots valid for all tickets of the event: copied from tenant_metodos_pago or created only for the event (US-0119, US-0130).';

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
  v_nombre_tenant   varchar(150);
  v_snapshot        jsonb;
  v_snapshot_hash   text;
begin
  -- 1. Role / tenant
  if p_tenant_id is null
     or p_tenant_id not in (select t.tenant_id from get_trainer_or_admin_tenants_for_authenticated_user() t) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- 1b. Tenant name snapshot, taken on create only (US-0120); never read from p_evento
  if p_es_nuevo then
    select coalesce(nullif(btrim(t.nombre), ''), 'Organización')
      into v_nombre_tenant
      from tenants t
     where t.id = p_tenant_id;
    if not found then
      raise exception 'TENANT_INVALIDO' using errcode = '23503';
    end if;
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
    -- Ticket-specific payment methods: same snapshot format as the event's (US-0130)
    if jsonb_typeof(coalesce(v_entrada->'metodos_pago', '[]'::jsonb)) <> 'array'
       or exists (
         select 1 from jsonb_array_elements(coalesce(v_entrada->'metodos_pago', '[]'::jsonb)) x
          where jsonb_typeof(x) <> 'object' or not (x ? 'id') or not (x ? 'nombre')) then
      raise exception 'METODOS_PAGO_INVALIDOS' using errcode = '23514';
    end if;
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

    -- Every paid ticket needs a method: one for all tickets or one of its own (US-0130)
    if v_any_paid and jsonb_array_length(coalesce(p_evento->'metodos_pago', '[]'::jsonb)) = 0 then
      for v_entrada in select value from jsonb_array_elements(v_entradas) loop
        if (v_entrada->>'valor')::numeric > 0
           and jsonb_array_length(coalesce(v_entrada->'metodos_pago', '[]'::jsonb)) = 0 then
          raise exception 'METODO_PAGO_REQUERIDO' using errcode = '23514';
        end if;
      end loop;
    end if;

    if v_formulario_id is not null and not v_formulario_ok then
      raise exception 'FORMULARIO_INACTIVO' using errcode = '23514';
    end if;

    -- A Múltiple ticket only asks for THIS event's form (the purchase stores one set of answers),
    -- so a bundled event may have no form or the same one, never a different one.
    for v_entrada in select value from jsonb_array_elements(v_entradas) loop
      continue when v_entrada->>'tipo_entrada' is distinct from 'multiple';
      for v_bundle_id in select value from jsonb_array_elements_text(coalesce(v_entrada->'eventos_id_bundle', '[]'::jsonb)) loop
        if exists (
          select 1 from eventos e
           where e.id::text = v_bundle_id
             and e.formulario_id is not null
             and e.formulario_id is distinct from v_formulario_id) then
          raise exception 'BUNDLE_FORMULARIO_DISTINTO' using errcode = '23514';
        end if;
      end loop;
    end loop;

    -- Same rule seen from the other side: this event is bundled by another published event's ticket
    if v_formulario_id is not null and exists (
      select 1
        from evento_entradas en
        join eventos principal on principal.id = en.evento_id
       where en.evento_id <> p_evento_id
         and en.tipo_entrada = 'multiple'
         and en.eventos_id_bundle ? p_evento_id::text
         and not principal.borrador
         and principal.formulario_id is distinct from v_formulario_id) then
      raise exception 'FORMULARIO_EN_PAQUETE_DISTINTO' using errcode = '23514';
    end if;
  end if;

  -- 4. Write the event
  if p_es_nuevo then
    insert into eventos (
      id, tenant_id, nombre_tenant, creado_por, estado, borrador,
      nombre, descripcion, disciplina_id, escenario_id, entrenador_id,
      fecha_hora, duracion_minutos, cupo_maximo, punto_encuentro,
      reserva_antelacion_horas, cancelacion_antelacion_horas,
      banner_url, activo, publico, omitir_confirmacion_compra,
      cronograma, incluye, descripcion_larga, pagina_evento_url,
      formulario_id, metodos_pago
    ) values (
      p_evento_id, p_tenant_id, v_nombre_tenant, auth.uid(), 'confirmado', p_borrador,
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
      valida_desde, valida_hasta, valor, orden, metodos_pago
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
      coalesce(nullif(v_entrada->>'orden', '')::integer, 0),
      coalesce(v_entrada->'metodos_pago', '[]'::jsonb)
    )
    on conflict (id) do update set
      tipo_entrada = excluded.tipo_entrada,
      nombre = excluded.nombre,
      eventos_id_bundle = excluded.eventos_id_bundle,
      valida_desde = excluded.valida_desde,
      valida_hasta = excluded.valida_hasta,
      valor = excluded.valor,
      orden = excluded.orden,
      metodos_pago = excluded.metodos_pago;

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

  -- 6b. Form snapshot (US-0121): the event owns a versioned JSON copy of its form, so the
  --     purchase flow never reads the (mutable, authenticated-only) templates. A version is
  --     never edited in place: when the content changes the current one is retired and a new
  --     one inserted, so answers keep the exact form they answered.
  if v_formulario_id is null then
    update evento_formularios set vigente = false
     where evento_id = p_evento_id and vigente;
  else
    select jsonb_build_object(
             'nombre', f.nombre,
             'perfil_campos_requeridos', to_jsonb(coalesce(f.perfil_campos_requeridos, '{}'::text[])),
             'campos', coalesce((
               select jsonb_agg(to_jsonb(s) - 'created_at' - 'updated_at' order by s.orden, s.created_at)
                 from formulario_plantilla_esquema s
                where s.formulario_plantilla_id = f.id and s.activo
             ), '[]'::jsonb))
      into v_snapshot
      from formularios_plantillas f
     where f.id = v_formulario_id;

    v_snapshot_hash := md5(v_formulario_id::text || v_snapshot::text);

    if not exists (
      select 1 from evento_formularios ef
       where ef.evento_id = p_evento_id and ef.vigente and ef.contenido_hash = v_snapshot_hash
    ) then
      update evento_formularios set vigente = false
       where evento_id = p_evento_id and vigente;

      insert into evento_formularios (
        tenant_id, evento_id, formulario_plantilla_id, nombre,
        perfil_campos_requeridos, campos, contenido_hash, vigente
      ) values (
        p_tenant_id, p_evento_id, v_formulario_id, v_snapshot->>'nombre',
        v_snapshot->'perfil_campos_requeridos', v_snapshot->'campos', v_snapshot_hash, true
      );
    end if;
  end if;

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
  'Atomic save of an event with its tickets and coupons (US-0119). Draft mode validates name + format only; final mode enforces completeness. Sets nombre_tenant on create (US-0120). Syncs the versioned form snapshot in evento_formularios and rejects Múltiple bundles whose events ask for a different form (US-0121). Stores ticket-specific payment methods and requires a method per paid ticket (US-0130).';

revoke all on function public.guardar_evento_completo(uuid, uuid, boolean, boolean, jsonb, jsonb) from public, anon;
grant execute on function public.guardar_evento_completo(uuid, uuid, boolean, boolean, jsonb, jsonb) to authenticated;


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

  -- 4. Payment method (never cash): one for all tickets, or one of the purchased ticket (US-0130)
  if v_total > 0 then
    select m.value into v_metodo
      from jsonb_array_elements(v_evento.metodos_pago || v_entrada.metodos_pago) as m(value)
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

revoke all on function public.iniciar_compra_evento(uuid, uuid, text, uuid, jsonb, jsonb, jsonb) from public;
grant execute on function public.iniciar_compra_evento(uuid, uuid, text, uuid, jsonb, jsonb, jsonb) to anon, authenticated;

commit;
