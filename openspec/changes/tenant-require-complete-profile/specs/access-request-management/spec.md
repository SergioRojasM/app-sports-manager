## MODIFIED Requirements

### Requirement: `createSolicitud` SHALL enforce the 3-rejection cap
`solicitudes.service.ts` SHALL expose `createSolicitud(input)` which before inserting SHALL: (1) check for an existing `pendiente` row — if found, throw `SolicitudesServiceError` with code `'duplicate'`; (2) check `miembros_tenant_bloqueados` for the `(tenant_id, usuario_id)` pair — if a block record exists, throw `SolicitudesServiceError` with code `'blocked'`; (3) when the target tenant has `requiere_perfil_completo = true`, query `public.usuarios` for the requesting user and verify that all eight fields (`nombre`, `apellido`, `telefono`, `fecha_nacimiento`, `tipo_identificacion`, `numero_identificacion`, `fecha_exp_identificacion`, `rh`) are non-null and non-empty — if any is missing, throw `SolicitudesServiceError` with code `'incomplete_profile'`; (4) otherwise insert a new row with `estado = 'pendiente'`.

#### Scenario: Submit when no prior request exists
- **WHEN** a user calls `createSolicitud` for a tenant they have never requested access to
- **THEN** the system SHALL insert a new row with `estado = 'pendiente'` and return without error

#### Scenario: Submit when a pending request already exists
- **WHEN** a user calls `createSolicitud` for a tenant where they already have a `pendiente` row
- **THEN** the system SHALL throw a `SolicitudesServiceError` with code `'duplicate'`

#### Scenario: Submit when rejection cap is reached
- **WHEN** a user calls `createSolicitud` for a tenant where they have 3 or more `rechazada` rows
- **THEN** the system SHALL throw a `SolicitudesServiceError` with code `'max_rejections'`

#### Scenario: Submit after a single rejection succeeds
- **WHEN** a user calls `createSolicitud` for a tenant where they have exactly 1 `rechazada` row and no `pendiente` row
- **THEN** the system SHALL insert a new `pendiente` row successfully

#### Scenario: Submit blocked when tenant requires complete profile and profile is incomplete
- **WHEN** a user calls `createSolicitud` for a tenant where `requiere_perfil_completo = true` AND the user's `usuarios` row is missing at least one of the eight required fields
- **THEN** the system SHALL throw a `SolicitudesServiceError` with code `'incomplete_profile'`

#### Scenario: Submit succeeds when tenant requires complete profile and profile is complete
- **WHEN** a user calls `createSolicitud` for a tenant where `requiere_perfil_completo = true` AND the user's `usuarios` row has all eight fields populated
- **THEN** the system SHALL insert a new `pendiente` row successfully

#### Scenario: Flag off skips profile check entirely
- **WHEN** a user calls `createSolicitud` for a tenant where `requiere_perfil_completo = false`
- **THEN** the system SHALL NOT query `public.usuarios` for profile completeness and SHALL proceed with the normal guard sequence

---

## ADDED Requirements

### Requirement: `SolicitudesServiceError` SHALL include `'incomplete_profile'` as a valid error code
The `SolicitudesServiceError` class in `src/types/portal/solicitudes.types.ts` SHALL accept `'incomplete_profile'` as a valid value for its `code` property, alongside existing codes `'forbidden'`, `'duplicate'`, `'max_rejections'`, `'already_member'`, and `'blocked'`.

#### Scenario: incomplete_profile code is type-safe
- **WHEN** `new SolicitudesServiceError('incomplete_profile', message)` is constructed
- **THEN** TypeScript SHALL accept the value without error

---

### Requirement: `useSolicitudRequest` SHALL expose an `isProfileIncomplete` state
`useSolicitudRequest` in `src/hooks/portal/gestion-solicitudes/useSolicitudRequest.ts` SHALL expose an `isProfileIncomplete: boolean` value. It SHALL be set to `true` when the `submit` function catches a `SolicitudesServiceError` with `code === 'incomplete_profile'`. It SHALL reset to `false` on the next successful `submit` call.

#### Scenario: isProfileIncomplete is false on initial load
- **WHEN** the hook is initialized
- **THEN** `isProfileIncomplete` SHALL be `false`

#### Scenario: isProfileIncomplete becomes true after incomplete_profile error
- **WHEN** `submit` is called and `createSolicitud` throws `SolicitudesServiceError` with code `'incomplete_profile'`
- **THEN** `isProfileIncomplete` SHALL be set to `true`

#### Scenario: isProfileIncomplete resets after successful submit
- **WHEN** the user completes their profile and `submit` succeeds
- **THEN** `isProfileIncomplete` SHALL be reset to `false`

---

### Requirement: `SolicitarAccesoButton` SHALL render a distinct state when `isProfileIncomplete` is true
`SolicitarAccesoButton` in `src/components/portal/tenant/SolicitarAccesoButton.tsx` SHALL check `isProfileIncomplete` from `useSolicitudRequest`. When `true`, it SHALL render a disabled button labelled **"Perfil incompleto"** and a persistent informational banner below it with the message _"Esta organización requiere que completes tu perfil antes de solicitar acceso."_ and a link **"→ Completar perfil"** pointing to `/portal/perfil`. The banner SHALL NOT auto-dismiss.

#### Scenario: Incomplete profile renders disabled button
- **WHEN** `isProfileIncomplete` is `true`
- **THEN** the system SHALL render a disabled button with label "Perfil incompleto"

#### Scenario: Informational banner is shown with profile link
- **WHEN** `isProfileIncomplete` is `true`
- **THEN** the system SHALL render a banner containing the explanatory message and a link to `/portal/perfil`

#### Scenario: Banner persists until the user navigates away or submits successfully
- **WHEN** `isProfileIncomplete` is `true` and the user does not interact
- **THEN** the banner SHALL remain visible without auto-dismissal
