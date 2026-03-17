## ADDED Requirements

### Requirement: Team management route SHALL be accessible only to administrators
The system SHALL expose the route `/portal/orgs/[tenant_id]/gestion-equipo` within the `(administrador)` Next.js route-group. Any authenticated user whose resolved tenant role is not `administrador` SHALL be redirected by the existing role-gate layout and SHALL NOT be able to access this page, **with the exception that `entrenador` users SHALL be permitted access to the route when the `AsignarNivelModal` interaction is invoked via a direct link or navigation — access control for level assignment is enforced at the RLS layer, not the route layer**. The table itself remains read-only for coaches; no other mutations are exposed to the `entrenador` role.

#### Scenario: Administrator accesses team management page
- **WHEN** an authenticated user with `administrador` role navigates to `/portal/orgs/[tenant_id]/gestion-equipo`
- **THEN** the system SHALL render the `EquipoPage` component for that tenant

#### Scenario: Non-administrator attempts to access team management page
- **WHEN** an authenticated user whose resolved role for the tenant is `usuario` navigates to `/portal/orgs/[tenant_id]/gestion-equipo`
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
The `EquipoTable` component SHALL render a table with the following columns in order: **Nombre** (full name), **Tipo ID**, **N° Identificación**, **Teléfono**, **Correo**, **Estado** (as a colour-coded badge), **Perfil** (role name), and **Acciones**. The table SHALL include `<thead>` with `scope="col"` on every `<th>`. Nullable fields SHALL display `—` when empty. The **Acciones** column SHALL always be rendered regardless of which action callbacks are provided; individual action buttons within the column SHALL render only when their corresponding callback prop is passed.

#### Scenario: All columns are rendered for a complete member record
- **WHEN** a member has all fields populated
- **THEN** the system SHALL display full name, tipo ID, número de identificación, phone, email, status badge, role name, and the Acciones cell in the corresponding columns

#### Scenario: Nullable identification fields display em-dash
- **WHEN** a member's `tipo_identificacion` or `numero_identificacion` is null
- **THEN** the system SHALL render `—` in the respective column cell

#### Scenario: Acciones column header is always present
- **WHEN** the `EquipoTable` renders
- **THEN** the system SHALL always include an **Acciones** `<th>` as the last column, regardless of which callback props are provided

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

## ADDED Requirements

### Requirement: EquipoTable SHALL expose an "Asignar nivel" action button per row
`EquipoTable` SHALL render a new icon button (using the `military_tech` Material Icon or equivalent) in the actions column of each row. Clicking the button SHALL open `AsignarNivelModal` for that member. The button SHALL be visible to `administrador` and `entrenador` roles. All other existing action buttons (status changes, etc.) remain gated to `administrador` only.

#### Scenario: Administrator sees Asignar nivel button for each member
- **WHEN** an authenticated administrator views the team management table
- **THEN** each row SHALL display the "Asignar nivel" icon button in the actions column

#### Scenario: Clicking Asignar nivel opens AsignarNivelModal for the correct member
- **WHEN** an administrator clicks the "Asignar nivel" button on a member row
- **THEN** the system SHALL open `AsignarNivelModal` pre-loaded with the target member's `usuario_id` and the tenant context

#### Scenario: Existing EquipoTable actions are unaffected
- **WHEN** the new action button is added to the table
- **THEN** all existing row action buttons (edit estado, etc.) SHALL continue to function without regression

---

### Requirement: EquipoPage SHALL wire AsignarNivelModal open/close lifecycle
`EquipoPage` SHALL manage an `asignarNivelTarget` state (the selected `usuario_id` or `null`). When set, `AsignarNivelModal` SHALL be rendered for that user. On modal close (success or cancel) `asignarNivelTarget` SHALL be reset to `null`.

#### Scenario: Modal opens when asignarNivelTarget is set
- **WHEN** an administrator clicks "Asignar nivel" for a member
- **THEN** `AsignarNivelModal` SHALL be rendered with the correct `usuarioId` prop

#### Scenario: Modal closes on cancel
- **WHEN** the administrator dismisses `AsignarNivelModal` without submitting
- **THEN** `asignarNivelTarget` SHALL be reset to `null` and the modal SHALL be removed from the DOM

#### Scenario: Modal closes after successful submission
- **WHEN** a level assignment is successfully submitted via `AsignarNivelModal`
- **THEN** a success toast SHALL be shown and the modal SHALL close

