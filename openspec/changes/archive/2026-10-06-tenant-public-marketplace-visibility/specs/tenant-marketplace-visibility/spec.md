## ADDED Requirements

### Requirement: `tenants` table SHALL have a `publico` column
`public.tenants` SHALL have a column `publico boolean not null default true`. The migration SHALL leave every existing tenant with `publico = true`. Only administrators of the tenant SHALL be able to change the value, through the existing `tenants_update_admin_only` policy. The `tenants_select_authenticated` policy SHALL remain unchanged.

#### Scenario: Existing tenants stay public after the migration
- **WHEN** the migration is applied to a database with existing tenants
- **THEN** every existing tenant SHALL have `publico = true`

#### Scenario: New tenant defaults to public
- **WHEN** a tenant row is inserted without a `publico` value
- **THEN** the row SHALL have `publico = true`

#### Scenario: Non-administrator cannot change the flag
- **WHEN** a member without the `administrador` role updates `tenants.publico` for their tenant
- **THEN** the system SHALL NOT apply the update

### Requirement: Organization edit form SHALL expose a "Organización pública" checkbox
The organization edit form (`EditTenantForm`, under `gestion-organizacion`) SHALL include a checkbox `id="publico"` labelled **"Organización pública"**, placed immediately above the "Máximo de solicitudes rechazadas antes de bloqueo" field, with the helper text "Cuando está activo, la organización aparece en «Organizaciones disponibles» y cualquier usuario puede solicitar acceso. Si lo desactivas, solo la verán sus miembros y no recibirá nuevas solicitudes." referenced through `aria-describedby`. While the checkbox is unchecked the form SHALL show, with `role="status"`, the notice "Las solicitudes pendientes se conservan y puedes seguir gestionándolas. Para sumar miembros nuevos usa «Agregar miembro» en Gestión de equipo." The value SHALL be saved together with the rest of the form via `tenantService.updateTenant`. The checkbox SHALL be disabled while the form is submitting.

`TenantEditFormValues` SHALL include `publico: string` (boolean-as-string) and `TenantEditPayload` SHALL include `publico: boolean`. `TenantRow` SHALL include `publico: boolean`, `tenantService.fetchTenantById` SHALL select it, and `mapTenantToEditFormValues` SHALL map it as `String(tenant.publico ?? true)`. `useEditTenant` `EMPTY_VALUES` SHALL default to `'true'` and `toPayload` SHALL parse it as `values.publico === 'true'`.

#### Scenario: Admin sees the stored value
- **WHEN** an administrator opens the organization edit form
- **THEN** the "Organización pública" checkbox SHALL reflect the tenant's `publico` value

#### Scenario: Admin makes the organization private
- **WHEN** an administrator unchecks "Organización pública" and saves
- **THEN** the system SHALL store `tenants.publico = false` and reopening the form SHALL show the checkbox unchecked

#### Scenario: Admin makes the organization public again
- **WHEN** an administrator checks "Organización pública" and saves
- **THEN** the system SHALL store `tenants.publico = true`

#### Scenario: Notice is shown only while unchecked
- **WHEN** the checkbox is unchecked
- **THEN** the form SHALL show the pending-requests notice, and SHALL hide it when the checkbox is checked

#### Scenario: Other access settings stay editable while private
- **WHEN** the checkbox is unchecked
- **THEN** the `max_solicitudes` and `requiere_perfil_completo` fields SHALL remain editable

### Requirement: Directory query SHALL filter by visibility and membership
`tenantService.listVisibleTenantsForPortal(supabase, memberTenantIds)` SHALL return tenants whose `nombre` is not `public` and that either have `publico = true` or whose `id` is in `memberTenantIds`; when `memberTenantIds` is empty it SHALL return only tenants with `publico = true`. `useTenantView` in `directory` mode SHALL load the user's memberships first and pass their tenant ids to this function. `mapPortalTenants` SHALL set `isPublic` on each `PortalTenantListItem` from the tenant's `publico` value.

#### Scenario: User without memberships
- **WHEN** the directory loads for a user with no membership rows
- **THEN** the query SHALL return only tenants with `publico = true`

#### Scenario: User with a membership in a private tenant
- **WHEN** the directory loads for a user with a membership in a tenant with `publico = false`
- **THEN** the query SHALL return that tenant together with all public tenants, and its list item SHALL have `isPublic = false` and `canAccess = true`

#### Scenario: Pending requester of a tenant that became private
- **WHEN** a user with a `pendiente` request and no membership loads the directory after the tenant was set to `publico = false`
- **THEN** the tenant SHALL NOT be returned

### Requirement: `createSolicitud` SHALL reject requests to private organizations
`solicitudesService.createSolicitud` SHALL read the target tenant's `publico` value together with `requiere_perfil_completo` and, when `publico` is `false`, SHALL throw `SolicitudesServiceError` with code `'private_org'` and message "Esta organización no está recibiendo solicitudes de acceso." before evaluating profile completeness and without inserting a row. The `SolicitudesServiceError` code union SHALL include `'private_org'`.

#### Scenario: Request to a private organization from a stale page
- **WHEN** a user confirms "Solicitar acceso" for a tenant that has `publico = false`
- **THEN** no row SHALL be created and `SolicitarAccesoButton` SHALL show "Esta organización no está recibiendo solicitudes de acceso." inline

#### Scenario: Private check precedes the profile check
- **WHEN** the tenant has `publico = false` and `requiere_perfil_completo = true` and the user's profile is incomplete
- **THEN** the system SHALL throw the `'private_org'` error, not `'incomplete_profile'`

#### Scenario: Request to a public organization is unchanged
- **WHEN** a user calls `createSolicitud` for a tenant with `publico = true`
- **THEN** the duplicate, blocked and incomplete-profile guards SHALL behave as before and a valid request SHALL be inserted as `pendiente`

