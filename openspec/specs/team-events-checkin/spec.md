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
`ControlIngresoEventosPage` SHALL follow the grit-arena-v3 frame `LV7I0`, reusing `useGestionEventos` for data and filters:
- **Header**: the single `h1` "Control de ingreso." ("ingreso." as the italic cyan accent). Its actions SHALL hold a search field ("Buscar evento", by name) and three pill selects: Estado (*Todos / Confirmado / Cancelado*, without *Borrador*), Periodo (*Próximos / Pasados / Todos*, default *Próximos*) and Disciplina. There SHALL be no view switcher.
- It SHALL list the tenant's events with `borrador = false`. Drafts SHALL never be listed.
- *Próximos* SHALL include undated events and every event whose `fecha_hora` is at or after today 00:00 America/Bogotá, so an event that already started today stays listed.
- A section line SHALL read "Eventos disponibles" with "N de M eventos" (filtered / total).
- Each event SHALL be rendered as a check-in event card (see "Check-in event card"), 10 per page, with the kit pagination below the list.
- A "Cómo funciona" strip SHALL follow the list, with three steps: "01 Elige el evento" ("Abre el control de un evento confirmado."), "02 Escanea o digita" ("Lee el QR con la cámara o escribe el código EV-.") and "03 Registra el ingreso" ("El contador se actualiza en tiempo real.").

With no events, the page SHALL read "No hay eventos para controlar ingreso." With no match, it SHALL read "No hay eventos que coincidan con los filtros" with "Limpiar filtros". Loading (skeleton cards) and error-with-retry states SHALL exist.

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
- **THEN** its card SHALL read "Evento cancelado" and SHALL NOT link to the check-in page

#### Scenario: Count line
- **WHEN** the tenant has 5 non-draft events and the filters match 2
- **THEN** the section line SHALL read "2 de 5 eventos"

#### Scenario: Pagination
- **WHEN** the filters match 23 events
- **THEN** page 1 SHALL show 10 cards, and the pagination SHALL offer 3 pages

### Requirement: Check-in screen
`ControlIngresoPage` SHALL follow the grit-arena-v3 frame `xjlmU` and show the following:
- **Header**:
  - a "Volver a eventos" link to `/control-ingreso`;
  - the event name as the page's single `h1`, in the display style (Exo 2 600 italic);
  - next to the name, a live pill "Check-in abierto" for `confirmado` events, or an "Evento cancelado" tag otherwise;
  - a meta row with the Bogotá date and time, the place ("Por definir" when none) and the discipline, each with an icon;
  - a progress card with "X / Y ingresaron" (`ingresaron` / `activas`), a "N pendientes" pill (`activas − ingresaron`), a progress track, and "N con pago pendiente de validación" when `pendientes_pago > 0`.
- **Layout**: from `lg`, a 400px scanner column next to the attendee panel. Below `lg`, the order SHALL be: header, scanner, manual input, result card, latest check-ins, attendee panel.
- **QR scanner**: `qr-scanner`, loaded with `next/dynamic` (`ssr: false`), using the rear camera.
  - The card SHALL be titled "Escanear QR" and show a camera status: "Cámara inactiva", "Iniciando cámara…" or "Cámara activa".
  - The camera SHALL be off when the page opens, and the page SHALL NOT ask for the camera permission on its own. The viewport SHALL show a framed placeholder and the button "Habilitar cámara"; pressing it starts the camera.
  - While the camera is on, the viewport SHALL show the video inside cyan corner brackets with a scan line, and a "Desactivar cámara" button SHALL turn it off. Under `prefers-reduced-motion: reduce` the scan line SHALL NOT animate.
  - The scanner SHALL skip the same code for 3 s, ignore input while a request is pending or a result is shown, and stop on unmount and when the tab is hidden.
