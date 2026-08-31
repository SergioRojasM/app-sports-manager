-- =============================================
-- Migration: Defer the plan purchase until the booking actually completes (US-0110)
--
-- Fixes the orphaned-subscription gap left by US-0106: the skip-plan-confirmation flow
-- used to insert `suscripciones` + `pagos` the moment the athlete confirmed the plan
-- form, well before the booking form was submitted. Abandoning in between left a
-- 'pendiente' subscription with no reservation pointing at it, which then blocked every
-- retry (duplicate-request check) while never being auto-confirmable (the approval
-- cascade only acts on linked `reservas` rows).
--
-- Now the client holds the plan selection in memory and hands it to this function at
-- final submit, via the new `p_plan_purchase` payload. Subscription, service units,
-- payment and reservation are created inside this single function call — one
-- transaction — so either all of them exist or none do.
-- =============================================

-- The previous signature (from 20260813180000_omitir_confirmacion_plan.sql) is dropped
-- first: leaving it in place alongside the new one would let a PostgREST RPC call that
-- omits the new named param match more than one overload.
drop function if exists public.book_and_deduct_service_units(
  uuid, uuid, uuid, uuid, text, jsonb, uuid, jsonb, boolean, uuid
);

create or replace function public.book_and_deduct_service_units(
  p_tenant_id                  uuid,
  p_atleta_id                  uuid,
  p_entrenamiento_id           uuid,
  p_entrenamiento_categoria_id uuid    default null,
  p_notas                      text    default null,
  p_deductions                 jsonb   default '[]',
  p_formulario_plantilla_id    uuid    default null,
  p_formulario_respuesta       jsonb   default null,
  p_permitir_pendiente         boolean default false,
  p_suscripcion_id             uuid    default null,
  -- US-0110. When present, the subscription + payment are created here, in this same
  -- transaction, instead of having been created earlier by the client. Shape:
  --   {"plan_id": uuid, "plan_tipo_id": uuid|null, "comentarios": text|null,
  --    "metodo_pago_id": uuid, "monto": numeric}
  p_plan_purchase              jsonb   default null
)
returns public.reservas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva         public.reservas;
  v_item            jsonb;
  v_suscripcion     uuid;
  v_servicio        uuid;
  v_unlimited       boolean;
  v_rows            int;
  v_respuesta_id    uuid;
  v_missing_row     record;
  v_snapshot        jsonb;
  v_perfil_reqs     text[];
  v_missing_keys    text[];
  v_usuario         record;
  v_deportivo       record;
  v_perfil_snapshot jsonb;
  -- US-0110: id of the subscription created inline by the deferred plan purchase
  v_new_suscripcion_id uuid;