### Requirement: Changing visibility SHALL NOT modify existing access data
Setting `tenants.publico` to `false` or back to `true` SHALL NOT change any row in `miembros_tenant_solicitudes`, `miembros_tenant_bloqueados` or `miembros_tenant`, and SHALL NOT affect invitations, managed provisioning, public events or public plans of the tenant.

#### Scenario: Pending request survives going private
- **WHEN** an organization with a `pendiente` request is set to private
- **THEN** the request SHALL remain `pendiente` and appear in the administrator's "Solicitudes" tab

#### Scenario: Accepted requester sees the private organization
- **WHEN** the administrator accepts that request while the organization is private
- **THEN** the user SHALL see the organization card with "Ingresar" in the directory

#### Scenario: Organization name still resolves outside the directory
- **WHEN** a private organization has a public event or a pending invitation for a non-member
- **THEN** the organization name SHALL still be shown on the event and in the pending invitations section

### Requirement: Directory SHALL render organizations with `TenantDirectoryCard`
`TenantDirectoryList` SHALL render each organization with `TenantDirectoryCard` (props `identity`, `isMember`, `isPublic`, `primaryAction`, `secondaryAction`), keeping the existing grid and alphabetical order. The card SHALL follow the structure of `EventoPublicoCard` without importing it: a `rounded-grit-2xl` bordered `<article>`; a banner area on top showing the banner image or, when absent or failed, a gradient placeholder with a shield icon; the logo in a 48 px circle over the banner's bottom-left corner, or a shield icon when absent or failed; a body with the name as an italic `<h3>`, the description clamped to two lines only when present, and "Desde {mes} de {año}" formatted with `es-CO` only when the founding date is valid; and the actions pinned to the bottom, stacked at full width. Banner and logo images SHALL have Spanish `alt` text naming the organization. The card SHALL NOT render "—" placeholders, the uppercase description pill or the English "Founded" row.

For members, `primaryAction` SHALL be the "Ingresar" link to the role's default tenant path; for non-members it SHALL be `SolicitarAccesoButton`. `secondaryAction` SHALL be `VerPlanesButton` in both cases. `TenantIdentityCard` SHALL keep its current appearance on `gestion-organizacion`.

#### Scenario: Card with banner, logo and description
- **WHEN** an organization has banner, logo, description and founding date
- **THEN** the card SHALL show the banner on top, the logo over it, the italic name, the clamped description and the "Desde …" line in Spanish

#### Scenario: Card without optional data
- **WHEN** an organization has no banner, logo, description or founding date
- **THEN** the card SHALL show the gradient placeholder and shield icons and SHALL NOT render empty rows or "—"

#### Scenario: Broken image falls back
- **WHEN** a banner or logo URL fails to load and the signed-URL retry also fails
- **THEN** the card SHALL show the corresponding placeholder

#### Scenario: Existing actions keep working
- **WHEN** a user interacts with "Ingresar", "Solicitar acceso" (confirmation, pending, blocked, incomplete-profile and history states) or "Ver planes" inside the new card
- **THEN** each SHALL behave as it did in the previous card

#### Scenario: Cards align in a row
- **WHEN** cards with different amounts of content share a grid row
- **THEN** their action areas SHALL be aligned at the bottom

#### Scenario: Narrow viewport
- **WHEN** the directory is viewed at 360 px width
- **THEN** there SHALL be no horizontal scroll and chips and long names SHALL wrap

#### Scenario: gestion-organizacion card is unchanged
- **WHEN** an administrator opens `gestion-organizacion`
- **THEN** the organization card SHALL look the same as before this change

### Requirement: Directory card SHALL show membership and privacy badges
`TenantDirectoryCard` SHALL show, over the top-left of the banner, a chip with the `verified` icon and the text **"Miembro"** when `isMember` is true, for any role, and SHALL apply the highlighted cyan border to that card. It SHALL show a chip with the `lock` icon and the text **"Privada"** when `isPublic` is false. Cards of organizations where the user is not a member SHALL show neither chip nor the highlighted border. Chip icons SHALL be decorative (`aria-hidden`), so the status is conveyed by text.

#### Scenario: Member of a public organization
- **WHEN** the user has a membership in an organization with `publico = true`
- **THEN** its card SHALL show "Miembro" and the highlighted border, and SHALL NOT show "Privada"

#### Scenario: Member of a private organization
- **WHEN** the user has a membership in an organization with `publico = false`
- **THEN** its card SHALL show both "Miembro" and "Privada"

#### Scenario: Non-member
- **WHEN** the user has no membership in a listed organization
- **THEN** its card SHALL show no chip and the default border

#### Scenario: Badge is role-independent
- **WHEN** the user's membership role is `administrador`, `entrenador` or `usuario`
- **THEN** the chip text SHALL be "Miembro" in all three cases

### Requirement: Tenant branding image fallback SHALL be shared
A hook `useTenantBrandingImages(identity)` in `src/hooks/portal/tenant/` SHALL return `{ logoSrc, bannerSrc, onLogoError, onBannerError }` and SHALL implement the existing fallback: on the first load error of each image, try a signed URL for the organization asset path with extensions `png`, `jpg`, `webp`, and resolve to `null` when none works. `TenantIdentityCard` and `TenantDirectoryCard` SHALL both use this hook.

#### Scenario: Stored URL expired but the asset exists
- **WHEN** a logo URL fails to load and the asset exists in storage
- **THEN** the hook SHALL replace `logoSrc` with a fresh signed URL

#### Scenario: Retry happens once
- **WHEN** the replacement URL also fails
- **THEN** the hook SHALL NOT retry again and `logoSrc` SHALL be `null`
