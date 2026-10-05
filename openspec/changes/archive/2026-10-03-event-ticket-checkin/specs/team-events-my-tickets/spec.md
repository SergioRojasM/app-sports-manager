## ADDED Requirements

### Requirement: Used ticket badge
`MiCompraCard` SHALL show a "Usada" badge (text, not color only) next to every ticket code with `ingreso_at` set. `listMisCompras` SHALL return `ingresoAt` for each ticket.

#### Scenario: Used ticket
- **WHEN** a buyer opens "Mis entradas" after their ticket was checked in
- **THEN** the ticket code SHALL show "Usada"

## MODIFIED Requirements

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
