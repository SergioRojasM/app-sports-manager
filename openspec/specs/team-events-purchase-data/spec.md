# team-events-purchase-data Specification

## Purpose
TBD - created by archiving change team-events-management-phase-four. Update Purpose after archive.
## Requirements
### Requirement: Purchase, ticket and outbox tables
The system SHALL provide three tables.

**`public.evento_compras`**
- Columns: `tenant_id`, `evento_id` (`on delete restrict`), `entrada_id`, `comprador_usuario_id`, `comprador_nombre` (≤150), `comprador_email` (≤254), `comprador_fecha_nacimiento`, `entrada_nombre`, `entrada_tipo`, `valor_base`, `cupon_codigo`, `descuento_pct`, `total`, `metodo_pago`, `comprobante_path`, `estado`, `motivo_rechazo` (≤500), `validado_por`, `validado_at`, `cancelado_at`, `created_at`, `updated_at`.
- Checks:
  - `estado` is one of `pendiente_pago | en_validacion | confirmada | rechazada | cancelada | expirada`;
  - the email is lowercased and trimmed, and has a valid shape;
  - the name is not blank;
  - the birth date is after 1900-01-01;
  - `0 <= total <= valor_base`;
  - `descuento_pct` is null or in `(0, 100]`;
  - `entrada_tipo` is `sencilla | multiple`;
  - a `rechazada` purchase has a non-blank `motivo_rechazo`;
  - `total = 0 or metodo_pago is not null`.
- It SHALL NOT store form data. Form answers live in `evento_formulario_respuestas` (see "Event form answers table").

**`public.evento_tickets`**
- Columns: `compra_id` (`on delete cascade`), `tenant_id`, `evento_id` (`on delete restrict`), `usuario_id`, `asistente_nombre`, `asistente_email`, `codigo` (unique, ≤12), `estado` (`pendiente | activa | anulada`), and timestamps.
- The partial unique index `uq_evento_tickets_evento_email (evento_id, asistente_email) where estado <> 'anulada'`.

**`public.evento_notificaciones`**
- Columns: `tenant_id`, `compra_id`, `tipo` (`compra_recibida | compra_confirmada | compra_rechazada | compra_cancelada`), `destinatario_email`, `payload`, `estado` (`pendiente | enviada | error`, default `pendiente`), `created_at`, `enviada_at`.

`updated_at` triggers SHALL exist on the first two tables.

#### Scenario: Invalid estado rejected
- **WHEN** a row of `evento_compras` is written with `estado = 'pagada'`
- **THEN** the write SHALL fail with a check violation

#### Scenario: One live ticket per email and event
- **WHEN** a second ticket with `estado <> 'anulada'` is inserted for the same `evento_id` and `asistente_email`
- **THEN** the insert SHALL fail on `uq_evento_tickets_evento_email`

#### Scenario: Same email can buy again after voiding
- **WHEN** the only ticket for an email and event is `anulada`
- **THEN** a new live ticket for that email and event SHALL be insertable

#### Scenario: Event with sales cannot be hard-deleted
- **WHEN** an event that has a purchase or a ticket is deleted
- **THEN** the delete SHALL fail with a foreign-key violation (`23503`)

### Requirement: Purchase tables read-only access
RLS SHALL be enabled on all three tables, and every privilege SHALL be revoked from `anon` and `authenticated`. `authenticated` SHALL be granted `select` on `evento_compras` and `evento_tickets` only, with these policies:
- a purchase is visible when `comprador_usuario_id = auth.uid()`, or when its tenant is in `get_trainer_or_admin_tenants_for_authenticated_user()`;
- a ticket is visible when `usuario_id = auth.uid()`, or under the same staff condition.

`evento_notificaciones` SHALL have no client grants.

#### Scenario: Direct writes denied
- **WHEN** `anon` or `authenticated` runs `insert`, `update` or `delete` on any of the three tables
- **THEN** the statement SHALL fail with a permission error

#### Scenario: Anonymous read denied
- **WHEN** `anon` selects from any of the three tables
- **THEN** the statement SHALL fail with a permission error

#### Scenario: Buyer reads only own purchases
- **WHEN** a registered buyer who is not staff selects `evento_compras`
- **THEN** only purchases with `comprador_usuario_id = auth.uid()` SHALL be returned

#### Scenario: Staff reads their tenant's purchases
- **WHEN** an admin or trainer of tenant T selects `evento_compras`
- **THEN** every purchase of T SHALL be returned, and no purchase of other tenants unless the caller owns it

