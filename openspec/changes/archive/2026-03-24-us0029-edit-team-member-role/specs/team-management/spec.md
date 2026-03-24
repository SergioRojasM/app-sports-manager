## ADDED Requirements

### Requirement: Service SHALL expose a function to fetch all available roles
`equipo.service.ts` SHALL export a `getRoles()` function that queries `public.roles` and returns an array of `RolOption` objects (`{ id: string; nombre: string }`), ordered by `nombre`. The result SHALL contain exactly the three seeded roles: `administrador`, `entrenador`, `usuario`.

#### Scenario: Roles are fetched successfully
- **WHEN** `getRoles()` is called by the hook on mount
- **THEN** the service SHALL return an array of three `RolOption` objects corresponding to the `administrador`, `entrenador`, and `usuario` roles

#### Scenario: Roles query fails
- **WHEN** the Supabase query for `public.roles` fails (e.g., network error)
- **THEN** the service SHALL throw an `EquipoServiceError` with `code: 'unknown'`

---

### Requirement: Service SHALL expose a function to change a member's role with last-admin guard
`equipo.service.ts` SHALL export a `cambiarRolMiembro(input: CambiarRolMiembroInput)` function that updates `miembros_tenant.rol_id` for the given member. Before executing the UPDATE, the function SHALL count the number of members with the `administrador` role in the tenant. If the target member is the only administrator and the new role is not `administrador`, the function SHALL throw an `EquipoServiceError` with `code: 'last_admin'`.

#### Scenario: Role change succeeds for a non-last-admin member
- **WHEN** `cambiarRolMiembro` is called for a member who is not the sole administrator
- **THEN** the service SHALL update `miembros_tenant.rol_id` to the new role UUID and resolve without error

#### Scenario: Role change is blocked for the last administrator
- **WHEN** `cambiarRolMiembro` is called for the only member with `administrador` role in the tenant, and the new role is not `administrador`
- **THEN** the service SHALL throw an `EquipoServiceError` with `code: 'last_admin'` and SHALL NOT execute the UPDATE

#### Scenario: Role change to administrador is always allowed for the last admin
- **WHEN** `cambiarRolMiembro` is called for the only administrator but the new role is also `administrador`
- **THEN** the service SHALL allow the operation (no-op effectively, but not blocked)

#### Scenario: Member not found
- **WHEN** `cambiarRolMiembro` is called with a `miembro_id` that does not exist or does not belong to the specified tenant
- **THEN** the service SHALL throw an `EquipoServiceError` with `code: 'not_found'`

#### Scenario: RLS denies the update
- **WHEN** `cambiarRolMiembro` is called by a non-admin user (bypassing UI controls)
- **THEN** the database RLS policy SHALL reject the UPDATE and the service SHALL throw an `EquipoServiceError` with `code: 'forbidden'`

---

### Requirement: Hook SHALL expose roles list and role change mutation
`useEquipo` SHALL fetch the available roles via `getRoles()` on mount and expose them as `roles: RolOption[]`. It SHALL also expose `cambiarRol: (input: CambiarRolMiembroInput) => Promise<void>` and `isCambiandoRol: boolean`. On successful role change, the hook SHALL call `refresh()` to reload the member list.

#### Scenario: Roles are available after mount
- **WHEN** the `useEquipo` hook mounts
- **THEN** `roles` SHALL contain the three role options fetched from the service

#### Scenario: Successful role change refreshes the member list
- **WHEN** `cambiarRol` is called and the service resolves without error
- **THEN** the hook SHALL call `refresh()` to reload the member list and `isCambiandoRol` SHALL return to `false`

#### Scenario: Last-admin error is surfaced
- **WHEN** `cambiarRol` is called and the service throws with `code: 'last_admin'`
- **THEN** the hook SHALL propagate the error so the UI can display the specific last-admin message

#### Scenario: Loading flag is set during mutation
- **WHEN** `cambiarRol` is called
- **THEN** `isCambiandoRol` SHALL be `true` until the operation completes or fails

---

### Requirement: Confirmation dialog SHALL be shown before committing a role change
`CambiarRolModal` SHALL render a centered confirmation dialog when a role change is initiated. The dialog SHALL display the member's full name, their current role, and the selected new role. It SHALL include a Cancel button and a Confirm button.

#### Scenario: Modal displays role change details
- **WHEN** the admin selects a different role for a member in the table dropdown
- **THEN** the system SHALL open `CambiarRolModal` showing the member name, current role, and new role

#### Scenario: Admin confirms the role change
- **WHEN** the admin clicks the Confirm button in the modal
- **THEN** the system SHALL call the `cambiarRol` mutation and close the modal on success

#### Scenario: Admin cancels the role change
- **WHEN** the admin clicks Cancel or the backdrop overlay
- **THEN** the system SHALL close the modal without making any changes, and the dropdown SHALL revert to the original role value

