## ADDED Requirements

### Requirement: Subscription notification helper
`_encolar_notificacion_suscripcion(p_suscripcion_id uuid, p_tipo text, p_pago_id uuid default null)` SHALL be SECURITY DEFINER with `search_path = public`, revoked from `public`, `anon` and `authenticated`. It SHALL load the subscription with its plan, subtype, tenant and athlete, return silently when the subscription does not exist, and enqueue with `modulo = 'suscripciones'`, `entidad_tipo = 'suscripcion'` and `entidad_id = p_suscripcion_id`:
- for `suscripcion_recibida`, `pago_validado`, `pago_rechazado`, `suscripcion_aprobada`, `suscripcion_rechazada` and `suscripcion_asignada`: one email and one in-app notification for the athlete;
- for `suscripcion_nueva_admin` and `pago_comprobante_admin`: one email and one in-app notification per row of `_admins_tenant(tenant_id)`.

The email payload SHALL be `{ suscripcion_id, pago_id, tenant_id, plan, tenant_nombre, atleta_nombre, motivo_rechazo, requiere_validacion }`, where `requiere_validacion` is true when the subscription or the given payment is `pendiente`.

#### Scenario: Athlete type
- **WHEN** the helper is called with `pago_validado`
- **THEN** one outbox row and one in-app notification SHALL exist for the athlete and none for administrators

#### Scenario: Administrator type
- **WHEN** the helper is called with `suscripcion_nueva_admin` in a tenant with two active administrators
- **THEN** two outbox rows and two in-app notifications SHALL exist, one per administrator, and none for the athlete

#### Scenario: Members who are not notified
- **WHEN** the tenant has trainers, other athletes and an administrator in `pendiente_activacion`
- **THEN** none of them SHALL receive an administrator notification

#### Scenario: Not callable by clients
- **WHEN** an authenticated user calls the helper through the API
- **THEN** the call SHALL fail with a permission error

### Requirement: Purchase notifications
`comprar_suscripcion` SHALL enqueue `suscripcion_recibida` for the athlete and `suscripcion_nueva_admin` for the tenant administrators, both with the new payment id.

#### Scenario: Purchase with proof
- **WHEN** an athlete buys a plan attaching a proof
- **THEN** the athlete SHALL get `suscripcion_recibida`, every active administrator SHALL get exactly one `suscripcion_nueva_admin`, and no `pago_comprobante_admin` SHALL be created

#### Scenario: Purchase without proof
- **WHEN** an athlete buys a plan without a proof
- **THEN** the same two notification types SHALL be created

#### Scenario: Failed purchase
- **WHEN** the RPC fails
- **THEN** no notification SHALL be created

### Requirement: Notification triggers on direct writes
`AFTER` row triggers SHALL enqueue notifications for the writes that do not go through the RPC. An action is "by the athlete" when `auth.uid()` equals the subscription's `atleta_id`.

| Trigger | Event | Condition | Notification |
|---|---|---|---|
| `suscripciones_notificar_insert` | insert on `suscripciones` | not by the athlete | `suscripcion_asignada` |
| `suscripciones_notificar_estado` | update of `estado` on `suscripciones` | `pendiente → activa` | `suscripcion_aprobada` |
| `suscripciones_notificar_estado` | update of `estado` on `suscripciones` | `pendiente → cancelada`, not by the athlete | `suscripcion_rechazada` |
| `pagos_notificar_update` | update of `estado`, `comprobante_path` on `pagos` | `pendiente → validado` | `pago_validado` |
| `pagos_notificar_update` | update of `estado`, `comprobante_path` on `pagos` | `pendiente → rechazado` | `pago_rechazado` |
| `pagos_notificar_update` | update of `estado`, `comprobante_path` on `pagos` | updated by the athlete with a non-null `comprobante_path` (the path itself may be unchanged: a re-upload with the same extension overwrites the same file) | `pago_comprobante_admin` |

- Payments with `suscripcion_id` null SHALL be ignored.
- Every trigger function SHALL catch all exceptions and raise only a warning, so the write never fails because of a notification.
- No other transition SHALL notify: athlete cancelling the own pending request, `activa → cancelada`, `activa → vencida`, edits and deletions.

#### Scenario: Payment approved
- **WHEN** an administrator sets a `pendiente` payment to `validado`
- **THEN** the athlete SHALL get `pago_validado` and no administrator SHALL be notified

#### Scenario: Payment rejected
- **WHEN** an administrator sets a `pendiente` payment to `rechazado` with a reason
- **THEN** the athlete SHALL get `pago_rechazado` carrying that reason

#### Scenario: Subscription approved
- **WHEN** an administrator sets a `pendiente` subscription to `activa`
- **THEN** the athlete SHALL get `suscripcion_aprobada`

#### Scenario: Subscription rejected by staff
- **WHEN** an administrator sets a `pendiente` subscription to `cancelada`
- **THEN** the athlete SHALL get `suscripcion_rechazada`

#### Scenario: Athlete cancels the own request
- **WHEN** the athlete sets the own `pendiente` subscription to `cancelada`
- **THEN** no notification SHALL be created

#### Scenario: Proof uploaded again
- **WHEN** the athlete uploads a proof after a rejection, replaces an existing proof (same or different file extension), or uploads the first proof of a purchase made without one
- **THEN** every active administrator SHALL get `pago_comprobante_admin` and the athlete SHALL get nothing

#### Scenario: Subscription assigned with a validated payment
- **WHEN** an administrator creates an `activa` subscription and a `validado` payment for an athlete
- **THEN** the athlete SHALL get exactly one notification, `suscripcion_asignada`, and no administrator SHALL be notified

