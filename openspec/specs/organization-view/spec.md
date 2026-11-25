# Capability: organization-view

## Purpose
Defines how organization data is read and managed: discovery cards and the administrator organization management page.

## Requirements

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

---

### Requirement: TenantIdentityPayload includes bannerUrl
`TenantIdentityPayload` in `src/types/portal/tenant.types.ts` SHALL include `bannerUrl: string | null`. When the DB `banner_url` is null this field SHALL be null.

#### Scenario: bannerUrl is populated from DB value
- **WHEN** `getTenantViewData` returns data for a tenant with a non-null `banner_url`
- **THEN** the returned payload's `identity.bannerUrl` SHALL equal that DB value

#### Scenario: bannerUrl is null when DB value is null
- **WHEN** `getTenantViewData` returns data for a tenant with `banner_url = null`
- **THEN** `identity.bannerUrl` SHALL be null

---

### Requirement: TenantEditFormValues and TenantEditPayload include banner_url
`TenantEditFormValues` in `src/types/portal/tenant.types.ts` SHALL include `banner_url: string`. `TenantEditPayload` SHALL include `banner_url: string | null`. These follow the same type pattern as the existing `logo_url` fields.

#### Scenario: banner_url is present in form values type
- **WHEN** `TenantEditFormValues` is typed
- **THEN** it SHALL include `banner_url: string`

#### Scenario: banner_url is present in payload type
- **WHEN** `TenantEditPayload` is typed
- **THEN** it SHALL include `banner_url: string | null`

---

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

---

### Requirement: gestion-organizacion page includes TenantReglasSuspensionCard
The `gestion-organizacion` page (`src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx`) SHALL render, in this order: the page header; a row with the identity card and the contact & social card; a row with the payment methods section and the suspension rules section side by side from `lg` (stacked below); and the automatic notifications section full width. The page entrypoint SHALL only compose feature components.

#### Scenario: Suspension rules card appears below payment methods card
- **WHEN** an authenticated administrator opens the `gestion-organizacion` page
- **THEN** the page SHALL display the suspension rules section next to the payment methods section from `lg`, and directly below it on narrower screens

#### Scenario: Sections render in order
- **WHEN** an administrator opens `gestion-organizacion` at 1440px
- **THEN** the identity and contact cards SHALL render first, then payment methods and suspension rules side by side, then the automatic notifications section

### Requirement: Organization management header
The organization management page SHALL show exactly one page heading "Tu organización." and a single primary action "Editar organización" that opens the organization edit drawer.

#### Scenario: Header renders
- **WHEN** an administrator opens `gestion-organizacion`
- **THEN** the page SHALL show one `h1` reading "Tu organización." and the "Editar organización" action

#### Scenario: Edit action opens the drawer
- **WHEN** the administrator activates "Editar organización"
- **THEN** the organization edit drawer SHALL open with the current organization values and focus SHALL move into it

### Requirement: Organization identity card
The page SHALL show an identity card with the organization banner as cover (or a placeholder when missing), the logo (or the organization initials), the name, a "Pública" or "Privada" tag from the tenant visibility, and the meta tiles "Fundada" (month and year, or "—") and "Miembros" (number of tenant members).

#### Scenario: Identity with banner, logo and members
- **WHEN** the tenant has a banner, a logo, `fecha_creacion` 2026-03-10, `publico = true` and 102 members
- **THEN** the card SHALL show the banner, the logo, the "Pública" tag, "Mar 2026" under "Fundada" and "102" under "Miembros"

#### Scenario: Missing images and date
- **WHEN** the tenant has no banner, no logo and no `fecha_creacion`
- **THEN** the card SHALL show the cover placeholder, the initials mark and "—" under "Fundada"

#### Scenario: Member count fails
- **WHEN** the member count cannot be loaded
- **THEN** the card SHALL still render and "Miembros" SHALL show "—"

### Requirement: Organization contact and social card
The page SHALL show a "Contacto y redes sociales" card with the items correo, teléfono, sitio web, Instagram, Facebook and X. A filled item SHALL show its value and an action to copy it (correo, teléfono) or open it in a new tab (sitio web and social links). An empty item SHALL show "Conectar", which opens the organization edit drawer.

#### Scenario: Copy the email
- **WHEN** the administrator activates the copy action of the email item
- **THEN** the email SHALL be copied to the clipboard and a short confirmation SHALL be announced to assistive technology

#### Scenario: Open a social link
- **WHEN** the Instagram URL is set and the administrator activates its open action
- **THEN** the URL SHALL open in a new tab with `rel="noopener noreferrer"`

#### Scenario: Empty social link
- **WHEN** the Facebook URL is not set
- **THEN** the Facebook item SHALL show "Conectar", and activating it SHALL open the edit drawer

### Requirement: Organization page states
The organization data SHALL show a loading state while fetching and an error state with "Reintentar" when it fails. Each settings section SHALL load and fail independently so one failure does not hide the others.

#### Scenario: Organization data fails
- **WHEN** loading the organization data fails
- **THEN** the identity and contact area SHALL show an error state with "Reintentar", and the settings sections SHALL still render

#### Scenario: A section fails
- **WHEN** the payment methods fail to load
- **THEN** only the payment methods section SHALL show its error state