- **Camera fallback**: when camera access fails after pressing the button, the panel SHALL show "No se pudo acceder a la cámara. Ingresa el código manualmente.", keep the enable button to retry, and focus the manual input.
- **Manual input**: a card titled "Código de la entrada", with a fixed "EV-" prefix, a labelled monospace field for the rest of the code, and "Validar". It SHALL submit on Enter. A pasted full code with the "EV-" prefix SHALL be accepted. Malformed codes SHALL show "Código no encontrado" without a request.
- **Result card**: `role="status"`, `aria-live="assertive"`, with icon, label and tone per result:

  | Result | Tone | Label |
  |---|---|---|
  | `ok` | success | "Ingreso registrado" |
  | `ya_ingreso` | warning | "Ya ingresó a las HH:MM · registrado por {nombre}" |
  | `pendiente` | warning | "Pago pendiente de validación" |
  | `otro_evento` | warning | "Esta entrada es para {evento}" |
  | `anulada` | danger | "Entrada anulada — no válida para ingreso" |
  | `no_encontrado` | danger | "Código no encontrado" |

  The card SHALL show the attendee name, ticket name and code when present. "Deshacer ingreso" SHALL be offered on `ok` and `ya_ingreso`. `ok` SHALL dismiss after 4 s. Other results SHALL stay until "Siguiente". When `navigator.vibrate` exists, it SHALL pulse once for `ok` and twice otherwise.
- **Errors**: RPC errors SHALL be shown inline as a danger alert with "Reintentar".
- **Refresh**: after every register or revert, the header and the attendee list SHALL refresh.

#### Scenario: Green result
- **WHEN** the scanner reads a valid unused code
- **THEN** a success-tone "Ingreso registrado" card with the attendee name SHALL be shown, and the counter SHALL increase by 1

#### Scenario: Camera off by default
- **WHEN** staff opens the check-in page
- **THEN** the camera SHALL be off, the status SHALL read "Cámara inactiva", no permission prompt SHALL appear, and "Habilitar cámara" SHALL be shown

#### Scenario: Camera enabled
- **WHEN** staff presses "Habilitar cámara" and grants the permission
- **THEN** the camera SHALL start, the status SHALL read "Cámara activa", and decoded codes SHALL be checked in

#### Scenario: Camera denied
- **WHEN** staff presses the button and the browser denies camera access
- **THEN** the camera message SHALL be shown, the status SHALL return to "Cámara inactiva", the manual input SHALL be focused, and manual check-in SHALL still work

#### Scenario: Undo from the card
- **WHEN** staff clicks "Deshacer ingreso" on an `ok` card
- **THEN** the entry SHALL be reverted and the counter SHALL decrease by 1

#### Scenario: Manual code with prefix pasted
- **WHEN** staff pastes "EV-APKB4NSQ" into the manual field and presses Enter
- **THEN** the code SHALL be checked in as "EV-APKB4NSQ"

#### Scenario: Pending counter
- **WHEN** the event has 100 `activa` tickets and 37 entries
- **THEN** the header SHALL read "37 / 100 ingresaron" and "63 pendientes"

#### Scenario: Cancelled event header
- **WHEN** staff opens the check-in page of a cancelled event
- **THEN** the header SHALL show the "Evento cancelado" tag instead of "Check-in abierto"

### Requirement: Attendee list
The attendee panel SHALL list the event's `activa` tickets. Each row SHALL show:
- an initials avatar;
- the attendee name, with the ticket name below it;
- the code in a monospace face;
- the entry status: "Pendiente" (dashed-circle icon, muted), or the entry time "h:mm a" (check icon, cyan).

Rows of attendees who entered SHALL be tinted cyan. The panel SHALL offer:
- a title "Asistentes" with the total count;
- a segmented filter with counts: *Todos N / Ingresaron N / Pendientes N*;
- a search by name, email or code;
- an order select: *Pendientes primero* (default), *Nombre A–Z*, *Ingreso más reciente*;
- column heads ASISTENTE / CÓDIGO / INGRESO from `md`, and stacked rows below `md`;
- 50 rows per page, with the kit pagination and the summary "A–B de N asistentes". From `lg`, the rows SHALL scroll inside the panel;
- loading, error-with-retry and empty states.