#### Scenario: Outbox never client-readable
- **WHEN** any authenticated user selects `evento_notificaciones`
- **THEN** the statement SHALL fail with a permission error

### Requirement: Purchase state machine
Purchase and ticket states SHALL move only through these transitions, each performed by an RPC:

| From | Event | To (purchase / tickets) |
|---|---|---|
| — | `iniciar_compra_evento` | `pendiente_pago` / `pendiente` |
| — | `iniciar_compra_evento`, `total = 0` and no image form fields | `confirmada` / `activa` |
| `pendiente_pago` | `finalizar_compra_evento`, `total = 0` or `omitir_confirmacion_compra` | `confirmada` / `activa` |
| `pendiente_pago` | `finalizar_compra_evento`, paid | `en_validacion` / `pendiente` |
| `pendiente_pago` | older than 30 min (cron or lazy) | `expirada` / `anulada` |
| `en_validacion` | `validar_compra_evento(true)` | `confirmada` / `activa` |
| `en_validacion` | `validar_compra_evento(false)` | `rechazada` / `anulada` |
| `rechazada` | `reenviar_comprobante_compra_evento` | `en_validacion` / `pendiente` (or `confirmada` / `activa` with `omitir_confirmacion_compra`) |
| `en_validacion`, `confirmada` | `cancelar_compra_evento` within policy | `cancelada` / `anulada` |

Every transition into `en_validacion`, `confirmada`, `rechazada` or `cancelada` SHALL insert one `evento_notificaciones` row with the matching `tipo` (`compra_recibida`, `compra_confirmada`, `compra_rechazada`, `compra_cancelada`) and `estado = 'pendiente'`. No email SHALL be sent.

#### Scenario: Paid purchase finalized
- **WHEN** a paid purchase on an event without `omitir_confirmacion_compra` is finalized with a valid proof
- **THEN** the purchase SHALL be `en_validacion` with `comprobante_path` set, its tickets `pendiente`, and one `compra_recibida` outbox row SHALL exist

#### Scenario: Auto-confirmed purchase
- **WHEN** the same purchase is finalized on an event with `omitir_confirmacion_compra = true`
- **THEN** the purchase SHALL be `confirmada`, its tickets `activa`, and a `compra_confirmada` outbox row SHALL exist

