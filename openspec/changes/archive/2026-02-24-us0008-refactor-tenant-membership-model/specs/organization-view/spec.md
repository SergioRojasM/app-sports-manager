## MODIFIED Requirements

### Requirement: Organization data is tenant-scoped and read-only
The system SHALL resolve organization tenant context from the authenticated user's membership relation (`public.miembros_tenant`) and SHALL support updating editable organization fields for the resolved tenant. All read and write operations in this scope MUST target `public.tenants` for the membership-selected `tenant_id` and MUST NOT persist data to other domain tables.

#### Scenario: Tenant data resolution uses membership context
- **WHEN** an authenticated `administrador` opens organization management
- **THEN** the system SHALL determine the active `tenant_id` from `miembros_tenant` and fetch tenant data from `public.tenants`

#### Scenario: Tenant update persists only current membership tenant
- **WHEN** the admin submits valid organization changes
- **THEN** the system SHALL update exactly one record in `public.tenants` where `id` matches the resolved membership tenant

#### Scenario: Non-tenant entities are not persisted
- **WHEN** the edit flow executes read/write operations
- **THEN** the system MUST NOT persist changes to `usuarios`, `roles`, or `escenarios`
