# US-0095 — Form Template Profile Data Requirements

## ID
US-0095

## Name
Request User Profile Data From Form Templates and Enforce Profile Completeness on Fill-out

## As a
Tenant administrador (form template author) and Atleta/Usuario (form filler)

## I Want
To mark, per form template, which fields from the athlete's profile (`usuarios` + `perfil_deportivo`) are required — instead of re-asking for that data as new "Datos" sections — and have the fill-out flow show those values as a summary and block submission until the athlete's profile actually has them.

## So That
Admins stop duplicating profile fields (name, phone, ID, birth date, weight, height, etc.) inside every form template, athletes see at a glance what profile data will be shared with the training organizer, and incomplete profiles are caught before booking instead of producing bookings with missing athlete data.

---

## Description

### Current State
- `formularios_plantillas` (US-0084) + `formulario_plantilla_esquema` (US-0085) let an admin build a template out of ordered sections (`titulo`, `subtitulo`, `texto`, `datos`). "Datos" sections are custom fields the athlete types in by hand — there is no concept of "reuse a field the athlete already has in their profile."
- The athlete's profile (`public.usuarios`: `nombre`, `apellido`, `telefono`, `fecha_nacimiento`, `tipo_identificacion`, `numero_identificacion`, `fecha_exp_identificacion`, `rh`; `public.perfil_deportivo`: `peso_kg`, `altura_cm`) is managed separately at `/portal/perfil` ([PerfilPage.tsx](src/components/portal/perfil/PerfilPage.tsx)) and is never cross-referenced when a training's form is filled out.
- The fill-out flow ([FormularioRespuestaModal.tsx](src/components/portal/entrenamientos/reservas/FormularioRespuestaModal.tsx), driven by [useFormularioRespuestaForm.ts](src/hooks/portal/entrenamientos/reservas/useFormularioRespuestaForm.ts)) only renders the template's "datos" sections and validates their `campo_obligatorio` flags. It has no awareness of the athlete's profile at all.
- `book_and_deduct_service_units` (extended in US-0087, see [20260723000100_formulario_respuestas.sql](supabase/migrations/20260723000100_formulario_respuestas.sql)) validates required "datos" fields server-side and atomically inserts `formulario_respuestas` + the reservation. It has no profile-completeness check.
- `FormularioRespuestaModal` is shared by two booking flows: the tenant-scoped [ReservasPanel.tsx](src/components/portal/entrenamientos/reservas/ReservasPanel.tsx) and the cross-tenant marketplace [PublicTrainingReservaModal.tsx](src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx) (both go through [useFormularioRespuestaForm.ts](src/hooks/portal/entrenamientos/reservas/useFormularioRespuestaForm.ts)), so both must pick up this change from the shared hook/component.

### Proposed Changes

#### 1. Template configuration (admin side)
- Add a fixed catalog of "requestable" profile fields (9 keys spanning `usuarios` + `perfil_deportivo`, see table below). Each `formularios_plantillas` row gets a new `perfil_campos_requeridos` array column storing which of these keys the admin selected for that template.
- In [FormularioEditorPage.tsx](src/components/portal/formularios/FormularioEditorPage.tsx) (the auto-saving per-template editor), add a new collapsible/section block below the existing "Plantilla activa" toggle: **"Datos de perfil requeridos"** — a checkbox grid (one checkbox per catalog field, grouped visually under "Datos personales" and "Datos deportivos"). Toggling a checkbox immediately calls `updatePlantillaField({ perfil_campos_requeridos: [...] })` (same auto-save-on-change pattern as `activo`).
- The create-only [FormularioFormModal.tsx](src/components/portal/formularios/FormularioFormModal.tsx) (nombre + descripcion) is NOT changed — profile field selection, like section building, only happens in the editor page after the template exists.
- [FormularioPreviewModal.tsx](src/components/portal/formularios/FormularioPreviewModal.tsx) gets a small read-only "Datos de perfil solicitados" chip list at the top (below the template name) when `perfil_campos_requeridos` is non-empty, so admins previewing the template see what will be requested.

#### 2. Profile fields catalog
| Key | Label | Source table/column |
|-----|-------|----------------------|
| `nombre` | Nombre | `usuarios.nombre` |
| `apellido` | Apellido | `usuarios.apellido` |
| `telefono` | Teléfono | `usuarios.telefono` |
| `fecha_nacimiento` | Fecha de nacimiento | `usuarios.fecha_nacimiento` |
| `tipo_identificacion` + `numero_identificacion` | Identificación (tipo y número) | `usuarios.tipo_identificacion`, `usuarios.numero_identificacion` |
| `fecha_exp_identificacion` | Fecha de expedición de identificación | `usuarios.fecha_exp_identificacion` |
| `rh` | RH | `usuarios.rh` |
| `peso_kg` | Peso (kg) | `perfil_deportivo.peso_kg` |
| `altura_cm` | Altura (cm) | `perfil_deportivo.altura_cm` |

