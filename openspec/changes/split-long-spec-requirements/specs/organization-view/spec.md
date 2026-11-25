# Spec Delta

## MODIFIED Requirements

### Requirement: Organization edit form SHALL expose a configurable max_solicitudes field
The organization edit form (under `gestion-organizacion`) SHALL include a numeric input for `max_solicitudes`, labelled **"Máximo de solicitudes rechazadas antes de bloqueo"**, that accepts integer values between 1 and 10, is saved via `tenantService.updateTenant`, and is only visible to users with the `administrador` role.

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

### Requirement: Organization edit form SHALL expose a `requiere_perfil_completo` toggle
The organization edit form (`EditTenantForm`) SHALL include a boolean toggle (checkbox or switch) for `requiere_perfil_completo`, labelled **"Requerir perfil completo para ingresar a la organización"**, only visible to users with the `administrador` role and saved via `tenantService.updateTenant`.

#### Scenario: Admin sees requiere_perfil_completo toggle in edit form
- **WHEN** an authenticated administrator opens the organization edit form
- **THEN** the form SHALL display the "Requerir perfil completo para ingresar a la organización" toggle pre-filled with the current tenant value

#### Scenario: Help text describes entry enforcement
- **WHEN** an administrator reads the toggle's help text
- **THEN** it SHALL state that the requirement applies to all members, including invited and existing ones, for requesting access and entering the organization

#### Scenario: Admin enables the toggle and saves
- **WHEN** an administrator sets `requiere_perfil_completo` to `true` and submits the form
- **THEN** the system SHALL update `tenants.requiere_perfil_completo` to `true` for that tenant via `tenantService.updateTenant`

#### Scenario: Admin disables the toggle and saves
- **WHEN** an administrator sets `requiere_perfil_completo` to `false` and submits the form
- **THEN** the system SHALL update `tenants.requiere_perfil_completo` to `false` for that tenant via `tenantService.updateTenant`

#### Scenario: Default value is false for new and existing tenants
- **WHEN** the edit form is opened for a tenant that has never had this setting changed
- **THEN** the toggle SHALL render in the `false` (off) position

#### Scenario: requiere_perfil_completo is included in the select query
- **WHEN** `tenantService.fetchTenantById` is called
- **THEN** the Supabase select string SHALL include `requiere_perfil_completo` so the value is available for the form mapper

## ADDED Requirements

### Requirement: max_solicitudes form wiring
`TenantEditPayload` and `TenantEditFormValues` in `src/types/portal/tenant.types.ts` SHALL include `max_solicitudes`, `TenantRow` in `tenant.service.ts` SHALL include `max_solicitudes: number`, and `mapTenantToEditFormValues` SHALL map the DB value to the form.

#### Scenario: Stored value reaches the form
- **WHEN** a tenant has `max_solicitudes = 5` and its edit values are mapped
- **THEN** the form values SHALL carry `max_solicitudes` "5"

### Requirement: requiere_perfil_completo help text and placement
The `requiere_perfil_completo` toggle SHALL be rendered in the access-settings section alongside the `max_solicitudes` input, with help text stating that, when active, all members — including invited members and those who already belong to the organization — must complete their profile (nombre, apellido, teléfono, fecha de nacimiento, tipo y número de identificación, fecha de expedición y grupo sanguíneo) to request access and to enter.

#### Scenario: Help text lists the required fields
- **WHEN** an administrator reads the toggle's help text
- **THEN** it SHALL list nombre, apellido, teléfono, fecha de nacimiento, tipo y número de identificación, fecha de expedición y grupo sanguíneo

#### Scenario: Placed with the access settings
- **WHEN** the edit form renders
- **THEN** the toggle SHALL appear in the same section as the `max_solicitudes` input

### Requirement: requiere_perfil_completo form wiring
`TenantEditFormValues` SHALL include `requiere_perfil_completo: string` (boolean-as-string) and `TenantEditPayload` `requiere_perfil_completo: boolean`; `TenantRow` SHALL include `requiere_perfil_completo: boolean`; `mapTenantToEditFormValues` SHALL map it as `String(tenant.requiere_perfil_completo ?? false)`; `useEditTenant` `EMPTY_VALUES` SHALL default it to `'false'` and `toPayload` SHALL parse it as `values.requiere_perfil_completo === 'true'`.

#### Scenario: Missing value maps to false
- **WHEN** a tenant row has `requiere_perfil_completo` null and its edit values are mapped
- **THEN** the form value SHALL be `'false'`

#### Scenario: Form value parsed to boolean
- **WHEN** the form value is `'true'` and the payload is built
- **THEN** the payload SHALL carry `requiere_perfil_completo: true`
