# Spec Delta

## MODIFIED Requirements

### Requirement: TenantReglasSuspensionCard renders the suspension rules list
`src/components/portal/tenant/TenantReglasSuspensionCard.tsx` SHALL render a settings section titled "Reglas de suspensión" that loads the tenant's rules with `useReglasSuspension(tenantId)` and lists them, showing a loading state while fetching and "Aún no hay reglas configuradas" when there are none.

#### Scenario: Empty state is shown when no rules exist
- **WHEN** a tenant has no suspension rules and admin opens the card
- **THEN** the card SHALL display "Aún no hay reglas configuradas" and the suggested rule with its "Usar" action

#### Scenario: Add button is disabled at 3 rules
- **WHEN** a tenant already has 3 suspension rules
- **THEN** the Agregar button SHALL have `disabled` attribute and `aria-disabled="true"` and show tooltip "Máximo 3 reglas por organización"

#### Scenario: Non-admin does not see action buttons
- **WHEN** a non-admin user views the card
- **THEN** add, edit, and delete buttons SHALL NOT be rendered

#### Scenario: duracion 0 renders as Permanente
- **WHEN** a rule has `duracion = 0`
- **THEN** the row SHALL display "Permanente" for the duration column

#### Scenario: por_dias_atras 0 renders as No aplica
- **WHEN** a rule has `por_dias_atras = 0`
- **THEN** the row SHALL display "No aplica" for the days-window column

## ADDED Requirements

### Requirement: Suspension rules section header and limit
The section SHALL show the subtitle "Automatiza suspensiones por inasistencia." and an "Agregar" button, disabled with `aria-disabled="true"` and the hint "Máximo 3 reglas por organización" when the tenant has 3 or more rules.

#### Scenario: Below the limit
- **WHEN** a tenant has 2 suspension rules
- **THEN** the "Agregar" button SHALL be enabled

### Requirement: Suspension rule row content
Each rule row SHALL show `nombre`, `num_inasistencias`, the condition dimension (subscription and/or days window), the `duracion` display (0 → "Permanente") and an "Activa" / "Inactiva" tag.

#### Scenario: Row with a days window
- **WHEN** a rule has 2 absences, `por_suscripcion = false`, `por_dias_atras = 30` and `duracion = 5`
- **THEN** its row SHALL read "2 inasistencias · Últimos 30 días · 5 días"

#### Scenario: Inactive rule
- **WHEN** a rule has `activo = false`
- **THEN** its row SHALL show the "Inactiva" tag

### Requirement: Suspension rule actions are admin-only and named
Each row SHALL offer edit and delete actions whose accessible names include the rule name, and add / edit / delete controls SHALL NOT be rendered for non-admin users.

#### Scenario: Named actions
- **WHEN** an administrator views a rule named "Regla ADIDAS"
- **THEN** its actions SHALL be named "Editar Regla ADIDAS" and "Eliminar Regla ADIDAS"

### Requirement: Suggested suspension rule
When the tenant has no suspension rules, the empty state SHALL offer the suggestion "Sugerida: suspender tras 3 inasistencias seguidas" with a "Usar" action that opens the create drawer prefilled, without saving anything until the administrator submits.

#### Scenario: Suggested rule prefills the form
- **WHEN** the administrator activates "Usar" on the suggested rule
- **THEN** the create drawer SHALL open with `num_inasistencias = 3` and a suggested name prefilled, and nothing SHALL be saved until the administrator submits
