# bi-member-facts Specification

## Purpose
Defines `bi.fct_miembros`, the private membership fact view (name, role, `es_atleta`, state), and requires `get_tenant_bi_dashboard` to read only `bi` fact views, with athlete names resolved from it.
## Requirements
### Requirement: Member fact view
The system SHALL provide the view `bi.fct_miembros` with exactly one row per row of `public.miembros_tenant` (grain: tenant membership). It SHALL expose:

| Column | Source / rule |
|---|---|
| `miembro_id`, `tenant_id`, `usuario_id` | `miembros_tenant.id`, `.tenant_id`, `.usuario_id` |
| `nombre_completo` | `trim(nombre || ' ' || apellido)` from `public.usuarios`; `'Sin nombre'` when empty or missing |
| `rol_id`, `rol_nombre` | `miembros_tenant.rol_id`, `roles.nombre` |
| `es_atleta` | `lower(roles.nombre) = 'usuario'` |
| `miembro_estado` | `miembros_tenant.estado` (`activo`, `mora`, `suspendido`, `inactivo`, `pendiente_activacion`) |
| `fecha_ingreso`, `fecha_ingreso_analitica` | `miembros_tenant.created_at` and its Bogotá date |

The view SHALL have no privileges for `public`, `anon` or `authenticated`.

#### Scenario: One row per membership
- **WHEN** the row counts of `bi.fct_miembros` and `public.miembros_tenant` are compared
- **THEN** they SHALL be equal and `miembro_id` SHALL be unique

#### Scenario: Athlete flag
- **WHEN** a membership has role `usuario`
- **THEN** `es_atleta` SHALL be true; for `administrador` or `entrenador` it SHALL be false

#### Scenario: Private
- **WHEN** a session with role `authenticated` selects from `bi.fct_miembros`
- **THEN** it SHALL fail with a permission error

### Requirement: Dashboard reads only fact views
`public.get_tenant_bi_dashboard` MUST read data only from `bi.fct_pagos`, `bi.fct_entrenamientos`, `bi.fct_reservas`, `bi.fct_asistencia`, `bi.fct_suscripciones` and `bi.fct_miembros`. The only non-`bi` call allowed is the admin check `public.get_admin_tenants_for_authenticated_user()`. Athlete names in every ranking and list SHALL come from `bi.fct_miembros.nombre_completo`, falling back to `'Sin nombre'` when the athlete has no membership row in the tenant.

#### Scenario: No operational table reads
- **WHEN** the function body in the migration is inspected
- **THEN** it SHALL contain no `from public.` or `join public.` reference other than `public.get_admin_tenants_for_authenticated_user()`

#### Scenario: Auth unchanged
- **WHEN** a non-admin calls the RPC, or passes `p_date_from > p_date_to`
- **THEN** it SHALL raise `42501`, respectively `22007`

