# team-events-tickets-data Specification

## Purpose
Defines the `evento_entradas` and `evento_entrada_cupones` tables (format constraints, draft-nullable fields, uniqueness, cascades), their RLS matrix, and the atomic `guardar_evento_completo` save RPC with its draft/final validation, child sync, derived price and returned id map (US-0119).
## Requirements
### Requirement: Event tickets table
The system SHALL provide `public.evento_entradas` with the following columns:
- `id uuid` primary key
- `evento_id uuid not null`, FK to `eventos(id)` `on delete cascade`
- `tenant_id uuid not null`, FK to `tenants(id)` `on delete cascade`; it MUST equal the parent event's tenant
- `tipo_entrada varchar(20) not null`, default `'sencilla'`
- `nombre varchar(100)`, nullable
- `eventos_id_bundle jsonb not null`, default `'[]'`
- `valida_desde timestamptz` and `valida_hasta timestamptz`
- `valor numeric(12,2)`, nullable
- `orden integer not null`, default `0`
- `created_at` and `updated_at`, with the shared `set_updated_at()` trigger

Check constraints MUST enforce format only:
- `tipo_entrada` in (`sencilla`, `multiple`)
- `nombre` null or non-blank
- `valor` null or >= 0
- `valida_desde < valida_hasta` when both are set
- `eventos_id_bundle` is an array, and is empty unless `tipo_entrada = 'multiple'`

A partial unique index MUST prevent two tickets of the same event from sharing a non-null `lower(btrim(nombre))`.

#### Scenario: Format violations rejected
- **WHEN** a ticket is written with `tipo_entrada = 'otro'`, `valor = -1`, `valida_desde >= valida_hasta`, or a `sencilla` ticket with a non-empty bundle
- **THEN** the statement SHALL fail with a check-constraint violation

#### Scenario: Duplicate ticket name rejected
- **WHEN** a second ticket named "general" is written for an event that already has a ticket named "General"
- **THEN** the statement SHALL fail with a unique violation on `uq_evento_entradas_nombre`

#### Scenario: Draft-incomplete ticket accepted by the table
- **WHEN** a ticket is written with `nombre = null`, `valor = null`, or as a `multiple` ticket with an empty bundle
- **THEN** the table SHALL accept it (completeness is enforced by the save RPC on final save)

#### Scenario: Event deletion cascades to tickets
- **WHEN** an event is deleted
- **THEN** its tickets and their coupons SHALL be deleted

### Requirement: Ticket coupons table
The system SHALL provide `public.evento_entrada_cupones` with the following columns:
- `id uuid` primary key
- `entrada_id uuid not null`, FK to `evento_entradas(id)` `on delete cascade`
- `evento_id uuid not null`, FK to `eventos(id)` `on delete cascade`
- `tenant_id uuid not null`, FK to `tenants(id)` `on delete cascade`
- `nombre varchar(100)`, `cupon varchar(30)` and `descuento numeric(5,2)`, all nullable
- `valido_desde timestamptz` and `valido_hasta timestamptz`
- `created_at` and `updated_at`, with the shared `set_updated_at()` trigger

Check constraints MUST enforce:
- `nombre` null or non-blank
- `cupon` null or matching `^[A-Z0-9_-]{3,30}$`
- `descuento` null or in `(0, 100]` (a percentage)
- `valido_desde < valido_hasta` when both are set

A partial unique index MUST prevent duplicate non-null `cupon` values within the same `evento_id`.

#### Scenario: Invalid coupon format rejected
- **WHEN** a coupon is written with `cupon = 'ab'`, `cupon = 'promo'` (lowercase), `descuento = 0`, or `descuento = 150`
- **THEN** the statement SHALL fail with a check-constraint violation

#### Scenario: Code unique per event across tickets
- **WHEN** two different tickets of the same event get a coupon with code `PREVENTA`
- **THEN** the second write SHALL fail with a unique violation on `uq_evento_entrada_cupones_codigo`

