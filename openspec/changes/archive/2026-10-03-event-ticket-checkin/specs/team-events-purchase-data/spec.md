## ADDED Requirements

### Requirement: Ticket check-in columns
`public.evento_tickets` SHALL have:
- `ingreso_at timestamptz` (nullable);
- `ingreso_por uuid` referencing `auth.users(id)` `on delete set null`;
- check `evento_tickets_ingreso_ck`: `ingreso_at is null or estado = 'activa'`;
- check `evento_tickets_ingreso_por_ck`: `ingreso_at is not null or ingreso_por is null`;
- index `idx_evento_tickets_evento_ingreso (evento_id, ingreso_at)`.

The columns SHALL be written only by `registrar_ingreso_evento` / `revertir_ingreso_evento`. Client write privileges SHALL stay revoked, and the existing select policies SHALL expose the columns to the ticket owner and tenant staff.

#### Scenario: Used ticket cannot be voided
- **WHEN** a ticket with `ingreso_at` set is updated to `estado = 'anulada'`
- **THEN** the update SHALL fail on `evento_tickets_ingreso_ck`

#### Scenario: Direct write denied
- **WHEN** `authenticated` updates `evento_tickets.ingreso_at`
- **THEN** the statement SHALL fail with a permission error

## MODIFIED Requirements

### Requirement: Re-upload, cancel and validate RPCs
The system SHALL provide these three RPCs, each `security definer`:
- **`reenviar_comprobante_compra_evento(p_compra_id, p_comprobante_path)`** (authenticated): only the owner, only when `rechazada`. It re-checks the path, and per event it re-checks visibility, the unique-email rule and capacity (`ENTRADA_DUPLICADA` / `CUPO_AGOTADO`). Then it clears `motivo_rechazo` and applies the transition.
- **`cancelar_compra_evento(p_compra_id)`** (authenticated): only the owner, only when `en_validacion` or `confirmada`. When any ticket of the purchase has `ingreso_at` set, it SHALL raise `CANCELACION_NO_PERMITIDA` (US-0131). Otherwise it applies the **main** event's `cancelacion_antelacion_horas`:
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

#### Scenario: Cancellation of a used ticket
- **WHEN** the owner cancels within the window a purchase whose ticket already has `ingreso_at`
- **THEN** it SHALL raise `CANCELACION_NO_PERMITIDA` and nothing SHALL change

#### Scenario: Cancellation frees capacity
- **WHEN** the owner cancels within the window
- **THEN** the purchase SHALL be `cancelada`, its tickets `anulada`, and a `compra_cancelada` outbox row SHALL exist

#### Scenario: Validate a non-pending purchase
- **WHEN** staff validates a purchase that is already `confirmada`
- **THEN** it SHALL raise `ESTADO_INVALIDO`

#### Scenario: Non-staff validation
- **WHEN** a user who is not admin or trainer of the tenant calls `validar_compra_evento`
- **THEN** it SHALL raise `FORBIDDEN`
