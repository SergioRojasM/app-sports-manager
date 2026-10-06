## MODIFIED Requirements

### Requirement: Organizations index is discoverable for authenticated users
The system SHALL provide `/portal/orgs` as an authenticated organizations index. The index SHALL list every tenant with `publico = true` plus every tenant where the authenticated user has a membership row in `miembros_tenant`, and SHALL never list the canonical public tenant (`nombre = 'public'`). Tenants with `publico = false` where the user has no membership SHALL NOT be listed and SHALL NOT be returned by the directory query.

#### Scenario: Authenticated user sees organizations list excluding public
- **WHEN** an authenticated user opens `/portal/orgs`
- **THEN** the system SHALL render organization cards for all visible tenants except the public tenant

#### Scenario: Private organization is hidden from non-members
- **WHEN** an authenticated user without a membership in a tenant with `publico = false` opens `/portal/orgs`
- **THEN** the system SHALL NOT render a card for that tenant

#### Scenario: Private organization is listed for its members
- **WHEN** an authenticated user with a membership in a tenant with `publico = false` opens `/portal/orgs`
- **THEN** the system SHALL render the card for that tenant with its access action

#### Scenario: Canonical public tenant is never listed
- **WHEN** the tenant named `public` has `publico = true`
- **THEN** the system SHALL NOT render a card for it

#### Scenario: Empty directory
- **WHEN** there are no public tenants and the user has no memberships
- **THEN** the system SHALL render the message "No hay organizaciones disponibles por ahora." instead of an empty grid
