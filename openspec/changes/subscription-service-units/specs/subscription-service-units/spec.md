## ADDED Requirements

### Requirement: suscripcion_servicios table
The system SHALL maintain a `suscripcion_servicios` table with columns `id` (uuid PK), `suscripcion_id` (FK → `suscripciones` ON DELETE CASCADE), `servicio_id` (FK → `servicios` ON DELETE RESTRICT), `unidades_incluidas` (integer nullable), `unidades_restantes` (integer nullable), `created_at`, and `updated_at`. The table SHALL enforce a unique constraint on `(suscripcion_id, servicio_id)`. Both `unidades_incluidas` and `unidades_restantes` SHALL allow `NULL` to represent unlimited units and SHALL enforce a check constraint that when not null their value is >= 0.

#### Scenario: Unique service entitlement per subscription
- **WHEN** a second insert is attempted for the same `(suscripcion_id, servicio_id)` pair
- **THEN** the database SHALL reject the insert with a unique constraint violation

#### Scenario: Cascade delete on subscription removal
- **WHEN** a `suscripciones` row is deleted
- **THEN** all related `suscripcion_servicios` rows SHALL be deleted automatically via CASCADE

#### Scenario: Restrict service deletion when referenced
- **WHEN** a `servicios` row is referenced by one or more `suscripcion_servicios` rows and a DELETE is attempted on that service
- **THEN** the database SHALL reject the deletion with a foreign key restriction error

---

### Requirement: RLS access control on suscripcion_servicios
The system SHALL enable Row Level Security on `suscripcion_servicios`. Authenticated users SHALL be able to SELECT rows where the linked `suscripcion_id` belongs to either their own `atleta_id` OR a tenant they administer. Direct INSERT, UPDATE, and DELETE by the `authenticated` role SHALL NOT be permitted — all writes MUST go through the `populate_suscripcion_servicios` SECURITY DEFINER function.

#### Scenario: Athlete reads own service entitlements
- **WHEN** an authenticated athlete queries `suscripcion_servicios` filtered by a `suscripcion_id` belonging to them
- **THEN** the system SHALL return the matching rows

#### Scenario: Athlete cannot read another athlete's entitlements
- **WHEN** an authenticated athlete queries `suscripcion_servicios` for a subscription belonging to a different athlete
- **THEN** the system SHALL return zero rows

#### Scenario: Admin reads tenant service entitlements
- **WHEN** an authenticated administrator queries `suscripcion_servicios` for any subscription in their tenant
- **THEN** the system SHALL return the matching rows

#### Scenario: Direct INSERT by authenticated role is blocked
- **WHEN** an authenticated client attempts to INSERT directly into `suscripcion_servicios`
- **THEN** the database SHALL deny the operation (no INSERT RLS policy exists for `authenticated`)

---

### Requirement: populate_suscripcion_servicios SECURITY DEFINER function
The system SHALL provide a SECURITY DEFINER Postgres function `populate_suscripcion_servicios(p_suscripcion_id uuid, p_plan_tipo_id uuid)` that, when called, inserts one row into `suscripcion_servicios` for each entry in `plan_tipos_servicios` with the given `p_plan_tipo_id`, setting `unidades_incluidas` and `unidades_restantes` to the snapshot value of `plan_tipos_servicios.unidades`. The function SHALL use `ON CONFLICT (suscripcion_id, servicio_id) DO NOTHING` to be idempotent. The function SHALL be GRANTED EXECUTE to the `authenticated` role.

#### Scenario: Single-service plan tipo populates one row
- **WHEN** `populate_suscripcion_servicios` is called for a subscription linked to a `plan_tipo` that has exactly one service with `unidades = 10`
- **THEN** one row is inserted in `suscripcion_servicios` with `unidades_incluidas = 10` and `unidades_restantes = 10`

#### Scenario: Multi-service plan tipo populates multiple rows
- **WHEN** `populate_suscripcion_servicios` is called for a subscription linked to a `plan_tipo` with three service assignments
- **THEN** three rows are inserted in `suscripcion_servicios`, one per service, each with the correct `unidades_incluidas` and `unidades_restantes` snapshot values