#### Scenario: Modal shows inline error on service failure
- **WHEN** the `upsert` call in `useUsuarioNivelDisciplina` fails
- **THEN** the error message SHALL be displayed inside `AsignarNivelModal` and the modal SHALL remain open

---

### Requirement: Gestion-equipo page SHALL render a tab bar with Equipo and Solicitudes tabs
`EquipoPage` SHALL render a tab bar with two tabs: **Equipo** and **Solicitudes**. The active tab SHALL be managed via local `useState` (default: `'equipo'`). The Equipo tab SHALL render the existing member list content. The Solicitudes tab SHALL render `SolicitudesTab`. Both tabs SHALL be visible only to users with the `administrador` role.

#### Scenario: Equipo tab is active by default
- **WHEN** an administrator opens the gestion-equipo page
- **THEN** the system SHALL render the Equipo tab as active and display the member list

#### Scenario: Clicking Solicitudes tab switches content
- **WHEN** the administrator clicks the Solicitudes tab
- **THEN** the system SHALL render `SolicitudesTab` in place of the member list content

#### Scenario: Clicking Equipo tab restores member list
- **WHEN** the administrator clicks the Equipo tab after viewing Solicitudes
- **THEN** the system SHALL render the original member list content

---

### Requirement: EquipoPage SHALL render a third "Bloqueados" tab
`EquipoPage` SHALL extend its `ActiveTab` union type to include `'bloqueados'`. The tab navigation bar SHALL render a **"Bloqueados"** button after the existing "Solicitudes" button. When `activeTab === 'bloqueados'`, the system SHALL render the `BloqueadosTab` component.

#### Scenario: Bloqueados tab button is visible to administrators
- **WHEN** an administrator opens the team management page
- **THEN** the tab bar SHALL display three buttons: "Equipo", "Solicitudes", and "Bloqueados"

#### Scenario: Clicking Bloqueados tab renders the blocked users panel
- **WHEN** an administrator clicks the "Bloqueados" tab
- **THEN** `activeTab` SHALL become `'bloqueados'` and the system SHALL render `BloqueadosTab`

---

### Requirement: BloqueadosTab SHALL list all blocked users for the tenant with an unblock action
`BloqueadosTab` SHALL receive `bloqueados: BloqueadoRow[]`, `loading`, `error`, `desbloquear`, and `refresh` props from `useBloqueados`. It SHALL delegate table rendering to `BloqueadosTable`. The component SHALL display loading, error, and empty states consistent with the `SolicitudesTab` pattern.

#### Scenario: Empty blocked list shows empty state message
- **WHEN** no block records exist for the tenant
- **THEN** the system SHALL display "No hay usuarios bloqueados."

#### Scenario: Error state shows retry button
- **WHEN** the `getBloqueadosByTenant` call fails
- **THEN** the system SHALL display the error message and a "Reintentar" button

#### Scenario: Loaded blocked list renders BloqueadosTable
- **WHEN** block records are loaded successfully
- **THEN** the system SHALL render `BloqueadosTable` with those records

---

### Requirement: BloqueadosTable SHALL display blocked user details and a per-row unblock action
`BloqueadosTable` SHALL render a table with columns: **Nombre** (avatar + full name), **Correo**, **Bloqueado el** (`bloqueado_at` formatted), **Motivo** (`motivo` or `—`), **Acciones**. The actions column SHALL contain a **"Desbloquear"** button per row. Clicking "Desbloquear" SHALL show an inline confirmation before calling `desbloquear(usuarioId)`.

#### Scenario: Table renders all expected columns
- **WHEN** blocked users are loaded
- **THEN** the system SHALL display name, email, block date, reason, and actions columns for each row

#### Scenario: Missing motivo displays em-dash
- **WHEN** a block record has a null `motivo`
- **THEN** the system SHALL display `—` in the Motivo column

#### Scenario: Desbloquear requires inline confirmation
- **WHEN** an administrator clicks "Desbloquear" on a row
- **THEN** the system SHALL show an inline confirm prompt before invoking `desbloquear`

#### Scenario: Confirming unblock removes the user from the list
- **WHEN** an administrator confirms the unblock action
- **THEN** the system SHALL call `desbloquearUsuario` and refresh the blocked list, removing the row

---

