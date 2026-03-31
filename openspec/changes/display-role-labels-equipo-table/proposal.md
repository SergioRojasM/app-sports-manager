## Why

The team management table at `/gestion-equipo` shows the raw database value `'usuario'` in the "Perfil" column and in a stats card, instead of the domain-appropriate label "Atleta". This erodes trust in the UI and requires administrators to understand internal system identifiers rather than seeing meaningful role names.

## What Changes

- The "Perfil" column in `EquipoTable` will display "Atleta" for members with `rol_nombre = 'usuario'`, "Administrador" for `'administrador'`, and "Entrenador" for `'entrenador'`.
- The role `<select>` dropdown option labels in the same column will use the same mapped labels.
- The stats card currently labeled "Usuarios Activos" will be renamed to "Atletas Activos".
- A `ROL_DISPLAY_LABELS` constant map (`Record<string, string>`) is introduced in `EquipoTable.tsx` as the single source of truth for role display names.

## Capabilities

### New Capabilities

- `equipo-role-display-labels`: A display-only mapping of internal role identifiers to human-readable labels within the team management feature.

### Modified Capabilities

<!-- No existing spec-level requirements are changing — this is a presentation-layer addition only. -->

## Impact

- `src/components/portal/gestion-equipo/EquipoTable.tsx` — add `ROL_DISPLAY_LABELS` map; apply to `<option>` labels and read-only fallback text.
- `src/components/portal/gestion-equipo/EquipoStatsCards.tsx` — update stats card label.
- No changes to services, hooks, types, DB schema, migrations, or role guards.
- No breaking changes.
