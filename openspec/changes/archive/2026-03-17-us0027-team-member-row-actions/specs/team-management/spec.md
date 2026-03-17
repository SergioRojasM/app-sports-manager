## MODIFIED Requirements

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

## ADDED Requirements

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
