## ADDED Requirements

### Requirement: Admin can override service unit balance on a subscription
The system SHALL provide a SECURITY DEFINER function `admin_update_suscripcion_servicio_unidades(p_suscripcion_id uuid, p_servicio_id uuid, p_unidades_restantes integer)` that updates `suscripcion_servicios.unidades_restantes` for a given (subscription, service) pair. The function SHALL validate that the calling authenticated user is an administrator for the subscription's tenant before writing. A `null` value for `p_unidades_restantes` SHALL be accepted and stored as-is (meaning unlimited). The `authenticated` role SHALL be granted EXECUTE on the function.

#### Scenario: Admin successfully updates units to a finite value
- **WHEN** an authenticated admin calls `admin_update_suscripcion_servicio_unidades` with a valid `suscripcion_id`, `servicio_id`, and a non-negative integer `unidades_restantes`
- **THEN** the `suscripcion_servicios` row matching `(suscripcion_id, servicio_id)` SHALL have `unidades_restantes` updated to the provided value and `updated_at` set to the current UTC timestamp

#### Scenario: Admin sets service units to unlimited (null)
- **WHEN** an authenticated admin calls `admin_update_suscripcion_servicio_unidades` with `p_unidades_restantes = null`
- **THEN** the `suscripcion_servicios` row SHALL have `unidades_restantes = null` (unlimited), and `updated_at` updated

#### Scenario: Non-admin caller is rejected
- **WHEN** an authenticated user who is NOT an administrator for the subscription's tenant calls `admin_update_suscripcion_servicio_unidades`
- **THEN** the function SHALL raise an exception with errcode `42501` and no row SHALL be updated

#### Scenario: Negative value is rejected
- **WHEN** `admin_update_suscripcion_servicio_unidades` is called with `p_unidades_restantes < 0`
- **THEN** the function SHALL raise an exception with errcode `23514` before performing any UPDATE

#### Scenario: Subscription not found raises error
- **WHEN** `admin_update_suscripcion_servicio_unidades` is called with a `p_suscripcion_id` that does not exist in `suscripciones`
- **THEN** the function SHALL raise an exception with errcode `P0002` and no row SHALL be updated

---

### Requirement: Edit modal exposes per-service unit editing
The `EditarSuscripcionModal` SHALL render a "Unidades por Servicio" section when `formValues.servicios.length > 0`. For each service entry the section SHALL show the service name (read-only), a read-only `unidades_incluidas` badge (`null` displayed as "∞"), an "Ilimitado" checkbox, and a number input for `unidades_restantes`. When the "Ilimitado" checkbox is checked the number input SHALL be hidden and the value set to `null`. When unchecked the number input SHALL be visible with a minimum value of 0. The entire section SHALL be disabled while `isSubmitting` is true.

#### Scenario: Section is absent when subscription has no services
- **WHEN** an admin opens `EditarSuscripcionModal` for a subscription with `row.servicios.length === 0`
- **THEN** the "Unidades por Servicio" section SHALL NOT be rendered

#### Scenario: Section is present and pre-populated when subscription has services
- **WHEN** an admin opens `EditarSuscripcionModal` for a subscription with one or more services
- **THEN** each service SHALL appear as a row with its name, `unidades_incluidas` badge, an "Ilimitado" checkbox (checked if `unidades_restantes === null`), and a number input showing the current `unidades_restantes` (visible and enabled if not unlimited)

#### Scenario: Toggling Ilimitado to checked clears the number input
- **WHEN** an admin checks the "Ilimitado" checkbox for a service that currently has a finite `unidades_restantes`
- **THEN** the number input SHALL disappear and `formValues.servicios[i].unidades_restantes` SHALL be set to `null`

#### Scenario: Toggling Ilimitado to unchecked restores the number input
- **WHEN** an admin unchecks the "Ilimitado" checkbox for a service that currently has `unidades_restantes = null`
- **THEN** the number input SHALL appear, enabled, and `formValues.servicios[i].unidades_restantes` SHALL be set to the service's `unidades_incluidas` value, or `0` if `unidades_incluidas` is also null

#### Scenario: Saving with changed service units calls the RPC for each changed row only
- **WHEN** an admin edits `unidades_restantes` for some but not all services and submits `EditarSuscripcionModal`
- **THEN** the hook SHALL call `adminUpdateServicioUnidades` only for services whose `unidades_restantes` differs from the original `row.servicios` value; unchanged services SHALL NOT trigger an RPC call

#### Scenario: Service unit RPC failure shows inline error without closing modal
- **WHEN** the `adminUpdateServicioUnidades` RPC call fails for any service
- **THEN** `EditarSuscripcionModal` SHALL remain open and SHALL display an inline error message; the subscription fields (already saved before the service loop) SHALL NOT be rolled back

#### Scenario: Inputs are disabled while submission is in progress
- **WHEN** the admin submits `EditarSuscripcionModal` and the request is pending
- **THEN** all service unit inputs and checkboxes SHALL be disabled
