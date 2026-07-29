# US-0096 — Snapshot Requested Profile Data on Form Responses

## ID
US-0096

## Name
Snapshot the Athlete's Profile Data on Form Response Submission and Surface It in the Response Viewer/Export

## As a
Tenant administrador or entrenador (reviewing form responses) and Atleta (whose historical booking data should stay accurate over time)

## I Want
The profile field values requested by a form template (US-0095's `perfil_campos_requeridos`) to be frozen into the `formulario_respuestas` row at submission time — the same way "Datos" section answers are already frozen via `campos_snapshot` — and shown in the "Ver respuesta" viewer and included as columns in the "Descargar Respuestas Formulario" export.

## So That
Staff reviewing a past booking's response see the profile data exactly as it was when the athlete booked (not silently overwritten by later profile edits), and can export/audit that data alongside the custom "Datos" answers without having to separately cross-reference the athlete's current profile.

---

## Description

### Current State
- US-0095 added `formularios_plantillas.perfil_campos_requeridos` (a fixed 9-key catalog: `nombre`, `apellido`, `telefono`, `fecha_nacimiento`, `tipo_identificacion`, `fecha_exp_identificacion`, `rh`, `peso_kg`, `altura_cm`) plus a client-side + RPC-level completeness gate in the booking fill-out flow. The gate only *validates* the profile is complete at submission time — it does not persist what those values *were*.
- `formulario_respuestas` (US-0087) already has this exact pattern for custom "Datos" fields: `campos_snapshot jsonb` freezes `{ [campo_nombre]: { etiqueta, tipo, orden } }` at submission time inside the `book_and_deduct_service_units` RPC (see [20260723000100_formulario_respuestas.sql](supabase/migrations/20260723000100_formulario_respuestas.sql)), so "Ver respuesta" and the Excel export keep working correctly even if the template is edited or deleted later. There is no equivalent snapshot for profile data.
- [FormularioRespuestaViewerModal.tsx](src/components/portal/entrenamientos/reservas/FormularioRespuestaViewerModal.tsx) renders only `campos_snapshot`-derived answers ("Datos" fields) — it has no awareness of requested profile fields at all.
- [ReservasPanel.tsx](src/components/portal/entrenamientos/reservas/ReservasPanel.tsx)'s `handleExportFormularioRespuestas` builds the "Descargar Respuestas Formulario" Excel export purely from `campos_snapshot`/`respuesta` — profile data requested by the template (US-0095) is entirely absent from the export.
- The RPC (`book_and_deduct_service_units`, as extended in US-0095) already fetches the athlete's full `usuarios` + `perfil_deportivo` rows in-memory to run the completeness check — the values needed for a snapshot are already available at exactly the right point in the transaction, they are simply not persisted.

### Proposed Changes

#### 1. Database — new snapshot column + RPC extension
- Add `formulario_respuestas.perfil_snapshot jsonb not null default '{}'::jsonb`, storing `{ [campo_key]: value_string }` for every profile field that was requested by the template AT SUBMISSION TIME — same freezing rationale as `campos_snapshot`: if the athlete's profile later changes, or the template's `perfil_campos_requeridos` is edited, historical responses keep showing what was true when the booking was made.
- Values are stored as plain strings (already-formatted where relevant, e.g. `tipo_identificacion` stored as `"CC 1019116819"` combining both underlying columns, `peso_kg` stored as `"50.00"`), matching the same values validated by the US-0095 completeness check. Labels are NOT stored per-key (unlike `campos_snapshot`'s `etiqueta`) because profile field labels come from the fixed, code-level `FORMULARIO_PERFIL_CAMPOS` catalog (not an admin-editable DB column like `campo_etiqueta`), so there is nothing that can drift — the frontend resolves `key → label` from the catalog at render time.
- Extend `book_and_deduct_service_units` (already modified by the pending US-0095 migration) to build this snapshot immediately after the profile-completeness check succeeds, reusing the already-fetched `v_usuario`/`v_deportivo` records, and include it in the existing `insert into formulario_respuestas (...)` statement.
- No new check constraint on `perfil_snapshot`'s keys: `formulario_respuestas` has no direct-write RLS policy for `authenticated` — every row is written exclusively through this `security definer` RPC (see the "Deliberately no INSERT/UPDATE/DELETE policy" comment in [20260723000100_formulario_respuestas.sql](supabase/migrations/20260723000100_formulario_respuestas.sql)) — so the RPC is trusted to only ever write catalog keys, exactly like `campos_snapshot` today has no equivalent constraint either.

#### 2. Response viewer ("Ver respuesta")
- `FormularioRespuestaViewerModal` gains an optional `perfilCampos` prop — a list of `{ key, label, value }` resolved from `perfil_snapshot` via the `FORMULARIO_PERFIL_CAMPOS` catalog — rendered as a distinct "Datos de perfil" section ABOVE the existing "Datos" answers list, mirroring the fill-out modal's convention of showing profile data as a summary before the custom fields. Renders nothing when `perfil_snapshot` is empty (every response submitted before this feature, or against a template with no profile requirements).
- `ReservasPanel.tsx`'s `handleOpenRespuestaViewer` builds this list from the fetched `formulario_respuestas` row's new `perfil_snapshot` field, in `FORMULARIO_PERFIL_CAMPOS` catalog order (the catalog itself is small and fixed, so no need to persist a separate ordering).

#### 3. "Descargar Respuestas Formulario" export
- `handleExportFormularioRespuestas` in `ReservasPanel.tsx` computes the union of `perfil_snapshot` keys across all fetched responses for the training (mirroring the existing union-of-`campos_snapshot`-keys logic for "Datos" columns), maps each to its catalog label, and inserts them as additional Excel columns placed right after the fixed identity columns (`Atleta`, `Apellido`, `Email`, `Fecha de respuesta`) and before the dynamic "Datos" columns — matching the viewer modal's "profile data first" ordering.
- Cells for a given response render the stored string value, or blank when that response didn't have that field snapshotted (empty template requirement, or the response predates this feature).

---

## Database Changes

New migration: `supabase/migrations/{timestamp}_formulario_respuestas_perfil_snapshot.sql`

```sql
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
  v_reserva        public.reservas;
  v_item           jsonb;
  v_suscripcion    uuid;
  v_servicio       uuid;
  v_unlimited      boolean;
  v_rows           int;
  v_respuesta_id   uuid;
  v_missing_row    record;
  v_snapshot       jsonb;
  v_perfil_reqs    text[];
  v_missing_keys   text[];
  v_usuario        record;
  v_deportivo      record;
  v_perfil_snapshot jsonb;
begin
  -- ── Profile completeness gate (US-0095) — unchanged, now also builds a snapshot ──
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

  -- (rest of the function body — deductions pass 1, reservation insert, deductions
  --  pass 2 — is UNCHANGED from the US-0095 migration)
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

  insert into public.reservas (
    tenant_id, atleta_id, entrenamiento_id, entrenamiento_categoria_id,
    estado, fecha_reserva, notas, formulario_respuesta_id
  ) values (
    p_tenant_id, p_atleta_id, p_entrenamiento_id, p_entrenamiento_categoria_id,
    'confirmada', now(), p_notas, v_respuesta_id
  )
  returning * into v_reserva;

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
```

Notes:
- This migration must be sequenced AFTER the US-0095 migration (`..._formulario_plantilla_perfil_requerido.sql`) since it redefines the same function the latter introduced the profile-completeness branch into. If US-0095 has not yet been merged/applied, fold this change into that same migration file instead of stacking two `create or replace function` migrations — check the current state of `supabase/migrations/` before creating this file.
- No RLS policy changes: `perfil_snapshot` is just another column on the already-covered `formulario_respuestas` table (`formulario_respuestas_select_staff_or_owner`).
- Apply and verify locally only (`supabase db reset`) — do not push to the remote/hosted Supabase project.

---

## API / Server Actions

| File | Function | Change |
|------|----------|--------|
| `src/services/supabase/portal/formularios.service.ts` | `getRespuestaById` | No change — already `select('*')`, so `perfil_snapshot` is included automatically |
| `src/services/supabase/portal/formularios.service.ts` | `getRespuestasByEntrenamiento` | Add `perfil_snapshot` to the explicit select column list and to the mapped return object |
| Supabase RPC | `book_and_deduct_service_units` | Extended per SQL above — builds and persists `perfil_snapshot`, no signature change |

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_formulario_respuestas_perfil_snapshot.sql` | Add `perfil_snapshot` column + RPC redefinition (or fold into the US-0095 migration if not yet applied) |
| Types | `src/types/portal/formularios.types.ts` | Add `perfil_snapshot: Partial<Record<FormularioPerfilCampo, string>>` to `FormularioRespuesta` |
| Service | `src/services/supabase/portal/formularios.service.ts` | Include `perfil_snapshot` in `getRespuestasByEntrenamiento`'s select + mapping |
| Component | `src/components/portal/entrenamientos/reservas/FormularioRespuestaViewerModal.tsx` | New optional `perfilCampos` prop; renders a "Datos de perfil" section above the "Datos" answers |
| Component | `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` | `handleOpenRespuestaViewer` builds `perfilCampos` from `perfil_snapshot` via `FORMULARIO_PERFIL_CAMPOS`; `handleExportFormularioRespuestas` adds profile columns (union of `perfil_snapshot` keys, catalog order) right after the fixed identity columns |

---

## Acceptance Criteria

1. Booking a training whose attached template requests profile fields (e.g., `telefono`, `peso_kg`) persists a `perfil_snapshot` row on `formulario_respuestas` containing exactly those two keys with the athlete's values at submission time.
2. Booking a training whose attached template requests NO profile fields persists `perfil_snapshot = '{}'::jsonb` (no regression — matches every response created before this feature).
3. If the athlete edits their profile AFTER submitting a response (e.g., changes their phone number), opening "Ver respuesta" for that historical booking still shows the ORIGINAL value captured at submission time, not the current one.
4. Opening "Ver respuesta" for a response with a non-empty `perfil_snapshot` shows a "Datos de perfil" section above the "Datos" answers, with each field's catalog label and frozen value.
5. Opening "Ver respuesta" for a response with an empty `perfil_snapshot` (pre-existing responses, or templates with no profile requirements) shows no "Datos de perfil" section — the viewer looks exactly as it did before this feature.
6. "Descargar Respuestas Formulario" for a training with at least one profile-snapshot-bearing response includes one Excel column per unique requested profile key across all responses (union, catalog order, catalog labels as headers), positioned after `Fecha de respuesta` and before the dynamic "Datos" columns.
7. In that export, a response missing a given profile key (empty template requirement, or predates this feature) renders a blank cell for that column rather than an error.
8. The server-side RPC is the only write path for `perfil_snapshot` — no direct client `insert`/`update` on `formulario_respuestas` can set it, consistent with the table's existing RLS (no `authenticated` write policy).
9. Templates with `formulario_externo` (no internal plantilla) are unaffected — no `formulario_respuestas` row, hence no snapshot, is ever created for that path.

---

## Implementation Steps

- [ ] Confirm whether the US-0095 migration is already applied/merged; create a new migration (this story) or fold the change into it accordingly
- [ ] Add `perfil_snapshot` column to `formulario_respuestas` and redefine `book_and_deduct_service_units` to populate it
- [ ] Apply migration locally (`supabase db reset`) and verify against `20260723000100_formulario_respuestas.sql` (and the US-0095 migration) with no conflicts
- [ ] Manually exercise the RPC locally to confirm a booking with requested profile fields produces the expected `perfil_snapshot` JSON, and a booking with none produces `'{}'`
- [ ] Add `perfil_snapshot` to `FormularioRespuesta` in `formularios.types.ts`
- [ ] Update `getRespuestasByEntrenamiento`'s select/mapping in `formularios.service.ts`
- [ ] Add the "Datos de perfil" section to `FormularioRespuestaViewerModal.tsx`
- [ ] Update `handleOpenRespuestaViewer` in `ReservasPanel.tsx` to build `perfilCampos` from `perfil_snapshot`
- [ ] Update `handleExportFormularioRespuestas` in `ReservasPanel.tsx` to add the profile columns
- [ ] Test manually: book with profile fields requested → "Ver respuesta" shows frozen values; edit the athlete's profile afterward → viewer still shows the old values; export includes the new columns correctly; a response with no profile snapshot shows/exports cleanly with no extra section/blank cells
- [ ] Update `projectspec/03-project-structure.md` with `(US-0096)` annotations for every touched file

---

## Non-Functional Requirements

- **Security**: No RLS changes — `perfil_snapshot` is covered by the existing `formulario_respuestas` row-level policy; all writes remain exclusively through the `security definer` RPC.
- **Performance**: No new queries — the snapshot uses data the RPC already fetches for the US-0095 completeness check; the export's key-union computation is in-memory over the same `getRespuestasByEntrenamiento` result set already used today for `campos_snapshot`.
- **Accessibility**: The viewer's new "Datos de perfil" section follows the same label/value block markup already used for "Datos" answers in `FormularioRespuestaViewerModal`.
- **Error handling**: No new error states — snapshot failures cannot occur independently of the existing profile-completeness gate (US-0095), which already blocks the RPC before any snapshot would be built with missing data.
