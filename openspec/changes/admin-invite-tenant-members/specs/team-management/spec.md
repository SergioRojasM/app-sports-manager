## MODIFIED Requirements

### Requirement: Estado SHALL be displayed as a colour-coded badge
`EquipoStatusBadge` SHALL render a `<span>` element with an `aria-label` attribute and Tailwind colour classes that map each `estado` value to a distinct visual treatment:
- `activo` → emerald (green)
- `mora` → amber (yellow)
- `suspendido` → orange
- `inactivo` → slate (gray)
- `pendiente_activacion` → sky (blue), labelled "Pendiente de activación"

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

#### Scenario: Pending-activation member status badge is sky
- **WHEN** a member's `estado` is `pendiente_activacion`
- **THEN** the system SHALL render the badge with sky colour classes and the label "Pendiente de activación"

---

### Requirement: Quick-filter chips SHALL filter members by estado
`EquipoHeaderFilters` SHALL render a row of filter chips: **Todos**, **Activo**, **Mora**, **Suspendido**, **Inactivo**, **Pendiente de activación**. Selecting a chip SHALL update `estadoFilter` in `useEquipo`, which SHALL filter `filteredMembers` accordingly. The active chip SHALL have a distinct visual treatment.

#### Scenario: Selecting an estado chip filters the table
- **WHEN** the administrator clicks the **Activo** chip
- **THEN** the system SHALL display only members whose `estado` is `activo`

#### Scenario: Selecting Todos chip removes estado filter
- **WHEN** the administrator clicks the **Todos** chip
- **THEN** the system SHALL display all members regardless of their `estado`

#### Scenario: Active chip is visually distinguished
- **WHEN** a chip is selected
- **THEN** the system SHALL render that chip with an accent border or background to indicate it is active

#### Scenario: Selecting Pendiente de activación chip filters pending members
- **WHEN** the administrator clicks the **Pendiente de activación** chip
- **THEN** the system SHALL display only members whose `estado` is `pendiente_activacion`

## ADDED Requirements

### Requirement: EquipoPage SHALL render a fourth "Invitaciones" tab
`EquipoPage` SHALL extend its `ActiveTab` union type to include `'invitaciones'`. The tab bar SHALL render an **"Invitaciones"** button after "Bloqueados", using the same button classes, with a turquoise count badge of active invitations that is hidden when the count is zero. When `activeTab === 'invitaciones'`, the system SHALL render `InvitacionesTab`.

#### Scenario: Invitaciones tab button is visible to administrators
- **WHEN** an administrator opens the team management page
- **THEN** the tab bar SHALL display four buttons: "Equipo", "Solicitudes", "Bloqueados", and "Invitaciones"

#### Scenario: Clicking Invitaciones tab renders the invitations panel
- **WHEN** an administrator clicks the "Invitaciones" tab
- **THEN** `activeTab` SHALL become `'invitaciones'` and the system SHALL render `InvitacionesTab`

---

### Requirement: EquipoPage SHALL expose an "Agregar miembro" action
`EquipoPage` SHALL render an **"Agregar miembro"** button with the `person_add` material symbol, styled like "Configurar Suspensión", in the Equipo tab action row to the left of "Configurar Suspensión", and at the top of the Invitaciones tab. Clicking it SHALL open `AgregarMiembroModal`. After a successful invitation the page SHALL refresh the invitations list. After a successful provisioning it SHALL open `ContrasenaTemporalModal` and refresh the member list.

#### Scenario: Button opens the modal
- **WHEN** the administrator clicks "Agregar miembro"
- **THEN** `AgregarMiembroModal` SHALL open

#### Scenario: Provisioning shows the password modal and refreshes members
- **WHEN** a temporary-password account is created successfully
- **THEN** `ContrasenaTemporalModal` SHALL open and the Equipo list SHALL include the new member with the "Pendiente de activación" badge
