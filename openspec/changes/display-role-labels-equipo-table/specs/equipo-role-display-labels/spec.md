## ADDED Requirements

### Requirement: Role display labels mapping
The system SHALL map internal role identifiers to human-readable display labels when rendering role names in the team management table. The mapping SHALL be: `'usuario'` → `'Atleta'`, `'administrador'` → `'Administrador'`, `'entrenador'` → `'Entrenador'`. For any role not present in the map, the raw `nombre` value SHALL be used as a fallback.

#### Scenario: Usuario role displays as Atleta in read-only column
- **WHEN** a team member row has `rol_nombre === 'usuario'` and the table is rendered without `roles` + `onCambiarRol` props
- **THEN** the "Perfil" cell SHALL display the text "Atleta"

#### Scenario: Administrador role displays as Administrador in read-only column
- **WHEN** a team member row has `rol_nombre === 'administrador'` and the table is rendered without `roles` + `onCambiarRol` props
- **THEN** the "Perfil" cell SHALL display the text "Administrador"

#### Scenario: Entrenador role displays as Entrenador in read-only column
- **WHEN** a team member row has `rol_nombre === 'entrenador'` and the table is rendered without `roles` + `onCambiarRol` props
- **THEN** the "Perfil" cell SHALL display the text "Entrenador"

#### Scenario: Role select dropdown displays mapped labels
- **WHEN** the table is rendered with `roles` and `onCambiarRol` props (admin view)
- **THEN** each `<option>` in the role `<select>` SHALL display the mapped label (e.g., "Atleta" for the `'usuario'` role option)

#### Scenario: Role change still passes original RolOption
- **WHEN** the administrator selects a different role from the `<select>` dropdown
- **THEN** `onCambiarRol` SHALL be called with the original `RolOption` (containing the unmodified `id` and `nombre`) — the display label mapping SHALL NOT alter the passed value

#### Scenario: Unknown future role falls back gracefully
- **WHEN** a team member row has a `rol_nombre` not present in the display labels map
- **THEN** the "Perfil" cell SHALL display the raw `rol_nombre` string without error

### Requirement: Atletas Activos stats card label
The stats card that counts active members with the `'usuario'` role SHALL display the label "Atletas Activos" instead of "Usuarios Activos". The numeric value displayed SHALL remain unchanged.

#### Scenario: Stats card shows Atletas Activos label
- **WHEN** the `EquipoStatsCards` component is rendered with a valid `EquipoStats` object
- **THEN** the stats card for the `usuariosActivos` counter SHALL display the label "Atletas Activos"
