## MODIFIED Requirements

### Requirement: Admin and trainer booking management — create on behalf
The system SHALL allow entrenadores and administradores to create a booking on behalf of any tenant atleta by selecting that atleta from a **searchable combobox** that filters the active member list by full name or `numero_identificacion`. The picker MUST fetch `numero_identificacion` and `tipo_identificacion` alongside `nombre`, `apellido`, and `email` from `usuarios`.

#### Scenario: Create booking on behalf of athlete
- **WHEN** an entrenador or administrador submits the booking form with a valid `atleta_id` and optional notes
- **THEN** a new booking is created for the selected atleta in `pendiente` state

#### Scenario: Athlete picker only shows tenant atletas
- **WHEN** the booking form is opened by an entrenador or administrador
- **THEN** the athlete selector MUST only list active members of the current tenant (filtered by `miembros_tenant.activo = true`)

#### Scenario: Athlete picker is a searchable combobox
- **WHEN** the booking form is opened by an entrenador or administrador in create mode
- **THEN** the athlete field MUST be rendered as a searchable combobox (not a plain `<select>`)
- **THEN** typing in the field SHALL filter the list by name or identification number
