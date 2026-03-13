## ADDED Requirements

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
