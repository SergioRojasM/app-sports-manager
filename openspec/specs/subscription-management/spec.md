## ADDED Requirements

### Requirement: Admin subscription management page
The system SHALL provide a tenant-scoped subscription management screen at `/portal/orgs/[tenant_id]/gestion-suscripciones` accessible only to authenticated users with `administrador` role in the requested tenant. The route page entrypoint SHALL only compose feature components and MUST NOT perform direct data-access calls.

#### Scenario: Administrator accesses the module
- **WHEN** an authenticated user with `administrador` role navigates to `/portal/orgs/[tenant_id]/gestion-suscripciones`
- **THEN** the system SHALL render the subscription management page for the given tenant

#### Scenario: Non-administrator is denied access
- **WHEN** an authenticated user with `usuario` or `entrenador` role attempts to access `/portal/orgs/[tenant_id]/gestion-suscripciones` directly
- **THEN** the system SHALL redirect the user away from the page without rendering any subscription data

---

### Requirement: Subscription list with joined athlete, plan, and payment data
The system SHALL fetch all subscriptions belonging to the active tenant in a single joined query that includes the athlete's name and email (from `usuarios`), the plan name and `vigencia_meses` (from `planes`), and the latest payment record (from `pagos`) for each subscription. The result SHALL be displayed in a tabular layout.

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

---

### Requirement: Subscription statistics cards
The system SHALL display three summary cards derived from the in-memory subscription list without issuing additional database queries.

#### Scenario: Active subscriptions count
- **WHEN** subscription data is loaded
- **THEN** the system SHALL display a card showing the count of subscriptions where `estado = 'activa'`

#### Scenario: Pending subscriptions count
- **WHEN** subscription data is loaded
- **THEN** the system SHALL display a card showing the count of subscriptions where `estado = 'pendiente'`

#### Scenario: Subscriptions with pending payment count
- **WHEN** subscription data is loaded
- **THEN** the system SHALL display a card showing the count of subscriptions whose linked payment has `estado = 'pendiente'`

---

### Requirement: Search and quick-filter controls
The system SHALL provide a free-text search input and quick-filter chips that filter the displayed rows client-side without additional database queries.

#### Scenario: Free-text search filters by athlete name, plan name, or subscription ID
- **WHEN** an administrator types in the search input
- **THEN** the system SHALL filter rows to those where the athlete's full name, plan name, or subscription ID (partial UUID match) contains the search term (case-insensitive)

#### Scenario: Subscription status chip filters rows
- **WHEN** an administrator selects a subscription status chip (All / Pending / Active / Expired / Cancelled)
- **THEN** the system SHALL display only rows matching the selected `suscripciones.estado` value

#### Scenario: Payment status chip filters rows
- **WHEN** an administrator selects a payment status chip (All / Pending / Validated / Rejected)
- **THEN** the system SHALL display only rows matching the linked `pagos.estado` value

#### Scenario: Search and chips combine as AND filters
- **WHEN** both a search term and a status chip are active simultaneously
- **THEN** the system SHALL display only rows that satisfy both conditions

---

### Requirement: Validate payment action
Each subscription row SHALL expose a "Validate Payment" action that opens a modal pre-populated with the full subscription and payment detail. The modal SHALL allow the administrator to approve or reject the payment.

#### Scenario: Modal opens with full payment detail
- **WHEN** an administrator clicks "Validate Payment" for a row
- **THEN** the system SHALL open a modal displaying all subscription fields (athlete info, plan info, subscription status, dates, classes) and all payment fields (amount, method, receipt URL as a clickable link, current status, registered date)

#### Scenario: Administrator approves a payment
- **WHEN** the administrator confirms approval in the validate payment modal
- **THEN** the system SHALL update `pagos.estado = 'validado'`, set `pagos.validado_por` to the current authenticated user's ID, set `pagos.fecha_validacion` to the current timestamp, and refresh the table row to reflect the new state

#### Scenario: Administrator rejects a payment
- **WHEN** the administrator confirms rejection in the validate payment modal
- **THEN** the system SHALL update `pagos.estado = 'rechazado'` and refresh the table row to reflect the new state

#### Scenario: Modal closes without action on dismiss
- **WHEN** the administrator closes the modal without submitting
- **THEN** the system SHALL not modify any database records

---

### Requirement: Validate subscription action
Each subscription row SHALL expose a "Validate Subscription" action that opens a modal pre-populated with computed approval defaults that the administrator MAY override before confirming.

#### Scenario: Modal opens with pre-computed default values
- **WHEN** an administrator clicks "Validate Subscription" for a row
- **THEN** the system SHALL open a modal pre-populating `fecha_inicio` with today's date (if currently null), `fecha_fin` calculated as `fecha_inicio + vigencia_meses months`, and `clases_restantes` from `clases_plan` (if currently null); all three fields SHALL be editable by the administrator before submission

#### Scenario: Administrator approves a subscription
- **WHEN** the administrator confirms approval with the (optionally adjusted) values
- **THEN** the system SHALL update `suscripciones.estado = 'activa'`, persist the confirmed `fecha_inicio`, `fecha_fin`, and `clases_restantes` values, and refresh the table row to reflect the new state

#### Scenario: Administrator cancels a subscription
- **WHEN** the administrator confirms cancellation in the validate subscription modal
- **THEN** the system SHALL update `suscripciones.estado = 'cancelada'` and refresh the table row to reflect the new state

#### Scenario: Modal closes without action on dismiss
- **WHEN** the administrator closes the modal without submitting
- **THEN** the system SHALL not modify any database records

---

### Requirement: Admin RLS policies for suscripciones and pagos
The database SHALL enforce RLS policies that allow authenticated users with `administrador` role in a tenant to SELECT and UPDATE `suscripciones` and `pagos` rows scoped to that tenant. Existing athlete-scoped policies SHALL remain unaffected.

#### Scenario: Admin can read all tenant subscriptions
- **WHEN** an administrator issues a SELECT on `public.suscripciones` filtered by their admin tenant IDs
- **THEN** Supabase RLS SHALL allow the query to return all matching rows regardless of `atleta_id`

#### Scenario: Admin can update subscription estado
- **WHEN** an administrator issues an UPDATE on `public.suscripciones` for a row in their admin tenant
- **THEN** Supabase RLS SHALL permit the update

#### Scenario: Admin can read and update payment records
- **WHEN** an administrator issues a SELECT or UPDATE on `public.pagos` for records in their admin tenant
- **THEN** Supabase RLS SHALL permit the operation

#### Scenario: Athlete policies are unaffected
- **WHEN** an athlete issues a SELECT on `public.suscripciones`
- **THEN** RLS SHALL only return rows where `atleta_id = auth.uid()`, unchanged from pre-US-0020 behavior
