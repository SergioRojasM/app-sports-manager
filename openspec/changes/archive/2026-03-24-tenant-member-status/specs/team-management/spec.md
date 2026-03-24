## MODIFIED Requirements

### Requirement: System SHALL list all members of the tenant
`equipo.service.ts` SHALL query `public.v_miembros_equipo` (instead of `public.miembros_tenant` directly) filtered by `tenant_id`. The view returns a flat row shape with fields from `miembros_tenant`, `usuarios`, and `roles` already joined, plus an `inasistencias_recientes` integer computed by a lateral subquery. `RawMiembroRow` SHALL be a flat type matching the view's column set (no nested `usuarios` or `roles` sub-objects). `mapRawRow` SHALL read `estado` and `inasistencias_recientes` from the top-level row. The result SHALL include every user who has an active membership record for that tenant, including the administrator themselves.

#### Scenario: Members are loaded on page mount
- **WHEN** an administrator navigates to the team management page for a tenant
- **THEN** the system SHALL fetch and display all members belonging to that tenant

#### Scenario: Empty tenant returns empty state
- **WHEN** a tenant has no member records in `miembros_tenant`
- **THEN** the system SHALL display an empty state message instead of the table

#### Scenario: Service error is surfaced to the user
- **WHEN** the Supabase query fails (e.g., network error or RLS denial)
- **THEN** the system SHALL display an error message with a retry button

#### Scenario: Each member row includes inasistencias_recientes
- **WHEN** the member list is fetched
- **THEN** each `MiembroRow` SHALL include an `inasistencias_recientes: number` field (defaults to `0` if null)

---

### Requirement: Member table SHALL display required columns
The `EquipoTable` component SHALL render a table with the following columns in order: **Nombre** (full name), **Tipo ID**, **N° Identificación**, **Teléfono**, **Correo**, **Estado** (as a colour-coded badge sourced from `miembros_tenant.estado` via `v_miembros_equipo`), **Fallas (30d)** (absence counter with colour coding), **Perfil** (role name), and **Acciones**. The table SHALL include `<thead>` with `scope="col"` on every `<th>`. Nullable fields SHALL display `—` when empty. The **Acciones** column SHALL always be rendered regardless of which action callbacks are provided.

The **Fallas (30d)** column SHALL render `inasistencias_recientes` with the following visual treatment:
- `0` → em-dash (`—`) in slate colour (neutral)
- `1–2` → amber badge (e.g., `bg-amber-900/30 text-amber-300`)
- `3+` → red badge (e.g., `bg-red-900/30 text-red-300`)

#### Scenario: All columns are rendered for a complete member record
- **WHEN** a member has all fields populated
- **THEN** the system SHALL display full name, tipo ID, número de identificación, phone, email, status badge, fallas counter, role name, and the Acciones cell in the corresponding columns

#### Scenario: Nullable identification fields display em-dash
- **WHEN** a member's `tipo_identificacion` or `numero_identificacion` is null
- **THEN** the system SHALL render `—` in the respective column cell

#### Scenario: Fallas column shows dash for zero absences
- **WHEN** `inasistencias_recientes` is `0`
- **THEN** the cell SHALL display `—` in a neutral slate colour

#### Scenario: Fallas column shows amber badge for 1-2 absences
- **WHEN** `inasistencias_recientes` is `1` or `2`
- **THEN** the cell SHALL display the count in an amber badge

#### Scenario: Fallas column shows red badge for 3 or more absences
- **WHEN** `inasistencias_recientes` is `3` or greater
- **THEN** the cell SHALL display the count in a red badge

#### Scenario: Estado column reflects miembros_tenant.estado
- **WHEN** a member's `miembros_tenant.estado` is `'mora'` and `usuarios.estado` is `'activo'`
- **THEN** the Estado cell SHALL display the `'mora'` badge, not the `'activo'` badge

#### Scenario: Acciones column header is always present
- **WHEN** the `EquipoTable` renders
- **THEN** the system SHALL always include an **Acciones** `<th>` as the last column, regardless of which callback props are provided

---