### Requirement: SolicitudesTable SHALL include a "Bloquear" action per row
`SolicitudesTable` SHALL accept an `onBloquear: (solicitud: SolicitudRow, motivo?: string) => void` prop. For rows whose `estado` is `pendiente` or `rechazada`, the table SHALL render a **"Bloquear"** action button with an inline confirmation that includes an optional `motivo` text input.

#### Scenario: Bloquear button appears on pendiente and rechazada rows
- **WHEN** `SolicitudesTable` renders a row with `estado === 'pendiente'` or `estado === 'rechazada'`
- **THEN** a "Bloquear" button SHALL be visible in the actions column

#### Scenario: Bloquear button is not shown on aceptada rows
- **WHEN** `SolicitudesTable` renders a row with `estado === 'aceptada'`
- **THEN** the system SHALL NOT render a "Bloquear" button for that row

#### Scenario: Bloquear requires inline confirmation
- **WHEN** an administrator clicks "Bloquear" on a row
- **THEN** the system SHALL show an inline confirm prompt (consistent with the existing reject confirmation pattern) before invoking `onBloquear`

#### Scenario: Confirming block calls onBloquear with optional motivo
- **WHEN** an administrator confirms block with a motivo entered
- **THEN** the system SHALL call `onBloquear(solicitud, motivo)` with the trimmed motivo value

---

### Requirement: useBloqueados hook SHALL manage blocked user state for a tenant
`useBloqueados({ tenantId })` SHALL fetch all blocked users from `solicitudesService.getBloqueadosByTenant(tenantId)` on mount. It SHALL expose `bloqueados`, `loading`, `error`, `desbloquear(usuarioId)`, and `refresh()`. `desbloquear` SHALL call `solicitudesService.desbloquearUsuario(tenantId, usuarioId)` and then `refresh()`.

#### Scenario: Blocked users are loaded on mount
- **WHEN** `useBloqueados` mounts with a valid `tenantId`
- **THEN** `loading` SHALL briefly be `true` then transition to `false` with `bloqueados` populated

#### Scenario: Desbloquear refreshes the list
- **WHEN** `desbloquear(usuarioId)` is called and the service call succeeds
- **THEN** `refresh()` SHALL be called and the unblocked user SHALL no longer appear in `bloqueados`

---

### Requirement: Acciones column SHALL render up to four icon buttons per row
Each row in `EquipoTable` SHALL render the following icon buttons (using `material-symbols-outlined`) in the Acciones cell, each conditionally rendered based on whether its callback prop is provided:
1. **Edit Profile** (`edit` icon) — calls `onEditarPerfil(row)`.
2. **Assign Level** (`military_tech` icon) — calls `onAsignarNivel(row.usuario_id)` (existing).
3. **Remove from Team** (`person_remove` icon) — calls `onEliminar(row)`.
4. **Block from Team** (`block` icon) — calls `onBloquear(row)`.

Each button SHALL include a `title` attribute describing its action for accessibility. Edit and Assign Level buttons SHALL use `hover:text-turquoise`. Remove SHALL use `hover:text-rose-400`. Block SHALL use `hover:text-amber-400`.

#### Scenario: All four action buttons render when all callbacks are provided
- **WHEN** `EquipoTable` receives `onEditarPerfil`, `onAsignarNivel`, `onEliminar`, and `onBloquear` props
- **THEN** the system SHALL render all four icon buttons in each row's Acciones cell

#### Scenario: Absent callback omits its button
- **WHEN** `EquipoTable` does not receive `onEliminar`
- **THEN** the system SHALL NOT render the person_remove button in any row

#### Scenario: Action buttons have accessible title attributes
- **WHEN** an action button is rendered
- **THEN** each button SHALL have a non-empty `title` attribute describing its action

---

### Requirement: Edit Profile action SHALL open a pre-filled modal and allow admin to update member data
`EquipoPage` SHALL open `EditarPerfilMiembroModal` when `onEditarPerfil` is called for a row. The modal SHALL be pre-filled with the member's current data from `MiembroTableItem` for `usuarios` fields, and SHALL fetch `perfil_deportivo` (`peso_kg`, `altura_cm`) lazily on open. The admin SHALL be able to update the following fields:
- **Identity**: `nombre` (required), `apellido` (optional).
- **Contact**: `telefono` (optional), `fecha_nacimiento` (ISO date string, optional).
- **Document**: `tipo_identificacion` (select: CC/CE/TI/NIT/Pasaporte/Otro, optional), `numero_identificacion` (optional), `rh` (optional).
- **Status**: `estado` (select: activo/mora/suspendido/inactivo, required).
- **Sports Profile**: `peso_kg` (numeric, optional), `altura_cm` (numeric, optional).

