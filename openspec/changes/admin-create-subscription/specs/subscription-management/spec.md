## MODIFIED Requirements

### Requirement: Admin subscription management page
The system SHALL provide a tenant-scoped subscription management screen at `/portal/orgs/[tenant_id]/gestion-suscripciones` accessible only to authenticated users with `administrador` role in the requested tenant. The route page entrypoint SHALL only compose feature components and MUST NOT perform direct data-access calls. The page header SHALL include a **"Nueva suscripción"** primary action button that opens the `CrearSuscripcionModal`.

#### Scenario: Administrator accesses the module
- **WHEN** an authenticated user with `administrador` role navigates to `/portal/orgs/[tenant_id]/gestion-suscripciones`
- **THEN** the system SHALL render the subscription management page for the given tenant

#### Scenario: Non-administrator is denied access
- **WHEN** an authenticated user with `usuario` or `entrenador` role attempts to access `/portal/orgs/[tenant_id]/gestion-suscripciones` directly
- **THEN** the system SHALL redirect the user away from the page without rendering any subscription data

#### Scenario: Nueva suscripción button opens CrearSuscripcionModal
- **WHEN** an administrator clicks the "Nueva suscripción" button in the page header
- **THEN** the system SHALL open `CrearSuscripcionModal` in create mode

### Requirement: Admin RLS policies for suscripciones and pagos
The database SHALL enforce RLS policies that allow authenticated users with `administrador` role in a tenant to SELECT, UPDATE, DELETE, and INSERT `suscripciones` rows scoped to that tenant, and to SELECT, UPDATE, and INSERT `pagos` rows scoped to that tenant. Existing athlete-scoped policies SHALL remain unaffected.

#### Scenario: Admin can read all tenant subscriptions
- **WHEN** an administrator issues a SELECT on `public.suscripciones` filtered by their admin tenant IDs
- **THEN** Supabase RLS SHALL allow the query to return all matching rows regardless of `atleta_id`

#### Scenario: Admin can update subscription estado
- **WHEN** an administrator issues an UPDATE on `public.suscripciones` for a row in their admin tenant
- **THEN** Supabase RLS SHALL permit the update

#### Scenario: Admin can delete a scoped subscription
- **WHEN** an administrator issues a DELETE on `public.suscripciones` for a row whose `tenant_id` belongs to a tenant they administer
- **THEN** Supabase RLS SHALL permit the deletion via the `suscripciones_delete_admin` policy

#### Scenario: Admin cannot delete a subscription from a foreign tenant
- **WHEN** an administrator issues a DELETE on `public.suscripciones` for a row whose `tenant_id` does NOT belong to a tenant they administer
- **THEN** Supabase RLS SHALL deny the deletion and return zero affected rows

#### Scenario: Admin can read and update payment records
- **WHEN** an administrator issues a SELECT or UPDATE on `public.pagos` for records in their admin tenant
- **THEN** Supabase RLS SHALL permit the operation

#### Scenario: Admin can insert a subscription for any tenant athlete
- **WHEN** an authenticated admin issues an INSERT on `public.suscripciones` with a `tenant_id` they administer
- **THEN** Supabase RLS SHALL permit the insert regardless of the `atleta_id` value

#### Scenario: Admin can insert a payment for any tenant subscription
- **WHEN** an authenticated admin issues an INSERT on `public.pagos` with a `tenant_id` they administer
- **THEN** Supabase RLS SHALL permit the insert

#### Scenario: Athlete policies are unaffected
- **WHEN** an athlete issues a SELECT on `public.suscripciones`
- **THEN** RLS SHALL only return rows where `atleta_id = auth.uid()`, unchanged from pre-US-0020 behavior
