## ADDED Requirements

### Requirement: Tenant administrator can view and manage payment methods from organization management page
The system SHALL render a "Métodos de Pago" card on the `/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion` page, below existing tenant info cards. The card SHALL display all payment methods (active and inactive) for the tenant, sorted by `orden ASC, nombre ASC`.

#### Scenario: Payment methods card renders for tenant with methods
- **WHEN** an authenticated administrator opens the organization management page and the tenant has one or more payment methods
- **THEN** the system SHALL render each method as a row showing: name, type badge, value, URL link icon (if present), status badge (activo/inactivo), and edit/delete action buttons

#### Scenario: Payment methods card renders empty state
- **WHEN** an authenticated administrator opens the organization management page and the tenant has no payment methods
- **THEN** the system SHALL render an explicit empty state: "No hay métodos de pago configurados. Agrega uno para que tus usuarios puedan realizar pagos."

#### Scenario: Card is loading data
- **WHEN** the payment methods fetch is in progress
- **THEN** the system SHALL render a loading state in the card

#### Scenario: Page remains a composition-only server component
- **WHEN** the organization management page is rendered
- **THEN** the page SHALL delegate all data access to `TenantPaymentMethodsCard` and SHALL NOT call Supabase directly

### Requirement: Tenant administrator can create a new payment method
The system SHALL allow an administrator to create a payment method for their tenant via a form modal opened from the "Métodos de Pago" card. The record SHALL be persisted to `tenant_metodos_pago` scoped to the active `tenant_id`.

#### Scenario: Create form opens from card
- **WHEN** the administrator clicks the "Add" (or equivalent CTA) button on the payment methods card
- **THEN** the system SHALL open the `MetodoPagoFormModal` in create mode with empty / default field values (`activo = true`)

#### Scenario: Successful creation persists method and refreshes list
- **WHEN** the administrator submits a valid create form
- **THEN** the system SHALL insert a row into `tenant_metodos_pago` and SHALL refresh the card list to include the new method

#### Scenario: Creation blocked while submit is in progress
- **WHEN** the administrator submits the create form and the request is pending
- **THEN** the system SHALL disable the submit button and show a loading state until the operation completes

### Requirement: Tenant administrator can edit an existing payment method
The system SHALL allow an administrator to modify any field of an existing payment method through the same `MetodoPagoFormModal` opened in edit mode.

#### Scenario: Edit form pre-populates existing values
- **WHEN** the administrator clicks the edit action on a payment method row
- **THEN** the system SHALL open `MetodoPagoFormModal` in edit mode with all current field values pre-filled

#### Scenario: Successful update persists changes and refreshes list
- **WHEN** the administrator submits a valid edit form
- **THEN** the system SHALL update the corresponding `tenant_metodos_pago` row and SHALL refresh the card list with the updated values

### Requirement: Tenant administrator can delete a payment method
The system SHALL allow an administrator to hard-delete a payment method after confirmation. Deletion SHALL be safe for historical `pagos` records due to the `ON DELETE SET NULL` FK on `pagos.metodo_pago_id`.

#### Scenario: Delete confirmation dialog is shown
- **WHEN** the administrator clicks the delete action on a payment method row
- **THEN** the system SHALL open a confirmation dialog before committing the deletion

#### Scenario: Confirmed deletion removes method and refreshes list
- **WHEN** the administrator confirms deletion
- **THEN** the system SHALL hard-delete the `tenant_metodos_pago` row and SHALL remove the method from the rendered card list

#### Scenario: Cancelled deletion takes no action
- **WHEN** the administrator dismisses the delete confirmation
- **THEN** the system SHALL take no action and the payment method SHALL remain in the list

### Requirement: Payment method form SHALL validate required fields and input constraints
The system SHALL enforce client-side validation before submitting create or update requests. Field-level errors SHALL be displayed adjacent to offending inputs without clearing other fields.

#### Scenario: Missing required nombre field
- **WHEN** the administrator submits the form with an empty `nombre` field
- **THEN** the system SHALL display a required-field validation error on `nombre` and SHALL NOT submit the request

#### Scenario: nombre exceeds maximum length
- **WHEN** the administrator submits the form with a `nombre` longer than 100 characters
- **THEN** the system SHALL display a length validation error on `nombre` and SHALL NOT submit

#### Scenario: Missing required tipo field
- **WHEN** the administrator submits the form without selecting a `tipo`
- **THEN** the system SHALL display a required-field validation error on `tipo` and SHALL NOT submit

#### Scenario: Invalid URL value
- **WHEN** the administrator enters a non-empty `url` that is not a valid http or https URL
- **THEN** the system SHALL display a URL format validation error on `url` and SHALL NOT submit

#### Scenario: Duplicate nombre within tenant
- **WHEN** the administrator submits a nombre that already exists for the same `tenant_id`
- **THEN** the system SHALL surface the unique constraint error and SHALL display a user-facing duplicate-name error (e.g., "Ya existe un método de pago con ese nombre.")

### Requirement: Payment methods data SHALL be persisted and secured in `tenant_metodos_pago` with row-level security
The system SHALL use the `tenant_metodos_pago` table with RLS policies enforcing that only tenant members can SELECT and only tenant administrators can INSERT, UPDATE, and DELETE.

#### Scenario: Tenant member (non-admin) can read payment methods
- **WHEN** an authenticated user with any active membership role for the tenant queries `tenant_metodos_pago`
- **THEN** the database RLS policy SHALL permit the SELECT

#### Scenario: Tenant administrator can write payment methods
- **WHEN** an authenticated user with `administrador` role in the tenant performs INSERT, UPDATE, or DELETE on `tenant_metodos_pago`
- **THEN** the database RLS policy SHALL permit the operation

#### Scenario: Non-member or out-of-scope write attempt is denied
- **WHEN** an authenticated user without `administrador` membership for the target tenant attempts INSERT, UPDATE, or DELETE on `tenant_metodos_pago`
- **THEN** the database RLS policy SHALL deny the operation and no data SHALL be persisted
