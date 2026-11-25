## MODIFIED Requirements

### Requirement: Atomic event save RPC
The system SHALL provide `public.guardar_evento_completo(p_tenant_id uuid, p_evento_id uuid, p_es_nuevo boolean, p_borrador boolean, p_evento jsonb, p_entradas jsonb) returns jsonb`. It MUST be declared `security invoker` with `set search_path = public`, executable by `authenticated` only. All of its writes SHALL happen in one transaction: any raised error MUST leave `eventos`, `evento_entradas` and `evento_entrada_cupones` unchanged.

The function SHALL:
1. Raise `FORBIDDEN` (`42501`) unless the tenant is in `get_trainer_or_admin_tenants_for_authenticated_user()`. When `p_es_nuevo`, read the tenant's name from `tenants` as `coalesce(nullif(btrim(nombre), ''), 'Organización')`, and raise `TENANT_INVALIDO` (`23503`) when no tenant row is readable (US-0120).
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
   - On create: insert with `creado_por = auth.uid()`, `estado = 'confirmado'`, and `nombre_tenant` = the tenant name read in step 1. Any `nombre_tenant` in `p_evento` MUST be ignored.
   - On edit: update, never touching `tenant_id`, `nombre_tenant`, `creado_por`, `estado` or `created_at`, and raise `NOT_FOUND` (`P0002`) when no row matches.
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

#### Scenario: Tenant name set on create
- **WHEN** an admin of the tenant "Wolfpack Club" creates an event (draft or final), and `p_evento` contains `nombre_tenant = 'Otro'`
- **THEN** the new row SHALL have `nombre_tenant = 'Wolfpack Club'`

#### Scenario: Tenant name kept on edit
- **WHEN** an existing event is edited after the tenant was renamed
- **THEN** its `nombre_tenant` SHALL keep the value stored at creation
