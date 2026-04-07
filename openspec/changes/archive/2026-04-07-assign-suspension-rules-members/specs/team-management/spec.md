## MODIFIED Requirements

### Requirement: System SHALL list all members of the tenant
`equipo.service.ts` SHALL query `public.v_miembros_equipo` (instead of `public.miembros_tenant` directly) filtered by `tenant_id`. The view returns a flat row shape with fields from `miembros_tenant`, `usuarios`, and `roles` already joined, plus an `inasistencias_recientes` integer computed by a lateral subquery, plus `tenant_regla_suspension_id` and `regla_suspension_nombre` (left-joined from `tenant_reglas_suspension`). `RawMiembroRow` SHALL be a flat type matching the view's column set (no nested `usuarios` or `roles` sub-objects) and SHALL include `tenant_regla_suspension_id: string | null` and `regla_suspension_nombre: string | null`. `mapRawRow` SHALL read `estado`, `inasistencias_recientes`, `tenant_regla_suspension_id`, and `regla_suspension_nombre` from the top-level row. The type SHALL also include `fecha_nacimiento: string | null` and `fecha_exp_identificacion: string | null` from the view. The result SHALL include every user who has an active membership record for that tenant, including the administrator themselves.

#### Scenario: Members are loaded on page mount
- **WHEN** an administrator navigates to the team management page for a tenant
- **THEN** the system SHALL fetch and display all members belonging to that tenant

#### Scenario: Empty tenant returns empty state
- **WHEN** a tenant has no member records in `miembros_tenant`
- **THEN** the system SHALL display an empty state message instead of the table

#### Scenario: Service error is surfaced to the user
- **WHEN** the Supabase query fails (e.g., network error or RLS denial)
- **THEN** the system SHALL display an error message with a retry button

#### Scenario: Each member row includes inasistencias_recientes
- **WHEN** the member list is fetched
- **THEN** each `MiembroRow` SHALL include an `inasistencias_recientes: number` field (defaults to `0` if null)

#### Scenario: Each member row includes date fields
- **WHEN** the member list is fetched
- **THEN** each `MiembroRow` SHALL include `fecha_nacimiento: string | null` and `fecha_exp_identificacion: string | null` sourced from `v_miembros_equipo`

#### Scenario: Each member row includes suspension rule fields
- **WHEN** the member list is fetched
- **THEN** each `MiembroRow` SHALL include `tenant_regla_suspension_id: string | null` and `regla_suspension_nombre: string | null` sourced from `v_miembros_equipo`
