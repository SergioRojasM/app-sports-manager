-- =============================================
-- Migration: Snapshot requested profile data on form responses
-- US-0096: freezes formularios_plantillas.perfil_campos_requeridos values into
-- formulario_respuestas at submission time, same rationale as campos_snapshot (US-0087)
-- =============================================

-- 1. New column
alter table public.formulario_respuestas
  add column if not exists perfil_snapshot jsonb not null default '{}'::jsonb;

-- 2. Extend book_and_deduct_service_units: after the existing profile-completeness
--    check (US-0095) succeeds, snapshot the validated values into the new column.
create or replace function public.book_and_deduct_service_units(
  p_tenant_id                  uuid,
  p_atleta_id                  uuid,
  p_entrenamiento_id           uuid,
  p_entrenamiento_categoria_id uuid    default null,
  p_notas                      text    default null,
  p_deductions                 jsonb   default '[]',
  p_formulario_plantilla_id    uuid    default null,
  p_formulario_respuesta       jsonb   default null
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
begin
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
  insert into public.reservas (
    tenant_id, atleta_id, entrenamiento_id, entrenamiento_categoria_id,
    estado, fecha_reserva, notas, formulario_respuesta_id
  ) values (
    p_tenant_id, p_atleta_id, p_entrenamiento_id, p_entrenamiento_categoria_id,
    'confirmada', now(), p_notas, v_respuesta_id
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
