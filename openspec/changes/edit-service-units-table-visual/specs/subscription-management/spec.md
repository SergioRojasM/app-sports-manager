## MODIFIED Requirements

### Requirement: Admin can edit all fields of an existing subscription
The system SHALL allow an authenticated user with `administrador` role to edit any field of an existing tenant subscription through a modal form (`EditarSuscripcionModal`). The editable fields are `plan_id`, `estado`, `fecha_inicio`, `fecha_fin`, `comentarios`, and — when the subscription has associated `suscripcion_servicios` rows — the `unidades_restantes` per service. On successful save the modal SHALL close and the subscription table SHALL refresh to reflect the updated values.

#### Scenario: Editar button is present for every row regardless of status
- **WHEN** an administrator views the subscription table
- **THEN** each row SHALL display an editar action (icon button) regardless of the subscription's `estado`

#### Scenario: Modal opens pre-populated with current subscription values
- **WHEN** an administrator clicks the editar icon for a subscription row
- **THEN** the system SHALL open `EditarSuscripcionModal` with all editable fields pre-populated with the subscription's current values, including the current `unidades_restantes` for each associated service

#### Scenario: Plan selector loads active plans for the tenant
- **WHEN** `EditarSuscripcionModal` opens
- **THEN** the `plan_id` select field SHALL be populated with the list of active plans for the current tenant

#### Scenario: Date validation prevents invalid ranges
- **WHEN** the administrator submits the edit form with `fecha_fin` earlier than or equal to `fecha_inicio` (both non-null)
- **THEN** the system SHALL display an inline validation error and SHALL NOT submit the request

#### Scenario: Successful edit closes modal and refreshes table
- **WHEN** the administrator submits valid values in `EditarSuscripcionModal`
- **THEN** the system SHALL call `editarSuscripcion` and any changed service unit RPCs, close the modal on success, and trigger a table refresh

#### Scenario: Service error is displayed inline
- **WHEN** any service call (subscription or service units) fails
- **THEN** the system SHALL display the error message inline in the modal and SHALL NOT close it

#### Scenario: Submit button is disabled while submission is in progress
- **WHEN** the administrator submits `EditarSuscripcionModal` and the request is pending
- **THEN** all action buttons and inputs in the modal SHALL be disabled to prevent double-submit

---

## ADDED Requirements

### Requirement: ATLETA column is compact with truncation
The ATLETA column in `SuscripcionesTable` SHALL use reduced horizontal padding (`px-2`) and a maximum width of `max-w-[130px]`. Both the athlete's name and email SHALL be truncated with an ellipsis when they overflow the column width. The full value SHALL be accessible via the cell's `title` attribute.

#### Scenario: Long athlete name is truncated
- **WHEN** an athlete's full name exceeds the column width
- **THEN** the name SHALL be visually truncated with an ellipsis and the full name SHALL be available on hover via the `title` attribute

#### Scenario: Short athlete name is displayed fully
- **WHEN** an athlete's full name fits within `max-w-[130px]`
- **THEN** the full name SHALL be displayed without truncation

---

### Requirement: PLAN column is compact with truncation
The PLAN column in `SuscripcionesTable` SHALL use reduced horizontal padding (`px-2`) and a maximum width of `max-w-[110px]`. The plan name SHALL be truncated with an ellipsis when it overflows.

#### Scenario: Long plan name is truncated
- **WHEN** a plan name exceeds the column width
- **THEN** the name SHALL be visually truncated with an ellipsis

---

### Requirement: INICIO/FIN dates are the same text size
Both `fecha_inicio` and `fecha_fin` in the date cell SHALL be rendered at `text-xs` size. `fecha_inicio` SHALL use `text-slate-300` and `fecha_fin` SHALL use `text-slate-400`. Neither date SHALL use the default body `text-sm` size.

#### Scenario: Both dates render at identical text size
- **WHEN** a subscription row has both `fecha_inicio` and `fecha_fin` populated
- **THEN** both date strings SHALL be displayed at the same `text-xs` font size, with `fecha_inicio` in `text-slate-300` and `fecha_fin` in `text-slate-400`

#### Scenario: Missing date shows dash placeholder
- **WHEN** either `fecha_inicio` or `fecha_fin` is null
- **THEN** the cell SHALL display "—" in place of a date at the same `text-xs` size

---

