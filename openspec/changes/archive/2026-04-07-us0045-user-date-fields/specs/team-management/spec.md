## MODIFIED Requirements

### Requirement: System SHALL list all members of the tenant
`equipo.service.ts` SHALL query `public.v_miembros_equipo` (instead of `public.miembros_tenant` directly) filtered by `tenant_id`. The view returns a flat row shape with fields from `miembros_tenant`, `usuarios`, and `roles` already joined, plus an `inasistencias_recientes` integer computed by a lateral subquery. `RawMiembroRow` SHALL be a flat type matching the view's column set (no nested `usuarios` or `roles` sub-objects). `mapRawRow` SHALL read `estado` and `inasistencias_recientes` from the top-level row. The type SHALL also include `fecha_nacimiento: string | null` and `fecha_exp_identificacion: string | null` from the view. The result SHALL include every user who has an active membership record for that tenant, including the administrator themselves.

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

#### Scenario: Each member row includes date fields
- **WHEN** the member list is fetched
- **THEN** each `MiembroRow` SHALL include `fecha_nacimiento: string | null` and `fecha_exp_identificacion: string | null` sourced from `v_miembros_equipo`

---

### Requirement: Member table SHALL display required columns
The `EquipoTable` component SHALL render a table with the following columns in order: **Nombre** (full name), **Identificación** (grouped column showing tipo ID · número on one line and "Exp: {fecha_exp_identificacion}" below it; each part shows `—` when null), **Teléfono**, **Correo**, **RH**, **F. Nacimiento** (ISO date YYYY-MM-DD or `—`), **Estado** (as a colour-coded badge sourced from `miembros_tenant.estado` via `v_miembros_equipo`), **Fallas (30d)** (absence counter with colour coding), **Perfil** (role display), and **Acciones**. The table SHALL include `<thead>` with `scope="col"` on every `<th>`. Nullable fields SHALL display `—` when empty. The **Acciones** column SHALL always be rendered regardless of which action callbacks are provided.

The **Fallas (30d)** column SHALL render `inasistencias_recientes` with the following visual treatment:
- `0` → em-dash (`—`) in slate colour (neutral)
- `1–2` → amber badge (e.g., `bg-amber-900/30 text-amber-300`)
- `3+` → red badge (e.g., `bg-red-900/30 text-red-300`)

When `roles` and `onCambiarRol` props are provided, the **Perfil** column SHALL render a `<select>` dropdown populated with the available roles, with the current role pre-selected. Selecting a different role SHALL call `onCambiarRol(row, selectedRolOption)`. When `roles` or `onCambiarRol` is not provided, the **Perfil** column SHALL fall back to displaying the static `rol_nombre` text.

#### Scenario: All columns are rendered for a complete member record
- **WHEN** a member has all fields populated
- **THEN** the system SHALL display full name, grouped identification (tipo · número with exp date below), phone, email, RH, birth date, status badge, fallas counter, role name, and the Acciones cell

#### Scenario: Identification column shows grouped ID data
- **WHEN** a member has `tipo_identificacion = 'CC'`, `numero_identificacion = '12345678'`, and `fecha_exp_identificacion = '2020-03-15'`
- **THEN** the Identificación cell SHALL render "CC · 12345678" on the first line and "Exp: 2020-03-15" on a second smaller line

#### Scenario: Identification column shows em-dash for null parts
- **WHEN** a member's `tipo_identificacion` or `numero_identificacion` is null
- **THEN** those parts of the Identificación cell SHALL render `—`

#### Scenario: F. Nacimiento column shows ISO date when set
- **WHEN** a member's `fecha_nacimiento` is set
- **THEN** the F. Nacimiento column SHALL display the value in YYYY-MM-DD format

#### Scenario: F. Nacimiento column shows em-dash when null
- **WHEN** a member's `fecha_nacimiento` is null
- **THEN** the F. Nacimiento column SHALL display `—`

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

---

## ADDED Requirements

### Requirement: EditarPerfilMiembroModal SHALL pre-fill fecha_nacimiento and expose a fecha_exp_identificacion field
`EditarPerfilMiembroModal` SHALL initialise `fechaNacimiento` from `miembro.fecha_nacimiento` (converting `null` to `''`) when the modal opens. It SHALL also manage a `fechaExpIdentificacion` state variable initialised from `miembro.fecha_exp_identificacion` (converting `null` to `''`). The Document fieldset SHALL render a `<input type="date">` labelled **"Fecha expedición ID"** below the existing Tipo ID / N° Identificación row. Both date values SHALL be included in the `EditarPerfilMiembroInput` payload passed to `onSave`.

#### Scenario: fecha_nacimiento is pre-filled on open
- **WHEN** the admin opens EditarPerfilMiembroModal for a member with a non-null `fecha_nacimiento`
- **THEN** the birth date input SHALL display the stored ISO date value

#### Scenario: fecha_nacimiento is empty when null
- **WHEN** the admin opens EditarPerfilMiembroModal for a member with null `fecha_nacimiento`
- **THEN** the birth date input SHALL be empty (no value)

#### Scenario: fecha_exp_identificacion field is rendered in the Document section
- **WHEN** the admin opens EditarPerfilMiembroModal
- **THEN** the Document fieldset SHALL include a date input labelled "Fecha expedición ID"

#### Scenario: fecha_exp_identificacion is pre-filled on open
- **WHEN** the admin opens EditarPerfilMiembroModal for a member with a non-null `fecha_exp_identificacion`
- **THEN** the issue date input SHALL display the stored ISO date value

#### Scenario: fecha_exp_identificacion is saved correctly
- **WHEN** the admin sets a date in the issue date input and clicks Guardar
- **THEN** `onSave` SHALL be called with `fecha_exp_identificacion` set to the ISO date string

#### Scenario: fecha_exp_identificacion can be cleared
- **WHEN** the admin clears the issue date input and clicks Guardar
- **THEN** `onSave` SHALL be called with `fecha_exp_identificacion: null`
