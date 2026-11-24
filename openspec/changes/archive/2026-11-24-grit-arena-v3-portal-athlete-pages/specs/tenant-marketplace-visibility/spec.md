# Spec Delta

## ADDED Requirements

### Requirement: Organization marketplace page layout
`/portal/orgs` SHALL show the single `h1` "Encuentra tu club." with "club." as the accent, a search field "Buscar club o disciplina", the pending-invitations section, and two sections:
- **"Tus clubes"**: organizations where the user is a member, meaning they have a role and access is allowed;
- **"Explora clubes"**: all other listed organizations.

Each section SHALL be sorted by name and hidden when it has no items.

#### Scenario: Member and non-member organizations
- **WHEN** the user is a member of "Grit Arena" and the directory also lists "Tri Andes" and "Pace Club"
- **THEN** "Grit Arena" SHALL appear under "Tus clubes" and "Pace Club" then "Tri Andes" under "Explora clubes"

#### Scenario: No memberships
- **WHEN** the user has no memberships
- **THEN** the "Tus clubes" section SHALL NOT be rendered

#### Scenario: Single heading
- **WHEN** the page renders
- **THEN** it SHALL contain exactly one `h1`

### Requirement: Organization marketplace search
The search SHALL filter both sections client-side by organization name and description, ignoring case and accents. When nothing matches, the page SHALL show "No encontramos clubes con «{texto}»" with a "Limpiar búsqueda" action that empties the field.

#### Scenario: Accent-insensitive search
- **WHEN** the user types "natacion"
- **THEN** an organization described as "Club de natación" SHALL be listed

#### Scenario: No match
- **WHEN** the search matches no organization and the user clicks "Limpiar búsqueda"
- **THEN** the field SHALL be empty and every organization SHALL be listed again

### Requirement: Member club card
Each organization under "Tus clubes" SHALL be a large photo card in a two-column grid (one column below 1024px), showing:
- the banner or a dark placeholder;
- a "MIEMBRO" pill, plus "PRIVADA" when private;
- a round arrow link "Ingresar a {nombre}";
- the logo or initials mark;
- the name and a one-line description;
- "Ver planes" and "Ingresar".

Both links go to the role's default path.

#### Scenario: Member card actions
- **WHEN** a user with role `usuario` clicks "Ingresar" on "Grit Arena"
- **THEN** they SHALL navigate to the default path of that role in "Grit Arena"

#### Scenario: Private member organization
- **WHEN** the member organization has `publico = false`
- **THEN** its card SHALL show both "MIEMBRO" and "PRIVADA"

#### Scenario: Missing images
- **WHEN** the organization has no banner and its logo fails to load
- **THEN** the card SHALL show the dark placeholder and the initials mark, without broken images

### Requirement: Explore club card
Each organization under "Explora clubes" SHALL be a photo card in a grid: 4 columns from 1280px, 2 from 640px, otherwise 1. It SHALL show:
- the banner or the placeholder;
- the organization mark;
- the name (15/600) and a one-line description when present;
- the actions "Ver planes" and "Solicitar acceso".

"Solicitar acceso" SHALL keep all its existing states: confirmation, pending, blocked, incomplete profile and request history.

#### Scenario: Request access from the card
- **WHEN** a non-member clicks "Solicitar acceso" on "Pace Club" and confirms
- **THEN** the request SHALL be created and the button SHALL show the pending state, as before this change

#### Scenario: See plans
- **WHEN** the user clicks "Ver planes" on any card
- **THEN** the organization's plans dialog SHALL open, and closing it SHALL return focus to the button

### Requirement: Organization marketplace states
While loading, the page SHALL show a loading state. On failure it SHALL show the error and a "Reintentar" button that reloads the directory. When the directory is empty, it SHALL show "No hay organizaciones disponibles por ahora." Every image SHALL have Spanish alt text naming the organization, or be decorative when the name is printed next to it.

#### Scenario: Retry
- **WHEN** the directory request fails and the user clicks "Reintentar"
- **THEN** the directory SHALL be requested again

#### Scenario: Narrow viewport
- **WHEN** the page is viewed at 360px
- **THEN** there SHALL be no horizontal scroll and long names SHALL truncate or wrap within their card

## MODIFIED Requirements

### Requirement: Tenant branding image fallback SHALL be shared
A hook `useTenantBrandingImages(identity)` in `src/hooks/portal/tenant/` SHALL return `{ logoSrc, bannerSrc, onLogoError, onBannerError }` and SHALL implement the existing fallback: on the first load error of each image, try a signed URL for the organization asset path with extensions `png`, `jpg`, `webp`, and resolve to `null` when none works. `TenantIdentityCard` and both marketplace cards (member and explore) SHALL use this hook.

#### Scenario: Stored URL expired but the asset exists
- **WHEN** a logo URL fails to load and the asset exists in storage
- **THEN** the hook SHALL replace `logoSrc` with a fresh signed URL

#### Scenario: Retry happens once
- **WHEN** the replacement URL also fails
- **THEN** the hook SHALL NOT retry again and `logoSrc` SHALL be `null`

## REMOVED Requirements

### Requirement: Directory SHALL render organizations with `TenantDirectoryCard`
**Reason**: The v3 frame `kMj4F` replaces the single alphabetical grid of `TenantDirectoryCard` with a two-section marketplace.
**Migration**: See "Organization marketplace page layout", "Member club card" and "Explore club card". The actions ("Ingresar", "Solicitar acceso", "Ver planes") keep their behavior. `TenantIdentityCard` on `gestion-organizacion` is unchanged.

### Requirement: Directory card SHALL show membership and privacy badges
**Reason**: Membership is now expressed by the section ("Tus clubes") and the "MIEMBRO" overlay pill. Private organizations are only listed to their members, so the privacy pill lives on the member card.
**Migration**: See "Member club card" ("MIEMBRO" and "PRIVADA" pills).
