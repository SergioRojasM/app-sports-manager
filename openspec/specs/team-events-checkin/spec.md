# team-events-checkin Specification

## Purpose
TBD - created by archiving change event-ticket-checkin. Update Purpose after archive.
## Requirements
### Requirement: Check-in RPC
`registrar_ingreso_evento(p_evento_id uuid, p_codigo text) → jsonb` SHALL be `security definer` with `set search_path = public`. It SHALL be revoked from `public` and `anon` and granted to `authenticated`. It SHALL evaluate the following in order:
1. If the event does not exist, or its tenant is not in `get_trainer_or_admin_tenants_for_authenticated_user()`, raise `FORBIDDEN` (`42501`).
2. Normalize the code: trim, uppercase, remove spaces and hyphens, then rebuild it as `EV-` + the 8 remaining characters (with or without the original `EV` prefix). If the result does not match `^EV-[A-HJ-NP-Z2-9]{8}$`, return `no_encontrado`.
3. Lock the ticket with that `codigo` (`for update`).
4. If no ticket exists, or the ticket's `tenant_id` differs from the event's, return `no_encontrado` with no ticket details.
5. If the ticket's `evento_id` differs from `p_evento_id`, return `otro_evento`, including the ticket's event name.
6. If the ticket is `anulada`, return `anulada`. If it is `pendiente`, return `pendiente`.
7. If `ingreso_at` is not null, return `ya_ingreso`, including `ingreso_at` and `ingreso_por_nombre`. The name is the author's `usuarios.nombre` + `apellido`, or their email when the name is blank.
8. Otherwise, set `ingreso_at = now()` and `ingreso_por = auth.uid()`, and return `ok`.

The result SHALL be `{resultado, ticket_id, codigo, asistente_nombre, asistente_email, entrada_nombre, evento_nombre, ingreso_at, ingreso_por_nombre}`. Only `resultado` is set for `no_encontrado`. Only `ok` SHALL write.

#### Scenario: Valid ticket
- **WHEN** staff of the tenant submits the code of an `activa`, unused ticket of the event
- **THEN** the result SHALL be `ok`, and the ticket SHALL have `ingreso_at` set and `ingreso_por = auth.uid()`

#### Scenario: Second scan
- **WHEN** the same code is submitted again
- **THEN** the result SHALL be `ya_ingreso` with the first `ingreso_at` and the author's name, and the row SHALL be unchanged

#### Scenario: Concurrent scans
- **WHEN** two staff sessions submit the same unused code at the same moment
- **THEN** exactly one SHALL get `ok` and the other `ya_ingreso`

#### Scenario: Pending payment
- **WHEN** the ticket is `pendiente`
- **THEN** the result SHALL be `pendiente` and nothing SHALL be written

#### Scenario: Voided ticket
- **WHEN** the ticket is `anulada`
- **THEN** the result SHALL be `anulada` and nothing SHALL be written

#### Scenario: Ticket of another event
- **WHEN** the code belongs to another event of the same tenant
- **THEN** the result SHALL be `otro_evento` with that event's name

#### Scenario: Code of another tenant
- **WHEN** the code belongs to a ticket of another tenant
- **THEN** the result SHALL be `no_encontrado` with no attendee data

#### Scenario: Code normalization
- **WHEN** `ev-abcd2345`, `EV ABCD2345` or `ABCD2345` is submitted
- **THEN** it SHALL be looked up as `EV-ABCD2345`

#### Scenario: Non-staff caller
- **WHEN** an athlete, an `anon` user or staff of another tenant calls the RPC
- **THEN** it SHALL fail with a permission error

### Requirement: Revert check-in RPC
`revertir_ingreso_evento(p_ticket_id uuid) → jsonb` SHALL have the same security, grants and staff check as `registrar_ingreso_evento`, applied to the ticket's tenant. It SHALL behave as follows:
- If the ticket has `ingreso_at is null`, raise `ESTADO_INVALIDO`.
- Otherwise, clear `ingreso_at` and `ingreso_por`, and return the same shape with `resultado = 'revertido'`.

