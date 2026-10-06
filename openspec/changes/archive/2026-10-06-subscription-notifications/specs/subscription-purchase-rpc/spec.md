## ADDED Requirements

### Requirement: Atomic purchase RPC
The system SHALL provide `public.comprar_suscripcion(p_tenant_id uuid, p_plan_id uuid, p_plan_tipo_id uuid, p_metodo_pago_id uuid, p_comentarios text, p_pago_id uuid, p_comprobante_path text) returns jsonb`, SECURITY DEFINER with `search_path = public`, executable by `authenticated` only.

In one transaction it SHALL:
- insert a `suscripciones` row with `atleta_id = auth.uid()`, `estado = 'pendiente'` and `comentarios = nullif(btrim(p_comentarios), '')`;
- call `populate_suscripcion_servicios` when `p_plan_tipo_id` is not null;
- insert a `pagos` row with `id = p_pago_id` (or a generated id when it is null), `estado = 'pendiente'`, `monto = coalesce(plan_tipos.precio, 0)`, `metodo_pago_id = p_metodo_pago_id` and `comprobante_path = p_comprobante_path`;
- enqueue the purchase notifications (see `subscription-notifications`);
- return `{ "suscripcion_id", "pago_id" }`.

Any failure SHALL roll back every row. A failure while enqueuing notifications SHALL NOT undo the purchase.

#### Scenario: Successful purchase with a subtype
- **WHEN** an athlete calls the RPC for an available plan with one of its active subtypes
- **THEN** one `pendiente` subscription with that `plan_tipo_id`, its `suscripcion_servicios` rows and one `pendiente` payment SHALL exist, and the result SHALL carry both ids

#### Scenario: Amount comes from the server
- **WHEN** a purchase is made for a subtype whose `precio` is 80000
- **THEN** the payment SHALL have `monto = 80000`; the RPC takes no amount parameter

#### Scenario: Plan without subtypes
- **WHEN** a purchase is made for a plan with no active subtype and `p_plan_tipo_id` null
- **THEN** the payment SHALL have `monto = 0` and no service units SHALL be created

#### Scenario: Atomic rollback
- **WHEN** the RPC fails at any validation or insert
- **THEN** no `suscripciones`, `suscripcion_servicios` or `pagos` row and no notification SHALL be left behind

#### Scenario: Buyer is always the caller
- **WHEN** the RPC is called without a session
- **THEN** it SHALL fail with `FORBIDDEN` (SQLSTATE `42501`)

### Requirement: Purchase validations
The RPC SHALL raise these errors, by message:
- `PLAN_NO_DISPONIBLE` when `can_subscribe_to_plan(p_plan_id, p_tenant_id)` is false;
- `SUBTIPO_NO_DISPONIBLE` when the plan has active subtypes and `p_plan_tipo_id` is not one of them, or when the plan has none and `p_plan_tipo_id` is not null;
- `SUSCRIPCION_PENDIENTE_EXISTENTE` when the caller already has a `pendiente` subscription for that plan. The check SHALL run under `pg_advisory_xact_lock` keyed by caller and plan;
- `METODO_PAGO_INVALIDO` when `p_metodo_pago_id` is not null and is not an active `tenant_metodos_pago` row of `p_tenant_id`;
- `COMPROBANTE_INVALIDO` when `p_comprobante_path` is not null and does not match `orgs/{p_tenant_id}/users/{auth.uid()}/receipts/{p_pago_id}.{ext}`, or no such object exists in the `org-assets` bucket, or `p_pago_id` is null with a non-null path, or `p_pago_id` already exists in `pagos`.

#### Scenario: Unavailable plan
- **WHEN** the plan is inactive, hidden from athletes, of another tenant, or private and the caller is not a member
- **THEN** the RPC SHALL fail with `PLAN_NO_DISPONIBLE`

#### Scenario: Wrong subtype
- **WHEN** `p_plan_tipo_id` is missing, inactive or belongs to another plan
- **THEN** the RPC SHALL fail with `SUBTIPO_NO_DISPONIBLE`

#### Scenario: Duplicate pending request
- **WHEN** the caller already has a `pendiente` subscription for the plan
- **THEN** the RPC SHALL fail with `SUSCRIPCION_PENDIENTE_EXISTENTE`

#### Scenario: Simultaneous calls
- **WHEN** the same athlete sends two purchases of the same plan at the same time
- **THEN** exactly one SHALL succeed and the other SHALL fail with `SUSCRIPCION_PENDIENTE_EXISTENTE`

#### Scenario: Foreign or inactive payment method
- **WHEN** `p_metodo_pago_id` belongs to another tenant or is inactive
- **THEN** the RPC SHALL fail with `METODO_PAGO_INVALIDO`

#### Scenario: Proof path of someone else
- **WHEN** `p_comprobante_path` points to another user's folder, another tenant, another payment id, or a file that does not exist
- **THEN** the RPC SHALL fail with `COMPROBANTE_INVALIDO`

### Requirement: Direct athlete inserts removed
The policies `suscripciones_insert_own` and `pagos_insert_own` SHALL be dropped. Athletes SHALL create subscriptions and payments only through `comprar_suscripcion`. The administrator insert policies and `pagos_update_own` SHALL be unchanged.

#### Scenario: Athlete direct insert denied
- **WHEN** an athlete inserts into `suscripciones` or `pagos` through the API
- **THEN** the statement SHALL fail with a permission error

#### Scenario: Administrator insert still allowed
- **WHEN** an administrator creates a subscription and its payment for an athlete from "Gestión de suscripciones"
- **THEN** both rows SHALL be inserted as before

#### Scenario: Proof re-upload still allowed
- **WHEN** an athlete updates the `comprobante_path` of an own payment from "Mis suscripciones"
- **THEN** the update SHALL succeed

### Requirement: Purchase service function
`suscripcionesService.comprarSuscripcion(payload)` SHALL call the RPC with `{ tenantId, planId, planTipoId, metodoPagoId, comentarios, pagoId, comprobantePath }` and return `{ suscripcionId, pagoId }`. It SHALL throw `SuscripcionServiceError` with the code `plan_unavailable` for `PLAN_NO_DISPONIBLE` and `SUBTIPO_NO_DISPONIBLE`, `pending_exists`, `invalid_payment_method`, `invalid_proof`, or `unknown`. `suscripcionesService.createSuscripcion` and `pagosService.createPago` SHALL be removed; `pagosService.updateComprobantePath` SHALL remain.

#### Scenario: Error mapping
- **WHEN** the RPC fails with `SUSCRIPCION_PENDIENTE_EXISTENTE`
- **THEN** the service SHALL throw a `SuscripcionServiceError` whose code is `pending_exists`

#### Scenario: Unknown error
- **WHEN** the RPC fails with an unexpected error
- **THEN** the service SHALL throw a `SuscripcionServiceError` whose code is `unknown`
