## ADDED Requirements

### Requirement: Gestion-equipo page SHALL render a tab bar with Equipo and Solicitudes tabs
`EquipoPage` SHALL render a tab bar with two tabs: **Equipo** and **Solicitudes**. The active tab SHALL be managed via local `useState` (default: `'equipo'`). The Equipo tab SHALL render the existing member list content. The Solicitudes tab SHALL render `SolicitudesTab`. Both tabs SHALL be visible only to users with the `administrador` role.

#### Scenario: Equipo tab is active by default
- **WHEN** an administrator opens the gestion-equipo page
- **THEN** the system SHALL render the Equipo tab as active and display the member list

#### Scenario: Clicking Solicitudes tab switches content
- **WHEN** the administrator clicks the Solicitudes tab
- **THEN** the system SHALL render `SolicitudesTab` in place of the member list content

#### Scenario: Clicking Equipo tab restores member list
- **WHEN** the administrator clicks the Equipo tab after viewing Solicitudes
- **THEN** the system SHALL render the original member list content
