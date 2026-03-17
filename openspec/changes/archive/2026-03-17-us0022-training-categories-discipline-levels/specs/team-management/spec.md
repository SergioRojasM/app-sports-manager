## MODIFIED Requirements

### Requirement: Team management route SHALL be accessible only to administrators
The system SHALL expose the route `/portal/orgs/[tenant_id]/gestion-equipo` within the `(administrador)` Next.js route-group. Any authenticated user whose resolved tenant role is not `administrador` SHALL be redirected by the existing role-gate layout and SHALL NOT be able to access this page, **with the exception that `entrenador` users SHALL be permitted access to the route when the `AsignarNivelModal` interaction is invoked via a direct link or navigation — access control for level assignment is enforced at the RLS layer, not the route layer**. The table itself remains read-only for coaches; no other mutations are exposed to the `entrenador` role.

#### Scenario: Administrator accesses team management page
- **WHEN** an authenticated user with `administrador` role navigates to `/portal/orgs/[tenant_id]/gestion-equipo`
- **THEN** the system SHALL render the `EquipoPage` component for that tenant

#### Scenario: Non-administrator attempts to access team management page
- **WHEN** an authenticated user whose resolved role for the tenant is `usuario` navigates to `/portal/orgs/[tenant_id]/gestion-equipo`
- **THEN** the system SHALL redirect the user away from the route (handled by the `(administrador)` route-group layout)

## ADDED Requirements

### Requirement: EquipoTable SHALL expose an "Asignar nivel" action button per row
`EquipoTable` SHALL render a new icon button (using the `military_tech` Material Icon or equivalent) in the actions column of each row. Clicking the button SHALL open `AsignarNivelModal` for that member. The button SHALL be visible to `administrador` and `entrenador` roles. All other existing action buttons (status changes, etc.) remain gated to `administrador` only.

#### Scenario: Administrator sees Asignar nivel button for each member
- **WHEN** an authenticated administrator views the team management table
- **THEN** each row SHALL display the "Asignar nivel" icon button in the actions column

#### Scenario: Clicking Asignar nivel opens AsignarNivelModal for the correct member
- **WHEN** an administrator clicks the "Asignar nivel" button on a member row
- **THEN** the system SHALL open `AsignarNivelModal` pre-loaded with the target member's `usuario_id` and the tenant context

#### Scenario: Existing EquipoTable actions are unaffected
- **WHEN** the new action button is added to the table
- **THEN** all existing row action buttons (edit estado, etc.) SHALL continue to function without regression

---

### Requirement: EquipoPage SHALL wire AsignarNivelModal open/close lifecycle
`EquipoPage` SHALL manage an `asignarNivelTarget` state (the selected `usuario_id` or `null`). When set, `AsignarNivelModal` SHALL be rendered for that user. On modal close (success or cancel) `asignarNivelTarget` SHALL be reset to `null`.

#### Scenario: Modal opens when asignarNivelTarget is set
- **WHEN** an administrator clicks "Asignar nivel" for a member
- **THEN** `AsignarNivelModal` SHALL be rendered with the correct `usuarioId` prop

#### Scenario: Modal closes on cancel
- **WHEN** the administrator dismisses `AsignarNivelModal` without submitting
- **THEN** `asignarNivelTarget` SHALL be reset to `null` and the modal SHALL be removed from the DOM

#### Scenario: Modal closes after successful submission
- **WHEN** a level assignment is successfully submitted via `AsignarNivelModal`
- **THEN** a success toast SHALL be shown and the modal SHALL close

#### Scenario: Modal shows inline error on service failure
- **WHEN** the `upsert` call in `useUsuarioNivelDisciplina` fails
- **THEN** the error message SHALL be displayed inside `AsignarNivelModal` and the modal SHALL remain open