The `email` field SHALL be displayed as a read-only disabled field and SHALL NOT be included in the update payload. The modal SHALL call `equipoService.editarPerfilMiembro(input)`, which SHALL UPDATE `public.usuarios` and UPSERT `public.perfil_deportivo` (only when at least one sports field is non-null). On success, the modal SHALL close and `useEquipo.refresh()` SHALL be triggered.

#### Scenario: Modal opens pre-filled with current member data
- **WHEN** the admin clicks the Edit Profile button for a member
- **THEN** the system SHALL open `EditarPerfilMiembroModal` with all fields populated from the member's current record

#### Scenario: Email field is displayed but not editable
- **WHEN** the Edit Profile modal is open
- **THEN** the system SHALL display the member's email in a disabled input that cannot be changed

#### Scenario: Saving valid changes updates the member record
- **WHEN** the admin modifies one or more fields and clicks Save
- **THEN** the system SHALL call `editarPerfilMiembro` with the updated payload, close the modal on success, and refresh the member list

#### Scenario: Saving with empty nombre shows validation error
- **WHEN** the admin clears the `nombre` field and attempts to save
- **THEN** the system SHALL NOT submit the form and SHALL display an inline validation error on the `nombre` field

#### Scenario: Sports profile data is fetched lazily on modal open
- **WHEN** the admin opens the Edit Profile modal
- **THEN** the system SHALL fetch `perfil_deportivo` for that user_id and populate `peso_kg` and `altura_cm` fields (displaying a skeleton while loading)

#### Scenario: Save button shows loading state during submission
- **WHEN** the admin clicks Save and the operation is in progress
- **THEN** the system SHALL disable the Save button and show a loading indicator

#### Scenario: Service error surfaces in the modal
- **WHEN** `editarPerfilMiembro` throws an error
- **THEN** the system SHALL display an inline error message inside the modal without closing it

---

### Requirement: Remove Member action SHALL delete the membership record after confirmation
`EquipoPage` SHALL open `EliminarMiembroModal` when `onEliminar` is called for a row. The modal SHALL display the member's full name and a warning that their account will not be deleted. On confirmation, the system SHALL call `equipoService.eliminarMiembro({ miembro_id, tenant_id })`, which SHALL DELETE the matching row from `public.miembros_tenant`. On success, the modal SHALL close and `useEquipo.refresh()` SHALL be triggered.

#### Scenario: Remove modal displays member's name and a confirmation warning
- **WHEN** the admin clicks the Remove button for a member
- **THEN** the system SHALL open `EliminarMiembroModal` showing the member's full name and a warning that the user account will not be deleted

#### Scenario: Confirming removal deletes the membership and refreshes the table
- **WHEN** the admin clicks the Confirm button in `EliminarMiembroModal`
- **THEN** the system SHALL call `eliminarMiembro`, remove the row from the table on success, and close the modal

#### Scenario: Cancelling the remove modal takes no action
- **WHEN** the admin clicks Cancel in `EliminarMiembroModal`
- **THEN** the system SHALL close the modal and leave the member's record unchanged

#### Scenario: Removed member no longer appears in the Equipo table
- **WHEN** a membership is successfully deleted
- **THEN** the system SHALL refresh the member list and the removed member SHALL NOT appear in the table

#### Scenario: Confirm button shows loading state during deletion
- **WHEN** the admin confirms removal and the operation is in progress
- **THEN** the system SHALL disable both modal buttons and show a loading indicator on the Confirm button

---

### Requirement: Block Member action SHALL insert a block record and remove the membership
`EquipoPage` SHALL open `BloquearMiembroModal` when `onBloquear` is called for a row. The modal SHALL display the member's full name, an optional `motivo` textarea (max 300 characters), and a warning that the member will be blocked from sending future access requests. On confirmation, `equipoService.bloquearMiembroDelEquipo` SHALL:
1. INSERT into `public.miembros_tenant_bloqueados` (`tenant_id`, `usuario_id`, `bloqueado_por`, `motivo`).
2. DELETE the matching row from `public.miembros_tenant`.

