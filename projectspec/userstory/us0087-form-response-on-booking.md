# US-0087 — Fill Out the Attached Form to Complete a Booking

## ID
US-0087

## Name
Capture Structured Form Responses (`formulario_respuestas`) at Booking Time and Link Them to the Reservation

## As a
Athlete booking a training (self-service), or an administrador/entrenador booking on behalf of an athlete

## I Want
To fill out the internal form template attached to a training (US-0086's `formulario_id`) directly inside the booking flow — right before the reservation is created — and have my answers persisted and linked to that specific reservation

## So That
Organizations can actually collect the structured data their form templates (US-0084/US-0085) were built for (medical waivers, check-in surveys, equipment sign-off, etc.) at the moment it matters — booking — instead of the module only producing templates nobody ever fills out, and staff can later review what an athlete answered for a given reservation

---

## Description

### Current State — validated against US-0084, US-0085, US-0086

All three prerequisite user stories are **fully implemented in the codebase today** (verified by reading the current migrations and source, not just their spec files):

- **US-0084 / US-0085 (form templates)**: `public.formularios_plantillas` + `public.formulario_plantilla_esquema` exist (`supabase/migrations/20260721161036_formularios_plantillas.sql`, `20260721223051_formulario_esquema_secciones.sql`). Each `formulario_plantilla_esquema` row is a "sección" with `seccion_tipo` (`titulo | subtitulo | texto | datos`); only `datos` rows carry real field-definition columns (`campo_etiqueta`, `campo_nombre`, `campo_tipo`, `campo_lista_valores`, `campo_obligatorio`, `campo_placeholder`). `campo_tipo` is one of `fecha | texto_corto | texto_largo | numerico | imagen | lista`. `formulariosService.getPlantillaConSecciones(id)` returns a template with its ordered sections; `FormularioPreviewModal` + `FormularioSeccionContent` + `FormularioCampoPreviewInput` render them read-only with **disabled** inputs — there is still no fillable rendering anywhere in the app.
- **US-0086 (attach to training)**: `entrenamientos`/`entrenamientos_grupo` already carry `formulario_id` (FK to `formularios_plantillas`), `formulario_obligatorio` (boolean), and `formulario_externo` (pre-existing URL column), all mutually-exclusive-enforced by check constraints (`supabase/migrations/20260722010000_entrenamientos_formulario_plantilla.sql`). `entrenamientos.service.ts`'s select/insert/update payloads and `mapTrainingGroup`/`mapTrainingInstance` already read/write all three fields, and `TrainingInstance`/`TrainingGroup` (`entrenamientos.types.ts`) already expose them, including an embedded `formulario_plantilla: { nombre }`. **No further backend work is needed to "add these columns when creating/editing trainings" — that part of this request is already done.** `ReservasPanel.tsx` (lines 384–418) already shows the external link or the internal template's name, an "Obligatorio" badge, and a "Ver formulario" button that opens the existing read-only `FormularioPreviewModal` — but, exactly as US-0086 scoped it, this is **purely informational**: the "Reservar" button is never gated on anything related to the form.
- **What is genuinely missing** (the gap this US closes): there is no `formulario_respuestas` table, no way to actually fill out a `datos` section with real input, and the booking flow (`ReservaFormModal` → `useReservaForm` → `useReservas` → `reservasService.create()` → `book_and_deduct_service_units` RPC) has no concept of a form response at all.

### Proposed Changes

#### 1. Data model
- New table **`public.formulario_respuestas`**: one row per submitted answer set — `id`, `tenant_id`, `formulario_plantilla_id` (FK, nullable, `on delete set null` — an admin must always be able to delete a template, even a used one, and the response must survive that; see Notes below), `atleta_id` (FK), `entrenamiento_id` (FK, denormalized from the booking for simple reporting without joining through `reservas`), `respuesta` (`jsonb`, keyed by each `datos` section's `campo_nombre`), `campos_snapshot` (`jsonb`, `{ [campo_nombre]: { etiqueta, tipo, orden } }` for every active `datos` section **as it existed at submission time** — since template deletion cascades to `formulario_plantilla_esquema` per US-0084, this snapshot is what keeps "Ver respuesta" readable after the template is edited or gone), `created_at`.
- New column **`public.reservas.formulario_respuesta_id`** (nullable `uuid`, FK to `formulario_respuestas.id`, `on delete set null`, `unique` — one response belongs to at most one reservation).
- The **existing** `book_and_deduct_service_units` RPC (defined in `20260625000100_validar_suscripcion_activa_en_reserva.sql`) is extended (via `create or replace function`, same name, two new trailing optional params) to, atomically in the same transaction as the reservation insert: **(a)** server-side validate that every active `datos` section marked `campo_obligatorio = true` has a non-empty value in the submitted JSON — raising `FORMULARIO_CAMPOS_FALTANTES` if not — **(b)** build `campos_snapshot` from the template's current `formulario_plantilla_esquema` rows and insert the `formulario_respuestas` row — **(c)** insert the `reservas` row with `formulario_respuesta_id` pointing at it. This guarantees a response can never exist without its paired reservation, and vice versa, without a two-step client-side write race.
- `formulario_obligatorio` remains **purely informational / client-gated**, exactly as US-0086 already decided — it is intentionally **not** enforced at the DB layer here either, because (per the design decisions below) staff bookings are always allowed to skip the form regardless of this flag. The DB only ever validates the *shape* of a response that **is** submitted (required fields present), never whether a response exists at all.

#### 2. Design decisions (confirmed with the requester before writing this spec)
1. **Scope of the fill-form step**: applies whenever the training's `formulario_tipo` is **`interno`** (i.e., `formulario_id` is set) — regardless of `formulario_obligatorio`. `formulario_externo` (the URL case) is untouched: it keeps showing as a link + informational note only, with no fill modal, since there's no internal schema to render for it.
2. **Self-booking (athlete) with `formulario_obligatorio = true`**: the fill-form modal has **no skip option** — the athlete must complete all `campo_obligatorio` fields before "Reservar" succeeds.
3. **Self-booking with `formulario_obligatorio = false`**, and **any staff-created booking** (admin/entrenador using "Nueva reserva" in `ReservasPanel`, regardless of the flag): the fill-form modal always offers a **"Reservar sin formulario"** secondary action that skips straight to booking with `formulario_respuesta_id = null`. This mirrors the existing precedent where admin/entrenador bookings already bypass other restrictions (`bypass_restrictions`).
4. **`campo_tipo = 'imagen'` fields are supported now**, not deferred: the fill modal uploads the file to Supabase Storage (`org-assets` bucket, new path segment) immediately on selection and stores the resulting **storage path** (not a signed URL — signed URLs expire) as that field's string value in the `respuesta` JSON.
5. **A basic read-only "Ver respuesta" viewer is included** for admin/entrenador, rendering answers from the response's own `campos_snapshot` (not by re-fetching the live template), so the captured data isn't otherwise unreachable from the UI and stays legible even after the template is edited or deleted.
6. **Template deletion is never blocked by response history.** An admin can delete a `formularios_plantillas` row regardless of how many `formulario_respuestas` reference it — those rows survive with `formulario_plantilla_id` nulled out; `campos_snapshot` is what keeps them displayable afterward.

#### 3. Booking flow — `ReservasPanel` / `ReservaFormModal` / `useReservaForm` / `useReservas`
Today, clicking "Reservar" (self-book, `handleSelfBook`, `ReservasPanel.tsx:200-204`) or "Nueva reserva" (staff, `handleAdminCreate`, `ReservasPanel.tsx:206-209`) opens `ReservaFormModal` directly; its submit button calls `reservaForm.submitCreate()` (or `submitUpdate` in edit mode), which builds a `CreateReservaInput` and calls `onCreateReserva` → `reservasHook.createReserva` → `reservasService.create()` → the RPC.

This becomes a **two-step modal flow** whenever `instance.formulario_id` is set:

- **Step 1 — unchanged `ReservaFormModal`**, plus a new banner (reusing the existing `formulario_obligatorio` note style already in `ReservasPanel.tsx:416-418`, now rendered *inside* the modal too) telling the user a form is attached and whether it's required. Submitting this modal **no longer calls `submitCreate` directly** when a template is attached — it runs the same field validation it already runs (`useReservaForm`'s existing `validate()`, renamed/exposed as `validateBase()` so it can be called standalone), and if valid, **closes `ReservaFormModal` and opens the new `FormularioRespuestaModal`** instead of submitting.
- **Step 2 — new `FormularioRespuestaModal`**: loads the attached template's sections (`formulariosService.getPlantillaConSecciones(instance.formulario_id)`), renders `titulo`/`subtitulo`/`texto` sections as static content (same visual treatment as `FormularioSeccionContent`) and `datos` sections as **real, editable inputs** (new component, since `FormularioCampoPreviewInput` is intentionally disabled/read-only and cannot be reused as-is):
  - `texto_corto` → text input, `texto_largo` → textarea, `numerico` → number input, `fecha` → date input, `lista` → select populated from `campo_lista_valores`, `imagen` → file input that uploads immediately on selection.
  - Client-side validates every `campo_obligatorio = true` `datos` field has a non-empty value before allowing "Guardar y reservar" to submit (mirrors the DB-side check, so the common case never round-trips to see the server error).
  - **"Guardar y reservar"**: builds the `respuesta` object (`{ [campo_nombre]: value }`) and calls `useReservaForm`'s `submitCreate` with the new optional payload `{ formulario_plantilla_id, formulario_respuesta }`, which merges it into the `CreateReservaInput` before calling `onCreateReserva`.
  - **"Reservar sin formulario"** (rendered per decision #3 above): calls `submitCreate()` with no formulario payload — behaves exactly like today's booking flow, `formulario_respuesta_id` stays `null`.
  - If the RPC/service rejects with `FORMULARIO_CAMPOS_FALTANTES` (a race — e.g., an admin deactivated a required field between load and submit) the modal stays open and shows the friendly inline error instead of crashing.
- **Admin "no units" confirmation interplay**: `useReservas`'s existing `pendingBookingInputRef` (`useReservas.ts:71`) already stores the *entire* enriched `CreateReservaInput` before the confirmation round-trip (`useReservas.ts:137-140`) — since `formulario_plantilla_id`/`formulario_respuesta` are now just additional fields on that same input, `confirmAdminBooking()` (`useReservas.ts:155-178`) automatically replays them with zero changes needed to that function. `ReservasPanel` only needs to: when `reservasHook.adminConfirmPending` flips `true` while `FormularioRespuestaModal` is open, close it and reopen `ReservaFormModal` (which already renders the `adminConfirmPending` branch, `ReservaFormModal.tsx:414-438`) so the existing confirm/cancel UI is reused as-is.
- If `instance.formulario_id` is **not** set (tipo `ninguno` or `externo`), the flow is **byte-for-byte unchanged** from today — no second modal, no new state touched.

#### 4. Viewing a submitted response
A new **"Ver respuesta"** action (icon button, only rendered when `reserva.formulario_respuesta_id` is set) is added to each reservation row in `ReservasPanel.tsx`'s reservation list, visible to admin/entrenador and to the athlete on their own row. It opens a new read-only `FormularioRespuestaViewerModal`: fetches the response (`formulariosService.getRespuestaById`) and builds its display list **directly from `respuesta` joined with `campos_snapshot`** — it does **not** re-fetch the live template's sections to determine labels/types, so the viewer renders identically whether the template still exists unchanged, was edited since submission, or was deleted entirely. The template's *current* `nombre` is fetched only as a cosmetic header (best-effort; falls back to "Formulario eliminado" if the template is gone). For `imagen` fields, the stored path is resolved into a signed URL (`storageService.getSignedUrl`) and shown as a thumbnail/link, matching the existing comprobante-viewer pattern (`useComprobanteViewer.ts`). One trade-off: since `campos_snapshot` only captures `datos` fields, the viewer no longer re-renders the template's `titulo`/`subtitulo`/`texto` headings — it's a flat list of answered questions, not a full form replay.

#### Out of Scope
- Editing or re-submitting a response after the reservation is created.
- Any change to `formulario_externo` behavior (link + note only, unchanged).
- Deleting a `formulario_respuestas` row from the UI (no delete policy/action — historical data is kept; see Non-Functional Requirements).
- Enforcing `formulario_obligatorio` at the database layer (still purely informational/client-gated, per decision #3 — staff can always skip).

---

## Database Changes

New migration file: `supabase/migrations/{timestamp}_formulario_respuestas.sql`

```sql
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
```

New migration file: `supabase/migrations/{timestamp}_formulario_respuestas_storage.sql`

```sql
-- =============================================
-- Migration: Storage policies for form-response image uploads
-- US-0087: reuse the existing org-assets bucket, new "formularios" path segment
-- =============================================

-- Athlete: upload an image for their own form response
drop policy if exists athlete_upload_own_formulario_respuestas on storage.objects;
create policy athlete_upload_own_formulario_respuestas on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[4] = auth.uid()::text
    and (storage.foldername(name))[5] = 'formularios'
    and exists (
      select 1 from public.miembros_tenant mt
      where mt.usuario_id = auth.uid()
        and mt.tenant_id = ((storage.foldername(name))[2])::uuid
        and mt.estado = 'activo'
    )
  );

-- Staff (administrador/entrenador): upload an image on behalf of an athlete they're booking for
drop policy if exists staff_upload_formulario_respuestas_on_behalf on storage.objects;
create policy staff_upload_formulario_respuestas_on_behalf on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[5] = 'formularios'
    and exists (
      select 1
      from public.miembros_tenant mt
      join public.roles r on r.id = mt.rol_id
      where mt.usuario_id = auth.uid()
        and mt.tenant_id = ((storage.foldername(name))[2])::uuid
        and mt.estado = 'activo'
        and lower(r.nombre) in ('administrador', 'entrenador')
    )
  );

-- No new SELECT policy needed: the existing org_member_read policy
-- (20260324000100_create_org_assets_bucket.sql) already lets any active member of the
-- tenant read any file under orgs/{tenantId}/..., which covers this new path too.
```

**Notes / flagged trade-offs**:
- `formulario_respuestas.formulario_plantilla_id` uses `on delete set null` (same posture as `entrenamientos.formulario_id`): US-0084's "delete is always a hard delete" behavior is preserved with **zero exceptions** — an admin can delete any template at any time, even one with submitted responses. What protects the response's readability isn't blocking the delete, it's `campos_snapshot`: a copy of each field's `etiqueta`/`tipo`/`orden` taken at submission time, stored on the response row itself. Once the template (and its cascaded `formulario_plantilla_esquema` rows) is gone, the response no longer has a live label source to fall back on — `campos_snapshot` *is* that source, permanently.
- `formulario_obligatorio` is **not** enforced by any new check constraint — see design decision #3. The DB only validates the shape of a response that is actually submitted.
- The storage path for a form-response image is `orgs/{tenantId}/users/{atletaId}/formularios/{formularioPlantillaId}/{campoNombre}-{timestamp}.{ext}` — note the folder is always the **athlete's own** user id (`atletaId`), even when a staff member uploads it on their behalf, so the existing `org_member_read` SELECT policy and per-athlete storage quota reasoning stay consistent with the existing receipts pattern.
- Run `supabase db reset` (or the local equivalent) to confirm both migrations apply cleanly on top of `20260722010000_entrenamientos_formulario_plantilla.sql` and `20260324000100_create_org_assets_bucket.sql`.

---

## API / Server Actions

**File**: `src/services/supabase/portal/formularios.service.ts` (extended)

| Function | Params | Returns | Notes |
|---|---|---|---|
| `getRespuestaById` | `id: string` | `FormularioRespuesta \| null` | RLS-gated: admin/entrenador of the tenant, or the athlete who owns the response |

**File**: `src/services/supabase/portal/reservas.service.ts` (extended)

| Function | Change |
|---|---|
| `create` | Threads `p_formulario_plantilla_id: input.formulario_plantilla_id ?? null` and `p_formulario_respuesta: input.formulario_respuesta ?? null` into the existing `book_and_deduct_service_units` RPC call (`reservas.service.ts:849-856`); catches the new `FORMULARIO_CAMPOS_FALTANTES` Postgres `P0001` error (same pattern as the existing `SUSCRIPCION_INACTIVA`/`UNIDADES_AGOTADAS` catches, `reservas.service.ts:858-873`) and returns `{ ok: false, code: 'FORMULARIO_CAMPOS_FALTANTES', message: 'Faltan campos obligatorios del formulario.' }` |

**File**: `src/services/supabase/portal/storage.service.ts` (extended)

| Function | Params | Returns | Notes |
|---|---|---|---|
| `uploadFormularioRespuestaImage` | `supabase, tenantId, atletaId, formularioPlantillaId, campoNombre, file` | `StorageUploadResult` | Uploads to `buildFormularioRespuestaFilePath(...)`; mirrors `uploadPaymentProof` |

All operations remain direct Supabase-client calls from the service layer — no new API routes. Auth/RLS: `formulario_respuestas` writes only ever happen through the `book_and_deduct_service_units` RPC (`SECURITY DEFINER`, bypasses RLS); reads are gated by the new `formulario_respuestas_select_staff_or_owner` policy.

---

## Files to Create or Modify

| Area | File | Change |
|---|---|---|
| Migration | `supabase/migrations/{timestamp}_formulario_respuestas.sql` | New table, column, RLS, extended RPC (see SQL above) |
| Migration | `supabase/migrations/{timestamp}_formulario_respuestas_storage.sql` | New storage RLS policies for the `formularios` path segment |
| Types | `src/types/portal/reservas.types.ts` | Add `formulario_respuesta_id: string \| null` to `Reserva`; add `formulario_plantilla_id?: string \| null` and `formulario_respuesta?: Record<string, string> \| null` to `CreateReservaInput`; add `'formulario_campos_faltantes'` to `ReservaServiceErrorCode` |
| Types | `src/types/portal/entrenamiento-restricciones.types.ts` | Add `'FORMULARIO_CAMPOS_FALTANTES'` to `BookingRejectionCode` |
| Types | `src/types/portal/formularios.types.ts` | Add `FormularioRespuesta` type (`id, tenant_id, formulario_plantilla_id: string \| null, atleta_id, entrenamiento_id, respuesta: Record<string, string>, campos_snapshot: Record<string, { etiqueta, tipo, orden }>, created_at`) |
| Types | `src/types/portal/storage.types.ts` | Add `buildFormularioRespuestaFilePath(tenantId, atletaId, formularioPlantillaId, campoNombre, ext)` |
| Service | `src/services/supabase/portal/formularios.service.ts` | Add `getRespuestaById` |
| Service | `src/services/supabase/portal/reservas.service.ts` | Extend `create()` per API table above |
| Service | `src/services/supabase/portal/storage.service.ts` | Add `uploadFormularioRespuestaImage` |
| Hook | `src/hooks/portal/entrenamientos/reservas/useReservaForm.ts` | Expose `validateBase()` (extracted from existing `validate()`); extend `submitCreate` to accept an optional `{ formulario_plantilla_id, formulario_respuesta }` payload merged into the built `CreateReservaInput` |
| Hook | `src/hooks/portal/entrenamientos/reservas/useFormularioRespuestaForm.ts` | **New** — loads `getPlantillaConSecciones(formularioId)`; holds `values: Record<string, string>` keyed by `campo_nombre`, per-field errors, per-field upload-in-progress state; `updateValue`, `uploadImage`, `validate()` (checks every active `campo_obligatorio` `datos` section has a non-empty value), `buildRespuesta()` |
| Component | `src/components/portal/entrenamientos/reservas/FormularioRespuestaModal.tsx` | **New** — step-2 fill-out modal described in Proposed Changes §3; renders editable inputs per `campo_tipo`; "Guardar y reservar" + conditional "Reservar sin formulario" |
| Component | `src/components/portal/entrenamientos/reservas/FormularioRespuestaViewerModal.tsx` | **New** — read-only "Ver respuesta" modal described in §4; renders purely from `campos_snapshot` + `respuesta`, no live template fetch for labels |
| Component | `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx` | Add a "Formulario adjunto" banner (name + obligatorio/opcional); when a template is attached, submit no longer calls `onSubmit` directly — it signals the parent to open the fill-out step instead (new prop, e.g. `onRequireFormulario: () => void`, used instead of `onSubmit` when `hasFormularioInterno` is true) |
| Component | `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` | New state for the fill-out/viewer modals; wires the two-step flow and the admin-confirm interplay described in §3; adds the "Ver respuesta" row action described in §4 |
| Component | `src/components/portal/formularios/FormularioSeccionContent.tsx` | No changes — reused as-is for the static (`titulo`/`subtitulo`/`texto`) sections inside the new fill-out modal |

---

## Acceptance Criteria

1. Self-booking a training whose `formulario_tipo` is `ninguno` or `externo` behaves exactly as before this US: a single `ReservaFormModal` step, no fill-out modal, `formulario_respuesta_id` stays `null`.
2. Self-booking a training with an internal template and `formulario_obligatorio = true`: after submitting `ReservaFormModal`, a fill-out modal opens showing the template's sections; the reservation is only created once every `campo_obligatorio` `datos` field has a value; there is **no** way to skip the form in this case.
3. Self-booking a training with an internal template and `formulario_obligatorio = false`: the same fill-out modal opens, but a "Reservar sin formulario" action is visible and, when clicked, creates the reservation immediately with `formulario_respuesta_id = null`.
4. Staff (`administrador`/`entrenador`) creating a booking on behalf of an athlete for a training with an internal template always sees the fill-out modal with the "Reservar sin formulario" skip option available, **regardless of `formulario_obligatorio`**.
5. Submitting the fill-out modal persists a `formulario_respuestas` row (`tenant_id`, `formulario_plantilla_id`, `atleta_id`, `entrenamiento_id`, `respuesta` keyed by each field's `campo_nombre`, `campos_snapshot` keyed by the same `campo_nombre`s with each field's `etiqueta`/`tipo`/`orden`) and the created `reservas` row's `formulario_respuesta_id` points at it — verified directly in SQL and via the reservation list after booking.
6. A `datos` field of type `imagen`, when a file is selected, uploads immediately to `org-assets` at `orgs/{tenantId}/users/{atletaId}/formularios/{formularioPlantillaId}/{campoNombre}-{timestamp}.{ext}`; the resulting storage path (not a signed URL) is what gets stored in the `respuesta` JSON for that field.
7. Attempting to submit the fill-out modal with a required `datos` field empty is blocked client-side with an inline error and never reaches the server.
8. A direct SQL insert into `formulario_respuestas` bypassing the RPC, or a direct client-side `insert` call against the table, is rejected — the table has no `INSERT` policy for `authenticated` (writes only succeed via the `SECURITY DEFINER` RPC).
9. A direct SQL call to `book_and_deduct_service_units` with `p_formulario_plantilla_id` set and `p_formulario_respuesta` missing a value for a `campo_obligatorio = true` field raises `FORMULARIO_CAMPOS_FALTANTES`; the TS service layer maps this to a friendly, non-crashing inline error in the fill-out modal.
10. Reading a `formulario_respuestas` row as: (a) the athlete who owns it — succeeds; (b) an admin/entrenador of the same tenant — succeeds; (c) any other authenticated user (different tenant, different athlete, non-staff) — RLS denies the read.
11. "Ver respuesta" is visible on a reservation row only when `formulario_respuesta_id` is set, for admin/entrenador on any row and for an athlete on their own row; clicking it opens a read-only modal listing each answered field's label and value (sourced from `campos_snapshot`, not the live template), with `imagen` fields rendered as a thumbnail/link resolved via a signed URL.
12. When the admin "no units, confirm anyway" flow is triggered (`ADMIN_CONFIRM_NO_UNITS`) after a staff booking submitted a filled-out form, confirming the booking still creates the `formulario_respuestas` row and links it correctly — the previously-collected answers are not lost or resubmitted empty.
13. Deleting a `formularios_plantillas` row that has one or more `formulario_respuestas` referencing it **succeeds** (per US-0084's existing hard-delete behavior, with zero new exceptions); every referencing response row survives with `formulario_plantilla_id` set to `null`, and "Ver respuesta" for that response still renders correctly (fallback name "Formulario eliminado", fields labeled from `campos_snapshot`).
14. No regression in `formulario_externo`-only trainings, in bookings for trainings with no form at all, or in the existing admin "no units" confirmation flow for trainings with restrictions but no attached form.
15. No existing menu item, route, or admin/booking page regresses — verified by loading `gestion-formularios`, `gestion-entrenamientos`, and booking (self and staff) for a training with each of the three `formulario_tipo` states.

---

## Implementation Steps

- [ ] Write and apply both migrations (`formulario_respuestas` table + RLS + extended RPC; storage policies); run `supabase db reset` (or equivalent) to verify they apply cleanly on top of `20260722010000_entrenamientos_formulario_plantilla.sql` and `20260324000100_create_org_assets_bucket.sql`
- [ ] Update `reservas.types.ts`, `entrenamiento-restricciones.types.ts`, `formularios.types.ts`, `storage.types.ts` per the Files table
- [ ] Extend `reservas.service.ts`'s `create()` and `storage.service.ts` (`uploadFormularioRespuestaImage`); add `formularios.service.ts`'s `getRespuestaById`
- [ ] Extend `useReservaForm.ts` (`validateBase`, `submitCreate` payload); add `useFormularioRespuestaForm.ts`
- [ ] Build `FormularioRespuestaModal.tsx` (editable per-`campo_tipo` inputs, image upload wiring, skip action) and `FormularioRespuestaViewerModal.tsx`
- [ ] Wire the two-step flow, the "Ver respuesta" row action, and the admin-confirm interplay into `ReservaFormModal.tsx` / `ReservasPanel.tsx`
- [ ] Test manually: self-book with obligatorio (no skip, required-field validation), self-book without obligatorio (skip works), staff-book with and without obligatorio (skip always works), imagen field upload end-to-end, "Ver respuesta" viewer for admin/entrenador/own-athlete, RLS denial for a different tenant/athlete, `FORMULARIO_CAMPOS_FALTANTES` direct-SQL rejection, admin "no units" confirm flow with a filled form, attempted delete of a referenced template
- [ ] Confirm no regressions in `formulario_externo`-only and no-form bookings, and in sibling pages (`gestion-formularios`, `gestion-entrenamientos`, `gestion-reservas`, `mis-reservas`)

---

## Non-Functional Requirements

- **Security**: `formulario_respuestas` writes are exclusively channeled through the `SECURITY DEFINER` RPC — no `authenticated` role can insert/update/delete the table directly, closing off any client-side tampering with submitted answers. Reads are scoped to the owning athlete or tenant staff. Image uploads reuse the existing `org-assets` bucket's private, signed-URL-only access model — no publicly reachable file paths.
- **Performance**: New indexes on `formulario_respuestas.tenant_id/formulario_plantilla_id/atleta_id/entrenamiento_id` keep the viewer lookup and any future "all responses for this training" report fast. The extra required-fields validation query inside the RPC is a single indexed lookup against `formulario_plantilla_esquema` and only runs when a response is actually being submitted.
- **Accessibility**: The fill-out modal's inputs all carry associated `<label>`s and required-field markers, consistent with `FormularioCampoPreviewInput`'s existing labelling; the image input is keyboard-operable via the native file picker; the "Ver respuesta" viewer follows the same modal accessibility pattern as `FormularioPreviewModal` (focus-trapped, `Escape`-dismissible, `role="dialog"`).
- **Error handling**: Inline, field-level validation errors in the fill-out modal (mirroring `FormularioSeccionFieldErrors`'s pattern); `FORMULARIO_CAMPOS_FALTANTES` and any upload failure surface as friendly, non-crashing messages inside the modal, never a raw stack trace or unhandled promise rejection.
