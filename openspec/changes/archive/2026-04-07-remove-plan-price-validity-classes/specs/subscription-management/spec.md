## MODIFIED Requirements

### Requirement: Subscription list with joined athlete, plan, and payment data
The system SHALL fetch all subscriptions belonging to the active tenant in a single joined query that includes the athlete's name and email (from `usuarios`), the plan name (from `planes`), the plan_tipo name, `vigencia_dias`, and `clases_incluidas` (from `plan_tipos`), and the latest payment record (from `pagos`) for each subscription. The join on `planes` SHALL NOT select `vigencia_meses` or `clases_incluidas` — these fields no longer exist on the `planes` table. The result SHALL be displayed in a tabular layout.

#### Scenario: Subscriptions are loaded on page mount
- **WHEN** an administrator lands on the subscription management page
- **THEN** the system SHALL display all tenant subscriptions with the following columns: athlete name, athlete email, plan name, subscription status badge, start date, end date, classes remaining, payment status badge, payment method, payment amount, and request date

#### Scenario: Page shows loading state while fetching
- **WHEN** the initial data fetch is in progress
- **THEN** the system SHALL display a loading indicator and MUST NOT render stale or partial rows

#### Scenario: Empty state when no subscriptions exist
- **WHEN** the tenant has no subscription records
- **THEN** the system SHALL display an empty state message and SHALL NOT show the table

#### Scenario: Error state on fetch failure
- **WHEN** the data fetch fails (e.g., network error or RLS denial)
- **THEN** the system SHALL display an error message with a retry action

### Requirement: Validate subscription action
Each subscription row SHALL expose a "Validate Subscription" action that opens a modal pre-populated with computed approval defaults that the administrator MAY override before confirming. The `fecha_fin` default SHALL be calculated as `fecha_inicio + plan_tipo.vigencia_dias` days (using addDays), not months. The `clases_restantes` default SHALL be taken from `plan_tipo.clases_incluidas` (which may be null for unlimited). The modal SHALL NOT reference plan-level `vigencia_meses` or `clases_incluidas`.

#### Scenario: Modal opens with pre-computed default values
- **WHEN** an administrator clicks "Validate Subscription" for a row
- **THEN** the system SHALL open a modal pre-populating `fecha_inicio` with today's date (if currently null), `fecha_fin` calculated as `fecha_inicio + plan_tipo.vigencia_dias` days, and `clases_restantes` from `plan_tipo.clases_incluidas` (if currently null); all three fields SHALL be editable by the administrator before submission

#### Scenario: Administrator approves a subscription
- **WHEN** the administrator confirms approval with the (optionally adjusted) values
- **THEN** the system SHALL update `suscripciones.estado = 'activa'`, persist the confirmed `fecha_inicio`, `fecha_fin`, and `clases_restantes` values, and refresh the table row to reflect the new state

#### Scenario: Administrator cancels a subscription
- **WHEN** the administrator confirms cancellation in the validate subscription modal
- **THEN** the system SHALL update `suscripciones.estado = 'cancelada'` and refresh the table row to reflect the new state

#### Scenario: Modal closes without action on dismiss
- **WHEN** the administrator closes the modal without submitting
- **THEN** the system SHALL not modify any database records

#### Scenario: fecha_fin uses plan_tipo vigencia_dias in days
- **WHEN** the modal computes the default `fecha_fin`
- **THEN** the system SHALL use `addDays(fecha_inicio, plan_tipo_vigencia_dias)` and SHALL NOT use `addMonths` with plan-level `vigencia_meses`

#### Scenario: clases_restantes defaults to plan_tipo clases_incluidas
- **WHEN** the modal computes the default `clases_restantes` and the subscription has no existing value
- **THEN** the system SHALL use `plan_tipo_clases_incluidas` as the default, which may be null (unlimited)