### Requirement: SERVICIOS column shows at most 2 services, finite-unit first, with overflow button
The SERVICIOS column in `SuscripcionesTable` SHALL have a minimum width of `min-w-[180px]`. Services SHALL be sorted so entries with a finite `unidades_incluidas` (not null) appear before entries with `unidades_incluidas = null` (unlimited). At most 2 service entries SHALL be displayed. When additional services exist beyond the 2 shown, a `<button>` element reading "+X más" SHALL be rendered; clicking it SHALL call `onVerServicios(row)`, opening `VerServiciosModal`. A plain text element or non-interactive `<li>` SHALL NOT be used for the overflow indicator.

#### Scenario: Subscriptions with 2 or fewer services show all entries
- **WHEN** a subscription row has 1 or 2 services
- **THEN** all services SHALL be displayed with no overflow button

#### Scenario: Subscriptions with 3 or more services show first 2 and an overflow button
- **WHEN** a subscription row has 3 or more services
- **THEN** exactly 2 services SHALL be visible and a "+X más" button SHALL be rendered where X equals the remaining count

#### Scenario: Finite-unit services appear before unlimited services
- **WHEN** a subscription has both finite-unit and unlimited services
- **THEN** services with `unidades_incluidas !== null` SHALL appear before those with `unidades_incluidas = null` in the displayed list

#### Scenario: Overflow button opens VerServiciosModal
- **WHEN** an administrator clicks the "+X más" button on a subscription row
- **THEN** `VerServiciosModal` SHALL open displaying all services for that subscription

---

### Requirement: VerServiciosModal lists all services for a subscription
The system SHALL provide a `VerServiciosModal` component that renders a read-only list of all services in `row.servicios`. Services SHALL be sorted finite-unit first. Each row SHALL display the service name, `unidades_restantes ?? '∞'`, and `unidades_incluidas ?? '∞'`. The modal SHALL be dismissible via the Escape key or backdrop click.

#### Scenario: Modal displays all services sorted finite-unit first
- **WHEN** `VerServiciosModal` opens for a subscription with multiple services
- **THEN** all services SHALL be listed with finite-unit services appearing first, and each row SHALL show the service name, remaining units, and included units

#### Scenario: Modal dismisses on Escape key
- **WHEN** the admin presses Escape while `VerServiciosModal` is open
- **THEN** the modal SHALL close without any data mutation

#### Scenario: Modal dismisses on backdrop click
- **WHEN** the admin clicks outside the modal panel
- **THEN** the modal SHALL close without any data mutation

---

### Requirement: VALIDACIÓN column shows both validator names at the same small size
Both the subscription validator name (`validado_por_nombre`) and the payment validator name (`pago.validado_por_nombre`) in the VALIDACIÓN column SHALL be rendered at `text-xs text-slate-400`. Neither name SHALL use a larger base text size.

#### Scenario: Both validators are shown at the same size
- **WHEN** a subscription row has both a subscription validator and a payment validator
- **THEN** both names SHALL be displayed at `text-xs text-slate-400`

#### Scenario: Single validator shows one name at small size
- **WHEN** a subscription row has only one of the two validators set
- **THEN** the available name SHALL be displayed at `text-xs text-slate-400`

---

### Requirement: ACCIONES column uses inline SVG icon buttons with tooltips
All action buttons in the ACCIONES column SHALL be rendered as icon-only buttons using inline SVG paths (16×16 viewBox). Each button SHALL have a `title` attribute and an `aria-label` attribute describing the action. Text labels SHALL NOT be used. The conditional rendering logic (e.g. only show "Validar Pago" when `pago.estado === 'pendiente'`) SHALL remain unchanged.

#### Scenario: Icon buttons are rendered without visible text labels
- **WHEN** an administrator views the subscription table ACCIONES column
- **THEN** each action SHALL be represented by an SVG icon with no visible text; the button dimensions SHALL be small and uniform

#### Scenario: Hovering an icon button reveals a tooltip
- **WHEN** an administrator hovers over any action icon button
- **THEN** the browser SHALL display the action description via the `title` attribute (e.g. "Ver pago", "Validar pago", "Editar", "Eliminar")

#### Scenario: Conditional actions remain conditionally rendered
- **WHEN** a subscription row has `pago === null`
- **THEN** no payment-related icon buttons SHALL be rendered for that row

#### Scenario: Screen readers announce the action label
- **WHEN** a screen reader focuses on an action icon button
- **THEN** the `aria-label` attribute SHALL be announced, matching the `title` text
