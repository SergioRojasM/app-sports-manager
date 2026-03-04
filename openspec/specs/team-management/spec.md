## ADDED Requirements

### Requirement: Team management route SHALL be accessible only to administrators
The system SHALL expose the route `/portal/orgs/[tenant_id]/gestion-equipo` exclusively within the `(administrador)` Next.js route-group. Any authenticated user whose resolved tenant role is not `administrador` SHALL be redirected by the existing role-gate layout and SHALL NOT be able to access this page.

#### Scenario: Administrator accesses team management page
- **WHEN** an authenticated user with `administrador` role navigates to `/portal/orgs/[tenant_id]/gestion-equipo`
- **THEN** the system SHALL render the `EquipoPage` component for that tenant

#### Scenario: Non-administrator attempts to access team management page
- **WHEN** an authenticated user whose resolved role for the tenant is `usuario` or `entrenador` navigates to `/portal/orgs/[tenant_id]/gestion-equipo`
- **THEN** the system SHALL redirect the user away from the route (handled by the `(administrador)` route-group layout)

---

### Requirement: Team management navigation entry SHALL appear in the administrator sidebar
`ROLE_TENANT_ITEMS` in `src/types/portal.types.ts` SHALL include an entry `{ label: 'Equipo', path: 'gestion-equipo', icon: 'groups' }` in the `administrador` array, so that `resolvePortalMenu` produces a **Equipo** navigation item linking to `/portal/orgs/[tenant_id]/gestion-equipo` for administrator users.

#### Scenario: Administrator role menu includes team entry
- **WHEN** an authenticated user with `administrador` role views the portal navigation for a tenant
- **THEN** the system SHALL display an **Equipo** navigation item that links to the team management route

#### Scenario: Non-administrator roles do not see team entry
- **WHEN** an authenticated user with `usuario` or `entrenador` role views the portal navigation
- **THEN** the system SHALL NOT display an **Equipo** navigation item

---

### Requirement: System SHALL list all members of the tenant
`equipo.service.ts` SHALL query `public.miembros_tenant` joined with `public.usuarios` and `public.roles`, filtered by `tenant_id`. The result SHALL include every user who has an active membership record for that tenant, including the administrator themselves.

#### Scenario: Members are loaded on page mount
- **WHEN** an administrator navigates to the team management page for a tenant
- **THEN** the system SHALL fetch and display all members belonging to that tenant

#### Scenario: Empty tenant returns empty state
- **WHEN** a tenant has no member records in `miembros_tenant`
- **THEN** the system SHALL display an empty state message instead of the table

#### Scenario: Service error is surfaced to the user
- **WHEN** the Supabase query fails (e.g., network error or RLS denial)
- **THEN** the system SHALL display an error message with a retry button

---

### Requirement: Member table SHALL display required columns
The `EquipoTable` component SHALL render a table with the following columns in order: **Nombre** (full name), **Tipo ID**, **N° Identificación**, **Teléfono**, **Correo**, **Estado** (as a colour-coded badge), and **Perfil** (role name). The table SHALL include `<thead>` with `scope="col"` on every `<th>`. Nullable fields SHALL display `—` when empty.

#### Scenario: All columns are rendered for a complete member record
- **WHEN** a member has all fields populated
- **THEN** the system SHALL display full name, tipo ID, número de identificación, phone, email, status badge, and role name in the corresponding columns

#### Scenario: Nullable identification fields display em-dash
- **WHEN** a member's `tipo_identificacion` or `numero_identificacion` is null
- **THEN** the system SHALL render `—` in the respective column cell

---

### Requirement: Estado SHALL be displayed as a colour-coded badge
`EquipoStatusBadge` SHALL render a `<span>` element with an `aria-label` attribute and Tailwind colour classes that map each `estado` value to a distinct visual treatment:
- `activo` → emerald (green)
- `mora` → amber (yellow)
- `suspendido` → orange
- `inactivo` → slate (gray)

#### Scenario: Active member status badge is green
- **WHEN** a member's `estado` is `activo`
- **THEN** the system SHALL render the badge with emerald colour classes

#### Scenario: Mora member status badge is amber
- **WHEN** a member's `estado` is `mora`
- **THEN** the system SHALL render the badge with amber colour classes

#### Scenario: Suspended member status badge is orange
- **WHEN** a member's `estado` is `suspendido`
- **THEN** the system SHALL render the badge with orange colour classes

#### Scenario: Inactive member status badge is slate
- **WHEN** a member's `estado` is `inactivo`
- **THEN** the system SHALL render the badge with slate colour classes

---

### Requirement: Page SHALL display three statistical summary cards
`EquipoStatsCards` SHALL render three glass-style cards derived from the full (unfiltered) member list:
1. **Total Miembros** — count of all members in the tenant.
2. **Usuarios Activos** — count of members where `estado === 'activo'`.
3. **Entrenadores Activos** — count of members where `rol_nombre.toLowerCase() === 'entrenador'` AND `estado === 'activo'`.

Stats SHALL be computed by a pure helper `getEquipoStats(members)` in `equipo.service.ts` with no additional Supabase query.

#### Scenario: Stats reflect total tenant membership
- **WHEN** the member list is fetched
- **THEN** the Total Miembros card SHALL display the count of all fetched member records regardless of their estado

