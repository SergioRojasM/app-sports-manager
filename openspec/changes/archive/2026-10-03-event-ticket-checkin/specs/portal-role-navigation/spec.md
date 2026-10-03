## ADDED Requirements

### Requirement: Eventos Check-in menu entry
Inside a tenant context, the sidebar SHALL include a "Eventos Check-in" entry (icon `qr_code_scanner`) linking to `/portal/orgs/{tenantId}/control-ingreso`:
- for `administrador`, immediately after "Eventos";
- for `entrenador`, immediately after "Reservas".

The `usuario` role SHALL NOT see it.

#### Scenario: Administrator sees the entry
- **WHEN** the resolved role is `administrador`
- **THEN** "Eventos Check-in" SHALL appear right after "Eventos"

#### Scenario: Trainer sees the entry
- **WHEN** the resolved role is `entrenador`
- **THEN** "Eventos Check-in" SHALL appear right after "Reservas"

#### Scenario: Member does not see the entry
- **WHEN** the resolved role is `usuario`
- **THEN** the sidebar SHALL NOT include "Eventos Check-in"
