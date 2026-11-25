# Spec Delta

## MODIFIED Requirements

### Requirement: gestion-organizacion page includes TenantReglasSuspensionCard
The `gestion-organizacion` page (`src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx`) SHALL render, in this order: the page header; a row with the identity card and the contact & social card; a row with the payment methods section and the suspension rules section side by side from `lg` (stacked below); and the automatic notifications section full width. The page entrypoint SHALL only compose feature components.

#### Scenario: Suspension rules card appears below payment methods card
- **WHEN** an authenticated administrator opens the `gestion-organizacion` page
- **THEN** the page SHALL display the suspension rules section next to the payment methods section from `lg`, and directly below it on narrower screens

#### Scenario: Sections render in order
- **WHEN** an administrator opens `gestion-organizacion` at 1440px
- **THEN** the identity and contact cards SHALL render first, then payment methods and suspension rules side by side, then the automatic notifications section

## ADDED Requirements

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