### Requirement: Event form snapshot table
The system SHALL provide `public.evento_formularios`, a JSON snapshot of the form an event asks for, independent of `formularios_plantillas`:
- Columns: `id`, `tenant_id` (`on delete cascade`), `evento_id` (references `eventos`, `on delete cascade`), `formulario_plantilla_id` (provenance only, `on delete set null`), `nombre` (≤150), `perfil_campos_requeridos jsonb` (array of profile keys), `campos jsonb` (the template's **active** `formulario_plantilla_esquema` rows ordered by `orden`, each with `campo_nombre`, `campo_etiqueta`, `campo_tipo`, `campo_lista_valores`, `campo_obligatorio`, `campo_placeholder`, `seccion_tipo`, `seccion_descripcion`, `orden`), `contenido_hash text`, `vigente boolean`, `created_at`.
- A partial unique index `uq_evento_formularios_vigente (evento_id) where vigente` SHALL allow at most one current snapshot per event.
- Rows are **versions**: a snapshot is never edited in place. When the form changes, the current row gets `vigente = false` and a new row is inserted, so answers always keep the exact form they answered.

Access:
- `select` SHALL be granted to `anon` and `authenticated`, with policies that show a row whenever its event is readable (`exists (select 1 from eventos e where e.id = evento_formularios.evento_id)`, so `eventos` RLS applies). This is the same pattern as `evento_entradas`.
- `insert` / `update` SHALL be allowed to `authenticated` admins and trainers of the tenant only (used by the invoker RPC `guardar_evento_completo`).
- There SHALL be no `delete` grant.

The snapshot SHALL be written by `guardar_evento_completo` (see `team-events-tickets-data`). The migration SHALL backfill one `vigente` snapshot for every existing event with a `formulario_id`.

#### Scenario: Guest reads the event form
- **WHEN** `anon` selects the `vigente` snapshot of a public, active, published event
- **THEN** the row SHALL be returned, and no access to `formularios_plantillas` SHALL be needed

#### Scenario: Private event form hidden from anon
- **WHEN** `anon` selects the snapshot of a `publico = false` event
- **THEN** no row SHALL be returned

#### Scenario: Template edited after publishing
- **WHEN** the admin edits the template's fields after the event was saved, and does not save the event again
- **THEN** the event's `vigente` snapshot SHALL be unchanged, and checkout SHALL keep using it

#### Scenario: Only one current snapshot
- **WHEN** a second row with `vigente = true` is inserted for the same event
- **THEN** the insert SHALL fail on `uq_evento_formularios_vigente`

### Requirement: Event form answers table
The system SHALL provide `public.evento_formulario_respuestas`, holding a purchase's answers to the event form, independent of `formularios_plantillas`:
- Columns: `id`, `compra_id` (unique, references `evento_compras`, `on delete cascade`), `tenant_id`, `evento_id`, `evento_formulario_id` (references `evento_formularios`, `on delete restrict`), `datos_perfil jsonb` (the requested profile fields), `respuestas jsonb` (`{campo_nombre: value}` for non-image fields), `archivos jsonb` (`{campo_nombre: storage path}` for `imagen` fields), `created_at`, `updated_at`, plus an `updated_at` trigger.
- A row SHALL exist only for purchases of events that had a `vigente` snapshot when the purchase started. It SHALL reference that exact snapshot version.

Access:
- RLS SHALL be enabled, and every privilege revoked from `anon` and `authenticated`.
- `authenticated` SHALL get `select` only, for the tenant's admins and trainers or the purchase's buyer (`exists` on `evento_compras` with `comprador_usuario_id = auth.uid()`).
- Writes SHALL happen only inside `iniciar_compra_evento` / `finalizar_compra_evento`.

#### Scenario: Answers keep their form version
- **WHEN** a buyer answers snapshot v1, and the admin later changes the form (creating v2)
- **THEN** the answers row SHALL still reference v1, and "Ver datos" SHALL render it with v1's labels

#### Scenario: Direct write denied
- **WHEN** `anon` or `authenticated` inserts into `evento_formulario_respuestas`
- **THEN** the statement SHALL fail with a permission error

#### Scenario: Staff reads answers
- **WHEN** an admin of the tenant selects the answers of a purchase of their event
- **THEN** the row SHALL be returned, and a non-staff user who is not the buyer SHALL get no row

### Requirement: Coupon validation RPC
`validar_cupon_evento(p_evento_id, p_entrada_id, p_codigo) → jsonb {valido, descuento_pct, total, motivo}` SHALL be granted to `anon, authenticated`. It SHALL answer `valido: true` only when all of these hold:
- the event is visible for purchase;
- the ticket belongs to the event and has `valor > 0`;
- a complete coupon of that ticket matches `upper(btrim(p_codigo))`;
- now is inside the coupon's `[valido_desde, valido_hasta]`.

`total` SHALL be `round(valor * (1 - pct/100))`. Otherwise it SHALL return `{valido: false, motivo: 'CUPON_INVALIDO'}`, and it SHALL NEVER reveal other codes.

#### Scenario: Valid coupon
- **WHEN** coupon "VERANO20" (20 %) of ticket "General" (50000) is validated inside its window
- **THEN** the result SHALL be `{valido: true, descuento_pct: 20, total: 40000}`

#### Scenario: Coupon of another ticket
- **WHEN** a coupon that belongs to another ticket of the same event is validated
- **THEN** the result SHALL be `{valido: false, motivo: 'CUPON_INVALIDO'}`

### Requirement: Start purchase RPC
`iniciar_compra_evento(p_evento_id, p_entrada_id, p_cupon, p_metodo_pago_id, p_comprador, p_datos_perfil, p_formulario_respuesta) → jsonb` SHALL be granted to `anon, authenticated` and run in one transaction. It SHALL:
1. Resolve the buyer.
   - Authenticated: the email comes from the session and `comprador_usuario_id = auth.uid()`; the payload email is ignored.
   - Anonymous: the payload email, trimmed and lowercased.
   - Validate the name (1–150), the email (≤254, valid) and the birth date (`> 1900-01-01` and `< current_date`), else raise `DATOS_INVALIDOS`.
2. Lock the event and require `_evento_visible_para_compra`, else `EVENTO_NO_DISPONIBLE`.
   - Require `now() <= fecha_hora - reserva_antelacion_horas` when both are set, else `VENTA_CERRADA`.
   - Require the ticket to belong to the event, with non-null `nombre` / `valor` (else `ENTRADA_INVALIDA`) and inside its sale window (else `VENTA_CERRADA`).
3. Apply the optional coupon under the `validar_cupon_evento` rules, else `CUPON_INVALIDO`.
4. When `total > 0`, require a `p_metodo_pago_id` present in `eventos.metodos_pago` or in the purchased ticket's `evento_entradas.metodos_pago` (US-0130), with `tipo <> 'efectivo'`, else `METODO_PAGO_INVALIDO`, and store its snapshot. Methods of other tickets of the event SHALL NOT be accepted. When `total = 0`, store `metodo_pago = null`.
5. Read the event's `vigente` row in `evento_formularios` (never the templates). When it exists, require a non-empty value for every `campo_obligatorio` non-`imagen` field in `campos` and every `perfil_campos_requeridos` key, else `FORMULARIO_INCOMPLETO`. Values for fields not in the snapshot SHALL be dropped.
6. Resolve the target events: `[p_evento_id]`, plus `eventos_id_bundle` for `multiple`. Every bundle event must be of the same tenant and visible for purchase, else `BUNDLE_NO_DISPONIBLE`. Lock them all in id order.
7. Expire stale `pendiente_pago` purchases of the targets.
8. For each target, raise `ENTRADA_DUPLICADA:{evento}` if a live ticket exists for the email, and `CUPO_AGOTADO:{evento}` if `cupo_maximo` is set and the live tickets are `>= cupo_maximo`.
9. Insert the purchase (`pendiente_pago`) and one `pendiente` ticket per target, each with a server-generated code `EV-` + 8 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. When a snapshot exists, insert the `evento_formulario_respuestas` row referencing it, with `datos_perfil` and `respuestas`.
10. If `total = 0` and the snapshot has no `imagen` fields, confirm immediately (see the state machine).
11. Return `{ compra_id, tenant_id, estado, requiere_archivos, tickets[{id, evento_id, evento_nombre, fecha_hora, lugar, nombre_tenant, codigo, estado}], cancelacion_antelacion_horas, total, entrada_nombre, comprador_nombre, comprador_email }`.

A `23505` on `uq_evento_tickets_evento_email` SHALL be re-raised as `ENTRADA_DUPLICADA`. Any failure SHALL write nothing.

#### Scenario: Cash method rejected
- **WHEN** it is called for a paid ticket with the id of a method whose `tipo = 'efectivo'`
- **THEN** it SHALL raise `METODO_PAGO_INVALIDO`

#### Scenario: Registered email forced from session
- **WHEN** a logged-in user whose account email is `a@x.com` sends `p_comprador.email = 'b@x.com'`
- **THEN** the purchase and ticket SHALL be stored with `a@x.com`

#### Scenario: Multiple ticket issues one ticket per event
- **WHEN** a *Múltiple* ticket bundling one other event is bought
- **THEN** one purchase and two tickets (one per event, distinct codes) SHALL be created

#### Scenario: Bundle event full rolls everything back
- **WHEN** the bundled event has reached `cupo_maximo`
- **THEN** it SHALL raise `CUPO_AGOTADO:{nombre}` and no purchase or ticket SHALL be written

#### Scenario: Last seat race
- **WHEN** two buyers concurrently purchase the last seat of an event with `cupo_maximo = 1`
- **THEN** exactly one SHALL succeed, and the other SHALL get `CUPO_AGOTADO`

#### Scenario: Free purchase in one call
- **WHEN** a free ticket is bought for an event whose form has no `imagen` fields
- **THEN** the result SHALL have `estado = 'confirmada'`, `requiere_archivos = false` and `activa` tickets, plus one `compra_confirmada` outbox row

#### Scenario: Sale closed by lead time
- **WHEN** `reserva_antelacion_horas = 24` and the event starts in 10 h
- **THEN** it SHALL raise `VENTA_CERRADA`

#### Scenario: Ticket-specific method accepted
- **WHEN** it is called for a paid ticket with the id of a non-cash method stored only in that ticket's `metodos_pago`
- **THEN** the purchase SHALL be created and `evento_compras.metodo_pago` SHALL hold that snapshot

#### Scenario: Method of another ticket rejected
- **WHEN** it is called for paid ticket A with the id of a method stored only in ticket B's `metodos_pago`
- **THEN** it SHALL raise `METODO_PAGO_INVALIDO` and write nothing

#### Scenario: Guest pays with a ticket-specific method
- **WHEN** an anonymous buyer calls it with a ticket-specific non-cash method of the purchased ticket
- **THEN** the purchase SHALL be created

### Requirement: Finalize purchase RPC
`finalizar_compra_evento(p_compra_id, p_comprobante_path, p_archivos) → jsonb` SHALL be granted to `anon, authenticated`. It SHALL:
- lock the purchase, and require `pendiente_pago` with `created_at > now() - 30 min`, else `COMPRA_EXPIRADA`;
- when `comprador_usuario_id` is set, require the caller to be that user, else `FORBIDDEN`;
- require every path to start with `compras-eventos/{tenant_id}/{compra_id}/` and to exist in `storage.objects` (bucket `org-assets`), else `ARCHIVO_INVALIDO`;
- require a proof when `total > 0`, else `COMPROBANTE_REQUERIDO`;
- require every `campo_obligatorio` `imagen` field of the purchase's snapshot (via its `evento_formulario_respuestas` row) in `p_archivos`, else `FORMULARIO_INCOMPLETO`, and store `p_archivos` (only keys of `imagen` fields in the snapshot) in that row's `archivos`;
- apply the state transition and return the same shape as `iniciar_compra_evento`.

#### Scenario: Form image stored with the answers
- **WHEN** a purchase for an event whose snapshot has a required `imagen` field is finalized with that file
- **THEN** the path SHALL be stored in `evento_formulario_respuestas.archivos`, and nothing about the form SHALL be stored in `evento_compras`

#### Scenario: Retry after upload failure
- **WHEN** the proof upload failed once, and then succeeds and `finalizar` is called with the same `compra_id` within 30 min
- **THEN** the same purchase SHALL move to `en_validacion` with the same ticket codes, and no second purchase SHALL exist

#### Scenario: Expired hold
- **WHEN** `finalizar` is called 31 minutes after `iniciar`
- **THEN** it SHALL raise `COMPRA_EXPIRADA`

#### Scenario: Foreign path rejected
- **WHEN** `p_comprobante_path` points to another purchase's folder
- **THEN** it SHALL raise `ARCHIVO_INVALIDO`

### Requirement: Re-upload, cancel and validate RPCs
The system SHALL provide these three RPCs, each `security definer`:
- **`reenviar_comprobante_compra_evento(p_compra_id, p_comprobante_path)`** (authenticated): only the owner, only when `rechazada`. It re-checks the path, and per event it re-checks visibility, the unique-email rule and capacity (`ENTRADA_DUPLICADA` / `CUPO_AGOTADO`). Then it clears `motivo_rechazo` and applies the transition.
- **`cancelar_compra_evento(p_compra_id)`** (authenticated): only the owner, only when `en_validacion` or `confirmada`. With the **main** event's `cancelacion_antelacion_horas`:
  - null → `CANCELACION_NO_PERMITIDA`;
  - otherwise allowed when `fecha_hora is null or now() <= fecha_hora - N h`, else `CANCELACION_NO_PERMITIDA`.

  It sets `cancelada`, `cancelado_at` and voids every ticket.
- **`validar_compra_evento(p_compra_id, p_aprobar, p_motivo)`** (authenticated):
  - the caller must be admin or trainer of the tenant, else `FORBIDDEN`;
  - the purchase must be `en_validacion`, else `ESTADO_INVALIDO`;
  - rejecting requires `p_motivo` of 1–500 chars;
  - it sets `validado_por` / `validado_at` on approval.

#### Scenario: Cancellation not allowed by policy
- **WHEN** the owner cancels a purchase whose event has `cancelacion_antelacion_horas = null`
- **THEN** it SHALL raise `CANCELACION_NO_PERMITIDA`

#### Scenario: Cancellation outside window
- **WHEN** the policy is 48 h and the event starts in 24 h
- **THEN** it SHALL raise `CANCELACION_NO_PERMITIDA`

#### Scenario: Cancellation frees capacity
- **WHEN** the owner cancels within the window
- **THEN** the purchase SHALL be `cancelada`, its tickets `anulada`, and a `compra_cancelada` outbox row SHALL exist

#### Scenario: Validate a non-pending purchase
- **WHEN** staff validates a purchase that is already `confirmada`
- **THEN** it SHALL raise `ESTADO_INVALIDO`

#### Scenario: Non-staff validation
- **WHEN** a user who is not admin or trainer of the tenant calls `validar_compra_evento`
- **THEN** it SHALL raise `FORBIDDEN`

### Requirement: Guest purchase linking
`vincular_compras_invitado() → integer` (authenticated) SHALL, only when `auth.users.email_confirmed_at is not null` for the caller:
- set `comprador_usuario_id = auth.uid()` on purchases with `comprador_usuario_id is null and comprador_email = lower(auth email)`;
- set `usuario_id` on their tickets;
- return the number of purchases linked.

It SHALL be idempotent.

#### Scenario: Linking after signup
- **WHEN** a guest bought with `ana@x.com`, then created and confirmed an account with that email, and calls the RPC
- **THEN** it SHALL return 1, and the purchase and ticket SHALL be readable by that user

#### Scenario: Second call links nothing
- **WHEN** the same user calls it again
- **THEN** it SHALL return 0 and change nothing

#### Scenario: Unconfirmed email
- **WHEN** the caller's `email_confirmed_at` is null
- **THEN** it SHALL link nothing and return 0

### Requirement: Pending purchase expiry
`expirar_compras_evento_pendientes() → integer` SHALL mark every `pendiente_pago` purchase older than 30 min as `expirada` and its tickets as `anulada`. It SHALL have no client grants, and SHALL be scheduled with pg_cron as `expirar-compras-eventos` every 5 minutes. `iniciar_compra_evento` SHALL also expire the stale purchases of its target events lazily.

#### Scenario: Expired hold releases capacity
- **WHEN** a `pendiente_pago` purchase is 31 minutes old and the job runs
- **THEN** it SHALL be `expirada`, its tickets `anulada`, and a new buyer SHALL be able to take that seat

### Requirement: Purchase file storage
Purchase files SHALL be stored in bucket `org-assets` under `compras-eventos/{tenantId}/{compraId}/`.
- **Upload (`insert`)**, for `anon, authenticated`: allowed only when `evento_compra_acepta_archivo(tenantId, compraId)` is true, meaning either:
  - the purchase is `pendiente_pago`, younger than 30 min, and (a guest purchase, or the caller's own); or
  - the purchase is `rechazada` and the caller is its buyer.
- **Read (`select`)**, for `authenticated`: allowed only for the tenant's admins and trainers, or the buyer.
- There SHALL be no `update` or `delete` policies.

#### Scenario: Anon uploads to own pending guest purchase
- **WHEN** `anon` uploads to the folder of a 5-minute-old `pendiente_pago` guest purchase
- **THEN** the upload SHALL succeed

#### Scenario: Upload to another user's purchase
- **WHEN** an authenticated user uploads to the folder of a purchase owned by another user
- **THEN** the upload SHALL fail

#### Scenario: Member cannot read purchase files
- **WHEN** a member of the tenant who is neither staff nor the buyer reads a proof
- **THEN** the read SHALL fail, including through `org_member_read`

### Requirement: Purchase data-access service
`src/services/supabase/portal/eventos-compras.service.ts` SHALL export `eventoComprasService` with:
- `listEntradasVendibles`, `listNombresEventosBundle`, `getFormularioEvento` (`from('evento_formularios').select('id, nombre, perfil_campos_requeridos, campos').eq('evento_id', …).eq('vigente', true).maybeSingle()`), `validarCupon`;
- `iniciarCompra`, `subirArchivoCompra`, `finalizarCompra`;
- `vincularComprasInvitado`, `listMisCompras`, `getMiTicketEnEvento`, `reenviarComprobante`, `cancelarCompra`;
- `listComprasEvento` (embedding `respuesta:evento_formulario_respuestas(*, formulario:evento_formularios(nombre, perfil_campos_requeridos, campos))`), `contarVendidas`, `validarCompra`, `getArchivoUrl` (signed URL, 300 s).

It SHALL map errors through `mapCompraError` to `EventoCompraServiceError(code, message)`:

| RPC code | `code` | Message |
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

`{evento}` SHALL be taken from the text after `:` in the RPC message.

#### Scenario: Capacity error carries event name
- **WHEN** the RPC raises `CUPO_AGOTADO:Copa Verano`
- **THEN** the service SHALL throw code `agotado` with "No quedan cupos para Copa Verano."

#### Scenario: Unknown error
- **WHEN** an unrecognized error is returned
- **THEN** the service SHALL throw code `unknown`
