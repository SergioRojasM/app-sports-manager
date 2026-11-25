## ADDED Requirements

### Requirement: Clean-up migration is guarded
The clean-up migration SHALL run in a single transaction and SHALL abort, changing nothing, when any row of `entrenamientos` has `visibilidad = 'publico'` or any row of `entrenamientos_publicos` has `activo = true`. Bookings in state `pendiente` SHALL NOT block the migration.

#### Scenario: Phase 1 not applied
- **WHEN** the migration runs against a database that still has a public training or an active publication
- **THEN** it SHALL raise an exception naming the failed check and no object SHALL be dropped or altered

#### Scenario: Pending bookings present
- **WHEN** the migration runs against a database with bookings in `pendiente` linked to a subscription
- **THEN** it SHALL complete and those bookings SHALL be unchanged

### Requirement: Public trainings objects are removed
After the migration, the database SHALL NOT contain the table `entrenamientos_publicos`, the views `entrenamientos_publicos_view` and `entrenamientos_publicos_servicios_view`, or the functions `sync_entrenamiento_visibilidad_on_publicacion`, `check_entrenamiento_publico_restricciones_membresia` and `check_entrenamiento_publico_sin_restriccion_servicio`.

#### Scenario: Objects are gone
- **WHEN** the catalog is queried for those names after the migration
- **THEN** none of them SHALL exist

#### Scenario: No dangling references
- **WHEN** `pg_proc`, `pg_views` and `pg_policies` are searched in the `public` and `bi` schemas for `entrenamientos_publicos`
- **THEN** no function, view or policy SHALL reference it

### Requirement: Visibility columns are removed
The table `entrenamientos` SHALL NOT have the columns `visibilidad` and `visible_para`, nor the constraint `entrenamientos_visibilidad_ck`, the foreign key `entrenamientos_visible_para_fkey` or the indexes `idx_entrenamientos_visibilidad` and `idx_entrenamientos_visible_para`. Stored training template content SHALL NOT contain a `visibilidad` key. Application code SHALL NOT read or write either column.

#### Scenario: Columns are gone
- **WHEN** `information_schema.columns` is queried for `entrenamientos`
- **THEN** it SHALL list neither `visibilidad` nor `visible_para`

#### Scenario: Trainings still manageable
- **WHEN** an administrator or trainer creates, edits or deletes a training after the migration
- **THEN** the operation SHALL succeed as before

#### Scenario: Templates cleaned
- **WHEN** `entrenamiento_plantillas.contenido` is inspected after the migration
- **THEN** no row SHALL contain the key `visibilidad`, and every template SHALL still load in the wizard

### Requirement: Booking RPC has no deferred-purchase parameters
Exactly one overload of `book_and_deduct_service_units` SHALL exist, and it SHALL NOT accept `p_permitir_pendiente` or `p_plan_purchase`, nor create subscriptions or payments. It SHALL keep `p_suscripcion_id`, SHALL remain `security definer` with a fixed `search_path`, and SHALL be executable by `authenticated`. Bookings created through it SHALL be stored as `confirmada`.

#### Scenario: Single signature
- **WHEN** `pg_proc` is queried for `book_and_deduct_service_units`
- **THEN** exactly one row SHALL be returned and its arguments SHALL NOT include `p_permitir_pendiente` or `p_plan_purchase`

#### Scenario: Member booking with a service restriction
- **WHEN** a member with available units books a training that requires that service
- **THEN** the booking SHALL be created as `confirmada` and one unit SHALL be deducted

#### Scenario: Booking without the required service
- **WHEN** a member without the required service books that training
- **THEN** the booking SHALL be rejected with the existing restriction message and no row SHALL be created

### Requirement: Pending-booking cascade is preserved
The functions `confirm_pending_reservas_for_suscripcion` and `reject_pending_reservas_for_suscripcion`, the `reservas` states `pendiente` and `rechazada`, and the columns `reservas.motivo_rechazo`, `reservas.suscripcion_id` and `pagos.motivo_rechazo` SHALL remain unchanged.

#### Scenario: Approving a subscription with a pending booking
- **WHEN** an administrator approves a subscription that has a linked booking in `pendiente`
- **THEN** that booking SHALL become `confirmada` as before

#### Scenario: Rejecting the payment
- **WHEN** an administrator rejects the payment of a subscription that has a linked booking in `pendiente`
- **THEN** that booking SHALL become `rechazada` with the rejection reason

### Requirement: System tenant is preserved
The tenant `2a089688-3cfc-4216-9372-33f50079fbd1` (`public`), its `admin_tenants` row and its memberships SHALL NOT be deleted or modified, and it SHALL stay hidden from "Organizaciones Disponibles" and "Inicio".

#### Scenario: Tenant untouched
- **WHEN** the migration has been applied
- **THEN** the tenant row, its `admin_tenants` row and its `miembros_tenant` rows SHALL be the same as before

#### Scenario: Still hidden
- **WHEN** a user opens "Organizaciones Disponibles" or "Inicio"
- **THEN** the `public` tenant SHALL NOT be listed

### Requirement: Publication banners are removed from storage
The bucket `org-assets` SHALL NOT contain objects under `orgs/{tenantId}/entrenamientos-publicos/`. Removal SHALL go through the Storage API with the service role, not through SQL on `storage.objects`.

#### Scenario: No banners left
- **WHEN** `storage.objects` is queried for names matching `orgs/%/entrenamientos-publicos/%` in `org-assets` after the clean-up script runs
- **THEN** no rows SHALL be returned

#### Scenario: Other assets untouched
- **WHEN** the script has run
- **THEN** logos, organization banners, event banners, receipts and form files SHALL still be present