The INSERT SHALL be performed first; the DELETE SHALL only execute if the INSERT succeeds. On success, the modal SHALL close and `useEquipo.refresh()` SHALL be triggered.

#### Scenario: Block modal displays member's name, motivo field, and warning
- **WHEN** the admin clicks the Block button for a member
- **THEN** the system SHALL open `BloquearMiembroModal` showing the member's full name, a motivo textarea, and a warning about blocking consequences

#### Scenario: Confirming block with optional motivo creates a block record and removes membership
- **WHEN** the admin enters an optional motivo and clicks Confirm Block
- **THEN** the system SHALL insert into `miembros_tenant_bloqueados` and delete from `miembros_tenant`, then refresh the table

#### Scenario: Confirming block without motivo still succeeds
- **WHEN** the admin leaves the motivo field empty and clicks Confirm Block
- **THEN** the system SHALL insert a block record with `motivo = null` and proceed with membership removal

#### Scenario: Blocked member no longer appears in the Equipo tab
- **WHEN** a membership is successfully blocked
- **THEN** the system SHALL refresh the member list and the blocked member SHALL NOT appear in the Equipo tab

#### Scenario: Blocked member appears in the Bloqueados tab
- **WHEN** a membership is successfully blocked
- **THEN** the Bloqueados tab SHALL include the newly blocked member when refreshed or re-opened

#### Scenario: Failure of INSERT prevents the DELETE
- **WHEN** the INSERT into `miembros_tenant_bloqueados` fails (e.g., duplicate key)
- **THEN** the system SHALL NOT delete the membership row and SHALL display an error message inside the modal

#### Scenario: Cancelling the block modal takes no action
- **WHEN** the admin clicks Cancel in `BloquearMiembroModal`
- **THEN** the system SHALL close the modal and leave the member's record and block state unchanged

---

### Requirement: `equipo.service.ts` SHALL expose a function to fetch a member's sports profile
`equipoService.getPerfilDeportivo(usuarioId: string)` SHALL SELECT `peso_kg` and `altura_cm` from `public.perfil_deportivo` WHERE `user_id = usuarioId`. If no row exists, the function SHALL return `{ peso_kg: null, altura_cm: null }` rather than throwing an error.

#### Scenario: Sports profile exists and is returned
- **WHEN** `getPerfilDeportivo` is called for a user who has a `perfil_deportivo` record
- **THEN** the function SHALL return an object with `peso_kg` and `altura_cm` values

#### Scenario: No sports profile returns null values
- **WHEN** `getPerfilDeportivo` is called for a user who has no `perfil_deportivo` record
- **THEN** the function SHALL return `{ peso_kg: null, altura_cm: null }` without throwing

---

### Requirement: Database migration SHALL add RLS policies enabling admin mutations on usuarios and miembros_tenant
The migration SHALL create:
1. Policy `usuarios_update_admin` on `public.usuarios` FOR UPDATE TO `authenticated`: allows updating rows where `id` is a `usuario_id` in `miembros_tenant` for a tenant administered by the current user (via `get_admin_tenants_for_authenticated_user()`).
2. Policy `miembros_tenant_delete_admin` on `public.miembros_tenant` FOR DELETE TO `authenticated`: allows deleting rows where `tenant_id` is administered by the current user.
3. `GRANT DELETE ON TABLE public.miembros_tenant TO authenticated`.

Non-admin roles (usuario, entrenador) SHALL NOT be able to execute these operations via the browser client.

#### Scenario: Admin can update a member's usuarios record in their tenant
- **WHEN** an authenticated admin executes an UPDATE on `public.usuarios` for a user who is a member of their tenant
- **THEN** the operation SHALL succeed

#### Scenario: Non-admin cannot update another user's usuarios record
- **WHEN** an authenticated non-admin executes an UPDATE on `public.usuarios` for any user other than themselves
- **THEN** the operation SHALL be rejected by RLS

#### Scenario: Admin can delete a miembros_tenant row in their tenant
- **WHEN** an authenticated admin executes a DELETE on `public.miembros_tenant` for a row in their tenant
- **THEN** the operation SHALL succeed

#### Scenario: Non-admin cannot delete miembros_tenant rows
- **WHEN** an authenticated non-admin executes a DELETE on `public.miembros_tenant`
- **THEN** the operation SHALL be rejected by RLS
