-- =============================================
-- Migration: Skip plan confirmation on public training publish (US-0106)
-- Lets a trainer/admin opt a public training publication into letting a
-- booking proceed as 'pendiente' alongside a pending plan purchase, instead
-- of blocking the booking until the plan is approved.
-- =============================================

-- 1. Publish-time toggle
alter table public.entrenamientos_publicos
  add column if not exists omitir_confirmacion_plan boolean not null default false;

-- 2. New reservas states + rejection reason
alter table public.reservas
  drop constraint if exists reservas_estado_ck;
alter table public.reservas
  add constraint reservas_estado_ck
    check (estado in ('pendiente', 'confirmada', 'cancelada', 'completada', 'rechazada'));
alter table public.reservas
  add column if not exists motivo_rechazo text null;

-- 3. Payment rejection reason
alter table public.pagos
  add column if not exists motivo_rechazo text null;

-- 4. book_and_deduct_service_units: allow inserting as 'pendiente' and
--    linking a suscripcion_id even without a deduction. Full body carried
--    forward from 20260729184000_formulario_respuestas_perfil_snapshot.sql,
--    only the two new params and the reservas insert are new. The older
--    overloads (from earlier migrations) are dropped first — leaving them in
--    place alongside the new signature would let a PostgREST RPC call that
--    omits the two new named params match more than one overload.
drop function if exists public.book_and_deduct_service_units(
  uuid, uuid, uuid, uuid, text, jsonb
);
drop function if exists public.book_and_deduct_service_units(
  uuid, uuid, uuid, uuid, text, jsonb, uuid, jsonb
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
  p_suscripcion_id             uuid    default null
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

-- 5. Approval cascade: confirm any pendiente reservas riding on a subscription
--    that just got approved, deducting units the same way a normal booking would.
--    Leaves a reserva 'pendiente' (does not raise) if units are insufficient, so
--    the subscription approval itself never fails because of this cascade.
create or replace function public.confirm_pending_reservas_for_suscripcion(
  p_suscripcion_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva   record;
  v_row       record;
  v_slots     uuid[];
  v_slot      uuid;
  v_all_ok    boolean;
  v_matched   boolean;
begin
  for v_reserva in
    select r.id, r.entrenamiento_id
      from public.reservas r
     where r.suscripcion_id = p_suscripcion_id
       and r.estado = 'pendiente'
     order by r.created_at
  loop
    v_matched := false;

    for v_row in
      select servicio_1_id, servicio_2_id, servicio_3_id, servicio_4_id
        from public.entrenamiento_restricciones
       where entrenamiento_id = v_reserva.entrenamiento_id
       order by orden
    loop
      v_slots := array_remove(
        array[v_row.servicio_1_id, v_row.servicio_2_id, v_row.servicio_3_id, v_row.servicio_4_id],
        null
      );

      if array_length(v_slots, 1) is null then
        continue;
      end if;

      v_all_ok := true;
      foreach v_slot in array v_slots loop
        if not exists (
          select 1 from public.suscripcion_servicios
           where suscripcion_id = p_suscripcion_id
             and servicio_id = v_slot
             and (unidades_restantes is null or unidades_restantes > 0)
        ) then
          v_all_ok := false;
          exit;
        end if;
      end loop;

      if v_all_ok then
        v_matched := true;

        foreach v_slot in array v_slots loop
          update public.suscripcion_servicios
             set unidades_restantes = unidades_restantes - 1
           where suscripcion_id = p_suscripcion_id
             and servicio_id = v_slot
             and unidades_restantes is not null
             and unidades_restantes > 0;

          insert into public.reserva_servicios (reserva_id, suscripcion_id, servicio_id)
          values (v_reserva.id, p_suscripcion_id, v_slot)
          on conflict (reserva_id, servicio_id) do nothing;
        end loop;

        update public.reservas
           set estado = 'confirmada'
         where id = v_reserva.id;

        exit;
      end if;
    end loop;

    -- v_matched = false: leave this reserva 'pendiente' for manual admin handling
  end loop;
end;
$$;

-- 6. Reject cascade: a rejected payment or a cancelled still-pendiente subscription
--    rejects any pendiente reserva riding on it, with the admin's reason attached.
create or replace function public.reject_pending_reservas_for_suscripcion(
  p_suscripcion_id uuid,
  p_motivo         text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reservas
     set estado = 'rechazada',
         motivo_rechazo = p_motivo
   where suscripcion_id = p_suscripcion_id
     and estado = 'pendiente';
end;
$$;

-- 7. Surface reservas.motivo_rechazo on the reporting view used by "Mis Reservas" /
--    gestión de reservas, so a rejected booking's reason can be displayed there too.
drop view if exists public.reservas_reporte_view;

create view public.reservas_reporte_view
with (security_invoker = true)
as
select
  r.id                          as reserva_id,
  r.tenant_id,
  t.nombre                      as tenant_nombre,
  r.entrenamiento_id,
  r.atleta_id,
  r.estado                      as reserva_estado,
  r.fecha_reserva,
  r.fecha_cancelacion,
  r.notas                       as notas_reserva,
  r.motivo_rechazo,
  r.created_at,
  -- Athlete
  a.nombre                      as atleta_nombre,
  a.apellido                    as atleta_apellido,
  a.email                       as atleta_email,
  a.telefono                    as atleta_telefono,
  a.tipo_identificacion,
  a.numero_identificacion,
  a.fecha_nacimiento,
  a.fecha_exp_identificacion,
  -- Training
  e.nombre                      as entrenamiento_nombre,
  e.fecha_hora                  as entrenamiento_fecha,
  -- Discipline & Scenario
  d.nombre                      as disciplina,
  s.nombre                      as escenario,
  -- Category level
  nd.nombre                     as nivel_disciplina,
  -- Attendance
  asi.asistio,
  asi.fecha_asistencia,
  asi.observaciones              as observaciones_asistencia,
  -- Validator
  v.email                       as validado_por_email
from public.reservas r
  inner join public.usuarios          a   on a.id  = r.atleta_id
  inner join public.entrenamientos    e   on e.id  = r.entrenamiento_id
  left  join public.tenants           t   on t.id  = r.tenant_id
  left  join public.disciplinas       d   on d.id  = e.disciplina_id
  left  join public.escenarios        s   on s.id  = e.escenario_id
  left  join public.entrenamiento_categorias ec on ec.id = r.entrenamiento_categoria_id
  left  join public.nivel_disciplina  nd  on nd.id = ec.nivel_id
  left  join public.asistencias       asi on asi.reserva_id = r.id
  left  join public.usuarios          v   on v.id  = asi.validado_por;

grant select on public.reservas_reporte_view to authenticated;
