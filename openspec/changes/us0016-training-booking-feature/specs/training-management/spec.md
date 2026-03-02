## ADDED Requirements

### Requirement: Capacity indicator on training cards and calendar events
The system SHALL display a capacity indicator on every training card and calendar event showing the number of active bookings relative to `cupo_maximo`. The indicator MUST use a color signal: green when utilization < 70%, yellow when 70–99%, and red when full (active bookings ≥ `cupo_maximo`). When `cupo_maximo` is null, only the active booking count is shown with no color signal.

#### Scenario: Capacity indicator shows current utilization
- **WHEN** a training instance is displayed in the calendar or list view
- **THEN** the card shows a pill such as "3 / 10" reflecting active (non-cancelled) bookings vs max capacity

#### Scenario: Full training is visually distinguished
- **WHEN** active bookings equal `cupo_maximo` for a training
- **THEN** the capacity indicator renders in red and the "Reservar" action is disabled for atletas

#### Scenario: Unlimited capacity training omits ratio
- **WHEN** `cupo_maximo` is null for a training
- **THEN** the indicator shows only the count of active bookings without a denominator or color signal

### Requirement: reservas_activas enrichment on training instances
The system SHALL enrich each `TrainingInstance` fetched by `useEntrenamientos` with a `reservas_activas` count representing non-cancelled bookings. This count MUST be derived from a join or subquery in the same training fetch operation, not a separate per-instance request.

#### Scenario: Count is available on each instance without extra requests
- **WHEN** training instances are loaded for the active month
- **THEN** each instance includes a `reservas_activas` field populated from the same query

#### Scenario: Count reflects real-time state after booking mutations
- **WHEN** a booking is created, cancelled, or deleted from the reservas panel
- **THEN** the training list/calendar is refreshed and the updated `reservas_activas` count is reflected on the affected instance

### Requirement: Booking panel trigger in training action context
The system SHALL expose a "Ver reservas" action within the training action context (accessible after selecting a training instance) that opens the `ReservasPanel` for that instance. This action MUST be visible to all roles.

#### Scenario: All roles can open the booking panel
- **WHEN** any authenticated tenant member selects a training and triggers "Ver reservas"
- **THEN** the `ReservasPanel` renders for that training instance with role-appropriate content
