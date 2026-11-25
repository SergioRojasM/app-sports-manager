## MODIFIED Requirements

### Requirement: Admin and trainer booking management — create on behalf
The system SHALL allow entrenadores and administradores to create a booking on behalf of any tenant atleta by selecting that atleta from a picker filtered to tenant members with `atleta` role. The picker SHALL exclude members whose `miembros_tenant.estado` is `inactivo` or `pendiente_activacion`.

#### Scenario: Create booking on behalf of athlete
- **WHEN** an entrenador or administrador submits the booking form with a valid `atleta_id` and optional notes
- **THEN** a new booking is created for the selected atleta in `pendiente` state

#### Scenario: Athlete picker only shows tenant atletas
- **WHEN** the booking form is opened by an entrenador or administrador
- **THEN** the athlete selector MUST only list members of the current tenant with the `atleta` role

#### Scenario: Athlete picker excludes pending-activation members
- **WHEN** the booking form is opened by an entrenador or administrador and the tenant has a member with `estado = 'pendiente_activacion'`
- **THEN** the athlete selector MUST NOT list that member

#### Scenario: Athlete picker still excludes inactive members
- **WHEN** the booking form is opened and the tenant has a member with `estado = 'inactivo'`
- **THEN** the athlete selector MUST NOT list that member

#### Scenario: Activated member becomes selectable
- **WHEN** an administrator changes a member from `pendiente_activacion` to `activo` and reopens the booking form
- **THEN** the athlete selector SHALL list that member