Each row SHALL offer "Registrar" (calls `registrar_ingreso_evento` with the row's code, showing "Registrando…" while pending) or "Deshacer". "Deshacer" opens `RevertirIngresoModal` and calls `revertir_ingreso_evento` on confirm. Row actions SHALL have an `aria-label` that includes the attendee name.

#### Scenario: Filter used tickets
- **WHEN** staff selects "Ingresaron"
- **THEN** only tickets with an entry SHALL be listed

#### Scenario: Manual registration from the list
- **WHEN** staff clicks "Registrar" on an attendee who forgot their PDF
- **THEN** the entry SHALL be recorded and the row SHALL show the entry time, tinted cyan

#### Scenario: Pending first by default
- **WHEN** the list has attendees who entered and attendees who did not
- **THEN** the attendees without an entry SHALL be listed first, each group by name

#### Scenario: Most recent entry order
- **WHEN** staff selects "Ingreso más reciente"
- **THEN** attendees SHALL be ordered by entry time, newest first, with those without an entry last

#### Scenario: Segment counts
- **WHEN** the event has 100 `activa` tickets and 37 entries
- **THEN** the segments SHALL read "Todos 100", "Ingresaron 37" and "Pendientes 63"

#### Scenario: Email search
- **WHEN** staff searches "laura@"
- **THEN** the attendees whose email contains "laura@" SHALL be listed, even though the email is not shown in the row

### Requirement: Check-in event card
Each card in the event selector SHALL show:
- the banner as photo (placeholder when missing), with an estado pill ("CONFIRMADO" cyan, or "CANCELADO" danger) and a discipline overlay pill;
- a countdown pill by Bogotá calendar days ("En N días" / "Mañana" / "Hoy" / "Finalizado"; none when undated) and the Bogotá date and time ("Fecha por definir");
- the name in the display style;
- field tiles Lugar, Entrenador ("Sin asignar"), Cupo ("Ilimitado") and Entradas (`activas`).

#### Scenario: Card content
- **WHEN** a confirmed event "GRIT 10K" is 6 days away, has no venue or trainer, `cupo_maximo = 100` and 2 `activa` tickets
- **THEN** its card SHALL show "En 6 días", "Por definir", "Sin asignar", "100" and "2"

#### Scenario: Event today
- **WHEN** a confirmed event's Bogotá date is today
- **THEN** its countdown pill SHALL read "Hoy"

### Requirement: Check-in event card counters
For `confirmado` events, the card's right zone SHALL show a progress ring "X/Y" with "ingresaron" (`ingresaron` / `activas`) and the button "Abrir control" → `/control-ingreso/{eventoId}`. Cancelled events SHALL show "Evento cancelado" instead of the ring and the button. The counters SHALL come from `resumen_ingresos_evento`, requested only for the cards on the current page.

#### Scenario: Counters per page
- **WHEN** the selector shows page 2
- **THEN** counters SHALL be requested only for the events on page 2

#### Scenario: Counter fails
- **WHEN** the counter request fails for one event
- **THEN** that card's ring SHALL show "—", and its "Abrir control" button SHALL still work

### Requirement: Latest check-ins
The scanner column SHALL show a "Últimos ingresos" card with an "En vivo" marker. It SHALL list up to 5 attendees with an entry, newest first, each with a check icon, the name and the entry time. With no entries, it SHALL read "Aún no hay ingresos."

#### Scenario: Newest first
- **WHEN** Laura entered at 4:02 pm and Mateo at 3:58 pm
- **THEN** the card SHALL list Laura first, then Mateo, with their times

#### Scenario: Revert removes the entry
- **WHEN** Laura's entry is reverted
- **THEN** Laura SHALL no longer be listed in "Últimos ingresos"

### Requirement: Live refresh of the check-in screen
While the tab is visible, the check-in screen SHALL silently refresh the counters and the attendee list every 20 s, keeping the filters, order, page and scroll position. It SHALL pause while the tab is hidden, and refresh once when it becomes visible again. A failed silent refresh SHALL keep the data on screen and SHALL NOT replace it with an error state.

#### Scenario: Another door checks someone in
- **WHEN** another staff member checks in an attendee on a different device
- **THEN** within 20 s the counter, the attendee row and "Últimos ingresos" SHALL reflect it on this screen

#### Scenario: Hidden tab
- **WHEN** the tab is hidden for 2 minutes
- **THEN** no refresh requests SHALL be sent during that time, and one refresh SHALL run when the tab is shown again

#### Scenario: Silent refresh fails
- **WHEN** a background refresh fails
- **THEN** the previous list and counters SHALL stay on screen