#### Scenario: Unlimited service (NULL unidades) produces NULL columns
- **WHEN** `populate_suscripcion_servicios` is called for a subscription where the plan tipo has a service with `unidades = NULL` (unlimited)
- **THEN** the inserted `suscripcion_servicios` row has `unidades_incluidas = NULL` and `unidades_restantes = NULL`

#### Scenario: Idempotent call does not duplicate or overwrite rows
- **WHEN** `populate_suscripcion_servicios` is called a second time for the same `(p_suscripcion_id, p_plan_tipo_id)` combination
- **THEN** no new rows are inserted and existing `unidades_restantes` values are unchanged

#### Scenario: plan_tipo with no services produces no rows
- **WHEN** `populate_suscripcion_servicios` is called for a `plan_tipo_id` that has zero entries in `plan_tipos_servicios`
- **THEN** no rows are inserted into `suscripcion_servicios` and the function returns without error

---

### Requirement: Automatic service unit population on subscription creation (athlete self-service)
The system SHALL call `populate_suscripcion_servicios` immediately after a successful subscription INSERT when `plan_tipo_id` is provided in the athlete self-service subscription creation flow (`suscripcionesService.createSuscripcion`). If the RPC call fails, the service SHALL throw an error that surfaces to the user. If `plan_tipo_id` is not provided, the RPC SHALL NOT be called.

#### Scenario: Subscription with plan_tipo_id populates service units (athlete flow)
- **WHEN** an athlete creates a subscription with a `plan_tipo_id` that has service assignments
- **THEN** `populate_suscripcion_servicios` is called, `suscripcion_servicios` rows are inserted, and `createSuscripcion` returns the created subscription

#### Scenario: Subscription without plan_tipo_id skips population (athlete flow)
- **WHEN** an athlete creates a subscription without a `plan_tipo_id`
- **THEN** `populate_suscripcion_servicios` is NOT called and `suscripcion_servicios` remains empty for that subscription

#### Scenario: RPC failure surfaces as error to the user (athlete flow)
- **WHEN** `populate_suscripcion_servicios` returns an error after the subscription row has been inserted
- **THEN** `createSuscripcion` throws an error and the user sees an error notification

---

### Requirement: Automatic service unit population on subscription creation (admin flow)
The system SHALL call `populate_suscripcion_servicios` immediately after a successful subscription INSERT when `plan_tipo_id` is provided in the admin subscription creation flow (`gestionSuscripcionesService.crearSuscripcionAdmin`). If the RPC call fails, the service SHALL throw a `GestionSuscripcionesServiceError` with code `'populate_servicios_failed'` with a user-friendly message. If `plan_tipo_id` is not provided, the RPC SHALL NOT be called.

#### Scenario: Admin-created subscription with plan_tipo_id populates service units
- **WHEN** an admin creates a subscription on behalf of an athlete with a `plan_tipo_id` that has service assignments
- **THEN** `populate_suscripcion_servicios` is called, `suscripcion_servicios` rows are inserted, and `crearSuscripcionAdmin` completes successfully

#### Scenario: Admin-created subscription without plan_tipo_id skips population
- **WHEN** an admin creates a subscription without a `plan_tipo_id`
- **THEN** `populate_suscripcion_servicios` is NOT called and `suscripcion_servicios` remains empty for that subscription

#### Scenario: RPC failure in admin flow produces distinct error code
- **WHEN** `populate_suscripcion_servicios` returns an error after the subscription row has been inserted in the admin flow
- **THEN** a `GestionSuscripcionesServiceError` with code `'populate_servicios_failed'` is thrown

---

### Requirement: Read per-service unit balances for a subscription
The system SHALL provide a `getSuscripcionServicios(suscripcionId: string)` function in `suscripcionesService` that returns all `suscripcion_servicios` rows for the given subscription, including `id`, `suscripcion_id`, `servicio_id`, `unidades_incluidas`, `unidades_restantes`, and `created_at`. Access SHALL be controlled by the existing RLS SELECT policy (own athlete or tenant admin).

#### Scenario: Returns service entitlements for own subscription
- **WHEN** an authenticated user calls `getSuscripcionServicios` for a subscription belonging to them
- **THEN** the system SHALL return an array of `SuscripcionServicio` objects with correct field values

#### Scenario: Returns empty array when no services assigned
- **WHEN** `getSuscripcionServicios` is called for a subscription with no `suscripcion_servicios` rows
- **THEN** the system SHALL return an empty array without error
