# team-events-checkout Specification

## Purpose
TBD - created by archiving change team-events-management-phase-four. Update Purpose after archive.
## Requirements
### Requirement: Checkout stepper shell
`EventoEntradasModal` SHALL be the checkout. It SHALL:
- keep `role="dialog"`, `aria-modal`, `aria-labelledby`, focus on open, and focus return to the trigger;
- close on `Escape` except while submitting;
- render `EventoCompraStepper` with "Entrada › Datos › Pago › Listo", marking the current step with `aria-current="step"`;
- hide "Pago" when the total is 0;
- move focus to each step's heading on step change;
- be full-screen below `sm`, with a sticky footer holding "Atrás" and the primary action.

The `onContinuar` prop and the "La compra de entradas estará disponible próximamente." notice SHALL be removed. All state SHALL live in `useEventoCompra({ evento, modo, open })`.

#### Scenario: Free total hides Pago
- **WHEN** the selected ticket is free
- **THEN** the stepper SHALL show "Entrada › Datos › Listo"

#### Scenario: Escape blocked while submitting
- **WHEN** a purchase request is in flight and the user presses Escape
- **THEN** the modal SHALL stay open

### Requirement: Step 1 ticket selection
Step 1 SHALL list, as a native radio group, the event's `evento_entradas` that are sellable:
- `nombre` and `valor` are not null;
- now is inside `[valida_desde, valida_hasta]`;
- the event is not within `reserva_antelacion_horas` of its start.

Each option SHALL show the name, the price (`formatCop` or "Gratis") and, for *Múltiple*, a badge plus "Incluye acceso a este evento y a: {names}". Names come from the readable bundle events, and unreadable ones are summarized as "N eventos más".

The step SHALL also show:
- a coupon input ("¿Tienes un cupón?"), uppercased as typed, with "Aplicar" calling `validar_cupon_evento`. It shows "{pct} % · {valor} → {total}" or "El cupón no es válido para esta entrada.", and is disabled for free tickets;
- the cancellation policy line (`PoliticaCancelacion`);
- the total;
- in `invitado` mode, the guest note "Estás comprando como invitado. Descarga tu entrada al finalizar; para verla después, crea una cuenta con el mismo correo." and the "¿Prefieres crear una cuenta?" link.

Blocking states:
- no sellable ticket → "La venta de entradas no está disponible para este evento.";
- inside the reservation lead time → "La venta cerró {N} h antes del evento.";
- a registered user with a live ticket → "Ya tienes una entrada para este evento." + "Ver mis entradas".

In each blocking state, "Continuar" SHALL be disabled.

#### Scenario: Ticket outside sale window hidden
- **WHEN** a ticket's `valida_hasta` is in the past
- **THEN** it SHALL NOT be listed

#### Scenario: Sale closed by lead time
- **WHEN** `reserva_antelacion_horas = 24` and the event starts in 10 h
- **THEN** "La venta cerró 24 h antes del evento." SHALL be shown and the user SHALL NOT be able to continue

#### Scenario: Coupon applied
- **WHEN** a valid 20 % coupon is applied to a 50000 ticket
- **THEN** "20 % · $50.000 → $40.000" SHALL be shown and the total SHALL be $40.000

#### Scenario: Registered user already holds a ticket
- **WHEN** a logged-in user with a live ticket for the event opens the modal
- **THEN** "Ya tienes una entrada para este evento." and "Ver mis entradas" SHALL be shown, and "Continuar" SHALL be disabled

### Requirement: Cancellation policy line
`PoliticaCancelacion` / `politicaCancelacionTexto(horas)` SHALL render:
- when `horas` is null: "Esta entrada no admite cancelación ni reembolso.";
- otherwise: "Puedes cancelar hasta {N} h antes del evento. El reembolso lo gestiona el organizador."

It SHALL appear in step 1, step 4, the ticket PDF and "Mis Entradas".

#### Scenario: Null policy
- **WHEN** `cancelacion_antelacion_horas` is null
- **THEN** the line SHALL read "Esta entrada no admite cancelación ni reembolso."

#### Scenario: 48-hour policy
- **WHEN** `cancelacion_antelacion_horas = 48`
- **THEN** the line SHALL read "Puedes cancelar hasta 48 h antes del evento. El reembolso lo gestiona el organizador."

### Requirement: Step 2 buyer data
Step 2 SHALL require three fixed fields:
- "Nombre completo" (≤150);
- "Correo" (a valid email, ≤254). Guests type it twice and the two must match. Registered users see their account email read-only;
- "Fecha de nacimiento" (a past date after 1900-01-01).

Registered users SHALL get the name (`nombre` + `apellido`) and birth date prefilled from `usuarios`.

When the event has a `vigente` form snapshot in `evento_formularios` (read with `getFormularioEvento`, available to guests too; the templates are never read), the step SHALL also render:
- its `perfil_campos_requeridos`, minus the fixed fields, labelled from `FORMULARIO_PERFIL_CAMPOS` and prefilled for registered users from `usuarios` / `perfil_deportivo`;
- the snapshot's `campos`, through `FormularioSeccionesGrouped` (adapted from the snapshot), with the booking validation rules.