#### Scenario: Loading state is shown during submission
- **WHEN** the role change is in progress
- **THEN** the Confirm button SHALL display a loading indicator and be disabled

---

### Requirement: Self-demotion warning SHALL be displayed when admin changes their own role
When the authenticated administrator is changing their **own** membership role away from `administrador`, the `CambiarRolModal` SHALL display a prominent amber warning banner with the text: _"Estás a punto de remover tus permisos de administrador. Si continúas, perderás acceso a las funciones de administración de esta organización."_

#### Scenario: Self-demotion warning is shown
- **WHEN** the admin selects a non-`administrador` role for their own membership row
- **THEN** the confirmation modal SHALL display the amber self-demotion warning banner

#### Scenario: Self-demotion warning is not shown for other members
- **WHEN** the admin selects a different role for another member's row
- **THEN** the confirmation modal SHALL NOT display the self-demotion warning banner

#### Scenario: Self-demotion is allowed after confirmation
- **WHEN** the admin confirms the role change despite the self-demotion warning
- **THEN** the system SHALL proceed with the role change normally

---

### Requirement: Last-admin guard SHALL block removal of the only administrator
When an admin attempts to change the role of the only `administrador` member in the tenant to a non-admin role, the system SHALL block the change and display the message: _"No se puede cambiar el rol del único administrador de la organización. Asigna otro administrador primero."_

#### Scenario: Last-admin role change is blocked in the UI
- **WHEN** `cambiarRol` returns a `last_admin` error
- **THEN** the system SHALL display the last-admin error message in the modal and SHALL NOT close the modal

#### Scenario: Multiple admins allow role change
- **WHEN** the tenant has more than one member with `administrador` role
- **THEN** changing any administrator's role to a non-admin role SHALL be allowed

---

### Requirement: Database migration SHALL add RLS policy for UPDATE on miembros_tenant
A migration SHALL create an RLS policy `miembros_tenant_update_rol_admin` on `public.miembros_tenant` for the `UPDATE` operation, restricted to `authenticated` users whose tenant is returned by `get_admin_tenants_for_authenticated_user()`. The migration SHALL also grant `UPDATE` permission on `public.miembros_tenant` to `authenticated` if not already granted.

#### Scenario: Admin can update miembros_tenant via RLS
- **WHEN** an authenticated administrator executes an UPDATE on `miembros_tenant` for a row in their tenant
- **THEN** the database SHALL allow the operation

#### Scenario: Non-admin update is rejected by RLS
- **WHEN** an authenticated user who is not an administrator executes an UPDATE on `miembros_tenant`
- **THEN** the database SHALL reject the operation with an RLS denial

#### Scenario: Cross-tenant update is rejected by RLS
- **WHEN** an administrator executes an UPDATE on `miembros_tenant` for a row in a tenant they do not administer
- **THEN** the database SHALL reject the operation with an RLS denial

---

## MODIFIED Requirements

### Requirement: Member table SHALL display required columns
The `EquipoTable` component SHALL render a table with the following columns in order: **Nombre** (full name), **Tipo ID**, **N° Identificación**, **Teléfono**, **Correo**, **Estado** (as a colour-coded badge), and **Perfil** (role display). The table SHALL include `<thead>` with `scope="col"` on every `<th>`. Nullable fields SHALL display `—` when empty.

When `roles` and `onCambiarRol` props are provided, the **Perfil** column SHALL render a `<select>` dropdown populated with the available roles, with the current role pre-selected. Selecting a different role SHALL call `onCambiarRol(row, selectedRolOption)`. When `roles` or `onCambiarRol` is not provided, the **Perfil** column SHALL fall back to displaying the static `rol_nombre` text.

#### Scenario: All columns are rendered for a complete member record
- **WHEN** a member has all fields populated
- **THEN** the system SHALL display full name, tipo ID, número de identificación, phone, email, status badge, and role name in the corresponding columns

#### Scenario: Nullable identification fields display em-dash
- **WHEN** a member's `tipo_identificacion` or `numero_identificacion` is null
- **THEN** the system SHALL render `—` in the respective column cell

#### Scenario: Role column renders a dropdown when roles prop is provided
- **WHEN** `EquipoTable` receives `roles` and `onCambiarRol` props
- **THEN** each row's Perfil cell SHALL render a `<select>` element with the three role options, and the current role SHALL be pre-selected

#### Scenario: Role column renders static text when roles prop is not provided
- **WHEN** `EquipoTable` does not receive a `roles` prop
- **THEN** each row's Perfil cell SHALL render the `rol_nombre` as static text

#### Scenario: Selecting a different role triggers the callback
- **WHEN** the admin selects a different option in the role `<select>` dropdown
- **THEN** the system SHALL call `onCambiarRol` with the row and the selected `RolOption`

#### Scenario: Role select has an accessible label
- **WHEN** the role `<select>` is rendered
- **THEN** it SHALL include an `aria-label` attribute (e.g., `"Cambiar rol"`)
