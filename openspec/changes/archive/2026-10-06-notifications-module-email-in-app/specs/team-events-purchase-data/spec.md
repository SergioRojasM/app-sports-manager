## MODIFIED Requirements

### Requirement: Purchase, ticket and outbox tables
The system SHALL provide two purchase tables. `public.evento_notificaciones` SHALL NOT exist: purchase notifications are stored in the generic `notificaciones_outbox` and `notificaciones` tables (see `notifications-delivery` and `notifications-inbox`). Rows that were pending in `evento_notificaciones` when it was dropped SHALL NOT be migrated or sent.

**`public.evento_compras`**
- Columns: `tenant_id`, `evento_id` (`on delete restrict`), `entrada_id`, `comprador_usuario_id`, `comprador_nombre` (≤150), `comprador_email` (≤254), `comprador_fecha_nacimiento`, `entrada_nombre`, `entrada_tipo`, `valor_base`, `cupon_codigo`, `descuento_pct`, `total`, `metodo_pago`, `comprobante_path`, `estado`, `motivo_rechazo` (≤500), `validado_por`, `validado_at`, `cancelado_at`, `created_at`, `updated_at`.
- Checks:
  - `estado` is one of `pendiente_pago | en_validacion | confirmada | rechazada | cancelada | expirada`;
  - the email is lowercased and trimmed, and has a valid shape;
  - the name is not blank;
  - the birth date is after 1900-01-01;
  - `0 <= total <= valor_base`;
  - `descuento_pct` is null or in `(0, 100]`;
  - `entrada_tipo` is `sencilla | multiple`;
  - a `rechazada` purchase has a non-blank `motivo_rechazo`;
  - `total = 0 or metodo_pago is not null`.
- It SHALL NOT store form data. Form answers live in `evento_formulario_respuestas` (see "Event form answers table").

**`public.evento_tickets`**
- Columns: `compra_id` (`on delete cascade`), `tenant_id`, `evento_id` (`on delete restrict`), `usuario_id`, `asistente_nombre`, `asistente_email`, `codigo` (unique, ≤12), `estado` (`pendiente | activa | anulada`), and timestamps.
- The partial unique index `uq_evento_tickets_evento_email (evento_id, asistente_email) where estado <> 'anulada'`.

`updated_at` triggers SHALL exist on both tables.

#### Scenario: Invalid estado rejected
- **WHEN** a row of `evento_compras` is written with `estado = 'pagada'`
- **THEN** the write SHALL fail with a check violation

#### Scenario: One live ticket per email and event
- **WHEN** a second ticket with `estado <> 'anulada'` is inserted for the same `evento_id` and `asistente_email`
- **THEN** the insert SHALL fail on `uq_evento_tickets_evento_email`

#### Scenario: Same email can buy again after voiding
- **WHEN** the only ticket for an email and event is `anulada`
- **THEN** a new live ticket for that email and event SHALL be insertable

#### Scenario: Event with sales cannot be hard-deleted
- **WHEN** an event that has a purchase or a ticket is deleted
- **THEN** the delete SHALL fail with a foreign-key violation (`23503`)

#### Scenario: Legacy events outbox removed
- **WHEN** `public.evento_notificaciones` is queried after the migration
- **THEN** the statement SHALL fail because the relation does not exist

### Requirement: Purchase tables read-only access
RLS SHALL be enabled on both tables, and every privilege SHALL be revoked from `anon` and `authenticated`. `authenticated` SHALL be granted `select` on `evento_compras` and `evento_tickets` only, with these policies:
- a purchase is visible when `comprador_usuario_id = auth.uid()`, or when its tenant is in `get_trainer_or_admin_tenants_for_authenticated_user()`;
- a ticket is visible when `usuario_id = auth.uid()`, or under the same staff condition.

#### Scenario: Direct writes denied
- **WHEN** `anon` or `authenticated` runs `insert`, `update` or `delete` on either table
- **THEN** the statement SHALL fail with a permission error

#### Scenario: Anonymous read denied
- **WHEN** `anon` selects from either table
- **THEN** the statement SHALL fail with a permission error

#### Scenario: Buyer reads only own purchases
- **WHEN** a registered buyer who is not staff selects `evento_compras`
- **THEN** only purchases with `comprador_usuario_id = auth.uid()` SHALL be returned

#### Scenario: Staff reads their tenant's purchases
- **WHEN** an admin or trainer of tenant T selects `evento_compras`
- **THEN** every purchase of T SHALL be returned, and no purchase of other tenants unless the caller owns it

### Requirement: Purchase state machine
Purchase and ticket states SHALL move only through these transitions, each performed by an RPC:

| From | Event | To (purchase / tickets) |
|---|---|---|
| — | `iniciar_compra_evento` | `pendiente_pago` / `pendiente` |
| — | `iniciar_compra_evento`, `total = 0` and no image form fields | `confirmada` / `activa` |
| `pendiente_pago` | `finalizar_compra_evento`, `total = 0` or `omitir_confirmacion_compra` | `confirmada` / `activa` |
| `pendiente_pago` | `finalizar_compra_evento`, paid | `en_validacion` / `pendiente` |
| `pendiente_pago` | older than 30 min (cron or lazy) | `expirada` / `anulada` |
| `en_validacion` | `validar_compra_evento(true)` | `confirmada` / `activa` |
| `en_validacion` | `validar_compra_evento(false)` | `rechazada` / `anulada` |
| `rechazada` | `reenviar_comprobante_compra_evento` | `en_validacion` / `pendiente` (or `confirmada` / `activa` with `omitir_confirmacion_compra`) |
| `en_validacion`, `confirmada` | `cancelar_compra_evento` within policy | `cancelada` / `anulada` |

Every transition into `en_validacion`, `confirmada`, `rechazada` or `cancelada` SHALL call `_encolar_notificacion` with the matching `tipo` (`compra_recibida`, `compra_confirmada`, `compra_rechazada`, `compra_cancelada`), which SHALL insert one buyer row into `notificaciones_outbox` with `modulo = 'eventos'`, that `tipo` and `estado = 'pendiente'`, plus the other notifications defined in `team-events-purchase-notifications`. The email SHALL be sent asynchronously by the notifications dispatcher; a failure to enqueue the dispatch call or to send the email SHALL NOT fail or roll back the transition.

#### Scenario: Paid purchase finalized
- **WHEN** a paid purchase on an event without `omitir_confirmacion_compra` is finalized with a valid proof
- **THEN** the purchase SHALL be `en_validacion` with `comprobante_path` set, its tickets `pendiente`, and one buyer `compra_recibida` row SHALL exist in `notificaciones_outbox`

#### Scenario: Auto-confirmed purchase
- **WHEN** the same purchase is finalized on an event with `omitir_confirmacion_compra = true`
- **THEN** the purchase SHALL be `confirmada`, its tickets `activa`, and one buyer `compra_confirmada` row SHALL exist in `notificaciones_outbox`

#### Scenario: Dispatcher unavailable
- **WHEN** a purchase is validated while the dispatcher endpoint is unreachable
- **THEN** the purchase SHALL be `confirmada` and its buyer outbox row SHALL remain `pendiente` until a later dispatch
