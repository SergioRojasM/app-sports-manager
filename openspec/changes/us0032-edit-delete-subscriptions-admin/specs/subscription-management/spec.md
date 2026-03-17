## ADDED Requirements

### Requirement: Admin can edit all fields of an existing subscription
The system SHALL allow an authenticated user with `administrador` role to edit any field of an existing tenant subscription through a right-side modal form (`EditarSuscripcionModal`). The editable fields are `plan_id`, `estado`, `fecha_inicio`, `fecha_fin`, `clases_restantes`, `clases_plan`, and `comentarios`. On successful save the modal SHALL close and the subscription table SHALL refresh to reflect the updated values.

#### Scenario: Editar button is present for every row regardless of status
- **WHEN** an administrator views the subscription table
- **THEN** each row SHALL display an "Editar" action button regardless of the subscription's `estado`

#### Scenario: Modal opens pre-populated with current subscription values
- **WHEN** an administrator clicks "Editar" for a subscription row
- **THEN** the system SHALL open `EditarSuscripcionModal` with all editable fields pre-populated with the subscription's current values

#### Scenario: Plan selector loads active plans for the tenant
- **WHEN** `EditarSuscripcionModal` opens
- **THEN** the `plan_id` select field SHALL be populated with the list of active plans for the current tenant

#### Scenario: Date validation prevents invalid ranges
- **WHEN** the administrator submits the edit form with `fecha_fin` earlier than or equal to `fecha_inicio` (both non-null)
- **THEN** the system SHALL display an inline validation error and SHALL NOT submit the request

#### Scenario: Successful edit closes modal and refreshes table
- **WHEN** the administrator submits valid values in `EditarSuscripcionModal`
- **THEN** the system SHALL call `editarSuscripcion`, close the modal on success, and trigger a table refresh to show the updated subscription data

#### Scenario: Service error is displayed inline
- **WHEN** the `editarSuscripcion` service call fails
- **THEN** the system SHALL display the error message inline in the modal and SHALL NOT close it

#### Scenario: Submit button is disabled while submission is in progress
- **WHEN** the administrator submits `EditarSuscripcionModal` and the request is pending
- **THEN** all action buttons in the modal SHALL be disabled to prevent double-submit

---

### Requirement: Admin can permanently delete a subscription
The system SHALL allow an authenticated user with `administrador` role to permanently delete an existing tenant subscription through a confirmation dialog (`EliminarSuscripcionModal`). Deletion SHALL cascade to the subscription's associated `pagos` records via the existing `pagos.suscripcion_id → suscripciones.id ON DELETE CASCADE` foreign key constraint. On successful deletion the dialog SHALL close and the subscription table SHALL refresh.

#### Scenario: Eliminar button is present for every row regardless of status
- **WHEN** an administrator views the subscription table
- **THEN** each row SHALL display an "Eliminar" action button regardless of the subscription's `estado`

#### Scenario: Confirmation dialog shows athlete and plan names
- **WHEN** an administrator clicks "Eliminar" for a subscription row
- **THEN** the system SHALL open `EliminarSuscripcionModal` showing the athlete's full name and the plan name to confirm the target record

#### Scenario: Confirming deletion removes subscription and cascades to payments
- **WHEN** the administrator confirms deletion in `EliminarSuscripcionModal`
- **THEN** the system SHALL call `eliminarSuscripcion`, which issues a DELETE on `public.suscripciones` for that record; RLS and the FK CASCADE SHALL ensure only tenant-scoped records are deleted and all linked `pagos` rows are removed automatically

#### Scenario: Table refreshes after successful deletion
- **WHEN** the `eliminarSuscripcion` service call completes successfully
- **THEN** the dialog SHALL close and the subscription table SHALL refresh to no longer show the deleted row

#### Scenario: Service error is displayed inline in the confirmation dialog
- **WHEN** the `eliminarSuscripcion` service call fails
- **THEN** the system SHALL display the error message inline in `EliminarSuscripcionModal` and SHALL NOT close it

#### Scenario: Confirm button is disabled while deletion is in progress
- **WHEN** the administrator confirms deletion and the request is pending
- **THEN** all action buttons in `EliminarSuscripcionModal` SHALL be disabled to prevent double-submit

#### Scenario: Cancelling dialog makes no database change
- **WHEN** the administrator closes `EliminarSuscripcionModal` without confirming
- **THEN** the system SHALL not issue any DELETE call and the subscription record SHALL remain unchanged

---

## MODIFIED Requirements

### Requirement: Admin RLS policies for suscripciones and pagos
The database SHALL enforce RLS policies that allow authenticated users with `administrador` role in a tenant to SELECT, UPDATE, and DELETE `suscripciones` rows scoped to that tenant, and to SELECT and UPDATE `pagos` rows scoped to that tenant. Existing athlete-scoped policies SHALL remain unaffected. A dedicated `suscripciones_delete_admin` policy SHALL be created granting tenant-scoped DELETE permission to the `authenticated` role, and the `authenticated` role SHALL be granted the `DELETE` privilege on `public.suscripciones`.

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

#### Scenario: Athlete policies are unaffected
- **WHEN** an athlete issues a SELECT on `public.suscripciones`
- **THEN** RLS SHALL only return rows where `atleta_id = auth.uid()`, unchanged from pre-US-0020 behavior
