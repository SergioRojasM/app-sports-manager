## ADDED Requirements

### Requirement: Membership relation is the source of truth for tenant access
The system SHALL model tenant access in `public.miembros_tenant` as role-per-tenant-per-user and MUST treat this relation as the canonical source for portal tenant and role context.

#### Scenario: User can hold memberships in multiple tenants
- **WHEN** a single `usuario_id` has membership rows in two different `tenant_id` values
- **THEN** the system SHALL resolve access independently per tenant membership

#### Scenario: Duplicate membership row is prevented
- **WHEN** an insert attempts to create a second row with the same (`tenant_id`, `usuario_id`)
- **THEN** the system MUST reject or ignore the duplicate according to uniqueness rules

### Requirement: Membership role catalog is restricted
The system SHALL allow membership roles only from the catalog `administrador`, `entrenador`, and `usuario`.

#### Scenario: Valid role is accepted
- **WHEN** a membership is created with `rol_id` mapped to `administrador`, `entrenador`, or `usuario`
- **THEN** the membership SHALL be persisted successfully

#### Scenario: Legacy onboarding role naming is not used
- **WHEN** onboarding logic provisions a default membership
- **THEN** the role assigned MUST be `usuario` and MUST NOT be `atleta`

### Requirement: Public tenant exists as onboarding default
The system SHALL ensure a reusable default tenant with `nombre = 'public'` exists in initialization/seed flows.

#### Scenario: Public tenant is present after initialization
- **WHEN** migrations and seed scripts complete
- **THEN** at least one tenant record with `nombre = 'public'` SHALL exist

### Requirement: New users receive default membership idempotently
For each newly created authenticated user, the system SHALL ensure a `public.usuarios` profile row and SHALL provision exactly one default membership in `public.miembros_tenant` for tenant `public` with role `usuario` using conflict-safe logic.

#### Scenario: New user gets default profile and membership
- **WHEN** a new auth user is created
- **THEN** the system SHALL create or ensure one `usuarios` row and one membership row for (`public`, `usuario`)

#### Scenario: Repeated provisioning does not duplicate membership
- **WHEN** provisioning logic runs more than once for the same user
- **THEN** the system MUST keep a single default membership row for that user in tenant `public`

### Requirement: Legacy direct tenant and role columns are removed from usuarios
The system MUST remove `usuarios.tenant_id` and `usuarios.rol_id` from the active model in this change and SHALL NOT use these columns for runtime portal context resolution.

#### Scenario: Runtime context never reads legacy direct columns
- **WHEN** portal role/tenant context is resolved
- **THEN** the system SHALL read from membership relations and MUST NOT depend on `usuarios.tenant_id` or `usuarios.rol_id`
