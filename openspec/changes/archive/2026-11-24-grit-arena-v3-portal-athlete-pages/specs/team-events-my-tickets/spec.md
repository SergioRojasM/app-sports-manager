# Spec Delta

## MODIFIED Requirements

### Requirement: Mis Entradas listing
The page SHALL show the single `h1` "Mis entradas." ("entradas." as the accent). The header SHALL hold:
- a segmented control *Próximas* (events with `fecha_hora >= now()` or undated) and *Pasadas*, each showing its count;
- an "Estado" select: Todos plus every purchase estado.

Each purchase SHALL be rendered as `MiCompraCard`, a ticket-shaped card (see "Mis Entradas ticket card").

With no purchases, the page SHALL show "Aún no tienes entradas." and "Explorar eventos" → `/portal/eventos`. When the tab and estado match nothing, it SHALL show "No hay entradas {próximas|pasadas} con este filtro."

#### Scenario: Empty state
- **WHEN** the user has no purchases
- **THEN** "Aún no tienes entradas." and a link to `/portal/eventos` SHALL be shown

#### Scenario: Rejected purchase shows reason
- **WHEN** a purchase is `rechazada` with reason "Comprobante ilegible"
- **THEN** the card SHALL show "Comprobante ilegible"

#### Scenario: Tab counts
- **WHEN** the user has one upcoming purchase and no past purchase
- **THEN** the segmented control SHALL read "Próximas 1" and "Pasadas 0", and "Próximas" SHALL be pressed by default

### Requirement: Mis Entradas actions
Each card SHALL offer:
- **"Descargar PDF"**: when the estado is not `pendiente_pago` and at least one ticket is not `anulada`.
- **"Reenviar comprobante"**: when `rechazada`. It opens `ReenviarComprobanteModal` (same file limits), uploads to the purchase folder, and calls `reenviarComprobante`. The mapped errors are shown inline.
- **"Cancelar"**: only when all of these hold:
  - the estado is `en_validacion` or `confirmada`;
  - no ticket of the purchase has `ingreso_at` set (US-0131);
  - `puedeCancelarCompra` is true (the same rule as the RPC).

  It opens `CancelarCompraModal`, which repeats the policy and calls `cancelarCompra` on confirm.
- **"Ver evento"** → `/portal/eventos/{id}`.

Each action SHALL have its own pending state and inline error. "Descargar PDF" SHALL be the primary action. The others SHALL be secondary or ghost pill buttons.

#### Scenario: Cancel not offered with null policy
- **WHEN** the event's `cancelacion_antelacion_horas` is null
- **THEN** "Cancelar" SHALL NOT be shown, and the card SHALL read "Esta entrada no admite cancelación ni reembolso."

#### Scenario: Cancel not offered for a used ticket
- **WHEN** the purchase is within the cancellation window but one of its tickets has `ingreso_at` set
- **THEN** "Cancelar" SHALL NOT be shown

#### Scenario: Cancel within window
- **WHEN** the policy is 48 h, the event is 5 days away, and the user confirms "Cancelar"
- **THEN** the purchase SHALL show as "Cancelada", and the PDF action SHALL no longer be offered

#### Scenario: Re-upload blocked by capacity
- **WHEN** a rejected purchase's event is now full and the user re-uploads
- **THEN** "No quedan cupos para {evento}." SHALL be shown in the modal

## ADDED Requirements

### Requirement: Mis Entradas ticket card
`MiCompraCard` SHALL have three parts:
- **event side**: banner or placeholder, estado pill (text), date tile, organization and event name;
- **details**: a countdown pill, the long Bogotá date, the fields Entrada / Total / Pago / Lugar, codes for multi-ticket purchases, policy and rejection reason;
- **stub**: see "Mis Entradas QR stub".

From 1024px the parts sit side by side. Below that, they stack.

#### Scenario: Countdown
- **WHEN** a confirmed purchase's event is 6 days away in Bogotá
- **THEN** the card SHALL show "Faltan 6 días" and "Sábado 21 de noviembre · 4:20 pm"

#### Scenario: Countdown edges
- **WHEN** the event is tomorrow, today, already past, or undated
- **THEN** the pill SHALL read "Mañana", "Hoy" or "Finalizado", or SHALL NOT be shown for the undated event

#### Scenario: Free purchase without payment method
- **WHEN** the total is 0 and there is no payment method
- **THEN** the fields SHALL read "Gratis" and "—"

#### Scenario: Place values
- **WHEN** the place is a URL, or is empty
- **THEN** the Lugar field SHALL show a "Ver ubicación" link, or "Por definir"

#### Scenario: Multiple-ticket type
- **WHEN** the purchase is of type *Múltiple*
- **THEN** the Entrada field SHALL show the ticket name followed by "Múltiple"

#### Scenario: Multiple ticket codes
- **WHEN** a *Múltiple* purchase has tickets for three events
- **THEN** the details SHALL list three lines with each event name and its code

### Requirement: Mis Entradas QR stub
The stub SHALL show "PRESENTA EN EL INGRESO", a QR encoding the code of the first `activa` ticket, and that code in a monospace face. The QR SHALL be generated in the browser, with no network request, and SHALL have alt text "Código QR de la entrada {código}". When no ticket is `activa`, the stub SHALL show no QR but a message instead:
- "Disponible cuando se confirme tu pago" while the estado is `pendiente_pago` or `en_validacion`;
- "Entrada no válida" otherwise.

#### Scenario: Confirmed purchase
- **WHEN** a purchase is `confirmada` and its ticket `EV-JNC8VPW7` is `activa`
- **THEN** the stub SHALL show a QR encoding `EV-JNC8VPW7` and the text "EV-JNC8VPW7"

#### Scenario: Pending validation
- **WHEN** a purchase is `en_validacion`
- **THEN** the stub SHALL NOT show a QR and SHALL read "Disponible cuando se confirme tu pago"

#### Scenario: Cancelled purchase
- **WHEN** a purchase is `cancelada` and all its tickets are `anulada`
- **THEN** the stub SHALL read "Entrada no válida"

#### Scenario: Used ticket
- **WHEN** the first active ticket has `ingreso_at` set
- **THEN** the stub SHALL still show its QR, together with the text badge "Usada"

### Requirement: Mis Entradas suggestions
Below the purchases, the page SHALL show "Te puede interesar" with up to 4 events as grid cards, each linking to its portal detail page. These events SHALL be listed to the user, start within the next 60 days (Bogotá), and have no purchase by the user. The section SHALL include "Ver todos los eventos" → `/portal/eventos`. It SHALL be hidden when no event qualifies or the event request fails, and SHALL NOT block or delay the purchases list.

#### Scenario: Suggestions exclude purchased events
- **WHEN** the user holds a ticket for "GRIT 10K" and five other events are upcoming
- **THEN** "GRIT 10K" SHALL NOT be suggested and four of the other events SHALL be shown, soonest first

#### Scenario: Suggestions failure is silent
- **WHEN** the events request fails
- **THEN** the purchases SHALL still render and the suggestions section SHALL NOT be shown
