## ADDED Requirements

### Requirement: Admin can view organization information cards
The system SHALL render an `OrganizationView` screen at `/portal/gestion-organizacion` for authenticated users with role `administrador`. The screen MUST present organization information in cards aligned with `projectspec/designs/06_view_tenant_information.html` while preserving the existing portal shell.

#### Scenario: Admin opens organization view
- **WHEN** an authenticated `administrador` navigates to `/portal/gestion-organizacion`
- **THEN** the page SHALL display organization information cards within the shared portal layout

#### Scenario: Page content is not placeholder text
- **WHEN** `/portal/gestion-organizacion` is rendered
- **THEN** the system SHALL show structured organization cards and MUST NOT show a generic “module under construction” placeholder

### Requirement: Organization data is tenant-scoped and read-only
The system SHALL load organization view data using the authenticated user tenant context and existing Supabase tables (`tenants`, `usuarios`+`roles`, `escenarios`). In this iteration, edit controls MAY be visible but data persistence actions MUST NOT be executed.

#### Scenario: Tenant-scoped tenant identity data
- **WHEN** the organization view loads
- **THEN** tenant identity fields SHALL be read from `public.tenants` for the current user `tenant_id`

#### Scenario: Coach and location contextual data resolution
- **WHEN** context fields are resolved
- **THEN** the system SHALL derive head coach from active `usuarios` with role `entrenador` and derive location from tenant `escenarios`

#### Scenario: Edit controls are non-functional
- **WHEN** a user interacts with visual edit controls in this view
- **THEN** the UI SHALL NOT persist changes to Supabase in this change scope

### Requirement: Organization view handles loading, empty, and error states
The organization view SHALL expose deterministic UI states for asynchronous data retrieval. Missing values MUST render safe placeholders, and data retrieval errors MUST show a non-blocking error message.

#### Scenario: Loading state before data resolution
- **WHEN** organization queries are still in progress
- **THEN** the page SHALL render a visible loading state

#### Scenario: Empty values are rendered safely
- **WHEN** one or more organization fields are null or empty
- **THEN** the corresponding card fields SHALL render placeholders without runtime failures

#### Scenario: Data fetch error is non-blocking
- **WHEN** one or more organization queries fail
- **THEN** the page SHALL display a non-blocking error message and keep the portal shell visible

### Requirement: OrganizationView follows feature-first hexagonal slices
Implementation for this capability MUST follow page → component → hook → service → types boundaries and MUST be organized under `organization-view` feature folders inside portal layers.

#### Scenario: Layer boundaries are respected
- **WHEN** reviewing implementation files
- **THEN** page/components SHALL NOT call Supabase directly and data access SHALL occur through feature service methods

#### Scenario: Feature slice folder convention
- **WHEN** implementation files are created
- **THEN** they SHALL be organized under `components/portal/organization-view`, `hooks/portal/organization-view`, `services/supabase/portal`, and `types/portal/organization-view.types.ts`
