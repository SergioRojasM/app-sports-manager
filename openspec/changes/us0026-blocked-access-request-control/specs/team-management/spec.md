## ADDED Requirements

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