### Requirement: Acciones column SHALL render up to six icon buttons per row
Each row in `EquipoTable` SHALL render the following icon buttons (using `material-symbols-outlined`) in the Acciones cell, each conditionally rendered based on whether its callback prop is provided:
1. **Edit Profile** (`edit` icon) — calls `onEditarPerfil(row)`. `hover:text-turquoise`.
2. **Assign Level** (`military_tech` icon) — calls `onAsignarNivel(row.usuario_id)`. `hover:text-turquoise`.
3. **Change Status** (`swap_horiz` or `label` icon) — calls `onCambiarEstado(row)`. `hover:text-turquoise`. Visible to admins only.
4. **View Novedades** (`history` icon) — calls `onVerNovedades(row)`. `hover:text-turquoise`. Visible to admins only.
5. **Remove from Team** (`person_remove` icon) — calls `onEliminar(row)`. `hover:text-rose-400`.
6. **Block from Team** (`block` icon) — calls `onBloquear(row)`. `hover:text-amber-400`.

Each button SHALL include a `title` attribute describing its action for accessibility.

#### Scenario: Admin sees Cambiar Estado button for each member
- **WHEN** an authenticated administrator views the team management table and `onCambiarEstado` prop is provided
- **THEN** each row SHALL display the "Cambiar Estado" icon button in the actions column

#### Scenario: Admin sees Ver Novedades button for each member
- **WHEN** an authenticated administrator views the team management table and `onVerNovedades` prop is provided
- **THEN** each row SHALL display the "Ver Novedades" icon button in the actions column

#### Scenario: Clicking Cambiar Estado opens CambiarEstadoModal for the correct member
- **WHEN** an administrator clicks the "Cambiar Estado" button on a member row
- **THEN** the system SHALL call `onCambiarEstado` with that row's `MiembroTableItem` data

#### Scenario: Clicking Ver Novedades opens NovedadesMiembroModal for the correct member
- **WHEN** an administrator clicks the "Ver Novedades" button on a member row
- **THEN** the system SHALL call `onVerNovedades` with that row's `MiembroTableItem` data

#### Scenario: Existing action buttons are unaffected
- **WHEN** the new action buttons are added to the table
- **THEN** all existing row action buttons (edit, assign level, remove, block) SHALL continue to function without regression

---

## ADDED Requirements

### Requirement: EquipoPage SHALL wire CambiarEstadoModal and NovedadesMiembroModal
`EquipoPage` SHALL manage two additional state variables: `cambiarEstadoTarget: MiembroTableItem | null` (default `null`) and `novedadesTarget: MiembroTableItem | null` (default `null`). It SHALL pass `onCambiarEstado` and `onVerNovedades` callbacks to `EquipoTable`. It SHALL render `<CambiarEstadoModal>` and `<NovedadesMiembroModal>` controlled by those state variables. On a successful status change, a success toast SHALL be shown and the equipo list SHALL be refreshed.

#### Scenario: Clicking Cambiar Estado opens the modal for the target member
- **WHEN** an administrator clicks "Cambiar Estado" on a member row
- **THEN** `cambiarEstadoTarget` SHALL be set to that member and `CambiarEstadoModal` SHALL render

#### Scenario: Closing CambiarEstadoModal resets cambiarEstadoTarget
- **WHEN** the administrator closes `CambiarEstadoModal` without confirming
- **THEN** `cambiarEstadoTarget` SHALL be reset to `null` and the modal SHALL be removed from the DOM

#### Scenario: Successful status change shows success toast and refreshes list
- **WHEN** a status change is confirmed in `CambiarEstadoModal`
- **THEN** a success toast SHALL be displayed and the equipo member list SHALL reload with the updated estado

#### Scenario: Clicking Ver Novedades opens the history modal for the target member
- **WHEN** an administrator clicks "Ver Novedades" on a member row
- **THEN** `novedadesTarget` SHALL be set to that member and `NovedadesMiembroModal` SHALL render

#### Scenario: Closing NovedadesMiembroModal resets novedadesTarget
- **WHEN** the administrator closes `NovedadesMiembroModal`
- **THEN** `novedadesTarget` SHALL be reset to `null` and the modal SHALL be removed from the DOM