`tipo_identificacion`/`numero_identificacion` are stored and toggled as a single logical checkbox ("Identificación") since one is meaningless without the other, but both underlying columns are checked for completeness. `email` and `foto_url` are intentionally excluded (email is never missing; photo isn't relevant to training bookings).

#### 3. Fill-out flow (athlete side)
- [useFormularioRespuestaForm.ts](src/hooks/portal/entrenamientos/reservas/useFormularioRespuestaForm.ts): when loading the plantilla, also read `perfil_campos_requeridos`. If non-empty, fetch the target athlete's (`atletaId` param — already the booking athlete, works for both self-booking and admin-on-behalf-of booking) `usuarios` + `perfil_deportivo` rows. Compute:
  - `perfilResumen`: ordered list of `{ key, label, value }` for every requested field that currently HAS a value (for the summary display).
  - `perfilFaltantes`: ordered list of `{ key, label }` for every requested field that is null/empty (drives the completeness gate).
- `validate()` returns `false` (without mutating the per-campo `errors` map) when `perfilFaltantes.length > 0` — a distinct state so the UI can show "complete tu perfil" messaging instead of a generic field error.
- [FormularioRespuestaModal.tsx](src/components/portal/entrenamientos/reservas/FormularioRespuestaModal.tsx): render a small summary strip directly under the template title/subtitle, only when `perfilResumen` is non-empty — a single compact wrapped line, e.g. `Perfil: Juan Pérez · CC 123456789 · Tel 3001234567`, using existing values, no inputs (read-only, since these values are NOT re-collected in this form).
  - When `perfilFaltantes.length > 0`, replace the summary strip with an amber warning panel: "Tu perfil no tiene estos datos: {labels}. Actualízalo para continuar." plus an **"Actualizar perfil"** link (`href="/portal/perfil"`, opens in a new tab so the in-progress reservation flow isn't lost) and a **"Ya actualicé, verificar de nuevo"** button that re-runs the profile fetch.
  - The "Guardar y reservar" button is disabled while `perfilFaltantes.length > 0`.
- Server-side defense in depth: `book_and_deduct_service_units` also validates `perfil_campos_requeridos` for `p_atleta_id` before inserting the reservation, raising `PERFIL_INCOMPLETO` (mirroring the existing `FORMULARIO_CAMPOS_FALTANTES` pattern) if the client-side check was bypassed or the profile changed mid-flow. [reservas.service.ts](src/services/supabase/portal/reservas.service.ts)'s `create()` maps this to a new `BookingRejectionCode` the same way it already maps `FORMULARIO_CAMPOS_FALTANTES`.

---

## Database Changes

New migration: `supabase/migrations/{timestamp}_formulario_plantilla_perfil_requerido.sql`

```sql
-- =============================================
-- Migration: Profile data requirements on form templates
-- US-0095: Request profile fields from a form template + enforce completeness on fill-out
-- =============================================

-- 1. New column: which profile fields this template requests
alter table public.formularios_plantillas
  add column if not exists perfil_campos_requeridos text[] not null default '{}';

-- 2. Constrain to the known catalog
alter table public.formularios_plantillas
  add constraint formularios_plantillas_perfil_campos_ck
    check (
      perfil_campos_requeridos <@ array[
        'nombre', 'apellido', 'telefono', 'fecha_nacimiento',
        'tipo_identificacion', 'fecha_exp_identificacion', 'rh',
        'peso_kg', 'altura_cm'
      ]::text[]
    );

-- No RLS changes: perfil_campos_requeridos is just another column on formularios_plantillas,
-- already covered by the existing select_authenticated / insert|update|delete_admin_only
-- policies from 20260721161036_formularios_plantillas.sql.

-- 3. Extend book_and_deduct_service_units: reject the booking server-side when the
--    athlete's profile is missing a field the attached template requires.
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
  v_perfil_reqs  text[];
  v_missing_keys text[];
  v_usuario      record;
  v_deportivo    record;
begin
  -- ── Profile completeness gate ───────────────────────────────────────────────
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
    end if;
  end if;

  -- ── Formulario respuesta: validate required "datos" fields, then insert ──── (unchanged, US-0087)
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
      tenant_id, formulario_plantilla_id, atleta_id, entrenamiento_id, respuesta, campos_snapshot
    ) values (
      p_tenant_id, p_formulario_plantilla_id, p_atleta_id, p_entrenamiento_id, p_formulario_respuesta, v_snapshot
    )
    returning id into v_respuesta_id;
  end if;

  -- (rest of the function body — deductions pass 1, reservation insert, deductions
  --  pass 2 — is UNCHANGED from 20260723000100_formulario_respuestas.sql)
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
- `perfil_campos_requeridos` uses `tipo_identificacion` as the single catalog key representing the "Identificación" pair (`tipo_identificacion` + `numero_identificacion`); the RPC check above validates both underlying columns for that one key.
- No changes to `formulario_plantilla_esquema` or `formulario_respuestas` — this feature is orthogonal to "datos" sections.
- No RLS changes required: `usuarios` and `perfil_deportivo` already carry catalog-style `select ... using (true)` policies (see [20260221000100_migracion_inicial_bd.sql:474-487](supabase/migrations/20260221000100_migracion_inicial_bd.sql)), so any authenticated user (including an admin booking on behalf of an athlete) can already read the target athlete's profile fields for the summary/gate. The RPC itself runs `security definer` regardless.

---

## API / Server Actions

| File | Function | Change |
|------|----------|--------|
| `src/services/supabase/portal/formularios.service.ts` | `getPlantillaConSecciones`, `getPlantillasByTenant` (or equivalent list query), `createPlantilla`, `updatePlantilla` | Select/accept `perfil_campos_requeridos` alongside existing columns |
| `src/services/supabase/portal/perfil.service.ts` | `getPerfil(userId)` | No signature change — already accepts an arbitrary `userId`, reused as-is to fetch the booking athlete's profile (not just "own") |
| `src/services/supabase/portal/reservas.service.ts` | `create()` | Add `error.message?.includes('PERFIL_INCOMPLETO')` branch mapping to a new `BookingRejectionCode`, mirroring the existing `FORMULARIO_CAMPOS_FALTANTES` branch (around [reservas.service.ts:878](src/services/supabase/portal/reservas.service.ts)) |
| Supabase RPC | `book_and_deduct_service_units` | Extended per SQL above — new `PERFIL_INCOMPLETO` exception path, no signature change |

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_formulario_plantilla_perfil_requerido.sql` | New column + check constraint + RPC redefinition |
| Types | `src/types/portal/formularios.types.ts` | Add `FormularioPerfilCampo` union, `FORMULARIO_PERFIL_CAMPOS` catalog (key/label/table), add `perfil_campos_requeridos` to `FormularioPlantilla` + `UpdatePlantillaInput` |
| Types | `src/types/portal/entrenamiento-restricciones.types.ts` | Add `'PERFIL_INCOMPLETO'` to `BookingRejectionCode` |
| Service | `src/services/supabase/portal/formularios.service.ts` | Include `perfil_campos_requeridos` in relevant selects/updates |
| Service | `src/services/supabase/portal/reservas.service.ts` | Map `PERFIL_INCOMPLETO` RPC error to `BookingRejection` |
| Hook | `src/hooks/portal/formularios/useFormularioEditor.ts` | Ensure `updatePlantillaField` passes through `perfil_campos_requeridos` |
| Hook | `src/hooks/portal/entrenamientos/reservas/useFormularioRespuestaForm.ts` | Fetch athlete profile when plantilla has `perfil_campos_requeridos`; expose `perfilResumen`, `perfilFaltantes`, `refetchPerfil`; `validate()` fails when fields are missing |
| Component | `src/components/portal/formularios/FormularioEditorPage.tsx` | New "Datos de perfil requeridos" checkbox grid section |
| Component | `src/components/portal/formularios/FormularioPreviewModal.tsx` | Read-only chip list of requested profile fields |
| Component | `src/components/portal/entrenamientos/reservas/FormularioRespuestaModal.tsx` | Profile summary strip / incomplete-profile warning panel + submit-button gating |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx` | No direct change expected — inherits the behavior via the shared hook/component; verify during implementation |

---

## Acceptance Criteria

1. An admin editing a form template in `FormularioEditorPage` sees a checkbox for each of the 9 catalog fields (grouped as "Datos personales" and "Datos deportivos"); checking/unchecking one persists immediately (auto-save, same as the "Plantilla activa" toggle) with no separate "Save" button.
2. `formularios_plantillas.perfil_campos_requeridos` only ever contains values from the fixed catalog; attempting to write an unknown value via any path is rejected by the DB check constraint.
3. Opening `FormularioPreviewModal` for a template with requested profile fields shows a read-only list/chips of those fields near the top; a template with none shows nothing extra.
4. When an athlete opens the fill-out form for a training whose attached template requests profile fields AND their profile already has all of them, a single compact read-only summary line appears above the form sections showing those values (no editable inputs for them).
5. When one or more requested fields are missing from the athlete's profile, the summary line is replaced by a warning panel naming exactly the missing fields, with an "Actualizar perfil" link to `/portal/perfil` (opens in a new tab) and a "Ya actualicé, verificar de nuevo" action that re-checks without losing any already-entered "datos" section answers.
6. The "Guardar y reservar" submit button is disabled while any requested profile field is missing; it becomes enabled automatically after "Ya actualicé, verificar de nuevo" confirms the profile is now complete.
7. If a booking request reaches `book_and_deduct_service_units` with a still-incomplete profile (e.g., client check bypassed or profile changed between load and submit), the RPC raises `PERFIL_INCOMPLETO`, no reservation or `formulario_respuestas` row is created, and the client surfaces a clear rejection message (via the new `BookingRejectionCode`).
8. Templates with an empty `perfil_campos_requeridos` (the default for every existing template) behave exactly as before — no summary, no gate, no RPC check triggered.
9. The same behavior (summary + gate) is verified in BOTH the tenant-scoped `ReservasPanel` booking flow and the cross-tenant `PublicTrainingReservaModal` marketplace booking flow, since both share `useFormularioRespuestaForm`/`FormularioRespuestaModal`.
10. An admin booking on behalf of an athlete (self-service disabled, `showAtletaPicker`) sees the summary/gate computed against the SELECTED athlete's profile, not the admin's own.
11. `formulario_externo` (external link) trainings are unaffected — the profile-requirements feature only applies to `formulario_id` (internal plantilla) attachments.

---

## Implementation Steps

- [ ] Create migration adding `perfil_campos_requeridos` + check constraint + redefine `book_and_deduct_service_units` with the profile-completeness gate
- [ ] Apply migration locally and confirm `supabase db diff`/`db reset` is clean
- [ ] Add `FormularioPerfilCampo` type + `FORMULARIO_PERFIL_CAMPOS` catalog + extend `FormularioPlantilla`/`UpdatePlantillaInput` in `formularios.types.ts`
- [ ] Add `'PERFIL_INCOMPLETO'` to `BookingRejectionCode`
- [ ] Update `formularios.service.ts` selects/updates to carry `perfil_campos_requeridos`
- [ ] Update `reservas.service.ts` `create()` to map the new RPC error
- [ ] Add the checkbox grid section to `FormularioEditorPage.tsx`, wired through `updatePlantillaField`
- [ ] Add the requested-fields chip list to `FormularioPreviewModal.tsx`
- [ ] Extend `useFormularioRespuestaForm.ts` to fetch the target athlete's profile and compute `perfilResumen`/`perfilFaltantes`
- [ ] Add the summary strip / warning panel / submit gating to `FormularioRespuestaModal.tsx`
- [ ] Manually verify `PublicTrainingReservaModal` picks up the behavior with no changes, or patch it if the composition hook (`usePublicTrainingReserva.ts`) needs to forward new fields
- [ ] Test manually: template with no profile requirements (no regression), template with requirements + complete profile (summary shown), template with requirements + incomplete profile (gate blocks submit, link works, re-check unblocks), admin booking on behalf of an athlete with an incomplete profile, RPC-level rejection when bypassing the client check (e.g., via direct RPC call)
- [ ] Update `projectspec/03-project-structure.md` annotations for the touched files (per repo convention of inline `(US-00NN)` notes)

---

## Non-Functional Requirements

- **Security**: Enforcement must not be client-only — the RPC-level `PERFIL_INCOMPLETO` check is mandatory since `formularios_plantillas`/`usuarios`/`perfil_deportivo` are all readable by any authenticated user, so a modified client could otherwise submit an incomplete-profile booking. RLS is unaffected (reads already permissive via existing catalog-style policies).
- **Performance**: The profile fetch in `useFormularioRespuestaForm` only runs when `perfil_campos_requeridos` is non-empty, and only requests the two rows (`usuarios`, `perfil_deportivo`) already keyed by primary key/unique index — no new indexes needed.
- **Accessibility**: Checkbox grid in `FormularioEditorPage` uses proper `<label>`/`<input type="checkbox">` pairing (matching the existing "Plantilla activa" toggle). The warning panel uses `role="alert"` consistent with other error panels in the codebase (e.g., `FormularioFormModal`'s `fieldError` block).
- **Error handling**: Missing-field state is surfaced inline in the modal (not a toast), consistent with existing `loadError`/`submitError` patterns in `FormularioRespuestaModal`. RPC failures fall back to the generic `mapServiceError` path if the error message doesn't match a known code, same as today.
