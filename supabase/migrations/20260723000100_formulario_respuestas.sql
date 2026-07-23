-- =============================================
-- Migration: Form responses on booking
-- US-0087: formulario_respuestas + reservas.formulario_respuesta_id + atomic booking RPC
-- =============================================

-- 1. formulario_respuestas table
create table if not exists public.formulario_respuestas (
  id                      uuid          primary key default gen_random_uuid(),
  tenant_id               uuid          not null,
  -- Nullable: a deleted formularios_plantillas row detaches (on delete set null) rather
  -- than blocking the delete — the template can always be removed, the response survives.
  formulario_plantilla_id uuid,
  atleta_id               uuid          not null,
  entrenamiento_id        uuid          not null,
  respuesta               jsonb         not null default '{}'::jsonb,
  -- Snapshot of { [campo_nombre]: { etiqueta, tipo, orden } } for every active "datos"
  -- section, taken at submission time. Lets "Ver respuesta" keep showing the original
  -- labels/types even if the template is later edited or hard-deleted.
  campos_snapshot         jsonb         not null default '{}'::jsonb,
  created_at              timestamptz   not null default timezone('utc', now()),

  constraint formulario_respuestas_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint formulario_respuestas_formulario_plantilla_id_fkey
    foreign key (formulario_plantilla_id) references public.formularios_plantillas(id) on delete set null,
  constraint formulario_respuestas_atleta_id_fkey
    foreign key (atleta_id) references public.usuarios(id) on delete restrict,
  constraint formulario_respuestas_entrenamiento_id_fkey
    foreign key (entrenamiento_id) references public.entrenamientos(id) on delete cascade
);

create index if not exists idx_formulario_respuestas_tenant_id on public.formulario_respuestas (tenant_id);
create index if not exists idx_formulario_respuestas_formulario_plantilla_id on public.formulario_respuestas (formulario_plantilla_id);
create index if not exists idx_formulario_respuestas_atleta_id on public.formulario_respuestas (atleta_id);
create index if not exists idx_formulario_respuestas_entrenamiento_id on public.formulario_respuestas (entrenamiento_id);

-- 2. reservas.formulario_respuesta_id
alter table public.reservas
  add column if not exists formulario_respuesta_id uuid default null;

alter table public.reservas
  add constraint reservas_formulario_respuesta_id_fkey
    foreign key (formulario_respuesta_id) references public.formulario_respuestas(id) on delete set null;

alter table public.reservas
  add constraint reservas_formulario_respuesta_id_uk unique (formulario_respuesta_id);

create index if not exists idx_reservas_formulario_respuesta_id on public.reservas (formulario_respuesta_id);

-- 3. RLS
alter table public.formulario_respuestas enable row level security;
grant select, insert on table public.formulario_respuestas to authenticated;

-- SELECT: tenant admin/entrenador, or the athlete's own response
drop policy if exists formulario_respuestas_select_staff_or_owner on public.formulario_respuestas;
create policy formulario_respuestas_select_staff_or_owner on public.formulario_respuestas
  for select to authenticated
  using (
    atleta_id = auth.uid()
    or exists (
      select 1
      from public.miembros_tenant mt
      join public.roles r on r.id = mt.rol_id
      where mt.usuario_id = auth.uid()
        and mt.tenant_id = formulario_respuestas.tenant_id
        and mt.estado = 'activo'
        and lower(r.nombre) in ('administrador', 'entrenador')
    )
  );

-- Deliberately no INSERT/UPDATE/DELETE policy for `authenticated`: every write happens
-- exclusively through the SECURITY DEFINER RPC below (it bypasses RLS as the function
-- owner), so a direct client-side insert into this table is always rejected by RLS.

-- 4. Extend book_and_deduct_service_units: optionally insert a formulario_respuesta
--    atomically with the reservation, validating required "datos" fields server-side.
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
  v_reserva      public.reservas;
  v_item         jsonb;
  v_suscripcion  uuid;
  v_servicio     uuid;
  v_unlimited    boolean;
  v_rows         int;
  v_respuesta_id uuid;
  v_missing_row  record;
  v_snapshot     jsonb;
begin
  -- ── Formulario respuesta: validate required "datos" fields, then insert ────
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
      tenant_id, formulario_plantilla_id, atleta_id, entrenamiento_id, respuesta, campos_snapshot
    ) values (
      p_tenant_id, p_formulario_plantilla_id, p_atleta_id, p_entrenamiento_id, p_formulario_respuesta, v_snapshot
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
