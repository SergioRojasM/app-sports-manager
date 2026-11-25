# Spec Delta

## MODIFIED Requirements

### Requirement: Notificaciones automáticas card
The `gestion-organizacion` page SHALL render `<TenantReglasNotificacionCard tenantId={tenantId} />` as a settings section titled "Notificaciones automáticas", full width below the row that holds `TenantPaymentMethodsCard` and `TenantReglasSuspensionCard`, listing the tenant's expiry notification rules.

#### Scenario: Empty state
- **WHEN** an administrator opens "Gestión de organización" for a tenant without rules
- **THEN** the card SHALL show the empty state and an enabled "Agregar" button

#### Scenario: Rules grouped and ordered
- **WHEN** the tenant has `vencimiento_pre` rules of 7 and 1 days and a `vencimiento_pos` rule of 3 days
- **THEN** the timeline SHALL list "7 días antes del vencimiento", then "1 día antes del vencimiento", then "3 días después del vencimiento"

#### Scenario: Row details
- **WHEN** a rule is for `todos`, email only and inactive
- **THEN** its tile SHALL show "Administradores y atletas", the "Email" tag and a switch reporting `aria-checked="false"`

#### Scenario: Delete with confirmation
- **WHEN** the administrator activates "Eliminar" and confirms
- **THEN** the rule SHALL be deleted and removed from the list; cancelling the dialog SHALL delete nothing

#### Scenario: Add disabled at the limit
- **WHEN** both types have 3 rules
- **THEN** "Agregar" SHALL be disabled and the hint "Máximo 3 reglas por tipo" SHALL be available

#### Scenario: Not reachable by other roles
- **WHEN** a trainer or athlete requests the `gestion-organizacion` route
- **THEN** the `(administrador)` layout guard SHALL redirect them and the card SHALL not render

## ADDED Requirements

### Requirement: Notification rules section header and limit
The "Notificaciones automáticas" section SHALL show the subtitle "Avisa a tus atletas y administradores antes y después de que venza una suscripción." and an "Agregar" button. The button SHALL be disabled, with the hint "Máximo 3 reglas por tipo", when both rule types already have 3 rules.

#### Scenario: Header content
- **WHEN** an administrator opens the section
- **THEN** it SHALL show the title, the subtitle and the "Agregar" button

#### Scenario: One type still has room
- **WHEN** `vencimiento_pre` has 3 rules and `vencimiento_pos` has 1
- **THEN** "Agregar" SHALL stay enabled

### Requirement: Notification rules timeline order
Rules SHALL be rendered as a chronological timeline exposed to assistive technology as an ordered list: `vencimiento_pre` rules first, ordered by `dias` descending, then `vencimiento_pos` rules ordered by `dias` ascending.

#### Scenario: Ordered list semantics
- **WHEN** the tenant has two rules
- **THEN** the timeline SHALL be an `ol` whose items follow the chronological order

#### Scenario: Only after-expiry rules
- **WHEN** the tenant only has `vencimiento_pos` rules of 5 and 2 days
- **THEN** the timeline SHALL list "2 días después del vencimiento" then "5 días después del vencimiento"

### Requirement: Notification rule tile content
Each rule tile SHALL show the offset as a big value ("{N} días" or "1 día") with the caption "antes del vencimiento" or "después del vencimiento", the recipients label ("Solo atletas", "Solo administradores" or "Administradores y atletas"), the channel tags ("En la plataforma" and/or "Email"), an active switch, and "Editar" and "Eliminar" actions with accessible names.

#### Scenario: Single day
- **WHEN** a rule has `dias = 1` and type `vencimiento_pre`
- **THEN** its tile SHALL show "1 día" and "antes del vencimiento"

#### Scenario: Both channels
- **WHEN** a rule has `canal_in_app` and `canal_email`
- **THEN** its tile SHALL show the "En la plataforma" and "Email" tags

#### Scenario: Named actions
- **WHEN** the tiles render
- **THEN** each "Editar" and "Eliminar" action SHALL have an accessible name that includes the rule description

### Requirement: Notification rule deletion requires confirmation
"Eliminar" on a rule tile SHALL ask for confirmation in a dialog before deleting the rule.

#### Scenario: Dialog opens
- **WHEN** the administrator activates "Eliminar" on a rule
- **THEN** a confirmation dialog naming the rule SHALL open and nothing SHALL be deleted yet

### Requirement: Notification rules section states and footnote
The section SHALL show a loading indicator while fetching, an inline `role="alert"` error with "Reintentar" when loading fails, the empty state "Aún no hay reglas. Sin reglas no se envían avisos de vencimiento." when there are no rules, and the footnote "Los avisos se envían cada día a las 8:00 a. m. (hora de Bogotá)."

#### Scenario: Load error
- **WHEN** loading the rules fails
- **THEN** the section SHALL show the error with a "Reintentar" action that reloads the rules

#### Scenario: Footnote
- **WHEN** the section renders
- **THEN** it SHALL show the sending-hour footnote

### Requirement: Notification rule active switch
Each notification rule tile SHALL expose a switch named "Activar aviso {descripción}" that persists `activo` immediately, keeping the rule's other fields unchanged. A failed update SHALL restore the previous state and show an error.

#### Scenario: Pause a rule
- **WHEN** the administrator turns off the switch of an active rule
- **THEN** the rule SHALL be saved with `activo = false` and its other fields unchanged

#### Scenario: Update fails
- **WHEN** the update request fails
- **THEN** the switch SHALL return to its previous state and an inline alert SHALL explain that the change was not saved
