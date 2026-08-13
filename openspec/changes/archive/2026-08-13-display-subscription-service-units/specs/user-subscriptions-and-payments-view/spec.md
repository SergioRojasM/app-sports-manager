## MODIFIED Requirements

### Requirement: Each subscription is displayed as a card with plan and status information
Each subscription entry SHALL be rendered as a card containing: plan name (`plan_nombre`), subscription status badge (`SuscripcionEstadoBadge`), start date (`fecha_inicio`) and end date (`fecha_fin`) displayed as "—" when null, and a services section showing per-service unit counters (`suscripcion.servicios`) when `servicios.length > 0`. The legacy `clases_restantes / clases_plan` counter SHALL NOT be rendered.

#### Scenario: Subscription card shows plan name and status badge
- **WHEN** the subscription list renders
- **THEN** each card SHALL display the associated plan name and a `SuscripcionEstadoBadge`

#### Scenario: Null dates display as dash
- **WHEN** a subscription has `fecha_inicio` or `fecha_fin` as null
- **THEN** the corresponding date field SHALL display "—"

#### Scenario: Services section is hidden when subscription has no services
- **WHEN** a subscription has an empty `servicios` array
- **THEN** no services section SHALL be rendered below the date row

#### Scenario: Services section shows per-service unit rows with progress bars
- **WHEN** a subscription has one or more entries in `servicios`
- **THEN** the card SHALL render a services section with one row per service, each showing the service name, remaining/included units, and a mini progress bar (omitted when `unidades_incluidas` is null)

#### Scenario: Exhausted service is highlighted in rose
- **WHEN** a service entry has `unidades_restantes === 0` and `unidades_incluidas` is not null
- **THEN** the progress bar and counter for that service SHALL use rose color classes

#### Scenario: Unlimited service shows ∞ without progress bar
- **WHEN** a service entry has `unidades_incluidas: null`
- **THEN** the counter SHALL display `∞` and no progress bar SHALL be rendered for that service
