## ADDED Requirements

### Requirement: Tenant-scoped portal route scaffolding
The system SHALL expose tenant-scoped portal routes under `/portal/orgs/[tenant_id]` and SHALL locate role and shared modules under route groups `(administrador)`, `(atleta)`, `(entrenador)`, and `(shared)` for that tenant context.

#### Scenario: Tenant-scoped role routes are available
- **WHEN** an authenticated user navigates to a tenant role route under `/portal/orgs/[tenant_id]/...`
- **THEN** the system SHALL resolve the page from the tenant-scoped route scaffold and SHALL preserve the shared portal shell behavior

### Requirement: Organizations index is discoverable for authenticated users
The system SHALL provide `/portal/orgs` as an authenticated organizations index and SHALL list all tenants except the canonical public tenant.

#### Scenario: Authenticated user sees organizations list excluding public
- **WHEN** an authenticated user opens `/portal/orgs`
- **THEN** the system SHALL render organization cards for all visible tenants except the public tenant

### Requirement: Tenant entry is gated by membership and role
The system SHALL allow access to `/portal/orgs/[tenant_id]/*` only when the authenticated user has a valid membership in `miembros_tenant` for that `tenant_id` and a resolved role context.

#### Scenario: Member with role can enter tenant routes
- **WHEN** a user with membership and role for the target `tenant_id` opens a tenant-scoped route
- **THEN** the system SHALL grant access and SHALL resolve tenant role context for downstream navigation

#### Scenario: Non-member is redirected from tenant routes
- **WHEN** a user without membership for the target `tenant_id` opens a tenant-scoped route
- **THEN** the system SHALL deny access and SHALL redirect the user to `/portal/orgs`

### Requirement: Subscribe action is visible and non-persistent
The system SHALL expose a `SolicitarAccesoButton` component on organization cards for users without tenant membership. The button SHALL replace the previous non-persistent `Suscribirse` placeholder. The button state SHALL be determined by the user's solicitud history loaded via `useSolicitudRequest`. The button SHALL render one of four states based on pending count and rejection count:

- **No prior requests**: "Solicitar acceso" button (active). On click the system SHALL open an inline confirmation; on confirmation SHALL call `createSolicitud` and transition to the pending state.
- **Pending request exists**: "Solicitud en revisión" button (disabled).
- **Last request rejected, fewer than 3 total rejections**: "Volver a solicitar" button (active) with history panel visible.
- **3 or more rejections**: "Acceso bloqueado" button (disabled) with history panel visible; system SHALL display a message directing the user to contact the organization.

The system SHALL NOT write any data on card render — only on explicit user confirmation.

#### Scenario: Non-member with no prior request sees Solicitar acceso
- **WHEN** a non-member user opens `/portal/orgs` and has no prior solicitud for an organization
- **THEN** the system SHALL render "Solicitar acceso" as an active button on that organization's card

#### Scenario: Submitting a request transitions button to pending state
- **WHEN** a non-member user confirms the access request
- **THEN** the system SHALL insert a `pendiente` row and immediately render "Solicitud en revisión" (disabled) without a page reload

#### Scenario: Non-member with a pending request sees disabled pending state
- **WHEN** a non-member user opens `/portal/orgs` and has an active `pendiente` solicitud for an organization
- **THEN** the system SHALL render "Solicitud en revisión" (disabled) on that organization's card

#### Scenario: Non-member after rejection below cap sees Volver a solicitar with history
- **WHEN** a non-member user has at least one `rechazada` solicitud and total rejections are fewer than 3
- **THEN** the system SHALL render "Volver a solicitar" (active) and SHALL display the history panel showing the last 3 request rows

#### Scenario: Non-member at rejection cap sees blocked state with history
- **WHEN** a non-member user has 3 or more `rechazada` solicitudes for an organization
- **THEN** the system SHALL render "Acceso bloqueado" (disabled) and SHALL display the history panel with a message instructing the user to contact the organization

#### Scenario: History panel shows estado, date, and rejection note
- **WHEN** the history panel is visible
- **THEN** each row SHALL display the `SolicitudEstadoBadge`, `created_at` formatted date, and `nota_revision` text when present

#### Scenario: Member card is unaffected
- **WHEN** an authenticated user has an active membership in an organization
- **THEN** the system SHALL continue to render the "Ingresar" link button and SHALL NOT render `SolicitarAccesoButton`
