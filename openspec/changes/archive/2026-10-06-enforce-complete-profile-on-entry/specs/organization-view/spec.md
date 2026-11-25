## MODIFIED Requirements

### Requirement: Organization edit form SHALL expose a `requiere_perfil_completo` toggle
The organization edit form (`EditTenantForm`) SHALL include a boolean toggle (checkbox or switch) for `requiere_perfil_completo`, labelled **"Requerir perfil completo para ingresar a la organización"**. Its help text SHALL state that, when active, all members — including invited members and those who already belong to the organization — must complete their profile (nombre, apellido, teléfono, fecha de nacimiento, tipo y número de identificación, fecha de expedición y grupo sanguíneo) to request access and to enter. The field SHALL be rendered in the access-settings section alongside the existing `max_solicitudes` input. The toggle SHALL only be visible to users with the `administrador` role. The field SHALL be saved via `tenantService.updateTenant`.

`TenantEditFormValues` in `src/types/portal/tenant.types.ts` SHALL include `requiere_perfil_completo: string` (boolean-as-string). `TenantEditPayload` SHALL include `requiere_perfil_completo: boolean`. `TenantRow` in `tenant.service.ts` SHALL include `requiere_perfil_completo: boolean`. `mapTenantToEditFormValues` SHALL map the DB value as `String(tenant.requiere_perfil_completo ?? false)`. `useEditTenant` `EMPTY_VALUES` SHALL default to `'false'`; `toPayload` SHALL parse it as `values.requiere_perfil_completo === 'true'`.

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