begin
  -- ── Deferred plan purchase (US-0110) ───────────────────────────────────────
  -- Runs before anything else so that a plan problem aborts the call before any
  -- formulario_respuestas row is written. Everything here shares the reservation's
  -- transaction: if the insert further down raises (capacity race, exhausted units,
  -- incomplete profile...), the subscription and payment roll back with it, and the
  -- athlete is left with nothing to be stuck on.
  if p_plan_purchase is not null then
    -- The pending-booking path is the only one that may create a purchase: a
    -- 'confirmada' booking must deduct units from an already-active subscription.
    if not p_permitir_pendiente then
      raise exception 'PLAN_PURCHASE_REQUIERE_PENDIENTE' using errcode = 'P0001';
    end if;

    -- Re-checked here rather than trusted from the client: real time passes while the
    -- athlete fills in category/notas/formulario, during which the plan can be
    -- deactivated or un-published. Same authorization rule the RLS policy
    -- `suscripciones_insert_own` would have applied to a direct client insert — which
    -- this SECURITY DEFINER function bypasses.
    if not public.can_subscribe_to_plan((p_plan_purchase->>'plan_id')::uuid, p_tenant_id) then
      raise exception 'PLAN_NO_DISPONIBLE' using errcode = 'P0001';
    end if;

    -- Same reasoning for duplicates: the client checked when it opened the plan picker,
    -- but another tab (or a second booking on another training needing the same plan)
    -- may have created one since.
    if exists (
      select 1
        from public.suscripciones
       where atleta_id = p_atleta_id
         and plan_id = (p_plan_purchase->>'plan_id')::uuid
         and estado = 'pendiente'
    ) then
      raise exception 'SUSCRIPCION_PENDIENTE_EXISTENTE' using errcode = 'P0001';
    end if;

    insert into public.suscripciones (
      tenant_id, atleta_id, plan_id, plan_tipo_id, comentarios, estado
    ) values (
      p_tenant_id,
      p_atleta_id,
      (p_plan_purchase->>'plan_id')::uuid,
      nullif(p_plan_purchase->>'plan_tipo_id', '')::uuid,
      nullif(p_plan_purchase->>'comentarios', ''),
      'pendiente'
    )
    returning id into v_new_suscripcion_id;

    -- Mirrors populate_suscripcion_servicios(); inlined rather than called so the whole
    -- purchase stays in this one function body (that function is itself SECURITY
    -- DEFINER and would run identically, but the inline form keeps the transaction's
    -- contents readable in one place).
    if nullif(p_plan_purchase->>'plan_tipo_id', '') is not null then
      insert into public.suscripcion_servicios (
        suscripcion_id, servicio_id, unidades_incluidas, unidades_restantes
      )
      select
        v_new_suscripcion_id,
        pts.servicio_id,
        pts.unidades,   -- NULL = unlimited
        pts.unidades    -- snapshot same value for restantes
      from public.plan_tipos_servicios pts
      where pts.plan_tipo_id = (p_plan_purchase->>'plan_tipo_id')::uuid
      on conflict (suscripcion_id, servicio_id) do nothing;
    end if;

    -- comprobante_path stays null here: the file lives in the browser and is uploaded
    -- by the client after this call returns (it needs the pago id for its storage
    -- path). A failed upload is recoverable through "Resubir comprobante"; an upload
    -- done *before* this call would leave an orphaned file if the booking then failed.
    insert into public.pagos (
      tenant_id, suscripcion_id, monto, comprobante_path, estado, metodo_pago_id
    ) values (
      p_tenant_id,
      v_new_suscripcion_id,
      (p_plan_purchase->>'monto')::numeric,
      null,
      'pendiente',
      (p_plan_purchase->>'metodo_pago_id')::uuid
    );

    -- Hand the new subscription to the reservation insert below, which already knows
    -- how to link it — no change needed to that logic.
    p_suscripcion_id := v_new_suscripcion_id;
  end if;

  -- ── Profile completeness gate (US-0095) — now also builds a snapshot (US-0096) ──
  v_perfil_snapshot := '{}'::jsonb;

  if p_formulario_plantilla_id is not null then
    select perfil_campos_requeridos into v_perfil_reqs
      from public.formularios_plantillas
     where id = p_formulario_plantilla_id;

    if v_perfil_reqs is not null and array_length(v_perfil_reqs, 1) > 0 then
      select nombre, apellido, telefono, fecha_nacimiento, tipo_identificacion,
             numero_identificacion, fecha_exp_identificacion, rh
        into v_usuario
        from public.usuarios
       where id = p_atleta_id;

      select peso_kg, altura_cm into v_deportivo
        from public.perfil_deportivo
       where user_id = p_atleta_id;

      v_missing_keys := array[]::text[];
      if 'nombre' = any(v_perfil_reqs) and coalesce(trim(v_usuario.nombre), '') = '' then
        v_missing_keys := array_append(v_missing_keys, 'nombre');
      end if;
      if 'apellido' = any(v_perfil_reqs) and coalesce(trim(v_usuario.apellido), '') = '' then
        v_missing_keys := array_append(v_missing_keys, 'apellido');
      end if;
      if 'telefono' = any(v_perfil_reqs) and coalesce(trim(v_usuario.telefono), '') = '' then
        v_missing_keys := array_append(v_missing_keys, 'telefono');
      end if;
      if 'fecha_nacimiento' = any(v_perfil_reqs) and v_usuario.fecha_nacimiento is null then
        v_missing_keys := array_append(v_missing_keys, 'fecha_nacimiento');
      end if;
      if 'tipo_identificacion' = any(v_perfil_reqs)
         and (v_usuario.tipo_identificacion is null or coalesce(trim(v_usuario.numero_identificacion), '') = '') then
        v_missing_keys := array_append(v_missing_keys, 'tipo_identificacion');
      end if;
      if 'fecha_exp_identificacion' = any(v_perfil_reqs) and v_usuario.fecha_exp_identificacion is null then
        v_missing_keys := array_append(v_missing_keys, 'fecha_exp_identificacion');
      end if;
      if 'rh' = any(v_perfil_reqs) and coalesce(trim(v_usuario.rh), '') = '' then
        v_missing_keys := array_append(v_missing_keys, 'rh');
      end if;
      if 'peso_kg' = any(v_perfil_reqs) and (v_deportivo.peso_kg is null) then
        v_missing_keys := array_append(v_missing_keys, 'peso_kg');
      end if;
      if 'altura_cm' = any(v_perfil_reqs) and (v_deportivo.altura_cm is null) then
        v_missing_keys := array_append(v_missing_keys, 'altura_cm');
      end if;

      if array_length(v_missing_keys, 1) > 0 then
        raise exception 'PERFIL_INCOMPLETO'
          using errcode = 'P0001', detail = array_to_string(v_missing_keys, ',');
      end if;

      -- All requested fields are present — freeze their values (US-0096).
      if 'nombre' = any(v_perfil_reqs) then
        v_perfil_snapshot := v_perfil_snapshot || jsonb_build_object('nombre', v_usuario.nombre);
      end if;
      if 'apellido' = any(v_perfil_reqs) then
        v_perfil_snapshot := v_perfil_snapshot || jsonb_build_object('apellido', v_usuario.apellido);
      end if;
      if 'telefono' = any(v_perfil_reqs) then
        v_perfil_snapshot := v_perfil_snapshot || jsonb_build_object('telefono', v_usuario.telefono);
      end if;
      if 'fecha_nacimiento' = any(v_perfil_reqs) then
        v_perfil_snapshot := v_perfil_snapshot || jsonb_build_object('fecha_nacimiento', v_usuario.fecha_nacimiento::text);
      end if;
      if 'tipo_identificacion' = any(v_perfil_reqs) then
        v_perfil_snapshot := v_perfil_snapshot || jsonb_build_object(
          'tipo_identificacion', v_usuario.tipo_identificacion || ' ' || v_usuario.numero_identificacion
        );
      end if;
      if 'fecha_exp_identificacion' = any(v_perfil_reqs) then
        v_perfil_snapshot := v_perfil_snapshot || jsonb_build_object('fecha_exp_identificacion', v_usuario.fecha_exp_identificacion::text);
      end if;
      if 'rh' = any(v_perfil_reqs) then
        v_perfil_snapshot := v_perfil_snapshot || jsonb_build_object('rh', v_usuario.rh);
      end if;
      if 'peso_kg' = any(v_perfil_reqs) then
        v_perfil_snapshot := v_perfil_snapshot || jsonb_build_object('peso_kg', v_deportivo.peso_kg::text);
      end if;
      if 'altura_cm' = any(v_perfil_reqs) then
        v_perfil_snapshot := v_perfil_snapshot || jsonb_build_object('altura_cm', v_deportivo.altura_cm::text);
      end if;
    end if;
  end if;

  -- ── Formulario respuesta: validate required "datos" fields, then insert ──── (US-0087, unchanged)
  if p_formulario_respuesta is not null then
    if p_formulario_plantilla_id is null then
      raise exception 'FORMULARIO_PLANTILLA_REQUERIDA' using errcode = 'P0001';
    end if;

    select campo_nombre
      into v_missing_row
      from public.formulario_plantilla_esquema
     where formulario_plantilla_id = p_formulario_plantilla_id
       and seccion_tipo = 'datos'
       and campo_obligatorio = true
       and activo = true
       and (
         not (p_formulario_respuesta ? campo_nombre)
         or trim(coalesce(p_formulario_respuesta ->> campo_nombre, '')) = ''
       )
     limit 1;

    if found then
      raise exception 'FORMULARIO_CAMPOS_FALTANTES'
        using errcode = 'P0001', detail = v_missing_row.campo_nombre;
    end if;

    -- Snapshot each active "datos" field's label/type/order as it exists right now,
    -- so the answer stays human-readable even after the template is edited or deleted.
    select coalesce(
        jsonb_object_agg(
          campo_nombre,
          jsonb_build_object('etiqueta', campo_etiqueta, 'tipo', campo_tipo, 'orden', orden)
        ),
        '{}'::jsonb
      )
      into v_snapshot
      from public.formulario_plantilla_esquema
     where formulario_plantilla_id = p_formulario_plantilla_id
       and seccion_tipo = 'datos'
       and activo = true;

    insert into public.formulario_respuestas (
      tenant_id, formulario_plantilla_id, atleta_id, entrenamiento_id, respuesta, campos_snapshot, perfil_snapshot
    ) values (
      p_tenant_id, p_formulario_plantilla_id, p_atleta_id, p_entrenamiento_id, p_formulario_respuesta, v_snapshot, v_perfil_snapshot
    )
    returning id into v_respuesta_id;
  end if;

  -- ── Pass 1: pre-validate all finite services before any write ──────────────
  for v_item in select * from jsonb_array_elements(p_deductions)
  loop
    v_suscripcion := (v_item->>'suscripcion_id')::uuid;
    v_servicio    := (v_item->>'servicio_id')::uuid;

    if v_suscripcion is not null then
      if not exists (
        select 1 from public.suscripciones
        where id = v_suscripcion and estado in ('activa', 'vencida')
      ) then
        raise exception 'SUSCRIPCION_INACTIVA' using errcode = 'P0001';
      end if;

      select (unidades_restantes is null) into v_unlimited
        from public.suscripcion_servicios
       where suscripcion_id = v_suscripcion and servicio_id = v_servicio;

      if not coalesce(v_unlimited, false) then
        if not exists (
          select 1 from public.suscripcion_servicios
           where suscripcion_id = v_suscripcion
             and servicio_id = v_servicio
             and unidades_restantes > 0
        ) then
          raise exception 'UNIDADES_AGOTADAS' using errcode = 'P0001';
        end if;
      end if;
    end if;
  end loop;

  -- ── Insert reservation ─────────────────────────────────────────────────────
  -- p_permitir_pendiente lets a public training's skip-confirmation flow (US-0106)
  -- create a 'pendiente' booking with no deductions, linked to the pending
  -- suscripcion via p_suscripcion_id, instead of the usual 'confirmada' insert.
  insert into public.reservas (
    tenant_id, atleta_id, entrenamiento_id, entrenamiento_categoria_id,
    estado, fecha_reserva, notas, formulario_respuesta_id, suscripcion_id
  ) values (
    p_tenant_id, p_atleta_id, p_entrenamiento_id, p_entrenamiento_categoria_id,
    case when p_permitir_pendiente then 'pendiente' else 'confirmada' end,
    now(), p_notas, v_respuesta_id, p_suscripcion_id
  )
  returning * into v_reserva;

  -- ── Pass 2: deduct units and log each service ──────────────────────────────
  for v_item in select * from jsonb_array_elements(p_deductions)
  loop
    v_suscripcion := (v_item->>'suscripcion_id')::uuid;
    v_servicio    := (v_item->>'servicio_id')::uuid;

    if v_suscripcion is not null then
      select (unidades_restantes is null) into v_unlimited
        from public.suscripcion_servicios
       where suscripcion_id = v_suscripcion and servicio_id = v_servicio;

      if not coalesce(v_unlimited, false) then
        update public.suscripcion_servicios
           set unidades_restantes = unidades_restantes - 1
         where suscripcion_id = v_suscripcion
           and servicio_id = v_servicio
           and unidades_restantes > 0;

        get diagnostics v_rows = row_count;
        if v_rows = 0 then
          raise exception 'UNIDADES_AGOTADAS' using errcode = 'P0001';
        end if;
      end if;
    end if;

    insert into public.reserva_servicios (reserva_id, suscripcion_id, servicio_id)
    values (v_reserva.id, v_suscripcion, v_servicio)
    on conflict (reserva_id, servicio_id) do nothing;
  end loop;

  return v_reserva;
end;
$$;
