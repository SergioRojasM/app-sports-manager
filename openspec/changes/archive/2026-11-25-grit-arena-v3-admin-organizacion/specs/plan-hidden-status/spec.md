# Spec Delta

## MODIFIED Requirements

### Requirement: Plans table SHALL show the Activo no visible status
The administrator plan cards SHALL convey a hidden plan (`activo = true`, `visible_atletas = false`) with the "Activo" status tag and an "Oculto" visibility pill with an `eye-off` icon, so the state is not conveyed by color alone. An inactive plan SHALL show the "Inactivo" status tag.

#### Scenario: Hidden plan badge
- **WHEN** the administrator views the plans grid containing a hidden plan
- **THEN** that card shows the "Activo" status tag and the "Oculto" visibility pill with its icon, regardless of `es_publico`

#### Scenario: Inactive plan
- **WHEN** the administrator views a plan with `activo = false`
- **THEN** that card shows the "Inactivo" status tag