#### Scenario: Same code allowed on another event
- **WHEN** a coupon with code `PREVENTA` is written for a different event
- **THEN** the write SHALL succeed

#### Scenario: Ticket deletion cascades to coupons
- **WHEN** a ticket is deleted
- **THEN** its coupons SHALL be deleted

### Requirement: Tickets and coupons access control
RLS MUST be enabled on both tables. Access SHALL be as follows:
- `evento_entradas` SELECT SHALL be granted to `anon` and `authenticated` only when the parent event is readable by the caller under the `eventos` RLS (`exists (select 1 from eventos e where e.id = evento_id)`).
- `evento_entradas` INSERT, UPDATE and DELETE SHALL be allowed only when `tenant_id` is in `get_trainer_or_admin_tenants_for_authenticated_user()` and the parent event belongs to that same tenant.
- `evento_entrada_cupones` SHALL have no `anon` grant. Every operation SHALL be allowed only to admins and trainers of the row's tenant, with `with check` verifying that the ticket belongs to the same event and tenant.

#### Scenario: Anonymous reads tickets of public published events only
- **WHEN** `anon` selects `evento_entradas`
- **THEN** only tickets of events with `publico and activo and not borrador` SHALL be returned

#### Scenario: Draft tickets hidden from members
- **WHEN** a `usuario` member of T selects the tickets of a draft event of T
- **THEN** no rows SHALL be returned

#### Scenario: Coupons hidden from non-staff
- **WHEN** `anon` selects `evento_entrada_cupones`
- **THEN** the query SHALL fail for lack of privilege
- **AND WHEN** a `usuario` member of T selects coupons of T's events
- **THEN** zero rows SHALL be returned

#### Scenario: Cross-tenant ticket insert rejected
- **WHEN** an admin of T inserts a ticket with `tenant_id = T` and an `evento_id` belonging to tenant U
- **THEN** the insert SHALL be rejected by RLS

#### Scenario: Staff can manage tickets and coupons
- **WHEN** an admin or trainer of T inserts, updates or deletes tickets and coupons of T's events
- **THEN** the operations SHALL succeed

### Requirement: Atomic event save RPC
The system SHALL provide `public.guardar_evento_completo(p_tenant_id uuid, p_evento_id uuid, p_es_nuevo boolean, p_borrador boolean, p_evento jsonb, p_entradas jsonb) returns jsonb`. It MUST be declared `security invoker` with `set search_path = public`, executable by `authenticated` only. All of its writes SHALL happen in one transaction: any raised error MUST leave `eventos`, `evento_entradas` and `evento_entrada_cupones` unchanged.

The function SHALL:
1. Raise `FORBIDDEN` (`42501`) unless the tenant is in `get_trainer_or_admin_tenants_for_authenticated_user()`.
2. Always validate:
   - a non-blank `nombre`
   - a form template, when set, belongs to the tenant (`FORMULARIO_INVALIDO`, `23503`)
   - every bundle id is an event of the same tenant other than `p_evento_id` (`BUNDLE_INVALIDO`, `23503`)
   - the table format constraints
3. When `p_borrador = false`, also validate:
   - a discipline is present (`DISCIPLINA_REQUERIDA`)
   - there is at least one ticket (`ENTRADAS_REQUERIDAS`)
   - every ticket has `nombre` and `valor` (`ENTRADA_INCOMPLETA`)
   - every `multiple` ticket has at least one bundled event (`BUNDLE_REQUERIDO`)
   - every coupon has `nombre`, `cupon` and `descuento` (`CUPON_INCOMPLETO`)
   - no coupon is on a ticket with `valor = 0` (`CUPON_EN_ENTRADA_GRATIS`)
   - at least one payment method exists when any ticket has `valor > 0` (`METODO_PAGO_REQUERIDO`)
   - the form, when set, is `activo` (`FORMULARIO_INACTIVO`)

   All of these raise `23514`.