#### Scenario: Assigned as pending and approved later
- **WHEN** an administrator creates a `pendiente` subscription for an athlete and later approves it
- **THEN** the athlete SHALL get `suscripcion_asignada` and then `suscripcion_aprobada`

#### Scenario: Expiry and edits are silent
- **WHEN** the daily cron sets a subscription to `vencida`, or an administrator edits or deletes a subscription
- **THEN** no notification SHALL be created

#### Scenario: Trigger failure does not block the write
- **WHEN** the helper raises an error inside a trigger
- **THEN** the insert or update of `suscripciones` or `pagos` SHALL still succeed

### Requirement: In-app texts and links
In-app notifications SHALL use these texts. `{plan}` is `planes.nombre`, followed by ` — {plan_tipos.nombre}` when the subscription has a subtype; `{atleta}` is the athlete's first and last name; `{tenant}` is `tenants.nombre`; `{fecha_fin}` is `DD/MM/YYYY`.

| `tipo` | `titulo` | `mensaje` | `url` |
|---|---|---|---|
| `suscripcion_recibida` | Recibimos tu solicitud | Tu suscripción a {plan} en {tenant} está en revisión. | `/portal/mis-suscripciones` |
| `pago_validado` | Pago aprobado | Tu pago de {plan} fue aprobado. | `/portal/mis-suscripciones` |
| `pago_rechazado` | Pago rechazado | Tu pago de {plan} fue rechazado: {motivo}. Puedes subir un nuevo comprobante. | `/portal/mis-suscripciones` |
| `suscripcion_aprobada` | Suscripción activa | Tu suscripción a {plan} está activa hasta el {fecha_fin}. | `/portal/mis-suscripciones` |
| `suscripcion_rechazada` | Suscripción rechazada | Tu solicitud de {plan} en {tenant} fue rechazada. | `/portal/mis-suscripciones` |
| `suscripcion_asignada` | Nueva suscripción | {tenant} agregó la suscripción {plan} a tu cuenta. | `/portal/mis-suscripciones` |
| `suscripcion_nueva_admin` | Nueva suscripción por validar, or Nueva suscripción | {atleta} compró {plan}. | `/portal/orgs/{tenant_id}/gestion-suscripciones` |
| `pago_comprobante_admin` | Nuevo pago por validar | {atleta} subió un comprobante para {plan}. | `/portal/orgs/{tenant_id}/gestion-suscripciones` |

- `suscripcion_nueva_admin` SHALL be titled "Nueva suscripción por validar" when `requiere_validacion` is true and "Nueva suscripción" otherwise.
- Without a rejection reason the `pago_rechazado` message SHALL be "Tu pago de {plan} fue rechazado. Puedes subir un nuevo comprobante."
- Without `fecha_fin` the `suscripcion_aprobada` message SHALL be "Tu suscripción a {plan} está activa."

#### Scenario: Purchase needing validation
- **WHEN** an athlete buys a plan and the subscription is `pendiente`
- **THEN** the administrator notification SHALL be titled "Nueva suscripción por validar" and link to `/portal/orgs/{tenant_id}/gestion-suscripciones`

#### Scenario: Approved with end date
- **WHEN** a subscription is approved with `fecha_fin = 2026-12-31`
- **THEN** the athlete message SHALL end with "está activa hasta el 31/12/2026."

#### Scenario: Plan with subtype
- **WHEN** the subscription has plan "Mensual" and subtype "8 clases"
- **THEN** `{plan}` SHALL read "Mensual — 8 clases"

### Requirement: Subscription emails
`src/lib/notificaciones/modulos/suscripciones.ts` SHALL export `suscripcionesHandlers` with one handler per type, keyed `suscripciones.{tipo}`, registered in `src/lib/notificaciones/registro.ts`.
- Handlers SHALL read the subscription, plan, subtype, tenant, athlete and payment (the one in `payload.pago_id`, or the latest of the subscription) with the service-role client at send time, and SHALL return `null` when the subscription no longer exists.
- Subject SHALL be the in-app title followed by ` — {plan}`. Copy SHALL be Spanish with `es-CO` formats, on the shared layout, without attachments.
- The body SHALL show Organización, Plan, Valor (COP, "Gratis" when 0, omitted without a payment), Estado de la suscripción, Estado del pago, Vigencia when both dates exist, and Motivo for `pago_rechazado`.
- Athlete emails SHALL have the button "Ver mis suscripciones" → `{APP_URL}/portal/mis-suscripciones`. Administrator emails SHALL have "Validar" (or "Ver suscripciones" when no validation is required) → `{APP_URL}/portal/orgs/{tenant_id}/gestion-suscripciones`.
- The `suscripcion_nueva_admin` email SHALL show "Comprobante adjunto: Sí" or "No" from the payment's current `comprobante_path`.
- No email SHALL include the proof file or a link to it.

#### Scenario: Administrator email of a purchase with proof
- **WHEN** the `suscripcion_nueva_admin` email of a purchase made with a proof is rendered
- **THEN** it SHALL show "Comprobante adjunto: Sí" and a "Validar" button to the tenant's subscriptions page

#### Scenario: Rejection email
- **WHEN** the `pago_rechazado` email is rendered for a payment rejected with "Comprobante ilegible"
- **THEN** it SHALL contain a Motivo row with "Comprobante ilegible"

#### Scenario: Subscription deleted before dispatch
- **WHEN** the subscription of an outbox row no longer exists
- **THEN** the handler SHALL return `null`, the row SHALL be failed as `skipped` and no email SHALL be sent

#### Scenario: All types registered
- **WHEN** `resolverHandler('suscripciones', tipo)` is called for each of the eight types
- **THEN** a handler SHALL be returned
