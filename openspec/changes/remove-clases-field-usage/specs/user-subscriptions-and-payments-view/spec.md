## MODIFIED Requirements

### Requirement: Each subscription is displayed as a card with plan and status information
Each subscription entry SHALL be rendered as a card containing: plan name (`plan_nombre`), subscription status badge (`SuscripcionEstadoBadge`), start date (`fecha_inicio`) and end date (`fecha_fin`) displayed as "—" when null. The card SHALL NOT display a class count (`clases_restantes / clases_plan`) — this field has been removed from the subscription model.

#### Scenario: Subscription card shows plan name and status badge
- **WHEN** the subscription list renders
- **THEN** each card SHALL display the associated plan name and a `SuscripcionEstadoBadge`

#### Scenario: Null dates display as dash
- **WHEN** a subscription has `fecha_inicio` or `fecha_fin` as null
- **THEN** the corresponding date field SHALL display "—"

#### Scenario: Card does not display class counter
- **WHEN** a subscription card renders
- **THEN** the card SHALL NOT render any "Clases:" label or `clases_restantes / clases_plan` counter

## REMOVED Requirements

### Requirement: Classes counter is hidden when null
**Reason**: `clases_restantes` and `clases_plan` are no longer part of the subscription model in the application layer. Unit tracking is handled via `suscripcion_servicios`.
**Migration**: No data migration needed. The columns remain in the DB but are not read or displayed.

### Requirement: Classes counter shows remaining over total
**Reason**: `clases_restantes` and `clases_plan` are no longer part of the subscription model in the application layer. Unit tracking is handled via `suscripcion_servicios`.
**Migration**: No data migration needed. The columns remain in the DB but are not read or displayed.