`imagen` answers SHALL be kept as `File`s in memory until submit. Data typed here SHALL NOT update `usuarios` or `perfil_deportivo`.

#### Scenario: Guest email mismatch
- **WHEN** a guest types different values in the two email fields
- **THEN** an inline error SHALL be shown and the user SHALL NOT be able to continue

#### Scenario: Future birth date rejected
- **WHEN** the birth date is tomorrow
- **THEN** an inline error SHALL be shown

#### Scenario: No form, only fixed fields
- **WHEN** the event has no `vigente` form snapshot
- **THEN** only the three fixed fields SHALL be rendered

#### Scenario: Profile unchanged
- **WHEN** a registered user edits their name in step 2 and completes the purchase
- **THEN** `usuarios` SHALL be unchanged

### Requirement: Step 3 payment
When the total is greater than 0, step 3 SHALL show:
- the order summary (event, ticket, coupon, total);
- radio cards of `eventos.metodos_pago` **excluding `tipo = 'efectivo'`**, using `EventoMetodoPagoCard`;
- a required proof file input accepting JPEG, PNG, WebP or PDF up to 5 MB, showing the file name and size and a "Quitar" action.

When no non-cash method exists, it SHALL show "Este evento no tiene métodos de pago en línea disponibles. Contacta al organizador." and disable "Confirmar compra".

#### Scenario: Cash hidden
- **WHEN** the event has one transfer method and one cash method
- **THEN** only the transfer method SHALL be offered

#### Scenario: Cash-only event
- **WHEN** a paid event's only methods are cash
- **THEN** the no-online-methods message SHALL be shown and "Confirmar compra" SHALL be disabled

#### Scenario: Oversized proof
- **WHEN** a 6 MB file, or a `.docx`, is chosen as the proof
- **THEN** it SHALL be rejected inline and not kept

### Requirement: Submit and retry flow
On "Confirmar compra" (or "Obtener entrada gratis" when the total is 0), the hook SHALL:
1. call `iniciarCompra`;
2. if `requiere_archivos`, upload the proof and form images with `subirArchivoCompra`;
3. call `finalizarCompra`;
4. show step 4.

While submitting, every control SHALL be disabled and the button SHALL read "Procesando…". On failure in step 2 or 3, the data SHALL be kept, the mapped error SHALL be shown with `role="alert"`, and "Reintentar" SHALL repeat only the failed part with the same `compraId` while it is younger than 30 min. After that, the modal SHALL show "Tu reserva de cupo expiró. Vuelve a intentarlo." and restart at step 1.

#### Scenario: Retry reuses purchase
- **WHEN** the proof upload fails and the user clicks "Reintentar"
- **THEN** `iniciarCompra` SHALL NOT be called again, and the purchase SHALL finish with the original codes

#### Scenario: Free purchase single call
- **WHEN** a free ticket without image form fields is obtained
- **THEN** only `iniciarCompra` SHALL be called, and step 4 SHALL show "¡Entrada confirmada!"

### Requirement: Step 4 confirmation
Step 4 SHALL use `role="status"` and show:
- "¡Entrada confirmada!" when `estado = 'confirmada'`, else "Compra recibida: el organizador validará tu pago";
- the ticket list (event and code, one line per event for *Múltiple*);
- the cancellation policy line;
- "Descargar entrada (PDF)".

Registered users SHALL also see "Ver mis entradas" → `/portal/mis-entradas`. Guests SHALL see "Guarda tu entrada. Para volver a verla o consultar el estado de tu pago, crea una cuenta con **{email}**." and a "Crear mi cuenta" button → `/auth/signup?next=/portal/mis-entradas`. Closing the modal SHALL trigger no request.

#### Scenario: Guest paid confirmation
- **WHEN** a guest `ana@x.com` completes a paid purchase
- **THEN** "Compra recibida: el organizador validará tu pago", the PDF button, the notice naming `ana@x.com` and "Crear mi cuenta" SHALL be shown

### Requirement: Ticket PDF
`descargarEntradasPdf(tickets: TicketPdfData[], fileName)` SHALL generate the PDF in the browser with `jspdf` and `qrcode`, loaded through dynamic import. It SHALL be A5 portrait, one page per ticket, named `entrada-{evento-slug}-{codigo}.pdf`.

Each page SHALL show:
- "GRIT Arena", the organization and the event name;
- the date and time in America/Bogotá, or "Fecha por definir";
- the place;
- the ticket type, the attendee name and email, the code, the purchase date and the total;
- the cancellation policy line.

Only `activa` tickets SHALL have a QR code encoding the code, plus "Entrada válida". `pendiente` tickets SHALL carry "PENDIENTE DE VALIDACIÓN — No válida para ingreso" and no QR. `anulada` tickets SHALL NOT be offered.

#### Scenario: Pending ticket without QR
- **WHEN** a guest downloads the PDF of an `en_validacion` purchase in step 4
- **THEN** the page SHALL show the pending banner and no QR code, and no network request SHALL be made

#### Scenario: Multiple ticket PDF
- **WHEN** a confirmed *Múltiple* purchase with two tickets is downloaded
- **THEN** one file with two pages, each with its own QR code, SHALL be produced

