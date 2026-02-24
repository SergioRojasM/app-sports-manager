## MODIFIED Requirements

### Requirement: Organization data is tenant-scoped and read-only
The system SHALL resolve organization data using the authenticated user tenant context and SHALL support updating editable organization fields for that same tenant. All read and write operations in this scope MUST target `public.tenants` for `id = tenant_id` and MUST NOT persist data to other domain tables.

#### Scenario: Tenant-scoped editable tenant data resolution
- **WHEN** an authenticated `administrador` opens edit mode from `/portal/gestion-organizacion`
- **THEN** the form SHALL be prefilled from `public.tenants` for the current user `tenant_id`

#### Scenario: Tenant-scoped tenant update persistence
- **WHEN** the admin submits valid organization changes
- **THEN** the system SHALL update exactly one record in `public.tenants` where `id = tenant_id`

#### Scenario: Non-tenant entities are not persisted
- **WHEN** the edit flow executes read/write operations
- **THEN** the system MUST NOT persist changes to `usuarios`, `roles`, or `escenarios`

## ADDED Requirements

### Requirement: Admin can edit organization data through a right-side drawer
The system SHALL provide an `Edit organization` interaction in organization management that opens a right-side drawer overlay aligned with `projectspec/designs/07_edit_organization.html` while keeping the current page context.

#### Scenario: Open edit drawer from organization view
- **WHEN** an authenticated `administrador` activates the `Edit organization` call to action
- **THEN** the system SHALL open a right-side drawer with editable organization fields

#### Scenario: Drawer can be closed from all supported interactions
- **WHEN** the drawer is open and the user triggers close icon, cancel action, `Esc`, or outside-overlay click
- **THEN** the system SHALL close the drawer without persisting changes

### Requirement: Organization edit form enforces validation and normalization
The system SHALL validate required and formatted fields before persistence and SHALL normalize payload values to keep tenant data consistent.

#### Scenario: Required fields block submit when missing
- **WHEN** `nombre` or `email` is empty
- **THEN** the system SHALL show inline validation errors and MUST NOT submit

#### Scenario: Invalid formatted values block submit
- **WHEN** email or URL fields contain invalid formats, or `telefono`/`descripcion`/`nombre` exceed defined constraints
- **THEN** the system SHALL show field-level validation errors and MUST NOT submit

#### Scenario: Optional values are normalized before persistence
- **WHEN** optional inputs are left blank and the user submits valid data
- **THEN** the system SHALL trim text values and convert empty optional fields to `null` in the update payload

### Requirement: Organization edit flow provides deterministic submit feedback
The system SHALL expose deterministic loading, success, and error behavior for save operations and SHALL refresh organization cards after successful persistence.

#### Scenario: Submit state prevents duplicate saves
- **WHEN** a valid save is in progress
- **THEN** the save action SHALL be disabled until the request completes

#### Scenario: Successful save refreshes view in place
- **WHEN** tenant update succeeds
- **THEN** the system SHALL close the drawer, refresh organization cards in place, and display success feedback

#### Scenario: Save error is non-blocking
- **WHEN** tenant update fails
- **THEN** the system SHALL keep the portal shell visible and display a non-blocking save error message