#### Scenario: Stats reflect active users
- **WHEN** the member list is fetched
- **THEN** the Usuarios Activos card SHALL display only the count of members whose `estado` is `activo`

#### Scenario: Stats reflect active trainers
- **WHEN** the member list is fetched
- **THEN** the Entrenadores Activos card SHALL display only the count of members whose role is `entrenador` AND estado is `activo`

---

### Requirement: Search bar SHALL filter members client-side by name, email, or phone
`EquipoHeaderFilters` SHALL render a text input that filters `filteredMembers` in `useEquipo` against the member's full name (case-insensitive), email (case-insensitive), and phone number. The filter SHALL be applied on every keystroke.

#### Scenario: Search by name filters rows
- **WHEN** the administrator types a partial name in the search input
- **THEN** the system SHALL display only the rows whose full name contains the search term (case-insensitive)

#### Scenario: Search by email filters rows
- **WHEN** the administrator types a partial email in the search input
- **THEN** the system SHALL display only the rows whose email contains the search term (case-insensitive)

#### Scenario: Search by phone filters rows
- **WHEN** the administrator types digits in the search input
- **THEN** the system SHALL display only the rows whose phone number contains those digits

#### Scenario: Clearing the search input restores all rows
- **WHEN** the administrator clears the search input
- **THEN** the system SHALL display all members that match the current estado filter

---

### Requirement: Quick-filter chips SHALL filter members by estado
`EquipoHeaderFilters` SHALL render a row of filter chips: **Todos**, **Activo**, **Mora**, **Suspendido**, **Inactivo**. Selecting a chip SHALL update `estadoFilter` in `useEquipo`, which SHALL filter `filteredMembers` accordingly. The active chip SHALL have a distinct visual treatment.

#### Scenario: Selecting an estado chip filters the table
- **WHEN** the administrator clicks the **Activo** chip
- **THEN** the system SHALL display only members whose `estado` is `activo`

#### Scenario: Selecting Todos chip removes estado filter
- **WHEN** the administrator clicks the **Todos** chip
- **THEN** the system SHALL display all members regardless of their `estado`

#### Scenario: Active chip is visually distinguished
- **WHEN** a chip is selected
- **THEN** the system SHALL render that chip with an accent border or background to indicate it is active

---

### Requirement: Table SHALL support client-side pagination with selectable page size
`useEquipo` SHALL manage `currentPage` (1-based, default `1`) and `pageSize` (options `20 | 50 | 100`, default `20`). Changing `searchTerm` or `estadoFilter` SHALL reset `currentPage` to `1`. `EquipoTable` SHALL receive `paginatedMembers` (the current page slice of `filteredMembers`) and render a pagination bar below the table.

The pagination bar SHALL include:
- A label "Mostrando X–Y de Z miembros".
- Previous and Next buttons (disabled at first and last page respectively).
- A `<select>` element with options `20`, `50`, `100` to change `pageSize`.

#### Scenario: Default view shows first 20 members
- **WHEN** the page loads with more than 20 members
- **THEN** the system SHALL display the first 20 members and the pagination label SHALL read "Mostrando 1–20 de Z miembros"

#### Scenario: Navigating to the next page shows the next slice
- **WHEN** the administrator clicks the Next button
- **THEN** the system SHALL display the next page slice and update the label accordingly

#### Scenario: Previous button is disabled on the first page
- **WHEN** the administrator is on page 1
- **THEN** the Previous button SHALL be rendered in a disabled state

#### Scenario: Next button is disabled on the last page
- **WHEN** the administrator is on the last page
- **THEN** the Next button SHALL be rendered in a disabled state

#### Scenario: Changing page size resets to page 1
- **WHEN** the administrator selects a different page size (e.g., 50)
- **THEN** `pageSize` SHALL be updated, `currentPage` SHALL reset to `1`, and the table SHALL display the first slice of `filteredMembers` using the new page size

#### Scenario: Applying a filter resets pagination to page 1
- **WHEN** the administrator changes the search term or estado filter
- **THEN** `currentPage` SHALL reset to `1`

---

### Requirement: Database migration SHALL add tipo_identificacion and numero_identificacion columns with constraints
The migration SHALL add `tipo_identificacion varchar(20)` and `numero_identificacion varchar(30)` as nullable columns to `public.usuarios`. It SHALL also add:
- `usuarios_tipo_identificacion_ck`: check constraint limiting values to `('CC', 'CE', 'TI', 'NIT', 'Pasaporte', 'Otro')`.
- `usuarios_estado_ck`: check constraint limiting values to `('activo', 'mora', 'suspendido', 'inactivo')`.
- RLS policy `miembros_tenant_select_admin` allowing `administrador` users to SELECT all `miembros_tenant` rows for their tenants via `get_admin_tenants_for_authenticated_user()`.

#### Scenario: New columns accept valid tipo_identificacion values
- **WHEN** a record is inserted with `tipo_identificacion = 'CC'`
- **THEN** the insert SHALL succeed

#### Scenario: New columns reject invalid tipo_identificacion values
- **WHEN** a record is inserted with `tipo_identificacion = 'DNI'` (not in the allowed list)
- **THEN** the database SHALL reject the insert with a check constraint violation

#### Scenario: Administrator can query tenant members via RLS
- **WHEN** an authenticated administrator executes a SELECT on `miembros_tenant` for their tenant
- **THEN** the query SHALL return all member rows for that tenant