#### Scenario: Undo
- **WHEN** staff reverts a used ticket
- **THEN** both columns SHALL be null, and a later scan SHALL return `ok`

#### Scenario: Already reverted
- **WHEN** staff reverts a ticket that has no entry
- **THEN** it SHALL raise `ESTADO_INVALIDO`, shown as "La compra cambió de estado. Recarga la página."

### Requirement: Check-in summary RPC
`resumen_ingresos_evento(p_evento_id uuid) → jsonb` SHALL have the same security, grants and staff check. It SHALL return `{activas, ingresaron, pendientes_pago}`:
- `activas`: the count of `activa` tickets of the event;
- `ingresaron`: the count of those tickets with `ingreso_at` set;
- `pendientes_pago`: the count of `pendiente` tickets of the event.

#### Scenario: Counters
- **WHEN** an event has 10 `activa` tickets, 3 of them used, and 2 `pendiente` tickets
- **THEN** it SHALL return `{activas: 10, ingresaron: 3, pendientes_pago: 2}`

### Requirement: Check-in routes and access
The system SHALL provide these two pages under the `(shared)` route group:
- `/portal/orgs/{tenantId}/control-ingreso` (`ControlIngresoEventosPage`);
- `/portal/orgs/{tenantId}/control-ingreso/{eventoId}` (`ControlIngresoPage`).

Each page SHALL resolve the role through `getCachedTenantAccess` and redirect to `/portal/orgs/{tenantId}` unless the role is `administrador` or `entrenador`. The event page SHALL also redirect to `/portal/orgs/{tenantId}/control-ingreso` when `eventoId` is not a UUID.

The breadcrumb SHALL read "Control de ingreso", and "Control de ingreso › Evento" on the event page.

#### Scenario: Trainer allowed
- **WHEN** a trainer of the tenant opens `/control-ingreso`
- **THEN** the page SHALL render

#### Scenario: Member redirected
- **WHEN** a `usuario` member opens either route
- **THEN** they SHALL be redirected to `/portal/orgs/{tenantId}`

### Requirement: Event selector
`ControlIngresoEventosPage` SHALL replicate the list view of the events management page ("Eventos"), reusing `useGestionEventos`, `EventosToolbar` and `EventosTable`:
- It SHALL list the tenant's events with `borrador = false`. Drafts SHALL never be listed.
- The toolbar SHALL offer the same filters as the management list: search by name, Estado (*Todos / Confirmado / Cancelado*, without *Borrador*), Periodo (*Próximos / Pasados / Todos*, default *Próximos*) and Disciplina. It SHALL NOT show the view switcher.
- *Próximos* SHALL include undated events and every event whose `fecha_hora` is at or after today 00:00 America/Bogotá, so an event that already started today stays listed.
- The table SHALL show Evento, Fecha y hora, Lugar, Entrenador, Cupo and Estado, 20 rows per page, stacked below `md`. It SHALL NOT show the Visibilidad and Activo columns or the admin actions menu.
- The Acciones cell SHALL show a "Control de ingreso" link to the check-in page for `confirmado` events, and the text "Evento cancelado" otherwise.

With no events, the page SHALL read "No hay eventos para controlar ingreso." With no match, it SHALL read "No hay eventos que coincidan con los filtros" with "Limpiar filtros". Loading and error-with-retry states SHALL exist.

#### Scenario: Draft events hidden
- **WHEN** the tenant has a draft and a confirmed event for tomorrow
- **THEN** only the confirmed event SHALL be listed

#### Scenario: Event in progress stays listed
- **WHEN** a confirmed event started two hours ago today and Periodo is *Próximos*
- **THEN** the event SHALL be listed

#### Scenario: Past events through the filter
- **WHEN** staff sets Periodo to *Pasados*
- **THEN** events before today SHALL be listed, newest first

#### Scenario: Cancelled event
- **WHEN** a cancelled event is listed
- **THEN** its row SHALL read "Evento cancelado" and SHALL NOT link to the check-in page

