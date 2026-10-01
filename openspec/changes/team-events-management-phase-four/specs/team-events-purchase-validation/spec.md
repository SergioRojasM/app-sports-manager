## ADDED Requirements

### Requirement: Event purchases admin route
The system SHALL provide `/portal/orgs/{tenantId}/gestion-eventos/{eventoId}/compras` under the `(administrador)` group, rendering `EventoComprasPage`. Non-admins SHALL be redirected by the existing layout. The breadcrumb SHALL read "Eventos › Evento › Compras".

#### Scenario: Trainer redirected
- **WHEN** a trainer opens the route
- **THEN** they SHALL be redirected by the `(administrador)` layout

### Requirement: Purchases header and stats
The page SHALL show:
- the event name;
- "Vendidas: X / {cupo_maximo | ilimitado}", where X is the event's tickets that are not `anulada` (`contarVendidas`);
- the stats cards *En validación*, *Confirmadas* and *Ingresos confirmados* (the sum of `total` of `confirmada` purchases).

#### Scenario: Sold count
- **WHEN** the event has `cupo_maximo = 100`, with 3 live tickets and 1 `anulada`
- **THEN** the header SHALL read "Vendidas: 3 / 100"

### Requirement: Purchases table
`EventoComprasTable` SHALL list the event's purchases (`listComprasEvento`), newest first, 20 per page, stacked below `md`, with:
- Comprador (name, email, and an "Invitado" / "Registrado" tag);
- Entrada (plus a *Múltiple* badge);
- Total (plus the coupon);
- Método, Estado, Fecha and Acciones.

The filters SHALL be estado and a search by name or email. There SHALL be loading, error-with-retry and empty states.

#### Scenario: Search by email
- **WHEN** the admin types "ana@" in the search
- **THEN** only purchases whose buyer name or email contains it SHALL be shown

### Requirement: Proof and data viewers
- **"Ver comprobante"** SHALL open the proof through a 300 s signed URL: images inline, PDFs in a new tab.
- **"Ver datos"** SHALL open `CompraDatosModal` with the fixed data, plus the profile fields and form answers from `evento_formulario_respuestas`, labelled with the snapshot version they reference (`evento_formularios`), never the current template. Answers are rendered as text; image answers (`archivos`) are opened through signed URLs.

#### Scenario: View proof
- **WHEN** the admin clicks "Ver comprobante" on a purchase with a PDF proof
- **THEN** the PDF SHALL open in a new tab through a signed URL

### Requirement: Validate or reject payment
For `en_validacion` purchases, the table SHALL offer these actions:
- **"Validar pago"** SHALL open `ValidarCompraModal` and, on confirm, call `validarCompra(id, true)`.
- **"Rechazar"** SHALL open `RechazarCompraModal` with a required `motivo` (1–500 chars) and call `validarCompra(id, false, motivo)`.

Errors SHALL be shown inline in the modal. On success, the list, count and stats SHALL reload.

#### Scenario: Validate
- **WHEN** the admin validates an `en_validacion` purchase
- **THEN** it SHALL show as "Confirmada", its tickets SHALL be `activa`, and a `compra_confirmada` outbox row SHALL exist

#### Scenario: Reject requires reason
- **WHEN** the admin submits "Rechazar" with an empty reason
- **THEN** an inline error SHALL be shown and no request SHALL be made

#### Scenario: Stale state
- **WHEN** the purchase was already validated in another tab
- **THEN** the modal SHALL show "La compra cambió de estado. Recarga la página."
