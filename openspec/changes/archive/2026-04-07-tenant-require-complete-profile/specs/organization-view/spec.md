## ADDED Requirements

### Requirement: `tenants` table SHALL have a `requiere_perfil_completo` column
The `public.tenants` table SHALL include `requiere_perfil_completo boolean NOT NULL DEFAULT false`. No check constraint is required. All existing tenants SHALL default to `false`.

#### Scenario: Column is present after migration
- **WHEN** migration `20260330000100_tenant_requiere_perfil_completo.sql` is applied
- **THEN** `public.tenants` SHALL have a `requiere_perfil_completo boolean NOT NULL DEFAULT false` column

#### Scenario: Existing tenants default to false
- **WHEN** the migration is applied to a database with existing tenant rows
- **THEN** all existing tenant rows SHALL have `requiere_perfil_completo = false`

---

### Requirement: Organization edit form SHALL expose a `requiere_perfil_completo` toggle
The organization edit form (`EditTenantDrawer`) SHALL include a boolean toggle (checkbox or switch) for `requiere_perfil_completo`, labelled **"Requerir perfil completo para solicitar acceso"**. The field SHALL be rendered in the access-settings section alongside the existing `max_solicitudes` input. The toggle SHALL only be visible to users with the `administrador` role. The field SHALL be saved via `tenantService.updateTenant`.

`TenantEditFormValues` in `src/types/portal/tenant.types.ts` SHALL include `requiere_perfil_completo: string` (boolean-as-string). `TenantEditPayload` SHALL include `requiere_perfil_completo: boolean`. `TenantRow` in `tenant.service.ts` SHALL include `requiere_perfil_completo: boolean`. `mapTenantToEditFormValues` SHALL map the DB value as `String(tenant.requiere_perfil_completo ?? false)`. `useEditTenant` `EMPTY_VALUES` SHALL default to `'false'`; `toPayload` SHALL parse it as `values.requiere_perfil_completo === 'true'`.

#### Scenario: Admin sees requiere_perfil_completo toggle in edit form
- **WHEN** an authenticated administrator opens the organization edit form
- **THEN** the form SHALL display the "Requerir perfil completo para solicitar acceso" toggle pre-filled with the current tenant value

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