### Requirement: Check-in screen
`ControlIngresoPage` SHALL show the following:
- **Header**: the event name and date, and "Ingresaron X / Y" (`ingresaron` / `activas`) with a progress bar.
- **QR scanner**: `qr-scanner`, loaded with `next/dynamic` (`ssr: false`), using the rear camera. The camera SHALL be off when the page opens, and the page SHALL NOT ask for the camera permission on its own. The panel SHALL show the button "Habilitar lectura de QR con cámara"; pressing it starts the camera. While the camera is on, a "Desactivar cámara" button SHALL turn it off. The scanner SHALL:
  - skip the same code for 3 s;
  - ignore input while a request is pending or a result is shown;
  - stop on unmount and when the tab is hidden.
- **Camera fallback**: when camera access fails after pressing the button, the panel SHALL show "No se pudo acceder a la cámara. Ingresa el código manualmente.", keep the enable button to retry, and focus the manual input.
- **Manual input**: a labelled field that submits on Enter. Malformed codes SHALL show "Código no encontrado" without a request.
- **Result card**: `role="status"`, `aria-live="assertive"`, with icon, label and color per result:

  | Result | Color | Label |
  |---|---|---|
  | `ok` | green | "Ingreso registrado" |
  | `ya_ingreso` | amber | "Ya ingresó a las HH:MM · registrado por {nombre}" |
  | `pendiente` | amber | "Pago pendiente de validación" |
  | `otro_evento` | amber | "Esta entrada es para {evento}" |
  | `anulada` | red | "Entrada anulada — no válida para ingreso" |
  | `no_encontrado` | red | "Código no encontrado" |

  The card SHALL show the attendee name, ticket name and code when present. "Deshacer ingreso" SHALL be offered on `ok` and `ya_ingreso`. `ok` SHALL dismiss after 4 s. Other results SHALL stay until "Siguiente". When `navigator.vibrate` exists, it SHALL pulse once for `ok` and twice otherwise.
- **Errors**: RPC errors SHALL be shown inline with "Reintentar".
- **Refresh**: after every register or revert, the header and the attendee list SHALL refresh.

#### Scenario: Green result
- **WHEN** the scanner reads a valid unused code
- **THEN** a green "Ingreso registrado" card with the attendee name SHALL be shown, and the counter SHALL increase by 1

#### Scenario: Camera off by default
- **WHEN** staff opens the check-in page
- **THEN** the camera SHALL be off, no permission prompt SHALL appear, and "Habilitar lectura de QR con cámara" SHALL be shown

#### Scenario: Camera enabled
- **WHEN** staff presses "Habilitar lectura de QR con cámara" and grants the permission
- **THEN** the camera SHALL start and decoded codes SHALL be checked in

#### Scenario: Camera denied
- **WHEN** staff presses the button and the browser denies camera access
- **THEN** the camera message SHALL be shown, the manual input SHALL be focused, and manual check-in SHALL still work

#### Scenario: Undo from the card
- **WHEN** staff clicks "Deshacer ingreso" on an `ok` card
- **THEN** the entry SHALL be reverted and the counter SHALL decrease by 1

### Requirement: Attendee list
`AsistentesIngresoTable` SHALL list the event's `activa` tickets with name, email, ticket name, code and entry status ("Ingresó HH:MM" or "Sin ingreso"). It SHALL offer:
- a search by name, email or code;
- a filter *Todos / Ingresaron / Pendientes de ingreso*;
- 20 rows per page, stacked into cards below `md`;
- loading, error-with-retry and empty states.

Each row SHALL offer "Registrar ingreso" (calls `registrar_ingreso_evento` with the row's code) or "Revertir". "Revertir" opens `RevertirIngresoModal` and calls `revertir_ingreso_evento` on confirm.

#### Scenario: Filter used tickets
- **WHEN** staff selects "Ingresaron"
- **THEN** only tickets with an entry SHALL be listed

#### Scenario: Manual registration from the list
- **WHEN** staff clicks "Registrar ingreso" on an attendee who forgot their PDF
- **THEN** the entry SHALL be recorded and the row SHALL show "Ingresó HH:MM"

