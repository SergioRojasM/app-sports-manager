# team-events-my-tickets Specification

## Purpose
TBD - created by archiving change team-events-management-phase-four. Update Purpose after archive.
## Requirements
### Requirement: Mis Entradas route and loading
The system SHALL provide `/portal/mis-entradas` at `src/app/portal/(atleta)/mis-entradas/page.tsx`, rendering `MisEntradasPage`, with the same self-scoping as "Mis Reservas". On load, `useMisEntradas` SHALL call `vincularComprasInvitado()` and then `listMisCompras()` (one query with the ticket and event embeds). The breadcrumb label SHALL be "Mis entradas".

#### Scenario: Guest purchase appears after signup
- **WHEN** a guest bought with `ana@x.com`, then signed up and confirmed that email, and opens `/portal/mis-entradas`
- **THEN** the purchase SHALL be listed

#### Scenario: Other email does not see it
- **WHEN** a user with a different email opens the page
- **THEN** that purchase SHALL NOT be listed

#### Scenario: No duplication on revisit
- **WHEN** the user opens the page a second time
- **THEN** the purchase SHALL be listed once

### Requirement: Mis Entradas listing
The page SHALL have the tabs *Próximas* (events with `fecha_hora >= now()` or undated) and *Pasadas*, plus an estado filter. Each purchase SHALL be rendered as `MiCompraCard` with:
- the event banner or placeholder, name, organization, date and place;
- the ticket type, total and payment method name;
- `EventoCompraEstadoBadge` (a text label, not color only);
- the ticket codes, one line per event for *Múltiple*;
- `motivo_rechazo` when `rechazada`;
- the cancellation policy line.

With no purchases, the page SHALL show "Aún no tienes entradas." and "Explorar eventos" → `/portal/eventos`.

#### Scenario: Empty state
- **WHEN** the user has no purchases
- **THEN** "Aún no tienes entradas." and a link to `/portal/eventos` SHALL be shown

#### Scenario: Rejected purchase shows reason
- **WHEN** a purchase is `rechazada` with reason "Comprobante ilegible"
- **THEN** the card SHALL show "Comprobante ilegible"

### Requirement: Mis Entradas actions
Each card SHALL offer:
- **"Descargar PDF"**: when the estado is not `pendiente_pago` and at least one ticket is not `anulada`.
- **"Reenviar comprobante"**: when `rechazada`. It opens `ReenviarComprobanteModal` (same file limits), uploads to the purchase folder, and calls `reenviarComprobante`. The mapped errors are shown inline.
- **"Cancelar"**: only when the estado is `en_validacion` or `confirmada`, no ticket of the purchase has `ingreso_at` set (US-0131), and `puedeCancelarCompra` is true (the same rule as the RPC). It opens `CancelarCompraModal`, which repeats the policy and calls `cancelarCompra` on confirm.
- **"Ver evento"** → `/portal/eventos/{id}`.

Each action SHALL have its own pending state and inline error.

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

### Requirement: Existing-ticket note on the portal event page
`EventoDetallePortalPage` SHALL call `getMiTicketEnEvento(eventoId)`. When a live ticket exists, it SHALL show "Ya tienes una entrada para este evento · Ver mis entradas" instead of opening the checkout from "Obtener entrada".

#### Scenario: Note shown
- **WHEN** a user who holds a `pendiente` ticket opens `/portal/eventos/{id}`
- **THEN** the note with a link to `/portal/mis-entradas` SHALL be shown

### Requirement: Used ticket badge
`MiCompraCard` SHALL show a "Usada" badge (text, not color only) next to every ticket code with `ingreso_at` set. `listMisCompras` SHALL return `ingresoAt` for each ticket.

#### Scenario: Used ticket
- **WHEN** a buyer opens "Mis entradas" after their ticket was checked in
- **THEN** the ticket code SHALL show "Usada"

