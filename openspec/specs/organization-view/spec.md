## MODIFIED Requirements

### Requirement: Organization data is tenant-scoped and read-only
The system SHALL resolve organization tenant context from authenticated membership relations (`public.miembros_tenant`) and SHALL support both discovery and management use cases within tenant constraints. Read operations for organization discovery SHALL return visible tenants from `public.tenants` excluding the canonical public tenant, and tenant management operations SHALL target only the active membership-selected `tenant_id`.

#### Scenario: Tenant discovery list excludes public tenant
- **WHEN** an authenticated user opens organization discovery
- **THEN** the system SHALL fetch visible tenant records from `public.tenants` and SHALL exclude the public tenant

#### Scenario: Tenant management resolves active membership tenant
- **WHEN** an authenticated `administrador` opens tenant organization management
- **THEN** the system SHALL resolve active `tenant_id` from membership context and SHALL fetch tenant data scoped to that tenant

#### Scenario: Tenant update persists only active tenant
- **WHEN** an authorized admin submits valid organization changes for the active tenant
- **THEN** the system SHALL update exactly one `public.tenants` record matching the active `tenant_id`

## ADDED Requirements

### Requirement: Organization cards expose membership-aware actions
The system SHALL render organization discovery cards using `OrganizationIdentityCard` and SHALL expose action states based on membership context: an access action for members with role and a subscribe placeholder action for non-members.

#### Scenario: Member sees access action
- **WHEN** the listed organization matches a tenant where the user has membership and role
- **THEN** the card SHALL present an access action that navigates to tenant-scoped routes

#### Scenario: Non-member sees subscribe action
- **WHEN** the listed organization does not match any tenant membership for the user
- **THEN** the card SHALL present a `Suscribirse` placeholder action with non-persistent feedback

---

### Requirement: Organization edit form SHALL expose a configurable max_solicitudes field
The organization edit form (under `gestion-organizacion`) SHALL include a numeric input for `max_solicitudes`. The field SHALL be labelled **"Máximo de solicitudes rechazadas antes de bloqueo"**, accept integer values between 1 and 10, and be saved via `tenantService.updateTenant`. The field SHALL only be visible to users with the `administrador` role.

`TenantEditPayload` and `TenantEditFormValues` in `src/types/portal/tenant.types.ts` SHALL include `max_solicitudes: number`. `TenantRow` in `tenant.service.ts` SHALL include `max_solicitudes: number`. `mapTenantToEditFormValues` SHALL map the DB value to the form.

#### Scenario: Admin sees max_solicitudes field in edit form
- **WHEN** an authenticated administrator opens the organization edit form
- **THEN** the form SHALL display a numeric input for "Máximo de solicitudes rechazadas antes de bloqueo" pre-filled with the current tenant value

#### Scenario: Admin saves a valid max_solicitudes value
- **WHEN** an administrator sets `max_solicitudes` to a value between 1 and 10 and submits the form
- **THEN** the system SHALL update `tenants.max_solicitudes` for that tenant via `tenantService.updateTenant`

#### Scenario: Admin cannot save max_solicitudes outside the allowed range
- **WHEN** an administrator attempts to submit a `max_solicitudes` value of 0 or 11
- **THEN** the form SHALL display a validation error and SHALL NOT call `updateTenant`

#### Scenario: Default value is 2 for new tenants
- **WHEN** a new tenant is created (DB migration applied)
- **THEN** `tenants.max_solicitudes` SHALL default to `2` as defined by the column default

---

### Requirement: tenants table SHALL have a max_solicitudes column
The `public.tenants` table SHALL include `max_solicitudes smallint NOT NULL DEFAULT 2` with a check constraint `tenants_max_solicitudes_ck` enforcing `max_solicitudes >= 1 AND max_solicitudes <= 10`.

#### Scenario: Column is present after migration
- **WHEN** the migration is applied
- **THEN** `public.tenants` SHALL have a `max_solicitudes` column with default value `2`

#### Scenario: DB rejects max_solicitudes below 1
- **WHEN** an UPDATE sets `max_solicitudes = 0`
- **THEN** the database SHALL reject the operation with a check constraint violation

#### Scenario: DB rejects max_solicitudes above 10
- **WHEN** an UPDATE sets `max_solicitudes = 11`
- **THEN** the database SHALL reject the operation with a check constraint violation

---

### Requirement: Organization edit form logo_url field is a file-upload input
The `logo_url` field in the organization edit form (under `gestion-organizacion/editar`) SHALL no longer be a free-text URL input. It SHALL be replaced by a file-upload input delegating to the `org-logo-upload` capability. The field SHALL only be visible to users with the `administrador` role. The `TenantEditFormValues.logo_url` type SHALL remain `string` (receives the resolved signed URL after upload); `TenantEditPayload.logo_url` SHALL remain `string | null`.

#### Scenario: Admin sees file-upload input instead of URL text field
- **WHEN** an authenticated administrator opens the organization edit form
- **THEN** the `logo_url` field SHALL render as a file-upload input (not a text input) with the current logo preview if set

#### Scenario: Admin saves form without changing the logo
- **WHEN** an administrator opens the edit form, makes changes to other fields (e.g. `nombre`), and submits without selecting a new logo file
- **THEN** `tenants.logo_url` SHALL retain its existing value and no upload call SHALL be made

#### Scenario: Admin saves form after uploading a new logo
- **WHEN** an administrator selects a valid logo file and submits the form
- **THEN** `tenants.logo_url` SHALL be updated to the signed URL of the newly uploaded file
