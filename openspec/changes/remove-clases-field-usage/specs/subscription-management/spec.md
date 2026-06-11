## MODIFIED Requirements

### Requirement: Subscription list with joined athlete, plan, and payment data
The system SHALL fetch all subscriptions belonging to the active tenant in a single joined query that includes the athlete's name and email (from `usuarios`), the plan name (from `planes`), the plan_tipo name and `vigencia_dias` (from `plan_tipos`), and the latest payment record (from `pagos`) for each subscription. The query SHALL NOT select `plan_tipos.clases_incluidas`, `suscripciones.clases_restantes`, or `suscripciones.clases_plan`. The result SHALL be displayed in a tabular layout.

#### Scenario: Subscriptions are loaded on page mount
- **WHEN** an administrator lands on the subscription management page
- **THEN** the system SHALL display all tenant subscriptions with the following columns: athlete name, athlete email, plan name, subscription status badge, start date, end date, payment status badge, payment method, payment amount, and request date. The table SHALL NOT include a "Clases" column.

#### Scenario: Page shows loading state while fetching
- **WHEN** the initial data fetch is in progress
- **THEN** the system SHALL display a loading indicator and MUST NOT render stale or partial rows

#### Scenario: Empty state when no subscriptions exist
- **WHEN** the tenant has no subscription records
- **THEN** the system SHALL display an empty state message and SHALL NOT show the table

#### Scenario: Subscription table does not show classes column
- **WHEN** an administrator views the loaded subscription table
- **THEN** there SHALL be no column header or cell displaying `clases_restantes` or `clases_plan` data

### Requirement: Validate subscription action
Each subscription row SHALL expose a "Validate Subscription" action that opens a modal pre-populated with computed approval defaults that the administrator MAY override before confirming. The `fecha_fin` default SHALL be calculated as `fecha_inicio + plan_tipo.vigencia_dias` days (using addDays), not months. The modal SHALL NOT include a `clases_restantes` field. The modal SHALL NOT reference plan-level `vigencia_meses` or `clases_incluidas`.

#### Scenario: Modal opens with pre-computed default values
- **WHEN** an administrator clicks "Validate Subscription" for a row
- **THEN** the system SHALL open a modal pre-populating `fecha_inicio` with today's date (if currently null) and `fecha_fin` calculated as `fecha_inicio + plan_tipo.vigencia_dias` days; both fields SHALL be editable by the administrator before submission

#### Scenario: Administrator approves a subscription
- **WHEN** the administrator confirms approval with the (optionally adjusted) values
- **THEN** the system SHALL update `suscripciones.estado = 'activa'`, persist the confirmed `fecha_inicio` and `fecha_fin` values, and refresh the table row to reflect the new state. The update payload SHALL NOT include `clases_restantes`.

#### Scenario: Administrator cancels a subscription
- **WHEN** the administrator confirms cancellation in the validate subscription modal
- **THEN** the system SHALL update `suscripciones.estado = 'cancelada'` and refresh the table row to reflect the new state

#### Scenario: Modal closes without action on dismiss
- **WHEN** the administrator closes the modal without submitting
- **THEN** the system SHALL not modify any database records

#### Scenario: fecha_fin uses plan_tipo vigencia_dias in days
- **WHEN** the modal computes the default `fecha_fin`
- **THEN** the system SHALL use `addDays(fecha_inicio, plan_tipo_vigencia_dias)` and SHALL NOT use `addMonths` with plan-level `vigencia_meses`

#### Scenario: Modal does not show clases_restantes input
- **WHEN** the validate subscription modal opens
- **THEN** there SHALL be no `clases_restantes` number input rendered in the modal

### Requirement: Admin can edit all fields of an existing subscription
The system SHALL allow an authenticated user with `administrador` role to edit any field of an existing tenant subscription through a right-side modal form (`EditarSuscripcionModal`). The editable fields are `plan_id`, `estado`, `fecha_inicio`, `fecha_fin`, and `comentarios`. The fields `clases_restantes` and `clases_plan` SHALL NOT be included in the edit form. On successful save the modal SHALL close and the subscription table SHALL refresh to reflect the updated values.

#### Scenario: Editar button is present for every row regardless of status
- **WHEN** an administrator views the subscription table
- **THEN** each row SHALL display an "Editar" action button regardless of the subscription's `estado`

#### Scenario: Modal opens pre-populated with current subscription values
- **WHEN** an administrator clicks "Editar" for a subscription row
- **THEN** the system SHALL open `EditarSuscripcionModal` with editable fields pre-populated; the form SHALL NOT include `clases_restantes` or `clases_plan` inputs

#### Scenario: Plan selector loads active plans for the tenant
- **WHEN** `EditarSuscripcionModal` opens
- **THEN** the `plan_id` select field SHALL be populated with the list of active plans for the current tenant

#### Scenario: Date validation prevents invalid ranges
- **WHEN** the administrator submits the edit form with `fecha_fin` earlier than or equal to `fecha_inicio` (both non-null)
- **THEN** the system SHALL display an inline validation error and SHALL NOT submit the request

#### Scenario: Successful edit does not write clases_restantes or clases_plan
- **WHEN** the administrator submits valid values in `EditarSuscripcionModal`
- **THEN** the update payload sent to `public.suscripciones` SHALL NOT include `clases_restantes` or `clases_plan`

### Requirement: Admin creates subscription without class-count fields
The system SHALL allow administrators to create subscriptions through `CrearSuscripcionModal` without specifying or displaying `clases_restantes` or `clases_plan`. The plan_tipo option labels in the modal SHALL NOT include a `· N clases` suffix. The creation payload sent to `public.suscripciones` SHALL NOT include `clases_plan` or `clases_restantes`.

#### Scenario: Plan tipo option does not show class count
- **WHEN** an administrator selects a plan_tipo in `CrearSuscripcionModal`
- **THEN** the plan_tipo option label SHALL display only the tipo name and price/validity information, with no class-count suffix

#### Scenario: Creation payload omits class-count fields
- **WHEN** an administrator confirms subscription creation
- **THEN** the insert payload to `public.suscripciones` SHALL NOT include `clases_plan` or `clases_restantes`
