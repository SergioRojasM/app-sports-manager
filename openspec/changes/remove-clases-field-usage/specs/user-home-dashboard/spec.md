## MODIFIED Requirements

### Requirement: My subscriptions card with filter chips
The dashboard SHALL display a subscriptions card in the left column with interactive status filter chips (Todas / Activas / Pendientes). The component SHALL be a client component (`"use client"`) that receives the full subscription list as props and filters locally using `useState`. Each subscription row SHALL display: plan name, organization, status badge (emerald=activa, amber=pendiente, slate=vencida, rose=cancelada), date range, and payment status badge. The card SHALL NOT display a class remaining count or a class progress indicator.

#### Scenario: Subscriptions display with all data
- **WHEN** the user has active or pending subscriptions
- **THEN** the system SHALL display each subscription showing: plan name, organization, status badge, date range, and payment status badge — with no class-count or class progress bar

#### Scenario: Filter chips toggle subscription visibility
- **WHEN** the user clicks the "Activas" filter chip
- **THEN** the system SHALL display only subscriptions with `estado = 'activa'`

#### Scenario: Default filter shows all subscriptions
- **WHEN** the subscriptions card first renders
- **THEN** the "Todas" filter chip SHALL be selected and all subscriptions SHALL be visible

#### Scenario: Subscriptions empty state
- **WHEN** the user has no subscriptions matching the active filter
- **THEN** the system SHALL display an empty state message: "No tienes suscripciones activas"

#### Scenario: Subscription row does not show class progress bar
- **WHEN** a subscription row renders
- **THEN** there SHALL be no progress bar or class count indicator (`clases_restantes / clases_plan`) in the row

## REMOVED Requirements

### Requirement: Classes remaining with progress indicator shown in subscription row
**Reason**: `clases_restantes` and `clases_plan` are no longer part of the subscription model in the application layer. Unit tracking is handled via `suscripcion_servicios`.
**Migration**: No action needed. The data columns remain in the DB but are not fetched or displayed.
