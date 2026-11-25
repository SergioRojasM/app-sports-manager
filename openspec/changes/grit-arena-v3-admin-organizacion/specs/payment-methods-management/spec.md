# Spec Delta

## MODIFIED Requirements

### Requirement: Tenant administrator can view and manage payment methods from organization management page
The system SHALL render a "Métodos de pago" section on the `/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion` page, with the subtitle "Cómo te pagan tus atletas." and an "Agregar" action. The section SHALL display all payment methods (active and inactive) for the tenant, sorted by `orden ASC, nombre ASC`, as list rows.

#### Scenario: Payment methods card renders for tenant with methods
- **WHEN** an authenticated administrator opens the organization management page and the tenant has one or more payment methods
- **THEN** the system SHALL render each method as a row showing: a type icon, the name, a type tag, a status tag ("Activo" or "Pausado"), an open-link action (only when a URL is set), and edit and delete actions with accessible names that include the method name

#### Scenario: Payment methods card renders empty state
- **WHEN** an authenticated administrator opens the organization management page and the tenant has no payment methods
- **THEN** the system SHALL render an explicit empty state: "No hay métodos de pago configurados. Agrega uno para que tus usuarios puedan realizar pagos."

#### Scenario: Card is loading data
- **WHEN** the payment methods fetch is in progress
- **THEN** the system SHALL render a loading state in the card

#### Scenario: Page remains a composition-only server component
- **WHEN** the organization management page is rendered
- **THEN** the page SHALL delegate all data access to `TenantPaymentMethodsCard` and SHALL NOT call Supabase directly

#### Scenario: Value is shown as secondary text
- **WHEN** a method has a `valor` (for example an account number)
- **THEN** the row SHALL show it as secondary text under the name

### Requirement: Payment methods list SHALL flag methods that have a QR image
`TenantPaymentMethodsCard` SHALL show a "QR" tag (with `title="Tiene imagen QR"`) among the tags of each method whose `qr_url` is set.

#### Scenario: Method with image
- **WHEN** the list renders a method with `qr_url`
- **THEN** the row SHALL show the "QR" tag next to its type and status tags

#### Scenario: Method without image
- **WHEN** the list renders a method without `qr_url`
- **THEN** the row SHALL NOT show the "QR" tag

## ADDED Requirements

### Requirement: Payment method deletion uses a confirmation dialog
Deleting a payment method SHALL ask for confirmation in an accessible dialog that names the method. Cancelling SHALL delete nothing and return focus to the delete action.

#### Scenario: Confirm deletion
- **WHEN** the administrator activates delete on "Transferencia Nequi" and confirms
- **THEN** the method SHALL be deleted and removed from the list

#### Scenario: Cancel deletion
- **WHEN** the administrator cancels the dialog
- **THEN** the method SHALL remain and focus SHALL return to its delete action
