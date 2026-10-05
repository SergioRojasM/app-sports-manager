# US-0121 — Team Events Management (Phase 4: Ticket Purchase, "Mis Entradas" and Purchase Validation)

## ID
US-0121

## Name
Team events module, phase 4: end-to-end ticket purchase for logged-in users and guests. It covers:
- a four-step checkout inside the existing tickets modal: ticket → data → payment → confirmation;
- ticket PDF download;
- a portal **"Mis Entradas"** page, where guests see their tickets after creating an account with the same email;
- an admin **"Compras"** page to validate or reject payments;
- the cancellation policy;
- a notifications **outbox table**, filled but not sent.

## As a
- Visitor (guest, no account) or logged-in portal user who wants a ticket for an event.
- Tenant administrator / trainer who must validate the payments.

## I Want
- As a buyer: pick a ticket, fill in the event's data form, pay with one of the event's payment methods by uploading proof, and get a downloadable PDF ticket.
- As a registered buyer: find all my tickets in "Mis Entradas".
- As an admin: see every purchase of my event and confirm or reject its payment.

## So That
Events stop being discovery-only (US-0120): teams can actually sell and control access, and buyers (including people without an account) can get a ticket in one sitting.

---

## Description

### Current State
- **US-0118 / US-0119: event data.** `eventos` holds:
  - `cupo_maximo`, `reserva_antelacion_horas`, `cancelacion_antelacion_horas`;
  - `omitir_confirmacion_compra` (auto-confirm purchases);
  - `formulario_id` (access form);
  - `metodos_pago` (snapshots of the tenant's methods).

  `evento_entradas` holds the ticket types (`sencilla` | `multiple` + `eventos_id_bundle`, `valor`, sale window). `evento_entrada_cupones` holds percentage coupons, readable only by staff.
- **US-0120: entry points.** `EventoEntradasModal` lists the ticket options from `eventos.precio` and ends in a **disabled "Continuar"** (`onContinuar` seam). `ObtenerEntradaModal` offers *Crear cuenta gratis / Ya tengo cuenta / Continuar sin registro*; the guest path opens the modal in `invitado` mode.
- **Nothing is persisted.** No purchase, ticket or attendee table exists, no PDF or QR library is installed, and there is no transactional email infrastructure (only Supabase Auth emails).
- **Reusable patterns:**
  - subscription payments: `pagos` with `pendiente | validado | rechazado`, `comprobante_path`, `motivo_rechazo`, validated by staff;
  - `FormularioSeccionesGrouped` renders a form template's fields; `FORMULARIO_PERFIL_CAMPOS` lists the requestable profile fields;
  - `storageService.getSignedUrl`, and pg_cron jobs.
- **Storage constraint (checked in the DB).** In the `org-assets` bucket, `event_banner_read` lets **any authenticated user** read `orgs/{t}/eventos/**`, and `org_member_read` lets **any member** read `orgs/{t}/**`. Purchase files must therefore **not** live under `orgs/`.
- **Deleting events.** `deleteEvento` is a hard delete (US-0118 flagged it for this phase).
- **Form templates are not public and are mutable.** `formularios_plantillas` / `formulario_plantilla_esquema` are granted only to `authenticated`, so a guest cannot read the event's form. The public event projection omits `formulario_id`, and an admin can edit a template after tickets were sold.

### Product decisions for this phase
| Topic | Decision |
|---|---|
| Quantity | **One ticket per purchase, for one attendee (the buyer)**, for guests and registered users alike. A person (identified by email) can hold **at most one live ticket per event**. |
| *Múltiple* tickets | Buying a *Múltiple* ticket issues **one ticket per event**: this event plus every event in `eventos_id_bundle`. That is how a buyer gets two or more tickets in a single purchase. Every included event must be purchasable and have capacity, and the buyer must not already hold a ticket there. Otherwise the whole purchase fails. |
| *Múltiple* tickets and forms | A *Múltiple* purchase only asks for the form of the event the ticket belongs to (one set of answers per purchase). So a bundle may only include events **without a form or with the same form**. The wizard disables the others ("Formulario distinto") and shows a notice; `guardar_evento_completo` rejects them on publish (`BUNDLE_FORMULARIO_DISTINTO` / `FORMULARIO_EN_PAQUETE_DISTINTO`). Migration `20261002120000_eventos_bundle_formulario.sql`. |
| Cash | **Not allowed.** Methods with `tipo = 'efectivo'` are never offered at checkout, and the server rejects them. There is no "pay at the event". |
| Buyer data | Always required: **full name, email, date of birth**. Everything else comes from the event's form: its `perfil_campos_requeridos` and its fields. The admin decides by editing the form. No ID document unless the form asks for it. |
| Event form | The event owns a **versioned JSON snapshot** of its form (`evento_formularios`), written when the event is saved. Answers are stored in `evento_formulario_respuestas`, tied to the snapshot version they answered. Checkout, validation and "Ver datos" **never read the templates**. A template edit reaches an event only when the event is saved again. |
| Email | **No email is sent.** Each notification is written to the `evento_notificaciones` outbox table with `estado = 'pendiente'`. A later phase will send them. |
| Ticket download | A **PDF** (one page per ticket), generated in the browser, with a QR code and an access code. |
| Cancellation | If `cancelacion_antelacion_horas` is **null, the ticket cannot be cancelled and there is no refund**. This is stated in the checkout, the ticket, the PDF and "Mis Entradas". If it is set, the registered buyer can cancel until `fecha_hora − N h`; any refund is handled by the organizer outside the platform. |
| Guest access afterwards | **No token links and no "recover my tickets".** A guest downloads the PDF on the confirmation screen. To see the ticket or its status later, they **create an account with the same email**; on first entry to "Mis Entradas" their guest purchases are linked to the account. |

### Customer journeys

**Common start (built in US-0120).** The buyer opens an event card or page and clicks **"Obtener entrada"**.
- **With a session:** the tickets modal opens (`usuario` mode).
- **Anonymous:** the "Obtén tu entrada" modal opens.
  - "Ya tengo cuenta" / "Crear cuenta gratis" returns to `/portal/eventos/{id}?entradas=1` with the modal open (`usuario` mode).
  - "Continuar sin registro" opens the modal in `invitado` mode on `/eventos/{id}`.

**A. Registered user**
1. **Step 1, Entrada:** choose the ticket type; optional coupon; see the cancellation policy and the total. → "Continuar"
2. **Step 2, Tus datos:**
   - name, email (read-only: the account email) and date of birth are prefilled from `usuarios`; any missing value must be entered;
   - then the requested profile fields and the event form's fields, if any. → "Continuar"
3. **Step 3, Pago** (skipped when the total is 0): order summary; choose a payment method (non-cash only); follow its instructions; attach the proof. → "Confirmar compra"
4. **Step 4, Confirmación:**
   - **"¡Entrada confirmada!"** (free ticket or `omitir_confirmacion_compra`), or **"Compra recibida: el organizador validará tu pago"**;
   - ticket code(s); **"Descargar entrada (PDF)"**; **"Ver mis entradas"**.
5. **Later:** the admin validates or rejects the payment. The buyer follows the status in **"Mis Entradas"**, where they can re-upload the proof when rejected, cancel if the policy allows, or download the PDF.

**B. Guest**
1. **Step 1, Entrada:** same as A, plus the guest note: "Estás comprando como invitado. Descarga tu entrada al finalizar; para verla después, crea una cuenta con el mismo correo."
2. **Step 2, Tus datos:** full name, email (typed twice), date of birth, then the event's requested profile fields and form fields.
3. **Step 3, Pago:** same as A.
4. **Step 4, Confirmación:** same status message, plus:
   - **"Descargar entrada (PDF)"**;
   - a prominent notice: *"Guarda tu entrada. Para volver a verla o consultar el estado de tu pago, crea una cuenta con **{email}**."* and a **"Crear mi cuenta"** button → `/auth/signup?next=/portal/mis-entradas`.

   A guest cannot re-upload a proof or cancel without an account.
5. After signing up and confirming that email, "Mis Entradas" shows the guest purchases.

### Proposed Changes

#### Purchase states
| `evento_compras.estado` | Meaning | Tickets (`evento_tickets.estado`) |
|---|---|---|
| `pendiente_pago` | Created by `iniciar_compra_evento`; files not yet attached. Holds capacity for **30 min**. | `pendiente` |
| `en_validacion` | Proof attached; waiting for staff. | `pendiente` |
| `confirmada` | Free, auto-confirmed (`omitir_confirmacion_compra`), or validated by staff. | `activa` |
| `rechazada` | Staff rejected the payment (`motivo_rechazo` required). Capacity is released. | `anulada` |
| `cancelada` | The buyer cancelled within the policy. Capacity is released. | `anulada` |
| `expirada` | Stayed in `pendiente_pago` for more than 30 min (cron or lazy expiry). | `anulada` |

```
pendiente_pago ─(finalizar; total 0 or omitir_confirmacion_compra)─▶ confirmada ─(cancelar, within policy)─▶ cancelada
      │                                                                   ▲
      ├─(finalizar, paid)─▶ en_validacion ─(validar)──────────────────────┘
      │                        ├─(rechazar)─▶ rechazada ─(reenviar comprobante)─▶ en_validacion
      │                        └─(cancelar, within policy)─▶ cancelada
      └─(30 min)─▶ expirada
```
A free purchase whose form has no image fields is confirmed directly inside `iniciar_compra_evento`, with no second call.

#### Checkout UI: `EventoEntradasModal` becomes a stepper
Same shell and accessibility as today: `role="dialog"`, focus management, `Escape` closes except while submitting. On mobile it becomes full-screen with a sticky footer (`Atrás` / primary action).
- **Stepper** (`EventoCompraStepper`): "Entrada › Datos › Pago › Listo". The "Pago" step is hidden when the total is 0. `aria-current="step"`.
- **Step 1, `EventoCompraPasoEntrada`**:
  - Radio list of the **sellable** tickets, read from `evento_entradas` (not from `eventos.precio`), each with name, price ("Gratis") and *Múltiple* badge. A ticket is sellable when:
    - `nombre` and `valor` are not null;
    - now is inside `[valida_desde, valida_hasta]`;
    - and the event is not within `reserva_antelacion_horas` of its start.
  - A *Múltiple* ticket shows "Incluye acceso a este evento y a: {names}". Names come from the readable bundle events; unreadable ones show "N eventos más".
  - Coupon input ("¿Tienes un cupón?"): uppercased as typed; **"Aplicar"** calls `validar_cupon_evento`, then shows "20 % · $50.000 → $40.000" or the error. Disabled for free tickets.
  - Cancellation policy line, always visible:
    - null → **"Esta entrada no admite cancelación ni reembolso."**
    - set → "Puedes cancelar hasta {N} h antes del evento. El reembolso lo gestiona el organizador."
  - Total.
  - Blocking states:
    - no sellable ticket → "La venta de entradas no está disponible para este evento.";
    - the event starts within `reserva_antelacion_horas` → "La venta cerró {N} h antes del evento.";
    - a registered user who already holds a live ticket → "Ya tienes una entrada para este evento." + "Ver mis entradas".
- **Step 2, `EventoCompraPasoDatos`**:
  - **Fixed fields:**
    - `Nombre completo` (required, max 150);
    - `Correo` (required, valid email, max 254; guests type it twice and both must match; registered users see their account email read-only);
    - `Fecha de nacimiento` (required, a past date after 1900-01-01).

    Registered users get them prefilled from `usuarios` (`nombre` + `apellido`, `fecha_nacimiento`). Values entered here are stored only in the purchase and **do not update the profile**.
  - **Profile fields** requested by the form snapshot (`perfil_campos_requeridos`, minus the fixed ones): registered users get them prefilled when present (from `usuarios` / `perfil_deportivo`) and editable; guests type them. Labels come from `FORMULARIO_PERFIL_CAMPOS`.
  - **Form fields:** when the event has a `vigente` snapshot in `evento_formularios` (readable by guests too), render its `campos` with the existing `FormularioSeccionesGrouped` (adapted from the snapshot; header rows via `FormularioHeaderEditor`, read-only), using the same client validation as bookings. **Image** fields keep the chosen `File` in memory; it is uploaded after `iniciar_compra_evento` (see flow).
- **Step 3, `EventoCompraPasoPago`** (only when the total is greater than 0):
  - Order summary: event, ticket, coupon, total.
  - Radio cards of `eventos.metodos_pago` **excluding `tipo = 'efectivo'`**, reusing `EventoMetodoPagoCard` (copy value, http(s)-only link, comments).
  - If no non-cash method exists: "Este evento no tiene métodos de pago en línea disponibles. Contacta al organizador." and "Confirmar compra" disabled.
  - **Proof of payment** file input: JPEG, PNG, WebP or PDF, max 5 MB, required. It shows the file name and size, and has a "Quitar" action.
- **Step 4, `EventoCompraPasoConfirmacion`**: status icon and title (confirmed / in validation), the ticket list (event, code; one line per event for *Múltiple*), **"Descargar entrada (PDF)"**, then:
  - registered user: "Ver mis entradas" → `/portal/mis-entradas`;
  - guest: the create-account notice and button (see journey B).

  Closing the modal after a successful purchase triggers no further request.

**Submit flow** (`useEventoCompra`), on "Confirmar compra" (or "Obtener entrada gratis" when the total is 0):
1. Call `iniciar_compra_evento(...)` → `{ compra_id, tenant_id, estado, requiere_archivos, tickets }`.
2. If `requiere_archivos`, upload the proof and any form images to `compras-eventos/{tenantId}/{compraId}/{kind}-{n}.{ext}` (`org-assets` bucket).
3. Call `finalizar_compra_evento(compra_id, comprobante_path, archivos)` → final `estado` and `tickets`.
4. Show step 4.

If step 2 or 3 fails, the modal keeps the data, shows the error, and **"Reintentar"** repeats only the failed part with the same `compra_id`, while it is younger than 30 min. After that it shows "Tu reserva de cupo expiró. Vuelve a intentarlo." and restarts at step 1. While submitting, every control is disabled and the button reads "Procesando…".

#### Ticket PDF: `src/lib/portal/eventos-ticket-pdf.ts`
- Built client-side with **`jspdf`** and **`qrcode`** (new dependencies; add `@types/qrcode` if needed).
- A5 portrait, **one page per ticket** (a *Múltiple* purchase yields one file with several pages). File name `entrada-{evento-slug}-{codigo}.pdf`.
- Content:
  - "GRIT Arena", organization (`nombre_tenant`), event name, date and time in Bogotá (or "Fecha por definir"), place (venue name or meeting point; a URL-valued meeting point is shown as the URL);
  - ticket type, attendee name and email, **code**, purchase date, total paid;
  - the cancellation policy line.
- **State rules:**
  - `activa` → QR encoding the code, and "Entrada válida".
  - `pendiente` → **no QR**, with a diagonal/banner "PENDIENTE DE VALIDACIÓN — No válida para ingreso".
  - `anulada` → the download is not offered.
- Input is the `TicketPdfData[]` view model, so the confirmation step (guest data from the RPC response) and "Mis Entradas" (DB data) use the same generator.

#### Portal "Mis Entradas": `/portal/mis-entradas`
- Route `src/app/portal/(atleta)/mis-entradas/page.tsx`, same group and self-scoping as "Mis Reservas".
- Global menu item **"Mis Entradas"** (icon `confirmation_number`) after "Mis Reservas"; breadcrumb label "Mis entradas".
- On load it first calls `vincular_compras_invitado()` (linking guest purchases made with the verified account email), then lists the user's purchases with their tickets.
- Tabs **Próximas** (events with `fecha_hora >= now()` or undated) / **Pasadas**; also an estado filter.
- Card per purchase:
  - event banner or placeholder, name, organization, date, place;
  - ticket type, total, payment method name;
  - `EventoCompraEstadoBadge`;
  - the ticket codes (one line per event for *Múltiple*);
  - `motivo_rechazo` when `rechazada`;
  - the cancellation policy line.
- Actions:
  - **"Descargar PDF"**: when `pendiente_pago` is not the state and at least one ticket is not `anulada`.
  - **"Reenviar comprobante"**: when `rechazada`. It opens a small modal with the file input (same limits), uploads to the same folder, and calls `reenviar_comprobante_compra_evento`.
  - **"Cancelar"**: when `en_validacion` or `confirmada` and the policy allows (see RPC). It opens a confirmation dialog repeating the policy.
  - **"Ver evento"**: link to `/portal/eventos/{id}`.
- Empty state: "Aún no tienes entradas." + "Explorar eventos" → `/portal/eventos`.
- The portal event page (`/portal/eventos/{id}`) shows a note **"Ya tienes una entrada para este evento · Ver mis entradas"** instead of opening the checkout when the user holds a live ticket for it (read from `evento_tickets`, RLS owner).

#### Admin "Compras": `/portal/orgs/{tenantId}/gestion-eventos/{eventoId}/compras`
- Route under `(administrador)`. New `EventoActionsMenu` item **"Ver compras"** (icon `receipt_long`) for published events. Breadcrumb "Eventos › Evento › Compras".
- **Header:** event name, "Vendidas: X / {cupo_maximo | ilimitado}" (tickets not `anulada` for this event), and stats cards (*En validación*, *Confirmadas*, *Ingresos confirmados*).
- **Table** (stacked below `md`, 20 per page), with filters (estado, search by name or email):
  - Comprador (name, email, "Invitado" / "Registrado" tag), Entrada (+ *Múltiple* badge), Total (+ coupon), Método, Estado, Fecha, Acciones.
- **Actions:**
  - **"Ver comprobante"** (signed URL, 300 s; images inline, PDFs in a new tab).
  - **"Ver datos"**: a modal with the fixed data, plus the profile fields and form answers from `evento_formulario_respuestas`, labelled with the snapshot version they reference (never the current template). Image answers are opened through signed URLs.
  - **"Validar pago"** (`en_validacion`): a confirmation, then `validar_compra_evento(..., true)`.
  - **"Rechazar"** (`en_validacion`): a modal with a required `motivo` (max 500), then `validar_compra_evento(..., false, motivo)`.
- Errors show inline in the modal. On success the list refreshes.

#### Other changes
- **Wizard step 3 (`EventoMetodosPagoStep`):** cash methods show the tag "No disponible para compra en línea". A paid event whose only selected methods are cash shows the warning "Los compradores no podrán pagar en línea". Publishing is **not** blocked; the checkout handles it.
- **Wizard step 1:** helper under `cancelacion_antelacion_horas`: "Déjalo vacío si las entradas no admiten cancelación ni reembolso."
- **`deleteEvento`:** deleting an event that has purchases or tickets fails with a foreign-key error (`on delete restrict`), mapped to *"No puedes eliminar un evento con entradas vendidas. Cancélalo en su lugar."* The `EliminarEventoModal` shows it inline.
- The "próximamente" notice and the `onContinuar` seam in `EventoEntradasModal` are removed; the modal becomes the checkout.
- **No email promised.** Nothing is emailed in this phase, so the `ObtenerEntradaModal` hint becomes "Sin cuenta podrás descargar tu entrada al finalizar. Para verla después en el portal, crea una cuenta con el mismo correo." (it was "…te las enviaremos a tu correo"). The guest note in step 1 changes the same way.
- **Public listing projection.** `listEventosPublicados` adds `cancelacion_antelacion_horas` (`EventoPublicoListItem.cancelacionAntelacionHoras`), so the checkout has the policy when it is opened from a card. `omitir_confirmacion_compra` and `formulario_id` stay out of it.

---

## Database Changes

### Migration 0: `supabase/migrations/20261001115000_evento_formularios.sql`
```sql
begin;

-- Versioned JSON snapshot of the event's form, independent of the templates
create table public.evento_formularios (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null references public.tenants(id) on delete cascade,
  evento_id                 uuid not null references public.eventos(id) on delete cascade,
  formulario_plantilla_id   uuid references public.formularios_plantillas(id) on delete set null, -- provenance only
  nombre                    varchar(150) not null,
  perfil_campos_requeridos  jsonb not null default '[]'::jsonb,  -- array of profile keys
  campos                    jsonb not null default '[]'::jsonb,  -- active esquema rows ordered by orden:
                                                                  -- campo_nombre, campo_etiqueta, campo_tipo, campo_lista_valores,
                                                                  -- campo_obligatorio, campo_placeholder, seccion_tipo, seccion_descripcion, orden
  contenido_hash            text not null,                       -- md5(template id + content)
  vigente                   boolean not null default true,
  created_at                timestamptz not null default timezone('utc', now())
);

-- At most one current snapshot per event; older versions are kept (answers reference them)
create unique index uq_evento_formularios_vigente on public.evento_formularios (evento_id) where vigente;
create index idx_evento_formularios_evento on public.evento_formularios (evento_id);

alter table public.evento_formularios enable row level security;
revoke all on public.evento_formularios from anon, authenticated;
grant select on public.evento_formularios to anon, authenticated;
grant insert, update on public.evento_formularios to authenticated;   -- no delete

-- Readable whenever the event is (eventos RLS applies inside the subquery), same as evento_entradas
create policy evento_formularios_select_anon on public.evento_formularios for select to anon
  using (exists (select 1 from public.eventos e where e.id = evento_formularios.evento_id));
create policy evento_formularios_select_authenticated on public.evento_formularios for select to authenticated
  using (exists (select 1 from public.eventos e where e.id = evento_formularios.evento_id));
create policy evento_formularios_insert_trainer_admin on public.evento_formularios for insert to authenticated
  with check (tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t));
create policy evento_formularios_update_trainer_admin on public.evento_formularios for update to authenticated
  using (tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t))
  with check (tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t));

commit;
```
In the same migration:
- **Re-create `guardar_evento_completo`** (same signature, `security invoker`, same grants), with a new step after syncing tickets and coupons:
  - `formulario_id` null → `update evento_formularios set vigente = false where evento_id = … and vigente`;
  - otherwise, build the snapshot from the template (`nombre`, `perfil_campos_requeridos`, active esquema rows ordered by `orden`) and its `contenido_hash`. If the `vigente` row has the same hash, do nothing. Otherwise retire it and insert a new `vigente` row.

  Snapshots are never updated in place or deleted.
- **Backfill:** one `vigente` snapshot for every existing event with a `formulario_id`.

### Migration 1: `supabase/migrations/20261001120000_eventos_compras.sql`
```sql
begin;

create table public.evento_compras (
  id                          uuid primary key default gen_random_uuid(),
  tenant_id                   uuid not null references public.tenants(id) on delete cascade,
  evento_id                   uuid not null references public.eventos(id) on delete restrict,
  entrada_id                  uuid references public.evento_entradas(id) on delete set null,
  comprador_usuario_id        uuid references public.usuarios(id) on delete set null,
  comprador_nombre            varchar(150) not null,
  comprador_email             varchar(254) not null,
  comprador_fecha_nacimiento  date not null,
  -- form data lives in evento_formulario_respuestas, not here
  entrada_nombre              varchar(100) not null,                -- snapshot
  entrada_tipo                varchar(20) not null,
  valor_base                  numeric(12,2) not null,
  cupon_codigo                varchar(30),
  descuento_pct               numeric(5,2),
  total                       numeric(12,2) not null,
  metodo_pago                 jsonb,                                -- EventoMetodoPagoSnapshot, null when total = 0
  comprobante_path            text,
  estado                      varchar(20) not null default 'pendiente_pago',
  motivo_rechazo              varchar(500),
  validado_por                uuid references public.usuarios(id) on delete set null,
  validado_at                 timestamptz,
  cancelado_at                timestamptz,
  created_at                  timestamptz not null default timezone('utc', now()),
  updated_at                  timestamptz not null default timezone('utc', now()),

  constraint evento_compras_estado_ck check (estado in
    ('pendiente_pago','en_validacion','confirmada','rechazada','cancelada','expirada')),
  constraint evento_compras_email_ck check (comprador_email = lower(btrim(comprador_email)) and comprador_email like '%_@_%._%'),
  constraint evento_compras_nombre_ck check (length(btrim(comprador_nombre)) > 0),
  constraint evento_compras_nacimiento_ck check (comprador_fecha_nacimiento > date '1900-01-01'),
  constraint evento_compras_montos_ck check (valor_base >= 0 and total >= 0 and total <= valor_base),
  constraint evento_compras_descuento_ck check (descuento_pct is null or (descuento_pct > 0 and descuento_pct <= 100)),
  constraint evento_compras_tipo_ck check (entrada_tipo in ('sencilla','multiple')),
  constraint evento_compras_rechazo_ck check (estado <> 'rechazada' or length(btrim(coalesce(motivo_rechazo,''))) > 0),
  constraint evento_compras_metodo_ck check (total = 0 or metodo_pago is not null)
);

create index idx_evento_compras_evento_estado on public.evento_compras (evento_id, estado);
create index idx_evento_compras_tenant_created on public.evento_compras (tenant_id, created_at desc);
create index idx_evento_compras_comprador on public.evento_compras (comprador_usuario_id) where comprador_usuario_id is not null;
create index idx_evento_compras_email_sin_usuario on public.evento_compras (comprador_email) where comprador_usuario_id is null;
create index idx_evento_compras_pendientes on public.evento_compras (created_at) where estado = 'pendiente_pago';

create table public.evento_tickets (
  id                uuid primary key default gen_random_uuid(),
  compra_id         uuid not null references public.evento_compras(id) on delete cascade,
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  evento_id         uuid not null references public.eventos(id) on delete restrict,
  usuario_id        uuid references public.usuarios(id) on delete set null,
  asistente_nombre  varchar(150) not null,
  asistente_email   varchar(254) not null,
  codigo            varchar(12) not null unique,        -- e.g. 'EV-7K3Q9XPM', unambiguous alphabet, generated server-side
  estado            varchar(20) not null default 'pendiente',
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),
  constraint evento_tickets_estado_ck check (estado in ('pendiente','activa','anulada'))
);

-- One live ticket per person (email) per event
create unique index uq_evento_tickets_evento_email on public.evento_tickets (evento_id, asistente_email)
  where estado <> 'anulada';
create index idx_evento_tickets_evento_estado on public.evento_tickets (evento_id, estado);
create index idx_evento_tickets_usuario on public.evento_tickets (usuario_id) where usuario_id is not null;

-- Answers to the event form, tied to the snapshot version they answered
create table public.evento_formulario_respuestas (
  id                    uuid primary key default gen_random_uuid(),
  compra_id             uuid not null unique references public.evento_compras(id) on delete cascade,
  tenant_id             uuid not null references public.tenants(id) on delete cascade,
  evento_id             uuid not null references public.eventos(id) on delete restrict,
  evento_formulario_id  uuid not null references public.evento_formularios(id) on delete restrict,
  datos_perfil          jsonb not null default '{}'::jsonb,   -- requested profile fields
  respuestas            jsonb not null default '{}'::jsonb,   -- { campo_nombre: value } for non-image fields
  archivos              jsonb not null default '{}'::jsonb,   -- { campo_nombre: path } for imagen fields
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now())
);
create index idx_evento_formulario_respuestas_evento on public.evento_formulario_respuestas (evento_id);

-- Notification outbox: filled by the RPCs, NOT sent in this phase
create table public.evento_notificaciones (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  compra_id           uuid not null references public.evento_compras(id) on delete cascade,
  tipo                varchar(30) not null,
  destinatario_email  varchar(254) not null,
  payload             jsonb not null default '{}'::jsonb,
  estado              varchar(20) not null default 'pendiente',
  created_at          timestamptz not null default timezone('utc', now()),
  enviada_at          timestamptz,
  constraint evento_notificaciones_tipo_ck check (tipo in
    ('compra_recibida','compra_confirmada','compra_rechazada','compra_cancelada')),
  constraint evento_notificaciones_estado_ck check (estado in ('pendiente','enviada','error'))
);
create index idx_evento_notificaciones_pendientes on public.evento_notificaciones (created_at) where estado = 'pendiente';

create trigger evento_compras_set_updated_at before update on public.evento_compras
  for each row execute function public.set_updated_at();
create trigger evento_tickets_set_updated_at before update on public.evento_tickets
  for each row execute function public.set_updated_at();
create trigger evento_formulario_respuestas_set_updated_at before update on public.evento_formulario_respuestas
  for each row execute function public.set_updated_at();

-- RLS: reads only; every write goes through SECURITY DEFINER RPCs
alter table public.evento_compras enable row level security;
alter table public.evento_tickets enable row level security;
alter table public.evento_notificaciones enable row level security;
alter table public.evento_formulario_respuestas enable row level security;

revoke all on public.evento_compras, public.evento_tickets, public.evento_notificaciones,
  public.evento_formulario_respuestas from anon, authenticated;
grant select on public.evento_compras, public.evento_tickets, public.evento_formulario_respuestas to authenticated;
-- evento_notificaciones: no grants at all (service/cron use only)

create policy evento_compras_select_owner_or_staff on public.evento_compras for select to authenticated
  using (
    comprador_usuario_id = auth.uid()
    or tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  );

create policy evento_tickets_select_owner_or_staff on public.evento_tickets for select to authenticated
  using (
    usuario_id = auth.uid()
    or tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
  );

create policy evento_formulario_respuestas_select_owner_or_staff on public.evento_formulario_respuestas
  for select to authenticated
  using (
    tenant_id in (select t.tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user() t)
    or exists (select 1 from public.evento_compras c
               where c.id = evento_formulario_respuestas.compra_id and c.comprador_usuario_id = auth.uid())
  );

commit;
```

### Migration 2: `supabase/migrations/20261001120100_eventos_compras_rpc.sql`
All functions are `security definer`, `set search_path = public`, and validate everything themselves (they bypass RLS). They raise `exception '<CODE>'` with the errcodes listed in *API*. Shared helpers (`private`, no grants):
- `_evento_visible_para_compra(p_evento_id)` → boolean. Requires `activo and not borrador and estado = 'confirmado'` and `(fecha_hora is null or fecha_hora > now())`, plus:
  - `publico`; or
  - `auth.uid()` is a non-pending member of the tenant (`get_member_tenants_for_authenticated_user()`).
- `_expirar_compras_pendientes(p_evento_ids uuid[])`: marks `pendiente_pago` purchases older than 30 min as `expirada` and their tickets as `anulada`.
- `_generar_codigo_ticket()`: `'EV-' || 8 chars` from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` via `gen_random_bytes`, retried on collision.
- `_encolar_notificacion(p_compra_id, p_tipo)`: inserts into `evento_notificaciones` (payload: event name/date, ticket codes, estado, total, `motivo_rechazo`).

| Function | Grants | Behavior |
|---|---|---|
| `validar_cupon_evento(p_evento_id uuid, p_entrada_id uuid, p_codigo text) → jsonb {valido, descuento_pct, total, motivo}` | anon, authenticated | Event visible and ticket belongs to it with `valor > 0`; coupon `upper(btrim(p_codigo))` of that ticket, complete, inside `[valido_desde, valido_hasta]`. **Never reveals other codes.** Unknown code → `{valido:false, motivo:'CUPON_INVALIDO'}`. |
| `iniciar_compra_evento(p_evento_id uuid, p_entrada_id uuid, p_cupon text, p_metodo_pago_id uuid, p_comprador jsonb, p_datos_perfil jsonb, p_formulario_respuesta jsonb) → jsonb` | anon, authenticated | See steps below. |
| `finalizar_compra_evento(p_compra_id uuid, p_comprobante_path text, p_archivos jsonb) → jsonb` | anon, authenticated | See steps below. |
| `reenviar_comprobante_compra_evento(p_compra_id uuid, p_comprobante_path text) → jsonb` | authenticated | Owner only (`comprador_usuario_id = auth.uid()`), estado `rechazada`. Checks the path prefix and that the object exists. Re-checks, for every event of the purchase: `_evento_visible_para_compra`, the unique-email rule and capacity (→ `ENTRADA_DUPLICADA` / `CUPO_AGOTADO`). Then `en_validacion` (or `confirmada` if `omitir_confirmacion_compra`), tickets `pendiente` (or `activa`), `motivo_rechazo = null`, and enqueues the matching notification. |
| `cancelar_compra_evento(p_compra_id uuid) → jsonb` | authenticated | Owner only; estado `en_validacion` or `confirmada`. Main event: `cancelacion_antelacion_horas is null` → `CANCELACION_NO_PERMITIDA` (**no cancellation, no refund**). Otherwise allowed when `fecha_hora is null or now() <= fecha_hora - make_interval(hours => N)`, else the same error. Sets `cancelada`, `cancelado_at`, tickets `anulada`, and enqueues `compra_cancelada`. A *Múltiple* purchase is cancelled as a whole using the **main** event's policy. |
| `validar_compra_evento(p_compra_id uuid, p_aprobar boolean, p_motivo text) → jsonb` | authenticated | Caller is admin or trainer of the purchase's tenant, else `FORBIDDEN`. Estado must be `en_validacion`, else `ESTADO_INVALIDO`. Approve → `confirmada`, tickets `activa`, `validado_por/at`, `compra_confirmada`. Reject → requires `p_motivo` (1–500 chars); `rechazada`, tickets `anulada`, `compra_rechazada`. |
| `vincular_compras_invitado() → integer` | authenticated | Only when `auth.users.email_confirmed_at is not null` for `auth.uid()`. Sets `comprador_usuario_id = auth.uid()` on purchases (and `usuario_id` on their tickets) with `comprador_usuario_id is null and comprador_email = lower(auth email)`. Returns the number linked. Idempotent. |
| `expirar_compras_evento_pendientes() → integer` | none (cron) | `_expirar_compras_pendientes` over all events. |

**`iniciar_compra_evento` steps**, one transaction:
1. **Buyer.**
   - Authenticated: `email` is forced to the caller's auth email, `comprador_usuario_id = auth.uid()`, and the payload email is ignored.
   - Anonymous: `email` is taken from `p_comprador`, trimmed and lowercased.
   - Validate `nombre` (1–150), a valid `email` (≤ 254) and `fecha_nacimiento` (a date `> 1900-01-01` and `< current_date`), else `DATOS_INVALIDOS`.
2. **Event and ticket.**
   - Lock the event row (`for update`). `_evento_visible_para_compra`, else `EVENTO_NO_DISPONIBLE`.
   - When `fecha_hora` is set and `reserva_antelacion_horas` is not null: `now() <= fecha_hora - N h`, else `VENTA_CERRADA`.
   - The ticket belongs to the event, has non-null `nombre` / `valor`, and now is inside its sale window, else `ENTRADA_INVALIDA` / `VENTA_CERRADA`.
3. **Coupon (optional).**
   - Same rules as `validar_cupon_evento`, else `CUPON_INVALIDO`.
   - `total = round(valor * (1 - pct/100))`.
4. **Payment.**
   - `total > 0` requires `p_metodo_pago_id` to be one of `eventos.metodos_pago[].id` with `tipo <> 'efectivo'`, else `METODO_PAGO_INVALIDO`.
   - The snapshot is stored in `metodo_pago`.
   - `total = 0` stores `metodo_pago = null`.
5. **Form** (from the event's `vigente` row in `evento_formularios`; the templates are never read).
   - When a snapshot exists: every `campo_obligatorio` field in `campos` and every `perfil_campos_requeridos` key must have a non-empty value, else `FORMULARIO_INCOMPLETO`.
   - `imagen`-type fields are checked in `finalizar_compra_evento` instead.
   - Values for fields that are not in the snapshot are dropped.
6. **Target events.**
   - `sencilla` → `[p_evento_id]`.
   - `multiple` → `[p_evento_id] + eventos_id_bundle`. Every bundle event must be of the same tenant and pass `_evento_visible_para_compra`, else `BUNDLE_NO_DISPONIBLE`.
   - Lock them all in id order.
7. Call `_expirar_compras_pendientes(targets)`.
8. **Per target event:**
   - no ticket with `asistente_email = email and estado <> 'anulada'`, else `ENTRADA_DUPLICADA` (message includes the event name);
   - when `cupo_maximo` is not null: `count(tickets where estado <> 'anulada') < cupo_maximo`, else `CUPO_AGOTADO`.
9. Insert the purchase (`pendiente_pago`) and one ticket per target (`pendiente`, generated `codigo`, `usuario_id` when authenticated). When a snapshot exists, insert the `evento_formulario_respuestas` row (`evento_formulario_id` = the snapshot, `datos_perfil`, `respuestas`).
10. **Free shortcut.** If `total = 0` and the snapshot has no `imagen` fields:
    - the purchase becomes `confirmada`;
    - tickets become `activa`;
    - enqueue `compra_confirmada`.
11. **Return:**
    ```
    { compra_id, tenant_id, estado, requiere_archivos: (total > 0 or snapshot has imagen fields),
      tickets: [{ id, evento_id, evento_nombre, fecha_hora, lugar, nombre_tenant, codigo, estado }],
      cancelacion_antelacion_horas, total, entrada_nombre, comprador_nombre, comprador_email }
    ```
    That is enough to render step 4 and the PDF without another read.

**`finalizar_compra_evento` steps:**
1. **Ownership and state.**
   - Lock the purchase; estado must be `pendiente_pago` and `created_at > now() - interval '30 minutes'`, else `COMPRA_EXPIRADA`.
   - If `comprador_usuario_id is not null`, the caller must be that user, else `FORBIDDEN`.
2. **Files.**
   - Every path in `p_comprobante_path` / `p_archivos` must start with `compras-eventos/{tenant_id}/{compra_id}/` and exist in `storage.objects` (`bucket_id = 'org-assets'`), else `ARCHIVO_INVALIDO`.
   - `total > 0` requires `p_comprobante_path`, else `COMPROBANTE_REQUERIDO`.
   - Required `imagen` fields of the purchase's snapshot must be present in `p_archivos`, else `FORMULARIO_INCOMPLETO`. `p_archivos` (only keys of `imagen` fields in the snapshot) is stored in `evento_formulario_respuestas.archivos`.
3. **State change.**
   - `total = 0` or `omitir_confirmacion_compra` → `confirmada` + tickets `activa` + `compra_confirmada`.
   - Otherwise → `en_validacion` + `compra_recibida`.
4. Return the same shape as `iniciar_compra_evento`.

### Migration 3: `supabase/migrations/20261001120200_eventos_compras_storage_cron.sql`
- **Storage** (bucket `org-assets`, folder **`compras-eventos/{tenantId}/{compraId}/…`**, deliberately outside `orgs/` so that `org_member_read` / `event_banner_read` never expose it):
  - `evento_compra_upload` — `insert` for `anon, authenticated` when `(storage.foldername(name))[1] = 'compras-eventos'` and `public.evento_compra_acepta_archivo((storage.foldername(name))[2]::uuid, (storage.foldername(name))[3]::uuid)`. This SECURITY DEFINER helper returns true when the purchase exists for that tenant and either:
    - it is `pendiente_pago`, created less than 30 min ago, and (`comprador_usuario_id is null` or it equals `auth.uid()`); or
    - it is `rechazada` and `comprador_usuario_id = auth.uid()` (re-upload).
  - `evento_compra_read` — `select` for `authenticated` when the purchase's tenant is in `get_trainer_or_admin_tenants_for_authenticated_user()` or its `comprador_usuario_id = auth.uid()`.
  - **No** `update` / `delete` policies: files are write-once, and re-uploads use new file names.
- **Cron:** `select cron.schedule('expirar-compras-eventos', '*/5 * * * *', 'select public.expirar_compras_evento_pendientes()');`

**Email confirmation (verified):** guest-purchase linking relies on **verified emails**: `vincular_compras_invitado()` only links when `auth.users.email_confirmed_at is not null`. **Production has "Confirm email" enabled** (confirmed by the product owner, 2026-09-30), so an account cannot be activated for an email its owner does not control. In local, `supabase/config.toml` has `[auth.email] enable_confirmations = false`, so signups are auto-confirmed and linking can be tested without an inbox. Keep the `email_confirmed_at` check anyway, as defense in depth, and do not disable email confirmation in production without adding another verification step for linking.

Regenerate the Supabase types if the project keeps a generated `database.types.ts`.

---

## API / Server Actions

### `src/services/supabase/portal/eventos-compras.service.ts` (new): `eventoComprasService`
Uses the browser client. Errors map through a local `mapCompraError` to `EventoCompraServiceError(code, message)`:

| RPC code | `code` | Message (es) |
|---|---|---|
| `EVENTO_NO_DISPONIBLE` | `no_disponible` | "Este evento ya no está disponible para la venta." |
| `VENTA_CERRADA` | `venta_cerrada` | "La venta de esta entrada está cerrada." |
| `ENTRADA_INVALIDA` | `invalid_data` | "La entrada seleccionada no está disponible." |
| `CUPON_INVALIDO` | `cupon_invalido` | "El cupón no es válido para esta entrada." |
| `METODO_PAGO_INVALIDO` | `invalid_data` | "Selecciona un método de pago válido." |
| `DATOS_INVALIDOS` | `invalid_data` | "Revisa tus datos: nombre, correo y fecha de nacimiento." |
| `FORMULARIO_INCOMPLETO` | `invalid_data` | "Completa todos los campos obligatorios del formulario." |
| `ENTRADA_DUPLICADA` | `duplicada` | "Ya existe una entrada para este correo en {evento}. Inicia sesión o crea tu cuenta con ese correo para verla." |
| `CUPO_AGOTADO` | `agotado` | "No quedan cupos para {evento}." |
| `BUNDLE_NO_DISPONIBLE` | `no_disponible` | "Uno de los eventos incluidos en esta entrada ya no está disponible." |
| `COMPRA_EXPIRADA` | `expirada` | "Tu reserva de cupo expiró. Vuelve a intentarlo." |
| `COMPROBANTE_REQUERIDO` / `ARCHIVO_INVALIDO` | `invalid_data` | "Adjunta un comprobante de pago válido." |
| `CANCELACION_NO_PERMITIDA` | `no_cancelable` | "Esta entrada no se puede cancelar." |
| `ESTADO_INVALIDO` | `invalid_state` | "La compra cambió de estado. Recarga la página." |
| `FORBIDDEN` / `42501` | `forbidden` | "No tienes permisos para esta acción." |
| other | `unknown` | "No se pudo completar la operación. Intenta de nuevo." |

The RPC messages carry the event name after a `:` (`CUPO_AGOTADO:Copa Verano`) for the two messages that need it.

| Function | Calls | Returns |
|---|---|---|
| `listEntradasVendibles(eventoId)` | `from('evento_entradas').select('id, tipo_entrada, nombre, valor, valida_desde, valida_hasta, eventos_id_bundle, orden').eq('evento_id', …).not('nombre','is',null).not('valor','is',null).order('orden')` | `EntradaVendible[]` (sale-window filtering in the hook; the server re-validates) |
| `getFormularioEvento(eventoId)` | `from('evento_formularios').select('id, nombre, perfil_campos_requeridos, campos').eq('evento_id', …).eq('vigente', true).maybeSingle()` (RLS: readable event, also for anon) | `EventoFormularioSnapshot \| null` |
| `listNombresEventosBundle(ids)` | `from('eventos').select('id, nombre').in('id', ids)` (RLS limits it to readable ones) | `{id, nombre}[]` |
| `validarCupon(eventoId, entradaId, codigo)` | `rpc('validar_cupon_evento')` | `{ valido, descuentoPct, total, motivo }` |
| `iniciarCompra(input: IniciarCompraInput)` | `rpc('iniciar_compra_evento')` | `CompraResultado` |
| `subirArchivoCompra(tenantId, compraId, kind: 'comprobante' \| string, file)` | `storage.from('org-assets').upload('compras-eventos/{tenantId}/{compraId}/{kind}-{Date.now()}.{ext}', file, { upsert: false })` | path |
| `finalizarCompra(compraId, comprobantePath, archivos)` | `rpc('finalizar_compra_evento')` | `CompraResultado` |
| `vincularComprasInvitado()` | `rpc('vincular_compras_invitado')` | `number` |
| `listMisCompras()` | `from('evento_compras').select('*, tickets:evento_tickets(*), evento:eventos(id, nombre, nombre_tenant, fecha_hora, duracion_minutos, escenario_id, punto_encuentro, banner_url, cancelacion_antelacion_horas)').order('created_at', { ascending: false })` (RLS: own rows) | `MiCompra[]` |
| `getMiTicketEnEvento(eventoId)` | `from('evento_tickets').select('id, estado').eq('evento_id', …).neq('estado','anulada').limit(1)` | ticket or `null` |
| `reenviarComprobante(compraId, path)` / `cancelarCompra(compraId)` | RPCs | `CompraResultado` |
| `listComprasEvento(tenantId, eventoId)` | `from('evento_compras').select('*, tickets:evento_tickets(evento_id, codigo, estado), respuesta:evento_formulario_respuestas(*, formulario:evento_formularios(nombre, perfil_campos_requeridos, campos))').eq('tenant_id', …).eq('evento_id', …).order('created_at', { ascending: false })` (RLS: staff) | `CompraAdminItem[]` |
| `contarVendidas(eventoId)` | `from('evento_tickets').select('id', { count: 'exact', head: true }).eq('evento_id', …).neq('estado','anulada')` | `number` |
| `validarCompra(compraId, aprobar, motivo?)` | `rpc('validar_compra_evento')` | `CompraResultado` |
| `getArchivoUrl(path)` | existing `storageService.getSignedUrl(path, 300)` | URL |

`eventos.service.ts`: `EVENTOS_PUBLICOS_LIST_SELECT` adds `cancelacion_antelacion_horas` (moved from the detail-only select to `EventoPublicoListItem`). `deleteEvento` maps `23503` → `EventoServiceError('has_purchases', 'No puedes eliminar un evento con entradas vendidas. Cancélalo en su lugar.')`. Add the new code to `EventoServiceErrorCode`.

### Types: `src/types/portal/eventos-compras.types.ts` (new)
- `EventoCompraEstado`, `EVENTO_COMPRA_ESTADO_LABELS`:
  - `pendiente_pago`: "Pendiente de pago"
  - `en_validacion`: "En validación"
  - `confirmada`: "Confirmada"
  - `rechazada`: "Rechazada"
  - `cancelada`: "Cancelada"
  - `expirada`: "Expirada"
- `EventoTicketEstado`.
- `EntradaVendible`, `CuponValidacion`.
- `EventoFormularioSnapshot`, `EventoFormularioCampo`, `EventoFormularioRespuesta`.
- `CompradorInput` (`nombre`, `email`, `emailConfirmacion`, `fechaNacimiento`).
- `IniciarCompraInput`, `CompraResultado`, `TicketResultado`, `MiCompra`, `CompraAdminItem`.
- `TicketPdfData`.
- `EventoCompraServiceError`.

### Hooks
| Hook | Responsibility |
|---|---|
| `src/hooks/portal/eventos/useEventoCompra.ts` | The whole checkout: step state, sellable tickets, coupon (validate / clear), buyer data + prefill (registered: from `usuarios`, form profile fields from `usuarios` / `perfil_deportivo`), form snapshot load (`eventoComprasService.getFormularioEvento`; never the templates) + values + validation, method selection (non-cash filter), proof file (type/size validation), submit sequence with retry reusing `compraId`, 30-min expiry handling, result for step 4. `modo: 'usuario' \| 'invitado'`. |
| `src/hooks/portal/mis-entradas/useMisEntradas.ts` | `vincularComprasInvitado()` then `listMisCompras()`; tabs (próximas/pasadas) + estado filter; `puedeCancelar(compra)` (same rule as the RPC, for UI only); cancel / re-upload actions with per-item pending state and errors. |
| `src/hooks/portal/gestion-eventos/useEventoCompras.ts` | Admin list + sold count + stats, filters, pagination, reload. |
| `src/hooks/portal/gestion-eventos/useValidarCompraEvento.ts` | Validate / reject with `isSubmitting` / `error`, `onSuccess`. |

### Lib
- `src/lib/portal/eventos-ticket-pdf.ts`: `descargarEntradasPdf(tickets: TicketPdfData[], fileName)`, `politicaCancelacionTexto(horas: number | null)`.
- `src/lib/portal/eventos-compra.utils.ts`: an adapter from the snapshot's `campos` to what `FormularioSeccionesGrouped` expects, `entradaVendible(entrada, evento, now)`, `puedeCancelarCompra(...)`, `slugify`, file validation (types / 5 MB).

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20261001115000_evento_formularios.sql` | `evento_formularios` + RLS; `guardar_evento_completo` re-created with the snapshot sync; backfill |
| Migration | `supabase/migrations/20261001120000_eventos_compras.sql` | Tables `evento_compras`, `evento_tickets`, `evento_formulario_respuestas`, `evento_notificaciones`; indexes; triggers; RLS |
| Migration | `supabase/migrations/20261001120100_eventos_compras_rpc.sql` | Helpers + RPCs listed above, grants |
| Migration | `supabase/migrations/20261001120200_eventos_compras_storage_cron.sql` | `compras-eventos/` storage policies + `evento_compra_acepta_archivo` helper; `expirar-compras-eventos` cron |
| Dependency | `package.json` | Add `jspdf`, `qrcode` (+ `@types/qrcode`) |
| Page | `src/app/portal/(atleta)/mis-entradas/page.tsx` | New: renders `<MisEntradasPage />` |
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-eventos/[evento_id]/compras/page.tsx` | New: `<EventoComprasPage tenantId eventoId />` |
| Component | `src/components/portal/eventos/EventoEntradasModal.tsx` | Becomes the checkout shell (stepper, footer, full-screen on mobile); remove the "próximamente" notice / `onContinuar` |
| Component | `src/components/portal/eventos/compra/EventoCompraStepper.tsx`, `EventoCompraPasoEntrada.tsx`, `EventoCompraPasoDatos.tsx`, `EventoCompraPasoPago.tsx`, `EventoCompraPasoConfirmacion.tsx`, `EventoCompraEstadoBadge.tsx`, `PoliticaCancelacion.tsx`, `index.ts` | New |
| Component | `src/components/portal/eventos/ObtenerEntradaModal.tsx` | Hint without the email promise |
| Component | `src/components/portal/eventos/detalle/EventoDetallePortalPage.tsx` | "Ya tienes una entrada para este evento · Ver mis entradas" when `getMiTicketEnEvento` finds one |
| Component | `src/components/portal/mis-entradas/MisEntradasPage.tsx`, `MiCompraCard.tsx`, `ReenviarComprobanteModal.tsx`, `CancelarCompraModal.tsx`, `index.ts` | New |
| Component | `src/components/portal/gestion-eventos/compras/EventoComprasPage.tsx`, `EventoComprasTable.tsx`, `EventoComprasStats.tsx`, `CompraDatosModal.tsx`, `ValidarCompraModal.tsx`, `RechazarCompraModal.tsx`, `index.ts` | New |
| Component | `src/components/portal/gestion-eventos/EventoActionsMenu.tsx` | "Ver compras" item (published events) |
| Component | `src/components/portal/gestion-eventos/GestionEventosPage.tsx`, `EventosGrid.tsx`, `EventosTable.tsx`, `EventosCalendar.tsx` | Wire "Ver compras" → `/gestion-eventos/{id}/compras` |
| Component | `src/components/portal/gestion-eventos/EliminarEventoModal.tsx` | Show the `has_purchases` message inline |
| Component | `src/components/portal/gestion-eventos/wizard/EventoMetodosPagoStep.tsx` | Cash tag + warning |
| Component | `src/components/portal/gestion-eventos/wizard/EventoConfiguracionStep.tsx` | Helper text for `cancelacion_antelacion_horas` |
| Component | `src/components/portal/PortalBreadcrumb.tsx` | `mis-entradas` → "Mis entradas", `compras` → "Compras" |
| Hook | `src/hooks/portal/eventos/useEventoCompra.ts` | New |
| Hook | `src/hooks/portal/mis-entradas/useMisEntradas.ts` | New |
| Hook | `src/hooks/portal/gestion-eventos/useEventoCompras.ts`, `useValidarCompraEvento.ts` | New |
| Service | `src/services/supabase/portal/eventos-compras.service.ts` | New `eventoComprasService` |
| Service | `src/services/supabase/portal/eventos.service.ts` | `cancelacion_antelacion_horas` in the listing projection; `deleteEvento` FK mapping → `has_purchases` |
| Types | `src/types/portal/eventos-compras.types.ts` | New |
| Types | `src/types/portal/eventos.types.ts` | `EventoServiceErrorCode` gains `has_purchases`; `cancelacionAntelacionHoras` moves to `EventoPublicoListItem` |
| Types | `src/types/portal.types.ts` | `MIS_ENTRADAS_MENU_ITEM` after "Mis Reservas" |
| Lib | `src/lib/portal/eventos-ticket-pdf.ts`, `src/lib/portal/eventos-compra.utils.ts` | New |
| Docs | `projectspec/03-project-structure.md` | Routes, slices, tables (including the versioned form snapshot and answers), RPCs, storage folder, cron, and the email-confirmation dependency of guest linking |

---

## Acceptance Criteria

**Data & security**
1. `evento_compras`, `evento_tickets` and `evento_notificaciones` exist with the columns and checks above. A direct `insert` / `update` / `delete` from `anon` or `authenticated` fails on all three.
2. As `anon`, `select` on the three tables fails (no grant). As an authenticated user, `select` returns only your own purchases/tickets, plus every row of the tenants where you are admin or trainer. `evento_notificaciones` is never readable by a client.
3. A second live ticket for the same email and event is impossible, both by the RPC (`ENTRADA_DUPLICADA`) and by `uq_evento_tickets_evento_email`. After a purchase is rejected, cancelled or expired, the same email can buy again.
4. Files are stored under `compras-eventos/{tenant}/{compra}/`:
   - `anon` can upload there only while the purchase is `pendiente_pago`, less than 30 min old, and a guest purchase;
   - a registered buyer can upload only to their own purchase (`pendiente_pago`, or `rechazada` for a re-upload);
   - uploads to any other purchase or folder fail;
   - an authenticated non-staff user who is not the buyer cannot read them; the tenant's staff and the buyer can;
   - a member of the tenant cannot read them through `org_member_read` (the folder is outside `orgs/`).
5. Deleting an event with purchases fails with "No puedes eliminar un evento con entradas vendidas. Cancélalo en su lugar."
5a. **Form snapshot:**
    - saving an event with a form creates one `vigente` row in `evento_formularios` holding the template's active fields in `orden`;
    - saving again without changes creates no new row;
    - after the template is edited, the event keeps its snapshot until it is saved again, which creates a new version and retires the old one;
    - `anon` can read the snapshot of a visible public event, but not of a private one;
    - checkout, the RPCs and "Ver datos" never read `formularios_plantillas`.
5c. **Múltiple bundles and forms:** publishing an event whose *Múltiple* ticket bundles an event with a different form fails with the mapped message; events without a form or with the same form are accepted; the wizard's bundle selector shows the notice and disables events with a different form.
5b. **Form answers** are stored in `evento_formulario_respuestas` (one row per purchase), referencing the snapshot version they answered. An older purchase still shows its original labels after the form changes. `evento_compras` stores no form data. Direct writes from clients fail.

**Checkout: step 1**
6. The modal lists only sellable tickets:
   - a ticket outside its sale window or with a null value is not listed;
   - with `reserva_antelacion_horas = 24` and an event starting in 10 h, the modal shows "La venta cerró 24 h antes del evento." and cannot continue.
7. A valid coupon shows the discounted total ("20 % · $50.000 → $40.000"). An unknown, expired or other-ticket code shows "El cupón no es válido para esta entrada." The coupon field is disabled for free tickets.
8. The cancellation line reads "Esta entrada no admite cancelación ni reembolso." when `cancelacion_antelacion_horas` is null, and "Puedes cancelar hasta 48 h antes del evento…" when it is 48.
9. A registered user who already holds a live ticket for the event sees "Ya tienes una entrada para este evento." + "Ver mis entradas", and cannot continue. The portal event page shows the same note.

**Checkout: step 2**
10. Full name, email and date of birth are always required.
    - A guest must type the email twice, and the two must match.
    - A future or pre-1900 date is rejected.
    - A registered user sees their account email read-only, with name and date of birth prefilled when present.
11. When the event has a `vigente` form snapshot, its requested profile fields and fields are rendered (for guests too) and required ones are validated. Without one, only the three fixed fields appear.
12. Data typed during checkout does not change the user's profile (`usuarios` is unchanged).

**Checkout: step 3 and submit**
13. Cash methods never appear. A paid event whose only methods are cash shows "Este evento no tiene métodos de pago en línea disponibles…" and cannot be bought. Calling the RPC with a cash method id fails with `METODO_PAGO_INVALIDO`.
14. A proof larger than 5 MB, or not JPEG/PNG/WebP/PDF, is rejected inline. A paid purchase cannot be confirmed without a proof.
15. A paid purchase (event without `omitir_confirmacion_compra`) ends in step 4 with "Compra recibida: el organizador validará tu pago". The DB has one purchase in `en_validacion` with `comprobante_path` set, one `pendiente` ticket, and one `compra_recibida` outbox row with `estado = 'pendiente'`. **No email is sent.**
16. The same purchase on an event with `omitir_confirmacion_compra = true` ends in "¡Entrada confirmada!", with the ticket `activa` and a `compra_confirmada` outbox row.
17. A free ticket, or a 100 % coupon, skips the "Pago" step, ends confirmed with a single RPC call (when the form has no image fields), and creates no proof.
18. A *Múltiple* ticket bundling one other event creates one purchase and **two** tickets, one per event, each with its own code. If the bundled event is full, cancelled, or the buyer already holds a ticket there, the whole purchase fails with the specific message and nothing is written.
19. With `cupo_maximo = 1` and one live ticket sold, a new purchase fails with "No quedan cupos para {evento}." Two concurrent purchases of the last seat result in exactly one success.
20. If the proof upload fails, "Reintentar" completes the same purchase: no duplicate purchase, same ticket codes. After 30 min the purchase is `expirada` (via cron or lazily on the next purchase attempt), its tickets are `anulada`, and the capacity is released.

**Ticket PDF**
21. "Descargar entrada (PDF)" in step 4 (guest and registered) and in "Mis Entradas" downloads `entrada-{slug}-{codigo}.pdf` with one page per ticket:
    - event, organization, Bogotá date/time, place, ticket type, attendee, code and cancellation policy line;
    - a QR code only for `activa` tickets;
    - `pendiente` tickets carry "PENDIENTE DE VALIDACIÓN — No válida para ingreso" and no QR.
22. A guest never needs a network call to download the PDF in step 4.

**Guest account linking**
23. After a guest purchase with `ana@x.com`, creating an account with that email (confirmed) and opening "Mis Entradas" shows the purchase. A second visit does not duplicate anything. An account with a different email does not see it.
24. The "Obtén tu entrada" hint and the guest note no longer promise email. Step 4 for guests shows "Guarda tu entrada. Para volver a verla o consultar el estado de tu pago, crea una cuenta con **ana@x.com**." and a "Crear mi cuenta" button → `/auth/signup?next=/portal/mis-entradas`. No token link or recovery page exists.

**Mis Entradas**
25. The global portal menu shows "Mis Entradas" after "Mis Reservas", and `/portal/mis-entradas` lists the user's purchases under *Próximas* / *Pasadas*, with the estado badge, codes, total and method. The empty state links to `/portal/eventos`.
26. A `rechazada` purchase shows `motivo_rechazo` and "Reenviar comprobante". Re-uploading moves it to `en_validacion` (or `confirmada` with `omitir_confirmacion_compra`), unless capacity or uniqueness no longer allow it, in which case the matching error is shown.
27. "Cancelar":
    - not offered when `cancelacion_antelacion_horas` is null ("Esta entrada no admite cancelación ni reembolso.") or when the deadline has passed;
    - within the window it asks for confirmation, then sets `cancelada`, voids the tickets, frees capacity, and writes a `compra_cancelada` outbox row;
    - calling the RPC outside the window fails with `CANCELACION_NO_PERMITIDA`.

**Admin**
28. "Ver compras" in the event's actions menu opens `/gestion-eventos/{id}/compras` for admins; trainers and athletes are redirected by the `(administrador)` layout.
29. The page shows "Vendidas: X / cupo", stats, and the table with filters. "Ver comprobante" opens the proof (signed URL), and "Ver datos" shows the fixed data, plus the profile fields and form answers labelled with their snapshot version.
30. "Validar pago" on an `en_validacion` purchase → `confirmada`, tickets `activa`, a `compra_confirmada` outbox row, and `validado_por` / `validado_at` set.
31. "Rechazar" requires a reason, then → `rechazada`, tickets `anulada`, and a `compra_rechazada` outbox row with the reason.
32. Validating a purchase that is no longer `en_validacion` shows "La compra cambió de estado. Recarga la página."; a non-staff call → `forbidden`.

**Wizard & regressions**
33. In the wizard's step 3, cash methods show "No disponible para compra en línea". Step 1 shows the cancellation helper.
34. The US-0120 listing, detail and get-ticket entry flows still work. `ObtenerEntradaModal` → "Continuar sin registro" now leads to a working checkout. `npm run lint` (changed files) and `npx tsc --noEmit` pass.

---

## Implementation Steps

- [ ] Write the four migrations (form snapshot + `guardar_evento_completo`, purchase tables, RPCs, storage + cron); apply them **locally only**; verify RLS, storage policies, uniqueness, capacity locking, snapshot versioning and every RPC branch in SQL (anon, guest, registered, other user, member, staff)
- [ ] Add `jspdf` + `qrcode`
- [ ] Types, then `eventos-compras.service.ts`; `deleteEvento` mapping
- [ ] `eventos-compra.utils.ts`, then `eventos-ticket-pdf.ts`
- [ ] `useEventoCompra`; refactor `EventoEntradasModal` into the stepper with the four step components
- [ ] Portal event page "Ya tienes una entrada" note
- [ ] `useMisEntradas` + the "Mis Entradas" page, modals and menu item
- [ ] Admin "Compras" page, hooks and modals; "Ver compras" menu wiring; breadcrumb labels
- [ ] Wizard helper texts; `EliminarEventoModal` message
- [ ] Test manually: form snapshot (guest sees the form; template edit without re-saving → unchanged; re-save → new version; old answers keep their labels); guest paid purchase → admin validates → guest signs up with the same email → sees it confirmed and downloads the PDF with QR; registered free purchase; *Múltiple* purchase; coupon; capacity exhausted; duplicate email; cash-only event; upload failure + retry; expiry after 30 min; reject → re-upload; cancel within and outside the window; null cancellation policy; delete an event with sales
- [ ] Run `npx tsc --noEmit` and lint
- [ ] Update `projectspec/03-project-structure.md`

---

## Non-Functional Requirements

- **Security**:
  - All writes go through `security definer` RPCs that re-validate event visibility, sale windows, prices, coupons, methods, form completeness, uniqueness and capacity. The client's price or total is never trusted.
  - Registered buyers' email and identity come from the session, never from the payload.
  - Coupon codes stay unreadable. `validar_cupon_evento` answers only for the code given.
  - Purchase files live outside `orgs/` (existing broad read policies), are write-once, are readable only by the buyer and tenant staff, and are served through 300 s signed URLs.
  - Guest RPCs are callable by `anon`. Abuse is limited by the 30-min capacity hold, the one-live-ticket-per-email rule and the cron expiry. Captcha and rate limiting are a follow-up.
  - Guest linking requires a confirmed email (`email_confirmed_at`); production has email confirmation enabled. Disabling it would require an extra verification step for linking.
  - Form answers are rendered as text (no HTML); image answers only through signed URLs.
  - The event form is exposed to guests only through its own snapshot (`evento_formularios`), readable only when the event is. The template tables stay authenticated-only.
- **Performance**:
  - Capacity and uniqueness checks lock the involved event rows (`for update`, in id order to avoid deadlocks) and use `idx_evento_tickets_evento_estado` / `uq_evento_tickets_evento_email`.
  - "Mis Entradas" is one query with embeds.
  - The admin list is one query per event, paginated client-side at 20 rows.
  - The PDF is generated in the browser, so there is no server cost.
- **Accessibility**:
  - The stepper uses `aria-current="step"`; focus moves to each step's heading.
  - Ticket and method choices are native radio groups. The file inputs have labels and announce the selected file.
  - Errors use `role="alert"`; the confirmation step uses `role="status"`.
  - The modal is full-screen on mobile with a reachable sticky footer.
  - Estado badges carry text, not only color.
- **Error handling**:
  - Mapped Spanish messages inline in the current step. The data typed is never lost on error; retry reuses the purchase until it expires.
  - Admin and "Mis Entradas" actions show inline errors in their modals.
  - There is no toast system; do not add one.
  - Hooks `console.error` unexpected errors.

## Out of Scope
- Sending emails; the outbox is only filled.
- Token-protected ticket pages and "recuperar entradas".
- Online payment gateways and automatic refunds.
- Check-in / QR scanning.
- Showing the remaining capacity on public pages.
- Captcha and rate limiting.
- More than one attendee per purchase.
- Cash payments.