4. Raise `NO_REVERTIR_A_BORRADOR` (`23514`) when `p_borrador = true` and the stored event has `borrador = false`.
5. Write the event:
   - On create: insert with `creado_por = auth.uid()` and `estado = 'confirmado'`.
   - On edit: update, never touching `tenant_id`, `creado_por`, `estado` or `created_at`, and raise `NOT_FOUND` (`P0002`) when no row matches.
   - In both cases set `borrador = p_borrador`.
6. Sync tickets and then each ticket's coupons: delete the rows missing from the payload, then upsert the present ones, forcing `tenant_id` and `evento_id`. It MUST raise `ENTRADA_INVALIDA` (`42501`) for an id that belongs to another event. Coupon codes MUST be stored as `upper(btrim(cupon))`.
7. Rewrite `eventos.precio` from the tickets with non-null `nombre` and `valor`, as `[{nombre, precio: valor, descripcion: null}]` ordered by `orden`.
8. Return `{evento_id, borrador, entradas: [{client_key, id, cupones: [{client_key, id}]}]}`, echoing each row's `client_key` from the payload.

#### Scenario: Non-staff caller rejected
- **WHEN** a `usuario` member, a non-member, or a `pendiente_activacion` member of T calls the RPC for T
- **THEN** it SHALL raise `42501` and write nothing

#### Scenario: Name-only draft created
- **WHEN** an admin calls it with `p_es_nuevo = true`, `p_borrador = true`, only `nombre` set, and `p_entradas = []`
- **THEN** an `eventos` row SHALL exist with `borrador = true`, `disciplina_id = null` and `precio = []`, and the result SHALL contain its id

#### Scenario: Incomplete draft data accepted
- **WHEN** a draft save includes a ticket without `valor` and a coupon without `cupon`
- **THEN** the call SHALL succeed and persist both rows with the missing fields as `null`

#### Scenario: Draft save still rejects format errors
- **WHEN** a draft save includes a ticket with `valor = -1`, a coupon with `descuento = 150`, or a bundle id from another tenant
- **THEN** the call SHALL fail and no row SHALL change

#### Scenario: Final save rejects incomplete data atomically
- **WHEN** an edit with `p_borrador = false` includes a paid ticket and an empty `metodos_pago`
- **THEN** it SHALL raise `METODO_PAGO_REQUERIDO`, and the event, its tickets and its coupons SHALL keep their previous values

#### Scenario: Final save publishes a draft
- **WHEN** a complete payload is saved with `p_borrador = false` for a stored draft
- **THEN** the event SHALL have `borrador = false`

#### Scenario: Published event cannot revert to draft
- **WHEN** a call with `p_borrador = true` targets an event stored with `borrador = false`
- **THEN** it SHALL raise `NO_REVERTIR_A_BORRADOR` and change nothing

#### Scenario: Sync updates, inserts and deletes children
- **WHEN** an event has tickets A and B, and the payload contains A (modified) and a new ticket C
- **THEN** A SHALL be updated in place with the same id, B and its coupons SHALL be deleted, and C SHALL be inserted

#### Scenario: Repeated draft saves do not duplicate rows
- **WHEN** a draft is saved, and then saved again with the ids returned by the first call
- **THEN** the number of tickets and coupons SHALL NOT grow

#### Scenario: Price summary derived
- **WHEN** an event is saved with complete tickets "General" 50000 (orden 0) and "VIP" 120000 (orden 1), plus an incomplete ticket
- **THEN** `eventos.precio` SHALL equal `[{"nombre": "General", "precio": 50000, "descripcion": null}, {"nombre": "VIP", "precio": 120000, "descripcion": null}]`

#### Scenario: Immutable columns preserved on edit
- **WHEN** an edit payload includes a different `tenant_id`, `creado_por` or `estado`
- **THEN** the stored values SHALL remain unchanged

