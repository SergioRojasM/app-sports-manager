# US-0119 — Team Events Management (Phase 2: Create & Edit Wizard, Tickets, Coupons and Payment Methods)

## ID
US-0119

## Name
Team events module, phase 2 — full-page three-step wizard ("Configura tu evento" → "Configura tus entradas" → "Configura tus métodos de pago") to create and edit events. It adds the `evento_entradas` and `evento_entrada_cupones` tables and changes the `eventos` columns for disciplina, escenario, entrenadores, formulario and métodos de pago.

## As a
Tenant administrator

## I Want
To create a new team event, or edit an existing one, on a dedicated page with a stepper. In it I set up how the event page will look, then the ticket types, discount coupons and the access form, and finally which of my team's payment methods apply to the event.

## So That
The team can publish real events with sellable tickets and discounts. The management page from US-0118 stops being read-only, and the data is ready for the ticket-purchase phase.

---

## Description

### Current State
- US-0118 (phase 1) delivered the `eventos` table, `eventosService` (including the unused `createEvento` / `updateEvento`), and the `GestionEventosPage` with cards / list / calendar views, delete, and the `confirmado ⇄ cancelado` status change.
- "Nuevo evento" and "Editar" only open `EventoProximamenteModal` ("disponible próximamente") through the `onNuevo` / `onEditar` seams in `GestionEventosPage.tsx`.
- `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/nuevo/page.tsx` exists as an **empty, untracked placeholder** (0 bytes).
- `eventos.disciplina_id`, `escenario_id` and `entrenador_id` are `uuid` FKs, so they store one trainer only and cannot keep the event-specific details (for example a trainer's experience).
- Ticket options exist only as the flat `eventos.precio` jsonb array (`PrecioItem[]`). There is no validity window, no multi-event bundle, no coupon, no access form and no payment-method selection.

### Proposed Changes

#### Scope of this phase
| In scope | Out of scope (later phases) |
|----------|-----------------------------|
| `/gestion-eventos/nuevo` and `/gestion-eventos/[evento_id]/editar` full-page wizard | Ticket purchase flow, attendees, payments, coupon redemption |
| Column changes on `eventos` (disciplina / escenario / entrenadores snapshots, `formulario_id`, `metodos_pago`) | Public/member-facing event detail route and event marketplace |
| New tables `evento_entradas` and `evento_entrada_cupones` with RLS | Per-ticket capacity (quota per entrada type) |
| Atomic save RPC (event + tickets + coupons in one transaction), in draft or final mode | Blocking edits or deletes once tickets have been sold |
| "Guardar borrador" at any step (name only), with drafts hidden from non-staff | Autosave, and turning a published event back into a draft |
| Banner upload to storage | Trainer UI entry point (the route stays under `(administrador)`) |
| Wiring "Nuevo evento" / "Editar" in `GestionEventosPage`, removing `EventoProximamenteModal` | |

#### Data model decisions
1. **Snapshots instead of FKs (as requested).** The event keeps a copy of what the admin chose at save time. If the discipline, venue or trainer is later renamed, the event does not change. This is intended: the event page is a published document.
   - `disciplina_id` → `text`. It stores the discipline **name** (for example `"Running"`). The column name is kept as requested.
   - `escenario_id` → `jsonb` (nullable). It stores an `EventoEscenarioSnapshot` object (shape below).
   - `entrenador_id` → `jsonb not null default '[]'`. It stores an **array** of `EventoEntrenadorSnapshot` (zero or more trainers, each with an `experiencia` text).
2. **`formulario_id uuid null`**, FK to `formularios_plantillas(id) on delete set null`. This is the access form requested when buying tickets. It must belong to the same tenant (enforced by the RPC).
3. **`metodos_pago jsonb not null default '[]'`**: an array of `EventoMetodoPagoSnapshot` copied from `tenant_metodos_pago`.
4. **`eventos.precio` becomes derived.** The wizard no longer edits it. The save RPC rewrites it from the saved tickets (`[{ nombre, precio: valor, descripcion: null }]`, ordered by `orden`). The phase-1 card and table ("Gratis" / "Desde $X") keep working without a join.
5. **Tickets (`evento_entradas`)**: `tipo_entrada ∈ ('sencilla', 'multiple')`, stored lowercase and labelled "Sencilla" / "Múltiple" in the UI. A *Múltiple* ticket grants access to this event **plus** every event listed in `eventos_id_bundle` (a jsonb array of event uuids from the same tenant, never the event itself; at least one is required on final save, while a draft may have none yet). A *Sencilla* ticket always has `eventos_id_bundle = '[]'`. `valor = 0` means a free ticket; `valor = null` is allowed only while the event is a draft.
6. **Coupons (`evento_entrada_cupones`)**: `descuento` is a **percentage** (`numeric(5,2)`, `> 0` and `<= 100`). `cupon` is the code the buyer types: stored uppercase, `^[A-Z0-9_-]{3,30}$`, and unique per event across all of that event's tickets. Coupon rows are **not readable by members or anon** (the codes are secret); the purchase phase validates codes through a SECURITY DEFINER RPC.
7. **Validity windows** (`valida_desde` / `valida_hasta` on tickets, `valido_desde` / `valido_hasta` on coupons) are nullable `timestamptz`, with `desde < hasta` enforced when both are set. `null` means no bound.
8. **Drafts: save at any time, with only the name.** A new column `eventos.borrador boolean not null default false` marks an event as a work in progress. The admin can press **"Guardar borrador"** on any step; the only requirement is a non-empty `nombre`. Everything else typed so far is saved as-is, including incomplete tickets and coupons. This protects the admin's work (closed tab, lost connection, finishing later) without forcing the whole wizard to be completed in one sitting.
   - **Draft events are invisible outside the team's staff.** RLS hides `borrador = true` rows from `anon` and regular members, whatever `publico` / `activo` say, so a half-configured event never leaks and can never be purchased.
   - **Two save modes, one RPC.** `guardar_evento_completo(..., p_borrador)` always runs in a single transaction, so each save (draft or final) is all-or-nothing:
     - **Draft save** (`p_borrador = true`): validates only `nombre` plus **format** errors (a negative value, `desde >= hasta`, a malformed coupon code, a discount outside 1–100, a bundle id from another tenant). **Missing** data is allowed: no discipline, no tickets, a ticket without name or value, a Múltiple ticket with no bundled events yet, a coupon without code or discount, no payment methods.
     - **Final save** (`p_borrador = false`, the "Crear evento" / "Publicar evento" / "Guardar cambios" button): full validation of all three steps, as specified below. On success it sets `borrador = false`.
   - **One-way.** A published event (`borrador = false`) cannot go back to draft in this phase. Editing it offers only "Guardar cambios" with full validation, so a live event is never left incomplete. "Guardar borrador" appears only in create mode and when editing an event that is still a draft.
   - Row-level fields that may be missing in a draft (ticket `nombre` / `valor`, coupon `nombre` / `cupon` / `descuento`) are **nullable** in the tables. Their completeness is enforced by the RPC on final save. Format constraints stay as table `check`s, because they are always wrong.

#### Snapshot shapes (`src/types/portal/eventos.types.ts`)
```ts
export type EventoEscenarioSnapshot = {
  id: string;                 // escenarios.id at save time (informative, not an FK)
  nombre: string;
  tipo: string;
  ubicacion: string | null;
  direccion: string | null;
  coordenadas: string | null;
  capacidad: number | null;
  image_url: string | null;
};

export type EventoEntrenadorSnapshot = {
  id: string;                 // usuarios.id at save time
  nombre: string;             // trimmed "nombre apellido"
  experiencia: string;        // free text written by the admin for this event, max 500 chars, may be ''
};

export type EventoMetodoPagoSnapshot = {
  id: string;                 // tenant_metodos_pago.id at save time
  nombre: string;
  tipo: MetodoPagoTipo;
  valor: string | null;
  url: string | null;
  comentarios: string | null;
};
```

#### Routes
| Route | Mode |
|-------|------|
| `/portal/orgs/{tenantId}/gestion-eventos/nuevo` | Create (uses the existing placeholder) |
| `/portal/orgs/{tenantId}/gestion-eventos/{eventoId}/editar` | Edit |

Both are server pages under `(administrador)`, so the existing layout guard applies. They `await params` and render `<EventoWizardPage tenantId={...} eventoId={... | undefined} />`.

`GestionEventosPage` changes:
- `onNuevo` → `router.push('/portal/orgs/{tenantId}/gestion-eventos/nuevo')`.
- `onEditar(evento)` → `router.push('/portal/orgs/{tenantId}/gestion-eventos/{evento.id}/editar')`.
- The `'proximamente'` modal kind and `EventoProximamenteModal.tsx` are deleted.
- After a successful **final** save the wizard redirects to `/portal/orgs/{tenantId}/gestion-eventos?guardado=creado|editado`. The list page shows a dismissible success banner ("Evento creado correctamente." / "Evento actualizado correctamente."), then removes the query param with `router.replace` and keeps `?vista`.

A **draft** save never leaves the wizard (see *Draft save* below). The wizard keeps the current step in `?paso=1|2|3`, so after the first draft save of a new event it can move to the edit URL and reopen on the same step.

**Drafts in the management page (phase-1 views):**
- Draft events are listed together with the others, with a `GritTag` "Borrador" (icon `edit_note`) on cards, list rows and calendar chips (dashed outline).
- Missing data renders with the existing fallbacks: "Sin disciplina", "Fecha por definir", the placeholder banner, and "Precio por definir" when there are no complete tickets.
- The *Estado* filter gains a **"Borrador"** option. *Confirmado* and *Cancelado* exclude drafts.
- Stats gain a fourth card, **"Borradores"**. *Total* includes drafts; *Próximos confirmados* excludes them.
- The actions menu for a draft shows **"Continuar editando"** (instead of "Editar") and "Eliminar". *Cancelar evento* / *Confirmar evento* are hidden, because a draft has not been published.
- Undated drafts count toward the calendar's "N eventos sin fecha" note.

`PortalBreadcrumb` `SLUG_LABELS`: add `nuevo` → "Nuevo evento" and `editar` → "Editar evento". Also make sure a uuid segment does not render raw: follow the existing uuid handling, or render "Evento".

#### UI — `EventoWizardPage`
Rendered inside the portal shell with the US-0116 visual system (`grit-*` tokens, `rounded-grit-*`, `@/components/ui` kit, one `h1`, no outer padding).

**Header**: `GritPageHeader` with the title "Nuevo evento" or "Editar evento" and the subtitle `nombre` (edit mode). When the event is a draft, a `GritTag` "Borrador" is shown next to the title, plus a muted "Último guardado: hace N min" once it has been saved at least once. A secondary "Volver a eventos" link goes to the list; it goes through the unsaved-changes guard.

**Stepper** (`EventoWizardStepper`), at the top of the page, with 3 steps:
1. "Configura tu evento" (icon `edit_calendar`)
2. "Configura tus entradas" (icon `confirmation_number`)
3. "Configura tus métodos de pago" (icon `payments`)

- Rendered as an `<ol>` with `aria-label="Pasos del evento"`. The current step has `aria-current="step"`, completed steps show a check icon, and a step with validation errors shows an error dot and the text "Revisar".
- Clicking a step header moves **backwards** freely. Moving **forward** (by header click or by "Siguiente") validates the current step first; on failure it stays and focuses the first invalid field.
- In edit mode every step is reachable directly, because the data already exists.
- Below `sm` the labels collapse to "Paso N de 3 · {label}" and only the circles are shown.

**Sticky footer bar** (`EventoWizardFooter`): "Atrás" (hidden on step 1), "Siguiente" (steps 1–2), a secondary **"Guardar borrador"** button (icon `save`), and a primary button:
- Create mode, or editing a draft: "Publicar evento", only on step 3.
- Editing a published event: "Guardar cambios", on **every** step. "Guardar borrador" is not shown.

**"Guardar borrador"** is visible on every step whenever the event is new or still a draft.
- It is disabled, with the tooltip / `aria-describedby` hint "Escribe el nombre del evento para guardar", while `nombre` is empty.
- It is also disabled when there are no unsaved changes; it reads "Borrador guardado" in that case.
- It runs only the draft validation (name + format errors). Format errors are shown inline exactly as in a final save, and the wizard jumps to the first step containing one.
- It keeps the admin on the current step, with the same data on screen. It shows an inline `role="status"` confirmation "Borrador guardado" for 4 s next to the button and updates "Último guardado".

**Final save** ("Publicar evento" / "Guardar cambios") validates **all** steps. On failure it jumps to the first step with errors and marks the invalid steps in the stepper.

While either save runs, every input and button is disabled, and the pressed button reads "Guardando…".

**Unsaved-changes guard**: while the draft differs from its initial state (`isDirty`), a `beforeunload` listener is active (same pattern as `FormularioEditorPage`). "Volver a eventos" and "Cancelar" open a confirm dialog: "Tienes cambios sin guardar. ¿Salir sin guardar?".

##### Step 1 — "Configura tu evento"
Works like `PublicarEntrenamientoModal` but on the full page. The editor is on the left and the **live preview** of the event page is on the right; every keystroke updates the preview.

- Layout: `lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`. The preview column is `lg:sticky lg:top-4`. Below `lg` the preview sits under the form behind a "Ver vista previa" toggle, collapsed by default.
- **Preview** (`EventoPreview`): a segmented control switches between *Página* (default) and *Tarjeta*.
  - *Página* renders the existing `PublicTrainingDetalleBody` with the draft mapped through `toDetallePreviewItem(draft)` (a pure adapter in `src/lib/portal/eventos.utils.ts` that builds a `PublicTrainingListItem`). Fields with no event equivalent (`reservasActivas`, `serviciosRequeridos`, `formularioId`, `formularioExterno`, `tenantNombre`, and so on) are set to neutral values (`0`, `[]`, `null`). Pass `onReservar={() => {}}` and `reservarDisabled`.
  - *Tarjeta* renders `EventoCard` from phase 1 with the draft mapped to an `EventoListItem`, and its actions menu hidden (add an optional `hideActions` prop).
  - Prices in the preview come from the step-2 tickets that have a valid `valor`. The preview never shows invalid half-typed rows.
- **Form sections** (each a `GritCard`):
  1. **Información básica**: `nombre` (required, max 150), `descripcion` (short, max 300, "Se muestra en la tarjeta"), `descripcion_larga` (Markdown textarea, same helper text as `PublicarEntrenamientoModal`), `pagina_evento_url` (optional, http/https validated).
  2. **Imagen del evento**: file input (`image/jpeg,image/png,image/webp`, max 5 MB, same validation and messages as `usePublicarEntrenamiento`). It shows the current banner or the local preview and has a "Quitar imagen" action. The file is uploaded only on save.
  3. **Disciplina**: a `select` with the tenant's **active** disciplines (`entrenamientosService.listDisciplineOptions`). The *label* is shown and the *name* is stored. Required. In edit mode, if the stored name no longer matches a discipline, an extra option "{nombre} (ya no existe)" is shown selected, so the value is not lost silently.
  4. **Fecha y lugar**:
     - `fecha_hora`: `datetime-local`, interpreted as `America/Bogota` using the same `-05:00` conversion as `useEntrenamientos.toBogotaIsoFromLocalInput`. It may be empty ("Fecha por definir"). In create mode it cannot be in the past.
     - `duracion_minutos`: positive integer, optional.
     - **Escenario** (`EventoEscenarioSelector`): a `select` listing the tenant's scenarios (`scenariosService.listScenariosByTenant`, active ones only; name plus location), an option "Sin escenario", and a trailing option "+ Crear nuevo escenario". The last one opens the existing `ScenarioFormModal`, driven by `useScenarios`. When it saves successfully, the new scenario is added to the options and **auto-selected**. In edit mode a stored snapshot whose `id` is no longer in the list is shown as "{nombre} (guardado en el evento)".
     - `punto_encuentro`: optional text.
     - At least one of escenario and punto_encuentro is **not** required (both may be empty).
  5. **Entrenadores** (`EventoEntrenadoresSelector`): a multi-select of the tenant's trainers (`entrenamientosService.listTrainerOptions`), shown as a checkbox list with search. Each selected trainer becomes a row with name, an `experiencia` textarea (max 500, placeholder "Ej. 10 años entrenando trail running, certificado…") and a remove button. Duplicates are impossible. Zero trainers is allowed.
  6. **Cupo y reservas**: `cupo_maximo` (positive integer or empty = "Cupo ilimitado"), `reserva_antelacion_horas` and `cancelacion_antelacion_horas` (integers `>= 0`, optional), and the checkbox `omitir_confirmacion_compra` ("Confirmar compras automáticamente sin aprobación del administrador").
  7. **Contenido de la página**: `cronograma` and `incluye` row editors, with the same UX and validation as `PublicarEntrenamientoModal`. Extract the shared row editors into `src/components/portal/shared/RowListEditor.tsx` only if it can be done without changing `PublicarEntrenamientoModal`'s behavior. Otherwise copy them into the eventos slice.
  8. **Visibilidad**: `publico` toggle ("Visible para cualquier persona" / "Solo miembros del equipo") and `activo` toggle ("Oculto: solo administradores y entrenadores lo ven" when off; this is the phase-1 hide/archive flag and is independent of the draft state). Defaults: `publico = true`, `activo = true`.
- `estado` is **not** in the form. It defaults to `confirmado` on create and keeps being managed from the list actions.

##### Step 2 — "Configura tus entradas"
Three sections:

1. **Tipos de entrada** (`EventoEntradasEditor`): a list of ticket cards and an "Añadir entrada" button. The step requires **at least one** ticket; to make a free event, add a ticket with `valor = 0`. Each card has:
   - `nombre`: required, max 100, unique (case-insensitive) within the event.
   - `tipo_entrada`: radio *Sencilla* / *Múltiple*, default *Sencilla*.
   - When *Múltiple*: `EventoBundleSelector`, a multi-select of the tenant's **other** events (`eventosService.listEventos(tenantId)`, excluding the current event and cancelled ones, sorted by date and labelled "nombre · fecha"). At least 1 is required. A hint explains: "Esta entrada da acceso a este evento y a los eventos seleccionados". In edit mode, bundled ids that no longer exist are dropped from the draft and a warning is shown on the card: "N eventos del paquete ya no existen y se quitaron".
   - `valor`: COP amount, a raw-string input converted on save (same approach as `PrecioFormRow`), `>= 0`, max 2 decimals. `0` is shown as "Gratis" in the preview.
   - `valida_desde` / `valida_hasta`: `datetime-local` in Bogotá time, optional, `desde < hasta`. If `fecha_hora` is set, `valida_hasta` must not be after the event's end time (`fecha_hora + duracion_minutos`, or `fecha_hora` when there is no duration).
   - Move up / move down buttons to set `orden`, and a delete button. If the ticket has coupons, deleting asks for confirmation ("Se eliminarán también N cupones").
   - A collapsible **Cupones de descuento** block inside each ticket card (`EventoCuponesEditor`). It lists coupon rows and has "Añadir cupón". Each row has:
     - `nombre`: required, max 100 (internal label, for example "Preventa influencers").
     - `cupon`: required, auto-uppercased as the user types, `^[A-Z0-9_-]{3,30}$`, unique across **all** coupons of the event.
     - `descuento`: percentage, `> 0` and `<= 100`, shown as "20 %"; the row previews the final price "$X → $Y".
     - `valido_desde` / `valido_hasta`: optional, `desde < hasta`.
     - Delete button.
     - Coupons on a ticket with `valor = 0` are not allowed. The "Añadir cupón" button is disabled with the hint "Las entradas gratuitas no admiten cupones".
2. **Formulario de acceso** (`EventoFormularioSelector`): a `select` with "Sin formulario" (default) plus the tenant's **active** form templates (`formulariosService.getPlantillasByTenant`, filtered to `activo`, sorted by name). A "Vista previa" button opens the existing `FormularioPreviewModal` through `useFormularioPreview`. Helper text: "Se solicitará al adquirir cualquier entrada de este evento". If there are no templates, an inline empty state links to `gestion-formularios`.

##### Step 3 — "Configura tus métodos de pago"
- `EventoMetodosPagoSelector` lists the tenant's **active** payment methods (`metodosPagoService.getMetodosPago(tenantId, true)`, ordered by `orden`) as selectable cards: checkbox, name, tipo badge, and `valor` / `url` / `comentarios` preview.
- Buttons "Seleccionar todos" / "Quitar todos".
- Validation: if **any** ticket has `valor > 0`, at least one method is required ("Selecciona al menos un método de pago para las entradas con costo"). If every ticket is free the step may be empty, and a note says so.
- In edit mode, stored snapshots whose `id` is no longer an active method stay listed as "{nombre} (inactivo o eliminado)", checked, with a warning. The admin can uncheck them but not re-check them once removed.
- If the tenant has no active methods and payment is required, an empty state links to `gestion-organizacion`, where `TenantPaymentMethodsCard` lives.
- A **summary panel** before the final button shows the event name and date, the ticket count with the price range, the coupon count, the form name, and the method count.

#### Load and save flow (`useEventoWizard`)
- **Create**: the initial draft has defaults. An event id is generated client-side with `crypto.randomUUID()` and used both for the banner storage path and as `p_evento_id`.
- **Edit**: runs `eventosService.getEventoCompleto(tenantId, eventoId)` in parallel with the option lists. `null` renders a `GritEmptyState` "Evento no encontrado" with "Volver a eventos". A load error renders the error state with "Reintentar".
- **Final save** (`publicar()` / `guardarCambios()`):
  1. `validateAll()`.
  2. If a new banner file was chosen, `storageService.uploadEventoBanner(tenantId, eventoId, file)` (upsert) gets its public or signed path.
  3. `eventosService.guardarEventoCompleto(tenantId, eventoId, draftToPayload(draft), { esNuevo, borrador: false })`.
  4. Redirect to the list.
- **Draft save** (`guardarBorrador()`):
  1. `validateDraft()`: `nombre` non-empty, plus format errors only.
  2. Banner upload, the same as for a final save.
  3. `guardarEventoCompleto(..., { esNuevo, borrador: true })`.
  4. On success:
     - Store the returned ticket and coupon ids in the draft, so the next save updates rows instead of inserting duplicates. The RPC returns them; see *API*.
     - Reset the `isDirty` baseline to the saved draft and set `ultimoGuardado = now`.
     - If this was the **first** save of a new event, switch to edit mode (`esNuevo = false`) and `router.replace('/portal/orgs/{tenantId}/gestion-eventos/{eventoId}/editar?paso={step}')`. Use `scroll: false`; the wizard state is kept in the hook, and the reload after the URL change must not reset the draft or flash a loading state.
  5. On error, the mapped message is shown in the alert block, and nothing is lost from the screen.
- In both modes, if the RPC fails after a new banner was uploaded, the uploaded file stays. The path is deterministic and overwritten on retry, so it is harmless.
- "Quitar imagen" sets `banner_url = null`. The storage object is not deleted in this phase.
- **Loading a draft in edit mode** restores exactly what was saved, including incomplete tickets and coupons. Their missing fields are shown empty, with no errors until the admin tries to publish. The stepper opens on `?paso` when present, otherwise on step 1.

---

## Database Changes

### Migration: `supabase/migrations/20260929120000_eventos_fase2_entradas_cupones.sql`

```sql
-- =============================================
-- Migration: Team events phase 2 (US-0119)
-- Snapshot columns, formulario, métodos de pago, entradas, cupones, atomic save RPC.
-- =============================================

begin;

-- 1. eventos: disciplina_id uuid -> text (discipline name)
alter table public.eventos drop constraint eventos_disciplina_id_fkey;
alter table public.eventos
  alter column disciplina_id type text
  using (select d.nombre from public.disciplinas d where d.id = eventos.disciplina_id);
-- (if the USING subquery is rejected by the Postgres version, add a temp column, backfill with UPDATE … FROM, drop and rename)
alter table public.eventos alter column disciplina_id drop not null;   -- a draft may not have one yet
alter table public.eventos
  add constraint eventos_disciplina_nombre_ck
  check (disciplina_id is null or length(btrim(disciplina_id)) between 1 and 100);

-- 1b. Drafts (borrador). The name is the only field always required.
alter table public.eventos add column borrador boolean not null default false;
update public.eventos set nombre = 'Evento sin nombre' where nombre is null or btrim(nombre) = '';
alter table public.eventos
  add constraint eventos_nombre_requerido_ck check (length(btrim(coalesce(nombre, ''))) > 0),
  -- event-level completeness that can be expressed on the row itself; ticket/payment completeness is checked by the RPC
  add constraint eventos_publicado_completo_ck check (borrador or disciplina_id is not null);

create index idx_eventos_tenant_borrador on public.eventos (tenant_id) where borrador;

-- Re-create the phase-1 SELECT policies so drafts are never visible to anon or plain members.
drop policy eventos_select_anon on public.eventos;
create policy eventos_select_anon on public.eventos
  for select to anon
  using (publico = true and activo = true and borrador = false);

drop policy eventos_select_authenticated on public.eventos;
create policy eventos_select_authenticated on public.eventos
  for select to authenticated
  using (
    (publico = true and activo = true and borrador = false)
    or (
      activo = true and borrador = false
      and tenant_id in (select t.tenant_id from public.get_member_tenants_for_authenticated_user() t)
    )
    or tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  );

drop index if exists idx_eventos_publicos_fecha_hora;
create index idx_eventos_publicos_fecha_hora on public.eventos (fecha_hora)
  where publico = true and activo = true and borrador = false;

-- 2. eventos: escenario_id uuid -> jsonb snapshot
alter table public.eventos add column escenario_snapshot jsonb;
update public.eventos e
   set escenario_snapshot = jsonb_build_object(
         'id', s.id, 'nombre', s.nombre, 'tipo', s.tipo, 'ubicacion', s.ubicacion,
         'direccion', s.direccion, 'coordenadas', s.coordenadas,
         'capacidad', s.capacidad, 'image_url', s.image_url)
  from public.escenarios s
 where s.id = e.escenario_id;
alter table public.eventos drop constraint eventos_escenario_id_fkey;
alter table public.eventos drop column escenario_id;
alter table public.eventos rename column escenario_snapshot to escenario_id;
alter table public.eventos
  add constraint eventos_escenario_object_ck
  check (escenario_id is null or (jsonb_typeof(escenario_id) = 'object' and escenario_id ? 'id' and escenario_id ? 'nombre'));

-- 3. eventos: entrenador_id uuid -> jsonb array of trainers with experiencia
alter table public.eventos add column entrenadores_snapshot jsonb not null default '[]'::jsonb;
update public.eventos e
   set entrenadores_snapshot = jsonb_build_array(jsonb_build_object(
         'id', u.id,
         'nombre', btrim(coalesce(u.nombre, '') || ' ' || coalesce(u.apellido, '')),
         'experiencia', ''))
  from public.usuarios u
 where u.id = e.entrenador_id;
alter table public.eventos drop constraint eventos_entrenador_id_fkey;
alter table public.eventos drop column entrenador_id;
alter table public.eventos rename column entrenadores_snapshot to entrenador_id;
alter table public.eventos
  add constraint eventos_entrenador_array_ck check (jsonb_typeof(entrenador_id) = 'array');

-- 4. eventos: formulario + métodos de pago
alter table public.eventos
  add column formulario_id uuid,
  add column metodos_pago jsonb not null default '[]'::jsonb,
  add constraint eventos_formulario_id_fkey
    foreign key (formulario_id) references public.formularios_plantillas(id) on delete set null,
  add constraint eventos_metodos_pago_array_ck check (jsonb_typeof(metodos_pago) = 'array');

create index idx_eventos_formulario_id on public.eventos (formulario_id) where formulario_id is not null;
-- idx_eventos_disciplina_id (from US-0118) keeps working on the text column.

comment on column public.eventos.disciplina_id is 'Discipline NAME snapshot (text), not an FK (US-0119).';
comment on column public.eventos.escenario_id is 'Escenario snapshot object {id,nombre,tipo,ubicacion,direccion,coordenadas,capacidad,image_url} (US-0119).';
comment on column public.eventos.entrenador_id is 'Array of trainer snapshots [{id,nombre,experiencia}] (US-0119).';
comment on column public.eventos.metodos_pago is 'Array of tenant_metodos_pago snapshots accepted for this event (US-0119).';
comment on column public.eventos.precio is 'DERIVED from evento_entradas by guardar_evento_completo; do not write directly (US-0119).';

-- 5. evento_entradas
create table public.evento_entradas (
  id                 uuid primary key default gen_random_uuid(),
  evento_id          uuid not null,
  tenant_id          uuid not null,          -- denormalized for RLS/indexes; must equal eventos.tenant_id
  tipo_entrada       varchar(20) not null default 'sencilla',
  nombre             varchar(100),                -- nullable: may be missing while the event is a draft
  eventos_id_bundle  jsonb not null default '[]'::jsonb,
  valida_desde       timestamptz,
  valida_hasta       timestamptz,
  valor              numeric(12,2),               -- nullable: may be missing while the event is a draft
  orden              integer not null default 0,
  created_at         timestamptz not null default timezone('utc', now()),
  updated_at         timestamptz not null default timezone('utc', now()),

  constraint evento_entradas_evento_id_fkey
    foreign key (evento_id) references public.eventos(id) on delete cascade,
  constraint evento_entradas_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint evento_entradas_tipo_ck check (tipo_entrada in ('sencilla', 'multiple')),
  -- Format rules only (always wrong). Completeness (nombre/valor present, Múltiple with >= 1 bundled event)
  -- is enforced by guardar_evento_completo on final save, because drafts may be incomplete.
  constraint evento_entradas_nombre_ck check (nombre is null or length(btrim(nombre)) > 0),
  constraint evento_entradas_valor_ck check (valor is null or valor >= 0),
  constraint evento_entradas_ventana_ck check (valida_desde is null or valida_hasta is null or valida_desde < valida_hasta),
  constraint evento_entradas_bundle_array_ck check (jsonb_typeof(eventos_id_bundle) = 'array'),
  constraint evento_entradas_bundle_tipo_ck check (tipo_entrada = 'multiple' or eventos_id_bundle = '[]'::jsonb)
);

create unique index uq_evento_entradas_nombre on public.evento_entradas (evento_id, lower(btrim(nombre)))
  where nombre is not null;
create index idx_evento_entradas_evento_orden on public.evento_entradas (evento_id, orden);
create index idx_evento_entradas_bundle on public.evento_entradas using gin (eventos_id_bundle);

create trigger evento_entradas_set_updated_at
  before update on public.evento_entradas
  for each row execute function public.set_updated_at();

-- 6. evento_entrada_cupones
create table public.evento_entrada_cupones (
  id            uuid primary key default gen_random_uuid(),
  entrada_id    uuid not null,
  evento_id     uuid not null,   -- denormalized for per-event code uniqueness
  tenant_id     uuid not null,   -- denormalized for RLS
  nombre        varchar(100),    -- nullable while the event is a draft
  cupon         varchar(30),     -- nullable while the event is a draft
  descuento     numeric(5,2),    -- nullable while the event is a draft
  valido_desde  timestamptz,
  valido_hasta  timestamptz,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),

  constraint evento_entrada_cupones_entrada_id_fkey
    foreign key (entrada_id) references public.evento_entradas(id) on delete cascade,
  constraint evento_entrada_cupones_evento_id_fkey
    foreign key (evento_id) references public.eventos(id) on delete cascade,
  constraint evento_entrada_cupones_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint evento_entrada_cupones_nombre_ck check (nombre is null or length(btrim(nombre)) > 0),
  constraint evento_entrada_cupones_codigo_ck check (cupon is null or cupon ~ '^[A-Z0-9_-]{3,30}$'),
  constraint evento_entrada_cupones_descuento_ck check (descuento is null or (descuento > 0 and descuento <= 100)),
  constraint evento_entrada_cupones_ventana_ck check (valido_desde is null or valido_hasta is null or valido_desde < valido_hasta)
);

create unique index uq_evento_entrada_cupones_codigo on public.evento_entrada_cupones (evento_id, cupon)
  where cupon is not null;
create index idx_evento_entrada_cupones_entrada on public.evento_entrada_cupones (entrada_id);

create trigger evento_entrada_cupones_set_updated_at
  before update on public.evento_entrada_cupones
  for each row execute function public.set_updated_at();

-- 7. RLS
alter table public.evento_entradas enable row level security;
alter table public.evento_entrada_cupones enable row level security;

revoke all on public.evento_entradas from anon, authenticated;
revoke all on public.evento_entrada_cupones from anon, authenticated;
grant select on public.evento_entradas to anon;
grant select, insert, update, delete on public.evento_entradas to authenticated;
grant select, insert, update, delete on public.evento_entrada_cupones to authenticated;  -- no anon grant at all

-- Tickets are readable whenever the parent event is readable (eventos RLS applies inside the subquery).
create policy evento_entradas_select_anon on public.evento_entradas
  for select to anon
  using (exists (select 1 from public.eventos e where e.id = evento_id));

create policy evento_entradas_select_authenticated on public.evento_entradas
  for select to authenticated
  using (exists (select 1 from public.eventos e where e.id = evento_id));

create policy evento_entradas_write_trainer_admin on public.evento_entradas
  for all to authenticated
  using (tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t))
  with check (
    tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
    and exists (select 1 from public.eventos e where e.id = evento_id and e.tenant_id = evento_entradas.tenant_id)
  );

-- Coupon codes are secret: only the tenant's admins/trainers can read or write them.
create policy evento_entrada_cupones_all_trainer_admin on public.evento_entrada_cupones
  for all to authenticated
  using (tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t))
  with check (
    tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
    and exists (
      select 1 from public.evento_entradas en
       where en.id = entrada_id and en.evento_id = evento_entrada_cupones.evento_id
         and en.tenant_id = evento_entrada_cupones.tenant_id)
  );

commit;
```

### Migration: `supabase/migrations/20260929120100_guardar_evento_completo.sql`

`public.guardar_evento_completo(p_tenant_id uuid, p_evento_id uuid, p_es_nuevo boolean, p_borrador boolean, p_evento jsonb, p_entradas jsonb) returns jsonb`

Returns `{ "evento_id": uuid, "borrador": bool, "entradas": [{ "client_key": text, "id": uuid, "cupones": [{ "client_key": text, "id": uuid }] }] }`. `client_key` is the opaque key the wizard sends for each ticket and coupon row. The wizard uses it to attach the persisted ids to its in-memory rows after a draft save, so repeated draft saves update rather than duplicate.

Validation by mode:
| Check | Draft save (`p_borrador = true`) | Final save (`p_borrador = false`) |
|---|---|---|
| Caller is admin/trainer of the tenant | ✓ | ✓ |
| `nombre` non-empty | ✓ | ✓ |
| Format rules (table checks, bundle ids belong to the tenant and ≠ the event, form belongs to the tenant, duplicate names/codes) | ✓ | ✓ |
| Discipline present | — | ✓ (also the table check) |
| ≥ 1 ticket; every ticket has `nombre` and `valor`; every Múltiple ticket has ≥ 1 bundled event | — | ✓ |
| Every coupon has `nombre`, `cupon`, `descuento`; no coupon on a free ticket | — | ✓ |
| ≥ 1 payment method when any ticket has `valor > 0` | — | ✓ |
| Form is `activo` | — (an inactive form is kept in a draft) | ✓ |
| Editing an event whose stored `borrador = false` with `p_borrador = true` | `raise 'NO_REVERTIR_A_BORRADOR' using errcode = '23514'` | — |

Completeness failures on final save raise `23514` with a code message (`DISCIPLINA_REQUERIDA`, `ENTRADAS_REQUERIDAS`, `ENTRADA_INCOMPLETA`, `BUNDLE_REQUERIDO`, `CUPON_INCOMPLETO`, `CUPON_EN_ENTRADA_GRATIS`, `METODO_PAGO_REQUERIDO`, `FORMULARIO_INACTIVO`). The client validates the same rules first, so these are a safety net.

The numbered steps below apply to both modes. The completeness checks in steps 4–5 run only when `p_borrador = false`. Step 6 writes `borrador = p_borrador`. Step 9 derives `precio` only from tickets with non-null `nombre` and `valor`.
- **`security invoker`**, `set search_path = public`. Every statement runs under the caller's RLS; the function adds atomicity and cross-row validation, not privileges. `grant execute … to authenticated`; `revoke … from anon, public`.
- Steps, all inside the function's single transaction. Any `raise` rolls everything back.
  1. `if p_tenant_id not in (select tenant_id from get_trainer_or_admin_tenants_for_authenticated_user())` → `raise exception 'FORBIDDEN' using errcode = '42501'`.
  2. When `p_evento->>'formulario_id'` is not null, it must exist in `formularios_plantillas` with `tenant_id = p_tenant_id` and `activo`. Otherwise `raise 'FORMULARIO_INVALIDO' using errcode = '23503'`.
  3. Every `eventos_id_bundle` id across all tickets must be an existing `eventos.id` with `tenant_id = p_tenant_id` and `<> p_evento_id`. Otherwise `raise 'BUNDLE_INVALIDO' using errcode = '23503'`.
  4. If any ticket has `valor > 0` and `jsonb_array_length(p_evento->'metodos_pago') = 0` → `raise 'METODO_PAGO_REQUERIDO' using errcode = '23514'`.
  5. `jsonb_array_length(p_entradas) >= 1`, else `raise 'ENTRADAS_REQUERIDAS' using errcode = '23514'`. Coupons on a ticket with `valor = 0` → `raise 'CUPON_EN_ENTRADA_GRATIS' using errcode = '23514'`.
  6. `p_es_nuevo`:
     - `insert into eventos (id, tenant_id, creado_por = auth.uid(), estado = 'confirmado', …columns from p_evento)`.
     - Otherwise `update eventos set … where id = p_evento_id and tenant_id = p_tenant_id`. `if not found` → `raise 'NOT_FOUND' using errcode = 'P0002'`. The update never touches `tenant_id`, `creado_por`, `estado` or `created_at`.
  7. **Ticket sync**: delete `evento_entradas` of the event whose id is not in the payload (cascades their coupons). Then `insert … on conflict (id) do update` every ticket in the payload. A ticket without an `id` gets `gen_random_uuid()`; the client may send new ids. `tenant_id = p_tenant_id` and `evento_id = p_evento_id` are forced server-side. A payload `id` that exists but belongs to another event → `raise 'ENTRADA_INVALIDA' using errcode = '42501'`.
  8. **Coupon sync per ticket**: the same delete-missing then upsert pattern. `cupon` is normalized with `upper(btrim(...))`. `evento_id` and `tenant_id` are forced.
  9. `update eventos set precio = (select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'precio', valor, 'descripcion', null) order by orden), '[]') from evento_entradas where evento_id = p_evento_id) where id = p_evento_id`.
  10. Return the result object described above (event id, the final `borrador` value, and the `client_key` → id map for tickets and coupons).
- Unique violations (`23505`) on `uq_evento_entradas_nombre` or `uq_evento_entrada_cupones_codigo` propagate with their constraint name, so the service can map them precisely.

### Storage
Migration `supabase/migrations/20260929120200_eventos_banner_storage.sql`, bucket `org-assets`, path `orgs/{tenantId}/eventos/{eventoId}.{ext}`:
- `event_banner_write`: `insert` and `update` for `authenticated` when `(storage.foldername(name))[1] = 'orgs'`, `[3] = 'eventos'`, and `[2]::uuid in (select tenant_id from get_trainer_or_admin_tenants_for_authenticated_user())`.
- `event_banner_read`: `select` for `anon, authenticated` on the same folder pattern. Banners of private events are not secret, which matches `public_training_banner_read`. Before writing it, check that policy's exact form and mirror it.

Regenerate the Supabase types if the project keeps a generated `database.types.ts`.

---

## API / Server Actions

All functions use the browser client and the user's session. RLS and the invoker RPC enforce access. No service role is used.

### `src/services/supabase/portal/eventos.service.ts` (modify)
| Function | Input | Return | Notes |
|---|---|---|---|
| `listEventos(tenantId, filters?)` | unchanged | `EventoListItem[]` | **Remove** the `disciplina` / `escenario` / `entrenador` embeds; `LIST_SELECT = '*'`. `toListItem` reads `disciplinaNombre = disciplina_id`, `escenarioNombre = escenario_id?.nombre ?? null`, `entrenadorNombre = entrenador_id.map(e => e.nombre).join(', ') \|\| null`. `EventoListItem.disciplinaId` is removed; the phase-1 disciplina filter compares names. |
| `getEventoCompleto(tenantId, eventoId)` | ids | `EventoCompleto \| null` | `select('*, entradas:evento_entradas(*, cupones:evento_entrada_cupones(*))')` with `.eq('tenant_id').eq('id').maybeSingle()`. Entradas are sorted by `orden` and cupones by `created_at` client-side. |
| `guardarEventoCompleto(tenantId, eventoId, payload: GuardarEventoPayload, opts: { esNuevo: boolean; borrador: boolean })` | see types | `GuardarEventoResult` (`{ eventoId, borrador, entradas: [{ clientKey, id, cupones: [{ clientKey, id }] }] }`) | `supabase.rpc('guardar_evento_completo', { p_tenant_id, p_evento_id, p_es_nuevo, p_borrador, p_evento, p_entradas })`. Maps errors (table below). |
| `createEvento` / `updateEvento` | — | — | **Remove**; the RPC replaces them. `toPayload` is removed, or kept only if `updateEstadoEvento` needs it. |
| `getEventoById`, `updateEstadoEvento`, `deleteEvento` | unchanged | unchanged | `Evento` now carries the new column types. |

Additional `mapServiceError` cases:
| Postgres signal | `EventoServiceError.code` | Message (es) |
|---|---|---|
| `P0002` / `NOT_FOUND` | `not_found` (new) | "El evento ya no existe." |
| `23505` on `uq_evento_entradas_nombre` | `duplicate_entrada` (new) | "Ya existe una entrada con ese nombre en el evento." |
| `23505` on `uq_evento_entrada_cupones_codigo` | `duplicate_cupon` (new) | "El código de cupón ya está en uso en este evento." |
| `FORMULARIO_INVALIDO` | `invalid_reference` | "El formulario seleccionado no existe o está inactivo." |
| `BUNDLE_INVALIDO` | `invalid_reference` | "Uno de los eventos del paquete ya no existe." |
| `METODO_PAGO_REQUERIDO`, `ENTRADAS_REQUERIDAS`, `ENTRADA_INCOMPLETA`, `BUNDLE_REQUERIDO`, `CUPON_INCOMPLETO`, `CUPON_EN_ENTRADA_GRATIS`, `DISCIPLINA_REQUERIDA`, `FORMULARIO_INACTIVO`, other `23514` | `invalid_data` | Specific message per code; generic "Los datos del evento no son válidos." |
| `NO_REVERTIR_A_BORRADOR` | `invalid_data` | "Un evento publicado no puede volver a borrador." |
| `FORBIDDEN`, `ENTRADA_INVALIDA`, `42501` | `forbidden` | existing message |

### `src/services/supabase/portal/storage.service.ts` (modify)
- `uploadEventoBanner(tenantId: string, eventoId: string, file: File): Promise<string>` uploads to `orgs/{tenantId}/eventos/{eventoId}.{ext}` with `upsert: true` and returns the URL, stored the same way `uploadEntrenamientoPublicoBanner` stores it (keep the same convention).

### `src/hooks/portal/scenarios/useScenarios.ts` (modify, backward compatible)
- New optional option `onCreated?: (scenario: Scenario) => void`, called in `submit()` after a successful **create**, before the reload. Existing callers are unaffected.
- `scenariosService.createScenario` already returns the created row. Also add `skipInitialLoad?: boolean`, so the wizard can reuse only the form state without a duplicate fetch; otherwise use its `scenarios` list directly as the selector source (preferred: one fetch).

### Reused, unchanged
`entrenamientosService.listDisciplineOptions`, `entrenamientosService.listTrainerOptions`, `formulariosService.getPlantillasByTenant`, `metodosPagoService.getMetodosPago(tenantId, true)`, `useFormularioPreview`, `FormularioPreviewModal`, `ScenarioFormModal`, `PublicTrainingDetalleBody`, `EventoCard`.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260929120000_eventos_fase2_entradas_cupones.sql` | Column type changes on `eventos`, `borrador` + re-created SELECT policies, `formulario_id`, `metodos_pago`, new tables (draft-nullable fields), indexes, triggers, RLS |
| Migration | `supabase/migrations/20260929120100_guardar_evento_completo.sql` | `guardar_evento_completo` invoker RPC + grants |
| Migration | `supabase/migrations/20260929120200_eventos_banner_storage.sql` | Storage policies for `orgs/{tenantId}/eventos/` |
| Types | `src/types/portal/eventos.types.ts` | Add `borrador: boolean` to `Evento` and `EventoListItem`; `EventosClientFilters.estado` accepts `'borrador'`; `EventosStats.borradores`; `GuardarEventoResult`; `clientKey` on the ticket and coupon draft rows; nullable `nombre` / `valor` / `cupon` / `descuento` on `EventoEntrada` / `EventoEntradaCupon`. Update `Evento` (`disciplina_id: string` name, `escenario_id: EventoEscenarioSnapshot \| null`, `entrenador_id: EventoEntrenadorSnapshot[]`, `formulario_id`, `metodos_pago`). Add the snapshot types, `EventoEntradaTipo`, `EVENTO_ENTRADA_TIPO_LABELS`, `EventoEntrada`, `EventoEntradaCupon`, `EventoCompleto`, `GuardarEventoPayload`, `EventoWizardStep` (`1 \| 2 \| 3`), draft types (`EventoDraft`, `EventoEntradaDraft`, `EventoCuponDraft`, with raw-string amounts and dates), `EventoWizardErrors`. New error codes `not_found`, `duplicate_entrada`, `duplicate_cupon`. Remove `EventoInput` and `EventoListItem.disciplinaId` (filter by `disciplinaNombre`). |
| Service | `src/services/supabase/portal/eventos.service.ts` | Changes listed above |
| Service | `src/services/supabase/portal/storage.service.ts` | `uploadEventoBanner` |
| Lib | `src/lib/portal/eventos.utils.ts` | `toDetallePreviewItem(draft)`, `toCardPreviewItem(draft)`, `draftFromEventoCompleto(evento)`, `draftToPayload(draft)`, `emptyEventoDraft()`, Bogotá `datetime-local` ⇄ ISO helpers (move from `useEntrenamientos` if not already shared), `formatDescuento`, `aplicarDescuento(valor, pct)` |
| Hook | `src/hooks/portal/gestion-eventos/useEventoWizard.ts` | New: mode (`esNuevo`, `esBorrador`), loading/error/notFound, draft + `isDirty` baseline, current step synced to `?paso`, `goTo(step)` with forward validation, `validateStep` / `validateAll` / `validateDraft`, per-step error map, field / row mutators (entradas, cupones, entrenadores, cronograma, incluye), banner file state and validation, `guardarBorrador()`, `publicar()` / `guardarCambios()`, `savingKind: 'borrador' \| 'final' \| null`, `ultimoGuardado`, `canGuardarBorrador` |
| Hook | `src/hooks/portal/gestion-eventos/useEventoWizardOptions.ts` | New: loads disciplinas, escenarios, entrenadores, other events (bundle), active form templates and active payment methods in parallel; `reloadEscenarios` |
| Hook | `src/hooks/portal/gestion-eventos/useGestionEventos.ts` | Disciplina filter by name (`disciplinaNombre`); the options come from `disciplinesService` names. Estado filter gains `'borrador'` (Confirmado / Cancelado exclude drafts). Stats gain `borradores`; *Próximos confirmados* excludes drafts. |
| Component | `src/components/portal/gestion-eventos/EventosToolbar.tsx`, `EventosStatsCards.tsx`, `EventoActionsMenu.tsx`, `EventoEstadoBadge.tsx` | "Borrador" filter option, "Borradores" stat card, draft actions ("Continuar editando" + "Eliminar" only), "Borrador" tag |
| Hook | `src/hooks/portal/scenarios/useScenarios.ts` | Optional `onCreated` callback |
| Component | `src/components/portal/gestion-eventos/wizard/EventoWizardPage.tsx` | New `'use client'` root: header, stepper, step body, footer, guards, not-found/error/loading states |
| Component | `src/components/portal/gestion-eventos/wizard/EventoWizardStepper.tsx` | New stepper (`<ol>`, `aria-current="step"`, error markers) |
| Component | `src/components/portal/gestion-eventos/wizard/EventoWizardFooter.tsx` | New sticky footer (Atrás / Siguiente / Guardar borrador / Publicar evento or Guardar cambios) plus the "Borrador guardado" status |
| Component | `src/components/portal/gestion-eventos/wizard/EventoConfiguracionStep.tsx` | Step 1 form + preview layout |
| Component | `src/components/portal/gestion-eventos/wizard/EventoPreview.tsx` | Página / Tarjeta preview switcher |
| Component | `src/components/portal/gestion-eventos/wizard/EventoEscenarioSelector.tsx` | Select + "Crear nuevo escenario" → `ScenarioFormModal` |
| Component | `src/components/portal/gestion-eventos/wizard/EventoEntrenadoresSelector.tsx` | Multi-select + per-trainer `experiencia` |
| Component | `src/components/portal/gestion-eventos/wizard/EventoEntradasStep.tsx` | Step 2 layout |
| Component | `src/components/portal/gestion-eventos/wizard/EventoEntradasEditor.tsx` | Ticket cards (tipo, bundle, valor, ventana, orden) |
| Component | `src/components/portal/gestion-eventos/wizard/EventoBundleSelector.tsx` | Other-events multi-select |
| Component | `src/components/portal/gestion-eventos/wizard/EventoCuponesEditor.tsx` | Coupon rows per ticket |
| Component | `src/components/portal/gestion-eventos/wizard/EventoFormularioSelector.tsx` | Form template select + preview |
| Component | `src/components/portal/gestion-eventos/wizard/EventoMetodosPagoStep.tsx` | Step 3 selectable cards + summary |
| Component | `src/components/portal/gestion-eventos/wizard/SalirSinGuardarModal.tsx` | Unsaved-changes confirmation (uses `EventoModalShell`) |
| Component | `src/components/portal/gestion-eventos/wizard/index.ts` | Barrel exporting `EventoWizardPage` |
| Component | `src/components/portal/gestion-eventos/GestionEventosPage.tsx` | `onNuevo` / `onEditar` navigate; remove `'proximamente'` modal; success banner from `?guardado=` |
| Component | `src/components/portal/gestion-eventos/EventoCard.tsx` | Optional `hideActions` prop; location from the snapshot |
| Component | `src/components/portal/gestion-eventos/EventosTable.tsx`, `EventosCalendar.tsx` | Read the new list-item fields (trainer names joined) |
| Component | `src/components/portal/gestion-eventos/EventoProximamenteModal.tsx` | **Delete** |
| Component | `src/components/portal/PortalBreadcrumb.tsx` | `SLUG_LABELS`: `nuevo`, `editar`; uuid segment label |
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/nuevo/page.tsx` | Server page rendering `<EventoWizardPage tenantId={tenantId} />` |
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/[evento_id]/editar/page.tsx` | New server page rendering `<EventoWizardPage tenantId={tenantId} eventoId={eventoId} />` |
| Docs | `projectspec/03-project-structure.md` | Add routes, `wizard/` sub-slice, hooks, new tables / RPC, and the updated `eventos` column semantics |

---

## Acceptance Criteria

**Database & RLS**
1. After the migrations, `eventos.disciplina_id` is `text`, `escenario_id` is `jsonb` (nullable object), `entrenador_id` is a `jsonb` array (default `[]`), and `formulario_id` (FK, `on delete set null`) and `metodos_pago` (`jsonb` array) exist. The FKs to `disciplinas`, `escenarios` and `usuarios` (trainer) are gone.
2. Existing phase-1 rows are migrated: `disciplina_id` holds the discipline name, `escenario_id` holds the snapshot object (or `null`), and `entrenador_id` holds a one-element array with `experiencia = ''` (or `[]`).
3. `evento_entradas` rejects: `tipo_entrada = 'otro'`; `valor < 0`; `valida_desde >= valida_hasta`; a *sencilla* ticket with a non-empty bundle; a duplicate non-null `nombre` (case-insensitive) in the same event. It **accepts** `nombre = null`, `valor = null`, and a *multiple* ticket with an empty bundle (draft data).
4. `evento_entrada_cupones` rejects: `descuento = 0` or `> 100`; the code `ab` (too short or lowercase); a code already used by another ticket of the same event. The same code **is** accepted on a different event.
5. Deleting an event deletes its tickets and coupons. Deleting a ticket deletes its coupons. Deleting a form template sets `eventos.formulario_id = null`.
6. As `anon`, `evento_entradas` returns only tickets of `publico and activo and not borrador` events, and `select` on `evento_entrada_cupones` fails (no grant).
6b. A `borrador = true` event with `publico = true` and `activo = true` is **not** returned to `anon`, to an authenticated non-member, or to a *usuario* member of its tenant. It **is** returned to the tenant's admins and trainers. An event with `borrador = false` and `disciplina_id = null` is rejected by `eventos_publicado_completo_ck`.
7. As a member with role *usuario*, tickets of the tenant's active events are readable. Coupons return 0 rows. Every insert, update or delete on either table fails.
8. As an admin or trainer of T: full read/write on T's tickets and coupons. Inserting a ticket with `tenant_id = T` but an `evento_id` from tenant U fails.

**RPC**
9. `guardar_evento_completo` called by a *usuario* member, a non-member, or a `pendiente_activacion` member of T raises `42501`, and nothing is written.
10. On a **final** save, when any validation fails (a bundle id from another tenant or equal to the event itself, an inactive or other-tenant form, a paid ticket with no payment methods, zero tickets, an incomplete ticket or coupon, a Múltiple ticket with no bundle, a coupon on a free ticket, a duplicate coupon code, no discipline), **no** row in `eventos`, `evento_entradas` or `evento_entrada_cupones` changes, including in edit mode.
10b. On a **draft** save with only `nombre` set, the call succeeds and inserts an `eventos` row with `borrador = true`, `disciplina_id = null` and no tickets. A draft save with incomplete tickets and coupons (no name, no value, no code) also succeeds. A draft save with a format error (`valor = -1`, code `ab`, `descuento = 150`, a bundle id from another tenant) fails and writes nothing.
10c. A draft save on an event with stored `borrador = false` raises `NO_REVERTIR_A_BORRADOR`, and nothing changes.
10d. The returned `client_key` → id map matches the rows actually persisted. A second draft save that sends those ids updates the same rows; the ticket and coupon counts do not grow.
11. On edit, tickets and coupons removed in the UI are deleted, kept ones are updated in place (same `id`), and new ones are inserted.
12. After every save, `eventos.precio` equals the tickets mapped to `[{nombre, precio: valor, descripcion: null}]` in `orden` order.
13. `creado_por`, `tenant_id`, `estado` and `created_at` are never changed by an edit.

**Navigation**
14. "Nuevo evento" on the list page navigates to `/gestion-eventos/nuevo`. "Editar" on any card, row or calendar item navigates to `/gestion-eventos/{id}/editar`. The "próximamente" modal no longer exists.
15. A trainer or athlete opening either wizard URL directly is redirected by the `(administrador)` layout.
16. `/gestion-eventos/{id}/editar` with a nonexistent id, or an event of another tenant, shows "Evento no encontrado" with a link back. It does not crash and does not leak data.
17. The breadcrumb shows "Eventos › Nuevo evento" or "Eventos › Evento › Editar evento" (no raw uuid).

**Stepper**
18. The stepper shows 3 steps with the exact labels "Configura tu evento", "Configura tus entradas" and "Configura tus métodos de pago", and marks the current one with `aria-current="step"`.
19. In create mode, "Siguiente" on step 1 with an empty `nombre` or discipline stays on step 1, shows inline errors, and focuses the first invalid field. Clicking the step-3 header from step 1 also runs step-1 validation.
20. Going back to a previous step never loses data typed in later steps.
21. In edit mode "Guardar cambios" is available on every step. Saving with an error in a step that is not visible jumps to that step and marks it "Revisar".

**Step 1**
22. Typing the name, descriptions, date, venue, trainers, cronograma or incluye updates the live *Página* preview immediately. Switching to *Tarjeta* shows the `EventoCard` with the same data and no actions menu.
23. The discipline select lists only the tenant's active disciplines, and the saved row stores the discipline **name**.
24. Choosing "+ Crear nuevo escenario" opens `ScenarioFormModal`. Saving a valid scenario closes the modal, adds it to the list and selects it. Cancelling restores the previous selection. A scenario creation error stays inside the modal.
25. The saved `escenario_id` is the full snapshot object of the chosen scenario. "Sin escenario" saves `null`.
26. Two trainers can be selected, each with its own `experiencia`. The saved `entrenador_id` is `[{id, nombre, experiencia}, …]` in selection order. A trainer cannot be added twice.
27. A banner larger than 5 MB, or of a type other than JPEG/PNG/WebP, shows an inline error and is not used. A valid file shows in the preview immediately and is uploaded only when the event is saved.
28. `pagina_evento_url = "ftp://x"` shows "Ingresa una URL válida (http o https)". A `fecha_hora` in the past is rejected in create mode.

**Step 2**
29. Saving is impossible with zero tickets ("Agrega al menos una entrada").
30. Switching a ticket to *Múltiple* shows the bundle selector, which lists the tenant's other non-cancelled events and never the current one. Saving a *Múltiple* ticket with no bundled event shows an inline error.
31. Switching a ticket from *Múltiple* back to *Sencilla* clears its bundle.
32. A ticket with an empty or non-numeric `valor` is rejected (it is not coerced to 0). `valor = 0` shows as "Gratis" in the preview, and its "Añadir cupón" button is disabled.
33. Coupon codes are uppercased as they are typed. A duplicate code in the same event, even on another ticket, is flagged inline before saving. `descuento = 20` on a `valor = 50000` ticket previews "$50.000 → $40.000".
34. Deleting a ticket that has coupons asks for confirmation first.
35. The access-form select lists only the tenant's active templates. "Vista previa" opens `FormularioPreviewModal` for the selected template. "Sin formulario" saves `formulario_id = null`.

**Step 3**
36. Only the tenant's active payment methods are listed, ordered by `orden`. The saved `metodos_pago` is an array of snapshots of exactly the checked methods.
37. With at least one paid ticket and no method checked, saving is blocked with "Selecciona al menos un método de pago para las entradas con costo". With only free tickets, saving succeeds with `metodos_pago = []`.
38. The summary panel reflects the current draft (name, date, ticket count and price range, coupon count, form, method count).

**Drafts**
38a. "Guardar borrador" is visible on all three steps in create mode and when editing a draft, and is **not** visible when editing a published event.
38b. With an empty `nombre` the button is disabled and the hint "Escribe el nombre del evento para guardar" is announced. After typing a name it becomes enabled.
38c. On a new event, typing only the name and pressing "Guardar borrador" on step 1 saves it. The "Borrador guardado" status appears, the URL changes to `/gestion-eventos/{id}/editar?paso=1` without a visible reload, the header shows the "Borrador" tag and "Último guardado", and the typed data stays on screen.
38d. Pressing "Guardar borrador" again after more edits (for example on step 2, with a ticket without a value) updates the same event. No second event is created, and ticket rows are not duplicated.
38e. After a draft save, closing the tab and reopening the event from the list ("Continuar editando") restores every field exactly as saved, including incomplete tickets and coupons, and opens on the saved `?paso` step. Incomplete fields show no errors until "Publicar evento" is pressed.
38f. A draft save with a format error (for example coupon code `a!`) shows the inline error, jumps to the step containing it, and saves nothing.
38g. With no unsaved changes, the button reads "Borrador guardado" and is disabled. The unsaved-changes guard does not fire right after a successful draft save.
38h. "Publicar evento" on a draft runs full validation. On success it sets `borrador = false` and redirects to the list with "Evento creado correctamente.". The event then becomes visible to members and anon according to `publico` / `activo`.
38i. In the management page, drafts show the "Borrador" tag in all three views. The *Estado* filter "Borrador" shows only drafts, and *Confirmado* / *Cancelado* exclude them. The "Borradores" stat is correct. A draft's actions menu shows only "Continuar editando" and "Eliminar". Drafts with missing data render with the fallbacks ("Sin disciplina", "Fecha por definir", "Precio por definir") without errors.

**Save & edit round-trip**
39. Publishing a new event redirects to the list with the banner "Evento creado correctamente.", and the new event appears in cards, list and calendar with the correct discipline, venue, trainer names and "Desde $X" price.
40. Opening that event in edit mode restores every field on all three steps exactly, including trainer experiences, the ticket order, bundles, coupons, the form and the payment methods.
41. Editing when a stored discipline, scenario or payment method no longer exists still loads. The stale value is shown with its "(ya no existe)" / "(guardado en el evento)" / "(inactivo o eliminado)" marker and is kept unless the admin changes it.
42. While saving, the button shows "Guardando…" and every control is disabled. On error, the mapped Spanish message is shown in a `role="alert"` block above the footer, the draft is kept intact, and the admin can retry.
43. With unsaved changes, closing or reloading the tab triggers the browser prompt, and "Volver a eventos" opens the "¿Salir sin guardar?" dialog. With no changes, both navigate directly.

**Isolation**
44. The phase-1 list, filters (the disciplina filter now matches by name), stats, status change and delete keep working. No `entrenamientos` / `entrenamientos_publicos` behavior changes. `PublicarEntrenamientoModal` and `ScenariosPage` behave as before. `npm run lint` and `npm run build` pass.

---

## Implementation Steps

- [ ] Check the exact forms of `public_training_banner_read`, `get_trainer_or_admin_tenants_for_authenticated_user()`, and how `uploadEntrenamientoPublicoBanner` stores URLs
- [ ] Write `20260929120000_eventos_fase2_entradas_cupones.sql`; seed phase-1 rows locally first and verify the data migration (AC 1–2)
- [ ] Write the `guardar_evento_completo` RPC and the storage migration; apply them locally
- [ ] Verify RLS and the RPC in SQL as anon, non-member, *usuario*, pending member, trainer and admin (AC 3–13)
- [ ] Update `eventos.types.ts`; fix every compile error in the phase-1 components, hooks and services (list mapping, disciplina filter)
- [ ] Update `eventos.service.ts` (`getEventoCompleto`, `guardarEventoCompleto`, error mapping; remove `createEvento` / `updateEvento`) and `storage.service.ts`
- [ ] Add the draft ⇄ payload / preview adapters to `src/lib/portal/eventos.utils.ts`
- [ ] Add `onCreated` to `useScenarios`
- [ ] Build `useEventoWizardOptions` and `useEventoWizard`
- [ ] Build the stepper, footer, step 1 (form + preview + selectors), step 2 (tickets, bundle, coupons, form), step 3 (methods + summary) and the unsaved-changes dialog
- [ ] Create the `nuevo` and `[evento_id]/editar` pages; wire `GestionEventosPage`; delete `EventoProximamenteModal`; update the breadcrumb labels
- [ ] Test drafts: name-only draft on step 1 → URL switches to edit → add incomplete tickets on step 2 → draft save again (no duplicates) → close the tab → reopen from the list → publish; check that the draft is invisible as a member and as anon until published (AC 6b, 10b–10d, 38a–38i)
- [ ] Test manually: create a paid event with 2 tickets (one *Múltiple*), coupons, a form and 2 methods, then edit it and remove a ticket and a coupon; test a free event with no methods; test the edge cases (stale discipline, scenario or method; nonexistent id; RPC failure; oversize banner; unsaved-changes guard)
- [ ] Run `npm run lint` and `npm run build`
- [ ] Update `projectspec/03-project-structure.md`

---

## Non-Functional Requirements

- **Security**:
  - RLS is the enforcement layer. `guardar_evento_completo` is **security invoker** (never definer) and re-checks the admin/trainer role, tenant ownership of the form and of the bundle events, and ticket ownership on upsert.
  - `tenant_id`, `evento_id` and `creado_por` are forced server-side. Client-sent values for them are ignored.
  - Coupon codes are never readable by `anon` or regular members. The purchase phase must validate codes through a SECURITY DEFINER RPC that returns only the discount.
  - Snapshots are built client-side from data the admin can already read. The RPC validates the snapshot shape (`id` and `nombre` present, correct types), but an admin cannot gain access to anything through a forged snapshot.
  - Banner upload is restricted to `orgs/{tenantId}/eventos/` for the tenant's admins and trainers. The file type and size (5 MB) are validated client-side.
  - Markdown `descripcion_larga` renders through the existing `react-markdown` component, never `dangerouslySetInnerHTML`.
- **Performance**:
  - The wizard makes one parallel load (`Promise.all`) of 6 option lists plus the event. It makes no network calls while typing.
  - The preview uses memoized adapters (`useMemo` on `draft`). Text inputs update the preview synchronously; use `useDeferredValue` for `descripcion_larga` if Markdown rendering lags.
  - Save is one RPC round trip, plus an optional banner upload.
  - Indexes: `(evento_id, orden)` on tickets, GIN on `eventos_id_bundle` (for the future "which bundles include this event" lookup), `(evento_id, cupon)` unique on coupons.
- **Accessibility**:
  - Stepper: `<ol>` with `aria-label`, `aria-current="step"`, and error state conveyed as text ("Revisar"), not only color.
  - Every input has a `<label>`. Row inputs have indexed `aria-label`s ("Nombre de la entrada 2", "Código del cupón 1 de la entrada 2"). Invalid fields have `aria-invalid` and `aria-describedby` pointing to their error.
  - Focus moves to the step heading (`h2`, `tabIndex={-1}`) on step change, and to the first invalid field on a failed validation.
  - Radio groups (tipo de entrada, vista previa) are native radios or `role="radiogroup"` with arrow keys. Selectable payment-method cards are real checkboxes.
  - Modals (scenario, form preview, leave without saving, delete ticket) follow the existing pattern: `role="dialog"`, `aria-modal`, focus on open, `Escape` closes unless submitting.
- **Error handling**:
  - Field and row validation errors are shown inline next to the field. Step-level errors appear in the stepper.
  - Load errors show a full error state with "Reintentar". A not-found event shows its own empty state.
  - Save errors: the mapped `EventoServiceError` message is shown in a `role="alert"` block, and the draft is preserved. There is no toast system; do not add one.
  - Hooks log unexpected errors with `console.error` before surfacing them.
